import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const plants = await prisma.plant.findMany({
    orderBy: { name: 'asc' },
    include: { company: { select: { name: true } } },
  });
  res.json(plants.map(p => ({
    id: p.id, name: p.name, code: p.code, company: p.company.name,
    location: p.location || '', capacity: p.capacityWorkers ? `${p.capacityWorkers} workers` : '', status: p.status,
  })));
});

router.post('/', async (req, res) => {
  const { companyId, name, code, location, capacityWorkers } = req.body;
  const plant = await prisma.plant.create({ data: { companyId, name, code, location, capacityWorkers } });
  res.status(201).json(plant);
});

export default router;
