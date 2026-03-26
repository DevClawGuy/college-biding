import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const favs = db.select({
      listing: schema.listings,
    })
      .from(schema.favorites)
      .innerJoin(schema.listings, eq(schema.favorites.listingId, schema.listings.id))
      .where(eq(schema.favorites.userId, req.userId!))
      .all();

    const parsed = favs.map(f => ({
      ...f.listing,
      photos: JSON.parse(f.listing.photos),
      amenities: JSON.parse(f.listing.amenities),
      tags: JSON.parse(f.listing.tags),
    }));

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:listingId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const existing = db.select().from(schema.favorites)
      .where(and(
        eq(schema.favorites.userId, req.userId!),
        eq(schema.favorites.listingId, String(req.params.listingId)),
      )).get();

    if (existing) {
      res.status(409).json({ error: 'Already favorited' });
      return;
    }

    db.insert(schema.favorites).values({
      userId: req.userId!,
      listingId: String(req.params.listingId),
    }).run();

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:listingId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    db.delete(schema.favorites)
      .where(and(
        eq(schema.favorites.userId, req.userId!),
        eq(schema.favorites.listingId, String(req.params.listingId)),
      )).run();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check/:listingId', authenticateToken, (req: AuthRequest, res: Response) => {
  const fav = db.select().from(schema.favorites)
    .where(and(
      eq(schema.favorites.userId, req.userId!),
      eq(schema.favorites.listingId, String(req.params.listingId)),
    )).get();

  res.json({ isFavorited: !!fav });
});

export default router;
