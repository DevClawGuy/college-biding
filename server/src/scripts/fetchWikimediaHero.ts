import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

interface WikiResponse {
  query: {
    pages: Record<string, {
      original?: {
        source: string;
      };
    }>;
  };
}

async function run() {
  console.log('Fetching Wikimedia Commons hero image for Monmouth University...');

  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', 'Monmouth University');
  url.searchParams.set('prop', 'pageimages');
  url.searchParams.set('piprop', 'original');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  let imageUrl: string | null = null;

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`Wikipedia API returned HTTP ${res.status}`);
      process.exit(1);
    }

    const data = (await res.json()) as WikiResponse;
    const pages = data.query?.pages;
    if (!pages) {
      console.error('No pages in Wikipedia response');
      process.exit(1);
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    imageUrl = page?.original?.source ?? null;

    if (!imageUrl) {
      console.log('No image found for Monmouth University on Wikipedia');
      process.exit(0);
    }

    console.log(`Found image: ${imageUrl}`);
  } catch (err) {
    console.error('Failed to fetch from Wikipedia:', err);
    process.exit(1);
  }

  // Save to DB
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
