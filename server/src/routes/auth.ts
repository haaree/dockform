import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { signToken } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../lib/email.js';

const router = Router();

const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS || 'haaree@gmail.com').split(',').map(e => e.trim().toLowerCase());

function randomCompanyCode(): string {
  return 'CO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }

  const user = await prisma.user.findUnique({ where: { email }, include: { role: true, company: true } });
  if (!user || !user.passwordHash) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  if (user.status === 'suspended') { res.status(403).json({ error: 'Your account has been suspended. Contact your administrator.' }); return; }
  if (user.status === 'invited') { res.status(403).json({ error: 'Please finish creating your account using the invite link in your email.' }); return; }
  if (user.role?.key !== 'platform_admin' && user.company?.status === 'pending') {
    res.status(403).json({ error: 'Your company is pending approval by the DockForm team. You will receive an email once approved.' }); return;
  }
  if (user.role?.key !== 'platform_admin' && user.company?.status === 'suspended') {
    res.status(403).json({ error: 'Your company account has been suspended. Contact DockForm support.' }); return;
  }

  const roleKey = user.role?.key || 'viewer';
  const token = signToken({ userId: user.id, roleKey, companyId: user.companyId });
  res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, roleKey, status: user.status, companyId: user.companyId, companyStatus: user.company?.status, preferences: user.preferences } });
});

router.post('/signup', async (req, res) => {
  const { email, password, fullName, inviteToken } = req.body;
  if (!password || password.length < 6) { res.status(400).json({ error: 'Password (≥6 chars) required' }); return; }

  // Invited teammate completing their pre-created account — identified by token, not email
  if (inviteToken) {
    const candidates = await prisma.user.findMany({ where: { preferences: { path: ['inviteToken'], equals: inviteToken } } });
    const invitedUser = candidates[0];
    if (!invitedUser || invitedUser.status !== 'invited') { res.status(400).json({ error: 'Invalid or expired invite link' }); return; }

    const hash = await bcrypt.hash(password, 10);
    const { inviteToken: _t, ...restPrefs } = invitedUser.preferences as Record<string, unknown>;
    const updated = await prisma.user.update({
      where: { id: invitedUser.id },
      data: { passwordHash: hash, status: 'active', preferences: restPrefs as object },
      include: { role: true },
    });

    const token = signToken({ userId: updated.id, roleKey: updated.role?.key || 'viewer', companyId: updated.companyId });
    res.json({ token, user: { id: updated.id, email: updated.email, fullName: updated.fullName, roleKey: updated.role?.key, status: updated.status, companyId: updated.companyId, preferences: updated.preferences } });
    return;
  }

  if (!email) { res.status(400).json({ error: 'Email required' }); return; }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }

  const hash = await bcrypt.hash(password, 10);
  const displayName = fullName || email.split('@')[0];
  const isPlatformAdmin = PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());

  if (isPlatformAdmin) {
    const platformRole = await prisma.role.findUnique({ where: { key: 'platform_admin' } });
    const user = await prisma.user.create({
      data: { email, passwordHash: hash, fullName: displayName, roleId: platformRole?.id, status: 'active' },
      include: { role: true },
    });
    const token = signToken({ userId: user.id, roleKey: user.role?.key || 'platform_admin', companyId: null });
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, roleKey: user.role?.key, status: user.status, companyId: null, preferences: user.preferences } });
    return;
  }

  // First signup for a new company — becomes that company's admin, company starts pending platform approval
  const adminRole = await prisma.role.findUnique({ where: { key: 'admin' } });
  const company = await prisma.company.create({ data: { name: `${displayName}'s Company`, code: randomCompanyCode(), status: 'pending' } });
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, fullName: displayName, roleId: adminRole?.id, companyId: company.id, status: 'active' },
    include: { role: true },
  });

  res.json({ pending: true, message: "Account created! Your company is pending approval by the DockForm team. You'll receive an email once approved." });

  sendWelcomeEmail(user.email, user.fullName);
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
