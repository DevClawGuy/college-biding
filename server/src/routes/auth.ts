import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { sendVerificationEmail } from '../lib/email';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, university, year, role, budgetMin, budgetMax } = req.body;

    if (!email || !password || !name || !university) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isEdu = email.endsWith('.edu');
    const id = crypto.randomUUID();

    // For .edu emails: generate verification token, don't verify yet
    // For non-.edu emails: no verification needed
    let verificationToken: string | null = null;
    let tokenExpires: number | null = null;
    if (isEdu) {
      verificationToken = crypto.randomUUID();
      tokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    }

    await db.insert(schema.users).values({
      id,
      email,
      password: hashedPassword,
      name,
      university,
      year: year || null,
      role: role || 'student',
      budgetMin: budgetMin || null,
      budgetMax: budgetMax || null,
      isEduVerified: false,
      emailVerificationToken: verificationToken,
      verificationTokenExpires: tokenExpires,
      createdAt: new Date().toISOString(),
    }).run();

    // Send verification email in background (don't block signup)
    if (isEdu && verificationToken) {
      sendVerificationEmail(email, verificationToken).catch(err => {
        console.error('Failed to send verification email:', err);
      });
    }

    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    const token = generateToken(id);

    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, ...userWithoutSensitive } = user!;
    res.status(201).json({
      token,
      user: userWithoutSensitive,
      ...(isEdu ? { message: 'Verification email sent! Check your inbox to verify your .edu email.' } : {}),
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify .edu email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token ?? '');
    if (!token) {
      res.status(400).json({ error: 'Missing verification token' });
      return;
    }

    const user = await db.select().from(schema.users)
      .where(eq(schema.users.emailVerificationToken, token)).get();

    if (!user) {
      res.status(400).json({ error: 'Invalid verification token' });
      return;
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < Date.now()) {
      res.status(400).json({ error: 'Verification token has expired. Please sign up again.' });
      return;
    }

    await db.update(schema.users).set({
      isEduVerified: true,
      emailVerificationToken: null,
      verificationTokenExpires: null,
    }).where(eq(schema.users.id, user.id)).run();

    res.json({ success: true, message: 'Your .edu email has been verified!' });
  } catch (error) {
    console.error('Verify email error:', error);
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

    const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      console.error('bcrypt.compare error:', e);
    }

    if (!validPassword && user.password === password) {
      console.log('Plain-text password detected, migrating to bcrypt hash for:', user.email);
      const newHash = await bcrypt.hash(password, 10);
      await db.update(schema.users).set({ password: newHash }).where(eq(schema.users.id, user.id)).run();
      validPassword = true;
    }

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);
    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, ...userWithoutSensitive } = user;
    res.json({ token, user: userWithoutSensitive });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, ...userWithoutSensitive } = user;
    res.json(userWithoutSensitive);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, university, year, budgetMin, budgetMax, phone } = req.body;
    await db.update(schema.users)
      .set({
        ...(name && { name }),
        ...(university && { university }),
        ...(year !== undefined && { year }),
        ...(budgetMin !== undefined && { budgetMin }),
        ...(budgetMax !== undefined && { budgetMax }),
        ...(phone !== undefined && { phone }),
      })
      .where(eq(schema.users.id, req.userId!))
      .run();

    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, ...userWithoutSensitive } = user!;
    res.json(userWithoutSensitive);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
