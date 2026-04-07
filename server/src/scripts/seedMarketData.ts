import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import * as XLSX from 'xlsx';

const ZIP_COUNTY_URL = 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt';
const FMR_URL = 'https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx';

function padFips(val: string | number | undefined, len: number): string {
  return String(val ?? '').padStart(len, '0');
}

async function fetchText(url: string): Promise<string> {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function fetchExcel(url: string): Promise<XLSX.WorkBook> {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(new Uint8Array(buf), { type: 'array' });
}

async function seed() {
  // STEP 1 — ZIP to county FIPS crosswalk (Census pipe-delimited text)
  let zipToCounty: Map<string, string>;
  try {
    const text = await fetchText(ZIP_COUNTY_URL);
    const lines = text.split('\n');
    // Parse header to find column indices
    const header = lines[0].replace(/^\uFEFF/, '').split('|');
    const zipIdx = header.indexOf('GEOID_ZCTA5_20');
    const countyIdx = header.indexOf('GEOID_COUNTY_20');
    const areaIdx = header.indexOf('AREALAND_PART');

    if (zipIdx === -1 || countyIdx === -1) {
      throw new Error(`Missing columns. Found: ${header.join(', ')}`);
    }

    // Build zip → county map, picking largest AREALAND_PART per zip
    const zipBestArea = new Map<string, { county: string; area: number }>();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('|');
      const zip = cols[zipIdx]?.trim();
      const county = cols[countyIdx]?.trim();
      if (!zip || !county) continue;

      const area = areaIdx >= 0 ? Number(cols[areaIdx] ?? 0) : 0;
      const existing = zipBestArea.get(zip);
      if (!existing || area > existing.area) {
        zipBestArea.set(zip, { county, area });
      }
    }

    zipToCounty = new Map();
    for (const [zip, { county }] of zipBestArea) {
      zipToCounty.set(zip, county);
    }
    console.log(`ZIP-County crosswalk loaded: ${zipToCounty.size} mappings`);
  } catch (err) {
    console.error('Failed to fetch ZIP-County crosswalk:', err);
    process.exit(1);
  }

  // STEP 2 — HUD FY2026 FMR data (Excel)
  let fmrByCounty: Map<string, { fmr_0: number; fmr_1: number; fmr_2: number; fmr_3: number; fmr_4: number }>;
  try {
    const wb = await fetchExcel(FMR_URL);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    fmrByCounty = new Map();

    for (const row of rows) {
      // fips column is 10 digits: first 5 = county FIPS
      const fipsRaw = String(row['fips'] ?? '');
      if (!fipsRaw || fipsRaw.length < 5) continue;
      const countyFips = padFips(fipsRaw.substring(0, 5), 5);

      const fmr0 = Number(row['fmr_0'] ?? 0);
      const fmr1 = Number(row['fmr_1'] ?? 0);
      const fmr2 = Number(row['fmr_2'] ?? 0);
      const fmr3 = Number(row['fmr_3'] ?? 0);
      const fmr4 = Number(row['fmr_4'] ?? 0);

      if (!fmrByCounty.has(countyFips)) {
        fmrByCounty.set(countyFips, { fmr_0: fmr0, fmr_1: fmr1, fmr_2: fmr2, fmr_3: fmr3, fmr_4: fmr4 });
      }
    }
    console.log(`FMR data loaded: ${fmrByCounty.size} county records`);
  } catch (err) {
    console.error('Failed to fetch HUD FMR data:', err);
    process.exit(1);
  }

  // STEP 3 — Connect to DB
  const config = getClientConfig();
  console.log(`\nConnecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // Ensure county_fips column exists
  try {
    await client.execute('ALTER TABLE universities ADD COLUMN county_fips TEXT');
    console.log('Added county_fips column');
  } catch {
    // Already exists
  }

  // STEP 4 — Process each university
  const unis = await client.execute('SELECT id, name, zip FROM universities ORDER BY id');
  let totalProcessed = 0;
  let totalFipsMatch = 0;
  let totalFmrInserted = 0;
  let totalSkipped = 0;

  const now = new Date().toISOString();

  for (const row of unis.rows) {
    const uniId = row['id'] as number;
    const uniName = row['name'] as string;
    const uniZip = padFips(row['zip'] as string, 5);
    totalProcessed++;

    const countyFips = zipToCounty.get(uniZip);
    if (!countyFips) {
      console.log(`  ${uniName} (${uniZip}): county_fips NOT FOUND — skipped`);
      totalSkipped++;
      continue;
    }

    // Update university with county_fips
    try {
      await client.execute({
        sql: 'UPDATE universities SET county_fips = ? WHERE id = ?',
        args: [countyFips, uniId],
      });
      totalFipsMatch++;
    } catch (err) {
      console.error(`  ${uniName}: failed to update county_fips:`, err);
      continue;
    }

    const fmr = fmrByCounty.get(countyFips);
    if (!fmr) {
      console.log(`  ${uniName} (${uniZip} → ${countyFips}): FMR data NOT FOUND — county_fips set, no rent data`);
      continue;
    }

    // Insert 5 rows (bedroom counts 0-4)
    try {
      const rents = [fmr.fmr_0, fmr.fmr_1, fmr.fmr_2, fmr.fmr_3, fmr.fmr_4];
      for (let br = 0; br <= 4; br++) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO university_market_data
            (university_id, bedroom_count, median_rent, data_year, data_source, updated_at)
            VALUES (?, ?, ?, 2025, 'HUD_FMR', ?)`,
          args: [uniId, br, rents[br], now],
        });
      }
      totalFmrInserted++;
      console.log(`  ${uniName} (${uniZip} → ${countyFips}): FMR inserted — $${fmr.fmr_0}/$${fmr.fmr_1}/$${fmr.fmr_2}/$${fmr.fmr_3}/$${fmr.fmr_4}`);
    } catch (err) {
      console.error(`  ${uniName}: failed to insert FMR data:`, err);
    }
  }

  // STEP 5 — Summary
  console.log('\n=== SEED MARKET DATA SUMMARY ===');
  console.log(`Total universities processed: ${totalProcessed}`);
  console.log(`County FIPS matched: ${totalFipsMatch}`);
  console.log(`FMR data inserted: ${totalFmrInserted}`);
  console.log(`Skipped (no ZIP match): ${totalSkipped}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
