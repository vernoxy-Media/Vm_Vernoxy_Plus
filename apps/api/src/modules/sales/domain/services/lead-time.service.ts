import { FollowUpFlag } from '../entities/sales-lead';

/** The business runs on Indian time; "today" and "this week" are Asia/Kolkata days (UTC+5:30, no DST). */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A follow-up becomes Overdue 15 minutes after its due time (BFD section 7, Part 6). */
export const OVERDUE_GRACE_MS = 15 * 60 * 1000;

export interface DateRange {
  from: Date;
  to: Date; // exclusive
}

export function istDayRange(now: Date): DateRange {
  const istMs = now.getTime() + IST_OFFSET_MS;
  const startIst = Math.floor(istMs / DAY_MS) * DAY_MS;
  return { from: new Date(startIst - IST_OFFSET_MS), to: new Date(startIst + DAY_MS - IST_OFFSET_MS) };
}

/** Monday 00:00 IST up to next Monday 00:00 IST. */
export function istWeekRange(now: Date): DateRange {
  const day = istDayRange(now);
  const istMidnight = new Date(day.from.getTime() + IST_OFFSET_MS);
  const dow = (istMidnight.getUTCDay() + 6) % 7; // Monday = 0
  const from = new Date(day.from.getTime() - dow * DAY_MS);
  return { from, to: new Date(from.getTime() + 7 * DAY_MS) };
}

export function istMonthRange(now: Date): DateRange {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  return {
    from: new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS),
    to: new Date(Date.UTC(y, m + 1, 1) - IST_OFFSET_MS),
  };
}

/** Red "Overdue" or "Today" tag next to the next follow-up of a lead. */
export function followUpFlag(nextFollowUpAt: Date | null, now: Date): FollowUpFlag {
  if (!nextFollowUpAt) return null;
  if (nextFollowUpAt.getTime() < now.getTime() - OVERDUE_GRACE_MS) return 'overdue';
  const today = istDayRange(now);
  if (nextFollowUpAt >= today.from && nextFollowUpAt < today.to) return 'today';
  return null;
}

/** Kanban "Follow-up due": the next follow-up is today or already overdue. */
export function isFollowUpDue(nextFollowUpAt: Date | null, now: Date): boolean {
  return nextFollowUpAt !== null && nextFollowUpAt < istDayRange(now).to;
}
