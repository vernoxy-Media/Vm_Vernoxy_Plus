import {
  NotWorkingError,
  AlreadyOnBreakError,
  NotOnBreakError,
  AlreadyPunchedInError,
  AlreadyPunchedOutError,
  FullDayLeaveBlockedError,
} from '../errors/attendance.errors';

export type TodayAttendanceState =
  | 'not_started'
  | 'working'
  | 'on_break'
  | 'done'
  | 'on_leave'
  | 'holiday'
  | 'weekly_off';

export interface DayContext {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  activeBreakStartedAt: Date | null;
  isFullDayLeave: boolean;
  isHalfDayLeave: boolean;
  isHoliday: boolean;
  isWeeklyOff: boolean;
}

/**
 * Pure state evaluator for today
 */
export function evaluateTodayState(ctx: DayContext): TodayAttendanceState {
  if (ctx.checkOutAt) {
    return 'done';
  }
  if (ctx.checkInAt) {
    if (ctx.activeBreakStartedAt) {
      return 'on_break';
    }
    return 'working';
  }

  // Not yet punched in
  if (ctx.isFullDayLeave) {
    return 'on_leave';
  }
  if (ctx.isHoliday) {
    return 'holiday';
  }
  if (ctx.isWeeklyOff) {
    return 'weekly_off';
  }

  return 'not_started';
}

/**
 * Validates whether punch-in is allowed
 */
export function validatePunchIn(ctx: DayContext): { workedOnNonWorkingDay: boolean } {
  if (ctx.checkOutAt) {
    throw new AlreadyPunchedOutError();
  }
  if (ctx.checkInAt) {
    throw new AlreadyPunchedInError();
  }
  if (ctx.isFullDayLeave) {
    throw new FullDayLeaveBlockedError();
  }

  const workedOnNonWorkingDay = ctx.isHoliday || ctx.isWeeklyOff;
  return { workedOnNonWorkingDay };
}

/**
 * Validates whether start-break is allowed
 */
export function validateStartBreak(ctx: DayContext): void {
  const currentState = evaluateTodayState(ctx);
  if (currentState === 'on_break') {
    throw new AlreadyOnBreakError();
  }
  if (currentState !== 'working') {
    throw new NotWorkingError(`Cannot start break in state '${currentState}'`);
  }
}

/**
 * Validates whether end-break (resume) is allowed
 */
export function validateEndBreak(ctx: DayContext): void {
  const currentState = evaluateTodayState(ctx);
  if (currentState !== 'on_break' || !ctx.activeBreakStartedAt) {
    throw new NotOnBreakError();
  }
}

/**
 * Validates punch out
 */
export function validatePunchOut(ctx: DayContext): void {
  if (ctx.checkOutAt) {
    throw new AlreadyPunchedOutError();
  }
  if (!ctx.checkInAt) {
    throw new NotWorkingError('Cannot punch out before punching in');
  }
}
