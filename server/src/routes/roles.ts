import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } }, permissions: true },
  });
  res.json(roles.map((r: any) => ({
    id: r.id, name: r.name, permKey: r.key, description: r.description || '',
    users: r._count.users,
    permissions: r.permissions.filter((p: any) => p.canView).map((p: any) => p.module).join(' · ') || 'None',
    status: r.status,
  })));
});

export default router;
