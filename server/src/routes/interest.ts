import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function setInterestSocket(socketIo: SocketServer) {
  io = socketIo;
}

const router = Router();

// Helper: count expressions for a listing
async function getInterestCount(listingId: string): Promise<number> {
  const rows = await db.select({ id: schema.expressionsOfInterest.id })
    .from(schema.expressionsOfInterest)
    .where(eq(schema.expressionsOfInterest.listingId, listingId));
  return rows.length;
}

// GET /api/interest/my — student's expressed interests
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role !== 'student') {
      res.status(403).json({ error: 'Students only' });
      return;
    }

    const expressions = await db.select()
      .from(schema.expressionsOfInterest)
      .where(eq(schema.expressionsOfInterest.userId, req.userId!));

    const results = [];
    for (const expr of expressions) {
      const listing = await db.select({
        id: schema.listings.id,
        title: schema.listings.title,
        address: schema.listings.address,
        city: schema.listings.city,
        photos: schema.listings.photos,
        beds: schema.listings.beds,
        baths: schema.listings.baths,
        status: schema.listings.status,
        landlordId: schema.listings.landlordId,
      }).from(schema.listings).where(eq(schema.listings.id, expr.listingId)).get();

      results.push({
        expressionId: expr.id,
        listingId: expr.listingId,
        moveInDate: expr.moveInDate,
        occupants: expr.occupants,
        note: expr.note,
        rentSuggestion: expr.rentSuggestion,
        createdAt: expr.createdAt,
        listing: listing ? { ...listing, photos: JSON.parse(listing.photos) } : null,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Get my interests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/interest/:listingId — public count + user check
router.get('/:listingId', async (req: any, res: Response) => {
  try {
    const listingId = String(req.params.listingId);
    const count = await getInterestCount(listingId);

    let userHasExpressed = false;
    // Optionally check auth
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const { JWT_SECRET } = await import('../middleware/auth');
        const decoded = jwt.default.verify(token, JWT_SECRET) as { userId: string };
        const existing = await db.select({ id: schema.expressionsOfInterest.id })
          .from(schema.expressionsOfInterest)
          .where(and(
            eq(schema.expressionsOfInterest.listingId, listingId),
            eq(schema.expressionsOfInterest.userId, decoded.userId),
          )).get();
        userHasExpressed = !!existing;
      } catch { /* invalid token */ }
    }

    res.json({ count, userHasExpressed });
  } catch (error) {
    console.error('Get interest count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/interest/:listingId/details — landlord only
router.get('/:listingId/details', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listingId = String(req.params.listingId);

    const listing = await db.select({ landlordId: schema.listings.landlordId })
      .from(schema.listings).where(eq(schema.listings.id, listingId)).get();

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.landlordId !== req.userId) {
      res.status(403).json({ error: 'Only the listing landlord can view interested students' });
      return;
    }

    const expressions = await db.select()
      .from(schema.expressionsOfInterest)
      .where(eq(schema.expressionsOfInterest.listingId, listingId))
      .orderBy(schema.expressionsOfInterest.createdAt);

    const results = [];
    for (const expr of expressions) {
      const student = await db.select({
        id: schema.users.id,
        name: schema.users.name,
        university: schema.users.university,
        isEduVerified: schema.users.isEduVerified,
        phone: schema.users.phone,
      }).from(schema.users).where(eq(schema.users.id, expr.userId)).get();

      results.push({
        id: expr.id,
        userId: expr.userId,
        moveInDate: expr.moveInDate,
        occupants: expr.occupants,
        note: expr.note,
        rentSuggestion: expr.rentSuggestion,
        createdAt: expr.createdAt,
        student,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Get interest details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/interest/:listingId — express interest
router.post('/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listingId = String(req.params.listingId);
    const { moveInDate, occupants, note, rentSuggestion } = req.body;

    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role !== 'student') {
      res.status(403).json({ error: 'Only students can express interest' });
      return;
    }

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.status !== 'active') {
      res.status(400).json({ error: 'Listing is not active' });
      return;
    }

    // Validations
    if (note && typeof note === 'string' && note.length > 280) {
      res.status(400).json({ error: 'Note must be 280 characters or less' });
      return;
    }
    if (occupants !== undefined && occupants !== null && (occupants < 1 || occupants > 6)) {
      res.status(400).json({ error: 'Occupants must be between 1 and 6' });
      return;
    }
    if (rentSuggestion !== undefined && rentSuggestion !== null && (typeof rentSuggestion !== 'number' || rentSuggestion < 1)) {
      res.status(400).json({ error: 'Rent suggestion must be a positive number' });
      return;
    }

    // Check if already expressed — delete old one first for replace behavior
    const existing = await db.select({ id: schema.expressionsOfInterest.id })
      .from(schema.expressionsOfInterest)
      .where(and(
        eq(schema.expressionsOfInterest.listingId, listingId),
        eq(schema.expressionsOfInterest.userId, req.userId!),
      )).get();

    if (existing) {
      await db.delete(schema.expressionsOfInterest).where(eq(schema.expressionsOfInterest.id, existing.id)).run();
    }

    await db.insert(schema.expressionsOfInterest).values({
      id: crypto.randomUUID(),
      listingId,
      userId: req.userId!,
      moveInDate: moveInDate ?? null,
      occupants: occupants ?? null,
      note: note ?? null,
      rentSuggestion: rentSuggestion ?? null,
      createdAt: new Date().toISOString(),
    }).run();

    const count = await getInterestCount(listingId);

    if (io) {
      io.to(`listing:${listingId}`).emit('new_interest', { listingId, count });
    }

    res.json({ success: true, count });
  } catch (error) {
    console.error('Express interest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/interest/:listingId — withdraw interest
router.delete('/:listingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const listingId = String(req.params.listingId);

    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role !== 'student') {
      res.status(403).json({ error: 'Only students can withdraw interest' });
      return;
    }

    await db.delete(schema.expressionsOfInterest)
      .where(and(
        eq(schema.expressionsOfInterest.listingId, listingId),
        eq(schema.expressionsOfInterest.userId, req.userId!),
      )).run();

    const count = await getInterestCount(listingId);

    if (io) {
      io.to(`listing:${listingId}`).emit('new_interest', { listingId, count });
    }

    res.json({ success: true, count });
  } catch (error) {
    console.error('Withdraw interest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
