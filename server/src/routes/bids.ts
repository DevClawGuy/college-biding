import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function setBidSocket(socketIo: SocketServer) {
  io = socketIo;
}

const router = Router();

// Get bids for a listing
router.get('/listing/:listingId', async (req, res: Response) => {
  try {
    const bidsList = await db.select({
      id: schema.bids.id,
      listingId: schema.bids.listingId,
      userId: schema.bids.userId,
      amount: schema.bids.amount,
      isAutoBid: schema.bids.isAutoBid,
      timestamp: schema.bids.timestamp,
      userName: schema.users.name,
      userUniversity: schema.users.university,
    })
      .from(schema.bids)
      .leftJoin(schema.users, eq(schema.bids.userId, schema.users.id))
      .where(eq(schema.bids.listingId, String(req.params.listingId)))
      .orderBy(desc(schema.bids.amount));

    // Anonymize - show university but not full name
    const anonymized = bidsList.map((b, i) => ({
      ...b,
      userName: `Bidder ${i + 1}`,
    }));

    res.json(anonymized);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Place a bid
router.post('/listing/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const listingId = String(req.params.listingId);

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.status !== 'active') {
      res.status(400).json({ error: 'Auction has ended' });
      return;
    }

    if (new Date(listing.auctionEnd) < new Date()) {
      res.status(400).json({ error: 'Auction has ended' });
      return;
    }

    if (listing.landlordId === req.userId) {
      res.status(400).json({ error: 'Cannot bid on your own listing' });
      return;
    }

    if (amount <= listing.currentBid) {
      res.status(400).json({ error: `Bid must be higher than current bid of $${listing.currentBid}` });
      return;
    }

    const bidId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await db.insert(schema.bids).values({
      id: bidId,
      listingId,
      userId: req.userId!,
      amount,
      isAutoBid: false,
      timestamp,
    }).run();

    // Update listing
    await db.update(schema.listings).set({
      currentBid: amount,
      bidCount: listing.bidCount + 1,
    }).where(eq(schema.listings.id, listingId)).run();

    const bidder = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();

    const bid = {
      id: bidId,
      listingId,
      userId: req.userId!,
      amount,
      isAutoBid: false,
      timestamp,
      userName: bidder?.name || 'Anonymous',
      userUniversity: bidder?.university || '',
    };

    // Notify via socket
    if (io) {
      io.to(`listing:${listingId}`).emit('bid_update', {
        listingId,
        bid,
        currentBid: amount,
        bidCount: listing.bidCount + 1,
      });
    }

    // Create outbid notifications for previous bidders
    const previousBidders = await db.select({ userId: schema.bids.userId })
      .from(schema.bids)
      .where(eq(schema.bids.listingId, listingId));

    const uniqueBidders = [...new Set(previousBidders.map(b => b.userId))].filter(id => id !== req.userId);

    for (const bidderId of uniqueBidders) {
      const notifId = crypto.randomUUID();
      await db.insert(schema.notifications).values({
        id: notifId,
        userId: bidderId,
        type: 'outbid',
        message: `You've been outbid on "${listing.title}". New bid: $${amount}`,
        listingId,
        read: false,
        createdAt: new Date().toISOString(),
      }).run();

      if (io) {
        io.to(`user:${bidderId}`).emit('notification', {
          id: notifId,
          userId: bidderId,
          type: 'outbid',
          message: `You've been outbid on "${listing.title}". New bid: $${amount}`,
          listingId,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Process auto-bids
    await processAutoBids(listingId, amount, req.userId!);

    res.status(201).json(bid);
  } catch (error) {
    console.error('Bid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function processAutoBids(listingId: string, initialAmount: number, excludeUserId: string) {
  const MAX_ROUNDS = 20;
  let currentAmount = initialAmount;
  let lastBidderId = excludeUserId;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      // Get all active auto-bids for this listing except the last bidder
      const allAutoBids = await db.select()
        .from(schema.autoBids)
        .where(and(
          eq(schema.autoBids.listingId, listingId),
          eq(schema.autoBids.isActive, true),
        ));

      const eligible = allAutoBids
        .filter(ab => ab.userId !== lastBidderId && ab.maxAmount > currentAmount)
        .sort((a, b) => b.maxAmount - a.maxAmount);

      if (eligible.length === 0) break;

      const topAutoBid = eligible[0];
      const newAmount = currentAmount + 25;

      if (newAmount > topAutoBid.maxAmount) {
        // Deactivate this auto-bid — it's exhausted
        await db.update(schema.autoBids).set({ isActive: false })
          .where(eq(schema.autoBids.id, topAutoBid.id)).run();
        break;
      }

      // Place the auto-bid
      const bidId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      await db.insert(schema.bids).values({
        id: bidId,
        listingId,
        userId: topAutoBid.userId,
        amount: newAmount,
        isAutoBid: true,
        timestamp,
      }).run();

      // Update listing
      const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
      const newBidCount = (listing?.bidCount || 0) + 1;
      await db.update(schema.listings).set({
        currentBid: newAmount,
        bidCount: newBidCount,
      }).where(eq(schema.listings.id, listingId)).run();

      // Emit socket event for real-time update
      if (io) {
        io.to(`listing:${listingId}`).emit('bid_update', {
          listingId,
          bid: { id: bidId, listingId, userId: topAutoBid.userId, amount: newAmount, isAutoBid: true, timestamp },
          currentBid: newAmount,
          bidCount: newBidCount,
        });
      }

      // Create outbid notification for the person who was just outbid
      const outbidNotifId = crypto.randomUUID();
      await db.insert(schema.notifications).values({
        id: outbidNotifId,
        userId: lastBidderId,
        type: 'outbid',
        message: `You've been outbid on "${listing?.title ?? 'a listing'}". Auto-bid placed: $${newAmount}/mo`,
        listingId,
        read: false,
        createdAt: timestamp,
      }).run();

      if (io) {
        io.to(`user:${lastBidderId}`).emit('notification', {
          id: outbidNotifId, userId: lastBidderId, type: 'outbid',
          message: `You've been outbid on "${listing?.title ?? 'a listing'}". Auto-bid placed: $${newAmount}/mo`,
          listingId, read: false, createdAt: timestamp,
        });
      }

      // Set up for next round
      currentAmount = newAmount;
      lastBidderId = topAutoBid.userId;

      console.log(`  Auto-bid round ${round + 1}: user ${topAutoBid.userId} bid $${newAmount} on ${listingId}`);
    }
  } catch (error) {
    console.error('processAutoBids error:', error);
  }
}

// Set auto-bid
router.post('/auto/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { maxAmount } = req.body;
    const listingId = String(req.params.listingId);

    // Deactivate existing auto-bid
    await db.update(schema.autoBids).set({ isActive: false })
      .where(and(
        eq(schema.autoBids.listingId, listingId),
        eq(schema.autoBids.userId, req.userId!),
      )).run();

    const id = crypto.randomUUID();
    await db.insert(schema.autoBids).values({
      id,
      listingId,
      userId: req.userId!,
      maxAmount,
      isActive: true,
    }).run();

    res.status(201).json({ id, listingId, userId: req.userId, maxAmount, isActive: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's bids
router.get('/my/bids', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userBids = await db.select({
      id: schema.bids.id,
      listingId: schema.bids.listingId,
      amount: schema.bids.amount,
      isAutoBid: schema.bids.isAutoBid,
      timestamp: schema.bids.timestamp,
      listingTitle: schema.listings.title,
      listingPhoto: schema.listings.photos,
      currentBid: schema.listings.currentBid,
      auctionEnd: schema.listings.auctionEnd,
      listingStatus: schema.listings.status,
      winnerId: schema.listings.winnerId,
    })
      .from(schema.bids)
      .leftJoin(schema.listings, eq(schema.bids.listingId, schema.listings.id))
      .where(eq(schema.bids.userId, req.userId!))
      .orderBy(desc(schema.bids.timestamp));

    // Get unique listings with latest bid per listing
    const latestByListing = new Map<string, typeof userBids[0]>();
    for (const bid of userBids) {
      if (!latestByListing.has(bid.listingId)) {
        latestByListing.set(bid.listingId, bid);
      }
    }

    res.json(Array.from(latestByListing.values()));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
