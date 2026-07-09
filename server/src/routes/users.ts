import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';

const router = Router();

const COLORS = ['#2563EB', '#059669', '#7C3AED', '#0D9488', '#DC2626', '#D97706', '#4F46E5', '#BE185D'];

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { fullName: 'asc' },
    include: { role: true, department: true },
  });
  res.json(users.map((u: any, i: number) => {
    const parts = u.fullName.split(' ');
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return {
      id: u.id, name: u.fullName, email: u.email,
      role: u.role?.name || 'Viewer', department: u.department?.name || '—',
      status: u.status, initials: initials.toUpperCase(), color: COLORS[i % COLORS.length],
    };
  }));
});

router.post('/', async (req, res) => {
  const { email, password, fullName, roleId } = req.body;
  const hash = password ? await bcrypt.hash(password, 10) : null;
  const user = await prisma.user.create({ data: { email, passwordHash: hash, fullName, roleId } });
  res.status(201).json(user);
});

export default router;
