import { AttendanceDayEntity } from '../entities/attendance-day.entity';
import { AttendanceBreakEntity } from '../entities/attendance-break.entity';
import {
  evaluateTodayState,
  TodayAttendanceState,
} from './attendance-state-machine';
import {
  calculateDailyTargetMinutes,
  calculateOpenDayMinutes,
  formatWorkDate,
  DEFAULT_FULL_DAY_MINUTES,
  DEFAULT_HALF_DAY_MINUTES,
} from './attendance-calculations';

export interface TodayBlockParams {
  now: Date;
  timezone?: string;
  attendanceDay: AttendanceDayEntity | null;
  breaks: AttendanceBreakEntity[];
  openBreak: AttendanceBreakEntity | null;
  isHoliday?: boolean;
  holidayName?: string | null;
  isWeeklyOff?: boolean;
  leave?: { typeName: string; part: 'full' | 'half' } | null;
  fullDayMinutes?: number;
  halfDayMinutes?: number;
}

export interface TodayAttendanceBlock {
  server_now: string;
  work_date: string;
  timezone: string;
  state: TodayAttendanceState;
  flags: Record<string, any>;
  check_in_at: string | null;
  check_out_at: string | null;
  current_break_started_at: string | null;
  worked_minutes_so_far: number;
  break_minutes_so_far: number;
  target_minutes: number;
  production_minutes: number | null;
  events: Array<{ type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out'; at: string }>;
  leave: { type_name: string; part: string } | null;
  holiday_name: string | null;
}

export function buildTodayBlock(params: TodayBlockParams): TodayAttendanceBlock {
  const timezone = params.timezone || 'Asia/Kolkata';
  const workDate = params.attendanceDay?.workDate || formatWorkDate(params.now, timezone);

  const isFullDayLeave = params.leave?.part === 'full';
  const isHalfDayLeave = params.leave?.part === 'half';
  const isHoliday = !!params.isHoliday;
  const isWeeklyOff = params.isWeeklyOff !== undefined
    ? params.isWeeklyOff
    : new Date(workDate).getUTCDay() === 0 || new Date(workDate).getUTCDay() === 6;

  const state = evaluateTodayState({
    checkInAt: params.attendanceDay?.checkInAt || null,
    checkOutAt: params.attendanceDay?.checkOutAt || null,
    activeBreakStartedAt: params.openBreak?.startedAt || null,
    isFullDayLeave,
    isHalfDayLeave,
    isHoliday,
    isWeeklyOff,
  });

  const targetMinutes = calculateDailyTargetMinutes({
    isWeeklyOff,
    isHoliday,
    leaveType: params.leave?.part || null,
    fullDayMinutes: params.fullDayMinutes ?? DEFAULT_FULL_DAY_MINUTES,
    halfDayMinutes: params.halfDayMinutes ?? DEFAULT_HALF_DAY_MINUTES,
  });

  let workedMinutes = 0;
  let breakMinutes = 0;
  let productionMinutes: number | null = null;

  if (params.attendanceDay) {
    if (params.attendanceDay.checkOutAt) {
      productionMinutes = params.attendanceDay.productionMinutes;
      workedMinutes = params.attendanceDay.productionMinutes;
      breakMinutes = params.attendanceDay.breakMinutes;
    } else {
      const calc = calculateOpenDayMinutes(
        params.attendanceDay.checkInAt,
        params.now,
        params.breaks.map((b) => ({ startedAt: b.startedAt, endedAt: b.endedAt })),
      );
      workedMinutes = calc.workedMinutesSoFar;
      breakMinutes = calc.breakMinutesSoFar;
    }
  }

  const events: Array<{ type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out'; at: string }> = [];

  if (params.attendanceDay?.checkInAt) {
    events.push({
      type: 'punch_in',
      at: params.attendanceDay.checkInAt.toISOString(),
    });
  }

  for (const b of params.breaks) {
    events.push({
      type: 'break_start',
      at: b.startedAt.toISOString(),
    });
    if (b.endedAt) {
      events.push({
        type: 'break_end',
        at: b.endedAt.toISOString(),
      });
    }
  }

  if (params.attendanceDay?.checkOutAt) {
    events.push({
      type: 'punch_out',
      at: params.attendanceDay.checkOutAt.toISOString(),
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    server_now: params.now.toISOString(),
    work_date: workDate,
    timezone,
    state,
    flags: {
      worked_on_non_working_day: params.attendanceDay?.workedOnNonWorkingDay || false,
    },
    check_in_at: params.attendanceDay?.checkInAt ? params.attendanceDay.checkInAt.toISOString() : null,
    check_out_at: params.attendanceDay?.checkOutAt ? params.attendanceDay.checkOutAt.toISOString() : null,
    current_break_started_at: params.openBreak?.startedAt ? params.openBreak.startedAt.toISOString() : null,
    worked_minutes_so_far: workedMinutes,
    break_minutes_so_far: breakMinutes,
    target_minutes: targetMinutes,
    production_minutes: productionMinutes,
    events,
    leave: params.leave ? { type_name: params.leave.typeName, part: params.leave.part } : null,
    holiday_name: params.holidayName || null,
  };
}
