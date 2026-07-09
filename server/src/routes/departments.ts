import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const depts = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { plant: { select: { name: true } }, head: { select: { fullName: true } }, _count: { select: { users: true } } },
  });
  res.json(depts.map((d: any) => ({
    id: d.id, name: d.name, plant: d.plant.name, head: d.head?.fullName || '—',
    headcount: d._count.users, status: d.status,
  })));
});

router.post('/', async (req, res) => {
  const { plantId, name } = req.body;
  const dept = await prisma.department.create({ data: { plantId, name } });
  res.status(201).json(dept);
});

export default router;
