import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/parent-access/:token — public, no auth required
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    // Find student by parent_access_token
    const student = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      university: schema.users.university,
    }).from(schema.users)
      .where(eq(schema.users.parentAccessToken, token))
      .get();

    if (!student) {
      res.status(404).json({ error: 'Invalid or expired access link' });
      return;
    }

    // Privacy: only return first name
    const firstName = student.name.split(' ')[0];

    // Get student's favorited listings
    const favRows = await db.select({ listing: schema.listings })
      .from(schema.favorites)
      .innerJoin(schema.listings, eq(schema.favorites.listingId, schema.listings.id))
      .where(eq(schema.favorites.userId, student.id));

    const savedListings = favRows.map(f => ({
      id: f.listing.id,
      title: f.listing.title,
      address: f.listing.address,
      city: f.listing.city,
      photos: JSON.parse(f.listing.photos),
      currentBid: f.listing.currentBid,
      auctionEnd: f.listing.auctionEnd,
      status: f.listing.status,
      beds: f.listing.beds,
      baths: f.listing.baths,
    }));

    // Get student's bids with listing details
    const bidRows = await db.select({
      bidId: schema.bids.id,
      amount: schema.bids.amount,
      timestamp: schema.bids.timestamp,
      listingId: schema.bids.listingId,
      listingTitle: schema.listings.title,
      listingAddress: schema.listings.address,
      listingCity: schema.listings.city,
      listingPhotos: schema.listings.photos,
      currentBid: schema.listings.currentBid,
      auctionEnd: schema.listings.auctionEnd,
      listingStatus: schema.listings.status,
      winnerId: schema.listings.winnerId,
    })
      .from(schema.bids)
      .leftJoin(schema.listings, eq(schema.bids.listingId, schema.listings.id))
      .where(eq(schema.bids.userId, student.id))
      .orderBy(desc(schema.bids.timestamp));

    // Deduplicate: keep only latest bid per listing
    const latestByListing = new Map<string, typeof bidRows[0]>();
    for (const bid of bidRows) {
      if (!latestByListing.has(bid.listingId)) {
        latestByListing.set(bid.listingId, bid);
      }
    }

    const activeBids = Array.from(latestByListing.values()).map(b => ({
      listingId: b.listingId,
      listingTitle: b.listingTitle,
      listingAddress: b.listingAddress,
      listingCity: b.listingCity,
      listingPhotos: b.listingPhotos ? JSON.parse(b.listingPhotos) : [],
      bidAmount: b.amount,
      currentBid: b.currentBid,
      auctionEnd: b.auctionEnd,
      listingStatus: b.listingStatus,
      winnerId: b.winnerId,
    }));

    // TODO: consider adding a last-accessed timestamp for analytics
    res.json({
      studentFirstName: firstName,
      university: student.university,
      savedListings,
      activeBids,
    });
  } catch (error) {
    console.error('Parent access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
