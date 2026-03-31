import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateBidRecommendation } from '../lib/recommendation';

const router = Router();

const CACHE_TTL = 300000; // 5 minutes

async function handleRecommendation(req: AuthRequest, res: Response) {
  try {
    const listingId = String(req.params.listingId);

    // Students only
    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user || user.role === 'landlord') {
      res.status(403).json({ error: 'Recommendations are only available for students' });
      return;
    }

    const listing = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId)).get();
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Check cache
    if (listing.recommendationCachedAt && listing.recommendationCache) {
      if (Date.now() - listing.recommendationCachedAt < CACHE_TTL) {
        const cached = JSON.parse(listing.recommendationCache);
        cached.cached = true;
        res.json(cached);
        return;
      }
    }

    const result = await generateBidRecommendation(listingId);
    res.json(result);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Unable to generate recommendation. Try again shortly.' });
  }
}

router.post('/bid-recommendation/:listingId', authenticateToken, handleRecommendation);
router.get('/bid-recommendation/:listingId', authenticateToken, handleRecommendation);

export default router;
