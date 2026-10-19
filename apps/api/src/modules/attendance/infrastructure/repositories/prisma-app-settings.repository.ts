import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { AppSettingsRepository } from '../../domain/ports/app-settings.repository.port';

@Injectable()
export class PrismaAppSettingsRepository implements AppSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting(key: string): Promise<string | null> {
    const row = await this.prisma.app_settings.findFirst({
      where: {
        setting_key: {
          equals: key,
          mode: 'insensitive',
        },
        deleted_at: null,
      },
    });
    return row ? row.setting_value : null;
  }

  async setSetting(key: string, value: string, userId?: number): Promise<void> {
    const existing = await this.prisma.app_settings.findFirst({
      where: {
        setting_key: {
          equals: key,
          mode: 'insensitive',
        },
        deleted_at: null,
      },
    });

    if (existing) {
      await this.prisma.app_settings.update({
        where: { setting_id: existing.setting_id },
        data: {
          setting_value: value,
          updated_by: userId,
          updated_at: new Date(),
        },
      });
    } else {
      await this.prisma.app_settings.create({
        data: {
          setting_key: key,
          setting_value: value,
          created_by: userId,
        },
      });
    }
  }

  async getWeekStartDay(): Promise<number> {
    const val = await this.getSetting('week_start_day');
    if (!val) {
      return 1; // Default Monday
    }
    const num = parseInt(val, 10);
    return isNaN(num) || num < 0 || num > 6 ? 1 : num;
  }

  async getAttendanceSettings() {
    const [workingDaysStr, holidaysStr, defaultHoursStr, empHoursStr] = await Promise.all([
      this.getSetting('attendance_working_days'),
      this.getSetting('attendance_holidays'),
      this.getSetting('attendance_default_hours'),
      this.getSetting('attendance_employee_hours'),
    ]);

    // Default working days: Monday (1) to Saturday (6). Sunday (0) is off.
    let working_days: number[] = [1, 2, 3, 4, 5, 6];
    if (workingDaysStr) {
      try {
        const parsed = JSON.parse(workingDaysStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          working_days = parsed;
        }
      } catch {}
    }

    let holidays: any[] = [];
    if (holidaysStr) {
      try {
        const parsed = JSON.parse(holidaysStr);
        if (Array.isArray(parsed)) {
          holidays = parsed;
        }
      } catch {}
    }

    let default_working_hours = { full_day_hours: 8, half_day_hours: 4 };
    if (defaultHoursStr) {
      try {
        const parsed = JSON.parse(defaultHoursStr);
        if (parsed && typeof parsed.full_day_hours === 'number') {
          default_working_hours = {
            full_day_hours: parsed.full_day_hours,
            half_day_hours: parsed.half_day_hours ?? (parsed.full_day_hours / 2),
          };
        }
      } catch {}
    }

    let employee_working_hours: Record<string, { full_day_hours: number; half_day_hours: number }> = {};
    if (empHoursStr) {
      try {
        const parsed = JSON.parse(empHoursStr);
        if (parsed && typeof parsed === 'object') {
          employee_working_hours = parsed;
        }
      } catch {}
    }

    return {
      working_days,
      holidays,
      default_working_hours,
      employee_working_hours,
    };
  }

  async saveWorkingDays(days: number[], userId?: number): Promise<void> {
    await this.setSetting('attendance_working_days', JSON.stringify(days), userId);
  }

  async addHoliday(holiday: { date: string; name: string; type?: string }, userId?: number) {
    const settings = await this.getAttendanceSettings();
    const newHoliday = {
      id: `hol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: holiday.date,
      name: holiday.name,
      type: holiday.type || 'Public Holiday',
    };
    const updated = [...settings.holidays.filter((h) => h.date !== holiday.date), newHoliday].sort(
      (a, b) => a.date.localeCompare(b.date),
    );
    await this.setSetting('attendance_holidays', JSON.stringify(updated), userId);
    return newHoliday;
  }

  async deleteHoliday(id: string, userId?: number): Promise<void> {
    const settings = await this.getAttendanceSettings();
    const updated = settings.holidays.filter((h) => h.id !== id && h.date !== id);
    await this.setSetting('attendance_holidays', JSON.stringify(updated), userId);
  }

  async saveDefaultWorkingHours(config: { full_day_hours: number; half_day_hours: number }, userId?: number): Promise<void> {
    await this.setSetting('attendance_default_hours', JSON.stringify(config), userId);
  }

  async saveEmployeeWorkingHours(
    empId: number,
    config: { full_day_hours: number; half_day_hours: number } | null,
    userId?: number,
  ): Promise<void> {
    const settings = await this.getAttendanceSettings();
    const empHours = { ...settings.employee_working_hours };
    const empKey = String(empId);
    if (!config) {
      delete empHours[empKey];
    } else {
      empHours[empKey] = config;
    }
    await this.setSetting('attendance_employee_hours', JSON.stringify(empHours), userId);
  }

  async getEmployeeWorkingMinutes(empId: number) {
    const settings = await this.getAttendanceSettings();
    const empKey = String(empId);
    const custom = settings.employee_working_hours[empKey];
    const hours = custom || settings.default_working_hours;
    const fullDayHours = hours.full_day_hours;
    const halfDayHours = hours.half_day_hours;
    return {
      fullDayHours,
      halfDayHours,
      fullDayMinutes: Math.round(fullDayHours * 60),
      halfDayMinutes: Math.round(halfDayHours * 60),
    };
  }
}

