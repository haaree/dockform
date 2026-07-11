import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { signToken } from '../middleware/auth.js';
import { sendWelcomeEmail, sendAdminNewSignupEmail, sendPasswordResetEmail } from '../lib/email.js';

const router = Router();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'haaree@gmail.com').split(',').map(e => e.trim().toLowerCase());

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }

  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user || !user.passwordHash) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  if (user.status === 'pending') { res.status(403).json({ error: 'Your account is pending admin approval. You will receive an email once approved.' }); return; }
  if (user.status === 'suspended') { res.status(403).json({ error: 'Your account has been suspended. Contact your administrator.' }); return; }

  const token = signToken({ userId: user.id, roleKey: user.role?.key || 'viewer' });
  res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, roleKey: user.role?.key, status: user.status, preferences: user.preferences } });
});

router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || password.length < 6) { res.status(400).json({ error: 'Email and password (≥6 chars) required' }); return; }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }

  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  const role = await prisma.role.findUnique({ where: { key: isAdmin ? 'admin' : 'viewer' } });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, fullName: fullName || email.split('@')[0], roleId: role?.id, status: isAdmin ? 'active' : 'pending' },
    include: { role: true },
  });

  if (isAdmin) {
    const token = signToken({ userId: user.id, roleKey: user.role?.key || 'admin' });
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, roleKey: user.role?.key, status: user.status, preferences: user.preferences } });
  } else {
    res.json({ pending: true, message: 'Account created! Your account is pending admin approval. You will receive an email once approved.' });
  }

  sendWelcomeEmail(user.email, user.fullName);
  if (process.env.ADMIN_EMAIL) {
    sendAdminNewSignupEmail(process.env.ADMIN_EMAIL, user.fullName, user.email);
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email required' }); return; }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid leaking which emails are registered
  if (!user) { res.json({ ok: true }); return; }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  const preferences = { ...(user.preferences as object || {}), resetToken: token, resetTokenExpiresAt: expiresAt };
  await prisma.user.update({ where: { id: user.id }, data: { preferences } });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}?reset=${token}`;
  sendPasswordResetEmail(user.email, user.fullName, resetLink);

  res.json({ ok: true });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) { res.status(400).json({ error: 'Token and password (≥6 chars) required' }); return; }

  const users = await prisma.user.findMany({ where: { preferences: { path: ['resetToken'], equals: token } } });
  const user = users[0];
  if (!user) { res.status(400).json({ error: 'Invalid or expired reset link' }); return; }

  const prefs = user.preferences as { resetToken?: string; resetTokenExpiresAt?: number };
  if (!prefs.resetTokenExpiresAt || Date.now() > prefs.resetTokenExpiresAt) {
    res.status(400).json({ error: 'Invalid or expired reset link' }); return;
  }

  const hash = await bcrypt.hash(password, 10);
  const { resetToken, resetTokenExpiresAt, ...rest } = prefs;
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, preferences: rest } });

  res.json({ ok: true });
});

export default router;
