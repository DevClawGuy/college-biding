import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const notifs = db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, req.userId!))
      .orderBy(desc(schema.notifications.createdAt))
      .all();
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    db.update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, String(req.params.id)))
      .run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    db.update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, req.userId!))
      .run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
