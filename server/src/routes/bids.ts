import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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
router.get('/listing/:listingId', (req, res: Response) => {
  try {
    const bidsList = db.select({
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
      .orderBy(desc(schema.bids.amount))
      .all();

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
router.post('/listing/:listingId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const listingId = String(req.params.listingId);

    const listing = db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
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

    const bidId = uuidv4();
    const timestamp = new Date().toISOString();

    db.insert(schema.bids).values({
      id: bidId,
      listingId,
      userId: req.userId!,
      amount,
      isAutoBid: false,
      timestamp,
    }).run();

    // Update listing
    db.update(schema.listings).set({
      currentBid: amount,
      bidCount: listing.bidCount + 1,
    }).where(eq(schema.listings.id, listingId)).run();

    const bidder = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();

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
    const previousBidders = db.select({ userId: schema.bids.userId })
      .from(schema.bids)
      .where(and(
        eq(schema.bids.listingId, listingId),
      ))
      .all();

    const uniqueBidders = [...new Set(previousBidders.map(b => b.userId))].filter(id => id !== req.userId);

    for (const bidderId of uniqueBidders) {
      const notifId = uuidv4();
      db.insert(schema.notifications).values({
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
    processAutoBids(listingId, amount, req.userId!);

    res.status(201).json(bid);
  } catch (error) {
    console.error('Bid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function processAutoBids(listingId: string, currentAmount: number, excludeUserId: string) {
  const activeAutoBids = db.select()
    .from(schema.autoBids)
    .where(and(
      eq(schema.autoBids.listingId, listingId),
      eq(schema.autoBids.isActive, true),
    ))
    .all()
    .filter(ab => ab.userId !== excludeUserId && ab.maxAmount > currentAmount);

  if (activeAutoBids.length === 0) return;

  // Sort by max amount descending
  activeAutoBids.sort((a, b) => b.maxAmount - a.maxAmount);

  const topAutoBid = activeAutoBids[0];
  const newAmount = currentAmount + 25; // $25 increment

  if (newAmount > topAutoBid.maxAmount) return;

  const bidId = uuidv4();
  const timestamp = new Date().toISOString();

  db.insert(schema.bids).values({
    id: bidId,
    listingId,
    userId: topAutoBid.userId,
    amount: newAmount,
    isAutoBid: true,
    timestamp,
  }).run();

  const listing = db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
  db.update(schema.listings).set({
    currentBid: newAmount,
    bidCount: (listing?.bidCount || 0) + 1,
  }).where(eq(schema.listings.id, listingId)).run();

  if (io) {
    io.to(`listing:${listingId}`).emit('bid_update', {
      listingId,
      bid: { id: bidId, listingId, userId: topAutoBid.userId, amount: newAmount, isAutoBid: true, timestamp },
      currentBid: newAmount,
      bidCount: (listing?.bidCount || 0) + 1,
    });
  }
}

// Set auto-bid
router.post('/auto/:listingId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { maxAmount } = req.body;
    const listingId = String(req.params.listingId);

    // Deactivate existing auto-bid
    db.update(schema.autoBids).set({ isActive: false })
      .where(and(
        eq(schema.autoBids.listingId, listingId),
        eq(schema.autoBids.userId, req.userId!),
      )).run();

    const id = uuidv4();
    db.insert(schema.autoBids).values({
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
router.get('/my/bids', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userBids = db.select({
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
    })
      .from(schema.bids)
      .leftJoin(schema.listings, eq(schema.bids.listingId, schema.listings.id))
      .where(eq(schema.bids.userId, req.userId!))
      .orderBy(desc(schema.bids.timestamp))
      .all();

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
