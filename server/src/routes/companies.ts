import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (req, res) => {
  const isPlatformAdmin = req.auth?.roleKey === 'platform_admin';
  const companies = await prisma.company.findMany({
    where: isPlatformAdmin ? undefined : { id: req.auth?.companyId || undefined },
    orderBy: { name: 'asc' },
    include: { _count: { select: { plants: true, users: true } } },
  });
  res.json(companies.map((c: any) => ({
    id: c.id, name: c.name, code: c.code, type: c.type,
    plants: c._count.plants, employees: c._count.users, status: c.status,
  })));
});

router.patch('/:id', async (req, res) => {
  if (req.auth?.roleKey !== 'platform_admin') { res.status(403).json({ error: 'Platform admin access required' }); return; }
  const { status } = req.body;
  const company = await prisma.company.update({ where: { id: req.params.id }, data: { status } });
  res.json(company);
});

router.post('/', async (req, res) => {
  const { name, code, type } = req.body;
  const company = await prisma.company.create({ data: { name, code, type: type || 'Standalone' } });
  res.status(201).json(company);
});

export default router;
