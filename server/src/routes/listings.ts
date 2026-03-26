import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../db';
import { eq, and, like, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all listings with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { city, university, minPrice, maxPrice, beds, baths, maxDistance, search, sort, status } = req.query;

    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(schema.listings.status, status as 'active' | 'ended' | 'cancelled'));
    } else {
      conditions.push(eq(schema.listings.status, 'active'));
    }

    if (city) conditions.push(like(schema.listings.city, `%${city}%`));
    if (university) conditions.push(like(schema.listings.nearestUniversity, `%${university}%`));
    if (minPrice) conditions.push(gte(schema.listings.currentBid, Number(minPrice)));
    if (maxPrice) conditions.push(lte(schema.listings.startingBid, Number(maxPrice)));
    if (beds) conditions.push(gte(schema.listings.beds, Number(beds)));
    if (baths) conditions.push(gte(schema.listings.baths, Number(baths)));
    if (maxDistance) conditions.push(lte(schema.listings.distanceToCampus, Number(maxDistance)));
    if (search) {
      conditions.push(
        sql`(${schema.listings.title} LIKE ${'%' + search + '%'} OR ${schema.listings.address} LIKE ${'%' + search + '%'} OR ${schema.listings.description} LIKE ${'%' + search + '%'})`
      );
    }

    let results;
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (sort === 'ending_soonest') {
      results = db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.auctionEnd)).all();
    } else if (sort === 'lowest_bid') {
      results = db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.currentBid)).all();
    } else {
      results = db.select().from(schema.listings).where(whereClause).orderBy(desc(schema.listings.createdAt)).all();
    }

    // Parse JSON fields
    const parsed = results.map(l => ({
      ...l,
      photos: JSON.parse(l.photos),
      amenities: JSON.parse(l.amenities),
      tags: JSON.parse(l.tags),
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Listings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single listing
router.get('/:id', (req: Request, res: Response) => {
  try {
    const listing = db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const landlord = db.select({
      id: schema.users.id,
      name: schema.users.name,
      university: schema.users.university,
      avatar: schema.users.avatar,
    }).from(schema.users).where(eq(schema.users.id, listing.landlordId)).get();

    res.json({
      ...listing,
      photos: JSON.parse(listing.photos),
      amenities: JSON.parse(listing.amenities),
      tags: JSON.parse(listing.tags),
      landlord,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create listing (landlord only)
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role !== 'landlord') {
      res.status(403).json({ error: 'Only landlords can create listings' });
      return;
    }

    const {
      title, description, address, city, state, lat, lng,
      amenities, beds, baths, sqft, distanceToCampus, nearestUniversity,
      startingBid, reservePrice, auctionEnd, tags
    } = req.body;

    const id = uuidv4();
    db.insert(schema.listings).values({
      id,
      landlordId: req.userId!,
      title,
      description,
      address,
      city,
      state,
      lat,
      lng,
      photos: JSON.stringify(req.body.photos || []),
      amenities: JSON.stringify(amenities || []),
      beds,
      baths,
      sqft,
      distanceToCampus,
      nearestUniversity,
      startingBid,
      reservePrice,
      currentBid: startingBid,
      bidCount: 0,
      auctionStart: new Date().toISOString(),
      auctionEnd,
      status: 'active',
      tags: JSON.stringify(tags || []),
      createdAt: new Date().toISOString(),
    }).run();

    const listing = db.select().from(schema.listings).where(eq(schema.listings.id, id)).get();
    res.status(201).json({
      ...listing!,
      photos: JSON.parse(listing!.photos),
      amenities: JSON.parse(listing!.amenities),
      tags: JSON.parse(listing!.tags),
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update listing
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const listing = db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.landlordId !== req.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updates: any = {};
    const fields = ['title', 'description', 'address', 'city', 'state', 'lat', 'lng', 'beds', 'baths', 'sqft', 'distanceToCampus', 'nearestUniversity', 'startingBid', 'reservePrice', 'auctionEnd', 'status'];

    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.amenities) updates.amenities = JSON.stringify(req.body.amenities);
    if (req.body.tags) updates.tags = JSON.stringify(req.body.tags);
    if (req.body.photos) updates.photos = JSON.stringify(req.body.photos);

    db.update(schema.listings).set(updates).where(eq(schema.listings.id, String(req.params.id))).run();

    const updated = db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    res.json({
      ...updated!,
      photos: JSON.parse(updated!.photos),
      amenities: JSON.parse(updated!.amenities),
      tags: JSON.parse(updated!.tags),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get landlord's listings
router.get('/my/listings', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const results = db.select().from(schema.listings)
      .where(eq(schema.listings.landlordId, req.userId!))
      .orderBy(desc(schema.listings.createdAt))
      .all();

    const parsed = results.map(l => ({
      ...l,
      photos: JSON.parse(l.photos),
      amenities: JSON.parse(l.amenities),
      tags: JSON.parse(l.tags),
    }));

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
