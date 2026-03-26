import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, university, year, role, budgetMin, budgetMax } = req.body;

    if (!email || !password || !name || !university) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isEduVerified = email.endsWith('.edu');
    const id = uuidv4();

    db.insert(schema.users).values({
      id,
      email,
      password: hashedPassword,
      name,
      university,
      year: year || null,
      role: role || 'student',
      budgetMin: budgetMin || null,
      budgetMax: budgetMax || null,
      isEduVerified,
      createdAt: new Date().toISOString(),
    }).run();

    const user = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    const token = generateToken(id);

    const { password: _, ...userWithoutPassword } = user!;
    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, university, year, budgetMin, budgetMax } = req.body;
    db.update(schema.users)
      .set({
        ...(name && { name }),
        ...(university && { university }),
        ...(year !== undefined && { year }),
        ...(budgetMin !== undefined && { budgetMin }),
        ...(budgetMax !== undefined && { budgetMax }),
      })
      .where(eq(schema.users.id, req.userId!))
      .run();

    const user = db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    const { password: _, ...userWithoutPassword } = user!;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
