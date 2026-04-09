import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const IPEDS_URL = 'https://nces.ed.gov/ipeds/datacenter/data/IC2023_AY.zip';
const ZIP_PATH = '/tmp/IC2023_AY.zip';
const CSV_PATH = '/tmp/ic2023_ay.csv';

async function run() {
  // ═══════════════════════════════════════════
  // STEP 1 — Download and unzip IPEDS IC2023_AY
  // ═══════════════════════════════════════════
  if (!existsSync(CSV_PATH)) {
    console.log('Downloading IPEDS IC2023_AY...');
    execSync(`curl -L -o ${ZIP_PATH} "${IPEDS_URL}"`, { stdio: 'inherit' });
    execSync(`cd /tmp && unzip -o ${ZIP_PATH}`, { stdio: 'inherit' });
  } else {
    console.log('IPEDS CSV already exists at', CSV_PATH);
  }

  // ═══════════════════════════════════════════
  // STEP 2 — Parse CSV
  // ═══════════════════════════════════════════
  console.log('Parsing CSV...');
  const raw = readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split('\n');
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(',').map(h => h.trim());

  const unitidIdx = headers.indexOf('UNITID');
  // CHG5AY3 = on-campus room + board (annual, out-of-state — most complete)
  const chg5Idx = headers.indexOf('CHG5AY3');
  // CHG8AY3 = off-campus (not with family) room + board (annual)
  const chg8Idx = headers.indexOf('CHG8AY3');

  if (unitidIdx < 0 || chg5Idx < 0 || chg8Idx < 0) {
    console.error('Missing required columns. Found:', { unitidIdx, chg5Idx, chg8Idx });
    process.exit(1);
  }

  // Build map: UNITID (as zero-padded 6-char string) → { roomBoard, offCampus }
  const ipedsData = new Map<string, { roomBoard: number; offCampus: number }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');

    const unitidRaw = (cols[unitidIdx] || '').trim();
    const chg5Raw = (cols[chg5Idx] || '').trim();
    const chg8Raw = (cols[chg8Idx] || '').trim();

    if (!unitidRaw || unitidRaw === '.') continue;

    // Normalize UNITID to 6-char zero-padded string to match our ipeds_id column
    const unitid = unitidRaw.padStart(6, '0');

    const roomBoardAnnual = parseFloat(chg5Raw);
    const offCampusAnnual = parseFloat(chg8Raw);

    // Skip rows where both housing fields are missing or zero
    if ((isNaN(roomBoardAnnual) || roomBoardAnnual <= 0) &&
        (isNaN(offCampusAnnual) || offCampusAnnual <= 0)) {
      continue;
    }

    // Convert annual figures to monthly by dividing by 12
    // IPEDS reports annual academic year costs; we store monthly for consistency
    // with HUD FMR data which is also monthly
    const roomBoard = !isNaN(roomBoardAnnual) && roomBoardAnnual > 0
      ? Math.round(roomBoardAnnual / 12)
      : 0;
    const offCampus = !isNaN(offCampusAnnual) && offCampusAnnual > 0
      ? Math.round(offCampusAnnual / 12)
      : 0;

    ipedsData.set(unitid, { roomBoard, offCampus });
  }

  console.log(`Parsed ${ipedsData.size} institutions with housing data`);

  // ═══════════════════════════════════════════
  // STEP 3 — Connect to DB
  // ═══════════════════════════════════════════
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // ═══════════════════════════════════════════
  // STEP 4 — Fetch all universities
  // ═══════════════════════════════════════════
  const result = await client.execute('SELECT id, ipeds_id, name FROM universities');
  console.log(`Found ${result.rows.length} universities in DB\n`);

  let updated = 0;
  let skippedNotFound = 0;
  let skippedNoData = 0;

  // ═══════════════════════════════════════════
  // STEP 5 — Match and update
  // ═══════════════════════════════════════════
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    const uniId = row['id'] as number;
    const ipedsId = row['ipeds_id'] as string;
    const name = row['name'] as string;

    const data = ipedsData.get(ipedsId);
    if (!data) {
      skippedNotFound++;
      continue;
    }

    if (data.roomBoard <= 0 && data.offCampus <= 0) {
      skippedNoData++;
      continue;
    }

    await client.execute({
      sql: `UPDATE universities
            SET ipeds_room_board_oncampus = ?,
                ipeds_housing_offcampus = ?,
                ipeds_data_year = 2023
            WHERE id = ?`,
      args: [
        data.roomBoard > 0 ? data.roomBoard : null,
        data.offCampus > 0 ? data.offCampus : null,
        uniId,
      ],
    });

    updated++;

    if (updated % 100 === 0) {
      console.log(`  Progress: ${updated} updated, ${skippedNotFound} not in IPEDS, ${skippedNoData} no data`);
    }
  }

  // ═══════════════════════════════════════════
  // STEP 6 — Summary
  // ═══════════════════════════════════════════
  console.log('\n=== IPEDS BACKFILL SUMMARY ===');
  console.log(`Total universities in DB: ${result.rows.length}`);
  console.log(`Updated with IPEDS data: ${updated}`);
  console.log(`Skipped (not in IPEDS): ${skippedNotFound}`);
  console.log(`Skipped (no housing data): ${skippedNoData}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
