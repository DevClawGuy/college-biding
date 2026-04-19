import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { eq, isNull } from 'drizzle-orm';
import * as schema from '../db/schema';

const HEADERS = { 'User-Agent': 'HouseRush/1.0 (https://houserush.app; contact@houserush.app)' };

const FILTER_PATTERNS = [/logo/i, /seal/i, /coat_of_arms/i, /flag/i, /map/i, /\.svg$/i];

interface WikiPagesResponse {
  query?: {
    pages?: Record<string, {
      original?: { source: string };
    }>;
  };
}

function isFiltered(url: string): boolean {
  return FILTER_PATTERNS.some(p => p.test(url));
}

async function fetchImageUrl(name: string): Promise<string | null> {
  // Attempt 1: exact university name
  const url1 = new URL('https://en.wikipedia.org/w/api.php');
  url1.searchParams.set('action', 'query');
  url1.searchParams.set('titles', name);
  url1.searchParams.set('prop', 'pageimages');
  url1.searchParams.set('piprop', 'original');
  url1.searchParams.set('format', 'json');
  url1.searchParams.set('origin', '*');

  try {
    const res = await fetch(url1.toString(), { headers: HEADERS });
    if (res.ok) {
      const data = (await res.json()) as WikiPagesResponse;
      const pages = data.query?.pages ?? {};
      const pageId = Object.keys(pages)[0];
      const imgUrl = pages[pageId]?.original?.source;
      if (imgUrl) return imgUrl;
    }
  } catch { /* continue */ }

  // Attempt 2: "[name] campus"
  const url2 = new URL('https://en.wikipedia.org/w/api.php');
  url2.searchParams.set('action', 'query');
  url2.searchParams.set('titles', `${name} campus`);
  url2.searchParams.set('prop', 'pageimages');
  url2.searchParams.set('piprop', 'original');
  url2.searchParams.set('format', 'json');
  url2.searchParams.set('origin', '*');

  try {
    const res = await fetch(url2.toString(), { headers: HEADERS });
    if (res.ok) {
      const data = (await res.json()) as WikiPagesResponse;
      const pages = data.query?.pages ?? {};
      const pageId = Object.keys(pages)[0];
      const imgUrl = pages[pageId]?.original?.source;
      if (imgUrl) return imgUrl;
    }
  } catch { /* continue */ }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);
  const db = drizzle(client, { schema });

  // Fetch all universities
  const allUnis = await db.select({
    id: schema.universities.id,
    name: schema.universities.name,
    heroImageUrl: schema.universities.heroImageUrl,
  }).from(schema.universities);

  const toProcess = allUnis.filter(u => !u.heroImageUrl);
  console.log(`Total universities: ${allUnis.length}`);
  console.log(`Already have images: ${allUnis.length - toProcess.length}`);
  console.log(`To process: ${toProcess.length}\n`);

  let saved = 0;
  let noImage = 0;
  let filtered = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const uni = toProcess[i];

    try {
      const imageUrl = await fetchImageUrl(uni.name);

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

    // Progress logging every 50
    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${toProcess.length} — ${saved} images saved, ${noImage} no image, ${filtered} filtered, ${errors} errors`);
    }

    // Rate limit
    await sleep(500);
  }

  console.log('\n=== WIKIMEDIA HERO FETCH COMPLETE ===');
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
