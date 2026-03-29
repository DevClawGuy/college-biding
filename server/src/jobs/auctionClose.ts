import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, lt, desc } from 'drizzle-orm';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function setAuctionSocket(socketIo: SocketServer) {
  io = socketIo;
}

export async function checkExpiredAuctions() {
  try {
    const now = new Date().toISOString();

    // Find all active listings whose auction has ended
    const expired = await db.select()
      .from(schema.listings)
      .where(and(
        eq(schema.listings.status, 'active'),
        lt(schema.listings.auctionEnd, now),
      ));

    if (expired.length === 0) return;

    console.log(`Auction close: found ${expired.length} expired auction(s)`);

    for (const listing of expired) {
      try {
        // Find highest bid
        const topBid = await db.select({
          id: schema.bids.id,
          userId: schema.bids.userId,
          amount: schema.bids.amount,
        })
          .from(schema.bids)
          .where(eq(schema.bids.listingId, listing.id))
          .orderBy(desc(schema.bids.amount))
          .get();

        if (topBid) {
          // We have a winner
          await db.update(schema.listings).set({
            status: 'ended',
            winnerId: topBid.userId,
          }).where(eq(schema.listings.id, listing.id)).run();

          // Get winner details
          const winner = await db.select({
            name: schema.users.name,
            email: schema.users.email,
          }).from(schema.users).where(eq(schema.users.id, topBid.userId)).get();

          const winnerName = winner?.name ?? 'Unknown';
          const winnerEmail = winner?.email ?? '';

          // Notify the winner
          const winNotifId = crypto.randomUUID();
          await db.insert(schema.notifications).values({
            id: winNotifId,
            userId: topBid.userId,
            type: 'won',
            message: `You won the auction for ${listing.address}! Your agent will contact you shortly to finalize the lease.`,
            listingId: listing.id,
            read: false,
            createdAt: now,
          }).run();

          if (io) {
            io.to(`user:${topBid.userId}`).emit('notification', {
              id: winNotifId, userId: topBid.userId, type: 'won',
              message: `You won the auction for ${listing.address}! Your agent will contact you shortly to finalize the lease.`,
              listingId: listing.id, read: false, createdAt: now,
            });
          }

          // Notify the landlord
          const landlordNotifId = crypto.randomUUID();
          await db.insert(schema.notifications).values({
            id: landlordNotifId,
            userId: listing.landlordId,
            type: 'won',
            message: `Auction closed for ${listing.address}. Winning bid: $${topBid.amount}/mo. Winner: ${winnerName} (${winnerEmail}). Please reach out to finalize the lease.`,
            listingId: listing.id,
            read: false,
            createdAt: now,
          }).run();

          if (io) {
            io.to(`user:${listing.landlordId}`).emit('notification', {
              id: landlordNotifId, userId: listing.landlordId, type: 'won',
              message: `Auction closed for ${listing.address}. Winning bid: $${topBid.amount}/mo. Winner: ${winnerName} (${winnerEmail}). Please reach out to finalize the lease.`,
              listingId: listing.id, read: false, createdAt: now,
            });
          }

          // Notify all other bidders they lost
          const allBidders = await db.select({ userId: schema.bids.userId })
            .from(schema.bids)
            .where(eq(schema.bids.listingId, listing.id));

          const loserIds = [...new Set(allBidders.map(b => b.userId))].filter(id => id !== topBid.userId);
          for (const loserId of loserIds) {
            const lostNotifId = crypto.randomUUID();
            await db.insert(schema.notifications).values({
              id: lostNotifId,
              userId: loserId,
              type: 'lost',
              message: `Auction ended for ${listing.address}. Unfortunately, you were outbid. The winning bid was $${topBid.amount}/mo.`,
              listingId: listing.id,
              read: false,
              createdAt: now,
            }).run();

            if (io) {
              io.to(`user:${loserId}`).emit('notification', {
                id: lostNotifId, userId: loserId, type: 'lost',
                message: `Auction ended for ${listing.address}. Unfortunately, you were outbid.`,
                listingId: listing.id, read: false, createdAt: now,
              });
            }
          }

          // Emit auction closed to listing room
          if (io) {
            io.to(`listing:${listing.id}`).emit('auction_ended', {
              listingId: listing.id,
              winnerId: topBid.userId,
              winningBid: topBid.amount,
              winnerName,
            });
          }

          console.log(`  Auction closed: "${listing.title}" — winner: ${winnerName} at $${topBid.amount}/mo`);
        } else {
          // No bids — just close it
          await db.update(schema.listings).set({
            status: 'ended',
          }).where(eq(schema.listings.id, listing.id)).run();

          // Notify landlord
          const notifId = crypto.randomUUID();
          await db.insert(schema.notifications).values({
            id: notifId,
            userId: listing.landlordId,
            type: 'lost',
            message: `Auction ended for ${listing.address} with no bids.`,
            listingId: listing.id,
            read: false,
            createdAt: now,
          }).run();

          if (io) {
            io.to(`listing:${listing.id}`).emit('auction_ended', {
              listingId: listing.id, winnerId: null, winningBid: null, winnerName: null,
            });
          }

          console.log(`  Auction closed: "${listing.title}" — no bids`);
        }
      } catch (err) {
        console.error(`  Error closing auction "${listing.title}":`, err);
      }
    }
  } catch (err) {
    console.error('checkExpiredAuctions error:', err);
  }
}

export function startAuctionCloseJob() {
  console.log('Auction close job: started (every 60s)');
  // Run once immediately
  checkExpiredAuctions();
  // Then every 60 seconds
  setInterval(checkExpiredAuctions, 60_000);
}
