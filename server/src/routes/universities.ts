import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

const router = Router();

// GET / — list universities with search, state filter, pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const state = req.query.state ? String(req.query.state) : '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.universities.portalActive, 1)];

    if (search) {
      conditions.push(
        sql`LOWER(${schema.universities.name}) LIKE LOWER(${'%' + search + '%'})`,
      );
    }
    if (state) {
      conditions.push(eq(schema.universities.state, state));
    }

    const whereClause = and(...conditions);

    const results = await db.select().from(schema.universities)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    // Count total for pagination
    const countResult = await db.select({ count: sql<number>`COUNT(*)` })
      .from(schema.universities)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    // For each university, count nearby active listings
    const enriched = [];
    for (const uni of results) {
      let activeListingCount = 0;
      if (uni.latitude != null && uni.longitude != null) {
        const countRows = await db.select({ count: sql<number>`COUNT(*)` })
          .from(schema.listings)
          .where(and(
            eq(schema.listings.status, 'active'),
            eq(schema.listings.approvalStatus, 'approved'),
            gte(schema.listings.lat, uni.latitude - 0.045),
            lte(schema.listings.lat, uni.latitude + 0.045),
            gte(schema.listings.lng, uni.longitude - 0.045),
            lte(schema.listings.lng, uni.longitude + 0.045),
          ));
        activeListingCount = countRows[0]?.count ?? 0;
      }
      enriched.push({ ...uni, activeListingCount });
    }

    res.json({ universities: enriched, total, page, limit });
  } catch (error) {
    console.error('Universities list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:slug — university detail with market data
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const university = await db.select().from(schema.universities)
      .where(and(
        eq(schema.universities.slug, String(req.params.slug)),
        eq(schema.universities.portalActive, 1),
      )).get();

    if (!university) {
      res.status(404).json({ error: 'University not found' });
      return;
    }

    const marketData = await db.select().from(schema.universityMarketData)
      .where(eq(schema.universityMarketData.universityId, university.id))
      .orderBy(schema.universityMarketData.bedroomCount);

    res.json({ ...university, marketData });
  } catch (error) {
    console.error('University detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:slug/listings — active listings near university
router.get('/:slug/listings', async (req: Request, res: Response) => {
  try {
    const university = await db.select().from(schema.universities)
      .where(eq(schema.universities.slug, String(req.params.slug))).get();

    if (!university) {
      res.status(404).json({ error: 'University not found' });
      return;
    }

    if (university.latitude == null || university.longitude == null) {
      res.json([]);
      return;
    }

    const listings = await db.select().from(schema.listings)
      .where(and(
        eq(schema.listings.status, 'active'),
        eq(schema.listings.approvalStatus, 'approved'),
        gte(schema.listings.lat, university.latitude - 0.045),
        lte(schema.listings.lat, university.latitude + 0.045),
        gte(schema.listings.lng, university.longitude - 0.045),
        lte(schema.listings.lng, university.longitude + 0.045),
      ));

    const parsed = listings.map(l => ({
      ...l,
      photos: JSON.parse(l.photos),
      amenities: JSON.parse(l.amenities),
      tags: JSON.parse(l.tags),
    }));

    res.json(parsed);
  } catch (error) {
    console.error('University listings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
