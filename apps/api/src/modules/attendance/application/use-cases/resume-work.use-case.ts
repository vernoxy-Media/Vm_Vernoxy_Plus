import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import { formatWorkDate } from '../../domain/services/attendance-calculations';
import { buildTodayBlock, TodayAttendanceBlock } from '../../domain/services/today-block-builder';
import { AlreadyPunchedInError, NotWorkingError, SessionTooLongError } from '../../domain/errors/attendance.errors';
import { loadLeaveForToday } from './leave-for-today';

/**
 * Carry on working after a clock-out on the same day, for the person who clocked out by mistake or who came back.
 * A day has one clock-in, so this does not make a second one: it opens the same day again, and the time since the
 * clock-out is kept as a "Clocked out" break, which is not counted as work.
 */
export class ResumeWorkUseCase {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(empId: number, timezone = 'Asia/Kolkata'): Promise<TodayAttendanceBlock> {
    const now = this.clock.now();
    const workDate = formatWorkDate(now, timezone);

    const day = await this.attendanceRepo.findDayByEmpAndDate(empId, workDate);
    if (!day || !day.checkInAt) {
      throw new NotWorkingError('You have not clocked in today, so there is nothing to resume.');
    }

    const dayDate = new Date(workDate);
    const isWeeklyOff = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;
    const { leave, pendingLeave } = await loadLeaveForToday(this.attendanceRepo, empId, workDate);

    // Still clocked in: nothing to resume. Hand back the real state so the screen can catch up
    if (!day.checkOutAt) {
      const breaks = await this.attendanceRepo.findBreaksByAttendanceId(day.attendanceId);
      const openBreak = await this.attendanceRepo.findOpenBreak(day.attendanceId);
      const today = buildTodayBlock({ now, timezone, attendanceDay: day, breaks, openBreak, isWeeklyOff, leave, pendingLeave });
      throw new AlreadyPunchedInError('You are already working.', { today });
    }

    if (Math.floor((now.getTime() - day.checkInAt.getTime()) / 1000) > 16 * 3600) {
      throw new SessionTooLongError('Session length exceeds 16 hours');
    }

    const reopened = await this.attendanceRepo.reopenAttendanceDay(day.attendanceId, day.checkOutAt, now);
    const breaks = await this.attendanceRepo.findBreaksByAttendanceId(day.attendanceId);

    return buildTodayBlock({ now, timezone, attendanceDay: reopened, breaks, openBreak: null, isWeeklyOff, leave, pendingLeave });
  }
}
