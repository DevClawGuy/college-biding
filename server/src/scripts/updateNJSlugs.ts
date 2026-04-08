import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';

const slugUpdates = [
  { old: 'rutgers-new-brunswick', new: 'rutgers-new-brunswick-nj' },
  { old: 'rowan-university', new: 'rowan-university-nj' },
  { old: 'montclair-state-university', new: 'montclair-state-university-nj' },
  { old: 'ramapo-college', new: 'ramapo-college-nj' },
  { old: 'stockton-university', new: 'stockton-university-nj' },
  { old: 'college-of-new-jersey', new: 'college-of-new-jersey-nj' },
  { old: 'william-paterson-university', new: 'william-paterson-university-nj' },
  { old: 'fairleigh-dickinson-university', new: 'fairleigh-dickinson-university-nj' },
  { old: 'seton-hall-university', new: 'seton-hall-university-nj' },
  { old: 'njit', new: 'njit-nj' },
  { old: 'kean-university', new: 'kean-university-nj' },
  { old: 'monmouth-university', new: 'monmouth-university-nj' },
  { old: 'rider-university', new: 'rider-university-nj' },
  { old: 'stevens-institute-of-technology', new: 'stevens-institute-of-technology-nj' },
  { old: 'saint-peters-university', new: 'saint-peters-university-nj' },
  { old: 'rutgers-newark', new: 'rutgers-newark-nj' },
  { old: 'rutgers-camden', new: 'rutgers-camden-nj' },
  { old: 'nj-city-university', new: 'nj-city-university-nj' },
  { old: 'felician-university', new: 'felician-university-nj' },
  { old: 'drew-university', new: 'drew-university-nj' },
  { old: 'georgian-court-university', new: 'georgian-court-university-nj' },
  { old: 'caldwell-university', new: 'caldwell-university-nj' },
  { old: 'bloomfield-college', new: 'bloomfield-college-nj' },
  { old: 'centenary-university', new: 'centenary-university-nj' },
  { old: 'saint-elizabeth-university', new: 'saint-elizabeth-university-nj' },
  { old: 'berkeley-college', new: 'berkeley-college-nj' },
  { old: 'pillar-college', new: 'pillar-college-nj' },
  { old: 'princeton-university', new: 'princeton-university-nj' },
];

async function run() {
  const config = getClientConfig();
  console.log('Connecting to DB:', config.url.substring(0, 45) + '...');
  const client = createClient(config);

  let updated = 0;
  for (const { old: oldSlug, new: newSlug } of slugUpdates) {
    const result = await client.execute({
      sql: 'UPDATE universities SET slug = ? WHERE slug = ?',
      args: [newSlug, oldSlug],
    });
    if (result.rowsAffected > 0) {
      console.log(`  Updated: ${oldSlug} → ${newSlug}`);
      updated++;
    } else {
      console.log(`  Skipped: ${oldSlug} (not found or already updated)`);
    }
  }

  console.log(`\nDone. ${updated} slugs updated.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
