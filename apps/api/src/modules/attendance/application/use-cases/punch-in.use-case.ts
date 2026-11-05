import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import {
  formatWorkDate,
} from '../../domain/services/attendance-calculations';
import {
  validatePunchIn,
} from '../../domain/services/attendance-state-machine';
import {
  buildTodayBlock,
  TodayAttendanceBlock,
} from '../../domain/services/today-block-builder';
import { AlreadyPunchedInError, FullDayLeaveBlockedError } from '../../domain/errors/attendance.errors';
import { loadLeaveForToday } from './leave-for-today';

export class PunchInUseCase {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(empId: number, timezone = 'Asia/Kolkata'): Promise<TodayAttendanceBlock> {
    const now = this.clock.now();
    const workDate = formatWorkDate(now, timezone);

    // Leave lives in leave_request_days; any attendance row for today is a real check-in
    // (the old placeholder rows were removed by migration 20261105100000).
    const existingDay = await this.attendanceRepo.findDayByEmpAndDate(empId, workDate);
    const dayDate = new Date(workDate);
    const isWeeklyOff = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;
    const { leave, pendingLeave } = await loadLeaveForToday(this.attendanceRepo, empId, workDate);

    // BFD Leave 8: a Full Day of approved leave blocks check-in; a First Half
    // leave allows check-in from the start of the second half of the shift.
    if (leave?.part === 'full') {
      throw new FullDayLeaveBlockedError(
        `You are on approved leave today (${leave.typeName}). Check-in is not available.`,
      );
    }
    if (leave?.half === 'FIRST_HALF' && leave.secondHalfStartsAt && now < leave.secondHalfStartsAt) {
      const at = leave.secondHalfStartsAt.toLocaleTimeString('en-IN', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true,
      });
      throw new FullDayLeaveBlockedError(
        `You are on leave for the first half today (${leave.typeName}). Check-in opens at ${at}.`,
      );
    }

    if (existingDay && existingDay.checkInAt) {
      const breaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);
      const openBreak = await this.attendanceRepo.findOpenBreak(existingDay.attendanceId);
      const todayBlock = buildTodayBlock({
        now,
        timezone,
        attendanceDay: existingDay,
        breaks,
        openBreak,
        isWeeklyOff,
        leave,
        pendingLeave,
      });
      throw new AlreadyPunchedInError('Already punched in today', { today: todayBlock });
    }

    const { workedOnNonWorkingDay } = validatePunchIn({
      checkInAt: existingDay?.checkInAt || null,
      checkOutAt: existingDay?.checkOutAt || null,
      activeBreakStartedAt: null,
      isFullDayLeave: false,
      isHalfDayLeave: Boolean(leave),
      isHoliday: false,
      isWeeklyOff,
    });

    const newDay = await this.attendanceRepo.createAttendanceDay({
      empId,
      workDate,
      checkInAt: now,
      checkOutAt: null,
      breakMinutes: 0,
      productionMinutes: 0,
      dayStatus: 'incomplete',
      source: 'web',
      workedOnNonWorkingDay,
      note: null,
      createdBy: empId,
      updatedAt: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
    });

    return buildTodayBlock({
      now,
      timezone,
      attendanceDay: newDay,
      breaks: [],
      openBreak: null,
      isWeeklyOff,
      leave,
      pendingLeave,
    });
  }
}
