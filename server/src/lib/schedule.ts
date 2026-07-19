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

// Same idea as isWithinDailyWindow, but for a response that was captured offline and is only
// syncing now that connectivity is back -- by the time it reaches the server, "today" may no
// longer be the day it was actually filled in. Accepts clientLocalDate if it matches *any* daily
// occurrence within the last `maxDaysBack` days (not just today), since the whole point of an
// offline queue is that the sync can lag capture by more than zero days. Deliberately not folded
// into isWithinDailyWindow itself -- that function's same-day-only behavior is the correct check
// for a live, online submission, and should stay strict there.
export function isWithinDailyWindowForSync(schedule: FormSchedule | undefined | null, now: Date, clientLocalDate: string | undefined, maxDaysBack = 7): boolean {
  if (!schedule || schedule.frequency !== 'daily') return true;
  if (!clientLocalDate || !/^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)) return false;
  const [y, m, d] = clientLocalDate.split('-').map(Number);
  const claimed = new Date(y, m - 1, d).getTime();

  for (let i = 0; i <= maxDaysBack; i++) {
    const check = new Date(now);
    check.setDate(check.getDate() - i);
    const occurrenceStart = getCurrentOccurrenceStart(schedule, check);
    if (occurrenceStart && occurrenceStart.getTime() === claimed) return true;
  }
  return false;
}
