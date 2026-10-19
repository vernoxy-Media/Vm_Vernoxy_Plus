import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import { formatWorkDate } from '../../domain/services/attendance-calculations';
import { validateStartBreak } from '../../domain/services/attendance-state-machine';
import {
  buildTodayBlock,
  TodayAttendanceBlock,
} from '../../domain/services/today-block-builder';
import { NotWorkingError, AlreadyOnBreakError } from '../../domain/errors/attendance.errors';

export class StartBreakUseCase {
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

    if (!existingDay || !existingDay.checkInAt || existingDay.checkOutAt) {
      throw new NotWorkingError('Cannot start break when not in working state');
    }

    const openBreak = await this.attendanceRepo.findOpenBreak(existingDay.attendanceId);
    if (openBreak) {
      throw new AlreadyOnBreakError('Already on break');
    }

    validateStartBreak({
      checkInAt: existingDay.checkInAt,
      checkOutAt: existingDay.checkOutAt,
      activeBreakStartedAt: null,
      isFullDayLeave: false,
      isHalfDayLeave: false,
      isHoliday: false,
      isWeeklyOff,
    });

    const newBreak = await this.attendanceRepo.createBreak(existingDay.attendanceId, now);
    const allBreaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);

    return buildTodayBlock({
      now,
      timezone,
      attendanceDay: existingDay,
      breaks: allBreaks,
      openBreak: newBreak,
      isWeeklyOff,
    });
  }
}
