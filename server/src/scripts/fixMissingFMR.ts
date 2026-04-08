import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CENSUS_CROSSWALK_URL = 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt';
const FMR_URL = 'https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx';

function padFips(val: string | number | undefined, len: number): string {
  return String(val ?? '').padStart(len, '0');
}

// Manual overrides for known problem cases — ipeds_id → county_fips
const manualOverrides: Record<string, string> = {
  '009214': '06085', // San Jose State — Santa Clara County
  '001319': '06075', // UC San Francisco — San Francisco County
  '001002': '01089', // Alabama A&M — Madison County AL
  '001013': '01073', // UAB Birmingham — Jefferson County AL
  '001055': '01089', // UA Huntsville — Madison County AL
  '001370': '08013', // CU Boulder — Boulder County CO
  '001350': '08069', // CSU Fort Collins — Larimer County CO
  '001371': '08031', // U Denver — Denver County CO
  '013971': '08031', // MSU Denver — Denver County CO
  '001349': '08123', // U Northern Colorado — Weld County CO
};

interface MissingInstitution {
  ipeds_id: string;
  name: string;
  city: string;
  state: string;
  zip: string;
}

async function run() {
  // ═══════════════════════════════════════════
  // STEP 1 — Load missing institutions
  // ═══════════════════════════════════════════
  console.log('STEP 1: Loading missing-fmr.json...');
  const dataPath = join(__dirname, '..', '..', 'data', 'missing-fmr.json');
  let missing: MissingInstitution[];
  try {
    missing = JSON.parse(readFileSync(dataPath, 'utf8'));
    console.log(`  Loaded ${missing.length} missing institutions`);
  } catch (err) {
    console.error('Failed to read missing-fmr.json:', err);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // STEP 2 — Download Census ZIP crosswalk
  // ═══════════════════════════════════════════
  console.log('STEP 2: Downloading Census ZIP crosswalk...');
  let zipToCounty: Map<string, string>;
  try {
    const res = await fetch(CENSUS_CROSSWALK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n');
    const header = lines[0].replace(/^\uFEFF/, '').split('|');
    const zipIdx = header.indexOf('GEOID_ZCTA5_20');
    const countyIdx = header.indexOf('GEOID_COUNTY_20');
    const areaIdx = header.indexOf('AREALAND_PART');

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
    console.log(`  ZIP crosswalk loaded: ${zipToCounty.size} mappings`);
  } catch (err) {
    console.error('Failed to fetch ZIP crosswalk:', err);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // STEP 3 — Download HUD FMR data
  // ═══════════════════════════════════════════
  console.log('STEP 3: Downloading HUD FMR data...');
  let fmrByCounty: Map<string, { fmr_0: number; fmr_1: number; fmr_2: number; fmr_3: number; fmr_4: number }>;
  try {
    const res = await fetch(FMR_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    fmrByCounty = new Map();
    for (const row of rows) {
      const fipsRaw = String(row['fips'] ?? '');
      if (!fipsRaw || fipsRaw.length < 5) continue;
      const countyFips = padFips(fipsRaw.substring(0, 5), 5);
      if (!fmrByCounty.has(countyFips)) {
        fmrByCounty.set(countyFips, {
          fmr_0: Number(row['fmr_0'] ?? 0),
          fmr_1: Number(row['fmr_1'] ?? 0),
          fmr_2: Number(row['fmr_2'] ?? 0),
          fmr_3: Number(row['fmr_3'] ?? 0),
          fmr_4: Number(row['fmr_4'] ?? 0),
        });
      }
    }
    console.log(`  HUD FMR loaded: ${fmrByCounty.size} county records`);
  } catch (err) {
    console.error('Failed to fetch HUD FMR:', err);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // STEP 4 — Connect to Turso
  // ═══════════════════════════════════════════
  const config = getClientConfig();
  console.log(`\nSTEP 4: Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // ═══════════════════════════════════════════
  // STEP 5 — Try fallback strategies
  // ═══════════════════════════════════════════
  console.log('STEP 5: Fixing missing FMR data...\n');
  const now = new Date().toISOString();
  let fixedManual = 0;
  let fixedStrip = 0;
  let fixedAdjacent = 0;
  let fixedCity = 0;
  let stillUnfixed = 0;
  const unfixedList: MissingInstitution[] = [];

  for (const inst of missing) {
    let countyFips: string | null = null;
    let strategy = '';

    // Strategy 0: Manual overrides (check first)
    if (manualOverrides[inst.ipeds_id]) {
      countyFips = manualOverrides[inst.ipeds_id];
      strategy = 'manual override';
    }

    // Strategy 1: Strip ZIP+4 suffix
    if (!countyFips && inst.zip.includes('-')) {
      const baseZip = padFips(inst.zip.split('-')[0], 5);
      const match = zipToCounty.get(baseZip);
      if (match) {
        countyFips = match;
        strategy = 'ZIP strip';
      }
    }

    // Strategy 2: Try adjacent ZIPs
    if (!countyFips) {
      const baseZip = parseInt(padFips(inst.zip.split('-')[0], 5), 10);
      if (!isNaN(baseZip)) {
        for (let offset = -5; offset <= 5; offset++) {
          if (offset === 0) continue;
          const tryZip = padFips(baseZip + offset, 5);
          const match = zipToCounty.get(tryZip);
          if (match) {
            countyFips = match;
            strategy = `adjacent ZIP (${tryZip})`;
            break;
          }
        }
      }
    }

    // Strategy 3: City-level fallback
    if (!countyFips) {
      try {
        const result = await client.execute({
          sql: 'SELECT county_fips FROM universities WHERE city = ? AND state = ? AND county_fips IS NOT NULL LIMIT 1',
          args: [inst.city, inst.state],
        });
        if (result.rows.length > 0 && result.rows[0]['county_fips']) {
          countyFips = result.rows[0]['county_fips'] as string;
          strategy = 'city fallback';
        }
      } catch { /* continue */ }
    }

    if (!countyFips) {
      stillUnfixed++;
      unfixedList.push(inst);
      console.log(`  ${inst.name} (${inst.state}) — UNFIXED`);
      continue;
    }

    // ═══════════════════════════════════════════
    // STEP 6 — Apply fix
    // ═══════════════════════════════════════════
    try {
      // Update county_fips
      await client.execute({
        sql: 'UPDATE universities SET county_fips = ? WHERE ipeds_id = ?',
        args: [countyFips, inst.ipeds_id],
      });

      // Look up FMR
      const fmr = fmrByCounty.get(countyFips);
      if (fmr) {
        const uniRow = await client.execute({
          sql: 'SELECT id FROM universities WHERE ipeds_id = ?',
          args: [inst.ipeds_id],
        });
        if (uniRow.rows.length > 0) {
          const uniId = uniRow.rows[0]['id'] as number;
          const rents = [fmr.fmr_0, fmr.fmr_1, fmr.fmr_2, fmr.fmr_3, fmr.fmr_4];
          for (let br = 0; br <= 4; br++) {
            await client.execute({
              sql: `INSERT OR REPLACE INTO university_market_data
                (university_id, bedroom_count, median_rent, data_year, data_source, updated_at)
                VALUES (?, ?, ?, 2026, 'HUD_FMR', ?)`,
              args: [uniId, br, rents[br], now],
            });
          }
        }
      }

      switch (strategy) {
        case 'manual override': fixedManual++; break;
        case 'ZIP strip': fixedStrip++; break;
        case 'city fallback': fixedCity++; break;
        default: if (strategy.startsWith('adjacent')) fixedAdjacent++; break;
      }
      console.log(`  ${inst.name} — fixed via ${strategy} (${countyFips})`);
    } catch (err) {
      console.error(`  ${inst.name} — fix failed: ${err}`);
      stillUnfixed++;
      unfixedList.push(inst);
    }
  }

  // ═══════════════════════════════════════════
  // STEP 7 — Summary
  // ═══════════════════════════════════════════
  console.log('\n=== FIX MISSING FMR SUMMARY ===');
  console.log(`Fixed via manual override: ${fixedManual}`);
  console.log(`Fixed via ZIP strip: ${fixedStrip}`);
  console.log(`Fixed via adjacent ZIP: ${fixedAdjacent}`);
  console.log(`Fixed via city fallback: ${fixedCity}`);
  console.log(`Still unfixed: ${stillUnfixed}`);

  if (unfixedList.length > 0) {
    console.log('\nStill unfixed:');
    for (const inst of unfixedList) {
      console.log(`  - ${inst.name} (${inst.city}, ${inst.state} ${inst.zip})`);
    }
  }

  // Update missing-fmr.json with only unfixed
  writeFileSync(dataPath, JSON.stringify(unfixedList, null, 2));
  console.log(`\nUpdated missing-fmr.json: ${unfixedList.length} institutions remaining`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
