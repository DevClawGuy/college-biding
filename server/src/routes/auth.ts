import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { sendVerificationEmail, sendEmail } from '../lib/email';

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

    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, parentAccessToken: _p, ...userWithoutSensitive } = user!;
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
    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, parentAccessToken: _p, ...userWithoutSensitive } = user;
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
    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, parentAccessToken: _p, ...userWithoutSensitive } = user;
    res.json(userWithoutSensitive);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, university, year, budgetMin, budgetMax, phone, parentEmail } = req.body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (university) updates.university = university;
    if (year !== undefined) updates.year = year;
    if (budgetMin !== undefined) updates.budgetMin = budgetMin;
    if (budgetMax !== undefined) updates.budgetMax = budgetMax;
    if (phone !== undefined) updates.phone = phone;

    // Parent access handling
    if (parentEmail !== undefined) {
      if (parentEmail === null || parentEmail === '') {
        // Remove parent access
        updates.parentEmail = null;
        updates.parentAccessToken = null;
      } else {
        // Set/update parent email and generate token
        const token = crypto.randomUUID();
        updates.parentEmail = parentEmail;
        updates.parentAccessToken = token;

        // Get student name for the email
        const currentUser = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, req.userId!)).get();
        const studentName = currentUser?.name ?? 'Your student';

        // Send parent invitation email
        const parentViewUrl = `https://houserush.vercel.app/parent-view?token=${token}`;
        sendEmail(
          parentEmail,
          `${studentName} invited you to follow their HouseRush housing search`,
          parentInviteEmailHtml({ studentName, parentViewUrl }),
        ).catch(err => console.error('Parent invite email failed:', err));
      }
    }

    await db.update(schema.users).set(updates).where(eq(schema.users.id, req.userId!)).run();

    const user = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!)).get();
    const { password: _, emailVerificationToken: _t, verificationTokenExpires: _e, parentAccessToken: _p, ...userWithoutSensitive } = user!;
    res.json(userWithoutSensitive);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

function parentInviteEmailHtml(opts: { studentName: string; parentViewUrl: string }): string {
  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 48px;">&#127968;</span>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 16px 0 8px;">You've Been Invited!</h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">${opts.studentName} wants you to follow their housing search.</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">What is HouseRush?</p>
        <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.6;">HouseRush is a student housing platform where students find and bid on off-campus housing near Monmouth University. ${opts.studentName} has invited you to view their saved listings and bid activity.</p>
      </div>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
        <strong>Your access is read-only.</strong> You can see which listings they're interested in and how their bids are going, but you cannot place bids or make any changes.
      </p>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Click below to view their housing search anytime — no account needed.
      </p>
      <div style="text-align: center;">
        <a href="${opts.parentViewUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">View Housing Search</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
    </div>
  `;
}

export default router;
