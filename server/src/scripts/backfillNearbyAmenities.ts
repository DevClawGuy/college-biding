import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { fetchNearbyAmenities } from '../lib/overpass';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  const result = await client.execute(
    'SELECT id, title, lat, lng FROM listings WHERE nearby_amenities IS NULL AND lat IS NOT NULL AND lng IS NOT NULL'
  );
  console.log(`Found ${result.rows.length} listings to backfill\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    const id = row['id'] as string;
    const title = row['title'] as string;
    const lat = row['lat'] as number;
    const lng = row['lng'] as number;

    console.log(`Processing listing ${i + 1} of ${result.rows.length}: ${title}`);

    try {
      const amenities = await fetchNearbyAmenities(lat, lng);
      if (amenities) {
        await client.execute({
          sql: 'UPDATE listings SET nearby_amenities = ?, nearby_amenities_updated_at = ? WHERE id = ?',
          args: [JSON.stringify(amenities), new Date().toISOString(), id],
        });
        console.log(`  → ${amenities.length} amenities found`);
        succeeded++;
      } else {
        console.log('  → No results (API returned null)');
        failed++;
      }
    } catch (err) {
      console.error(`  → Error: ${err}`);
      failed++;
    }

    // Be respectful to the public Overpass server
    if (i < result.rows.length - 1) {
      await sleep(1000);
    }
  }

  console.log('\n=== NEARBY AMENITIES BACKFILL SUMMARY ===');
  console.log(`Total: ${result.rows.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
