import { Router } from 'express';
import { prisma } from '../index.js';
import { sendResponseSubmittedEmail } from '../lib/email.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!req.auth?.companyId) { res.json([]); return; }
  const responses = await prisma.response.findMany({
    where: { form: { companyId: req.auth.companyId } },
    orderBy: { submittedAt: 'desc' },
    include: { form: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true } }, plant: { select: { name: true } }, values: true },
  });
  res.json(responses.map((r: any) => ({
    id: r.id, formId: r.form.id, form: r.form.name, submittedBy: r.user?.fullName || 'Unknown', submittedById: r.user?.id || null,
    plant: r.plant?.name || '—', date: r.submittedAt.toISOString(), status: r.status,
    values: Object.fromEntries(r.values.map((v: any) => [v.fieldId, v.value])),
  })));
});

router.post('/', async (req, res) => {
  const { formId, plantId, values } = req.body as { formId: string; plantId?: string; values?: Record<string, string> };
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form || form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Form not found' }); return; }

  const valueEntries = values ? Object.entries(values) : [];
  const response = await prisma.response.create({
    data: {
      formId, submittedBy: req.auth?.userId, plantId,
      values: valueEntries.length > 0 ? { create: valueEntries.map(([fieldId, value]) => ({ fieldId, value })) } : undefined,
    },
    include: { values: true },
  });
  res.status(201).json(response);

  const formWithCreator = await prisma.form.findUnique({ where: { id: formId }, include: { createdBy: true } });
  if (formWithCreator?.createdBy?.email) {
    const submitter = await prisma.user.findUnique({ where: { id: req.auth?.userId } });
    sendResponseSubmittedEmail(formWithCreator.createdBy.email, formWithCreator.createdBy.fullName, formWithCreator.name, submitter?.fullName || 'Someone');
  }
});

export default router;
