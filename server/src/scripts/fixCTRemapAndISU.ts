import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import * as XLSX from 'xlsx';

const FMR_URL = 'https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx';

const CT_FIPS_REMAP: Record<string, string> = {
  '09001': '09120',
  '09003': '09110',
  '09005': '09160',
  '09007': '09130',
  '09009': '09170',
  '09011': '09180',
  '09013': '09150',
  '09015': '09150',
};

const OLD_CT_FIPS = Object.keys(CT_FIPS_REMAP);

function padFips(val: string | number | undefined, len: number): string {
  return String(val ?? '').padStart(len, '0');
}

async function run() {
  // Download HUD FMR
  console.log('Downloading HUD FMR data...');
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
    console.log(`HUD FMR loaded: ${fmrByCounty.size} county records`);
  } catch (err) {
    console.error('Failed to fetch HUD FMR:', err);
    process.exit(1);
  }

  // Connect to DB
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);
  const now = new Date().toISOString();

  // Helper: insert 5 FMR rows for a university
  async function insertFMR(uniId: number, countyFips: string, name: string): Promise<boolean> {
    const fmr = fmrByCounty.get(countyFips);
    if (!fmr) {
      console.log(`  ${name} — no FMR data for ${countyFips}`);
      return false;
    }
    // Delete existing market data
    await client.execute({ sql: 'DELETE FROM university_market_data WHERE university_id = ?', args: [uniId] });
    // Insert fresh
    const rents = [fmr.fmr_0, fmr.fmr_1, fmr.fmr_2, fmr.fmr_3, fmr.fmr_4];
    for (let br = 0; br <= 4; br++) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO university_market_data
          (university_id, bedroom_count, median_rent, data_year, data_source, updated_at)
          VALUES (?, ?, ?, 2026, 'HUD_FMR', ?)`,
        args: [uniId, br, rents[br], now],
      });
    }
    return true;
  }

  // Fix CT universities with old FIPS codes
  console.log('\n--- Fixing CT universities with old FIPS codes ---');
  let ctFixed = 0;
  let ctFailed = 0;

  const placeholders = OLD_CT_FIPS.map(() => '?').join(',');
  const ctRows = await client.execute({
    sql: `SELECT id, ipeds_id, name, county_fips FROM universities WHERE state = 'CT' AND county_fips IN (${placeholders})`,
    args: OLD_CT_FIPS,
  });

  for (const row of ctRows.rows) {
    const uniId = row['id'] as number;
    const name = row['name'] as string;
    const oldFips = row['county_fips'] as string;
    const newFips = CT_FIPS_REMAP[oldFips];

    if (!newFips) { ctFailed++; continue; }

    try {
      await client.execute({ sql: 'UPDATE universities SET county_fips = ? WHERE id = ?', args: [newFips, uniId] });
      const ok = await insertFMR(uniId, newFips, name);
      if (ok) {
        console.log(`  ${name} — ${oldFips} → ${newFips}, FMR inserted`);
        ctFixed++;
      } else {
        ctFailed++;
      }
    } catch (err) {
      console.error(`  ${name} — failed: ${err}`);
      ctFailed++;
    }
  }

  // Fix Illinois State University
  console.log('\n--- Fixing Illinois State University ---');
  let isuFixed = false;

  try {
    const isuRow = await client.execute({
      sql: "SELECT id FROM universities WHERE name = 'Illinois State University' AND state = 'IL'",
      args: [],
    });
    if (isuRow.rows.length > 0) {
      const uniId = isuRow.rows[0]['id'] as number;
      await client.execute({ sql: "UPDATE universities SET county_fips = '17113' WHERE id = ?", args: [uniId] });
      const ok = await insertFMR(uniId, '17113', 'Illinois State University');
      if (ok) {
        console.log('  Illinois State University — county_fips set to 17113 (McLean County), FMR inserted');
        isuFixed = true;
      }
    } else {
      console.log('  Illinois State University not found in DB');
    }
  } catch (err) {
    console.error(`  ISU fix failed: ${err}`);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`CT universities remapped: ${ctFixed}`);
  console.log(`CT universities failed: ${ctFailed}`);
  console.log(`Illinois State University: ${isuFixed ? 'FIXED' : 'FAILED'}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
