import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } }, permissions: true },
  });
  res.json(roles.map(r => ({
    id: r.id, name: r.name, permKey: r.key, description: r.description || '',
    users: r._count.users,
    permissions: r.permissions.filter(p => p.canView).map(p => p.module).join(' · ') || 'None',
    status: r.status,
  })));
});

export default router;
