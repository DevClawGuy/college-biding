import 'dotenv/config';
import { createClient } from '@libsql/client';
import { getClientConfig } from '../db/index';

const universities = [
  { ipeds_id: "NJ001", name: "Rutgers New Brunswick",
    city: "New Brunswick", state: "NJ", zip: "08901",
    latitude: 40.5008, longitude: -74.4474,
    enrollment: 41118, slug: "rutgers-new-brunswick" },
  { ipeds_id: "NJ002", name: "Rowan University",
    city: "Glassboro", state: "NJ", zip: "08028",
    latitude: 39.7101, longitude: -75.1149,
    enrollment: 19645, slug: "rowan-university" },
  { ipeds_id: "NJ003", name: "Montclair State University",
    city: "Montclair", state: "NJ", zip: "07043",
    latitude: 40.8598, longitude: -74.1999,
    enrollment: 21441, slug: "montclair-state-university" },
  { ipeds_id: "NJ004", name: "Ramapo College",
    city: "Mahwah", state: "NJ", zip: "07430",
    latitude: 41.0776, longitude: -74.1849,
    enrollment: 5827, slug: "ramapo-college" },
  { ipeds_id: "NJ005", name: "Stockton University",
    city: "Galloway", state: "NJ", zip: "08205",
    latitude: 39.4815, longitude: -74.5237,
    enrollment: 9017, slug: "stockton-university" },
  { ipeds_id: "NJ006", name: "The College of New Jersey",
    city: "Ewing", state: "NJ", zip: "08628",
    latitude: 40.2679, longitude: -74.7796,
    enrollment: 8074, slug: "college-of-new-jersey" },
  { ipeds_id: "NJ007", name: "William Paterson University",
    city: "Wayne", state: "NJ", zip: "07470",
    latitude: 40.9459, longitude: -74.2238,
    enrollment: 11549, slug: "william-paterson-university" },
  { ipeds_id: "NJ008", name: "Fairleigh Dickinson University",
    city: "Teaneck", state: "NJ", zip: "07666",
    latitude: 40.8940, longitude: -74.0093,
    enrollment: 8354, slug: "fairleigh-dickinson-university" },
  { ipeds_id: "NJ009", name: "Seton Hall University",
    city: "South Orange", state: "NJ", zip: "07079",
    latitude: 40.7448, longitude: -74.2604,
    enrollment: 9855, slug: "seton-hall-university" },
  { ipeds_id: "NJ010", name: "NJIT",
    city: "Newark", state: "NJ", zip: "07102",
    latitude: 40.7424, longitude: -74.1782,
    enrollment: 11596, slug: "njit" },
  { ipeds_id: "NJ011", name: "Kean University",
    city: "Union", state: "NJ", zip: "07083",
    latitude: 40.6776, longitude: -74.2368,
    enrollment: 15417, slug: "kean-university" },
  { ipeds_id: "NJ012", name: "Monmouth University",
    city: "West Long Branch", state: "NJ", zip: "07764",
    latitude: 40.3143, longitude: -74.0228,
    enrollment: 5765, slug: "monmouth-university" },
  { ipeds_id: "NJ013", name: "Rider University",
    city: "Lawrenceville", state: "NJ", zip: "08648",
    latitude: 40.2718, longitude: -74.7379,
    enrollment: 4753, slug: "rider-university" },
  { ipeds_id: "NJ014", name: "Stevens Institute of Technology",
    city: "Hoboken", state: "NJ", zip: "07030",
    latitude: 40.7440, longitude: -74.0324,
    enrollment: 8021, slug: "stevens-institute-of-technology" },
  { ipeds_id: "NJ015", name: "Saint Peters University",
    city: "Jersey City", state: "NJ", zip: "07306",
    latitude: 40.7282, longitude: -74.0776,
    enrollment: 3226, slug: "saint-peters-university" },
  { ipeds_id: "NJ016", name: "Rutgers Newark",
    city: "Newark", state: "NJ", zip: "07102",
    latitude: 40.7420, longitude: -74.1726,
    enrollment: 12423, slug: "rutgers-newark" },
  { ipeds_id: "NJ017", name: "Rutgers Camden",
    city: "Camden", state: "NJ", zip: "08102",
    latitude: 39.9448, longitude: -75.1196,
    enrollment: 6692, slug: "rutgers-camden" },
  { ipeds_id: "NJ018", name: "NJ City University",
    city: "Jersey City", state: "NJ", zip: "07305",
    latitude: 40.7178, longitude: -74.0776,
    enrollment: 7987, slug: "nj-city-university" },
  { ipeds_id: "NJ019", name: "Felician University",
    city: "Lodi", state: "NJ", zip: "07644",
    latitude: 40.8776, longitude: -74.0821,
    enrollment: 1967, slug: "felician-university" },
  { ipeds_id: "NJ020", name: "Drew University",
    city: "Madison", state: "NJ", zip: "07940",
    latitude: 40.7612, longitude: -74.4218,
    enrollment: 1547, slug: "drew-university" },
  { ipeds_id: "NJ021", name: "Georgian Court University",
    city: "Lakewood", state: "NJ", zip: "08701",
    latitude: 40.0776, longitude: -74.2048,
    enrollment: 2247, slug: "georgian-court-university" },
  { ipeds_id: "NJ022", name: "Caldwell University",
    city: "Caldwell", state: "NJ", zip: "07006",
    latitude: 40.8398, longitude: -74.2776,
    enrollment: 2247, slug: "caldwell-university" },
  { ipeds_id: "NJ023", name: "Bloomfield College",
    city: "Bloomfield", state: "NJ", zip: "07003",
    latitude: 40.8037, longitude: -74.1879,
    enrollment: 1872, slug: "bloomfield-college" },
  { ipeds_id: "NJ024", name: "Centenary University",
    city: "Hackettstown", state: "NJ", zip: "07840",
    latitude: 40.8537, longitude: -74.8293,
    enrollment: 1547, slug: "centenary-university" },
  { ipeds_id: "NJ025", name: "Saint Elizabeth University",
    city: "Morristown", state: "NJ", zip: "07960",
    latitude: 40.7976, longitude: -74.4821,
    enrollment: 1124, slug: "saint-elizabeth-university" },
  { ipeds_id: "NJ026", name: "Berkeley College",
    city: "Woodland Park", state: "NJ", zip: "07424",
    latitude: 40.9037, longitude: -74.1948,
    enrollment: 3421, slug: "berkeley-college" },
  { ipeds_id: "NJ027", name: "Pillar College",
    city: "Newark", state: "NJ", zip: "07105",
    latitude: 40.7282, longitude: -74.1448,
    enrollment: 387, slug: "pillar-college" },
  { ipeds_id: "NJ028", name: "Princeton University",
    city: "Princeton", state: "NJ", zip: "08544",
    latitude: 40.3573, longitude: -74.6672,
    enrollment: 8474, slug: "princeton-university" },
];

async function seed() {
  const config = getClientConfig();
  console.log('Connecting to DB:', config.url.substring(0, 45) + '...');
  const client = createClient(config);

  // Ensure table exists
  await client.execute(`CREATE TABLE IF NOT EXISTS universities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipeds_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    latitude REAL,
    longitude REAL,
    enrollment INTEGER,
    slug TEXT UNIQUE NOT NULL,
    portal_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT ''
  )`);

  const now = new Date().toISOString();
  let inserted = 0;

  for (const u of universities) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO universities
        (ipeds_id, name, city, state, zip, latitude, longitude, enrollment, slug, portal_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [u.ipeds_id, u.name, u.city, u.state, u.zip, u.latitude, u.longitude, u.enrollment, u.slug, now],
    });
    inserted++;
    console.log(`  Inserted: ${u.name} (${u.ipeds_id})`);
  }

  console.log(`\nDone. ${inserted} universities seeded.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
