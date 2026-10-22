import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { AttendanceDayEntity } from '../../domain/entities/attendance-day.entity';
import { AttendanceBreakEntity } from '../../domain/entities/attendance-break.entity';
import { AttendanceCorrectionEntity } from '../../domain/entities/attendance-correction.entity';
import {
  calculateCompletedDayMinutes,
  calculateOpenDayMinutes,
  determineDayStatus,
  formatWorkDate,
} from '../../domain/services/attendance-calculations';
import { AlreadyPunchedOutError, AttendanceNotFoundError } from '../../domain/errors/attendance.errors';

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapDayRowToEntity(row: any): AttendanceDayEntity {
    return {
      attendanceId: row.attendance_id,
      empId: row.emp_id,
      workDate: typeof row.work_date === 'string'
        ? row.work_date.slice(0, 10)
        : (row.work_date as Date).toISOString().slice(0, 10),
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      breakMinutes: row.break_minutes,
      productionMinutes: row.production_minutes,
      dayStatus: row.day_status,
      source: row.source,
      workedOnNonWorkingDay: row.worked_on_non_working_day,
      note: row.note,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
    };
  }

  private mapBreakRowToEntity(row: any): AttendanceBreakEntity {
    return {
      breakId: row.break_id,
      attendanceId: row.attendance_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      breakType: row.break_type,
      reason: row.reason,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
    };
  }

  private mapCorrectionRowToEntity(row: any): AttendanceCorrectionEntity {
    return {
      correctionId: row.correction_id,
      empId: row.emp_id,
      attendanceId: row.attendance_id,
      workDate: typeof row.work_date === 'string'
        ? row.work_date.slice(0, 10)
        : (row.work_date as Date).toISOString().slice(0, 10),
      requestedCheckInAt: row.requested_check_in_at,
      requestedCheckOutAt: row.requested_check_out_at,
      requestedBreakMinutes: row.requested_break_minutes,
      reason: row.reason,
      status: row.status,
      decidedAt: row.decided_at,
      decidedBy: row.decided_by,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
    };
  }

  async findDayByEmpAndDate(empId: number, workDate: string): Promise<AttendanceDayEntity | null> {
    const row = await this.prisma.attendance_days.findFirst({
      where: {
        emp_id: empId,
        work_date: new Date(workDate),
        deleted_at: null,
      },
    });
    return row ? this.mapDayRowToEntity(row) : null;
  }

  async findDaysByEmpAndMonth(empId: number, yearMonth: string): Promise<AttendanceDayEntity[]> {
    const startDate = new Date(`${yearMonth}-01`);
    const [year, month] = yearMonth.split('-').map(Number);
    const endDate = new Date(Date.UTC(year, month, 0)); // last day of month

    const rows = await this.prisma.attendance_days.findMany({
      where: {
        emp_id: empId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        deleted_at: null,
      },
      orderBy: {
        work_date: 'asc',
      },
    });

    return rows.map((r) => this.mapDayRowToEntity(r));
  }

  async createAttendanceDay(
    data: Omit<AttendanceDayEntity, 'attendanceId' | 'createdAt'>,
  ): Promise<AttendanceDayEntity> {
    const created = await this.prisma.attendance_days.create({
      data: {
        emp_id: data.empId,
        work_date: new Date(data.workDate),
        check_in_at: data.checkInAt,
        check_out_at: data.checkOutAt,
        break_minutes: data.breakMinutes,
        production_minutes: data.productionMinutes,
        day_status: data.dayStatus,
        source: data.source,
        worked_on_non_working_day: data.workedOnNonWorkingDay,
        note: data.note,
        created_by: data.createdBy,
      },
    });
    return this.mapDayRowToEntity(created);
  }

  async closeAttendanceDayWithBreak(
    attendanceId: number,
    checkOutAt: Date,
    breakMinutes: number,
    productionMinutes: number,
    dayStatus: 'present' | 'half_day' | 'short' | 'incomplete',
  ): Promise<AttendanceDayEntity> {
    return this.prisma.$transaction(async (tx) => {
      // 1. End any open break at the same instant
      await tx.attendance_breaks.updateMany({
        where: {
          attendance_id: attendanceId,
          ended_at: null,
          deleted_at: null,
        },
        data: {
          ended_at: checkOutAt,
        },
      });

      // 2. Update attendance_days atomically WHERE check_out_at IS NULL
      const updateResult = await tx.attendance_days.updateMany({
        where: {
          attendance_id: attendanceId,
          check_out_at: null,
          deleted_at: null,
        },
        data: {
          check_out_at: checkOutAt,
          break_minutes: breakMinutes,
          production_minutes: productionMinutes,
          day_status: dayStatus,
          updated_at: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new AlreadyPunchedOutError();
      }

      const updated = await tx.attendance_days.findUnique({
        where: { attendance_id: attendanceId },
      });

      return this.mapDayRowToEntity(updated!);
    });
  }

  async findOpenBreak(attendanceId: number): Promise<AttendanceBreakEntity | null> {
    const row = await this.prisma.attendance_breaks.findFirst({
      where: {
        attendance_id: attendanceId,
        ended_at: null,
        deleted_at: null,
      },
    });
    return row ? this.mapBreakRowToEntity(row) : null;
  }

  async findBreaksByAttendanceId(attendanceId: number): Promise<AttendanceBreakEntity[]> {
    const rows = await this.prisma.attendance_breaks.findMany({
      where: {
        attendance_id: attendanceId,
        deleted_at: null,
      },
      orderBy: {
        started_at: 'asc',
      },
    });
    return rows.map((r) => this.mapBreakRowToEntity(r));
  }

  async findBreaksByAttendanceIds(attendanceIds: number[]): Promise<AttendanceBreakEntity[]> {
    if (attendanceIds.length === 0) return [];
    const rows = await this.prisma.attendance_breaks.findMany({
      where: {
        attendance_id: { in: attendanceIds },
        deleted_at: null,
      },
      orderBy: {
        started_at: 'asc',
      },
    });
    return rows.map((r) => this.mapBreakRowToEntity(r));
  }

  async createBreak(
    attendanceId: number,
    startedAt: Date,
    breakType?: string | null,
    reason?: string | null,
  ): Promise<AttendanceBreakEntity> {
    const row = await this.prisma.attendance_breaks.create({
      data: {
        attendance_id: attendanceId,
        started_at: startedAt,
        break_type: breakType || null,
        reason: reason || null,
      },
    });
    return this.mapBreakRowToEntity(row);
  }

  async closeBreak(breakId: number, endedAt: Date): Promise<AttendanceBreakEntity> {
    const row = await this.prisma.attendance_breaks.update({
      where: { break_id: breakId },
      data: {
        ended_at: endedAt,
        updated_at: new Date(),
      },
    });
    return this.mapBreakRowToEntity(row);
  }

  async createCorrection(
    data: Omit<AttendanceCorrectionEntity, 'correctionId' | 'createdAt'>,
  ): Promise<AttendanceCorrectionEntity> {
    const row = await this.prisma.attendance_corrections.create({
      data: {
        emp_id: data.empId,
        attendance_id: data.attendanceId,
        work_date: new Date(data.workDate),
        requested_check_in_at: data.requestedCheckInAt,
        requested_check_out_at: data.requestedCheckOutAt,
        requested_break_minutes: data.requestedBreakMinutes,
        reason: data.reason,
        status: data.status,
        created_by: data.createdBy,
      },
    });
    return this.mapCorrectionRowToEntity(row);
  }

  async findCorrectionById(correctionId: number): Promise<AttendanceCorrectionEntity | null> {
    const row = await this.prisma.attendance_corrections.findFirst({
      where: {
        correction_id: correctionId,
        deleted_at: null,
      },
    });
    return row ? this.mapCorrectionRowToEntity(row) : null;
  }

  async findCorrectionByEmpAndDate(empId: number, workDate: string): Promise<AttendanceCorrectionEntity | null> {
    const row = await this.prisma.attendance_corrections.findFirst({
      where: {
        emp_id: empId,
        work_date: new Date(workDate),
        deleted_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return row ? this.mapCorrectionRowToEntity(row) : null;
  }

  async approveCorrection(
    correctionId: number,
    decidedBy: number,
    dayData: {
      empId: number;
      workDate: string;
      checkInAt: Date;
      checkOutAt: Date;
      breakMinutes: number;
      productionMinutes: number;
      dayStatus: 'present' | 'half_day' | 'short';
    },
  ): Promise<AttendanceDayEntity> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update correction
      await tx.attendance_corrections.update({
        where: { correction_id: correctionId },
        data: {
          status: 'approved',
          decided_at: new Date(),
          decided_by: decidedBy,
        },
      });

      // 2. Check existing attendance row
      const existing = await tx.attendance_days.findFirst({
        where: {
          emp_id: dayData.empId,
          work_date: new Date(dayData.workDate),
          deleted_at: null,
        },
      });

      let attendanceRow;
      if (existing) {
        // Soft delete breaks
        await tx.attendance_breaks.updateMany({
          where: {
            attendance_id: existing.attendance_id,
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
            deleted_by: decidedBy,
          },
        });

        attendanceRow = await tx.attendance_days.update({
          where: { attendance_id: existing.attendance_id },
          data: {
            check_in_at: dayData.checkInAt,
            check_out_at: dayData.checkOutAt,
            break_minutes: dayData.breakMinutes,
            production_minutes: dayData.productionMinutes,
            day_status: dayData.dayStatus,
            source: 'correction',
            updated_by: decidedBy,
            updated_at: new Date(),
          },
        });
      } else {
        attendanceRow = await tx.attendance_days.create({
          data: {
            emp_id: dayData.empId,
            work_date: new Date(dayData.workDate),
            check_in_at: dayData.checkInAt,
            check_out_at: dayData.checkOutAt,
            break_minutes: dayData.breakMinutes,
            production_minutes: dayData.productionMinutes,
            day_status: dayData.dayStatus,
            source: 'correction',
            created_by: decidedBy,
          },
        });
      }

      return this.mapDayRowToEntity(attendanceRow);
    });
  }

  async rejectCorrection(
    correctionId: number,
    decidedBy: number,
    rejectionReason: string,
  ): Promise<AttendanceCorrectionEntity> {
    const updated = await this.prisma.attendance_corrections.update({
      where: { correction_id: correctionId },
      data: {
        status: 'rejected',
        decided_at: new Date(),
        decided_by: decidedBy,
        rejection_reason: rejectionReason,
      },
    });
    return this.mapCorrectionRowToEntity(updated);
  }

  async adminUpsertDay(
    empId: number,
    workDate: string,
    checkInAt: Date,
    checkOutAt: Date,
    breakMinutes: number,
    productionMinutes: number,
    dayStatus: 'present' | 'half_day' | 'short',
    adminId: number,
    note?: string | null,
  ): Promise<AttendanceDayEntity> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendance_days.findFirst({
        where: {
          emp_id: empId,
          work_date: new Date(workDate),
          deleted_at: null,
        },
      });

      let attendanceRow;
      if (existing) {
        // Soft delete breaks
        await tx.attendance_breaks.updateMany({
          where: {
            attendance_id: existing.attendance_id,
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
            deleted_by: adminId,
          },
        });

        attendanceRow = await tx.attendance_days.update({
          where: { attendance_id: existing.attendance_id },
          data: {
            check_in_at: checkInAt,
            check_out_at: checkOutAt,
            break_minutes: breakMinutes,
            production_minutes: productionMinutes,
            day_status: dayStatus,
            source: 'admin',
            note: note !== undefined ? note : existing.note,
            updated_by: adminId,
            updated_at: new Date(),
          },
        });
      } else {
        attendanceRow = await tx.attendance_days.create({
          data: {
            emp_id: empId,
            work_date: new Date(workDate),
            check_in_at: checkInAt,
            check_out_at: checkOutAt,
            break_minutes: breakMinutes,
            production_minutes: productionMinutes,
            day_status: dayStatus,
            source: 'admin',
            note,
            created_by: adminId,
          },
        });
      }

      return this.mapDayRowToEntity(attendanceRow);
    });
  }

  async getEmployeeProfile(
    empId: number,
  ): Promise<{ empId: number; status: string; joiningDate: string; exitDate: string | null } | null> {
    const emp = await this.prisma.employees.findFirst({
      where: { emp_id: empId, deleted_at: null },
      select: { emp_id: true, status: true, joining_date: true, exit_date: true },
    });
    if (!emp) return null;
    return {
      empId: emp.emp_id,
      status: emp.status,
      joiningDate: emp.joining_date.toISOString().slice(0, 10),
      exitDate: emp.exit_date ? emp.exit_date.toISOString().slice(0, 10) : null,
    };
  }

  /**
   * Performance-optimized month data using ONE SQL query (generate_series + joins)
   */
  async getDashboardMonthData(
    empId: number,
    yearMonth: string,
    weekStartDay: number,
    todayDate: string,
    now: Date,
    options?: {
      workingDays?: number[];
      holidays?: Array<{ date: string; name: string }>;
      fullDayMinutes?: number;
      halfDayMinutes?: number;
    },
  ): Promise<{
    days: Array<{
      date: string;
      state: 'present' | 'half_day' | 'short' | 'incomplete' | 'leave' | 'holiday' | 'weekly_off' | 'absent' | 'upcoming';
      check_in_at: Date | null;
      check_out_at: Date | null;
      production_minutes: number;
      break_minutes: number;
      day_status: string | null;
      leave: { type_name: string; part: string } | null;
      holiday_name: string | null;
      flags: Record<string, any>;
      breaks: Array<{ started_at: Date; ended_at: Date | null }>;
    }>;
  }> {
    const monthStartStr = `${yearMonth}-01`;

    const rawRows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      WITH month_bounds AS (
        SELECT 
          $2::date AS m_start,
          ($2::date + interval '1 month' - interval '1 day')::date AS m_end
      ),
      cal_days AS (
        SELECT generate_series(m_start, m_end, '1 day'::interval)::date AS day_date
        FROM month_bounds
      )
      SELECT
        TO_CHAR(cd.day_date, 'YYYY-MM-DD') AS date,
        EXTRACT(DOW FROM cd.day_date)::int AS dow,
        ad.attendance_id,
        ad.check_in_at,
        ad.check_out_at,
        COALESCE(ad.break_minutes, 0)::int AS break_minutes,
        COALESCE(ad.production_minutes, 0)::int AS production_minutes,
        ad.day_status::text AS day_status,
        COALESCE(ad.worked_on_non_working_day, false) AS worked_on_non_working_day,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'break_id', ab.break_id,
                'started_at', ab.started_at,
                'ended_at', ab.ended_at,
                'break_type', ab.break_type,
                'reason', ab.reason
              ) ORDER BY ab.started_at ASC
            )
            FROM attendance_breaks ab
            WHERE ab.attendance_id = ad.attendance_id
              AND ab.deleted_at IS NULL
          ),
          '[]'::json
        ) AS breaks
      FROM cal_days cd
      LEFT JOIN attendance_days ad
        ON ad.emp_id = $1
        AND ad.work_date = cd.day_date
        AND ad.deleted_at IS NULL
      ORDER BY cd.day_date ASC;
      `,
      empId,
      monthStartStr,
    );

    const workingDaysList = options?.workingDays ?? [1, 2, 3, 4, 5, 6];
    const holidaysList = options?.holidays || [];
    const fullDayMins = options?.fullDayMinutes ?? 480;
    const halfDayMins = options?.halfDayMinutes ?? 240;

    const days = rawRows.map((r) => {
      const dateStr = r.date;
      const isPast = dateStr < todayDate;
      const isToday = dateStr === todayDate;
      const isFuture = dateStr > todayDate;
      const isWeeklyOff = !workingDaysList.includes(r.dow);
      const holidayMatch = holidaysList.find((h) => h.date === dateStr);
      const isHoliday = !!holidayMatch;

      const breaksList: Array<{
        started_at: Date;
        ended_at: Date | null;
        break_type?: string | null;
        reason?: string | null;
      }> = (r.breaks || []).map((b: any) => ({
        started_at: new Date(b.started_at),
        ended_at: b.ended_at ? new Date(b.ended_at) : null,
        break_type: b.break_type || null,
        reason: b.reason || null,
      }));

      let state: 'present' | 'half_day' | 'short' | 'incomplete' | 'leave' | 'holiday' | 'weekly_off' | 'absent' | 'upcoming';
      let prodMinutes = r.production_minutes || 0;
      let brkMinutes = r.break_minutes || 0;
      let dayStatus = r.day_status || null;

      if (r.check_in_at) {
        if (r.check_out_at) {
          state = determineDayStatus(new Date(r.check_out_at), prodMinutes, fullDayMins, halfDayMins);
          dayStatus = state;
        } else {
          // Open day (e.g. today)
          state = 'incomplete';
          dayStatus = 'incomplete';
          if (isToday) {
            const openCalc = calculateOpenDayMinutes(
              new Date(r.check_in_at),
              now,
              breaksList.map((b) => ({ startedAt: b.started_at, endedAt: b.ended_at })),
            );
            prodMinutes = openCalc.workedMinutesSoFar;
            brkMinutes = openCalc.breakMinutesSoFar;
          }
        }
      } else {
        if (isHoliday) {
          state = 'holiday';
        } else if (isWeeklyOff) {
          state = 'weekly_off';
        } else if (isPast) {
          state = 'absent';
        } else if (isToday) {
          state = isWeeklyOff ? 'weekly_off' : (isHoliday ? 'holiday' : 'absent');
        } else {
          state = 'upcoming';
        }
      }

      return {
        date: dateStr,
        state,
        check_in_at: r.check_in_at ? new Date(r.check_in_at) : null,
        check_out_at: r.check_out_at ? new Date(r.check_out_at) : null,
        production_minutes: prodMinutes,
        break_minutes: brkMinutes,
        day_status: dayStatus,
        leave: null,
        holiday_name: holidayMatch ? holidayMatch.name : null,
        flags: {
          worked_on_non_working_day: r.worked_on_non_working_day || (isWeeklyOff || isHoliday),
        },
        breaks: breaksList,
      };
    });

    return { days };
  }

  async findDayDetail(empId: number, dateStr: string): Promise<{
    date: string;
    state: string;
    events: Array<{ type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out'; at: string }>;
    breaks: Array<{ started_at: string; ended_at: string | null; minutes: number }>;
    production_minutes: number;
    break_minutes: number;
    status: string;
    leave: { type_name: string; part: string } | null;
    holiday: string | null;
    correction: { id: number; status: string } | null;
    can_request_correction: boolean;
  } | null> {
    const profile = await this.getEmployeeProfile(empId);
    if (!profile) return null;

    // Check if outside employee joining/exit range
    if (dateStr < profile.joiningDate) return null;
    if (profile.exitDate && dateStr > profile.exitDate) return null;

    const dayRow = await this.prisma.attendance_days.findFirst({
      where: {
        emp_id: empId,
        work_date: new Date(dateStr),
        deleted_at: null,
      },
      include: {
        attendance_breaks: {
          where: { deleted_at: null },
          orderBy: { started_at: 'asc' },
        },
      },
    });

    const correction = await this.prisma.attendance_corrections.findFirst({
      where: {
        emp_id: empId,
        work_date: new Date(dateStr),
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    const events: Array<{ type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out'; at: string }> = [];
    const breaks: Array<{ started_at: string; ended_at: string | null; minutes: number }> = [];

    let prodMins = 0;
    let brkMins = 0;
    let statusStr = 'absent';
    let stateStr = 'absent';

    const dayDate = new Date(dateStr);
    const isWeeklyOff = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;

    if (dayRow) {
      prodMins = dayRow.production_minutes;
      brkMins = dayRow.break_minutes;
      statusStr = dayRow.day_status;
      stateStr = dayRow.day_status;

      events.push({
        type: 'punch_in',
        at: dayRow.check_in_at.toISOString(),
      });

      for (const b of dayRow.attendance_breaks) {
        events.push({
          type: 'break_start',
          at: b.started_at.toISOString(),
          break_type: b.break_type || null,
          reason: b.reason || null,
        } as any);
        if (b.ended_at) {
          events.push({
            type: 'break_end',
            at: b.ended_at.toISOString(),
            break_type: b.break_type || null,
            reason: b.reason || null,
          } as any);
        }
        const bDuration = b.ended_at
          ? Math.floor((b.ended_at.getTime() - b.started_at.getTime()) / 60000)
          : 0;
        breaks.push({
          started_at: b.started_at.toISOString(),
          ended_at: b.ended_at ? b.ended_at.toISOString() : null,
          minutes: bDuration,
        });
      }

      if (dayRow.check_out_at) {
        events.push({
          type: 'punch_out',
          at: dayRow.check_out_at.toISOString(),
        });
      }
    } else {
      if (isWeeklyOff) {
        statusStr = 'weekly_off';
        stateStr = 'weekly_off';
      }
    }

    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const canRequestCorrection = !correction || correction.status === 'rejected';

    return {
      date: dateStr,
      state: stateStr,
      events,
      breaks,
      production_minutes: prodMins,
      break_minutes: brkMins,
      status: statusStr,
      leave: null,
      holiday: null,
      correction: correction ? { id: correction.correction_id, status: correction.status } : null,
      can_request_correction: canRequestCorrection,
    };
  }

  async getTeamAttendance(query: { date?: string; month?: string; depId?: number }): Promise<any[]> {
    const where: any = { deleted_at: null };
    if (query.date) {
      where.work_date = new Date(query.date);
    } else if (query.month) {
      const startDate = new Date(`${query.month}-01`);
      const [year, month] = query.month.split('-').map(Number);
      const endDate = new Date(Date.UTC(year, month, 0));
      where.work_date = { gte: startDate, lte: endDate };
    }

    const rows = await this.prisma.attendance_days.findMany({
      where,
      include: {
        employees_attendance_days_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            dep_id: true,
            departments_employees_dep_idTodepartments: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [{ work_date: 'desc' }, { emp_id: 'asc' }],
    });

    let filtered = rows;
    if (query.depId) {
      filtered = rows.filter((r) => r.employees_attendance_days_emp_idToemployees?.dep_id === query.depId);
    }

    return filtered.map((r) => ({
      attendance_id: r.attendance_id,
      emp_id: r.emp_id,
      employee_name: r.employees_attendance_days_emp_idToemployees?.name || '',
      department: r.employees_attendance_days_emp_idToemployees?.departments_employees_dep_idTodepartments?.name || null,
      work_date: r.work_date.toISOString().slice(0, 10),
      check_in_at: r.check_in_at,
      check_out_at: r.check_out_at,
      break_minutes: r.break_minutes,
      production_minutes: r.production_minutes,
      day_status: r.day_status,
      source: r.source,
      worked_on_non_working_day: r.worked_on_non_working_day,
    }));
  }

  async getAttendanceCsvReport(yearMonth: string): Promise<string> {
    const data = await this.getTeamAttendance({ month: yearMonth });
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Date',
      'Check In',
      'Check Out',
      'Break Minutes',
      'Production Minutes',
      'Status',
    ];

    const lines = [headers.join(',')];
    for (const r of data) {
      const row = [
        r.emp_id,
        `"${(r.employee_name || '').replace(/"/g, '""')}"`,
        `"${(r.department || '').replace(/"/g, '""')}"`,
        r.work_date,
        r.check_in_at ? r.check_in_at.toISOString() : '',
        r.check_out_at ? r.check_out_at.toISOString() : '',
        r.break_minutes,
        r.production_minutes,
        r.day_status,
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }
}
