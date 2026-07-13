interface FormSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  dueDay?: number;
  time?: string;
}

// Returns the start of the current recurrence window for a schedule, or null if not recurring / not yet started.
export function getCurrentOccurrenceStart(schedule: FormSchedule | undefined | null, now: Date = new Date()): Date | null {
  if (!schedule || !schedule.frequency || schedule.frequency === 'once') return null;
  const start = new Date(schedule.startDate);
  if (now < start) return null;

  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (schedule.frequency) {
    case 'daily':
      return day;
    case 'weekly': {
      const diffDays = Math.floor((day.getTime() - start.getTime()) / 86400000);
      const sinceStart = diffDays - (diffDays % 7);
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + sinceStart);
    }
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarterly': {
      const q = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), q * 3, 1);
    }
    case 'yearly':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

// For daily schedules only: reject if "now" isn't within today's window (blocks back-dated/post-dated submissions).
// `clientLocalDate` (YYYY-MM-DD), when provided, represents the submitter's own local calendar date and is
// preferred over the server's clock, since the server's timezone (e.g. UTC) can disagree with the user's
// (e.g. India, UTC+5:30) about what day it currently is.
export function isWithinDailyWindow(schedule: FormSchedule | undefined | null, now: Date = new Date(), clientLocalDate?: string): boolean {
  if (!schedule || schedule.frequency !== 'daily') return true;
  const occurrenceStart = getCurrentOccurrenceStart(schedule, now);
  if (!occurrenceStart) return false;

  if (clientLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)) {
    const [y, m, d] = clientLocalDate.split('-').map(Number);
    return new Date(y, m - 1, d).getTime() === occurrenceStart.getTime();
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return occurrenceStart.getTime() === today.getTime();
}
