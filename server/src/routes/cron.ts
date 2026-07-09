import { Router } from 'express';
import { prisma } from '../index.js';
import { sendFormDueReminderEmail } from '../lib/email.js';

const router = Router();

router.post('/send-reminders', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const appUrl = process.env.APP_URL || 'https://dockform.com';
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0');
  const currentMinute = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${currentHour}:${currentMinute}`;

  const forms = await prisma.form.findMany({
    where: { status: 'published' },
    include: { fields: true },
  });

  let sent = 0;

  for (const form of forms) {
    const meta = form.scheduleMeta as any;
    if (!meta || !meta.frequency || meta.frequency === 'once') continue;

    const scheduleTime = meta.time || '09:00';
    const [schedH] = scheduleTime.split(':');
    const [currH] = currentTime.split(':');
    if (schedH !== currH) continue;

    const shouldSendToday = checkFrequency(meta.frequency, meta.startDate, now, meta.dueDay);
    if (!shouldSendToday) continue;

    const assignedUserIds = (form as any).assignedUserIds as string[] | null;
    if (!assignedUserIds || assignedUserIds.length === 0) continue;

    const users = await prisma.user.findMany({
      where: { id: { in: assignedUserIds }, status: 'active' },
    });

    const formLink = `${appUrl}/fill/${form.id}`;
    const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    for (const user of users) {
      await sendFormDueReminderEmail(user.email, user.fullName, form.name, today, formLink);
      sent++;
    }
  }

  res.json({ ok: true, sent, time: currentTime });
});

function checkFrequency(frequency: string, startDate: string, now: Date, dueDay?: number): boolean {
  const start = new Date(startDate);
  if (now < start) return false;

  switch (frequency) {
    case 'daily':
      return true;
    case 'weekly': {
      return now.getDay() === start.getDay();
    }
    case 'monthly': {
      const day = dueDay || start.getDate();
      return now.getDate() === day;
    }
    case 'quarterly': {
      const day = dueDay || start.getDate();
      const quarterMonths = [0, 3, 6, 9];
      return now.getDate() === day && quarterMonths.includes(now.getMonth() % 3 === 0 ? now.getMonth() : -1);
    }
    case 'yearly': {
      const day = dueDay || start.getDate();
      return now.getDate() === day && now.getMonth() === start.getMonth();
    }
    default:
      return false;
  }
}

export default router;
