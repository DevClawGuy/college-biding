import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const EDGE_URL = 'https://data-nces.opendata.arcgis.com/api/download/v1/items/92e4b742b59f4b90b3af85e444a912f7/csv?layers=0';
const HD2023_URL = 'https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip';
const CENSUS_CROSSWALK_URL = 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt';
const FMR_URL = 'https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx';

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]);

function padFips(val: string | number | undefined, len: number): string {
  return String(val ?? '').padStart(len, '0');
}

// Parse CSV respecting quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function generateSlug(name: string, state: string, city: string, seen: Set<string>): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const stateLower = state.toLowerCase();
  let slug = `${base}-${stateLower}`;
  if (seen.has(slug)) {
    const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    slug = `${base}-${citySlug}-${stateLower}`;
  }
  seen.add(slug);
  return slug;
}

interface Institution {
  unitId: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  enrollment: number;
  lat: number;
  lng: number;
  slug: string;
  countyFips: string | null;
}

async function seed() {
  // ═══════════════════════════════════════════
  // STEP 1 — Download and parse EDGE geocodes
  // ═══════════════════════════════════════════
  console.log('STEP 1: Downloading EDGE geocodes...');
  let edgeMap: Map<string, { lat: number; lng: number }>;
  try {
    const res = await fetch(EDGE_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n');
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const unitIdIdx = header.indexOf('UNITID');
    const latIdx = header.indexOf('LAT');
    const lonIdx = header.indexOf('LON');
    if (unitIdIdx === -1 || latIdx === -1 || lonIdx === -1) {
      throw new Error(`Missing columns. Found: ${header.slice(0, 20).join(', ')}`);
    }
    edgeMap = new Map();
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const fields = lines[i].split(',').map(f => f.trim().replace(/"/g, ''));
      const uid = fields[unitIdIdx];
      const lat = parseFloat(fields[latIdx]);
      const lng = parseFloat(fields[lonIdx]);
      if (uid && !isNaN(lat) && !isNaN(lng)) {
        edgeMap.set(uid, { lat, lng });
      }
    }
    console.log(`  EDGE geocodes loaded: ${edgeMap.size} records`);
  } catch (err) {
    console.error('Failed to fetch EDGE geocodes:', err);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // STEP 2 — Download and parse HD2023.zip
  // ═══════════════════════════════════════════
  console.log('STEP 2: Downloading HD2023.zip...');
  let rawInstitutions: { unitId: string; name: string; city: string; state: string; zip: string; enrollment: number }[] = [];
  try {
    const res = await fetch(HD2023_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const zip = new AdmZip(buf);
    const csvEntry = zip.getEntries().find(e => e.entryName.toLowerCase().includes('hd2023') && e.entryName.toLowerCase().endsWith('.csv'));
    if (!csvEntry) {
      const names = zip.getEntries().map(e => e.entryName);
      throw new Error(`HD2023.csv not found in zip. Files: ${names.join(', ')}`);
    }
    const csvText = csvEntry.getData().toString('utf8');
    const lines = csvText.split('\n');
    const header = parseCSVLine(lines[0]);
    const col = (name: string) => header.indexOf(name);
    const unitIdIdx = col('UNITID');
    const instNmIdx = col('INSTNM');
    const cityIdx = col('CITY');
    const stAbbrIdx = col('STABBR');
    const zipIdx = col('ZIP');
    const sectorIdx = col('SECTOR');
    const icLevelIdx = col('ICLEVEL');

    if (unitIdIdx === -1 || instNmIdx === -1 || stAbbrIdx === -1) {
      throw new Error(`Missing required columns. Found: ${header.slice(0, 20).join(', ')}`);
    }

    let skippedSector = 0;
    let skippedLevel = 0;
    let skippedState = 0;
    let skippedName = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const fields = parseCSVLine(lines[i]);
      const sector = parseInt(fields[sectorIdx] ?? '0', 10);
      const icLevel = parseInt(fields[icLevelIdx] ?? '0', 10);
      const state = fields[stAbbrIdx] ?? '';
      const name = fields[instNmIdx] ?? '';

      if (![1, 2, 3].includes(sector)) { skippedSector++; continue; }
      if (icLevel !== 1) { skippedLevel++; continue; }
      if (!US_STATES.has(state)) { skippedState++; continue; }
      if (!name) { skippedName++; continue; }

      rawInstitutions.push({
        unitId: fields[unitIdIdx],
        name,
        city: fields[cityIdx] ?? '',
        state,
        zip: fields[zipIdx] ?? '',
        enrollment: 0, // HD2023 may not have enrollment; default 0
      });
    }
    console.log(`  HD2023 parsed: ${rawInstitutions.length} four-year institutions`);
    console.log(`  Skipped: ${skippedSector} sector, ${skippedLevel} level, ${skippedState} territory, ${skippedName} no name`);
  } catch (err) {
    console.error('Failed to fetch/parse HD2023:', err);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // STEP 3 — Join with EDGE + generate slugs
  // ═══════════════════════════════════════════
  console.log('STEP 3: Joining geocodes and generating slugs...');
  const slugSeen = new Set<string>();
  const institutions: Institution[] = [];
  let noGeocode = 0;

  for (const inst of rawInstitutions) {
    const geo = edgeMap.get(inst.unitId);
    if (!geo) { noGeocode++; continue; }
    const slug = generateSlug(inst.name, inst.state, inst.city, slugSeen);
    institutions.push({
      ...inst,
      lat: geo.lat,
      lng: geo.lng,
      slug,
      countyFips: null,
    });
  }
  console.log(`  Institutions with geocodes: ${institutions.length}`);
  console.log(`  Skipped (no geocode): ${noGeocode}`);

  // ═══════════════════════════════════════════
  // STEP 4 — Download ZIP-to-county crosswalk
  // ═══════════════════════════════════════════
  console.log('STEP 4: Downloading Census ZIP-county crosswalk...');
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
  // STEP 5 — Download HUD FMR data
  // ═══════════════════════════════════════════
  console.log('STEP 5: Downloading HUD FMR data...');
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
  // STEP 6 — Connect to Turso
  // ═══════════════════════════════════════════
  const config = getClientConfig();
  console.log(`\nSTEP 6: Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // Assign county_fips to each institution
  for (const inst of institutions) {
    const cleanZip = padFips(inst.zip.split('-')[0], 5); // Handle ZIP+4
    inst.countyFips = zipToCounty.get(cleanZip) ?? null;
  }

  // ═══════════════════════════════════════════
  // STEP 7 — Upsert universities in batches
  // ═══════════════════════════════════════════
  console.log('STEP 7: Upserting universities...');
  const now = new Date().toISOString();
  let upserted = 0;
  let upsertFailed = 0;
  const BATCH = 100;
  const totalBatches = Math.ceil(institutions.length / BATCH);

  for (let b = 0; b < totalBatches; b++) {
    const batch = institutions.slice(b * BATCH, (b + 1) * BATCH);
    for (const inst of batch) {
      try {
        await client.execute({
          sql: `INSERT OR REPLACE INTO universities
            (ipeds_id, name, city, state, zip, latitude, longitude, enrollment, slug, county_fips, portal_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          args: [inst.unitId, inst.name, inst.city, inst.state, inst.zip, inst.lat, inst.lng, inst.enrollment, inst.slug, inst.countyFips, now],
        });
        upserted++;
      } catch (err) {
        console.error(`  Failed to upsert ${inst.name}: ${err}`);
        upsertFailed++;
      }
    }
    if ((b + 1) % 5 === 0 || b === totalBatches - 1) {
      console.log(`  Inserted batch ${b + 1}/${totalBatches} (${upserted} total so far)`);
    }
  }

  // ═══════════════════════════════════════════
  // STEP 8 — Insert market data in batches
  // ═══════════════════════════════════════════
  console.log('STEP 8: Inserting market data...');
  let withFmr = 0;
  let withoutFmr = 0;
  let marketRows = 0;
  const missingFmr: { ipeds_id: string; name: string; city: string; state: string; zip: string }[] = [];

  for (let b = 0; b < totalBatches; b++) {
    const batch = institutions.slice(b * BATCH, (b + 1) * BATCH);
    for (const inst of batch) {
      if (!inst.countyFips) {
        withoutFmr++;
        missingFmr.push({ ipeds_id: inst.unitId, name: inst.name, city: inst.city, state: inst.state, zip: inst.zip });
        continue;
      }
      const fmr = fmrByCounty.get(inst.countyFips);
      if (!fmr) {
        withoutFmr++;
        missingFmr.push({ ipeds_id: inst.unitId, name: inst.name, city: inst.city, state: inst.state, zip: inst.zip });
        continue;
      }

      // Get university_id
      try {
        const uniRow = await client.execute({
          sql: 'SELECT id FROM universities WHERE ipeds_id = ?',
          args: [inst.unitId],
        });
        if (uniRow.rows.length === 0) continue;
        const uniId = uniRow.rows[0]['id'] as number;

        const rents = [fmr.fmr_0, fmr.fmr_1, fmr.fmr_2, fmr.fmr_3, fmr.fmr_4];
        for (let br = 0; br <= 4; br++) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO university_market_data
              (university_id, bedroom_count, median_rent, data_year, data_source, updated_at)
              VALUES (?, ?, ?, 2026, 'HUD_FMR', ?)`,
            args: [uniId, br, rents[br], now],
          });
          marketRows++;
        }
        withFmr++;
      } catch (err) {
        console.error(`  Failed FMR for ${inst.name}: ${err}`);
        withoutFmr++;
      }
    }
    if ((b + 1) % 5 === 0 || b === totalBatches - 1) {
      console.log(`  Market data batch ${b + 1}/${totalBatches} (${withFmr} with FMR, ${withoutFmr} without)`);
    }
  }

  // ═══════════════════════════════════════════
  // STEP 9 — Summary
  // ═══════════════════════════════════════════
  console.log('\n=== NATIONAL SEED SUMMARY ===');
  console.log(`Total institutions processed: ${institutions.length}`);
  console.log(`Successfully upserted: ${upserted}`);
  console.log(`Upsert failures: ${upsertFailed}`);
  console.log(`Skipped (no geocode): ${noGeocode}`);
  console.log(`With FMR data: ${withFmr}`);
  console.log(`Without FMR data: ${withoutFmr}`);
  console.log(`Total market data rows inserted: ${marketRows}`);

  // Write missing FMR to file
  const dataDir = join(__dirname, '..', '..', 'data');
  try { mkdirSync(dataDir, { recursive: true }); } catch { /* exists */ }
  writeFileSync(join(dataDir, 'missing-fmr.json'), JSON.stringify(missingFmr, null, 2));
  console.log(`\nMissing FMR data written to server/data/missing-fmr.json (${missingFmr.length} institutions)`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
