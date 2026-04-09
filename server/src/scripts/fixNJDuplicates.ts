import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';

// Hardcoded mapping: old NJ seed record → real IPEDS duplicate record
// old_id: original NJ seed, new_id: national seed duplicate with real IPEDS ID
const NJ_PAIRS = [
  { oldId: 1,  oldName: 'Rutgers New Brunswick',          newId: 1146, realIpedsId: '186380' },
  { oldId: 4,  oldName: 'Ramapo College',                 newId: 1143, realIpedsId: '186201' },
  { oldId: 6,  oldName: 'The College of New Jersey',       newId: 1155, realIpedsId: '187134' },
  { oldId: 7,  oldName: 'William Paterson University',     newId: 1156, realIpedsId: '187444' },
  { oldId: 8,  oldName: 'Fairleigh Dickinson University',  newId: 1128, realIpedsId: '184603' },
  { oldId: 10, oldName: 'NJIT',                            newId: 1139, realIpedsId: '185828' },
  { oldId: 15, oldName: 'Saint Peters University',          newId: 1148, realIpedsId: '186432' },
  { oldId: 16, oldName: 'Rutgers Newark',                   newId: 1147, realIpedsId: '186399' },
  { oldId: 17, oldName: 'Rutgers Camden',                   newId: 1145, realIpedsId: '186371' },
  { oldId: 18, oldName: 'NJ City University',               newId: 1134, realIpedsId: '185129' },
  { oldId: 26, oldName: 'Berkeley College',                  newId: 1122, realIpedsId: '183789' },
];

async function run() {
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  let ipedsUpdated = 0;
  let housingPopulated = 0;
  let slugsFixed = 0;

  for (const pair of NJ_PAIRS) {
    console.log(`\n--- ${pair.oldName} (id=${pair.oldId}) ---`);

    // ═══════════════════════════════════════════
    // PART A — Copy IPEDS data from duplicate to original
    // ═══════════════════════════════════════════

    // Get the duplicate record's IPEDS housing data
    const dupRow = await client.execute({
      sql: 'SELECT ipeds_room_board_oncampus, ipeds_housing_offcampus, ipeds_data_year FROM universities WHERE id = ?',
      args: [pair.newId],
    });

    if (dupRow.rows.length === 0) {
      console.log(`  WARNING: Duplicate record id=${pair.newId} not found, skipping`);
      continue;
    }

    const dup = dupRow.rows[0];
    const roomBoard = dup['ipeds_room_board_oncampus'] as number | null;
    const housing = dup['ipeds_housing_offcampus'] as number | null;
    const dataYear = dup['ipeds_data_year'] as number | null;

    // Update the original NJ record: set real IPEDS ID + copy housing data
    // ipeds_id has a UNIQUE constraint, so we must first clear it from the duplicate
    // Step 1: Update duplicate's ipeds_id to a temp value
    await client.execute({
      sql: 'UPDATE universities SET ipeds_id = ? WHERE id = ?',
      args: [`_dup_${pair.realIpedsId}`, pair.newId],
    });

    // Step 2: Update original's ipeds_id to the real one
    await client.execute({
      sql: 'UPDATE universities SET ipeds_id = ? WHERE id = ?',
      args: [pair.realIpedsId, pair.oldId],
    });

    console.log(`  IPEDS ID: NJ${String(pair.oldId).padStart(3, '0')} → ${pair.realIpedsId}`);
    ipedsUpdated++;

    // Step 3: Copy housing data to original
    if (housing != null || roomBoard != null) {
      await client.execute({
        sql: `UPDATE universities
              SET ipeds_room_board_oncampus = ?,
                  ipeds_housing_offcampus = ?,
                  ipeds_data_year = ?
              WHERE id = ?`,
        args: [roomBoard, housing, dataYear, pair.oldId],
      });
      console.log(`  Housing data: room+board=$${roomBoard}/mo, off-campus=$${housing}/mo`);
      housingPopulated++;
    } else {
      console.log(`  No housing data on duplicate to copy`);
    }

    // ═══════════════════════════════════════════
    // PART B — Fix slug conflict on duplicate
    // ═══════════════════════════════════════════
    const dupSlugRow = await client.execute({
      sql: 'SELECT slug FROM universities WHERE id = ?',
      args: [pair.newId],
    });

    if (dupSlugRow.rows.length > 0) {
      const dupSlug = dupSlugRow.rows[0]['slug'] as string;
      const newSlug = dupSlug + '-dup';
      await client.execute({
        sql: 'UPDATE universities SET slug = ? WHERE id = ?',
        args: [newSlug, pair.newId],
      });
      console.log(`  Duplicate slug: ${dupSlug} → ${newSlug}`);
      slugsFixed++;
    }
  }

  // ═══════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════
  console.log('\n=== NJ DUPLICATE FIX SUMMARY ===');
  console.log(`Original NJ records updated with real IPEDS IDs: ${ipedsUpdated}`);
  console.log(`Housing data populated: ${housingPopulated}`);
  console.log(`Slug conflicts resolved: ${slugsFixed}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
