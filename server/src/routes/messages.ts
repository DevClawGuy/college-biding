import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and, or, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function setMessageSocket(socketIo: SocketServer) {
  io = socketIo;
}

const router = Router();

// GET /api/messages/unread-count — must be before /:listingId to avoid route conflict
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const unread = await db.select({ id: schema.messages.id })
      .from(schema.messages)
      .where(and(
        eq(schema.messages.recipientId, req.userId!),
        eq(schema.messages.isRead, false),
      ));
    res.json({ count: unread.length });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/conversations — get all conversations for dashboard
router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Get all messages where user is sender or recipient
    const allMessages = await db.select({
      id: schema.messages.id,
      listingId: schema.messages.listingId,
      senderId: schema.messages.senderId,
      recipientId: schema.messages.recipientId,
      body: schema.messages.body,
      isRead: schema.messages.isRead,
      createdAt: schema.messages.createdAt,
    })
      .from(schema.messages)
      .where(or(
        eq(schema.messages.senderId, req.userId!),
        eq(schema.messages.recipientId, req.userId!),
      ))
      .orderBy(desc(schema.messages.createdAt));

    // Group by listing + other party
    const convMap = new Map<string, {
      listingId: string;
      otherUserId: string;
      otherUserName: string;
      listingTitle: string;
      listingPhoto: string;
      lastMessage: string;
      lastMessageAt: number;
      unreadCount: number;
    }>();

    for (const msg of allMessages) {
      const otherUserId = msg.senderId === req.userId ? msg.recipientId : msg.senderId;
      const key = `${msg.listingId}:${otherUserId}`;

      if (!convMap.has(key)) {
        convMap.set(key, {
          listingId: msg.listingId,
          otherUserId,
          otherUserName: '',
          listingTitle: '',
          listingPhoto: '',
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }

      const conv = convMap.get(key)!;
      if (msg.recipientId === req.userId && !msg.isRead) {
        conv.unreadCount++;
      }
    }

    // Enrich with user names and listing details
    const conversations = Array.from(convMap.values());
    for (const conv of conversations) {
      const otherUser = await db.select({ name: schema.users.name })
        .from(schema.users).where(eq(schema.users.id, conv.otherUserId)).get();
      conv.otherUserName = otherUser?.name ?? 'Unknown';

      const listing = await db.select({ title: schema.listings.title, photos: schema.listings.photos })
        .from(schema.listings).where(eq(schema.listings.id, conv.listingId)).get();
      conv.listingTitle = listing?.title ?? 'Unknown';
      conv.listingPhoto = listing?.photos ? JSON.parse(listing.photos)[0] ?? '' : '';
    }

    // Sort by most recent
    conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    res.json(conversations);
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:listingId — get message thread for a listing
router.get('/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listingId = String(req.params.listingId);
    const otherUserId = req.query.with ? String(req.query.with) : null;

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Determine the other party
    let otherId: string;
    if (listing.landlordId === req.userId) {
      // Landlord viewing — need to know which student
      if (!otherUserId) {
        res.status(400).json({ error: 'Landlord must specify ?with=studentId' });
        return;
      }
      otherId = otherUserId;
    } else {
      // Student viewing — other party is always the landlord
      otherId = listing.landlordId;
    }

    // Fetch messages between the two parties for this listing
    const threadMessages = await db.select({
      id: schema.messages.id,
      senderId: schema.messages.senderId,
      recipientId: schema.messages.recipientId,
      body: schema.messages.body,
      isRead: schema.messages.isRead,
      createdAt: schema.messages.createdAt,
    })
      .from(schema.messages)
      .where(and(
        eq(schema.messages.listingId, listingId),
        or(
          and(eq(schema.messages.senderId, req.userId!), eq(schema.messages.recipientId, otherId)),
          and(eq(schema.messages.senderId, otherId), eq(schema.messages.recipientId, req.userId!)),
        ),
      ))
      .orderBy(schema.messages.createdAt);

    // Enrich with sender names
    const userCache = new Map<string, string>();
    const enriched = [];
    for (const msg of threadMessages) {
      if (!userCache.has(msg.senderId)) {
        const u = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, msg.senderId)).get();
        userCache.set(msg.senderId, u?.name ?? 'Unknown');
      }
      enriched.push({ ...msg, senderName: userCache.get(msg.senderId)! });
    }

    // Mark incoming messages as read
    // TODO: batch this into a single UPDATE for performance
    for (const msg of threadMessages) {
      if (msg.recipientId === req.userId && !msg.isRead) {
        await db.update(schema.messages).set({ isRead: true }).where(eq(schema.messages.id, msg.id)).run();
      }
    }

    res.json(enriched);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:listingId — send a message
router.post('/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { body, recipientId: reqRecipientId } = req.body;
    const listingId = String(req.params.listingId);

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      res.status(400).json({ error: 'Message body is required' });
      return;
    }
    if (body.length > 1000) {
      res.status(400).json({ error: 'Message must be 1000 characters or less' });
      return;
    }

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const sender = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!sender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    // Determine recipient
    let recipientId: string;
    if (sender.role === 'student') {
      recipientId = listing.landlordId;
    } else {
      // Landlord must specify recipientId
      if (!reqRecipientId) {
        res.status(400).json({ error: 'Landlord must specify recipientId' });
        return;
      }
      recipientId = String(reqRecipientId);
    }

    if (recipientId === req.userId) {
      res.status(400).json({ error: 'Cannot message yourself' });
      return;
    }

    const msgId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(schema.messages).values({
      id: msgId,
      listingId,
      senderId: req.userId!,
      recipientId,
      body: body.trim(),
      isRead: false,
      createdAt: now,
    }).run();

    // Create notification
    const notifId = crypto.randomUUID();
    await db.insert(schema.notifications).values({
      id: notifId,
      userId: recipientId,
      type: 'new_bid', // reuse existing type for message notifications
      message: `${sender.name} sent you a message about ${listing.address}`,
      listingId,
      read: false,
      createdAt: new Date().toISOString(),
    }).run();

    // Emit socket events
    if (io) {
      io.to(`user:${recipientId}`).emit('new_message', {
        messageId: msgId,
        listingId,
        listingTitle: listing.title,
        senderId: req.userId,
        senderName: sender.name,
        body: body.trim(),
        createdAt: now,
      });

      io.to(`user:${recipientId}`).emit('notification', {
        id: notifId,
        userId: recipientId,
        type: 'new_bid',
        message: `${sender.name} sent you a message about ${listing.address}`,
        listingId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: { id: msgId, body: body.trim(), senderId: req.userId, senderName: sender.name, createdAt: now },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
