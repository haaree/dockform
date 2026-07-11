import type { FormSchedule } from '../store/types';

// Returns the start of the current recurrence window for a schedule, or null if not yet started / not recurring.
export function getCurrentOccurrenceStart(schedule: FormSchedule | undefined, now: Date = new Date()): Date | null {
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
    case 'monthly': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case 'quarterly': {
      const q = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), q * 3, 1);
    }
    case 'yearly': {
      return new Date(now.getFullYear(), 0, 1);
    }
    default:
      return null;
  }
}
