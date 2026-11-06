import type { DayRecord } from '../types/attendance.types';

/** The employee's shift as the API reports it ("09:30" or "09:30 AM" style times) */
export interface ShiftConfig {
  start_time?: string;
  end_time?: string;
  late_arrival_grace_minutes?: number;
  early_exit_grace_minutes?: number;
  full_day_hours?: number;
  half_day_hours?: number;
}

const DEFAULT_START = 570; // 09:30
const DEFAULT_END = 1110; // 18:30

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

function shiftTime(t: string | undefined, fallback: number): number {
  const m = t?.match(/(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  let h = parseInt(m[1], 10);
  const ap = t?.match(/(AM|PM)/i)?.[1]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + parseInt(m[2], 10);
}

export function resolveShift(shift?: ShiftConfig) {
  const start = shiftTime(shift?.start_time, DEFAULT_START);
  const end = shiftTime(shift?.end_time, DEFAULT_END);
  return {
    start,
    end,
    /** where a half-day leave splits the shift */
    split: Math.round((start + end) / 2),
    lateGrace: shift?.late_arrival_grace_minutes ?? 15,
    earlyGrace: shift?.early_exit_grace_minutes ?? 15,
    full: Math.round((shift?.full_day_hours ?? FULL_DAY_MIN / 60) * 60),
    half: Math.round((shift?.half_day_hours ?? HALF_DAY_MIN / 60) * 60),
  };
}

/** When the employee is expected to start and finish: a half-day leave removes that half of the shift */
export function expectedWindow(r: Pick<DayRecord, 'leave_half'>, shift?: ShiftConfig): { start: number; end: number } {
  const sh = resolveShift(shift);
  return {
    start: r.leave_half === 'FIRST_HALF' ? sh.split : sh.start,
    end: r.leave_half === 'SECOND_HALF' ? sh.split : sh.end,
  };
}

export function targetMinutes(r: Pick<DayRecord, 'leave_half'>, shift?: ShiftConfig): number {
  const sh = resolveShift(shift);
  return r.leave_half ? sh.half : sh.full;
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

export function arrivalOf(r: DayRecord, shift?: ShiftConfig): Arrival | null {
  const mins = clockToMinutes(r.punch_in);
  if (mins === null) return null;
  const { start } = expectedWindow(r, shift);
  const grace = resolveShift(shift).lateGrace;
  return {
    text: formatClock(mins),
    // late only after the grace period, counted from the shift start
    lateMinutes: mins > start + grace ? mins - start : 0,
    earlyMinutes: mins < start ? start - mins : 0,
    expected: formatClock(start),
  };
}

/** Time worked beyond the day's target, in minutes */
export function overtimeMinutes(r: DayRecord, shift?: ShiftConfig): number {
  return Math.max(0, Math.round((r.production_seconds || 0) / 60 - targetMinutes(r, shift)));
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

export function summarize(records: DayRecord[], shift?: ShiftConfig): AttendanceSummary {
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
    const a = arrivalOf(r, shift);
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
    if (out < expectedWindow(r, shift).end - resolveShift(shift).earlyGrace) earlyExits++;
    ot += overtimeMinutes(r, shift);
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
