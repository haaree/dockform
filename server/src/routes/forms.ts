import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

function toListItem(f: any) {
  return {
    id: f.id, name: f.name, fields: f._count?.fields ?? f.fields?.length ?? 0,
    responses: f._count?.responses ?? 0, status: f.status, updated: f.updatedAt.toISOString(),
    category: f.domain || 'General', companyId: f.companyId,
    assignedUserIds: f.assignedUserIds || [], schedule: f.scheduleMeta || undefined,
  };
}

router.get('/', async (req, res) => {
  const forms = await prisma.form.findMany({
    where: { isTemplate: false, companyId: req.auth?.companyId || undefined },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { fields: true, responses: true } } },
  });
  res.json(forms.map(toListItem));
});

router.get('/:id', async (req, res) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.id },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!form || form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(form);
});

router.post('/', async (req, res) => {
  const { name, description, domain, fields } = req.body;
  const form = await prisma.form.create({
    data: {
      name, description, domain, createdById: req.auth?.userId, companyId: req.auth?.companyId,
      fields: fields ? {
        create: fields.map((f: any, i: number) => ({
          sortOrder: i, type: f.type, label: f.label,
          placeholder: f.placeholder || '', helpText: f.helpText || '', defaultValue: f.defaultValue || '',
          options: f.options || [], validation: f.validation || {}, isRequired: f.required || false,
          isReadOnly: f.readOnly || false, isHidden: f.hidden || false,
          isSearchable: f.searchable || false, isIndexed: f.indexed || false, logic: f.logic || [],
        })),
      } : undefined,
    },
    include: { fields: true },
  });
  res.status(201).json(form);
});

router.put('/:id', async (req, res) => {
  const existing = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }

  const { name, description, domain, status, fields, schedule } = req.body as { name?: string; description?: string; domain?: string; status?: string; fields?: any[]; schedule?: unknown };
  try {
    if (fields) {
      await prisma.formField.deleteMany({ where: { formId: req.params.id } });
      await prisma.formField.createMany({
        data: fields.map((f: any, i: number) => ({
          formId: req.params.id, sortOrder: i, type: f.type, label: f.label,
          placeholder: f.placeholder || '', helpText: f.helpText || '', defaultValue: f.defaultValue || '',
          options: f.options || [], validation: f.validation || {}, isRequired: f.required || false,
          isReadOnly: f.readOnly || false, isHidden: f.hidden || false,
          isSearchable: f.searchable || false, isIndexed: f.indexed || false, logic: f.logic || [],
        })),
      });
    }
    const form = await prisma.form.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }), ...(description !== undefined && { description }),
        ...(domain && { domain }), ...(status && { status }),
        ...(schedule !== undefined && { scheduleMeta: schedule as any }),
      },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json(form);
  } catch (err: any) {
    console.error('[PUT /forms/:id] failed:', err?.message, err?.meta);
    res.status(500).json({ error: 'Failed to update form', detail: err?.message });
  }
});

router.patch('/:id/assignment', async (req, res) => {
  const existing = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  const { assignedUserIds } = req.body;
  const form = await prisma.form.update({ where: { id: req.params.id }, data: { assignedUserIds: assignedUserIds || [] } });
  res.json(toListItem({ ...form, _count: undefined }));
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.form.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
