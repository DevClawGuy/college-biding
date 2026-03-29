import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, like, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getUploadMiddleware } from '../lib/cloudinary';

const router = Router();

function parseListing(l: any) {
  return {
    ...l,
    photos: JSON.parse(l.photos),
    amenities: JSON.parse(l.amenities),
    tags: JSON.parse(l.tags),
  };
}

// Get all listings with filters (only approved listings for public browse)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, university, minPrice, maxPrice, beds, baths, maxDistance, search, sort, status } = req.query;
    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(schema.listings.status, status as 'active' | 'ended' | 'cancelled'));
    } else {
      conditions.push(eq(schema.listings.status, 'active'));
    }

    // Only show approved listings on public browse
    conditions.push(eq(schema.listings.approvalStatus, 'approved'));

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
      results = await db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.auctionEnd));
    } else if (sort === 'lowest_bid') {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.currentBid));
    } else {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(desc(schema.listings.createdAt));
    }

    res.json(results.map(parseListing));
  } catch (error) {
    console.error('Listings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single listing (any approval status — direct link should work)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const landlord = await db.select({
      id: schema.users.id, name: schema.users.name,
      university: schema.users.university, avatar: schema.users.avatar,
    }).from(schema.users).where(eq(schema.users.id, listing.landlordId)).get();

    let winner = null;
    if (listing.status === 'ended' && listing.winnerId) {
      winner = await db.select({
        id: schema.users.id, name: schema.users.name,
        email: schema.users.email, university: schema.users.university,
      }).from(schema.users).where(eq(schema.users.id, listing.winnerId)).get();
    }

    res.json({ ...parseListing(listing), landlord, winner });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload images (landlord only)
router.post('/upload-images', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const upload = getUploadMiddleware();
    if (!upload) {
      res.status(500).json({ error: 'Image upload not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.' });
      return;
    }

    upload.array('images', 10)(req as any, res as any, (err: any) => {
      if (err) {
        console.error('Upload error:', err);
        res.status(400).json({ error: typeof err?.message === 'string' ? err.message : 'Upload failed' });
        return;
      }
      const files = (req as any).files as any[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No images uploaded' });
        return;
      }
      const images = files.map((f: any) => ({
        url: f.path || f.secure_url || f.url,
        publicId: f.filename || f.public_id,
      }));
      res.json(images);
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create listing (landlord only)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role !== 'landlord') {
      res.status(403).json({ error: 'Only landlords can create listings' });
      return;
    }

    const {
      title, description, address, city, state, lat, lng,
      amenities, beds, baths, sqft, distanceToCampus, nearestUniversity,
      startingBid, reservePrice, auctionEnd, tags
    } = req.body;

    // Validate auction end date — at least 24 hours from now
    const auctionEndDate = new Date(auctionEnd);
    const minEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (isNaN(auctionEndDate.getTime()) || auctionEndDate < minEnd) {
      res.status(400).json({ error: 'Auction end date must be at least 24 hours from now' });
      return;
    }

    const id = crypto.randomUUID();
    await db.insert(schema.listings).values({
      id,
      landlordId: req.userId!,
      title, description, address, city, state, lat, lng,
      photos: JSON.stringify(req.body.photos || []),
      amenities: JSON.stringify(amenities || []),
      beds, baths, sqft, distanceToCampus, nearestUniversity,
      startingBid, reservePrice,
      currentBid: startingBid,
      bidCount: 0,
      auctionStart: new Date().toISOString(),
      auctionEnd: auctionEndDate.toISOString(),
      status: 'active',
      approvalStatus: 'pending',
      tags: JSON.stringify(tags || []),
      createdAt: new Date().toISOString(),
    }).run();

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, id)).get();
    res.status(201).json(parseListing(listing!));
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update listing (landlord owner only)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (listing.landlordId !== req.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    const updates: any = {};
    const fields = ['title', 'description', 'address', 'city', 'state', 'lat', 'lng', 'beds', 'baths', 'sqft', 'distanceToCampus', 'nearestUniversity', 'startingBid', 'reservePrice', 'status'];
    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.amenities) updates.amenities = JSON.stringify(req.body.amenities);
    if (req.body.tags) updates.tags = JSON.stringify(req.body.tags);
    if (req.body.photos) updates.photos = JSON.stringify(req.body.photos);

    // Cannot change auctionEnd if bidding has started
    if (req.body.auctionEnd !== undefined) {
      if (listing.bidCount > 0) {
        res.status(400).json({ error: 'Cannot change auction end date after bidding has started' });
        return;
      }
      const newEnd = new Date(req.body.auctionEnd);
      if (isNaN(newEnd.getTime()) || newEnd < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        res.status(400).json({ error: 'Auction end date must be at least 24 hours from now' });
        return;
      }
      updates.auctionEnd = newEnd.toISOString();
    }

    await db.update(schema.listings).set(updates).where(eq(schema.listings.id, String(req.params.id))).run();
    const updated = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    res.json(parseListing(updated!));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete listing (landlord owner only, no active bids)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (listing.landlordId !== req.userId) { res.status(403).json({ error: 'Not authorized' }); return; }
    if (listing.bidCount > 0) {
      res.status(400).json({ error: 'Cannot delete a listing with active bids' });
      return;
    }

    await db.delete(schema.favorites).where(eq(schema.favorites.listingId, listing.id)).run();
    await db.delete(schema.notifications).where(eq(schema.notifications.listingId, listing.id)).run();
    await db.delete(schema.bids).where(eq(schema.bids.listingId, listing.id)).run();
    await db.delete(schema.autoBids).where(eq(schema.autoBids.listingId, listing.id)).run();
    await db.delete(schema.listings).where(eq(schema.listings.id, listing.id)).run();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get landlord's listings (all approval statuses)
router.get('/my/listings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const results = await db.select().from(schema.listings)
      .where(eq(schema.listings.landlordId, req.userId!))
      .orderBy(desc(schema.listings.createdAt));
    res.json(results.map(parseListing));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
