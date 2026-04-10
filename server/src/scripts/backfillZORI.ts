import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';

const ZORI_URL = 'https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function run() {
  // ═══════════════════════════════════════════
  // STEP 1 — Download ZORI CSV
  // ═══════════════════════════════════════════
  console.log('Downloading Zillow ZORI CSV...');
  let csvText: string;
  try {
    const res = await fetch(ZORI_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csvText = await res.text();
    console.log(`  Downloaded ${(csvText.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.error('Failed to download ZORI CSV:', err);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // STEP 2 — Parse CSV
  // ═══════════════════════════════════════════
  console.log('Parsing CSV...');
  const lines = csvText.split('\n');
  const headers = parseCSVLine(lines[0]);

  // Find key column indices
  const zipIdx = headers.indexOf('RegionName');
  if (zipIdx < 0) {
    console.error('RegionName column not found. Headers:', headers.slice(0, 10));
    process.exit(1);
  }

  // Find date columns (YYYY-MM-DD format at the end of headers)
  const dateColIndices: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(headers[i])) {
      dateColIndices.push(i);
    }
  }

  if (dateColIndices.length < 13) {
    console.error(`Only ${dateColIndices.length} date columns found, need at least 13`);
    process.exit(1);
  }

  const lastDateIdx = dateColIndices[dateColIndices.length - 1];
  const ago12Idx = dateColIndices[dateColIndices.length - 13];
  const lastDateName = headers[lastDateIdx];
  console.log(`  Date columns: ${dateColIndices.length} months`);
  console.log(`  Latest: ${lastDateName}, 12mo ago: ${headers[ago12Idx]}`);

  // Build ZIP lookup map
  const zipMap = new Map<string, { latest: number; ago12: number; yoyPct: number; updatedAt: string }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);

    const rawZip = cols[zipIdx] ?? '';
    const zip = String(rawZip).padStart(5, '0');

    const latestStr = cols[lastDateIdx] ?? '';
    const ago12Str = cols[ago12Idx] ?? '';

    const latest = parseFloat(latestStr);
    const ago12 = parseFloat(ago12Str);

    if (isNaN(latest) || latest <= 0) continue;

    const yoyPct = !isNaN(ago12) && ago12 > 0
      ? Math.round(((latest - ago12) / ago12) * 1000) / 10
      : 0;

    zipMap.set(zip, {
      latest: Math.round(latest),
      ago12: !isNaN(ago12) && ago12 > 0 ? Math.round(ago12) : 0,
      yoyPct,
      updatedAt: lastDateName,
    });
  }

  console.log(`  ZIP map: ${zipMap.size} entries`);

  // ═══════════════════════════════════════════
  // STEP 3 — Connect to DB
  // ═══════════════════════════════════════════
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // ═══════════════════════════════════════════
  // STEP 4 — Fetch universities and match
  // ═══════════════════════════════════════════
  const result = await client.execute('SELECT id, name, zip FROM universities');
  console.log(`Found ${result.rows.length} universities\n`);

  let matched = 0;
  let skipped = 0;

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    const uniId = row['id'] as number;
    const uniZip = row['zip'] as string | null;

    if (!uniZip) { skipped++; continue; }

    // Normalize ZIP: take first 5 chars, pad
    const cleanZip = String(uniZip).split('-')[0].padStart(5, '0');
    const data = zipMap.get(cleanZip);

    if (!data) { skipped++; continue; }

    try {
      await client.execute({
        sql: `UPDATE universities
              SET zori_latest = ?, zori_12mo_ago = ?, zori_yoy_pct = ?, zori_updated_at = ?
              WHERE id = ?`,
        args: [data.latest, data.ago12 > 0 ? data.ago12 : null, data.yoyPct, data.updatedAt, uniId],
      });
      matched++;

      if (matched % 100 === 0) {
        console.log(`  Progress: ${matched} matched, ${skipped} skipped`);
      }
    } catch (err) {
      console.error(`  Failed to update university ${uniId}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════
  // STEP 5 — Summary
  // ═══════════════════════════════════════════
  console.log('\n=== ZORI BACKFILL SUMMARY ===');
  console.log(`Total universities: ${result.rows.length}`);
  console.log(`Matched via ZIP: ${matched}`);
  console.log(`Skipped (no ZIP match): ${skipped}`);
  console.log(`Coverage: ${(matched / result.rows.length * 100).toFixed(1)}%`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
