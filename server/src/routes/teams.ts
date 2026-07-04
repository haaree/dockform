import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: { department: { select: { name: true } }, lead: { select: { fullName: true } }, _count: { select: { users: true } } },
  });
  res.json(teams.map(t => ({
    id: t.id, name: t.name, department: t.department.name, lead: t.lead?.fullName || '—',
    members: t._count.users, status: t.status,
  })));
});

router.post('/', async (req, res) => {
  const { departmentId, name } = req.body;
  const team = await prisma.team.create({ data: { departmentId, name } });
  res.status(201).json(team);
});

export default router;
