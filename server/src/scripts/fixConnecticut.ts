import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';

const FMR_URL = 'https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx';

// Connecticut switched from 8 county FIPS to 9 planning region codes in FY2026
const CT_FIPS_REMAP: Record<string, string> = {
  '09001': '09120', // Fairfield → Greater Bridgeport
  '09003': '09110', // Hartford → Capitol
  '09005': '09160', // Litchfield → Northwest Hills
  '09007': '09130', // Middlesex → Lower CT River Valley
  '09009': '09170', // New Haven → South Central CT
  '09011': '09180', // New London → Southeastern CT
  '09013': '09150', // Tolland → Northeastern CT
  '09015': '09150', // Windham → Northeastern CT
};

function padFips(val: string | number | undefined, len: number): string {
  return String(val ?? '').padStart(len, '0');
}

interface LostInstitution {
  ipeds_id: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  county_fips: string;
}

async function run() {
  // STEP 1 — Download HUD FMR data
  console.log('STEP 1: Downloading HUD FMR data...');
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

  // STEP 2 — Connect to Turso
  const config = getClientConfig();
  console.log(`\nSTEP 2: Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // STEP 3 — Read lost-fmr.json
  console.log('STEP 3: Reading lost-fmr.json...');
  const dataPath = join(__dirname, '..', '..', 'data', 'lost-fmr.json');
  let lost: LostInstitution[];
  try {
    lost = JSON.parse(readFileSync(dataPath, 'utf8'));
    console.log(`  Loaded ${lost.length} institutions`);
  } catch (err) {
    console.error('Failed to read lost-fmr.json:', err);
    process.exit(1);
  }

  // STEP 4 — Remap and insert FMR
  console.log('\nSTEP 4: Remapping CT FIPS codes and inserting FMR data...\n');
  const now = new Date().toISOString();
  let fixed = 0;
  let noFmr = 0;

  for (const inst of lost) {
    const oldFips = inst.county_fips;
    const newFips = CT_FIPS_REMAP[oldFips] ?? oldFips;

    // Update county_fips
    try {
      await client.execute({
        sql: 'UPDATE universities SET county_fips = ? WHERE ipeds_id = ?',
        args: [newFips, inst.ipeds_id],
      });
    } catch (err) {
      console.error(`  ${inst.name} — failed to update county_fips: ${err}`);
      continue;
    }

    // Look up FMR
    const fmr = fmrByCounty.get(newFips);
    if (!fmr) {
      console.log(`  ${inst.name} — remap ${oldFips} → ${newFips} but no FMR data`);
      noFmr++;
      continue;
    }

    // Get university id
    try {
      const uniRow = await client.execute({
        sql: 'SELECT id FROM universities WHERE ipeds_id = ?',
        args: [inst.ipeds_id],
      });
      if (uniRow.rows.length === 0) {
        console.log(`  ${inst.name} — not found in universities table`);
        continue;
      }
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
      fixed++;
      console.log(`  ${inst.name} — remapped ${oldFips} → ${newFips}, FMR inserted`);
    } catch (err) {
      console.error(`  ${inst.name} — FMR insert failed: ${err}`);
    }
  }

  // STEP 5 — Summary
  console.log('\n=== CONNECTICUT FIX SUMMARY ===');
  console.log(`Total processed: ${lost.length}`);
  console.log(`Fixed with FMR data: ${fixed}`);
  console.log(`No FMR after remap: ${noFmr}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
