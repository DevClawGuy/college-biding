import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function run() {
  const config = getClientConfig();
  console.log('Connecting to DB:', config.url.substring(0, 45) + '...');
  const client = createClient(config);

  console.log('Finding universities with county_fips but no market data...\n');

  const result = await client.execute(`
    SELECT u.ipeds_id, u.name, u.city, u.state, u.zip, u.county_fips,
           COUNT(m.id) as market_data_count
    FROM universities u
    LEFT JOIN university_market_data m ON m.university_id = u.id
    WHERE u.county_fips IS NOT NULL
    GROUP BY u.id
    HAVING market_data_count = 0
  `);

  const lost = result.rows.map(row => ({
    ipeds_id: row['ipeds_id'] as string,
    name: row['name'] as string,
    city: row['city'] as string,
    state: row['state'] as string,
    zip: row['zip'] as string,
    county_fips: row['county_fips'] as string,
  }));

  for (const inst of lost) {
    console.log(`  ${inst.name} (${inst.city}, ${inst.state} ${inst.zip}) — county: ${inst.county_fips}`);
  }

  console.log(`\nTotal found: ${lost.length}`);

  const dataDir = join(__dirname, '..', '..', 'data');
  try { mkdirSync(dataDir, { recursive: true }); } catch { /* exists */ }
  writeFileSync(join(dataDir, 'lost-fmr.json'), JSON.stringify(lost, null, 2));
  console.log(`Written to server/data/lost-fmr.json`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
