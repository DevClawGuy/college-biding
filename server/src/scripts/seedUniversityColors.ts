import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const FRISHBERG_URL = 'https://raw.githubusercontent.com/frishberg/University-Hex-Colors/main/data.json';
const WIKIPEDIA_URL = 'https://gist.githubusercontent.com/abhandaru/148f0818e748b9cebd9cb18e4fe96950/raw/';
const ROBOTNOISES_URL = 'https://raw.githubusercontent.com/robotnoises/College-Colors/master/colors.json';

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\s+state university$/i, '')
    .replace(/\s+state college$/i, '')
    .replace(/\s+institute of technology$/i, '')
    .replace(/\s+university$/i, '')
    .replace(/\s+college$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidHex(value: string): boolean {
  return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(value);
}

function ensureHash(hex: string): string {
  const clean = hex.replace(/^#/, '');
  return '#' + clean;
}

async function run() {
  const colorMap = new Map<string, string>();

  // ═══════════════════════════════════════════
  // STEP 1 — Frishberg dataset (primary source)
  // ═══════════════════════════════════════════
  console.log('STEP 1: Downloading Frishberg dataset...');
  try {
    const res = await fetch(FRISHBERG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, string>;
    let count = 0;
    for (const [name, value] of Object.entries(data)) {
      if (!isValidHex(value)) continue;
      const key = normalize(name);
      if (!key) continue;
      colorMap.set(key, ensureHash(value));
      count++;
    }
    console.log(`  Frishberg dataset loaded: ${count} valid colors`);
  } catch (err) {
    console.error('  Frishberg fetch failed:', err);
  }

  // ═══════════════════════════════════════════
  // STEP 2 — Wikipedia College Colors Gist
  // ═══════════════════════════════════════════
  console.log('STEP 2: Downloading Wikipedia dataset...');
  try {
    const res = await fetch(WIKIPEDIA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // Format: ["School Name Mascot"] = {"HEXCODE", "HEXCODE2", ...}
    const regex = /\["([^"]+)"\]\s*=\s*\{"([0-9A-Fa-f]{3,6})"/g;
    let match;
    let added = 0;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const hex = match[2];
      const key = normalize(name);
      if (!key || colorMap.has(key)) continue;
      colorMap.set(key, ensureHash(hex));
      added++;
    }
    console.log(`  Wikipedia dataset added: ${added} additional schools`);
  } catch (err) {
    console.error('  Wikipedia fetch failed:', err);
  }

  // ═══════════════════════════════════════════
  // STEP 3 — robotnoises dataset (tertiary)
  // ═══════════════════════════════════════════
  console.log('STEP 3: Downloading robotnoises dataset...');
  try {
    const res = await fetch(ROBOTNOISES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ name: string; color1?: string; color2?: string }>;
    let added = 0;
    for (const entry of data) {
      if (!entry.name || !entry.color1) continue;
      const key = normalize(entry.name);
      if (!key || colorMap.has(key)) continue;
      colorMap.set(key, ensureHash(entry.color1));
      added++;
    }
    console.log(`  robotnoises dataset added: ${added} additional schools`);
  } catch (err) {
    console.error('  robotnoises fetch failed:', err);
  }

  console.log(`\nTotal colors in merged map: ${colorMap.size}`);

  // ═══════════════════════════════════════════
  // STEP 4 — Connect to Turso
  // ═══════════════════════════════════════════
  const config = getClientConfig();
  console.log(`\nSTEP 4: Connecting to DB: ${config.url.substring(0, 45)}...`);
  const client = createClient(config);

  // ═══════════════════════════════════════════
  // STEP 5 — Fetch all universities from DB
  // ═══════════════════════════════════════════
  console.log('STEP 5: Fetching universities...');
  const result = await client.execute('SELECT id, name FROM universities');
  const universities = result.rows.map(row => ({
    id: row['id'] as number,
    name: row['name'] as string,
  }));
  console.log(`  Found ${universities.length} universities in DB`);

  // Build array of map keys for partial matching
  const mapKeys = Array.from(colorMap.keys());

  // ═══════════════════════════════════════════
  // STEP 6 — Match and upsert colors
  // ═══════════════════════════════════════════
  console.log('\nSTEP 6: Matching colors...\n');
  let matched = 0;
  const unmatched: Array<{ id: number; name: string }> = [];

  for (const uni of universities) {
    const normName = normalize(uni.name);
    let color: string | undefined;

    // Exact match
    color = colorMap.get(normName);

    // Partial match: DB name startsWith map key or map key startsWith DB name
    if (!color) {
      for (const key of mapKeys) {
        if (normName.startsWith(key) || key.startsWith(normName)) {
          color = colorMap.get(key);
          break;
        }
      }
    }

    if (color) {
      try {
        await client.execute({
          sql: 'UPDATE universities SET primary_color = ? WHERE id = ?',
          args: [color, uni.id],
        });
        console.log(`  ${uni.name} → ${color}`);
        matched++;
      } catch (err) {
        console.error(`  ${uni.name} — update failed: ${err}`);
        unmatched.push({ id: uni.id, name: uni.name });
      }
    } else {
      unmatched.push({ id: uni.id, name: uni.name });
    }
  }

  // ═══════════════════════════════════════════
  // STEP 7 — Summary
  // ═══════════════════════════════════════════
  const total = universities.length;
  const coverage = total > 0 ? ((matched / total) * 100).toFixed(1) : '0';

  console.log('\n=== COLOR SEED SUMMARY ===');
  console.log(`Total universities: ${total}`);
  console.log(`Colors matched: ${matched}`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`Coverage: ${coverage}%`);

  if (unmatched.length > 0) {
    const dataDir = join(__dirname, '..', '..', 'data');
    try { mkdirSync(dataDir, { recursive: true }); } catch { /* exists */ }
    writeFileSync(join(dataDir, 'missing-colors.json'), JSON.stringify(unmatched, null, 2));
    console.log(`\nWritten ${unmatched.length} unmatched to server/data/missing-colors.json`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
