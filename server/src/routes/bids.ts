import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, desc, gte, lt, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';
import { sendEmail, winnerEmailHtml, landlordEmailHtml } from '../lib/email';

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
      isSecureLease: schema.bids.isSecureLease,
      groupId: schema.bids.groupId,
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

    // Block landlords from bidding
    const currentUser = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (currentUser?.role === 'landlord') {
      res.status(403).json({ error: 'Landlords cannot place bids on listings.' });
      return;
    }

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

    // Block bidding on own listing
    if (listing.landlordId === req.userId) {
      res.status(403).json({ error: 'You cannot bid on your own listing.' });
      return;
    }

    // Enforce minimum bid increment ($25)
    const minBid = listing.currentBid + 25;
    if (amount < minBid) {
      res.status(400).json({ error: `Bid must be at least $${minBid}/mo` });
      return;
    }

    // Rate limit: max 3 bids per user per listing in 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const recentBids = await db.select({ id: schema.bids.id })
      .from(schema.bids)
      .where(and(
        eq(schema.bids.listingId, listingId),
        eq(schema.bids.userId, req.userId!),
        gte(schema.bids.timestamp, oneMinuteAgo),
      ));
    if (recentBids.length >= 3) {
      res.status(429).json({ error: 'Too many bids. Please wait before bidding again.' });
      return;
    }

    const bidId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Atomic update: only succeeds if current_bid hasn't changed since we read it
    // This prevents two simultaneous bids from both passing validation
    const updateResult = await db.update(schema.listings).set({
      currentBid: amount,
      bidCount: sql`${schema.listings.bidCount} + 1`,
    }).where(
      and(
        eq(schema.listings.id, listingId),
        lt(schema.listings.currentBid, amount),
      )
    ).run();

    // If 0 rows affected, another bid was placed first
    if (updateResult.rowsAffected === 0) {
      res.status(409).json({ error: 'Another bid was placed first. Please refresh and try again.' });
      return;
    }

    // Insert the bid record (listing is already updated atomically)
    await db.insert(schema.bids).values({
      id: bidId,
      listingId,
      userId: req.userId!,
      amount,
      isAutoBid: false,
      timestamp,
    }).run();

    // Anti-snipe: extend auction by 5 minutes if ending within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    const auctionEnd = new Date(listing.auctionEnd).getTime();
    const now = Date.now();
    let newAuctionEnd: string | null = null;
    if (auctionEnd - now < fiveMinutes && auctionEnd > now) {
      newAuctionEnd = new Date(auctionEnd + fiveMinutes).toISOString();
      await db.update(schema.listings).set({ auctionEnd: newAuctionEnd }).where(eq(schema.listings.id, listingId)).run();
      console.log(`Anti-snipe: extending auction ${listingId} to ${newAuctionEnd}`);
    }

    // Re-read listing to get accurate bidCount after atomic update
    const updatedListing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    const newBidCount = updatedListing?.bidCount ?? (listing.bidCount + 1);

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
        bidCount: newBidCount,
      });

      // Emit auction extension event
      if (newAuctionEnd) {
        io.to(`listing:${listingId}`).emit('auction_extended', {
          listingId,
          newAuctionEnd,
        });
      }
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

      // TODO: consider moving auto-bid to a queue for high traffic
      // Atomic update: only succeeds if current_bid hasn't changed (matches manual bid pattern)
      const autoBidUpdate = await db.update(schema.listings).set({
        currentBid: newAmount,
        bidCount: sql`${schema.listings.bidCount} + 1`,
      }).where(
        and(
          eq(schema.listings.id, listingId),
          lt(schema.listings.currentBid, newAmount),
        )
      ).run();

      if (autoBidUpdate.rowsAffected === 0) {
        // Another bid was placed concurrently — stop auto-bid loop
        break;
      }

      await db.insert(schema.bids).values({
        id: bidId,
        listingId,
        userId: topAutoBid.userId,
        amount: newAmount,
        isAutoBid: true,
        timestamp,
      }).run();

      // Re-read listing to get accurate bidCount after atomic update
      const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
      const newBidCount = listing?.bidCount ?? (currentAmount + 1);

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

// Secure Lease Now — skip auction by paying the fixed bypass price
router.post('/secure-lease/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listingId = String(req.params.listingId);

    // Verify student role
    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role === 'landlord') {
      res.status(403).json({ error: 'Only students can secure a lease' });
      return;
    }

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.status !== 'active') {
      res.status(400).json({ error: 'Auction has already ended' });
      return;
    }

    if (new Date(listing.auctionEnd) < new Date()) {
      res.status(400).json({ error: 'Auction has already ended' });
      return;
    }

    if (!listing.secureLeasePrice) {
      res.status(400).json({ error: 'This listing does not offer Secure Lease Now' });
      return;
    }

    if (listing.landlordId === req.userId) {
      res.status(403).json({ error: 'You cannot secure your own listing' });
      return;
    }

    // Atomically end the auction and set the winner
    const updateResult = await db.update(schema.listings).set({
      currentBid: listing.secureLeasePrice,
      status: 'ended',
      winnerId: req.userId!,
      bidCount: sql`${schema.listings.bidCount} + 1`,
    }).where(
      and(
        eq(schema.listings.id, listingId),
        eq(schema.listings.status, 'active'),
      )
    ).run();

    if (updateResult.rowsAffected === 0) {
      res.status(409).json({ error: 'Auction was already ended or another action occurred. Please refresh.' });
      return;
    }

    // Insert the secure lease bid record
    const bidId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await db.insert(schema.bids).values({
      id: bidId,
      listingId,
      userId: req.userId!,
      amount: listing.secureLeasePrice,
      isAutoBid: false,
      isSecureLease: true,
      timestamp,
    }).run();

    // Winner notification
    const winNotifId = crypto.randomUUID();
    await db.insert(schema.notifications).values({
      id: winNotifId,
      userId: req.userId!,
      type: 'won',
      message: `You secured the lease for ${listing.address} at $${listing.secureLeasePrice}/mo! Your agent will contact you shortly.`,
      listingId,
      read: false,
      createdAt: timestamp,
    }).run();

    if (io) {
      io.to(`user:${req.userId}`).emit('notification', {
        id: winNotifId, userId: req.userId, type: 'won',
        message: `You secured the lease for ${listing.address} at $${listing.secureLeasePrice}/mo!`,
        listingId, read: false, createdAt: timestamp,
      });
    }

    // Landlord notification
    const landlordNotifId = crypto.randomUUID();
    await db.insert(schema.notifications).values({
      id: landlordNotifId,
      userId: listing.landlordId,
      type: 'won',
      message: `Lease secured for ${listing.address}! ${user.name} (${user.email}) locked in at $${listing.secureLeasePrice}/mo. Please reach out to finalize.`,
      listingId,
      read: false,
      createdAt: timestamp,
    }).run();

    if (io) {
      io.to(`user:${listing.landlordId}`).emit('notification', {
        id: landlordNotifId, userId: listing.landlordId, type: 'won',
        message: `Lease secured for ${listing.address}! ${user.name} locked in at $${listing.secureLeasePrice}/mo.`,
        listingId, read: false, createdAt: timestamp,
      });
    }

    // Notify all other bidders they lost
    const allBidders = await db.select({ userId: schema.bids.userId })
      .from(schema.bids)
      .where(eq(schema.bids.listingId, listingId));
    const loserIds = [...new Set(allBidders.map(b => b.userId))].filter(id => id !== req.userId);
    for (const loserId of loserIds) {
      const lostNotifId = crypto.randomUUID();
      await db.insert(schema.notifications).values({
        id: lostNotifId, userId: loserId, type: 'lost',
        message: `Auction ended for ${listing.address}. A student secured the lease early at $${listing.secureLeasePrice}/mo.`,
        listingId, read: false, createdAt: timestamp,
      }).run();
      if (io) {
        io.to(`user:${loserId}`).emit('notification', {
          id: lostNotifId, userId: loserId, type: 'lost',
          message: `Auction ended for ${listing.address}. A student secured the lease early.`,
          listingId, read: false, createdAt: timestamp,
        });
      }
    }

    // Socket events
    if (io) {
      io.to(`listing:${listingId}`).emit('bid_update', {
        listingId,
        bid: { id: bidId, listingId, userId: req.userId, amount: listing.secureLeasePrice, isAutoBid: false, isSecureLease: true, timestamp },
        currentBid: listing.secureLeasePrice,
        bidCount: (listing.bidCount ?? 0) + 1,
      });
      io.to(`listing:${listingId}`).emit('auction_ended', {
        listingId,
        winnerId: req.userId,
        winningBid: listing.secureLeasePrice,
        winnerName: user.name,
      });
    }

    // Send emails
    sendEmail(
      user.email,
      `You secured the lease for ${listing.address}!`,
      winnerEmailHtml({ address: listing.address, amount: listing.secureLeasePrice, listingId }),
    ).catch(err => console.error('Secure lease winner email failed:', err));

    const landlord = await db.select({ email: schema.users.email })
      .from(schema.users).where(eq(schema.users.id, listing.landlordId)).get();
    if (landlord?.email) {
      sendEmail(
        landlord.email,
        `Lease secured: ${listing.address} — Winner details inside`,
        landlordEmailHtml({ address: listing.address, amount: listing.secureLeasePrice, winnerName: user.name, winnerEmail: user.email, listingId }),
      ).catch(err => console.error('Secure lease landlord email failed:', err));
    }

    // TODO: deactivate all auto-bids for this listing when secure lease is used
    console.log(`Secure Lease: "${listing.title}" — ${user.name} at $${listing.secureLeasePrice}/mo`);

    res.json({ success: true, message: 'Lease secured!' });
  } catch (error) {
    console.error('Secure lease error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
      isSecureLease: schema.bids.isSecureLease,
      groupId: schema.bids.groupId,
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
