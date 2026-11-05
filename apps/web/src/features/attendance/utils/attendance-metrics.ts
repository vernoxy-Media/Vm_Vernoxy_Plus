import type { DayRecord } from '../types/attendance.types';

/** General shift 09:00 – 17:30, split into two halves at 13:15 (used for half-day leaves) */
export const SHIFT_START_MIN = 540;
export const SHIFT_END_MIN = 1050;
export const HALF_SPLIT_MIN = 795;
export const FULL_DAY_MIN = 480;
export const HALF_DAY_MIN = 240;

/** "09:34 AM", "9:34 pm" or "13:05" → minutes since midnight */
export function clockToMinutes(t?: string | null): number | null {
  const m = t?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + parseInt(m[2], 10);
}

/** When the employee is expected to start and finish: a half-day leave removes that half of the shift */
export function expectedWindow(r: Pick<DayRecord, 'leave_half'>): { start: number; end: number } {
  return {
    start: r.leave_half === 'FIRST_HALF' ? HALF_SPLIT_MIN : SHIFT_START_MIN,
    end: r.leave_half === 'SECOND_HALF' ? HALF_SPLIT_MIN : SHIFT_END_MIN,
  };
}

export function targetMinutes(r: Pick<DayRecord, 'leave_half'>): number {
  return r.leave_half ? HALF_DAY_MIN : FULL_DAY_MIN;
}

export interface Arrival {
  text: string;
  lateMinutes: number;
  earlyMinutes: number;
  /** the time the employee was expected, e.g. "09:00 AM" */
  expected: string;
}

export function formatClock(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function arrivalOf(r: DayRecord): Arrival | null {
  const mins = clockToMinutes(r.punch_in);
  if (mins === null) return null;
  const { start } = expectedWindow(r);
  return {
    text: formatClock(mins),
    lateMinutes: mins > start ? mins - start : 0,
    earlyMinutes: mins < start ? start - mins : 0,
    expected: formatClock(start),
  };
}

/** Time worked beyond the day's target, in minutes */
export function overtimeMinutes(r: DayRecord): number {
  return Math.max(0, Math.round((r.production_seconds || 0) / 60 - targetMinutes(r)));
}

/** "34 min" or "1 hr 34 min" */
export function describeMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}

export interface AttendanceSummary {
  punchedDays: number;
  onTimeDays: number;
  onTimePct: number;
  lateDays: number;
  lateMinutes: number;
  earlyDays: number;
  earlyExits: number;
  missingClockOuts: number;
  overtimeMinutes: number;
  avgWorkedSeconds: number;
}

export function summarize(records: DayRecord[]): AttendanceSummary {
  let punchedDays = 0;
  let onTimeDays = 0;
  let lateDays = 0;
  let lateMinutes = 0;
  let earlyDays = 0;
  let earlyExits = 0;
  let missingClockOuts = 0;
  let ot = 0;
  let closedDays = 0;
  let closedSeconds = 0;

  for (const r of records) {
    const a = arrivalOf(r);
    if (!a) continue;
    punchedDays++;
    if (a.lateMinutes > 0) {
      lateDays++;
      lateMinutes += a.lateMinutes;
    } else {
      onTimeDays++;
      if (a.earlyMinutes > 0) earlyDays++;
    }

    const out = clockToMinutes(r.punch_out);
    if (out === null) {
      if (!r.is_today) missingClockOuts++;
      continue;
    }
    closedDays++;
    closedSeconds += r.production_seconds || 0;
    if (out < expectedWindow(r).end) earlyExits++;
    ot += overtimeMinutes(r);
  }

  return {
    punchedDays,
    onTimeDays,
    onTimePct: punchedDays ? Math.round((onTimeDays / punchedDays) * 100) : 0,
    lateDays,
    lateMinutes,
    earlyDays,
    earlyExits,
    missingClockOuts,
    overtimeMinutes: ot,
    avgWorkedSeconds: closedDays ? Math.round(closedSeconds / closedDays) : 0,
  };
}
