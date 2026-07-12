import { Router } from 'express';
import { prisma } from '../index.js';
import { sendResponseSubmittedEmail } from '../lib/email.js';
import { isWithinDailyWindow } from '../lib/schedule.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!req.auth?.companyId) { res.json([]); return; }
  const responses = await prisma.response.findMany({
    where: { form: { companyId: req.auth.companyId } },
    orderBy: { submittedAt: 'desc' },
    include: { form: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } }, plant: { select: { name: true } }, values: true },
  });
  res.json(responses.map((r: any) => ({
    id: r.id, formId: r.form.id, form: r.form.name, submittedBy: r.user?.fullName || 'Unknown', submittedById: r.user?.id || null,
    assignedToId: r.assignedTo?.id || null, assignedToName: r.assignedTo?.fullName || null,
    plant: r.plant?.name || '—', date: r.submittedAt.toISOString(), status: r.status,
    values: Object.fromEntries(r.values.map((v: any) => [v.fieldId, v.value])),
  })));
});

router.get('/:id', async (req, res) => {
  const response = await prisma.response.findUnique({
    where: { id: req.params.id },
    include: { form: { select: { id: true, companyId: true, name: true } }, values: true },
  });
  if (!response || response.form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({
    id: response.id, formId: response.form.id, form: response.form.name, status: response.status,
    submittedById: response.submittedBy, assignedToId: response.assignedToId, date: response.submittedAt.toISOString(),
    values: Object.fromEntries(response.values.map((v: any) => [v.fieldId, v.value])),
  });
});

router.post('/', async (req, res) => {
  const { formId, plantId, values, status, assignedToId } = req.body as { formId: string; plantId?: string; values?: Record<string, string>; status?: string; assignedToId?: string };
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form || form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Form not found' }); return; }

  if (status !== 'draft' && status !== 'awaiting_supervisor' && !isWithinDailyWindow(form.scheduleMeta as any)) {
    res.status(400).json({ error: 'This form is scheduled daily and can only be submitted for today — not a past or future day.' });
    return;
  }

  const valueEntries = values ? Object.entries(values) : [];
  const response = await prisma.response.create({
    data: {
      formId, submittedBy: req.auth?.userId, plantId, assignedToId: assignedToId || null,
      status: status === 'draft' || status === 'awaiting_supervisor' ? status : 'submitted',
      values: valueEntries.length > 0 ? { create: valueEntries.map(([fieldId, value]) => ({ fieldId, value })) } : undefined,
    },
    include: { values: true },
  });
  res.status(201).json(response);

  if (response.status === 'submitted') {
    const formWithCreator = await prisma.form.findUnique({ where: { id: formId }, include: { createdBy: true } });
    if (formWithCreator?.createdBy?.email) {
      const submitter = await prisma.user.findUnique({ where: { id: req.auth?.userId } });
      sendResponseSubmittedEmail(formWithCreator.createdBy.email, formWithCreator.createdBy.fullName, formWithCreator.name, submitter?.fullName || 'Someone');
    }
  }
});

router.patch('/:id', async (req, res) => {
  const existing = await prisma.response.findUnique({ where: { id: req.params.id }, include: { form: true } });
  if (!existing || existing.form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  const isOwner = existing.submittedBy === req.auth?.userId || existing.assignedToId === req.auth?.userId;
  if (!isOwner) { res.status(403).json({ error: 'Not your response' }); return; }

  const { values, status, assignedToId } = req.body as { values?: Record<string, string>; status?: string; assignedToId?: string };

  if (status && status !== 'draft' && status !== 'awaiting_supervisor' && !isWithinDailyWindow(existing.form.scheduleMeta as any)) {
    res.status(400).json({ error: 'This form is scheduled daily and can only be submitted for today — not a past or future day.' });
    return;
  }

  if (values) {
    const valueEntries = Object.entries(values);
    await prisma.responseValue.deleteMany({ where: { responseId: req.params.id } });
    if (valueEntries.length > 0) {
      await prisma.responseValue.createMany({
        data: valueEntries.map(([fieldId, value]) => ({ responseId: req.params.id, fieldId, value })),
      });
    }
  }
  const response = await prisma.response.update({
    where: { id: req.params.id },
    data: { ...(status && { status }), ...(assignedToId !== undefined && { assignedToId: assignedToId || null }) },
    include: { values: true },
  });
  res.json(response);

  if (status === 'submitted') {
    const formWithCreator = await prisma.form.findUnique({ where: { id: existing.formId }, include: { createdBy: true } });
    if (formWithCreator?.createdBy?.email) {
      const submitter = await prisma.user.findUnique({ where: { id: req.auth?.userId } });
      sendResponseSubmittedEmail(formWithCreator.createdBy.email, formWithCreator.createdBy.fullName, formWithCreator.name, submitter?.fullName || 'Someone');
    }
  }
});

export default router;
