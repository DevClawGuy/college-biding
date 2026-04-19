import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { eq, isNull, and } from 'drizzle-orm';
import * as schema from '../db/schema';

const HEADERS = { 'User-Agent': 'HouseRush/1.0 (https://houserush.app)' };

interface MetadataResponse {
  status: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const apiKey = process.env.GOOGLE_STREET_VIEW_KEY;
  if (!apiKey) {
    console.error('GOOGLE_STREET_VIEW_KEY is not set in environment. Exiting.');
    process.exit(1);
  }

  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);
  const db = drizzle(client, { schema });

  const toProcess = await db.select({
    id: schema.universities.id,
    name: schema.universities.name,
    latitude: schema.universities.latitude,
    longitude: schema.universities.longitude,
  }).from(schema.universities)
    .where(and(
      isNull(schema.universities.heroImageUrl),
      schema.universities.latitude !== null ? undefined : undefined,
    ));

  // Filter in JS since Drizzle isNull/isNotNull for multiple cols is cleaner this way
  const candidates = toProcess.filter(u => u.latitude != null && u.longitude != null);

  console.log(`Found ${candidates.length} universities without images — processing...\n`);

  let saved = 0;
  let noCoverage = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i++) {
    const uni = candidates[i];

    try {
      // Check metadata first
      const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${uni.latitude},${uni.longitude}&key=${apiKey}`;
      const metaRes = await fetch(metaUrl, { headers: HEADERS });

      if (!metaRes.ok) {
        noCoverage++;
        if ((i + 1) % 50 === 0) console.log(`Progress: ${i + 1}/${candidates.length} — ${saved} saved, ${noCoverage} no coverage, ${errors} errors`);
        await sleep(200);
        continue;
      }

      const metaData = (await metaRes.json()) as MetadataResponse;

      if (metaData.status !== 'OK') {
        noCoverage++;
      } else {
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=1200x600&location=${uni.latitude},${uni.longitude}&fov=90&pitch=10&key=${apiKey}`;

        await db.update(schema.universities)
          .set({ heroImageUrl: streetViewUrl })
          .where(eq(schema.universities.id, uni.id))
          .run();

        saved++;
      }
    } catch (err) {
      console.error(`  Error for ${uni.name}: ${err}`);
      errors++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${candidates.length} — ${saved} saved, ${noCoverage} no coverage, ${errors} errors`);
    }

    await sleep(200);
  }

  console.log('\n=== STREET VIEW HERO FETCH COMPLETE ===');
  console.log(`Total processed: ${candidates.length}`);
  console.log(`Images saved: ${saved}`);
  console.log(`No coverage: ${noCoverage}`);
  console.log(`Errors: ${errors}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
