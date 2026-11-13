/**
 * Turns what the database holds into the records the Attendance Analytics dashboard draws.
 *
 * The database stores only the days an employee punched in (present, half_day, short, incomplete). Absent and
 * on-leave days are not stored, so they are worked out here: a working day that has passed, after the employee joined,
 * with no punch, is absent, or on leave when an approved leave covers it. Late and early are measured in Indian time
 * against the employee's shift and its grace minutes.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type AnalyticsDayStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'missing_punch';

export interface AnalyticsEmployee {
  emp_id: number;
  name: string;
  email: string;
  department: string;
  designation: string;
  joining_date: string | null;
  /** False for someone who has left: their past punches still count, but they cannot be absent. Default true. */
  active?: boolean;
}

export interface AnalyticsShift {
  /** Minutes after midnight, in Indian time. */
  start_min: number;
  end_min: number;
  late_grace: number;
  early_grace: number;
  full_day_hours: number;
  break_minutes: number;
}

export interface AnalyticsDayRow {
  attendance_id: number;
  emp_id: number;
  work_date: string;
  check_in_at: Date | null;
  check_out_at: Date | null;
  break_minutes: number;
  production_minutes: number;
  day_status: string | null;
  worked_on_non_working_day: boolean;
  is_regularized: boolean;
  regularization_id: number | null;
  shift: AnalyticsShift | null;
  breaks: Array<{ started_at: Date; ended_at: Date | null; break_type?: string | null; reason?: string | null }>;
}

export interface AnalyticsLeaveDay {
  emp_id: number;
  date: string;
  day_part: string;
}

export interface AnalyticsRecord {
  attendanceId: number;
  empId: number;
  empCode: string;
  employeeName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  workDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInAtIso: string | null;
  checkOutAtIso: string | null;
  breakMinutes: number;
  productionMinutes: number;
  dayStatus: AnalyticsDayStatus;
  isLate: boolean;
  lateMinutes: number;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  isWeeklyOffOrHoliday: boolean;
  dayType: 'regular' | 'weekly_off' | 'holiday';
  isRegularized: boolean;
  regularizationId: number | null;
  regularizationStatus: 'approved' | null;
  shiftStartTime: string;
  shiftEndTime: string;
  assignedDailyHours: number;
  assignedBreakMinutes: number;
  breaks: Array<{ startedAt: string; endedAt: string | null; durationMinutes: number; breakType?: string; reason?: string }>;
}

export interface BuildAnalyticsInput {
  employees: AnalyticsEmployee[];
  days: AnalyticsDayRow[];
  leaves: AnalyticsLeaveDay[];
  /** Days of the week that are working days: 0 = Sunday ... 6 = Saturday. */
  workingDays: number[];
  holidays: string[];
  from: string;
  to: string;
  /** Today in Indian time, YYYY-MM-DD. Days from today onward cannot be absent. */
  today: string;
  defaultShift: AnalyticsShift;
}

export const DEFAULT_SHIFT: AnalyticsShift = { start_min: 570, end_min: 1110, late_grace: 15, early_grace: 15, full_day_hours: 8, break_minutes: 60 };

export function empCodeOf(empId: number): string {
  return `EMP${String(empId).padStart(3, '0')}`;
}

/** Minutes after midnight, Indian time, of an instant. */
export function istMinutes(d: Date): number {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

export function hhmm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function todayInIst(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, inclusive. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const dowOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function statusOfRow(row: AnalyticsDayRow, today: string): AnalyticsDayStatus | null {
  const s = (row.day_status ?? '').toLowerCase();
  if (s === 'present') return 'present';
  if (s === 'half_day' || s === 'short') return 'half_day';
  if (s === 'absent') return 'absent';
  if (s === 'on_leave' || s === 'leave') return 'on_leave';
  // incomplete (or anything unknown) with no check-out
  if (!row.check_out_at) return row.work_date >= today ? null : 'missing_punch'; // today's open day is not finished yet
  return 'present';
}

export function buildAnalyticsRecords(input: BuildAnalyticsInput): AnalyticsRecord[] {
  const { employees, days, leaves, workingDays, from, to, today, defaultShift } = input;
  const holidaySet = new Set(input.holidays);
  const empById = new Map(employees.map((e) => [e.emp_id, e]));
  const leaveByKey = new Map(leaves.map((l) => [`${l.emp_id}|${l.date}`, l]));
  const punched = new Set(days.map((d) => `${d.emp_id}|${d.work_date}`));
  const records: AnalyticsRecord[] = [];

  const base = (e: AnalyticsEmployee, date: string) => {
    const isHoliday = holidaySet.has(date);
    const isWeeklyOff = !workingDays.includes(dowOf(date));
    return {
      empId: e.emp_id,
      empCode: empCodeOf(e.emp_id),
      employeeName: e.name,
      email: e.email,
      phone: '',
      department: e.department,
      designation: e.designation,
      workDate: date,
      isWeeklyOffOrHoliday: isHoliday || isWeeklyOff,
      dayType: (isHoliday ? 'holiday' : isWeeklyOff ? 'weekly_off' : 'regular') as AnalyticsRecord['dayType'],
    };
  };

  // 1. Days the employee punched in
  for (const row of days) {
    const e = empById.get(row.emp_id);
    if (!e) continue;
    const status = statusOfRow(row, today);
    if (!status) continue;
    const shift = row.shift ?? defaultShift;
    const b = base(e, row.work_date);
    const inMin = row.check_in_at ? istMinutes(row.check_in_at) : null;
    const outMin = row.check_out_at ? istMinutes(row.check_out_at) : null;
    const lateBy = inMin !== null ? inMin - shift.start_min : 0;
    const isLate = !b.isWeeklyOffOrHoliday && !row.worked_on_non_working_day && lateBy > shift.late_grace;
    const earlyBy = outMin !== null ? shift.end_min - outMin : 0;
    const isEarly = !b.isWeeklyOffOrHoliday && !row.worked_on_non_working_day && outMin !== null && earlyBy > shift.early_grace && status !== 'half_day';
    records.push({
      ...b,
      attendanceId: row.attendance_id,
      checkInTime: inMin !== null ? hhmm(inMin) : null,
      checkOutTime: outMin !== null ? hhmm(outMin) : null,
      checkInAtIso: row.check_in_at ? row.check_in_at.toISOString() : null,
      checkOutAtIso: row.check_out_at ? row.check_out_at.toISOString() : null,
      breakMinutes: row.break_minutes || 0,
      productionMinutes: row.production_minutes || 0,
      dayStatus: status,
      isLate,
      lateMinutes: isLate ? lateBy : 0,
      isEarlyExit: isEarly,
      earlyExitMinutes: isEarly ? earlyBy : 0,
      isWeeklyOffOrHoliday: b.isWeeklyOffOrHoliday || row.worked_on_non_working_day,
      dayType: b.dayType === 'regular' && row.worked_on_non_working_day ? 'weekly_off' : b.dayType,
      isRegularized: row.is_regularized,
      regularizationId: row.regularization_id,
      regularizationStatus: row.is_regularized ? 'approved' : null,
      shiftStartTime: hhmm(shift.start_min),
      shiftEndTime: hhmm(shift.end_min),
      assignedDailyHours: shift.full_day_hours,
      assignedBreakMinutes: shift.break_minutes,
      breaks: row.breaks.map((br) => ({
        startedAt: br.started_at.toISOString(),
        endedAt: br.ended_at ? br.ended_at.toISOString() : null,
        durationMinutes: br.ended_at ? Math.max(0, Math.round((br.ended_at.getTime() - br.started_at.getTime()) / 60000)) : 0,
        ...(br.break_type ? { breakType: br.break_type } : {}),
        ...(br.reason ? { reason: br.reason } : {}),
      })),
    });
  }

  // 2. Days with no punch: absent, or on leave. Only active employees, only working days that have passed.
  let nextId = -1;
  const last = to < today ? to : addDays(today, -1);
  if (last >= from) {
    for (const e of employees) {
      if (e.active === false) continue;
      for (const date of eachDate(from, last)) {
        if (punched.has(`${e.emp_id}|${date}`)) continue;
        if (e.joining_date && date < e.joining_date) continue;
        const b = base(e, date);
        if (b.isWeeklyOffOrHoliday) continue;
        const leave = leaveByKey.get(`${e.emp_id}|${date}`);
        records.push({
          ...b,
          attendanceId: nextId--,
          checkInTime: null,
          checkOutTime: null,
          checkInAtIso: null,
          checkOutAtIso: null,
          breakMinutes: 0,
          productionMinutes: 0,
          dayStatus: leave ? 'on_leave' : 'absent',
          isLate: false,
          lateMinutes: 0,
          isEarlyExit: false,
          earlyExitMinutes: 0,
          isRegularized: false,
          regularizationId: null,
          regularizationStatus: null,
          shiftStartTime: hhmm(defaultShift.start_min),
          shiftEndTime: hhmm(defaultShift.end_min),
          assignedDailyHours: defaultShift.full_day_hours,
          assignedBreakMinutes: defaultShift.break_minutes,
          breaks: [],
        });
      }
    }
  }

  return records.sort((a, b) => (a.workDate === b.workDate ? a.empId - b.empId : a.workDate < b.workDate ? 1 : -1));
}

function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
