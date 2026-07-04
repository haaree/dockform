import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { plants: true, users: true } } },
  });
  res.json(companies.map(c => ({
    id: c.id, name: c.name, code: c.code, type: c.type,
    plants: c._count.plants, employees: c._count.users, status: c.status,
  })));
});

router.post('/', async (req, res) => {
  const { name, code, type } = req.body;
  const company = await prisma.company.create({ data: { name, code, type: type || 'Standalone' } });
  res.status(201).json(company);
});

export default router;
