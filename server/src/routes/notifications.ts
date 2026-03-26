import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notifs = await db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, req.userId!))
      .orderBy(desc(schema.notifications.createdAt));
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await db.update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, String(req.params.id)))
      .run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await db.update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, req.userId!))
      .run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
