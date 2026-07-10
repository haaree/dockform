import { Router } from 'express';
import {
  sendWelcomeEmail,
  sendAdminNewSignupEmail,
  sendAccountApprovedEmail,
  sendAccountSuspendedEmail,
  sendFormAssignedEmail,
  sendFormDueReminderEmail,
  sendInviteEmail,
} from '../lib/email.js';

const router = Router();

router.post('/welcome', async (req, res) => {
  const { to, fullName } = req.body;
  if (!to || !fullName) { res.status(400).json({ error: 'to and fullName required' }); return; }
  await sendWelcomeEmail(to, fullName);
  if (process.env.ADMIN_EMAIL) {
    await sendAdminNewSignupEmail(process.env.ADMIN_EMAIL, fullName, to);
  }
  res.json({ ok: true });
});

router.post('/account-approved', async (req, res) => {
  const { to, fullName, plan } = req.body;
  if (!to || !fullName) { res.status(400).json({ error: 'to and fullName required' }); return; }
  await sendAccountApprovedEmail(to, fullName, plan || 'Trial');
  res.json({ ok: true });
});

router.post('/account-suspended', async (req, res) => {
  const { to, fullName } = req.body;
  if (!to || !fullName) { res.status(400).json({ error: 'to and fullName required' }); return; }
  await sendAccountSuspendedEmail(to, fullName);
  res.json({ ok: true });
});

router.post('/form-assigned', async (req, res) => {
  const { to, fullName, formName, assignedBy, formId } = req.body;
  if (!to || !fullName || !formName) { res.status(400).json({ error: 'to, fullName, formName required' }); return; }
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const formLink = formId ? `${appUrl}?fill=${formId}` : undefined;
  await sendFormAssignedEmail(to, fullName, formName, assignedBy || 'DockForm Admin', formLink);
  res.json({ ok: true });
});

router.post('/form-reminder', async (req, res) => {
  const { to, fullName, formName, dueDate, formLink } = req.body;
  if (!to || !fullName || !formName) { res.status(400).json({ error: 'to, fullName, formName required' }); return; }
  await sendFormDueReminderEmail(to, fullName, formName, dueDate || 'Today', formLink);
  res.json({ ok: true });
});

router.post('/invite', async (req, res) => {
  const { to, fullName } = req.body;
  if (!to || !fullName) { res.status(400).json({ error: 'to and fullName required' }); return; }
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const signupLink = `${appUrl}?signup=true`;
  await sendInviteEmail(to, fullName, signupLink);
  res.json({ ok: true });
});

export default router;
