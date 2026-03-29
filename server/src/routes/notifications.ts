import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all notifications for logged-in user
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

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notifs = await db.select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, req.userId!),
        eq(schema.notifications.read, false),
      ));
    res.json({ count: notifs.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark single notification as read
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

// Mark all notifications as read
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
