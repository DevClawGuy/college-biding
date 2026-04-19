import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { eq, isNull } from 'drizzle-orm';
import * as schema from '../db/schema';

const HEADERS = { 'User-Agent': 'HouseRush/1.0 (https://houserush.app; contact@houserush.app)' };

const FILTER_PATTERNS = [
  /logo/i, /seal/i, /coat_of_arms/i, /flag/i, /map/i,
  /shield/i, /emblem/i, /\.svg$/i, /\.gif$/i,
];

interface SummaryResponse {
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

function isFiltered(url: string): boolean {
  return FILTER_PATTERNS.some(p => p.test(url));
}

function toWikiTitle(name: string): string {
  return name.replace(/ /g, '_');
}

async function fetchSummaryImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as SummaryResponse;
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);
  const db = drizzle(client, { schema });

  const toProcess = await db.select({
    id: schema.universities.id,
    name: schema.universities.name,
  }).from(schema.universities)
    .where(isNull(schema.universities.heroImageUrl));

  console.log(`Found ${toProcess.length} universities with no image — processing...\n`);

  let saved = 0;
  let noImage = 0;
  let filtered = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const uni = toProcess[i];

    try {
      // Attempt 1: exact name
      let imageUrl = await fetchSummaryImage(toWikiTitle(uni.name));

      // Attempt 2: with "campus" suffix
      if (!imageUrl) {
        imageUrl = await fetchSummaryImage(toWikiTitle(uni.name) + '_campus');
      }

      // Attempt 3: strip "The " prefix, try again
      if (!imageUrl && uni.name.startsWith('The ')) {
        imageUrl = await fetchSummaryImage(toWikiTitle(uni.name.replace(/^The /, '')));
      }

      if (!imageUrl) {
        noImage++;
      } else if (isFiltered(imageUrl)) {
        filtered++;
      } else {
        await db.update(schema.universities)
          .set({ heroImageUrl: imageUrl })
          .where(eq(schema.universities.id, uni.id))
          .run();
        saved++;
      }
    } catch (err) {
      console.error(`  Error for ${uni.name}: ${err}`);
      errors++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${toProcess.length} — ${saved} images saved, ${noImage} no image, ${filtered} filtered, ${errors} errors`);
    }

    await sleep(300);
  }

  console.log('\n=== V2 WIKIMEDIA HERO FETCH COMPLETE ===');
  console.log(`Total processed: ${toProcess.length}`);
  console.log(`Images saved: ${saved}`);
  console.log(`No image found: ${noImage}`);
  console.log(`Filtered as logos/seals: ${filtered}`);
  console.log(`Errors: ${errors}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
