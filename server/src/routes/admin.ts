import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/seed', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    console.log('Admin seed: starting...');

    // Clear existing data (order matters for foreign keys)
    await db.delete(schema.favorites).run();
    await db.delete(schema.notifications).run();
    await db.delete(schema.autoBids).run();
    await db.delete(schema.bids).run();
    await db.delete(schema.listings).run();
    await db.delete(schema.users).run();

    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    // Landlords
    const landlords = [
      { id: crypto.randomUUID(), email: 'sarah.chen@realty.com', name: 'Sarah Chen', university: 'Boston Properties', role: 'landlord' as const },
      { id: crypto.randomUUID(), email: 'mike.johnson@homes.com', name: 'Mike Johnson', university: 'Austin Rentals', role: 'landlord' as const },
      { id: crypto.randomUUID(), email: 'lisa.park@apartments.com', name: 'Lisa Park', university: 'LA Housing Co', role: 'landlord' as const },
      { id: crypto.randomUUID(), email: 'james.wilson@rent.com', name: 'James Wilson', university: 'NYC Living', role: 'landlord' as const },
      { id: crypto.randomUUID(), email: 'maria.garcia@property.com', name: 'Maria Garcia', university: 'Chicago Realty', role: 'landlord' as const },
    ];

    // Students
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

    for (const l of landlords) {
      await db.insert(schema.users).values({
        id: l.id, email: l.email, password: hashedPassword, name: l.name,
        university: l.university, role: l.role, isEduVerified: false,
        createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      }).run();
    }

    for (const s of students) {
      await db.insert(schema.users).values({
        id: s.id, email: s.email, password: hashedPassword, name: s.name,
        university: s.university, year: s.year, role: 'student',
        budgetMin: s.budgetMin, budgetMax: s.budgetMax,
        isEduVerified: s.email.endsWith('.edu'),
        createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      }).run();
    }

    // Listings
    const listingsData = [
      { landlord: landlords[0], title: 'Sunny 2BR Near Monmouth Campus', description: 'Bright and spacious 2-bedroom apartment just steps from Monmouth University.', address: '260 Norwood Ave', city: 'West Long Branch', state: 'NJ', lat: 40.2904, lng: -74.0165, beds: 2, baths: 1, sqft: 850, distance: 0.3, university: 'Monmouth University', startingBid: 1200, reservePrice: 1600, amenities: ['In-Unit Laundry', 'Dishwasher', 'Central AC'], tags: ['Furnished', 'Utilities Included'], daysLeft: 5 },
      { landlord: landlords[0], title: 'Cozy Studio on Cedar Ave', description: 'Charming studio on a quiet tree-lined street near campus.', address: '85 Cedar Ave', city: 'West Long Branch', state: 'NJ', lat: 40.2880, lng: -74.0120, beds: 0, baths: 1, sqft: 450, distance: 0.2, university: 'Monmouth University', startingBid: 1100, reservePrice: 1500, amenities: ['High Ceilings', 'Hardwood Floors', 'Laundry In Building'], tags: ['Furnished', 'Pet Friendly'], daysLeft: 3 },
      { landlord: landlords[1], title: 'Modern 3BR House on Wall St', description: 'Spacious 3-bedroom house perfect for roommates with large backyard.', address: '310 Wall St', city: 'West Long Branch', state: 'NJ', lat: 40.2920, lng: -74.0200, beds: 3, baths: 2, sqft: 1400, distance: 0.5, university: 'Monmouth University', startingBid: 900, reservePrice: 1400, amenities: ['Backyard', 'Garage', 'Central AC', 'Washer/Dryer'], tags: ['Pet Friendly', 'Parking Included'], daysLeft: 7 },
      { landlord: landlords[1], title: 'Loft-Style 1BR in Long Branch', description: 'Industrial-chic loft near the beach with great natural light.', address: '180 Broadway', city: 'Long Branch', state: 'NJ', lat: 40.2984, lng: -73.9924, beds: 1, baths: 1, sqft: 700, distance: 1.2, university: 'Monmouth University', startingBid: 1100, reservePrice: 1500, amenities: ['Rooftop Access', 'Gym', 'High Ceilings'], tags: ['Furnished', 'Utilities Included'], daysLeft: 2 },
      { landlord: landlords[2], title: 'Beachside 2BR in Long Branch', description: 'Beautiful 2-bedroom with ocean breezes and balcony views.', address: '350 Ocean Blvd', city: 'Long Branch', state: 'NJ', lat: 40.2920, lng: -73.9830, beds: 2, baths: 2, sqft: 950, distance: 1.5, university: 'Monmouth University', startingBid: 1800, reservePrice: 2400, amenities: ['Pool', 'Gym', 'Balcony', 'Secure Parking'], tags: ['Pet Friendly', 'Parking Included'], daysLeft: 6 },
      { landlord: landlords[2], title: 'Charming 1BR in Eatontown', description: 'Updated 1-bedroom in a quiet neighborhood with private patio.', address: '42 Broad St', city: 'Eatontown', state: 'NJ', lat: 40.2960, lng: -74.0510, beds: 1, baths: 1, sqft: 650, distance: 2.0, university: 'Monmouth University', startingBid: 1000, reservePrice: 1400, amenities: ['Private Patio', 'New Appliances', 'In-Unit Laundry'], tags: ['Furnished', 'Utilities Included'], daysLeft: 4 },
      { landlord: landlords[3], title: 'Pier Village Studio', description: 'Prime Pier Village location steps from the beach.', address: '11 Ocean Ave', city: 'Long Branch', state: 'NJ', lat: 40.2935, lng: -73.9870, beds: 0, baths: 1, sqft: 400, distance: 1.8, university: 'Monmouth University', startingBid: 1400, reservePrice: 1900, amenities: ['Concierge', 'Roof Deck', 'Near Beach'], tags: ['Utilities Included'], daysLeft: 8 },
      { landlord: landlords[3], title: 'Spacious 2BR on Larchwood Ave', description: 'Large 2-bedroom close to campus with plenty of natural light.', address: '75 Larchwood Ave', city: 'West Long Branch', state: 'NJ', lat: 40.2870, lng: -74.0180, beds: 2, baths: 1, sqft: 900, distance: 0.3, university: 'Monmouth University', startingBid: 1300, reservePrice: 1800, amenities: ['Eat-In Kitchen', 'Storage', 'Hardwood Floors'], tags: ['Pet Friendly'], daysLeft: 10 },
      { landlord: landlords[4], title: 'Ocean Township 2BR Apartment', description: 'Classic Jersey Shore 2-bedroom with bay windows and hardwood floors.', address: '198 Deal Rd', city: 'Ocean Township', state: 'NJ', lat: 40.2650, lng: -74.0270, beds: 2, baths: 1, sqft: 1000, distance: 2.5, university: 'Monmouth University', startingBid: 1000, reservePrice: 1500, amenities: ['Bay Windows', 'Hardwood Floors', 'Dining Room'], tags: ['Pet Friendly', 'Furnished'], daysLeft: 5 },
      { landlord: landlords[4], title: 'Asbury Park 1BR Near Boardwalk', description: 'Modern 1-bedroom in vibrant Asbury Park near restaurants and beach.', address: '501 Cookman Ave', city: 'Asbury Park', state: 'NJ', lat: 40.2201, lng: -74.0001, beds: 1, baths: 1, sqft: 700, distance: 5.0, university: 'Monmouth University', startingBid: 1100, reservePrice: 1500, amenities: ['Modern Kitchen', 'In-Unit Laundry', 'Gym'], tags: ['Utilities Included', 'Parking Included'], daysLeft: 6 },
      { landlord: landlords[0], title: '3BR Townhouse on Campus Edge', description: 'Rare 3-bedroom townhouse right on the edge of Monmouth campus.', address: '15 Pinckney Rd', city: 'West Long Branch', state: 'NJ', lat: 40.2915, lng: -74.0140, beds: 3, baths: 2, sqft: 1300, distance: 0.1, university: 'Monmouth University', startingBid: 1600, reservePrice: 2200, amenities: ['Townhouse', 'Private Entrance', 'Backyard'], tags: ['Pet Friendly', 'Parking Included'], daysLeft: 9 },
      { landlord: landlords[2], title: 'Luxury Studio in West End', description: 'Brand new luxury studio with smart home features and city views.', address: '200 Westwood Ave', city: 'Long Branch', state: 'NJ', lat: 40.2860, lng: -73.9960, beds: 0, baths: 1, sqft: 500, distance: 1.5, university: 'Monmouth University', startingBid: 1200, reservePrice: 1700, amenities: ['Smart Home', 'Concierge', 'Gym', 'Pool'], tags: ['Furnished', 'Utilities Included'], daysLeft: 1 },
    ];

    const listingIds: string[] = [];
    for (const l of listingsData) {
      const id = crypto.randomUUID();
      listingIds.push(id);
      const auctionEnd = new Date(now.getTime() + l.daysLeft * 86400000);
      const auctionStart = new Date(now.getTime() - (14 - l.daysLeft) * 86400000);
      await db.insert(schema.listings).values({
        id, landlordId: l.landlord.id, title: l.title, description: l.description,
        address: l.address, city: l.city, state: l.state, lat: l.lat, lng: l.lng,
        photos: JSON.stringify([`https://picsum.photos/seed/${id}1/800/600`, `https://picsum.photos/seed/${id}2/800/600`, `https://picsum.photos/seed/${id}3/800/600`, `https://picsum.photos/seed/${id}4/800/600`]),
        amenities: JSON.stringify(l.amenities), beds: l.beds, baths: l.baths, sqft: l.sqft,
        distanceToCampus: l.distance, nearestUniversity: l.university,
        startingBid: l.startingBid, reservePrice: l.reservePrice, currentBid: l.startingBid,
        bidCount: 0, auctionStart: auctionStart.toISOString(), auctionEnd: auctionEnd.toISOString(),
        status: 'active', tags: JSON.stringify(l.tags), createdAt: auctionStart.toISOString(),
      }).run();
    }

    // Bids
    const increments = [25, 50, 75, 100, 50, 25, 75, 100, 50, 25];
    for (let i = 0; i < listingIds.length; i++) {
      const listingId = listingIds[i];
      let currentBid = listingsData[i].startingBid;
      const numBids = 3 + Math.floor(Math.random() * 8);
      for (let j = 0; j < numBids; j++) {
        const bidder = students[Math.floor(Math.random() * students.length)];
        currentBid += increments[j % increments.length];
        await db.insert(schema.bids).values({
          id: crypto.randomUUID(), listingId, userId: bidder.id, amount: currentBid,
          isAutoBid: Math.random() > 0.8,
          timestamp: new Date(now.getTime() - (listingsData[i].daysLeft + 14 - j) * 86400000 / numBids * (numBids - j)).toISOString(),
        }).run();
      }
      await db.update(schema.listings).set({ currentBid, bidCount: numBids }).where(eq(schema.listings.id, listingId)).run();
    }

    console.log('Admin seed: complete!');
    res.json({
      success: true,
      message: `Seeded ${landlords.length} landlords, ${students.length} students, ${listingsData.length} listings`,
      testAccounts: {
        student: 'alex.m@monmouth.edu / password123',
        landlord: 'sarah.chen@realty.com / password123',
      },
    });
  } catch (error) {
    console.error('Admin seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: String(error) });
  }
});

export default router;
