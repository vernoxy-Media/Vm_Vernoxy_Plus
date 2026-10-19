import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { AppSettingsRepository } from '../../domain/ports/app-settings.repository.port';
import { Clock } from '../../domain/ports/clock.port';
import {
  calculateDailyTargetMinutes,
  calculateMonthSummary,
  formatWorkDate,
  getWeekBoundaries,
} from '../../domain/services/attendance-calculations';
import {
  buildTodayBlock,
  TodayAttendanceBlock,
} from '../../domain/services/today-block-builder';
import { AttendanceNotFoundError } from '../../domain/errors/attendance.errors';

export interface DashboardResponseDto {
  today: TodayAttendanceBlock;
  stats: {
    today: { worked: number; target: number };
    week: { start: string; end: string; worked: number; target: number };
    month: { worked: number; target: number };
    remaining_minutes: number;
  };
  month: {
    summary: {
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
    };
    days: Array<{
      date: string;
      state: 'present' | 'half_day' | 'short' | 'incomplete' | 'leave' | 'holiday' | 'weekly_off' | 'absent' | 'upcoming';
      check_in_at: string | null;
      check_out_at: string | null;
      production_minutes: number;
      break_minutes: number;
      day_status: string | null;
      leave: { type_name: string; part: string } | null;
      holiday_name: string | null;
      flags: Record<string, any>;
    }>;
    month_label: string;
    is_current_month: boolean;
    can_go_next: boolean;
    can_go_prev: boolean;
  };
}

export class GetDashboardUseCase {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly appSettingsRepo: AppSettingsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    empId: number,
    monthParam?: string,
    timezone = 'Asia/Kolkata',
  ): Promise<DashboardResponseDto> {
    const now = this.clock.now();
    const todayDateStr = formatWorkDate(now, timezone);
    const currentYearMonth = todayDateStr.slice(0, 7);

    // Profile check
    const profile = await this.attendanceRepo.getEmployeeProfile(empId);
    if (!profile) {
      throw new AttendanceNotFoundError('Employee not found');
    }

    const targetMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentYearMonth;

    // Disallow future months beyond current month
    if (targetMonth > currentYearMonth) {
      throw new AttendanceNotFoundError('Future months are not viewable');
    }

    // Get week start day setting (0..6)
    const weekStartDay = await this.appSettingsRepo.getWeekStartDay();
    const settings = await this.appSettingsRepo.getAttendanceSettings();
    const empHours = await this.appSettingsRepo.getEmployeeWorkingMinutes(empId);

    // ONE SQL Query for the month data with settings options!
    const { days: rawMonthDays } = await this.attendanceRepo.getDashboardMonthData(
      empId,
      targetMonth,
      weekStartDay,
      todayDateStr,
      now,
      {
        workingDays: settings.working_days,
        holidays: settings.holidays,
        fullDayMinutes: empHours.fullDayMinutes,
        halfDayMinutes: empHours.halfDayMinutes,
      },
    );

    // Filter/trim days based on employee joining/exit date
    const joiningDate = profile.joiningDate;
    const exitDate = profile.exitDate;

    const visibleDays = rawMonthDays.filter((d) => {
      if (d.date < joiningDate) return false;
      if (exitDate && d.date > exitDate) return false;
      return true;
    });

    // Compute month summary using pure domain calculation
    const summaryInput = visibleDays.map((d) => {
      const isPast = d.date < todayDateStr;
      const isToday = d.date === todayDateStr;
      return {
        date: d.date,
        isWeeklyOff: d.state === 'weekly_off',
        isHoliday: d.state === 'holiday',
        leaveType: (d.leave?.part as 'full' | 'half') || null,
        attendance: d.check_in_at
          ? {
              checkInAt: d.check_in_at,
              checkOutAt: d.check_out_at,
              productionMinutes: d.production_minutes,
              breakMinutes: d.break_minutes,
              dayStatus: (d.day_status as any) || 'incomplete',
            }
          : null,
        isPast,
        isToday,
      };
    });

    const summary = calculateMonthSummary(summaryInput, empHours.fullDayMinutes, empHours.halfDayMinutes);

    // Build today block
    const todayRawDay = rawMonthDays.find((d) => d.date === todayDateStr);
    const todayDateObj = new Date(todayDateStr);
    const todayDow = todayDateObj.getUTCDay();
    const isTodayWeeklyOff = !settings.working_days.includes(todayDow);
    const todayHoliday = settings.holidays.find((h) => h.date === todayDateStr);
    const isTodayHoliday = !!todayHoliday;
    let todayBlock: TodayAttendanceBlock;

    if (todayRawDay && todayRawDay.check_in_at) {
      const openBreak = todayRawDay.breaks.find((b) => b.ended_at === null);
      todayBlock = buildTodayBlock({
        now,
        timezone,
        attendanceDay: {
          attendanceId: 0,
          empId,
          workDate: todayDateStr,
          checkInAt: todayRawDay.check_in_at,
          checkOutAt: todayRawDay.check_out_at,
          breakMinutes: todayRawDay.break_minutes,
          productionMinutes: todayRawDay.production_minutes,
          dayStatus: todayRawDay.day_status as any || 'incomplete',
          source: 'web',
          workedOnNonWorkingDay: todayRawDay.flags?.worked_on_non_working_day || false,
          createdAt: todayRawDay.check_in_at,
        },
        breaks: todayRawDay.breaks.map((b, idx) => ({
          breakId: idx + 1,
          attendanceId: 0,
          startedAt: b.started_at,
          endedAt: b.ended_at,
        })),
        openBreak: openBreak
          ? {
              breakId: 999,
              attendanceId: 0,
              startedAt: openBreak.started_at,
              endedAt: null,
            }
          : null,
        isWeeklyOff: todayRawDay.state === 'weekly_off',
        isHoliday: todayRawDay.state === 'holiday',
        holidayName: todayRawDay.holiday_name,
        fullDayMinutes: empHours.fullDayMinutes,
        halfDayMinutes: empHours.halfDayMinutes,
      });
    } else {
      todayBlock = buildTodayBlock({
        now,
        timezone,
        attendanceDay: null,
        breaks: [],
        openBreak: null,
        isWeeklyOff: isTodayWeeklyOff,
        isHoliday: isTodayHoliday,
        holidayName: todayHoliday?.name || null,
        fullDayMinutes: empHours.fullDayMinutes,
        halfDayMinutes: empHours.halfDayMinutes,
      });
    }

    // Week boundaries and stats
    const { weekStart, weekEnd } = getWeekBoundaries(now, weekStartDay);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    let weekWorked = 0;
    let weekTarget = 0;

    for (const d of visibleDays) {
      if (d.date >= weekStartStr && d.date <= weekEndStr) {
        weekWorked += d.production_minutes;
        weekTarget += calculateDailyTargetMinutes({
          isWeeklyOff: d.state === 'weekly_off',
          isHoliday: d.state === 'holiday',
          leaveType: (d.leave?.part as any) || null,
          fullDayMinutes: empHours.fullDayMinutes,
          halfDayMinutes: empHours.halfDayMinutes,
        });
      }
    }

    // Month label
    const [yNum, mNum] = targetMonth.split('-').map(Number);
    const dateForLabel = new Date(Date.UTC(yNum, mNum - 1, 1));
    const monthLabel = dateForLabel.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const isCurrentMonth = targetMonth === currentYearMonth;
    const canGoNext = !isCurrentMonth;

    // Previous month check against joining date month
    const prevMonthDate = new Date(Date.UTC(yNum, mNum - 2, 1));
    const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);
    const joiningMonthStr = joiningDate.slice(0, 7);
    const canGoPrev = prevMonthStr >= joiningMonthStr;

    return {
      today: todayBlock,
      stats: {
        today: {
          worked: todayBlock.worked_minutes_so_far,
          target: todayBlock.target_minutes,
        },
        week: {
          start: weekStartStr,
          end: weekEndStr,
          worked: weekWorked,
          target: weekTarget,
        },
        month: {
          worked: summary.total_production_minutes,
          target: summary.expected_minutes,
        },
        remaining_minutes: summary.remaining_minutes,
      },
      month: {
        summary,
        days: visibleDays.map((d) => ({
          date: d.date,
          state: d.state,
          check_in_at: d.check_in_at ? d.check_in_at.toISOString() : null,
          check_out_at: d.check_out_at ? d.check_out_at.toISOString() : null,
          production_minutes: d.production_minutes,
          break_minutes: d.break_minutes,
          day_status: d.day_status,
          leave: d.leave,
          holiday_name: d.holiday_name,
          flags: d.flags,
        })),
        month_label: monthLabel,
        is_current_month: isCurrentMonth,
        can_go_next: canGoNext,
        can_go_prev: canGoPrev,
      },
    };
  }
}
