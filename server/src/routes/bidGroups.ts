import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, lt, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';
import { sendEmail } from '../lib/email';

let io: SocketServer;

export function setGroupBidSocket(socketIo: SocketServer) {
  io = socketIo;
}

const router = Router();

const MAX_GROUP_SIZE = 6;

function groupInviteEmailHtml(opts: { leaderName: string; groupName: string; address: string; listingId: string; groupId: string }): string {
  const joinUrl = `https://houserush.vercel.app/listing/${opts.listingId}?join_group=${opts.groupId}`;
  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 48px;">&#128101;</span>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 16px 0 8px;">You're Invited to a Group Bid!</h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">${opts.leaderName} wants you to join "${opts.groupName}"</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Property</p>
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0f172a;">${opts.address}</p>
      </div>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        ${opts.leaderName} has invited you to join their group bid for this property on HouseRush. Click below to join the group and bid together as roommates.
      </p>
      <div style="text-align: center;">
        <a href="${joinUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">Join Group</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
    </div>
  `;
}

// Create a group bid
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { listingId, name, memberEmails } = req.body;

    if (!listingId || !name || !Array.isArray(memberEmails)) {
      res.status(400).json({ error: 'listingId, name, and memberEmails are required' });
      return;
    }

    // Verify student role
    const leader = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!leader || leader.role !== 'student') {
      res.status(403).json({ error: 'Only students can create group bids' });
      return;
    }

    // Validate listing exists and is active
    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.status !== 'active') {
      res.status(400).json({ error: 'Auction has ended' });
      return;
    }
    if (listing.landlordId === req.userId) {
      res.status(403).json({ error: 'You cannot create a group bid on your own listing' });
      return;
    }

    // Validate group size (leader + members <= MAX_GROUP_SIZE)
    const emails = memberEmails.filter((e: string) => typeof e === 'string' && e.trim().length > 0).map((e: string) => e.trim().toLowerCase());
    if (emails.length + 1 > MAX_GROUP_SIZE) {
      res.status(400).json({ error: `Group cannot exceed ${MAX_GROUP_SIZE} members (including you)` });
      return;
    }

    // Check if user already has a group for this listing
    const existingGroups = await db.select().from(schema.bidGroups)
      .where(and(eq(schema.bidGroups.listingId, listingId), eq(schema.bidGroups.leaderId, req.userId!), eq(schema.bidGroups.status, 'active')));
    if (existingGroups.length > 0) {
      res.status(409).json({ error: 'You already have an active group for this listing' });
      return;
    }

    // Also check if user is already a member of another group for this listing
    const existingMemberships = await db.select({ groupId: schema.bidGroupMembers.groupId })
      .from(schema.bidGroupMembers)
      .innerJoin(schema.bidGroups, eq(schema.bidGroupMembers.groupId, schema.bidGroups.id))
      .where(and(
        eq(schema.bidGroupMembers.userId, req.userId!),
        eq(schema.bidGroups.listingId, listingId),
        eq(schema.bidGroups.status, 'active'),
      ));
    if (existingMemberships.length > 0) {
      res.status(409).json({ error: 'You are already in a group for this listing' });
      return;
    }

    const groupId = crypto.randomUUID();
    const now = Date.now();

    // Create group
    await db.insert(schema.bidGroups).values({
      id: groupId,
      listingId,
      leaderId: req.userId!,
      name,
      status: 'active',
      createdAt: now,
    }).run();

    // Add leader as accepted member
    const leaderMemberId = crypto.randomUUID();
    await db.insert(schema.bidGroupMembers).values({
      id: leaderMemberId,
      groupId,
      userId: req.userId!,
      email: leader.email,
      name: leader.name,
      status: 'accepted',
      invitedAt: now,
      joinedAt: now,
    }).run();

    // Add invited members
    const members: { id: string; email: string; name: string | null; status: string; userId: string | null }[] = [
      { id: leaderMemberId, email: leader.email, name: leader.name, status: 'accepted', userId: req.userId! },
    ];

    for (const email of emails) {
      if (email === leader.email.toLowerCase()) continue; // Skip self

      const memberId = crypto.randomUUID();
      // Check if user exists
      const existingUser = await db.select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users).where(eq(schema.users.email, email)).get();

      await db.insert(schema.bidGroupMembers).values({
        id: memberId,
        groupId,
        userId: existingUser?.id ?? null,
        email,
        name: existingUser?.name ?? null,
        status: 'pending',
        invitedAt: now,
      }).run();

      members.push({ id: memberId, email, name: existingUser?.name ?? null, status: 'pending', userId: existingUser?.id ?? null });

      // Send invitation email
      // TODO: handle email delivery failures gracefully with retry
      sendEmail(
        email,
        `${leader.name} invited you to bid on a property on HouseRush`,
        groupInviteEmailHtml({
          leaderName: leader.name,
          groupName: name,
          address: listing.address,
          listingId,
          groupId,
        }),
      ).catch(err => console.error(`Group invite email failed for ${email}:`, err));
    }

    console.log(`Group created: "${name}" (${groupId}) for listing ${listingId} by ${leader.name}`);
    res.status(201).json({ groupId, name, listingId, members });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's group for a listing
router.get('/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listingId = String(req.params.listingId);

    // Find groups where user is a member (via bidGroupMembers)
    const memberRows = await db.select({
      groupId: schema.bidGroupMembers.groupId,
    })
      .from(schema.bidGroupMembers)
      .innerJoin(schema.bidGroups, eq(schema.bidGroupMembers.groupId, schema.bidGroups.id))
      .where(and(
        eq(schema.bidGroupMembers.userId, req.userId!),
        eq(schema.bidGroups.listingId, listingId),
        eq(schema.bidGroups.status, 'active'),
      ));

    if (memberRows.length === 0) {
      // Also check by email
      const user = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, req.userId!)).get();
      if (user) {
        const emailRows = await db.select({ groupId: schema.bidGroupMembers.groupId })
          .from(schema.bidGroupMembers)
          .innerJoin(schema.bidGroups, eq(schema.bidGroupMembers.groupId, schema.bidGroups.id))
          .where(and(
            eq(schema.bidGroupMembers.email, user.email),
            eq(schema.bidGroups.listingId, listingId),
            eq(schema.bidGroups.status, 'active'),
          ));
        if (emailRows.length === 0) {
          res.json(null);
          return;
        }
        // Found by email — use that group
        memberRows.push(emailRows[0]);
      } else {
        res.json(null);
        return;
      }
    }

    const groupId = memberRows[0].groupId;
    const group = await db.select().from(schema.bidGroups).where(eq(schema.bidGroups.id, groupId)).get();
    if (!group) {
      res.json(null);
      return;
    }

    const allMembers = await db.select().from(schema.bidGroupMembers).where(eq(schema.bidGroupMembers.groupId, groupId));

    // Get leader name
    const leaderUser = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, group.leaderId)).get();

    res.json({
      ...group,
      leaderName: leaderUser?.name ?? 'Unknown',
      members: allMembers,
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a group (accept invitation)
router.post('/:groupId/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = String(req.params.groupId);

    const group = await db.select().from(schema.bidGroups).where(eq(schema.bidGroups.id, groupId)).get();
    if (!group || group.status !== 'active') {
      res.status(404).json({ error: 'Group not found or no longer active' });
      return;
    }

    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Find the member record by email or userId
    const member = await db.select().from(schema.bidGroupMembers)
      .where(and(
        eq(schema.bidGroupMembers.groupId, groupId),
        eq(schema.bidGroupMembers.email, user.email),
      )).get();

    if (!member) {
      res.status(403).json({ error: 'You were not invited to this group' });
      return;
    }

    if (member.status === 'accepted') {
      res.json({ success: true, message: 'Already a member' });
      return;
    }

    // Update member record
    await db.update(schema.bidGroupMembers).set({
      status: 'accepted',
      userId: req.userId!,
      name: user.name,
      joinedAt: Date.now(),
    }).where(eq(schema.bidGroupMembers.id, member.id)).run();

    // Fetch updated group
    const allMembers = await db.select().from(schema.bidGroupMembers).where(eq(schema.bidGroupMembers.groupId, groupId));
    const leaderUser = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, group.leaderId)).get();

    console.log(`Group join: ${user.name} joined "${group.name}" (${groupId})`);
    res.json({ ...group, leaderName: leaderUser?.name ?? 'Unknown', members: allMembers });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave a group
router.delete('/:groupId/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = String(req.params.groupId);

    const group = await db.select().from(schema.bidGroups).where(eq(schema.bidGroups.id, groupId)).get();
    if (!group || group.status !== 'active') {
      res.status(404).json({ error: 'Group not found or no longer active' });
      return;
    }

    if (group.leaderId === req.userId) {
      // Leader leaves → dissolve the whole group
      await db.update(schema.bidGroups).set({ status: 'dissolved' }).where(eq(schema.bidGroups.id, groupId)).run();
      console.log(`Group dissolved: "${group.name}" (${groupId}) — leader left`);
    } else {
      // Regular member leaves
      const user = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, req.userId!)).get();
      if (user) {
        await db.delete(schema.bidGroupMembers)
          .where(and(
            eq(schema.bidGroupMembers.groupId, groupId),
            eq(schema.bidGroupMembers.email, user.email),
          )).run();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Place a group bid (leader only)
router.post('/:groupId/bid', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const groupId = String(req.params.groupId);

    const group = await db.select().from(schema.bidGroups).where(eq(schema.bidGroups.id, groupId)).get();
    if (!group || group.status !== 'active') {
      res.status(404).json({ error: 'Group not found or no longer active' });
      return;
    }

    if (group.leaderId !== req.userId) {
      res.status(403).json({ error: 'Only the group leader can place bids' });
      return;
    }

    const listingId = group.listingId;
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
      res.status(403).json({ error: 'You cannot bid on your own listing' });
      return;
    }

    // Enforce minimum bid increment ($25)
    const minBid = listing.currentBid + 25;
    if (amount < minBid) {
      res.status(400).json({ error: `Bid must be at least $${minBid}/mo` });
      return;
    }

    const bidId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Atomic update
    const updateResult = await db.update(schema.listings).set({
      currentBid: amount,
      bidCount: sql`${schema.listings.bidCount} + 1`,
    }).where(
      and(
        eq(schema.listings.id, listingId),
        lt(schema.listings.currentBid, amount),
      )
    ).run();

    if (updateResult.rowsAffected === 0) {
      res.status(409).json({ error: 'Another bid was placed first. Please refresh and try again.' });
      return;
    }

    // Insert the bid with group_id
    await db.insert(schema.bids).values({
      id: bidId,
      listingId,
      userId: req.userId!,
      amount,
      isAutoBid: false,
      groupId,
      timestamp,
    }).run();

    // Re-read listing for accurate bidCount
    const updatedListing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    const newBidCount = updatedListing?.bidCount ?? (listing.bidCount + 1);

    const bidder = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();

    const bid = {
      id: bidId,
      listingId,
      userId: req.userId!,
      amount,
      isAutoBid: false,
      groupId,
      timestamp,
      userName: bidder?.name || 'Anonymous',
      userUniversity: bidder?.university || '',
      groupName: group.name,
    };

    // Socket event
    if (io) {
      io.to(`listing:${listingId}`).emit('bid_update', {
        listingId,
        bid,
        currentBid: amount,
        bidCount: newBidCount,
      });
    }

    // Outbid notifications for previous bidders
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
        message: `You've been outbid on "${listing.title}". Group bid: $${amount}/mo`,
        listingId,
        read: false,
        createdAt: new Date().toISOString(),
      }).run();

      if (io) {
        io.to(`user:${bidderId}`).emit('notification', {
          id: notifId, userId: bidderId, type: 'outbid',
          message: `You've been outbid on "${listing.title}". Group bid: $${amount}/mo`,
          listingId, read: false, createdAt: new Date().toISOString(),
        });
      }
    }

    console.log(`Group bid: "${group.name}" bid $${amount} on "${listing.title}"`);
    res.status(201).json({ success: true, bid });
  } catch (error) {
    console.error('Group bid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
