import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [formCount, responseCount, userCount, plantCount, recentForms] = await Promise.all([
    prisma.form.count({ where: { isTemplate: false } }),
    prisma.response.count(),
    prisma.user.count(),
    prisma.plant.count(),
    prisma.form.findMany({ where: { isTemplate: false }, orderBy: { updatedAt: 'desc' }, take: 5, include: { _count: { select: { fields: true, responses: true } } } }),
  ]);

  res.json({
    stats: { forms: formCount, responses: responseCount, users: userCount, plants: plantCount },
    recentForms: recentForms.map((f: any) => ({
      id: f.id, name: f.name, fields: f._count.fields, responses: f._count.responses,
      status: f.status, updated: f.updatedAt.toISOString(), category: f.domain || 'General',
    })),
  });
});

export default router;
