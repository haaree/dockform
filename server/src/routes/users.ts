import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { sendInviteEmail } from '../lib/email.js';

const router = Router();

const COLORS = ['#2563EB', '#059669', '#7C3AED', '#0D9488', '#DC2626', '#D97706', '#4F46E5', '#BE185D'];

router.get('/', async (req, res) => {
  if (!req.auth?.companyId) { res.json([]); return; }
  const users = await prisma.user.findMany({
    where: { companyId: req.auth.companyId },
    orderBy: { fullName: 'asc' },
    include: { role: true, department: true, trades: { include: { trade: true } } },
  });
  res.json(users.map((u: any, i: number) => {
    const parts = u.fullName.split(' ');
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return {
      id: u.id, name: u.fullName, email: u.email,
      role: u.role?.name || 'Viewer', department: u.department?.name || '—',
      status: u.status, initials: initials.toUpperCase(), color: COLORS[i % COLORS.length],
      availabilityStatus: u.availabilityStatus,
      trades: u.trades.map((t: any) => ({ id: t.trade.id, name: t.trade.name })),
    };
  }));
});

router.post('/', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { email, fullName, roleId } = req.body;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }

  let resolvedRoleId = roleId;
  if (!resolvedRoleId) {
    const viewerRole = await prisma.role.findUnique({ where: { key: 'viewer' } });
    resolvedRoleId = viewerRole?.id;
  }

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const user = await prisma.user.create({
    data: {
      email, fullName, roleId: resolvedRoleId, companyId: req.auth.companyId,
      status: 'invited', preferences: { inviteToken },
    },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  sendInviteEmail(email, fullName, `${appUrl}?invite=${inviteToken}`);

  res.status(201).json(user);
});

router.patch('/:id', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { status, roleId, availabilityStatus } = req.body;
  const data: Record<string, string> = {};
  if (status) data.status = status;
  if (roleId) data.roleId = roleId;
  if (availabilityStatus) data.availabilityStatus = availabilityStatus;
  const user = await prisma.user.update({ where: { id: req.params.id }, data, include: { role: true } });
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.companyId !== req.auth.companyId) { res.status(404).json({ error: 'User not found' }); return; }
  if (target.id === req.auth.userId) { res.status(400).json({ error: 'Cannot delete your own account' }); return; }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
