import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  AppSettingsRepository,
  AttendanceSettingsDto,
  AttendanceShiftDto,
  AttendanceStatusDto,
  WorkingHoursConfig,
} from '../../domain/ports/app-settings.repository.port';

@Injectable()
export class PrismaAppSettingsRepository implements AppSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapShiftRow(row: any): AttendanceShiftDto {
    const formatTime = (t: any) => {
      if (!t) return '00:00';
      if (typeof t === 'string') return t.slice(0, 5);
      if (t instanceof Date) return t.toISOString().slice(11, 16);
      return String(t).slice(0, 5);
    };

    return {
      shift_id: Number(row.shift_id),
      shift_code: row.shift_code,
      shift_name: row.shift_name,
      shift_type: row.shift_type || 'fixed',
      start_time: formatTime(row.start_time),
      end_time: formatTime(row.end_time),
      full_day_hours: Number(row.full_day_hours),
      half_day_hours: Number(row.half_day_hours),
      break_duration_minutes: Number(row.break_duration_minutes ?? 60),
      break_type: row.break_type || 'unpaid',
      late_arrival_grace_minutes: Number(row.late_arrival_grace_minutes ?? 15),
      early_exit_grace_minutes: Number(row.early_exit_grace_minutes ?? 15),
      weekly_off_days: Array.isArray(row.weekly_off_days) ? row.weekly_off_days : [0],
      is_default: Boolean(row.is_default),
      is_active: Boolean(row.is_active),
    };
  }

  private mapStatusRow(row: any): AttendanceStatusDto {
    return {
      status_id: Number(row.status_id),
      code: row.code,
      label: row.label,
      short_code: row.short_code,
      color: row.color,
      is_active: Boolean(row.is_active),
      is_system: Boolean(row.is_system),
      sort_order: Number(row.sort_order ?? 0),
    };
  }

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

  async getAttendanceSettings(): Promise<AttendanceSettingsDto> {
    const [workingDaysStr, defaultHoursStr, empHoursStr, empShiftsStr, dbHolidays, shifts, statuses] = await Promise.all([
      this.getSetting('attendance_working_days'),
      this.getSetting('attendance_default_hours'),
      this.getSetting('attendance_employee_hours'),
      this.getSetting('attendance_employee_shifts'),
      this.prisma.company_holidays.findMany({
        where: { deleted_at: null },
        orderBy: { holiday_date: 'asc' },
      }),
      this.getShifts(),
      this.getStatuses(),
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

    const holidays = dbHolidays.map((h) => ({
      id: String(h.holiday_id),
      date: typeof h.holiday_date === 'string'
        ? (h.holiday_date as string).slice(0, 10)
        : (h.holiday_date as Date).toISOString().slice(0, 10),
      name: h.name,
      type: h.type,
    }));

    const default_shift = shifts.find((s) => s.is_default) || shifts[0] || null;

    let default_working_hours: WorkingHoursConfig = default_shift
      ? { full_day_hours: default_shift.full_day_hours, half_day_hours: default_shift.half_day_hours }
      : { full_day_hours: 8, half_day_hours: 4 };

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

    let employee_working_hours: Record<string, WorkingHoursConfig> = {};
    if (empHoursStr) {
      try {
        const parsed = JSON.parse(empHoursStr);
        if (parsed && typeof parsed === 'object') {
          employee_working_hours = parsed;
        }
      } catch {}
    }

    let employee_shifts: Record<string, number> = {};
    if (empShiftsStr) {
      try {
        const parsed = JSON.parse(empShiftsStr);
        if (parsed && typeof parsed === 'object') {
          employee_shifts = parsed;
        }
      } catch {}
    }

    return {
      working_days,
      holidays,
      default_working_hours,
      employee_working_hours,
      shifts,
      statuses,
      default_shift,
      employee_shifts,
    };
  }

  async saveWorkingDays(days: number[], userId?: number): Promise<void> {
    await this.setSetting('attendance_working_days', JSON.stringify(days), userId);
  }

  async addHoliday(holiday: { date: string; name: string; type?: string }, userId?: number) {
    const targetDate = new Date(`${holiday.date}T00:00:00.000Z`);
    const year = parseInt(holiday.date.slice(0, 4), 10) || targetDate.getFullYear();

    const existing = await this.prisma.company_holidays.findFirst({
      where: {
        holiday_date: targetDate,
        deleted_at: null,
      },
    });

    let saved;
    if (existing) {
      saved = await this.prisma.company_holidays.update({
        where: { holiday_id: existing.holiday_id },
        data: {
          name: holiday.name,
          type: holiday.type || 'Public Holiday',
          updated_by: userId,
          updated_at: new Date(),
        },
      });
    } else {
      saved = await this.prisma.company_holidays.create({
        data: {
          holiday_date: targetDate,
          name: holiday.name,
          type: holiday.type || 'Public Holiday',
          year,
          created_by: userId,
        },
      });
    }

    const newHoliday = {
      id: String(saved.holiday_id),
      date: holiday.date,
      name: saved.name,
      type: saved.type,
    };

    // Keep app_settings in sync for compatibility
    const allHolidays = await this.prisma.company_holidays.findMany({
      where: { deleted_at: null },
      orderBy: { holiday_date: 'asc' },
    });
    const formatted = allHolidays.map((h) => ({
      id: String(h.holiday_id),
      date: typeof h.holiday_date === 'string'
        ? (h.holiday_date as string).slice(0, 10)
        : (h.holiday_date as Date).toISOString().slice(0, 10),
      name: h.name,
      type: h.type,
    }));
    await this.setSetting('attendance_holidays', JSON.stringify(formatted), userId);

    return newHoliday;
  }

  async deleteHoliday(id: string, userId?: number): Promise<void> {
    const idNum = parseInt(id, 10);
    if (!isNaN(idNum)) {
      await this.prisma.company_holidays.updateMany({
        where: { holiday_id: idNum },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });
    } else {
      const targetDate = new Date(`${id}T00:00:00.000Z`);
      await this.prisma.company_holidays.updateMany({
        where: { holiday_date: targetDate, deleted_at: null },
        data: {
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });
    }

    // Keep app_settings in sync for compatibility
    const allHolidays = await this.prisma.company_holidays.findMany({
      where: { deleted_at: null },
      orderBy: { holiday_date: 'asc' },
    });
    const formatted = allHolidays.map((h) => ({
      id: String(h.holiday_id),
      date: typeof h.holiday_date === 'string'
        ? (h.holiday_date as string).slice(0, 10)
        : (h.holiday_date as Date).toISOString().slice(0, 10),
      name: h.name,
      type: h.type,
    }));
    await this.setSetting('attendance_holidays', JSON.stringify(formatted), userId);
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

    // 1. Shift assignment override
    const assignedShiftId = settings.employee_shifts?.[empKey];
    if (assignedShiftId) {
      const shift = settings.shifts.find((s) => s.shift_id === assignedShiftId);
      if (shift) {
        const fullDayHours = Number(shift.full_day_hours);
        const halfDayHours = Number(shift.half_day_hours);
        return {
          fullDayHours,
          halfDayHours,
          fullDayMinutes: Math.round(fullDayHours * 60),
          halfDayMinutes: Math.round(halfDayHours * 60),
        };
      }
    }

    // 2. Custom employee working hours
    const custom = settings.employee_working_hours[empKey];
    if (custom) {
      const fullDayHours = custom.full_day_hours;
      const halfDayHours = custom.half_day_hours;
      return {
        fullDayHours,
        halfDayHours,
        fullDayMinutes: Math.round(fullDayHours * 60),
        halfDayMinutes: Math.round(halfDayHours * 60),
      };
    }

    // 3. Default shift or default working hours
    const defShift = settings.default_shift;
    const fullDayHours = defShift ? Number(defShift.full_day_hours) : settings.default_working_hours.full_day_hours;
    const halfDayHours = defShift ? Number(defShift.half_day_hours) : settings.default_working_hours.half_day_hours;

    return {
      fullDayHours,
      halfDayHours,
      fullDayMinutes: Math.round(fullDayHours * 60),
      halfDayMinutes: Math.round(halfDayHours * 60),
    };
  }

  // ----------------------------------------------------
  // SHIFT MANAGEMENT
  // ----------------------------------------------------

  async getShifts(): Promise<AttendanceShiftDto[]> {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT * FROM attendance_shifts
      WHERE deleted_at IS NULL
      ORDER BY is_default DESC, shift_id ASC
    `;
    return rows.map((r) => this.mapShiftRow(r));
  }

  async createShift(shift: Partial<AttendanceShiftDto>, userId?: number): Promise<AttendanceShiftDto> {
    let code = shift.shift_code;
    if (!code) {
      const countRows: any[] = await this.prisma.$queryRaw`SELECT count(*)::int as count FROM attendance_shifts`;
      const count = countRows[0]?.count || 0;
      code = `SHF-${String(count + 1).padStart(3, '0')}`;
    }

    const isDefault = Boolean(shift.is_default);
    if (isDefault) {
      await this.prisma.$executeRaw`UPDATE attendance_shifts SET is_default = false`;
    }

    const rows: any[] = await this.prisma.$queryRaw`
      INSERT INTO attendance_shifts (
        shift_code, shift_name, shift_type, start_time, end_time,
        full_day_hours, half_day_hours, break_duration_minutes, break_type,
        late_arrival_grace_minutes, early_exit_grace_minutes, weekly_off_days,
        is_default, is_active
      ) VALUES (
        ${code},
        ${shift.shift_name || 'General Shift'},
        ${shift.shift_type || 'fixed'},
        ${shift.start_time || '09:30'}::time,
        ${shift.end_time || '18:30'}::time,
        ${shift.full_day_hours ?? 8.00},
        ${shift.half_day_hours ?? 4.00},
        ${shift.break_duration_minutes ?? 60},
        ${shift.break_type || 'unpaid'},
        ${shift.late_arrival_grace_minutes ?? 15},
        ${shift.early_exit_grace_minutes ?? 15},
        ${shift.weekly_off_days ?? [0]},
        ${isDefault},
        ${shift.is_active ?? true}
      )
      RETURNING *
    `;

    const created = this.mapShiftRow(rows[0]);
    if (isDefault) {
      await this.saveDefaultWorkingHours(
        { full_day_hours: created.full_day_hours, half_day_hours: created.half_day_hours },
        userId,
      );
    }
    return created;
  }

  async updateShift(id: number, shift: Partial<AttendanceShiftDto>, userId?: number): Promise<AttendanceShiftDto> {
    if (shift.is_default === true) {
      await this.prisma.$executeRaw`UPDATE attendance_shifts SET is_default = false WHERE shift_id != ${id}`;
    }

    const rows: any[] = await this.prisma.$queryRaw`
      UPDATE attendance_shifts
      SET shift_name = COALESCE(${shift.shift_name}, shift_name),
          shift_type = COALESCE(${shift.shift_type}, shift_type),
          start_time = CASE WHEN ${shift.start_time || null}::text IS NOT NULL THEN ${shift.start_time || null}::time ELSE start_time END,
          end_time = CASE WHEN ${shift.end_time || null}::text IS NOT NULL THEN ${shift.end_time || null}::time ELSE end_time END,
          full_day_hours = COALESCE(${shift.full_day_hours}, full_day_hours),
          half_day_hours = COALESCE(${shift.half_day_hours}, half_day_hours),
          break_duration_minutes = COALESCE(${shift.break_duration_minutes}, break_duration_minutes),
          break_type = COALESCE(${shift.break_type}, break_type),
          late_arrival_grace_minutes = COALESCE(${shift.late_arrival_grace_minutes}, late_arrival_grace_minutes),
          early_exit_grace_minutes = COALESCE(${shift.early_exit_grace_minutes}, early_exit_grace_minutes),
          is_default = COALESCE(${shift.is_default}, is_default),
          is_active = COALESCE(${shift.is_active}, is_active),
          updated_at = clock_timestamp()
      WHERE shift_id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;

    if (!rows[0]) throw new Error(`Shift #${id} not found`);
    const updated = this.mapShiftRow(rows[0]);

    if (updated.is_default) {
      await this.saveDefaultWorkingHours(
        { full_day_hours: updated.full_day_hours, half_day_hours: updated.half_day_hours },
        userId,
      );
    }

    return updated;
  }

  async setDefaultShift(id: number, userId?: number): Promise<AttendanceShiftDto> {
    await this.prisma.$executeRaw`UPDATE attendance_shifts SET is_default = false WHERE deleted_at IS NULL`;
    const rows: any[] = await this.prisma.$queryRaw`
      UPDATE attendance_shifts
      SET is_default = true, updated_at = clock_timestamp()
      WHERE shift_id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;
    if (!rows[0]) throw new Error(`Shift #${id} not found`);
    const updated = this.mapShiftRow(rows[0]);

    await this.saveDefaultWorkingHours(
      { full_day_hours: updated.full_day_hours, half_day_hours: updated.half_day_hours },
      userId,
    );

    return updated;
  }

  async deleteShift(id: number, userId?: number): Promise<void> {
    const check: any[] = await this.prisma.$queryRaw`
      SELECT is_default FROM attendance_shifts WHERE shift_id = ${id} AND deleted_at IS NULL
    `;
    if (!check[0]) throw new Error(`Shift #${id} not found`);
    if (check[0].is_default) {
      throw new Error('Cannot delete default shift. Designate another shift as default first.');
    }
    await this.prisma.$executeRaw`
      UPDATE attendance_shifts SET deleted_at = clock_timestamp() WHERE shift_id = ${id}
    `;
  }

  // ----------------------------------------------------
  // ATTENDANCE STATUS MANAGEMENT
  // ----------------------------------------------------

  async getStatuses(): Promise<AttendanceStatusDto[]> {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT * FROM attendance_statuses
      WHERE deleted_at IS NULL
      ORDER BY sort_order ASC, status_id ASC
    `;
    return rows.map((r) => this.mapStatusRow(r));
  }

  async createStatus(status: Partial<AttendanceStatusDto>, userId?: number): Promise<AttendanceStatusDto> {
    const code = (status.code || status.label || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const rows: any[] = await this.prisma.$queryRaw`
      INSERT INTO attendance_statuses (
        code, label, short_code, color, is_active, is_system, sort_order
      ) VALUES (
        ${code},
        ${status.label || 'Custom Status'},
        ${status.short_code || (status.label ? status.label.slice(0, 2).toUpperCase() : 'CS')},
        ${status.color || 'blue'},
        ${status.is_active ?? true},
        false,
        ${status.sort_order ?? 90}
      )
      RETURNING *
    `;
    return this.mapStatusRow(rows[0]);
  }

  async updateStatus(id: number, status: Partial<AttendanceStatusDto>, userId?: number): Promise<AttendanceStatusDto> {
    const rows: any[] = await this.prisma.$queryRaw`
      UPDATE attendance_statuses
      SET label = COALESCE(${status.label}, label),
          short_code = COALESCE(${status.short_code}, short_code),
          color = COALESCE(${status.color}, color),
          is_active = COALESCE(${status.is_active}, is_active),
          sort_order = COALESCE(${status.sort_order}, sort_order),
          updated_at = clock_timestamp()
      WHERE status_id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;
    if (!rows[0]) throw new Error(`Attendance status #${id} not found`);
    return this.mapStatusRow(rows[0]);
  }

  async deleteStatus(id: number, userId?: number): Promise<void> {
    const check: any[] = await this.prisma.$queryRaw`
      SELECT is_system FROM attendance_statuses WHERE status_id = ${id} AND deleted_at IS NULL
    `;
    if (!check[0]) throw new Error(`Status #${id} not found`);
    if (check[0].is_system) {
      throw new Error('System attendance statuses cannot be deleted.');
    }
    await this.prisma.$executeRaw`
      UPDATE attendance_statuses SET deleted_at = clock_timestamp() WHERE status_id = ${id}
    `;
  }

  // ----------------------------------------------------
  // EMPLOYEE SHIFT ASSIGNMENT
  // ----------------------------------------------------

  async getEmployeeShiftAssignments(): Promise<Record<string, number>> {
    const val = await this.getSetting('attendance_employee_shifts');
    if (!val) return {};
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }

  async assignEmployeeShift(empId: number, shiftId: number | null, userId?: number): Promise<void> {
    const assignments = await this.getEmployeeShiftAssignments();
    const empKey = String(empId);
    if (!shiftId) {
      delete assignments[empKey];
    } else {
      assignments[empKey] = shiftId;
    }
    await this.setSetting('attendance_employee_shifts', JSON.stringify(assignments), userId);
  }
}


