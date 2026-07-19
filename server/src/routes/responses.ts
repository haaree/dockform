import { Router } from 'express';
import { prisma } from '../index.js';
import { sendResponseSubmittedEmail, sendApprovalRequestedEmail, sendChangesRequestedEmail, sendResponseApprovedEmail } from '../lib/email.js';
import { isWithinDailyWindow, isWithinDailyWindowForSync } from '../lib/schedule.js';
import { splitAnnotations, mergeAnnotations } from '../lib/annotations.js';

const router = Router();

// Statuses that represent "still in progress, not a final submission" -- these skip the
// daily-scheduling date gate (a form moving through drafting, handoff, or the approval
// loop shouldn't get blocked by "only submittable today", since it isn't the final
// submission yet) and are passed through as-is on create rather than collapsing to
// 'submitted'. Anything not in this list is treated as a final submission.
const IN_PROGRESS_STATUSES = ['draft', 'awaiting_supervisor', 'awaiting_approval', 'changes_requested'];

// List view: metadata only, no field values. Full response bodies (which can embed large
// base64 images/signatures for pre-R2 or fallback-path data) would otherwise turn a single
// list load into tens of MB — this list is used for counts/status everywhere in the app, so
// it stays cheap; anything that needs actual field values fetches them explicitly (below).
router.get('/', async (req, res) => {
  if (!req.auth?.companyId) { res.json([]); return; }
  try {
    const responses = await prisma.response.findMany({
      where: { form: { companyId: req.auth.companyId } },
      orderBy: { submittedAt: 'desc' },
      include: { form: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } }, plant: { select: { name: true } } },
    });
    res.json(responses.map((r: any) => ({
      id: r.id, formId: r.form.id, form: r.form.name, submittedBy: r.user?.fullName || 'Unknown', submittedById: r.user?.id || null,
      assignedToId: r.assignedTo?.id || null, assignedToName: r.assignedTo?.fullName || null,
      plant: r.plant?.name || '—', date: r.submittedAt.toISOString(), status: r.status,
    })));
  } catch (err: any) {
    console.error('[GET /responses] failed:', err?.message, err?.meta);
    res.status(500).json({ error: 'Failed to load responses', detail: err?.message });
  }
});

// Paginated, filterable metadata list for the main Responses screen's table. Same shape as
// GET / but with server-side page/limit/search/status/form filtering and a total count, so
// the screen doesn't need to hold the whole company's response history in the browser as it
// grows. GET / stays unpaginated because Dashboard counts, FormsScreen per-form counts, and
// FormFiller's own-draft/handoff lookup all need the complete set, not a page of it.
router.get('/page', async (req, res) => {
  if (!req.auth?.companyId) { res.json({ items: [], total: 0 }); return; }
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = (req.query.search as string || '').trim();
  const status = (req.query.status as string || '').trim();
  const formId = (req.query.formId as string || '').trim();

  const where: any = { form: { companyId: req.auth.companyId } };
  if (status) where.status = status;
  if (formId) where.formId = formId;
  if (search) {
    where.OR = [
      { form: { name: { contains: search, mode: 'insensitive' } } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  try {
    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { form: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } }, plant: { select: { name: true } } },
      }),
      prisma.response.count({ where }),
    ]);
    res.json({
      items: responses.map((r: any) => ({
        id: r.id, formId: r.form.id, form: r.form.name, submittedBy: r.user?.fullName || 'Unknown', submittedById: r.user?.id || null,
        assignedToId: r.assignedTo?.id || null, assignedToName: r.assignedTo?.fullName || null,
        plant: r.plant?.name || '—', date: r.submittedAt.toISOString(), status: r.status,
      })),
      total,
    });
  } catch (err: any) {
    console.error('[GET /responses/page] failed:', err?.message, err?.meta);
    res.status(500).json({ error: 'Failed to load responses', detail: err?.message });
  }
});

// Full values for every response of one form — used by the per-form Responses/export screen,
// which needs actual field data (photos, signatures, checklist results) to render and export.
router.get('/full', async (req, res) => {
  if (!req.auth?.companyId) { res.json([]); return; }
  const formId = req.query.formId as string | undefined;
  if (!formId) { res.status(400).json({ error: 'formId is required' }); return; }
  try {
    const responses = await prisma.response.findMany({
      where: { formId, form: { companyId: req.auth.companyId } },
      orderBy: { submittedAt: 'desc' },
      include: { form: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } }, plant: { select: { name: true } }, values: true, annotations: true },
    });
    res.json(responses.map((r: any) => ({
      id: r.id, formId: r.form.id, form: r.form.name, submittedBy: r.user?.fullName || 'Unknown', submittedById: r.user?.id || null,
      assignedToId: r.assignedTo?.id || null, assignedToName: r.assignedTo?.fullName || null,
      plant: r.plant?.name || '—', date: r.submittedAt.toISOString(), status: r.status,
      values: mergeAnnotations(Object.fromEntries(r.values.map((v: any) => [v.fieldId, v.value])), r.annotations),
    })));
  } catch (err: any) {
    console.error('[GET /responses/full] failed:', err?.message, err?.meta);
    res.status(500).json({ error: 'Failed to load responses', detail: err?.message });
  }
});

router.get('/:id', async (req, res) => {
  const response = await prisma.response.findUnique({
    where: { id: req.params.id },
    include: { form: { select: { id: true, companyId: true, name: true } }, values: true, annotations: true },
  });
  if (!response || response.form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({
    id: response.id, formId: response.form.id, form: response.form.name, status: response.status,
    submittedById: response.submittedBy, assignedToId: response.assignedToId, date: response.submittedAt.toISOString(),
    values: mergeAnnotations(Object.fromEntries(response.values.map((v: any) => [v.fieldId, v.value])), response.annotations),
  });
});

router.post('/', async (req, res) => {
  const { formId, plantId, values, status, assignedToId, clientLocalDate, offlineSync } = req.body as { formId: string; plantId?: string; values?: Record<string, string>; status?: string; assignedToId?: string; clientLocalDate?: string; offlineSync?: boolean };
  try {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Form not found' }); return; }

    // A response queued while offline is only reaching the server now that connectivity is
    // back, potentially days after it was actually filled in -- so it's checked against any
    // recent daily occurrence (isWithinDailyWindowForSync), not strictly today
    // (isWithinDailyWindow), which stays strict for normal live submissions.
    const withinWindow = !(status && IN_PROGRESS_STATUSES.includes(status)) ? (offlineSync
      ? isWithinDailyWindowForSync(form.scheduleMeta as any, new Date(), clientLocalDate)
      : isWithinDailyWindow(form.scheduleMeta as any, new Date(), clientLocalDate)) : true;
    if (!withinWindow) {
      res.status(400).json({ error: 'This form is scheduled daily and can only be submitted for today — not a past or future day.' });
      return;
    }

    const { fieldValues, annotations } = splitAnnotations(values || {});
    const valueEntries = Object.entries(fieldValues);
    const response = await prisma.response.create({
      data: {
        formId, submittedBy: req.auth?.userId, plantId, assignedToId: assignedToId || null,
        status: status && IN_PROGRESS_STATUSES.includes(status) ? status : 'submitted',
        values: valueEntries.length > 0 ? { create: valueEntries.map(([fieldId, value]) => ({ fieldId, value })) } : undefined,
        annotations: annotations.length > 0 ? { create: annotations } : undefined,
      },
      include: { values: true, annotations: true },
    });
    res.status(201).json(response);

    if (response.status === 'submitted') {
      const formWithCreator = await prisma.form.findUnique({ where: { id: formId }, include: { createdBy: true } });
      if (formWithCreator?.createdBy?.email) {
        const submitter = await prisma.user.findUnique({ where: { id: req.auth?.userId } });
        sendResponseSubmittedEmail(formWithCreator.createdBy.email, formWithCreator.createdBy.fullName, formWithCreator.name, submitter?.fullName || 'Someone');
      }
    }
  } catch (err: any) {
    console.error('[POST /responses] failed:', err?.message, err?.meta);
    res.status(500).json({ error: 'Failed to save response', detail: err?.message });
  }
});

router.patch('/:id', async (req, res) => {
 try {
  const existing = await prisma.response.findUnique({ where: { id: req.params.id }, include: { form: true } });
  if (!existing || existing.form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  const isOwner = existing.submittedBy === req.auth?.userId || existing.assignedToId === req.auth?.userId;
  if (!isOwner) { res.status(403).json({ error: 'Not your response' }); return; }

  const { values, status, assignedToId, clientLocalDate, overallComment, fieldComments, offlineSync } = req.body as {
    values?: Record<string, string>; status?: string; assignedToId?: string; clientLocalDate?: string; offlineSync?: boolean;
    // Only meaningful when status is being set to 'changes_requested' -- the manager's
    // review notes for this round. overallComment is a whole-response note (fieldId null);
    // fieldComments target a specific field, optionally scoped to one repeatable-section
    // instance via instanceId (a repeatable field's fieldId alone can't tell "Area 2's
    // reading" apart from "Area 5's").
    overallComment?: string;
    fieldComments?: { fieldId: string; instanceId?: string; text: string }[];
  };

  const withinWindow = status && !IN_PROGRESS_STATUSES.includes(status) ? (offlineSync
    ? isWithinDailyWindowForSync(existing.form.scheduleMeta as any, new Date(), clientLocalDate)
    : isWithinDailyWindow(existing.form.scheduleMeta as any, new Date(), clientLocalDate)) : true;
  if (!withinWindow) {
    res.status(400).json({ error: 'This form is scheduled daily and can only be submitted for today — not a past or future day.' });
    return;
  }

  if (values) {
    const { fieldValues, annotations } = splitAnnotations(values);
    const valueEntries = Object.entries(fieldValues);
    await prisma.responseValue.deleteMany({ where: { responseId: req.params.id } });
    if (valueEntries.length > 0) {
      await prisma.responseValue.createMany({
        data: valueEntries.map(([fieldId, value]) => ({ responseId: req.params.id, fieldId, value })),
      });
    }
    await prisma.responseAnnotation.deleteMany({ where: { responseId: req.params.id } });
    if (annotations.length > 0) {
      await prisma.responseAnnotation.createMany({
        data: annotations.map(a => ({ responseId: req.params.id, ...a })),
      });
    }
  }

  // Resubmitting after changes_requested addresses every open comment from that round --
  // there's no per-comment "mark resolved" UI, so a fresh awaiting_approval submission is
  // itself the signal that the submitter has acted on the prior feedback.
  if (status === 'awaiting_approval') {
    await prisma.responseComment.updateMany({ where: { responseId: req.params.id, resolved: false }, data: { resolved: true } });
  }

  if (status === 'changes_requested') {
    const newComments: { responseId: string; fieldId?: string; instanceId?: string; text: string; authorId?: string }[] = [];
    if (overallComment && overallComment.trim()) {
      newComments.push({ responseId: req.params.id, text: overallComment.trim(), authorId: req.auth?.userId });
    }
    if (Array.isArray(fieldComments)) {
      for (const c of fieldComments) {
        if (c.text && c.text.trim() && c.fieldId) {
          newComments.push({ responseId: req.params.id, fieldId: c.fieldId, instanceId: c.instanceId, text: c.text.trim(), authorId: req.auth?.userId });
        }
      }
    }
    if (newComments.length > 0) {
      await prisma.responseComment.createMany({ data: newComments });
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

  if (status === 'awaiting_approval' && response.assignedToId) {
    const [manager, actor] = await Promise.all([
      prisma.user.findUnique({ where: { id: response.assignedToId } }),
      prisma.user.findUnique({ where: { id: req.auth?.userId } }),
    ]);
    if (manager?.email) sendApprovalRequestedEmail(manager.email, manager.fullName, existing.form.name, actor?.fullName || 'Someone');
  }

  if (status === 'changes_requested' && response.submittedBy) {
    const [submitter, actor] = await Promise.all([
      prisma.user.findUnique({ where: { id: response.submittedBy } }),
      prisma.user.findUnique({ where: { id: req.auth?.userId } }),
    ]);
    if (submitter?.email) sendChangesRequestedEmail(submitter.email, submitter.fullName, existing.form.name, actor?.fullName || 'Someone');
  }

  if (status === 'approved' && response.submittedBy) {
    const [submitter, actor] = await Promise.all([
      prisma.user.findUnique({ where: { id: response.submittedBy } }),
      prisma.user.findUnique({ where: { id: req.auth?.userId } }),
    ]);
    if (submitter?.email) sendResponseApprovedEmail(submitter.email, submitter.fullName, existing.form.name, actor?.fullName || 'Someone');
  }
 } catch (err: any) {
  console.error('[PATCH /responses/:id] failed:', err?.message, err?.meta);
  res.status(500).json({ error: 'Failed to save response', detail: err?.message });
 }
});

router.get('/:id/comments', async (req, res) => {
  const response = await prisma.response.findUnique({ where: { id: req.params.id }, include: { form: true } });
  if (!response || response.form.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Not found' }); return; }
  const comments = await prisma.responseComment.findMany({
    where: { responseId: req.params.id },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { fullName: true } } },
  });
  res.json(comments.map((c: any) => ({
    id: c.id, fieldId: c.fieldId, instanceId: c.instanceId, text: c.text,
    authorName: c.author?.fullName || 'Someone', resolved: c.resolved, createdAt: c.createdAt.toISOString(),
  })));
});

export default router;
