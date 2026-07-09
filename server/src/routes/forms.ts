import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const forms = await prisma.form.findMany({
    where: { isTemplate: false },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { fields: true, responses: true } } },
  });
  res.json(forms.map((f: any) => ({
    id: f.id, name: f.name, fields: f._count.fields, responses: f._count.responses,
    status: f.status, updated: f.updatedAt.toISOString(), category: f.domain || 'General',
  })));
});

router.get('/:id', async (req, res) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.id },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!form) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(form);
});

router.post('/', async (req, res) => {
  const { name, description, domain, fields } = req.body;
  const form = await prisma.form.create({
    data: {
      name, description, domain, createdById: req.auth?.userId,
      fields: fields ? { create: fields.map((f: any, i: number) => ({ ...f, sortOrder: i })) } : undefined,
    },
    include: { fields: true },
  });
  res.status(201).json(form);
});

router.put('/:id', async (req, res) => {
  const { name, description, domain, status, fields } = req.body;
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
    data: { ...(name && { name }), ...(description !== undefined && { description }), ...(domain && { domain }), ...(status && { status }) },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json(form);
});

router.delete('/:id', async (req, res) => {
  await prisma.form.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
