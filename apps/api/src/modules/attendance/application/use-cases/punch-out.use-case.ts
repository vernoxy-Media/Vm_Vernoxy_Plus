import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import {
  calculateCompletedDayMinutes,
  determineDayStatus,
  formatWorkDate,
} from '../../domain/services/attendance-calculations';
import {
  buildTodayBlock,
  TodayAttendanceBlock,
} from '../../domain/services/today-block-builder';
import {
  AlreadyPunchedOutError,
  NotWorkingError,
  SessionTooLongError,
} from '../../domain/errors/attendance.errors';

import { AppSettingsRepository } from '../../domain/ports/app-settings.repository.port';

export class PunchOutUseCase {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly clock: Clock,
    private readonly appSettingsRepo?: AppSettingsRepository,
  ) {}

  async execute(empId: number, timezone = 'Asia/Kolkata'): Promise<TodayAttendanceBlock> {
    const now = this.clock.now();
    const workDate = formatWorkDate(now, timezone);

    const existingDay = await this.attendanceRepo.findDayByEmpAndDate(empId, workDate);
    const dayDate = new Date(workDate);
    const settings = this.appSettingsRepo ? await this.appSettingsRepo.getAttendanceSettings() : null;
    const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6];
    const isWeeklyOff = !workingDays.includes(dayDate.getUTCDay());
    const holiday = settings?.holidays.find((h) => h.date === workDate);
    const isHoliday = !!holiday;

    const empHours = this.appSettingsRepo
      ? await this.appSettingsRepo.getEmployeeWorkingMinutes(empId)
      : { fullDayMinutes: 480, halfDayMinutes: 240, fullDayHours: 8, halfDayHours: 4 };

    if (!existingDay || !existingDay.checkInAt) {
      throw new NotWorkingError('Cannot punch out before punching in');
    }

    if (existingDay.checkOutAt) {
      const breaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);
      const todayBlock = buildTodayBlock({
        now,
        timezone,
        attendanceDay: existingDay,
        breaks,
        openBreak: null,
        isWeeklyOff,
        isHoliday,
        holidayName: holiday?.name || null,
        fullDayMinutes: empHours.fullDayMinutes,
        halfDayMinutes: empHours.halfDayMinutes,
      });
      throw new AlreadyPunchedOutError('Already punched out today', { today: todayBlock });
    }

    // Check session length <= 16 hours
    const sessionSeconds = Math.floor((now.getTime() - existingDay.checkInAt.getTime()) / 1000);
    if (sessionSeconds > 16 * 3600) {
      throw new SessionTooLongError('Session length exceeds 16 hours');
    }

    // Fetch existing breaks
    const existingBreaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);
    const intervals = existingBreaks.map((b) => ({
      startedAt: b.startedAt,
      endedAt: b.endedAt || now, // Any open break ends at Punch Out instant
    }));

    const { productionMinutes, breakMinutes } = calculateCompletedDayMinutes(
      existingDay.checkInAt,
      now,
      intervals,
    );

    const dayStatus = determineDayStatus(
      now,
      productionMinutes,
      empHours.fullDayMinutes,
      empHours.halfDayMinutes,
    );

    const closedDay = await this.attendanceRepo.closeAttendanceDayWithBreak(
      existingDay.attendanceId,
      now,
      breakMinutes,
      productionMinutes,
      dayStatus,
    );

    const allBreaks = await this.attendanceRepo.findBreaksByAttendanceId(existingDay.attendanceId);

    return buildTodayBlock({
      now,
      timezone,
      attendanceDay: closedDay,
      breaks: allBreaks,
      openBreak: null,
      isWeeklyOff,
      isHoliday,
      holidayName: holiday?.name || null,
      fullDayMinutes: empHours.fullDayMinutes,
      halfDayMinutes: empHours.halfDayMinutes,
    });
  }
}
