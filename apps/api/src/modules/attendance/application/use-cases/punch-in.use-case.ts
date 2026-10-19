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
import { AlreadyPunchedInError } from '../../domain/errors/attendance.errors';

export class PunchInUseCase {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(empId: number, timezone = 'Asia/Kolkata'): Promise<TodayAttendanceBlock> {
    const now = this.clock.now();
    const workDate = formatWorkDate(now, timezone);

    const existingDay = await this.attendanceRepo.findDayByEmpAndDate(empId, workDate);
    const dayDate = new Date(workDate);
    const isWeeklyOff = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;

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
      });
      throw new AlreadyPunchedInError('Already punched in today', { today: todayBlock });
    }

    const { workedOnNonWorkingDay } = validatePunchIn({
      checkInAt: existingDay?.checkInAt || null,
      checkOutAt: existingDay?.checkOutAt || null,
      activeBreakStartedAt: null,
      isFullDayLeave: false,
      isHalfDayLeave: false,
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
    });
  }
}
