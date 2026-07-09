import { Router } from 'express';
import { prisma } from '../index.js';
import { sendResponseSubmittedEmail } from '../lib/email.js';

const router = Router();

router.get('/', async (_req, res) => {
  const responses = await prisma.response.findMany({
    orderBy: { submittedAt: 'desc' },
    include: { form: { select: { name: true } }, user: { select: { fullName: true } }, plant: { select: { name: true } } },
  });
  res.json(responses.map((r: any) => ({
    id: r.id, form: r.form.name, submittedBy: r.user?.fullName || 'Unknown',
    plant: r.plant?.name || '—', date: r.submittedAt.toISOString(), status: r.status,
  })));
});

router.post('/', async (req, res) => {
  const { formId, plantId, values } = req.body;
  const response = await prisma.response.create({
    data: {
      formId, submittedBy: req.auth?.userId, plantId,
      values: values ? { create: values.map((v: any) => ({ fieldId: v.fieldId, value: v.value })) } : undefined,
    },
    include: { values: true },
  });
  res.status(201).json(response);

  const form = await prisma.form.findUnique({ where: { id: formId }, include: { createdBy: true } });
  if (form?.createdBy?.email) {
    const submitter = await prisma.user.findUnique({ where: { id: req.auth?.userId } });
    sendResponseSubmittedEmail(form.createdBy.email, form.createdBy.fullName, form.name, submitter?.fullName || 'Someone');
  }
});

export default router;
