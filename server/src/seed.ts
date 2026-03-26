import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./dormbid.db',
});

const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding database...');

  // Create tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      university TEXT NOT NULL,
      year TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      budget_min INTEGER,
      budget_max INTEGER,
      avatar TEXT,
      is_edu_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      landlord_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      photos TEXT NOT NULL DEFAULT '[]',
      amenities TEXT NOT NULL DEFAULT '[]',
      beds INTEGER NOT NULL,
      baths INTEGER NOT NULL,
      sqft INTEGER NOT NULL,
      distance_to_campus REAL NOT NULL,
      nearest_university TEXT NOT NULL,
      starting_bid INTEGER NOT NULL,
      reserve_price INTEGER NOT NULL,
      current_bid INTEGER NOT NULL DEFAULT 0,
      bid_count INTEGER NOT NULL DEFAULT 0,
      auction_start TEXT NOT NULL,
      auction_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      is_auto_bid INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auto_bids (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      max_amount INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      listing_id TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL REFERENCES users(id),
      listing_id TEXT NOT NULL REFERENCES listings(id)
    );
  `);

  // Clear existing data
  await client.executeMultiple(`
    DELETE FROM favorites;
    DELETE FROM notifications;
    DELETE FROM auto_bids;
    DELETE FROM bids;
    DELETE FROM listings;
    DELETE FROM users;
  `);

  const hashedPassword = await bcrypt.hash('password123', 10);
  const now = new Date();

  // Create landlord users
  const landlords = [
    { id: uuidv4(), email: 'sarah.chen@realty.com', name: 'Sarah Chen', university: 'Boston Properties', role: 'landlord' as const },
    { id: uuidv4(), email: 'mike.johnson@homes.com', name: 'Mike Johnson', university: 'Austin Rentals', role: 'landlord' as const },
    { id: uuidv4(), email: 'lisa.park@apartments.com', name: 'Lisa Park', university: 'LA Housing Co', role: 'landlord' as const },
    { id: uuidv4(), email: 'james.wilson@rent.com', name: 'James Wilson', university: 'NYC Living', role: 'landlord' as const },
    { id: uuidv4(), email: 'maria.garcia@property.com', name: 'Maria Garcia', university: 'Chicago Realty', role: 'landlord' as const },
  ];

  // Create student users
  const students = [
    { id: uuidv4(), email: 'alex.m@bu.edu', name: 'Alex Martinez', university: 'Boston University', year: 'Junior', budgetMin: 800, budgetMax: 1500 },
    { id: uuidv4(), email: 'jordan.k@mit.edu', name: 'Jordan Kim', university: 'MIT', year: 'Senior', budgetMin: 1000, budgetMax: 2000 },
    { id: uuidv4(), email: 'casey.r@utexas.edu', name: 'Casey Rodriguez', university: 'UT Austin', year: 'Sophomore', budgetMin: 600, budgetMax: 1200 },
    { id: uuidv4(), email: 'taylor.w@ucla.edu', name: 'Taylor Wang', university: 'UCLA', year: 'Junior', budgetMin: 900, budgetMax: 1800 },
    { id: uuidv4(), email: 'sam.l@nyu.edu', name: 'Sam Lee', university: 'NYU', year: 'Senior', budgetMin: 1200, budgetMax: 2500 },
    { id: uuidv4(), email: 'morgan.b@uchicago.edu', name: 'Morgan Brown', university: 'UChicago', year: 'Junior', budgetMin: 800, budgetMax: 1600 },
    { id: uuidv4(), email: 'riley.d@harvard.edu', name: 'Riley Davis', university: 'Harvard', year: 'Sophomore', budgetMin: 1000, budgetMax: 2200 },
    { id: uuidv4(), email: 'avery.t@usc.edu', name: 'Avery Thompson', university: 'USC', year: 'Senior', budgetMin: 900, budgetMax: 1700 },
    { id: uuidv4(), email: 'quinn.h@columbia.edu', name: 'Quinn Harris', university: 'Columbia', year: 'Junior', budgetMin: 1100, budgetMax: 2300 },
    { id: uuidv4(), email: 'drew.p@northwestern.edu', name: 'Drew Patel', university: 'Northwestern', year: 'Sophomore', budgetMin: 700, budgetMax: 1400 },
    { id: uuidv4(), email: 'jamie.n@bu.edu', name: 'Jamie Nguyen', university: 'Boston University', year: 'Senior', budgetMin: 850, budgetMax: 1600 },
    { id: uuidv4(), email: 'charlie.f@utexas.edu', name: 'Charlie Foster', university: 'UT Austin', year: 'Junior', budgetMin: 650, budgetMax: 1300 },
    { id: uuidv4(), email: 'sage.w@ucla.edu', name: 'Sage Williams', university: 'UCLA', year: 'Freshman', budgetMin: 800, budgetMax: 1500 },
    { id: uuidv4(), email: 'ellis.c@nyu.edu', name: 'Ellis Carter', university: 'NYU', year: 'Senior', budgetMin: 1300, budgetMax: 2400 },
    { id: uuidv4(), email: 'rowan.g@uchicago.edu', name: 'Rowan Garcia', university: 'UChicago', year: 'Junior', budgetMin: 750, budgetMax: 1500 },
  ];

  // Insert landlords
  for (const l of landlords) {
    await db.insert(schema.users).values({
      id: l.id,
      email: l.email,
      password: hashedPassword,
      name: l.name,
      university: l.university,
      role: l.role,
      isEduVerified: false,
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).run();
  }

  // Insert students
  for (const s of students) {
    await db.insert(schema.users).values({
      id: s.id,
      email: s.email,
      password: hashedPassword,
      name: s.name,
      university: s.university,
      year: s.year,
      role: 'student',
      budgetMin: s.budgetMin,
      budgetMax: s.budgetMax,
      isEduVerified: s.email.endsWith('.edu'),
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).run();
  }

  // Create 12 listings
  const listingsData = [
    {
      landlord: landlords[0], title: 'Sunny 2BR Near BU Campus',
      description: 'Bright and spacious 2-bedroom apartment just steps from Boston University.',
      address: '142 Commonwealth Ave', city: 'Boston', state: 'MA',
      lat: 42.3505, lng: -71.1054,
      beds: 2, baths: 1, sqft: 850, distance: 0.3, university: 'Boston University',
      startingBid: 1200, reservePrice: 1600,
      amenities: ['In-Unit Laundry', 'Dishwasher', 'Central AC', 'Hardwood Floors', 'Bike Storage'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 5,
    },
    {
      landlord: landlords[0], title: 'Cozy Studio in Harvard Square',
      description: 'Charming studio apartment in the heart of Harvard Square.',
      address: '28 JFK Street', city: 'Cambridge', state: 'MA',
      lat: 42.3727, lng: -71.1189,
      beds: 0, baths: 1, sqft: 450, distance: 0.2, university: 'Harvard',
      startingBid: 1500, reservePrice: 2000,
      amenities: ['High Ceilings', 'Exposed Brick', 'Hardwood Floors', 'Rooftop Access'],
      tags: ['Furnished', 'Pet Friendly'], daysLeft: 3,
    },
    {
      landlord: landlords[1], title: 'Modern 3BR House Near UT',
      description: 'Spacious 3-bedroom house in West Campus, perfect for roommates.',
      address: '2410 San Gabriel St', city: 'Austin', state: 'TX',
      lat: 30.2849, lng: -97.7414,
      beds: 3, baths: 2, sqft: 1400, distance: 0.5, university: 'UT Austin',
      startingBid: 900, reservePrice: 1400,
      amenities: ['Backyard', 'Garage', 'Granite Countertops', 'Central AC', 'Washer/Dryer'],
      tags: ['Pet Friendly', 'Parking Included'], daysLeft: 7,
    },
    {
      landlord: landlords[1], title: 'Loft-Style 1BR on Guadalupe',
      description: 'Industrial-chic loft apartment on the Drag.',
      address: '2505 Guadalupe St', city: 'Austin', state: 'TX',
      lat: 30.2882, lng: -97.7427,
      beds: 1, baths: 1, sqft: 700, distance: 0.2, university: 'UT Austin',
      startingBid: 1100, reservePrice: 1500,
      amenities: ['Rooftop Pool', 'Gym', 'Concierge', 'Floor-to-Ceiling Windows', 'EV Charging'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 2,
    },
    {
      landlord: landlords[2], title: 'Beachside 2BR in Westwood',
      description: 'Beautiful 2-bedroom apartment near UCLA with ocean breezes.',
      address: '10940 Wilshire Blvd', city: 'Los Angeles', state: 'CA',
      lat: 34.0594, lng: -118.4451,
      beds: 2, baths: 2, sqft: 950, distance: 0.8, university: 'UCLA',
      startingBid: 1800, reservePrice: 2400,
      amenities: ['Pool', 'Hot Tub', 'Gym', 'Balcony', 'Secure Parking', 'Package Lockers'],
      tags: ['Pet Friendly', 'Parking Included'], daysLeft: 6,
    },
    {
      landlord: landlords[2], title: 'Charming 1BR Near USC',
      description: 'Updated 1-bedroom in a quiet neighborhood near USC.',
      address: '3215 S Figueroa St', city: 'Los Angeles', state: 'CA',
      lat: 34.0224, lng: -118.2812,
      beds: 1, baths: 1, sqft: 650, distance: 0.4, university: 'USC',
      startingBid: 1400, reservePrice: 1800,
      amenities: ['Gated Community', 'Private Patio', 'New Appliances', 'In-Unit Laundry'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 4,
    },
    {
      landlord: landlords[3], title: 'Manhattan Studio Near NYU',
      description: 'Prime Greenwich Village location, 2 blocks from NYU campus.',
      address: '75 Washington Place', city: 'New York', state: 'NY',
      lat: 40.7308, lng: -73.9973,
      beds: 0, baths: 1, sqft: 400, distance: 0.1, university: 'NYU',
      startingBid: 2000, reservePrice: 2800,
      amenities: ['Laundry In Building', 'Doorman', 'Roof Deck', 'Bike Room'],
      tags: ['Utilities Included'], daysLeft: 8,
    },
    {
      landlord: landlords[3], title: 'Spacious 2BR in Morningside Heights',
      description: 'Large 2-bedroom near Columbia University.',
      address: '420 W 116th St', city: 'New York', state: 'NY',
      lat: 40.8075, lng: -73.9626,
      beds: 2, baths: 1, sqft: 900, distance: 0.3, university: 'Columbia',
      startingBid: 2200, reservePrice: 3000,
      amenities: ['Pre-War Details', 'Eat-In Kitchen', 'Storage', 'Laundry In Building', 'Near Park'],
      tags: ['Pet Friendly'], daysLeft: 10,
    },
    {
      landlord: landlords[4], title: 'Hyde Park 2BR Near UChicago',
      description: 'Classic Chicago 2-bedroom in Hyde Park.',
      address: '5480 S Cornell Ave', city: 'Chicago', state: 'IL',
      lat: 41.7943, lng: -87.5907,
      beds: 2, baths: 1, sqft: 1000, distance: 0.4, university: 'UChicago',
      startingBid: 1000, reservePrice: 1500,
      amenities: ['Bay Windows', 'Hardwood Floors', 'Dining Room', 'Laundry In Building', 'Near Lake'],
      tags: ['Pet Friendly', 'Furnished'], daysLeft: 5,
    },
    {
      landlord: landlords[4], title: 'Evanston 1BR Near Northwestern',
      description: 'Modern 1-bedroom apartment in downtown Evanston.',
      address: '1700 Sherman Ave', city: 'Evanston', state: 'IL',
      lat: 42.0467, lng: -87.6828,
      beds: 1, baths: 1, sqft: 700, distance: 0.3, university: 'Northwestern',
      startingBid: 1100, reservePrice: 1500,
      amenities: ['Modern Kitchen', 'In-Unit Laundry', 'Floor-to-Ceiling Windows', 'Gym', 'Near Transit'],
      tags: ['Utilities Included', 'Parking Included'], daysLeft: 6,
    },
    {
      landlord: landlords[0], title: 'MIT Area 3BR Townhouse',
      description: 'Rare 3-bedroom townhouse near MIT campus.',
      address: '85 Pacific St', city: 'Cambridge', state: 'MA',
      lat: 42.3554, lng: -71.1040,
      beds: 3, baths: 2, sqft: 1300, distance: 0.4, university: 'MIT',
      startingBid: 2500, reservePrice: 3200,
      amenities: ['Townhouse', 'Private Entrance', 'Backyard', 'Basement Storage', 'New Carpet'],
      tags: ['Pet Friendly', 'Parking Included'], daysLeft: 9,
    },
    {
      landlord: landlords[2], title: 'Luxury Studio in Koreatown',
      description: 'Brand new luxury studio near USC and UCLA.',
      address: '3150 Wilshire Blvd', city: 'Los Angeles', state: 'CA',
      lat: 34.0620, lng: -118.2950,
      beds: 0, baths: 1, sqft: 500, distance: 1.2, university: 'USC',
      startingBid: 1600, reservePrice: 2200,
      amenities: ['Smart Home', 'Wine Fridge', 'Rain Shower', 'City Views', 'Concierge', 'Gym', 'Pool'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 1,
    },
  ];

  const listingIds: string[] = [];

  for (const l of listingsData) {
    const id = uuidv4();
    listingIds.push(id);

    const auctionEnd = new Date(now.getTime() + l.daysLeft * 24 * 60 * 60 * 1000);
    const auctionStart = new Date(now.getTime() - (14 - l.daysLeft) * 24 * 60 * 60 * 1000);

    await db.insert(schema.listings).values({
      id,
      landlordId: l.landlord.id,
      title: l.title,
      description: l.description,
      address: l.address,
      city: l.city,
      state: l.state,
      lat: l.lat,
      lng: l.lng,
      photos: JSON.stringify([
        `https://picsum.photos/seed/${id}1/800/600`,
        `https://picsum.photos/seed/${id}2/800/600`,
        `https://picsum.photos/seed/${id}3/800/600`,
        `https://picsum.photos/seed/${id}4/800/600`,
      ]),
      amenities: JSON.stringify(l.amenities),
      beds: l.beds,
      baths: l.baths,
      sqft: l.sqft,
      distanceToCampus: l.distance,
      nearestUniversity: l.university,
      startingBid: l.startingBid,
      reservePrice: l.reservePrice,
      currentBid: l.startingBid,
      bidCount: 0,
      auctionStart: auctionStart.toISOString(),
      auctionEnd: auctionEnd.toISOString(),
      status: 'active',
      tags: JSON.stringify(l.tags),
      createdAt: auctionStart.toISOString(),
    }).run();
  }

  // Generate bids for each listing
  const bidIncrements = [25, 50, 75, 100, 50, 25, 75, 100, 50, 25];

  for (let i = 0; i < listingIds.length; i++) {
    const listingId = listingIds[i];
    const listing = listingsData[i];
    let currentBid = listing.startingBid;
    const numBids = 3 + Math.floor(Math.random() * 8);

    for (let j = 0; j < numBids; j++) {
      const bidder = students[Math.floor(Math.random() * students.length)];
      const increment = bidIncrements[j % bidIncrements.length];
      currentBid += increment;

      const bidTime = new Date(now.getTime() - (listing.daysLeft + 14 - j) * 24 * 60 * 60 * 1000 / numBids * (numBids - j));

      await db.insert(schema.bids).values({
        id: uuidv4(),
        listingId,
        userId: bidder.id,
        amount: currentBid,
        isAutoBid: Math.random() > 0.8,
        timestamp: bidTime.toISOString(),
      }).run();
    }

    // Update listing with current bid
    await db.update(schema.listings).set({
      currentBid,
      bidCount: numBids,
    }).where(eq(schema.listings.id, listingId)).run();
  }

  // Add some favorites
  for (let i = 0; i < 15; i++) {
    const student = students[i % students.length];
    const listingId = listingIds[(i * 3) % listingIds.length];
    try {
      await db.insert(schema.favorites).values({
        userId: student.id,
        listingId,
      }).run();
    } catch { /* ignore duplicates */ }
  }

  // Add some notifications
  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const listingId = listingIds[i % listingIds.length];
    await db.insert(schema.notifications).values({
      id: uuidv4(),
      userId: student.id,
      type: i % 2 === 0 ? 'outbid' : 'auction_ending',
      message: i % 2 === 0
        ? `You've been outbid on "${listingsData[i % listingsData.length].title}"`
        : `Auction ending soon for "${listingsData[i % listingsData.length].title}"`,
      listingId,
      read: Math.random() > 0.5,
      createdAt: new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
    }).run();
  }

  console.log('Seed complete!');
  console.log(`Created ${landlords.length} landlords, ${students.length} students, ${listingsData.length} listings`);
  console.log('\nTest accounts:');
  console.log('Student: alex.m@bu.edu / password123');
  console.log('Landlord: sarah.chen@realty.com / password123');
}

seed().catch(console.error);
