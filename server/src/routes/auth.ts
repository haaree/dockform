import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { signToken } from '../middleware/auth.js';
import { sendWelcomeEmail, sendAdminNewSignupEmail } from '../lib/email.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }

  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user || !user.passwordHash) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const token = signToken({ userId: user.id, roleKey: user.role?.key || 'viewer' });
  res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, roleKey: user.role?.key, preferences: user.preferences } });
});

router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || password.length < 6) { res.status(400).json({ error: 'Email and password (≥6 chars) required' }); return; }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }

  const viewerRole = await prisma.role.findUnique({ where: { key: 'viewer' } });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, fullName: fullName || email.split('@')[0], roleId: viewerRole?.id },
    include: { role: true },
  });

  const token = signToken({ userId: user.id, roleKey: user.role?.key || 'viewer' });
  res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, roleKey: user.role?.key, preferences: user.preferences } });

  sendWelcomeEmail(user.email, user.fullName);
  if (process.env.ADMIN_EMAIL) {
    sendAdminNewSignupEmail(process.env.ADMIN_EMAIL, user.fullName, user.email);
  }
});

export default router;
