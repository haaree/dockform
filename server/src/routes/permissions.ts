import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const roles = await prisma.role.findMany({ include: { permissions: true }, orderBy: { name: 'asc' } });
  const result: Record<string, Array<{ id: string; module: string; view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {};
  for (const role of roles) {
    result[role.key] = role.permissions.map((p: any) => ({
      id: p.id, module: p.module, view: p.canView, create: p.canCreate, edit: p.canEdit, delete: p.canDelete,
    }));
  }
  res.json(result);
});

router.patch('/:id', async (req, res) => {
  const { canView, canCreate, canEdit, canDelete } = req.body;
  const perm = await prisma.permission.update({
    where: { id: req.params.id },
    data: { ...(canView !== undefined && { canView }), ...(canCreate !== undefined && { canCreate }), ...(canEdit !== undefined && { canEdit }), ...(canDelete !== undefined && { canDelete }) },
  });
  res.json(perm);
});

export default router;
