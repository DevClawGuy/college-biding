import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';

function calculateRentCheck(
  askingRent: number,
  bedCount: number,
  fmrData: { fmr_0br: number; fmr_1br: number; fmr_2br: number; fmr_3br: number; fmr_4br: number }
) {
  const beds = Math.max(bedCount, 1);
  const pricePerBed = Math.round(askingRent / beds);

  let fmrForBeds: number;
  if (bedCount <= 0) fmrForBeds = fmrData.fmr_0br;
  else if (bedCount === 1) fmrForBeds = fmrData.fmr_1br;
  else if (bedCount === 2) fmrForBeds = fmrData.fmr_2br;
  else if (bedCount === 3) fmrForBeds = fmrData.fmr_3br;
  else fmrForBeds = fmrData.fmr_4br;

  const fmrPerBed = Math.round(fmrForBeds / beds);
  const ratio = fmrPerBed > 0 ? pricePerBed / fmrPerBed : 1;

  let rentcheckScore: number;
  let rentcheckLabel: string;

  if (ratio <= 0.80) { rentcheckScore = 5.0; rentcheckLabel = 'great_deal'; }
  else if (ratio <= 0.95) { rentcheckScore = 4.0; rentcheckLabel = 'good_value'; }
  else if (ratio <= 1.05) { rentcheckScore = 3.0; rentcheckLabel = 'at_market'; }
  else if (ratio <= 1.20) { rentcheckScore = 2.0; rentcheckLabel = 'above_market'; }
  else { rentcheckScore = 1.0; rentcheckLabel = 'expensive'; }

  return { pricePerBed, fmrForBeds, rentcheckScore, rentcheckLabel };
}

async function run() {
  const config = getClientConfig();
  console.log('Connecting to DB:', config.url.substring(0, 45) + '...');
  const client = createClient(config);

  // Fetch listings without RentCheck scores
  const listings = await client.execute(
    'SELECT id, nearest_university, starting_bid, beds FROM listings WHERE rentcheck_score IS NULL'
  );
  console.log(`Found ${listings.rows.length} listings without RentCheck scores\n`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < listings.rows.length; i++) {
    const row = listings.rows[i];
    const listingId = row['id'] as string;
    const nearestUniversity = row['nearest_university'] as string;
    const startingBid = row['starting_bid'] as number;
    const beds = row['beds'] as number;

    // Look up university
    const uniResult = await client.execute({
      sql: 'SELECT id FROM universities WHERE name = ?',
      args: [nearestUniversity],
    });

    if (uniResult.rows.length === 0) {
      skipped++;
      continue;
    }

    const uniId = uniResult.rows[0]['id'] as number;

    // Look up FMR data
    const marketRows = await client.execute({
      sql: 'SELECT bedroom_count, median_rent FROM university_market_data WHERE university_id = ?',
      args: [uniId],
    });

    if (marketRows.rows.length === 0) {
      skipped++;
      continue;
    }

    const fmrData = { fmr_0br: 0, fmr_1br: 0, fmr_2br: 0, fmr_3br: 0, fmr_4br: 0 };
    for (const mr of marketRows.rows) {
      const bc = mr['bedroom_count'] as number;
      const rent = (mr['median_rent'] as number) ?? 0;
      if (bc === 0) fmrData.fmr_0br = rent;
      else if (bc === 1) fmrData.fmr_1br = rent;
      else if (bc === 2) fmrData.fmr_2br = rent;
      else if (bc === 3) fmrData.fmr_3br = rent;
      else if (bc === 4) fmrData.fmr_4br = rent;
    }

    const rc = calculateRentCheck(startingBid, beds, fmrData);

    await client.execute({
      sql: 'UPDATE listings SET price_per_bed = ?, fmr_for_beds = ?, rentcheck_score = ?, rentcheck_label = ? WHERE id = ?',
      args: [rc.pricePerBed, rc.fmrForBeds, rc.rentcheckScore, rc.rentcheckLabel, listingId],
    });

    updated++;

    if (updated % 10 === 0) {
      console.log(`  Progress: ${updated} updated, ${skipped} skipped`);
    }
  }

  console.log('\n=== BACKFILL RENTCHECK SUMMARY ===');
  console.log(`Total listings processed: ${listings.rows.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no FMR data): ${skipped}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
