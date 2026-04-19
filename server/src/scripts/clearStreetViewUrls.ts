import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';

async function run() {
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  const countResult = await client.execute(
    "SELECT COUNT(*) as cnt FROM universities WHERE hero_image_url IS NOT NULL AND hero_image_url LIKE '%maps.googleapis.com%'"
  );
  const count = (countResult.rows[0]['cnt'] as number) ?? 0;
  console.log(`Found ${count} Street View URLs to clear`);

  if (count > 0) {
    await client.execute(
      "UPDATE universities SET hero_image_url = NULL WHERE hero_image_url LIKE '%maps.googleapis.com%'"
    );
  }

  console.log(`Cleared ${count} Street View URLs. Wikimedia photos preserved.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
