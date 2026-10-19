import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import { formatWorkDate } from '../../domain/services/attendance-calculations';
import {
  buildTodayBlock,
  TodayAttendanceBlock,
} from '../../domain/services/today-block-builder';

export class GetTodayAttendanceUseCase {
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

    let breaks: any[] = [];
    let openBreak: any = null;

    if (existingDay) {
      breaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);
      openBreak = await this.attendanceRepo.findOpenBreak(existingDay.attendanceId);
    }

    return buildTodayBlock({
      now,
      timezone,
      attendanceDay: existingDay,
      breaks,
      openBreak,
      isWeeklyOff,
    });
  }
}
