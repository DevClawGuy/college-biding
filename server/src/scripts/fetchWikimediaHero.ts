import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

const HEADERS = { 'User-Agent': 'HouseRush/1.0 (https://houserush.app; contact@houserush.app)' };

interface WikiPagesResponse {
  query: {
    pages: Record<string, {
      original?: { source: string };
      imageinfo?: Array<{ url: string }>;
    }>;
  };
}

interface WikiSearchResponse {
  query: {
    search: Array<{ title: string }>;
  };
}

async function fetchImageUrl(universityName: string): Promise<string | null> {
  // Strategy 1: Wikipedia pageimages API
  const wikiUrl = new URL('https://en.wikipedia.org/w/api.php');
  wikiUrl.searchParams.set('action', 'query');
  wikiUrl.searchParams.set('titles', universityName);
  wikiUrl.searchParams.set('prop', 'pageimages');
  wikiUrl.searchParams.set('piprop', 'original');
  wikiUrl.searchParams.set('format', 'json');
  wikiUrl.searchParams.set('origin', '*');

  try {
    const res = await fetch(wikiUrl.toString(), { headers: HEADERS });
    if (res.ok) {
      const data = (await res.json()) as WikiPagesResponse;
      const pages = data.query?.pages ?? {};
      const pageId = Object.keys(pages)[0];
      const url = pages[pageId]?.original?.source;
      if (url) return url;
    }
  } catch { /* continue to fallback */ }

  // Strategy 2: Search Wikimedia Commons
  const commonsSearchUrl = new URL('https://commons.wikimedia.org/w/api.php');
  commonsSearchUrl.searchParams.set('action', 'query');
  commonsSearchUrl.searchParams.set('list', 'search');
  commonsSearchUrl.searchParams.set('srsearch', `${universityName} campus`);
  commonsSearchUrl.searchParams.set('srnamespace', '6');
  commonsSearchUrl.searchParams.set('srlimit', '1');
  commonsSearchUrl.searchParams.set('format', 'json');
  commonsSearchUrl.searchParams.set('origin', '*');

  try {
    const res = await fetch(commonsSearchUrl.toString(), { headers: HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as WikiSearchResponse;
    const firstResult = data.query?.search?.[0];
    if (!firstResult) return null;

    // Get the actual image URL
    const infoUrl = new URL('https://commons.wikimedia.org/w/api.php');
    infoUrl.searchParams.set('action', 'query');
    infoUrl.searchParams.set('titles', firstResult.title);
    infoUrl.searchParams.set('prop', 'imageinfo');
    infoUrl.searchParams.set('iiprop', 'url');
    infoUrl.searchParams.set('format', 'json');
    infoUrl.searchParams.set('origin', '*');

    const infoRes = await fetch(infoUrl.toString(), { headers: HEADERS });
    if (!infoRes.ok) return null;
    const infoData = (await infoRes.json()) as WikiPagesResponse;
    const infoPages = infoData.query?.pages ?? {};
    const infoPageId = Object.keys(infoPages)[0];
    return infoPages[infoPageId]?.imageinfo?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

async function run() {
  console.log('Fetching Wikimedia hero image for Monmouth University...');

  const imageUrl = await fetchImageUrl('Monmouth University');

  if (!imageUrl) {
    console.log('No image found for Monmouth University');
    process.exit(0);
  }

  console.log(`Found image: ${imageUrl}`);

  const config = getClientConfig();
  console.log(`Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);
  const db = drizzle(client, { schema });

  try {
    await db.update(schema.universities)
      .set({ heroImageUrl: imageUrl })
      .where(eq(schema.universities.slug, 'monmouth-university-nj'))
      .run();

    console.log('Successfully saved heroImageUrl for monmouth-university-nj');
  } catch (err) {
    console.error('Failed to update DB:', err);
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
