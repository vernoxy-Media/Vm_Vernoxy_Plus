/** Today as YYYY-MM-DD in the viewer's own time zone, so "overdue" flips at local midnight, not at UTC midnight. */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** True when a due date or deadline (YYYY-MM-DD or ISO) is before today. */
export function isPastDate(date?: string | null, now: Date = new Date()): boolean {
  return Boolean(date) && String(date).slice(0, 10) < localToday(now);
}

/** Whole days between today and a date: negative when it is already past. */
export function daysFromToday(date?: string | null, now: Date = new Date()): number | null {
  if (!date) return null;
  const a = Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${localToday(now)}T00:00:00Z`);
  if (Number.isNaN(a)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** "3 days overdue", "due today", "due in 2 days". */
export function dueLabel(date?: string | null): string | null {
  const n = daysFromToday(date);
  if (n === null) return null;
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} overdue`;
  if (n === 0) return 'Due today';
  return `Due in ${n} day${n === 1 ? '' : 's'}`;
}

/** Minutes the work went over its estimate: 0 when there is no estimate or it is still within it. */
export function minutesOverEstimate(estimated?: number | null, actual?: number | null): number {
  if (!estimated || estimated <= 0) return 0;
  return Math.max(0, (actual || 0) - estimated);
}
