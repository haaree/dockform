import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

function toListItem(f: any) {
  return {
    id: f.id, name: f.name, fields: f._count?.fields ?? f.fields?.length ?? 0,
    responses: f._count?.responses ?? 0, status: f.status, updated: f.updatedAt.toISOString(),
    category: f.domain || 'General', companyId: f.companyId,
    assignedUserIds: f.assignedUserIds === null || f.assignedUserIds === undefined ? null : f.assignedUserIds,
    schedule: f.scheduleMeta || undefined,
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
  const existing = await prisma.form.findUnique({ where: { id: req.params.id }, include: { fields: { include: { _count: { select: { responseValues: true } } } } } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }

  const { name, description, domain, status, fields, schedule } = req.body as { name?: string; description?: string; domain?: string; status?: string; fields?: any[]; schedule?: unknown };
  try {
    if (fields) {
      const existingIds = new Set(existing.fields.map(f => f.id));
      const incomingIds = new Set(fields.map((f: any) => f.id).filter((id: string) => existingIds.has(id)));

      // Fields removed in the editor: delete if unanswered, otherwise keep (hidden) so existing responses stay valid.
      for (const f of existing.fields) {
        if (incomingIds.has(f.id)) continue;
        if (f._count.responseValues === 0) {
          await prisma.formField.delete({ where: { id: f.id } });
        } else {
          await prisma.formField.update({ where: { id: f.id }, data: { isHidden: true } });
        }
      }

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const data = {
          sortOrder: i, type: f.type, label: f.label,
          placeholder: f.placeholder || '', helpText: f.helpText || '', defaultValue: f.defaultValue || '',
          options: f.options || [], validation: f.validation || {}, isRequired: f.required || false,
          isReadOnly: f.readOnly || false, isHidden: f.hidden || false,
          isSearchable: f.searchable || false, isIndexed: f.indexed || false, logic: f.logic || [],
        };
        if (existingIds.has(f.id)) {
          await prisma.formField.update({ where: { id: f.id }, data });
        } else {
          await prisma.formField.create({ data: { ...data, formId: req.params.id } });
        }
      }
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
  const { assignedUserIds } = req.body as { assignedUserIds?: string[] };
  const nextIds: string[] = Array.isArray(assignedUserIds) ? assignedUserIds : [];
  const form = await prisma.form.update({ where: { id: req.params.id }, data: { assignedUserIds: nextIds } });

  // If the form is restricted to a specific set of users, clear any in-progress
  // response assignment for users who were just revoked, so it stops appearing
  // in their Pending list.
  const previousIds: string[] = Array.isArray(existing.assignedUserIds) ? existing.assignedUserIds as string[] : [];
  if (nextIds.length > 0) {
    const revokedIds = previousIds.filter((id) => !nextIds.includes(id));
    if (revokedIds.length > 0) {
      await prisma.response.updateMany({
        where: { formId: req.params.id, assignedToId: { in: revokedIds }, status: { in: ['draft', 'awaiting_supervisor'] } },
        data: { assignedToId: null },
      });
    }
  }

  res.json(toListItem({ ...form, _count: undefined }));
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  try {
    await prisma.response.deleteMany({ where: { formId: req.params.id } });
    await prisma.form.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err: any) {
    console.error('[DELETE /forms/:id] failed:', err?.message, err?.meta);
    res.status(500).json({ error: 'Failed to delete form', detail: err?.message });
  }
});

export default router;
