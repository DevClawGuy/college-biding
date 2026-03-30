import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, like, gte, desc, sql } from 'drizzle-orm';

const router = Router();

function checkAdminKey(req: Request, res: Response): boolean {
  const adminKey = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Shared seed data
function getSeedData() {
  const landlords = [
    { email: 'sarah.chen@realty.com', name: 'Sarah Chen', university: 'Shore Realty Group', role: 'landlord' as const },
    { email: 'mike.johnson@homes.com', name: 'Mike Johnson', university: 'Monmouth Rentals LLC', role: 'landlord' as const },
    { email: 'lisa.park@apartments.com', name: 'Lisa Park', university: 'Jersey Shore Properties', role: 'landlord' as const },
    { email: 'james.wilson@rent.com', name: 'James Wilson', university: 'Coastal Living Realty', role: 'landlord' as const },
    { email: 'maria.garcia@property.com', name: 'Maria Garcia', university: 'Garden State Homes', role: 'landlord' as const },
  ];

  const students = [
    { email: 'alex.m@monmouth.edu', name: 'Alex Martinez', university: 'Monmouth University', year: 'Junior', budgetMin: 800, budgetMax: 1500 },
    { email: 'jordan.k@monmouth.edu', name: 'Jordan Kim', university: 'Monmouth University', year: 'Senior', budgetMin: 1000, budgetMax: 2000 },
    { email: 'casey.r@monmouth.edu', name: 'Casey Rodriguez', university: 'Monmouth University', year: 'Sophomore', budgetMin: 600, budgetMax: 1200 },
    { email: 'taylor.w@monmouth.edu', name: 'Taylor Wang', university: 'Monmouth University', year: 'Junior', budgetMin: 900, budgetMax: 1800 },
    { email: 'sam.l@monmouth.edu', name: 'Sam Lee', university: 'Monmouth University', year: 'Senior', budgetMin: 1200, budgetMax: 2500 },
    { email: 'morgan.b@monmouth.edu', name: 'Morgan Brown', university: 'Monmouth University', year: 'Junior', budgetMin: 800, budgetMax: 1600 },
    { email: 'riley.d@monmouth.edu', name: 'Riley Davis', university: 'Monmouth University', year: 'Sophomore', budgetMin: 1000, budgetMax: 2200 },
    { email: 'avery.t@monmouth.edu', name: 'Avery Thompson', university: 'Monmouth University', year: 'Senior', budgetMin: 900, budgetMax: 1700 },
    { email: 'quinn.h@monmouth.edu', name: 'Quinn Harris', university: 'Monmouth University', year: 'Junior', budgetMin: 1100, budgetMax: 2300 },
    { email: 'drew.p@monmouth.edu', name: 'Drew Patel', university: 'Monmouth University', year: 'Sophomore', budgetMin: 700, budgetMax: 1400 },
    { email: 'jamie.n@monmouth.edu', name: 'Jamie Nguyen', university: 'Monmouth University', year: 'Senior', budgetMin: 850, budgetMax: 1600 },
    { email: 'charlie.f@monmouth.edu', name: 'Charlie Foster', university: 'Monmouth University', year: 'Junior', budgetMin: 650, budgetMax: 1300 },
    { email: 'sage.w@monmouth.edu', name: 'Sage Williams', university: 'Monmouth University', year: 'Freshman', budgetMin: 800, budgetMax: 1500 },
    { email: 'ellis.c@monmouth.edu', name: 'Ellis Carter', university: 'Monmouth University', year: 'Senior', budgetMin: 1300, budgetMax: 2400 },
    { email: 'rowan.g@monmouth.edu', name: 'Rowan Garcia', university: 'Monmouth University', year: 'Junior', budgetMin: 750, budgetMax: 1500 },
  ];

  const listingsData = [
    // West Long Branch (3) — Sarah Chen
    { landlordEmail: 'sarah.chen@realty.com', title: '3BR Ranch Near Monmouth Campus', description: 'Small ranch-style house about 1 mile from Monmouth University. Popular for students who want to split rent while staying close to campus and Cedar Avenue.', address: '32 Baker Drive', city: 'West Long Branch', state: 'NJ', lat: 40.2912, lng: -74.0198, beds: 3, baths: 1, sqft: 1250, distance: 1.0, university: 'Monmouth University', startingBid: 2650, reservePrice: 3000, amenities: ['Parking', 'Laundry', 'AC', 'Hardwood Floors', 'Near Bus Stop'], tags: ['Parking Included'], daysLeft: 12, photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'] },
    { landlordEmail: 'sarah.chen@realty.com', title: '2BR Apartment off Route 36', description: 'Apartment located near Route 36 and less than 2 miles from Monmouth University. Ideal for two roommates looking for a quieter complex near campus.', address: '10 Avalon Court', city: 'West Long Branch', state: 'NJ', lat: 40.2855, lng: -74.0075, beds: 2, baths: 1, sqft: 900, distance: 1.7, university: 'Monmouth University', startingBid: 1950, reservePrice: 2200, amenities: ['Parking', 'Heat Included', 'Laundry', 'Dishwasher', 'Pool'], tags: ['Utilities Included'], daysLeft: 8, photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'] },
    { landlordEmail: 'sarah.chen@realty.com', title: '1BR on Monmouth Road', description: 'Compact apartment on Monmouth Road just west of campus. Convenient for students who want to walk or bike to Monmouth University in under 10 minutes.', address: '45 Monmouth Road', city: 'West Long Branch', state: 'NJ', lat: 40.2785, lng: -74.0105, beds: 1, baths: 1, sqft: 650, distance: 0.8, university: 'Monmouth University', startingBid: 1550, reservePrice: 1800, amenities: ['Parking', 'AC', 'Heat Included', 'WiFi Included'], tags: ['Utilities Included'], daysLeft: 5, photos: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'] },
    // Long Branch (3) — Mike Johnson
    { landlordEmail: 'mike.johnson@homes.com', title: '1BR on Westwood Avenue', description: 'Apartment on Westwood Avenue close to both Monmouth University and downtown Long Branch. Great for one student or a couple looking for extra space.', address: '364 Westwood Avenue', city: 'Long Branch', state: 'NJ', lat: 40.2892, lng: -73.9985, beds: 1, baths: 1, sqft: 842, distance: 2.2, university: 'Monmouth University', startingBid: 1650, reservePrice: 1900, amenities: ['Parking', 'Laundry', 'AC', 'Dishwasher', 'Hardwood Floors'], tags: ['Parking Included'], daysLeft: 3, photos: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'] },
    { landlordEmail: 'mike.johnson@homes.com', title: '2BR Near Monmouth Park', description: 'Two-bedroom apartment located near Monmouth Park and about 10 minutes from Monmouth University. Well suited for two students splitting costs.', address: '655 Westwood Avenue', city: 'Long Branch', state: 'NJ', lat: 40.2935, lng: -73.9930, beds: 2, baths: 1, sqft: 900, distance: 2.5, university: 'Monmouth University', startingBid: 2000, reservePrice: 2300, amenities: ['Parking', 'Laundry', 'Heat Included', 'Near Bus Stop'], tags: ['Utilities Included', 'Parking Included'], daysLeft: 10, photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'] },
    { landlordEmail: 'mike.johnson@homes.com', title: '3BR in North Long Branch', description: 'Three-bedroom unit in northern Long Branch, about 3 miles from campus and close to NJ Transit access. Good fit for a group of Monmouth students.', address: '184 N 5th Avenue', city: 'Long Branch', state: 'NJ', lat: 40.3055, lng: -73.9920, beds: 3, baths: 1, sqft: 1150, distance: 3.1, university: 'Monmouth University', startingBid: 2450, reservePrice: 2800, amenities: ['Parking', 'Laundry', 'AC', 'Furnished', 'Near Bus Stop'], tags: ['Furnished', 'Parking Included'], daysLeft: 7, photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'] },
    // Deal (3) — Lisa Park
    { landlordEmail: 'lisa.park@apartments.com', title: '2BR Near Deal Casino Beach', description: 'Apartment near Deal Casino Beach and just south of Monmouth University. Attractive option for students who want to be near both campus and the shore.', address: '105 Roseld Avenue', city: 'Deal', state: 'NJ', lat: 40.2520, lng: -73.9975, beds: 2, baths: 1, sqft: 950, distance: 2.4, university: 'Monmouth University', startingBid: 2100, reservePrice: 2400, amenities: ['Parking', 'AC', 'Laundry', 'Hardwood Floors', 'Balcony'], tags: ['Parking Included'], daysLeft: 6, photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'] },
    { landlordEmail: 'lisa.park@apartments.com', title: '1BR on Norwood Ave, Deal', description: 'Small one-bedroom apartment near Norwood and Ocean Avenue, roughly 2 miles from Monmouth University. Popular area for graduate students and young professionals.', address: '45 Norwood Avenue', city: 'Deal', state: 'NJ', lat: 40.2545, lng: -74.0010, beds: 1, baths: 1, sqft: 700, distance: 2.0, university: 'Monmouth University', startingBid: 1500, reservePrice: 1750, amenities: ['Parking', 'Heat Included', 'WiFi Included', 'Near Bus Stop'], tags: ['Utilities Included'], daysLeft: 4, photos: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'] },
    { landlordEmail: 'lisa.park@apartments.com', title: '3BR Beach House in Deal', description: 'Older beach-town house in Deal with enough room for three or four students. Located a short drive from Monmouth University and Deal beaches.', address: '210 Neptune Avenue', city: 'Deal', state: 'NJ', lat: 40.2490, lng: -73.9950, beds: 3, baths: 2, sqft: 1350, distance: 2.8, university: 'Monmouth University', startingBid: 2750, reservePrice: 3100, amenities: ['Parking', 'Laundry', 'Furnished', 'AC', 'Pet Friendly'], tags: ['Furnished', 'Pet Friendly'], daysLeft: 14, photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'] },
    // Ocean Township (3) — James Wilson
    { landlordEmail: 'james.wilson@rent.com', title: 'Studio Near Monmouth Mall', description: 'Affordable studio located along Route 35 near Monmouth Mall and about 3 miles from Monmouth University. Good starter option for a single student.', address: '1800 Route 35', city: 'Ocean Township', state: 'NJ', lat: 40.2610, lng: -74.0330, beds: 0, baths: 1, sqft: 500, distance: 3.0, university: 'Monmouth University', startingBid: 1250, reservePrice: 1450, amenities: ['Parking', 'Heat Included', 'AC', 'Laundry'], tags: ['Utilities Included'], daysLeft: 2, photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'] },
    { landlordEmail: 'james.wilson@rent.com', title: '2BR on Wickapecko Drive', description: 'Two-bedroom apartment in a quiet residential area of Ocean Township, close to Route 66 and about 10 minutes from Monmouth University.', address: '1200 Wickapecko Drive', city: 'Ocean Township', state: 'NJ', lat: 40.2485, lng: -74.0285, beds: 2, baths: 1, sqft: 900, distance: 3.4, university: 'Monmouth University', startingBid: 1900, reservePrice: 2200, amenities: ['Parking', 'Laundry', 'Dishwasher', 'AC', 'Pet Friendly'], tags: ['Pet Friendly', 'Parking Included'], daysLeft: 9, photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'] },
    { landlordEmail: 'james.wilson@rent.com', title: '3BR Near Joe Palaia Park', description: 'Split-level home near Joe Palaia Park and a short drive from campus. Works well for a group of students who want more space and parking.', address: '45 Poplar Road', city: 'Ocean Township', state: 'NJ', lat: 40.2440, lng: -74.0365, beds: 3, baths: 2, sqft: 1400, distance: 4.0, university: 'Monmouth University', startingBid: 2600, reservePrice: 2900, amenities: ['Parking', 'Laundry', 'Furnished', 'Dishwasher', 'Hardwood Floors'], tags: ['Furnished', 'Parking Included'], daysLeft: 11, photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'] },
    // Oakhurst (3) — Maria Garcia
    { landlordEmail: 'maria.garcia@property.com', title: '3BR House on Dixon Avenue', description: 'House in the Oakhurst section near Elberon and only a few minutes from Monmouth University. Common area for off-campus Monmouth students.', address: '102 Dixon Avenue', city: 'Oakhurst', state: 'NJ', lat: 40.2625, lng: -74.0120, beds: 3, baths: 1, sqft: 1500, distance: 1.8, university: 'Monmouth University', startingBid: 2700, reservePrice: 3000, amenities: ['Parking', 'Laundry', 'Furnished', 'AC', 'Hardwood Floors'], tags: ['Furnished', 'Parking Included'], daysLeft: 13, photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'] },
    { landlordEmail: 'maria.garcia@property.com', title: '2BR Near Monmouth Road', description: 'Apartment near Monmouth Road and Route 35, less than 2 miles from campus. Convenient for two roommates wanting easy access to Monmouth University and local shopping.', address: '872 Red Oaks Drive', city: 'Oakhurst', state: 'NJ', lat: 40.2590, lng: -74.0180, beds: 2, baths: 1, sqft: 950, distance: 1.9, university: 'Monmouth University', startingBid: 2100, reservePrice: 2400, amenities: ['Parking', 'Laundry', 'Furnished', 'WiFi Included', 'Near Bus Stop'], tags: ['Furnished', 'Utilities Included'], daysLeft: 1, photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'] },
    { landlordEmail: 'maria.garcia@property.com', title: '1BR on Whalepond Road', description: 'One-bedroom apartment in central Oakhurst, close to shopping plazas and approximately 2 miles from Monmouth University. Good option for a student living alone.', address: '240 Whalepond Road', city: 'Oakhurst', state: 'NJ', lat: 40.2555, lng: -74.0230, beds: 1, baths: 1, sqft: 700, distance: 2.1, university: 'Monmouth University', startingBid: 1600, reservePrice: 1850, amenities: ['Parking', 'Heat Included', 'AC', 'Laundry', 'Pet Friendly'], tags: ['Pet Friendly', 'Utilities Included'], daysLeft: 6, photos: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'] },
  ];

  return { landlords, students, listingsData };
}

// ============================================================
// POST /api/admin/seed — NON-DESTRUCTIVE: skip existing records
// ============================================================
router.post('/seed', async (req: Request, res: Response) => {
  try {
    if (!checkAdminKey(req, res)) return;

    console.log('Admin seed (non-destructive): starting...');
    const { landlords, students, listingsData } = getSeedData();
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    let usersInserted = 0;
    let usersSkipped = 0;
    let listingsInserted = 0;
    let listingsSkipped = 0;
    let bidsInserted = 0;

    // Map email -> id for landlord lookups when inserting listings
    const userIdByEmail: Record<string, string> = {};

    // Insert users (skip if email exists)
    const allUsers = [
      ...landlords.map(l => ({ ...l, role: 'landlord' as const, year: undefined as string | undefined, budgetMin: undefined as number | undefined, budgetMax: undefined as number | undefined })),
      ...students.map(s => ({ ...s, role: 'student' as const })),
    ];

    for (const u of allUsers) {
      const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, u.email)).get();
      if (existing) {
        usersSkipped++;
        userIdByEmail[u.email] = existing.id;
        console.log(`  skip user: ${u.email} (already exists)`);
        continue;
      }
      const id = crypto.randomUUID();
      userIdByEmail[u.email] = id;
      await db.insert(schema.users).values({
        id, email: u.email, password: hashedPassword, name: u.name,
        university: u.university, role: u.role,
        year: u.year || null,
        budgetMin: u.budgetMin ?? null, budgetMax: u.budgetMax ?? null,
        isEduVerified: u.email.endsWith('.edu'),
        createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      }).run();
      usersInserted++;
      console.log(`  insert user: ${u.email}`);
    }

    // Insert listings (skip if address already exists in same city)
    const newListingIds: string[] = [];
    const studentEmails = students.map(s => s.email);

    for (const l of listingsData) {
      const existing = await db.select({ id: schema.listings.id }).from(schema.listings)
        .where(eq(schema.listings.address, l.address)).get();
      if (existing) {
        listingsSkipped++;
        console.log(`  skip listing: "${l.title}" at ${l.address} (already exists)`);
        continue;
      }

      const landlordId = userIdByEmail[l.landlordEmail];
      if (!landlordId) {
        console.log(`  skip listing: "${l.title}" — landlord ${l.landlordEmail} not found`);
        listingsSkipped++;
        continue;
      }

      const id = crypto.randomUUID();
      newListingIds.push(id);
      const auctionEnd = new Date(now.getTime() + l.daysLeft * 86400000);
      const auctionStart = new Date(now.getTime() - (14 - l.daysLeft) * 86400000);
      await db.insert(schema.listings).values({
        id, landlordId, title: l.title, description: l.description,
        address: l.address, city: l.city, state: l.state, lat: l.lat, lng: l.lng,
        photos: JSON.stringify((l as any).photos || [`https://picsum.photos/seed/${id}1/800/600`]),
        amenities: JSON.stringify(l.amenities), beds: l.beds, baths: l.baths, sqft: l.sqft,
        distanceToCampus: l.distance, nearestUniversity: l.university,
        startingBid: l.startingBid, reservePrice: l.reservePrice, currentBid: l.startingBid,
        bidCount: 0, auctionStart: auctionStart.toISOString(), auctionEnd: auctionEnd.toISOString(),
        status: 'active', approvalStatus: 'approved', tags: JSON.stringify(l.tags), createdAt: auctionStart.toISOString(),
      }).run();
      listingsInserted++;
      console.log(`  insert listing: "${l.title}"`);

      // Add bids for newly created listings (4-8 per listing)
      const increments = [25, 50, 25, 75, 50, 25, 50, 25];
      let currentBid = l.startingBid;
      const numBids = 4 + Math.floor(Math.random() * 5);
      for (let j = 0; j < numBids; j++) {
        const bidderEmail = studentEmails[Math.floor(Math.random() * studentEmails.length)];
        const bidderId = userIdByEmail[bidderEmail];
        if (!bidderId) continue;
        currentBid += increments[j % increments.length];
        await db.insert(schema.bids).values({
          id: crypto.randomUUID(), listingId: id, userId: bidderId, amount: currentBid,
          isAutoBid: Math.random() > 0.8,
          timestamp: new Date(now.getTime() - (l.daysLeft + 14 - j) * 86400000 / numBids * (numBids - j)).toISOString(),
        }).run();
        bidsInserted++;
      }
      await db.update(schema.listings).set({ currentBid, bidCount: numBids }).where(eq(schema.listings.id, id)).run();
    }

    const summary = {
      success: true,
      users: { inserted: usersInserted, skipped: usersSkipped },
      listings: { inserted: listingsInserted, skipped: listingsSkipped },
      bids: { inserted: bidsInserted },
      testAccounts: {
        student: 'alex.m@monmouth.edu / password123',
        landlord: 'sarah.chen@realty.com / password123',
      },
    };
    console.log('Admin seed (non-destructive): complete!', JSON.stringify(summary));
    res.json(summary);
  } catch (error) {
    console.error('Admin seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: String(error) });
  }
});

// ============================================================
// POST /api/admin/reset — DESTRUCTIVE: wipe everything + reseed
// ============================================================
router.post('/reset', async (req: Request, res: Response) => {
  try {
    if (!checkAdminKey(req, res)) return;

    console.log('Admin RESET: wiping all data...');

    await db.delete(schema.favorites).run();
    await db.delete(schema.notifications).run();
    await db.delete(schema.autoBids).run();
    await db.delete(schema.bids).run();
    await db.delete(schema.listings).run();
    await db.delete(schema.users).run();

    console.log('Admin RESET: tables cleared, now seeding...');

    const { landlords, students, listingsData } = getSeedData();
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();
    const userIdByEmail: Record<string, string> = {};

    for (const l of landlords) {
      const id = crypto.randomUUID();
      userIdByEmail[l.email] = id;
      await db.insert(schema.users).values({
        id, email: l.email, password: hashedPassword, name: l.name,
        university: l.university, role: l.role, isEduVerified: false,
        createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      }).run();
    }

    for (const s of students) {
      const id = crypto.randomUUID();
      userIdByEmail[s.email] = id;
      await db.insert(schema.users).values({
        id, email: s.email, password: hashedPassword, name: s.name,
        university: s.university, year: s.year, role: 'student',
        budgetMin: s.budgetMin, budgetMax: s.budgetMax,
        isEduVerified: s.email.endsWith('.edu'),
        createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      }).run();
    }

    const listingIds: string[] = [];
    const studentEmails = students.map(s => s.email);

    for (const l of listingsData) {
      const id = crypto.randomUUID();
      listingIds.push(id);
      const landlordId = userIdByEmail[l.landlordEmail];
      const auctionEnd = new Date(now.getTime() + l.daysLeft * 86400000);
      const auctionStart = new Date(now.getTime() - (14 - l.daysLeft) * 86400000);
      await db.insert(schema.listings).values({
        id, landlordId, title: l.title, description: l.description,
        address: l.address, city: l.city, state: l.state, lat: l.lat, lng: l.lng,
        photos: JSON.stringify((l as any).photos || [`https://picsum.photos/seed/${id}1/800/600`]),
        amenities: JSON.stringify(l.amenities), beds: l.beds, baths: l.baths, sqft: l.sqft,
        distanceToCampus: l.distance, nearestUniversity: l.university,
        startingBid: l.startingBid, reservePrice: l.reservePrice, currentBid: l.startingBid,
        bidCount: 0, auctionStart: auctionStart.toISOString(), auctionEnd: auctionEnd.toISOString(),
        status: 'active', approvalStatus: 'approved', tags: JSON.stringify(l.tags), createdAt: auctionStart.toISOString(),
      }).run();
    }

    const increments = [25, 50, 25, 75, 50, 25, 50, 25];
    for (let i = 0; i < listingIds.length; i++) {
      const listingId = listingIds[i];
      let currentBid = listingsData[i].startingBid;
      const numBids = 4 + Math.floor(Math.random() * 5);
      for (let j = 0; j < numBids; j++) {
        const bidderEmail = studentEmails[Math.floor(Math.random() * studentEmails.length)];
        const bidderId = userIdByEmail[bidderEmail];
        currentBid += increments[j % increments.length];
        await db.insert(schema.bids).values({
          id: crypto.randomUUID(), listingId, userId: bidderId, amount: currentBid,
          isAutoBid: Math.random() > 0.8,
          timestamp: new Date(now.getTime() - (listingsData[i].daysLeft + 14 - j) * 86400000 / numBids * (numBids - j)).toISOString(),
        }).run();
      }
      await db.update(schema.listings).set({ currentBid, bidCount: numBids }).where(eq(schema.listings.id, listingId)).run();
    }

    console.log('Admin RESET: complete!');
    res.json({
      success: true,
      message: `RESET complete. Seeded ${landlords.length} landlords, ${students.length} students, ${listingsData.length} listings`,
      warning: 'All previous data was deleted',
      testAccounts: {
        student: 'alex.m@monmouth.edu / password123',
        landlord: 'sarah.chen@realty.com / password123',
      },
    });
  } catch (error) {
    console.error('Admin reset error:', error);
    res.status(500).json({ error: 'Reset failed', details: String(error) });
  }
});

// ============================================================
// Admin Listing Approval
// ============================================================

// Get pending listings
router.get('/listings/pending', async (req: Request, res: Response) => {
  try {
    if (!checkAdminKey(req, res)) return;
    const results = await db.select({
      id: schema.listings.id,
      title: schema.listings.title,
      address: schema.listings.address,
      city: schema.listings.city,
      startingBid: schema.listings.startingBid,
      auctionEnd: schema.listings.auctionEnd,
      landlordId: schema.listings.landlordId,
      createdAt: schema.listings.createdAt,
    }).from(schema.listings).where(eq(schema.listings.approvalStatus, 'pending'));

    // Attach landlord name
    const enriched = [];
    for (const l of results) {
      const landlord = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, l.landlordId)).get();
      enriched.push({ ...l, landlordName: landlord?.name ?? 'Unknown' });
    }
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve listing
router.post('/listings/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!checkAdminKey(req, res)) return;
    await db.update(schema.listings).set({ approvalStatus: 'approved' }).where(eq(schema.listings.id, String(req.params.id))).run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject listing
router.post('/listings/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!checkAdminKey(req, res)) return;
    await db.update(schema.listings).set({ approvalStatus: 'rejected' }).where(eq(schema.listings.id, String(req.params.id))).run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// Admin Analytics Dashboard
// ============================================================
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    if (!checkAdminKey(req, res)) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const dayFromNow = new Date(now.getTime() + 86400000).toISOString();

    // User stats
    const allUsers = await db.select({ id: schema.users.id, role: schema.users.role, isEduVerified: schema.users.isEduVerified, createdAt: schema.users.createdAt }).from(schema.users);
    const students = allUsers.filter(u => u.role === 'student');
    const landlords = allUsers.filter(u => u.role === 'landlord');
    const newToday = allUsers.filter(u => u.createdAt >= todayStart).length;
    const newThisWeek = allUsers.filter(u => u.createdAt >= weekAgo).length;
    const eduVerified = students.filter(u => u.isEduVerified).length;

    // Active users (bid in last 7 days)
    const recentBidders = await db.select({ userId: schema.bids.userId }).from(schema.bids).where(gte(schema.bids.timestamp, weekAgo));
    const activeUsers = new Set(recentBidders.map(b => b.userId)).size;

    // Listing stats
    const allListings = await db.select({
      id: schema.listings.id, status: schema.listings.status,
      approvalStatus: schema.listings.approvalStatus, auctionEnd: schema.listings.auctionEnd,
      startingBid: schema.listings.startingBid, currentBid: schema.listings.currentBid,
      bidCount: schema.listings.bidCount, title: schema.listings.title,
    }).from(schema.listings);
    const activeListings = allListings.filter(l => l.status === 'active' && l.approvalStatus === 'approved');
    const pendingListings = allListings.filter(l => l.approvalStatus === 'pending');
    const closedListings = allListings.filter(l => l.status === 'ended');
    const endingSoon = activeListings.filter(l => l.auctionEnd <= dayFromNow);
    const avgStarting = activeListings.length > 0 ? Math.round(activeListings.reduce((s, l) => s + l.startingBid, 0) / activeListings.length) : 0;
    const avgCurrent = activeListings.length > 0 ? Math.round(activeListings.reduce((s, l) => s + l.currentBid, 0) / activeListings.length) : 0;

    // Bid stats
    const allBids = await db.select({ id: schema.bids.id, amount: schema.bids.amount, timestamp: schema.bids.timestamp, listingId: schema.bids.listingId }).from(schema.bids);
    const bidsToday = allBids.filter(b => b.timestamp >= todayStart).length;
    const highestBid = allBids.reduce((max, b) => b.amount > max ? b.amount : max, 0);
    const avgBidsPerListing = allListings.length > 0 ? Math.round(allBids.length / allListings.length * 10) / 10 : 0;

    // Most contested listing
    const contestedListing = allListings.reduce((best, l) => l.bidCount > (best?.bidCount ?? 0) ? l : best, allListings[0]);

    // Recent activity feed (last 10 bids with listing + user info)
    const recentBids = await db.select({
      bidId: schema.bids.id,
      amount: schema.bids.amount,
      timestamp: schema.bids.timestamp,
      isAutoBid: schema.bids.isAutoBid,
      userId: schema.bids.userId,
      listingTitle: schema.listings.title,
    })
      .from(schema.bids)
      .leftJoin(schema.listings, eq(schema.bids.listingId, schema.listings.id))
      .orderBy(desc(schema.bids.timestamp))
      .limit(10);

    const activityFeed = recentBids.map(b => ({
      type: b.isAutoBid ? 'auto_bid' : 'bid',
      user: `Student #${b.userId?.substring(0, 6)}`,
      listing: b.listingTitle ?? 'Unknown',
      amount: b.amount,
      timestamp: b.timestamp,
    }));

    res.json({
      users: {
        total: allUsers.length,
        students: students.length,
        landlords: landlords.length,
        newToday,
        newThisWeek,
        activeLastWeek: activeUsers,
        eduVerified,
        eduUnverified: students.length - eduVerified,
      },
      listings: {
        total: allListings.length,
        active: activeListings.length,
        pending: pendingListings.length,
        closed: closedListings.length,
        endingIn24h: endingSoon.length,
        avgStartingPrice: avgStarting,
        avgCurrentBid: avgCurrent,
      },
      bids: {
        total: allBids.length,
        today: bidsToday,
        avgPerListing: avgBidsPerListing,
        highestEver: highestBid,
        mostContested: contestedListing ? { title: contestedListing.title, bidCount: contestedListing.bidCount } : null,
      },
      activityFeed,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
