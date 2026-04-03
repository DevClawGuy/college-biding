import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, lt, desc } from 'drizzle-orm';
import { Server as SocketServer } from 'socket.io';
import { sendEmail } from '../lib/email';

let io: SocketServer | null = null;

export function setAuctionSocket(socketIo: SocketServer) {
  io = socketIo;
}

// TODO: landlord confirmation timeout — if landlord does not confirm within 48 hours, auto-send reminder email

function pendingConfirmationEmailHtml(opts: { address: string; bidderName: string; amount: number; listingId: string }): string {
  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 48px;">&#9200;</span>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 16px 0 8px;">Your Auction Has Closed</h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">A decision is needed from you.</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Property</p>
        <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #0f172a;">${opts.address}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Top Bidder</p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">${opts.bidderName}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Bid Amount</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #4f46e5;">$${opts.amount.toLocaleString()}/mo</p>
      </div>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        This is a <strong>non-binding offer</strong>. You retain full discretion to accept or decline. Please log in to your dashboard to confirm or decline this offer.
      </p>
      <div style="text-align: center;">
        <a href="https://houserush.vercel.app/dashboard?tab=listings" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">Review on Dashboard</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
    </div>
  `;
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
          // Has bids — move to pending_landlord_confirmation instead of auto-declaring winner
          await db.update(schema.listings).set({
            status: 'pending_landlord_confirmation',
            winnerId: topBid.userId, // store top bidder for reference, not yet confirmed
          }).where(eq(schema.listings.id, listing.id)).run();

          // Get bidder details
          const bidder = await db.select({
            name: schema.users.name,
            email: schema.users.email,
          }).from(schema.users).where(eq(schema.users.id, topBid.userId)).get();

          const bidderName = bidder?.name ?? 'Unknown';

          // Notify the landlord — they must confirm or decline
          const landlordNotifId = crypto.randomUUID();
          await db.insert(schema.notifications).values({
            id: landlordNotifId,
            userId: listing.landlordId,
            type: 'won',
            message: `Auction closed for ${listing.address}. Top bid: $${topBid.amount}/mo by ${bidderName}. Please confirm or decline on your dashboard.`,
            listingId: listing.id,
            read: false,
            createdAt: now,
          }).run();

          if (io) {
            io.to(`user:${listing.landlordId}`).emit('notification', {
              id: landlordNotifId, userId: listing.landlordId, type: 'won',
              message: `Auction closed for ${listing.address}. Top bid: $${topBid.amount}/mo by ${bidderName}. Please confirm or decline.`,
              listingId: listing.id, read: false, createdAt: now,
            });

            io.to(`listing:${listing.id}`).emit('auction_pending_confirmation', {
              listingId: listing.id,
              topBidderId: topBid.userId,
              topBidAmount: topBid.amount,
            });
          }

          // Send email to landlord
          const landlord = await db.select({ email: schema.users.email })
            .from(schema.users).where(eq(schema.users.id, listing.landlordId)).get();
          if (landlord?.email) {
            sendEmail(
              landlord.email,
              `Auction closed: ${listing.address} — Your confirmation needed`,
              pendingConfirmationEmailHtml({ address: listing.address, bidderName, amount: topBid.amount, listingId: listing.id }),
            ).catch(err => console.error('Landlord pending email failed:', err));
          }

          // Notify top bidder that auction closed and is pending landlord review
          const bidderNotifId = crypto.randomUUID();
          await db.insert(schema.notifications).values({
            id: bidderNotifId,
            userId: topBid.userId,
            type: 'auction_ending',
            message: `Auction closed for ${listing.address}. Your bid of $${topBid.amount}/mo is the highest. The landlord is reviewing your offer.`,
            listingId: listing.id,
            read: false,
            createdAt: now,
          }).run();

          if (io) {
            io.to(`user:${topBid.userId}`).emit('notification', {
              id: bidderNotifId, userId: topBid.userId, type: 'auction_ending',
              message: `Auction closed for ${listing.address}. Your bid is the highest — awaiting landlord confirmation.`,
              listingId: listing.id, read: false, createdAt: now,
            });
          }

          console.log(`  Auction pending confirmation: "${listing.title}" — top bidder: ${bidderName} at $${topBid.amount}/mo`);
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
