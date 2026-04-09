import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db, schema } from '../db';
import { eq, and, like, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { calculateRentCheck } from '../lib/rentcheck';

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
    const { city, university, minPrice, maxPrice, beds, baths, maxDistance, search, sort, status, amenities, town, sortBy } = req.query;
    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(schema.listings.status, status as 'active' | 'ended' | 'cancelled'));
    } else {
      conditions.push(eq(schema.listings.status, 'active'));
    }

    conditions.push(eq(schema.listings.approvalStatus, 'approved'));

    // Town filter (alias for city)
    const townFilter = town || city;
    if (townFilter) conditions.push(like(schema.listings.city, `%${townFilter}%`));
    if (university) conditions.push(like(schema.listings.nearestUniversity, `%${university}%`));
    if (minPrice) conditions.push(gte(schema.listings.currentBid, Number(minPrice)));
    if (maxPrice) conditions.push(lte(schema.listings.currentBid, Number(maxPrice)));
    if (beds) conditions.push(gte(schema.listings.beds, Number(beds)));
    if (baths) conditions.push(gte(schema.listings.baths, Number(baths)));
    if (maxDistance) conditions.push(lte(schema.listings.distanceToCampus, Number(maxDistance)));
    if (search) {
      conditions.push(
        sql`(LOWER(${schema.listings.title}) LIKE LOWER(${'%' + search + '%'}) OR LOWER(${schema.listings.address}) LIKE LOWER(${'%' + search + '%'}) OR LOWER(${schema.listings.description}) LIKE LOWER(${'%' + search + '%'}))`
      );
    }

    // Amenities filter: comma-separated, must have ALL specified
    if (amenities && typeof amenities === 'string') {
      const requiredAmenities = amenities.split(',').map(a => a.trim()).filter(Boolean);
      for (const a of requiredAmenities) {
        conditions.push(like(schema.listings.amenities, `%${a}%`));
      }
    }

    let results;
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortField = sortBy || sort;

    if (sortField === 'ending_soonest' || sortField === 'ending_soon') {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.auctionEnd));
    } else if (sortField === 'lowest_bid' || sortField === 'price_asc') {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.currentBid));
    } else if (sortField === 'price_desc') {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(desc(schema.listings.currentBid));
    } else if (sortField === 'most_bids') {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(desc(schema.listings.bidCount));
    } else {
      results = await db.select().from(schema.listings).where(whereClause).orderBy(asc(schema.listings.auctionEnd));
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

    // TODO: track views over time for analytics dashboard
    // Record view (non-blocking, don't fail the request)
    try {
      // Optionally extract userId from JWT if present
      let viewerId: string | null = null;
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          viewerId = decoded.userId;
        } catch { /* invalid token — treat as anonymous */ }
      }

      // Don't count landlord viewing their own listing
      if (viewerId !== listing.landlordId) {
        const viewerIp = viewerId ? null : (req.ip || req.socket.remoteAddress || null);
        const viewId = crypto.randomUUID();

        // For logged-in users: INSERT OR IGNORE (unique on listing_id + viewer_id)
        // For anonymous: always insert (tracked by IP but not deduplicated strictly)
        if (viewerId) {
          const existing = await db.select({ id: schema.listingViews.id })
            .from(schema.listingViews)
            .where(and(
              eq(schema.listingViews.listingId, listing.id),
              eq(schema.listingViews.viewerId, viewerId),
            )).get();

          if (!existing) {
            await db.insert(schema.listingViews).values({
              id: viewId, listingId: listing.id, viewerId, viewerIp: null, viewedAt: Date.now(),
            }).run();
            await db.update(schema.listings).set({
              viewCount: sql`${schema.listings.viewCount} + 1`,
            }).where(eq(schema.listings.id, listing.id)).run();
          }
        } else if (viewerIp) {
          const existing = await db.select({ id: schema.listingViews.id })
            .from(schema.listingViews)
            .where(and(
              eq(schema.listingViews.listingId, listing.id),
              eq(schema.listingViews.viewerIp, viewerIp),
            )).get();

          if (!existing) {
            await db.insert(schema.listingViews).values({
              id: viewId, listingId: listing.id, viewerId: null, viewerIp, viewedAt: Date.now(),
            }).run();
            await db.update(schema.listings).set({
              viewCount: sql`${schema.listings.viewCount} + 1`,
            }).where(eq(schema.listings.id, listing.id)).run();
          }
        }
      }
    } catch (viewErr) {
      console.error('View tracking error (non-fatal):', viewErr);
    }

    // Re-read to get updated viewCount
    const updated = await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id)).get();

    res.json({ ...parseListing(updated ?? listing), landlord, winner });
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
      startingBid, reservePrice, auctionEnd, tags, secureLeasePrice
    } = req.body;

    // Validate secure lease price if provided
    if (secureLeasePrice !== undefined && secureLeasePrice !== null) {
      if (typeof secureLeasePrice !== 'number' || secureLeasePrice <= startingBid) {
        res.status(400).json({ error: 'Secure lease price must be higher than the starting bid' });
        return;
      }
    }

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
      secureLeasePrice: secureLeasePrice ?? null,
      tags: JSON.stringify(tags || []),
      createdAt: new Date().toISOString(),
    }).run();

    // Compute RentCheck score (non-blocking)
    try {
      const uni = await db.select({ id: schema.universities.id })
        .from(schema.universities)
        .where(eq(schema.universities.name, nearestUniversity))
        .get();
      if (uni) {
        const marketRows = await db.select()
          .from(schema.universityMarketData)
          .where(eq(schema.universityMarketData.universityId, uni.id));
        if (marketRows.length > 0) {
          const fmrData = { fmr_0br: 0, fmr_1br: 0, fmr_2br: 0, fmr_3br: 0, fmr_4br: 0 };
          for (const row of marketRows) {
            if (row.bedroomCount === 0) fmrData.fmr_0br = row.medianRent ?? 0;
            else if (row.bedroomCount === 1) fmrData.fmr_1br = row.medianRent ?? 0;
            else if (row.bedroomCount === 2) fmrData.fmr_2br = row.medianRent ?? 0;
            else if (row.bedroomCount === 3) fmrData.fmr_3br = row.medianRent ?? 0;
            else if (row.bedroomCount === 4) fmrData.fmr_4br = row.medianRent ?? 0;
          }
          const rc = calculateRentCheck(startingBid, beds, fmrData);
          await db.update(schema.listings).set({
            pricePerBed: rc.pricePerBed,
            fmrForBeds: rc.fmrForBeds,
            rentcheckScore: rc.rentcheckScore,
            rentcheckLabel: rc.rentcheckLabel,
          }).where(eq(schema.listings.id, id)).run();
        }
      }
    } catch (rcErr) {
      console.error('RentCheck compute error (non-fatal):', rcErr);
    }

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

    // Secure lease price — only updatable if no bids yet
    if (req.body.secureLeasePrice !== undefined) {
      if (listing.bidCount > 0) {
        res.status(400).json({ error: 'Cannot change secure lease price after bidding has started' });
        return;
      }
      const slp = req.body.secureLeasePrice;
      if (slp === null) {
        updates.secureLeasePrice = null;
      } else if (typeof slp === 'number' && slp > (req.body.startingBid ?? listing.startingBid)) {
        updates.secureLeasePrice = slp;
      } else {
        res.status(400).json({ error: 'Secure lease price must be higher than the starting bid' });
        return;
      }
    }

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

    // Recompute RentCheck if price or beds changed (non-blocking)
    try {
      const current = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
      if (current) {
        const uni = await db.select({ id: schema.universities.id })
          .from(schema.universities)
          .where(eq(schema.universities.name, current.nearestUniversity))
          .get();
        if (uni) {
          const marketRows = await db.select()
            .from(schema.universityMarketData)
            .where(eq(schema.universityMarketData.universityId, uni.id));
          if (marketRows.length > 0) {
            const fmrData = { fmr_0br: 0, fmr_1br: 0, fmr_2br: 0, fmr_3br: 0, fmr_4br: 0 };
            for (const row of marketRows) {
              if (row.bedroomCount === 0) fmrData.fmr_0br = row.medianRent ?? 0;
              else if (row.bedroomCount === 1) fmrData.fmr_1br = row.medianRent ?? 0;
              else if (row.bedroomCount === 2) fmrData.fmr_2br = row.medianRent ?? 0;
              else if (row.bedroomCount === 3) fmrData.fmr_3br = row.medianRent ?? 0;
              else if (row.bedroomCount === 4) fmrData.fmr_4br = row.medianRent ?? 0;
            }
            const rc = calculateRentCheck(current.startingBid, current.beds, fmrData);
            await db.update(schema.listings).set({
              pricePerBed: rc.pricePerBed,
              fmrForBeds: rc.fmrForBeds,
              rentcheckScore: rc.rentcheckScore,
              rentcheckLabel: rc.rentcheckLabel,
            }).where(eq(schema.listings.id, current.id)).run();
          }
        }
      }
    } catch (rcErr) {
      console.error('RentCheck recompute error (non-fatal):', rcErr);
    }

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

// Get landlord's listings with winner details
router.get('/my/listings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const results = await db.select().from(schema.listings)
      .where(eq(schema.listings.landlordId, req.userId!))
      .orderBy(desc(schema.listings.createdAt));

    const enriched = [];
    for (const l of results) {
      let winner = null;
      if ((l.status === 'ended' || l.status === 'pending_landlord_confirmation') && l.winnerId) {
        winner = await db.select({
          id: schema.users.id, name: schema.users.name,
          email: schema.users.email, phone: schema.users.phone,
          university: schema.users.university,
        }).from(schema.users).where(eq(schema.users.id, l.winnerId)).get();
      }
      enriched.push({ ...parseListing(l), winner });
    }
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm offer — landlord accepts the top bidder
router.post('/:id/confirm-offer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (listing.landlordId !== req.userId) { res.status(403).json({ error: 'Not authorized' }); return; }
    if (listing.status !== 'pending_landlord_confirmation') {
      res.status(400).json({ error: 'Listing is not pending confirmation' });
      return;
    }

    const topBidUserId = listing.winnerId;
    if (!topBidUserId) {
      res.status(400).json({ error: 'No top bidder found' });
      return;
    }

    // Confirm — set status to ended (winner is already stored in winnerId)
    await db.update(schema.listings).set({ status: 'ended' }).where(eq(schema.listings.id, listing.id)).run();

    const winner = await db.select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users).where(eq(schema.users.id, topBidUserId)).get();
    const winnerName = winner?.name ?? 'Unknown';
    const winnerEmail = winner?.email ?? '';

    const now = new Date().toISOString();

    // Notify winner
    const winNotifId = crypto.randomUUID();
    await db.insert(schema.notifications).values({
      id: winNotifId, userId: topBidUserId, type: 'won',
      message: `The landlord has confirmed your offer for ${listing.address}! Expect to hear from them shortly to finalize the lease.`,
      listingId: listing.id, read: false, createdAt: now,
    }).run();

    // Send winner email
    const { winnerEmailHtml, landlordEmailHtml } = await import('../lib/email');
    if (winnerEmail) {
      const { sendEmail: send } = await import('../lib/email');
      send(winnerEmail, `The landlord confirmed your offer for ${listing.address}!`,
        winnerEmailHtml({ address: listing.address, amount: listing.currentBid, listingId: listing.id }),
      ).catch(err => console.error('Winner confirm email failed:', err));
    }

    // Notify losers
    const allBidders = await db.select({ userId: schema.bids.userId }).from(schema.bids).where(eq(schema.bids.listingId, listing.id));
    const loserIds = [...new Set(allBidders.map(b => b.userId))].filter(id => id !== topBidUserId);
    for (const loserId of loserIds) {
      const lostNotifId = crypto.randomUUID();
      await db.insert(schema.notifications).values({
        id: lostNotifId, userId: loserId, type: 'lost',
        message: `Auction ended for ${listing.address}. The landlord has selected another applicant. The final bid was $${listing.currentBid}/mo.`,
        listingId: listing.id, read: false, createdAt: now,
      }).run();
    }

    res.json({ success: true, message: 'Offer confirmed. Winner has been notified.' });
  } catch (error) {
    console.error('Confirm offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline and relist — landlord declines the top bidder
router.post('/:id/decline-relist', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, String(req.params.id))).get();
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (listing.landlordId !== req.userId) { res.status(403).json({ error: 'Not authorized' }); return; }
    if (listing.status !== 'pending_landlord_confirmation') {
      res.status(400).json({ error: 'Listing is not pending confirmation' });
      return;
    }

    const topBidUserId = listing.winnerId;

    // Reset listing to active with new 7-day auction end
    const newAuctionEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    await db.update(schema.listings).set({
      status: 'active',
      winnerId: null,
      auctionEnd: newAuctionEnd,
    }).where(eq(schema.listings.id, listing.id)).run();

    const now = new Date().toISOString();

    // Notify top bidder
    if (topBidUserId) {
      const declineNotifId = crypto.randomUUID();
      await db.insert(schema.notifications).values({
        id: declineNotifId, userId: topBidUserId, type: 'lost',
        message: `The landlord has decided not to proceed with your offer for ${listing.address} at this time. The listing has been relisted.`,
        listingId: listing.id, read: false, createdAt: now,
      }).run();

      // Send decline email to top bidder
      const bidder = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, topBidUserId)).get();
      if (bidder?.email) {
        const { sendEmail: send } = await import('../lib/email');
        send(bidder.email, `Update on ${listing.address}`,
          `<div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px;">Listing Update</h1>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">The landlord has decided not to proceed at this time for <strong>${listing.address}</strong>. The listing has been relisted with a new auction period. You can continue bidding if interested.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://houserush.vercel.app/listing/${listing.id}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">View Listing</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
          </div>`,
        ).catch(err => console.error('Decline email failed:', err));
      }
    }

    res.json({ success: true, message: 'Listing relisted with new 7-day auction.' });
  } catch (error) {
    console.error('Decline relist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
