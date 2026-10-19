import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import { formatWorkDate } from '../../domain/services/attendance-calculations';
import {
  buildTodayBlock,
  TodayAttendanceBlock,
} from '../../domain/services/today-block-builder';
import { NotOnBreakError, NotWorkingError } from '../../domain/errors/attendance.errors';

export class EndBreakUseCase {
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
      throw new NotWorkingError('Cannot resume break when not working');
    }

    const openBreak = await this.attendanceRepo.findOpenBreak(existingDay.attendanceId);
    if (!openBreak) {
      throw new NotOnBreakError('Not currently on a break');
    }

    await this.attendanceRepo.closeBreak(openBreak.breakId, now);
    const allBreaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);

    return buildTodayBlock({
      now,
      timezone,
      attendanceDay: existingDay,
      breaks: allBreaks,
      openBreak: null,
      isWeeklyOff,
    });
  }
}
