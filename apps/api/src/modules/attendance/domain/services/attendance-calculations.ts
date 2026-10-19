export interface BreakInterval {
  startedAt: Date;
  endedAt: Date | null;
}

export interface DayTargetParams {
  isWeeklyOff: boolean;
  isHoliday: boolean;
  leaveType?: 'full' | 'half' | null;
  fullDayMinutes?: number;
  halfDayMinutes?: number;
}

export const DEFAULT_FULL_DAY_MINUTES = 480; // 8 hours
export const DEFAULT_HALF_DAY_MINUTES = 240; // 4 hours

/**
 * Production minutes = floor((check_out - check_in - sum of breaks) in seconds / 60)
 * Break minutes = floor(sum of breaks in seconds / 60)
 */
export function calculateCompletedDayMinutes(
  checkInAt: Date,
  checkOutAt: Date,
  breaks: BreakInterval[],
): { productionMinutes: number; breakMinutes: number } {
  const totalSessionSeconds = Math.max(0, Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 1000));

  let totalBreakSeconds = 0;
  for (const b of breaks) {
    const end = b.endedAt || checkOutAt;
    const durSeconds = Math.max(0, Math.floor((end.getTime() - b.startedAt.getTime()) / 1000));
    totalBreakSeconds += durSeconds;
  }

  // Cap break seconds at total session seconds
  if (totalBreakSeconds > totalSessionSeconds) {
    totalBreakSeconds = totalSessionSeconds;
  }

  const workSeconds = Math.max(0, totalSessionSeconds - totalBreakSeconds);

  const breakMinutes = Math.floor(totalBreakSeconds / 60);
  const productionMinutes = Math.floor(workSeconds / 60);

  return {
    productionMinutes,
    breakMinutes,
  };
}

/**
 * While day is open, calculate worked so far and break so far in seconds/minutes
 */
export function calculateOpenDayMinutes(
  checkInAt: Date,
  now: Date,
  breaks: BreakInterval[],
): {
  workedSeconds: number;
  breakSeconds: number;
  workedMinutesSoFar: number;
  breakMinutesSoFar: number;
} {
  const totalElapsedSeconds = Math.max(0, Math.floor((now.getTime() - checkInAt.getTime()) / 1000));

  let totalBreakSeconds = 0;
  for (const b of breaks) {
    const end = b.endedAt || now;
    const durSeconds = Math.max(0, Math.floor((end.getTime() - b.startedAt.getTime()) / 1000));
    totalBreakSeconds += durSeconds;
  }

  if (totalBreakSeconds > totalElapsedSeconds) {
    totalBreakSeconds = totalElapsedSeconds;
  }

  const workedSeconds = Math.max(0, totalElapsedSeconds - totalBreakSeconds);

  return {
    workedSeconds,
    breakSeconds: totalBreakSeconds,
    workedMinutesSoFar: Math.floor(workedSeconds / 60),
    breakMinutesSoFar: Math.floor(totalBreakSeconds / 60),
  };
}

/**
 * Determine day status:
 * present >= full_day_minutes, half_day >= half_day_minutes, else short; incomplete while no check_out
 */
export function determineDayStatus(
  checkOutAt: Date | null,
  productionMinutes: number,
  fullDayMinutes = DEFAULT_FULL_DAY_MINUTES,
  halfDayMinutes = DEFAULT_HALF_DAY_MINUTES,
): 'present' | 'half_day' | 'short' | 'incomplete' {
  if (!checkOutAt) {
    return 'incomplete';
  }
  if (productionMinutes >= fullDayMinutes) {
    return 'present';
  }
  if (productionMinutes >= halfDayMinutes) {
    return 'half_day';
  }
  return 'short';
}

/**
 * Daily target calculation
 */
export function calculateDailyTargetMinutes(params: DayTargetParams): number {
  const full = params.fullDayMinutes ?? DEFAULT_FULL_DAY_MINUTES;
  const half = params.halfDayMinutes ?? DEFAULT_HALF_DAY_MINUTES;

  if (params.isWeeklyOff || params.isHoliday) {
    return 0;
  }
  if (params.leaveType === 'full') {
    return 0;
  }
  if (params.leaveType === 'half') {
    return half;
  }
  return full;
}

/**
 * Calculate week boundaries based on week_start_day (0=Sunday, 1=Monday..6=Saturday)
 */
export function getWeekBoundaries(
  referenceDate: Date,
  weekStartDay: number = 1,
): { weekStart: Date; weekEnd: Date } {
  const date = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const day = date.getUTCDay(); // 0 is Sunday
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay;

  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - diff);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    weekStart: start,
    weekEnd: end,
  };
}

/**
 * Timezone-aware date string formatter (YYYY-MM-DD)
 */
export function getWorkDateInTimezone(date: Date, timezone = 'Asia/Kolkata'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export const formatWorkDate = getWorkDateInTimezone;

export interface MonthSummaryDayInput {
  date: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  leaveType?: 'full' | 'half' | null;
  attendance?: {
    checkInAt: Date;
    checkOutAt: Date | null;
    productionMinutes: number;
    breakMinutes: number;
    dayStatus: 'present' | 'half_day' | 'short' | 'incomplete';
  } | null;
  isPast: boolean;
  isToday: boolean;
}

export interface MonthSummaryResult {
  scheduled_working_days: number;
  days_present: number;
  days_full: number;
  days_half: number;
  days_short: number;
  days_incomplete: number;
  days_absent: number;
  leave_days: number;
  holidays: number;
  weekly_offs: number;
  total_production_minutes: number;
  total_break_minutes: number;
  expected_minutes: number;
  remaining_minutes: number;
}

/**
 * Pure domain function to calculate month summary
 */
export function calculateMonthSummary(
  days: MonthSummaryDayInput[],
  fullDayMinutes = DEFAULT_FULL_DAY_MINUTES,
  halfDayMinutes = DEFAULT_HALF_DAY_MINUTES,
): MonthSummaryResult {
  let scheduled_working_days = 0;
  let days_present = 0;
  let days_full = 0;
  let days_half = 0;
  let days_short = 0;
  let days_incomplete = 0;
  let days_absent = 0;
  let leave_days = 0;
  let holidays = 0;
  let weekly_offs = 0;
  let total_production_minutes = 0;
  let total_break_minutes = 0;
  let expected_minutes = 0;

  for (const d of days) {
    if (d.isHoliday) {
      holidays++;
    }
    if (d.isWeeklyOff) {
      weekly_offs++;
    }

    const isScheduledWorkingDay = !d.isWeeklyOff && !d.isHoliday;
    if (isScheduledWorkingDay) {
      scheduled_working_days++;
      if (d.leaveType === 'full') {
        leave_days += 1.0;
      } else if (d.leaveType === 'half') {
        leave_days += 0.5;
      }
    }

    const target = calculateDailyTargetMinutes({
      isWeeklyOff: d.isWeeklyOff,
      isHoliday: d.isHoliday,
      leaveType: d.leaveType,
      fullDayMinutes,
      halfDayMinutes,
    });
    expected_minutes += target;

    if (d.attendance) {
      total_production_minutes += d.attendance.productionMinutes;
      total_break_minutes += d.attendance.breakMinutes;

      if (d.attendance.dayStatus === 'present') {
        days_full++;
        days_present++;
      } else if (d.attendance.dayStatus === 'half_day') {
        days_half++;
        days_present++;
      } else if (d.attendance.dayStatus === 'short') {
        days_short++;
        days_present++;
      } else if (d.attendance.dayStatus === 'incomplete') {
        days_incomplete++;
      }
    } else {
      if (d.isPast && isScheduledWorkingDay && !d.leaveType) {
        days_absent++;
      }
    }
  }

  const remaining_minutes = Math.max(0, expected_minutes - total_production_minutes);

  return {
    scheduled_working_days,
    days_present,
    days_full,
    days_half,
    days_short,
    days_incomplete,
    days_absent,
    leave_days,
    holidays,
    weekly_offs,
    total_production_minutes,
    total_break_minutes,
    expected_minutes,
    remaining_minutes,
  };
}
