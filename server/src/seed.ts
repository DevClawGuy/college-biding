import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './db/schema';
import { getClientConfig } from './db/index';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const client = createClient(getClientConfig());
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
    { id: crypto.randomUUID(), email: 'sarah.chen@realty.com', name: 'Sarah Chen', university: 'Boston Properties', role: 'landlord' as const },
    { id: crypto.randomUUID(), email: 'mike.johnson@homes.com', name: 'Mike Johnson', university: 'Austin Rentals', role: 'landlord' as const },
    { id: crypto.randomUUID(), email: 'lisa.park@apartments.com', name: 'Lisa Park', university: 'LA Housing Co', role: 'landlord' as const },
    { id: crypto.randomUUID(), email: 'james.wilson@rent.com', name: 'James Wilson', university: 'NYC Living', role: 'landlord' as const },
    { id: crypto.randomUUID(), email: 'maria.garcia@property.com', name: 'Maria Garcia', university: 'Chicago Realty', role: 'landlord' as const },
  ];

  // Create student users
  const students = [
    { id: crypto.randomUUID(), email: 'alex.m@monmouth.edu', name: 'Alex Martinez', university: 'Monmouth University', year: 'Junior', budgetMin: 800, budgetMax: 1500 },
    { id: crypto.randomUUID(), email: 'jordan.k@monmouth.edu', name: 'Jordan Kim', university: 'Monmouth University', year: 'Senior', budgetMin: 1000, budgetMax: 2000 },
    { id: crypto.randomUUID(), email: 'casey.r@monmouth.edu', name: 'Casey Rodriguez', university: 'Monmouth University', year: 'Sophomore', budgetMin: 600, budgetMax: 1200 },
    { id: crypto.randomUUID(), email: 'taylor.w@monmouth.edu', name: 'Taylor Wang', university: 'Monmouth University', year: 'Junior', budgetMin: 900, budgetMax: 1800 },
    { id: crypto.randomUUID(), email: 'sam.l@monmouth.edu', name: 'Sam Lee', university: 'Monmouth University', year: 'Senior', budgetMin: 1200, budgetMax: 2500 },
    { id: crypto.randomUUID(), email: 'morgan.b@monmouth.edu', name: 'Morgan Brown', university: 'Monmouth University', year: 'Junior', budgetMin: 800, budgetMax: 1600 },
    { id: crypto.randomUUID(), email: 'riley.d@monmouth.edu', name: 'Riley Davis', university: 'Monmouth University', year: 'Sophomore', budgetMin: 1000, budgetMax: 2200 },
    { id: crypto.randomUUID(), email: 'avery.t@monmouth.edu', name: 'Avery Thompson', university: 'Monmouth University', year: 'Senior', budgetMin: 900, budgetMax: 1700 },
    { id: crypto.randomUUID(), email: 'quinn.h@monmouth.edu', name: 'Quinn Harris', university: 'Monmouth University', year: 'Junior', budgetMin: 1100, budgetMax: 2300 },
    { id: crypto.randomUUID(), email: 'drew.p@monmouth.edu', name: 'Drew Patel', university: 'Monmouth University', year: 'Sophomore', budgetMin: 700, budgetMax: 1400 },
    { id: crypto.randomUUID(), email: 'jamie.n@monmouth.edu', name: 'Jamie Nguyen', university: 'Monmouth University', year: 'Senior', budgetMin: 850, budgetMax: 1600 },
    { id: crypto.randomUUID(), email: 'charlie.f@monmouth.edu', name: 'Charlie Foster', university: 'Monmouth University', year: 'Junior', budgetMin: 650, budgetMax: 1300 },
    { id: crypto.randomUUID(), email: 'sage.w@monmouth.edu', name: 'Sage Williams', university: 'Monmouth University', year: 'Freshman', budgetMin: 800, budgetMax: 1500 },
    { id: crypto.randomUUID(), email: 'ellis.c@monmouth.edu', name: 'Ellis Carter', university: 'Monmouth University', year: 'Senior', budgetMin: 1300, budgetMax: 2400 },
    { id: crypto.randomUUID(), email: 'rowan.g@monmouth.edu', name: 'Rowan Garcia', university: 'Monmouth University', year: 'Junior', budgetMin: 750, budgetMax: 1500 },
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

  // Create 12 listings near Monmouth University (West Long Branch, NJ area)
  const listingsData = [
    {
      landlord: landlords[0], title: 'Sunny 2BR Near Monmouth Campus',
      description: 'Bright and spacious 2-bedroom apartment just steps from Monmouth University. Recently renovated with modern kitchen and in-unit laundry.',
      address: '260 Norwood Ave', city: 'West Long Branch', state: 'NJ',
      lat: 40.2904, lng: -74.0165,
      beds: 2, baths: 1, sqft: 850, distance: 0.3, university: 'Monmouth University',
      startingBid: 1200, reservePrice: 1600,
      amenities: ['In-Unit Laundry', 'Dishwasher', 'Central AC', 'Hardwood Floors', 'Bike Storage'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 5,
    },
    {
      landlord: landlords[0], title: 'Cozy Studio on Cedar Ave',
      description: 'Charming studio apartment on a quiet tree-lined street. Walking distance to campus, shops, and restaurants.',
      address: '85 Cedar Ave', city: 'West Long Branch', state: 'NJ',
      lat: 40.2880, lng: -74.0120,
      beds: 0, baths: 1, sqft: 450, distance: 0.2, university: 'Monmouth University',
      startingBid: 1100, reservePrice: 1500,
      amenities: ['High Ceilings', 'Hardwood Floors', 'Laundry In Building', 'Near Transit'],
      tags: ['Furnished', 'Pet Friendly'], daysLeft: 3,
    },
    {
      landlord: landlords[1], title: 'Modern 3BR House on Wall St',
      description: 'Spacious 3-bedroom house perfect for roommates. Large backyard, updated kitchen with granite countertops, and a 2-car garage.',
      address: '310 Wall St', city: 'West Long Branch', state: 'NJ',
      lat: 40.2920, lng: -74.0200,
      beds: 3, baths: 2, sqft: 1400, distance: 0.5, university: 'Monmouth University',
      startingBid: 900, reservePrice: 1400,
      amenities: ['Backyard', 'Garage', 'Granite Countertops', 'Central AC', 'Washer/Dryer'],
      tags: ['Pet Friendly', 'Parking Included'], daysLeft: 7,
    },
    {
      landlord: landlords[1], title: 'Loft-Style 1BR in Long Branch',
      description: 'Industrial-chic loft apartment near the beach. Open layout with great natural light and rooftop views.',
      address: '180 Broadway', city: 'Long Branch', state: 'NJ',
      lat: 40.2984, lng: -73.9924,
      beds: 1, baths: 1, sqft: 700, distance: 1.2, university: 'Monmouth University',
      startingBid: 1100, reservePrice: 1500,
      amenities: ['Rooftop Access', 'Gym', 'High Ceilings', 'Floor-to-Ceiling Windows', 'Near Beach'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 2,
    },
    {
      landlord: landlords[2], title: 'Beachside 2BR in Long Branch',
      description: 'Beautiful 2-bedroom apartment with ocean breezes. Open floor plan, balcony with ocean views, and resort-style amenities.',
      address: '350 Ocean Blvd', city: 'Long Branch', state: 'NJ',
      lat: 40.2920, lng: -73.9830,
      beds: 2, baths: 2, sqft: 950, distance: 1.5, university: 'Monmouth University',
      startingBid: 1800, reservePrice: 2400,
      amenities: ['Pool', 'Gym', 'Balcony', 'Secure Parking', 'Package Lockers', 'Near Beach'],
      tags: ['Pet Friendly', 'Parking Included'], daysLeft: 6,
    },
    {
      landlord: landlords[2], title: 'Charming 1BR in Eatontown',
      description: 'Updated 1-bedroom in a quiet neighborhood. New appliances, quartz countertops, and a private patio.',
      address: '42 Broad St', city: 'Eatontown', state: 'NJ',
      lat: 40.2960, lng: -74.0510,
      beds: 1, baths: 1, sqft: 650, distance: 2.0, university: 'Monmouth University',
      startingBid: 1000, reservePrice: 1400,
      amenities: ['Gated Community', 'Private Patio', 'New Appliances', 'In-Unit Laundry'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 4,
    },
    {
      landlord: landlords[3], title: 'Pier Village Studio',
      description: 'Prime Pier Village location steps from the beach. Renovated kitchen, modern finishes, and incredible ocean views.',
      address: '11 Ocean Ave', city: 'Long Branch', state: 'NJ',
      lat: 40.2935, lng: -73.9870,
      beds: 0, baths: 1, sqft: 400, distance: 1.8, university: 'Monmouth University',
      startingBid: 1400, reservePrice: 1900,
      amenities: ['Laundry In Building', 'Concierge', 'Roof Deck', 'Near Beach'],
      tags: ['Utilities Included'], daysLeft: 8,
    },
    {
      landlord: landlords[3], title: 'Spacious 2BR on Larchwood Ave',
      description: 'Large 2-bedroom close to campus with plenty of natural light. Eat-in kitchen, separate living room, and lots of storage.',
      address: '75 Larchwood Ave', city: 'West Long Branch', state: 'NJ',
      lat: 40.2870, lng: -74.0180,
      beds: 2, baths: 1, sqft: 900, distance: 0.3, university: 'Monmouth University',
      startingBid: 1300, reservePrice: 1800,
      amenities: ['Eat-In Kitchen', 'Storage', 'Laundry In Building', 'Near Park', 'Hardwood Floors'],
      tags: ['Pet Friendly'], daysLeft: 10,
    },
    {
      landlord: landlords[4], title: 'Ocean Township 2BR Apartment',
      description: 'Classic Jersey Shore 2-bedroom. Bay windows, original hardwood floors, and a full dining room. Quick drive to campus.',
      address: '198 Deal Rd', city: 'Ocean Township', state: 'NJ',
      lat: 40.2650, lng: -74.0270,
      beds: 2, baths: 1, sqft: 1000, distance: 2.5, university: 'Monmouth University',
      startingBid: 1000, reservePrice: 1500,
      amenities: ['Bay Windows', 'Hardwood Floors', 'Dining Room', 'Laundry In Building', 'Near Park'],
      tags: ['Pet Friendly', 'Furnished'], daysLeft: 5,
    },
    {
      landlord: landlords[4], title: 'Asbury Park 1BR Near Boardwalk',
      description: 'Modern 1-bedroom in vibrant Asbury Park. Steps from restaurants, nightlife, and the beach boardwalk.',
      address: '501 Cookman Ave', city: 'Asbury Park', state: 'NJ',
      lat: 40.2201, lng: -74.0001,
      beds: 1, baths: 1, sqft: 700, distance: 5.0, university: 'Monmouth University',
      startingBid: 1100, reservePrice: 1500,
      amenities: ['Modern Kitchen', 'In-Unit Laundry', 'Floor-to-Ceiling Windows', 'Gym', 'Near Transit'],
      tags: ['Utilities Included', 'Parking Included'], daysLeft: 6,
    },
    {
      landlord: landlords[0], title: '3BR Townhouse on Campus Edge',
      description: 'Rare 3-bedroom townhouse right on the edge of Monmouth campus. Two floors, private entrance, small backyard, and basement storage.',
      address: '15 Pinckney Rd', city: 'West Long Branch', state: 'NJ',
      lat: 40.2915, lng: -74.0140,
      beds: 3, baths: 2, sqft: 1300, distance: 0.1, university: 'Monmouth University',
      startingBid: 1600, reservePrice: 2200,
      amenities: ['Townhouse', 'Private Entrance', 'Backyard', 'Basement Storage', 'New Carpet'],
      tags: ['Pet Friendly', 'Parking Included'], daysLeft: 9,
    },
    {
      landlord: landlords[2], title: 'Luxury Studio in West End',
      description: 'Brand new luxury studio in the West End section of Long Branch. Smart home features, walk-in shower, and city views.',
      address: '200 Westwood Ave', city: 'Long Branch', state: 'NJ',
      lat: 40.2860, lng: -73.9960,
      beds: 0, baths: 1, sqft: 500, distance: 1.5, university: 'Monmouth University',
      startingBid: 1200, reservePrice: 1700,
      amenities: ['Smart Home', 'Rain Shower', 'City Views', 'Concierge', 'Gym', 'Pool'],
      tags: ['Furnished', 'Utilities Included'], daysLeft: 1,
    },
  ];

  const listingIds: string[] = [];

  for (const l of listingsData) {
    const id = crypto.randomUUID();
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
        id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
