/**
 * Pure date helpers for the Leave module.
 * All dates are handled as 'YYYY-MM-DD' strings (calendar dates, no time zone).
 */

export const LEAVE_TIMEZONE = process.env.LEAVE_TIMEZONE || 'Asia/Kolkata';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Normalises a Date (UTC-midnight from Postgres) or string to 'YYYY-MM-DD'. */
export function toDateStr(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

/** Today's calendar date in the company time zone. */
export function todayStr(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LEAVE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA gives YYYY-MM-DD
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

export function dayOfWeek(s: string): number {
  return parseDate(s).getUTCDay();
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return toDateStr(d) === s;
}

/** "Fri 06 Nov" */
export function fmtDayShort(s: string): string {
  const d = parseDate(s);
  return `${DAYS[d.getUTCDay()]} ${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}`;
}

/** "06 Nov" */
export function fmtDayMonth(s: string): string {
  const d = parseDate(s);
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}`;
}

/** "06 Nov 2026" */
export function fmtDate(s: string): string {
  const d = parseDate(s);
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function monthName(month1: number): string {
  return MONTHS_LONG[month1 - 1];
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

// -----------------------------------------------------------------------------
// Leave year
// -----------------------------------------------------------------------------

export type LeaveYearStart = 'JANUARY_TO_DECEMBER' | 'APRIL_TO_MARCH';

export function leaveYearStartMonth(setting: LeaveYearStart | string | null | undefined): number {
  return setting === 'APRIL_TO_MARCH' ? 4 : 1;
}

/** The leave year a date belongs to, named by the calendar year in which it starts. */
export function leaveYearOf(date: string, startMonth: number): number {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  return m >= startMonth ? y : y - 1;
}

export function leaveYearRange(year: number, startMonth: number): { start: string; end: string } {
  const start = `${year}-${pad2(startMonth)}-01`;
  const nextStart = `${year + 1}-${pad2(startMonth)}-01`;
  return { start, end: addDays(nextStart, -1) };
}

export function leaveYearLabel(year: number, startMonth: number): string {
  return startMonth === 1 ? String(year) : `${year}-${String(year + 1).slice(2)}`;
}

/** Months from the given date's month to the end of its leave year, both inclusive. */
export function monthsLeftInLeaveYear(date: string, startMonth: number): number {
  const year = leaveYearOf(date, startMonth);
  const { end } = leaveYearRange(year, startMonth);
  const y1 = Number(date.slice(0, 4));
  const m1 = Number(date.slice(5, 7));
  const y2 = Number(end.slice(0, 4));
  const m2 = Number(end.slice(5, 7));
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/** First-of-month dates from start to end inclusive (by month). */
export function monthStarts(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  let y = Number(fromDate.slice(0, 4));
  let m = Number(fromDate.slice(5, 7));
  const endKey = toDate.slice(0, 7);
  let guard = 0;
  while (`${y}-${pad2(m)}` <= endKey && guard < 240) {
    out.push(`${y}-${pad2(m)}-01`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    guard++;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Numbers
// -----------------------------------------------------------------------------

export function roundDownHalf(n: number): number {
  return Math.floor(n * 2 + 1e-9) / 2;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function num(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function isHalfStep(n: number): boolean {
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}
