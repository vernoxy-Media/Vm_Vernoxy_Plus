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
import { AlreadyPunchedOutError, AttendanceNotFoundError, AttendanceDomainError } from '../../domain/errors/attendance.errors';

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
      requestId: row.request_id || `REG-${String(row.correction_id).padStart(4, '0')}`,
      empId: row.emp_id,
      attendanceId: row.attendance_id,
      workDate: typeof row.work_date === 'string'
        ? row.work_date.slice(0, 10)
        : (row.work_date as Date).toISOString().slice(0, 10),
      requestType: row.request_type || 'Incorrect Time',
      currentCheckInAt: row.current_check_in_at,
      currentCheckOutAt: row.current_check_out_at,
      requestedCheckInAt: row.requested_check_in_at,
      requestedCheckOutAt: row.requested_check_out_at,
      requestedBreakMinutes: row.requested_break_minutes || 0,
      reason: row.reason,
      remarks: row.remarks,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      status: row.status,
      decidedAt: row.decided_at,
      decidedBy: row.decided_by,
      rejectionReason: row.rejection_reason,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
      departmentName: row.department_name,
      approvals: row.approvals,
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
    dayStatus: 'present' | 'half_day' | 'short' | 'incomplete' | 'absent',
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
        requested_check_in_at: data.requestedCheckInAt || new Date(),
        requested_check_out_at: data.requestedCheckOutAt || new Date(),
        requested_break_minutes: data.requestedBreakMinutes,
        reason: data.reason,
        status: data.status as any,
        created_by: data.createdBy,
      },
    });
    return this.mapCorrectionRowToEntity(row);
  }

  async findCorrectionById(correctionId: number): Promise<AttendanceCorrectionEntity | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT 
        c.*,
        e.name as employee_name,
        'EMP-' || LPAD(e.emp_id::text, 4, '0') as employee_code,
        d.name as department_name
      FROM attendance_corrections c
      JOIN employees e ON e.emp_id = c.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE c.correction_id = ${correctionId} AND c.deleted_at IS NULL
      LIMIT 1
    `;
    if (!rows || rows.length === 0) return null;
    const row = rows[0];

    // Fetch approvals
    const approvals = await this.prisma.$queryRaw<any[]>`
      SELECT 
        a.approval_id,
        a.correction_id,
        a.level,
        a.level_name,
        a.approver_id,
        e.name as approver_name,
        a.action,
        a.comment,
        a.action_date,
        a.created_at,
        a.created_by,
        a.updated_at,
        a.updated_by,
        a.deleted_at,
        a.deleted_by
      FROM attendance_correction_approvals a
      LEFT JOIN employees e ON e.emp_id = a.approver_id
      WHERE a.correction_id = ${correctionId} AND a.deleted_at IS NULL
      ORDER BY a.level ASC, a.created_at ASC
    `;

    row.approvals = approvals.map((a: any) => ({
      approvalId: a.approval_id,
      correctionId: a.correction_id,
      level: a.level,
      levelName: a.level_name,
      approverId: a.approver_id,
      approverName: a.approver_name,
      action: a.action,
      comment: a.comment,
      actionDate: a.action_date,
      createdAt: a.created_at,
      createdBy: a.created_by,
      updatedAt: a.updated_at,
      updatedBy: a.updated_by,
      deletedAt: a.deleted_at,
      deletedBy: a.deleted_by,
    }));

    return this.mapCorrectionRowToEntity(row);
  }

  async listRegularizations(params: {
    empId?: number;
    status?: string;
    tab?: string;
    departmentId?: number;
    requestType?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    isManagerOrAdmin?: boolean;
    viewerEmpId?: number;
  }): Promise<AttendanceCorrectionEntity[]> {
    const conditions: string[] = ['c.deleted_at IS NULL'];

    if (params.empId) {
      conditions.push(`c.emp_id = ${Number(params.empId)}`);
    }

    if (params.tab) {
      if (params.tab === 'pending') {
        conditions.push(`c.status = 'pending'`);
      } else if (params.tab === 'approved') {
        conditions.push(`c.status = 'approved'`);
      } else if (params.tab === 'rejected') {
        conditions.push(`c.status = 'rejected'`);
      }
    } else if (params.status && params.status !== 'all') {
      conditions.push(`c.status = '${params.status}'`);
    }

    if (params.departmentId) {
      conditions.push(`e.dep_id = ${Number(params.departmentId)}`);
    }

    if (params.requestType && params.requestType !== 'all') {
      conditions.push(`c.request_type = '${params.requestType}'`);
    }

    if (params.fromDate) {
      conditions.push(`c.work_date >= '${params.fromDate}'::date`);
    }

    if (params.toDate) {
      conditions.push(`c.work_date <= '${params.toDate}'::date`);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim().replace(/'/g, "''");
      conditions.push(`(
        e.name ILIKE '%${q}%' 
        OR c.request_id ILIKE '%${q}%' 
        OR ('EMP-' || LPAD(e.emp_id::text, 4, '0')) ILIKE '%${q}%'
      )`);
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT 
        c.*,
        e.name as employee_name,
        'EMP-' || LPAD(e.emp_id::text, 4, '0') as employee_code,
        d.name as department_name
      FROM attendance_corrections c
      JOIN employees e ON e.emp_id = c.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(query);
    return rows.map((r) => this.mapCorrectionRowToEntity(r));
  }

  async createRegularization(data: {
    empId: number;
    workDate: string;
    requestType: string;
    currentCheckInAt?: Date | null;
    currentCheckOutAt?: Date | null;
    requestedCheckInAt?: Date | null;
    requestedCheckOutAt?: Date | null;
    reason: string;
    remarks: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    createdBy: number;
  }): Promise<AttendanceCorrectionEntity> {
    const correctionId = await this.prisma.$transaction(async (tx) => {
      // 1. Insert correction
      const [inserted] = await tx.$queryRaw<any[]>`
        INSERT INTO attendance_corrections (
          emp_id,
          work_date,
          request_type,
          current_check_in_at,
          current_check_out_at,
          requested_check_in_at,
          requested_check_out_at,
          reason,
          remarks,
          attachment_url,
          attachment_name,
          status,
          created_by,
          created_at
        ) VALUES (
          ${data.empId},
          ${new Date(data.workDate)},
          ${data.requestType},
          ${data.currentCheckInAt || null},
          ${data.currentCheckOutAt || null},
          ${data.requestedCheckInAt || null},
          ${data.requestedCheckOutAt || null},
          ${data.reason},
          ${data.remarks},
          ${data.attachmentUrl || null},
          ${data.attachmentName || null},
          'pending',
          ${data.createdBy},
          clock_timestamp()
        )
        RETURNING *
      `;

      // 2. Insert initial pending approval level
      await tx.$queryRaw`
        INSERT INTO attendance_correction_approvals (
          correction_id,
          level,
          level_name,
          action,
          created_by,
          created_at
        ) VALUES (
          ${inserted.correction_id},
          1,
          'Level 1 - HR',
          'pending',
          ${data.createdBy},
          clock_timestamp()
        )
      `;

      return inserted.correction_id;
    });

    return (await this.findCorrectionById(correctionId))!;
  }

  async cancelRegularization(correctionId: number, empId: number): Promise<AttendanceCorrectionEntity> {
    const existing = await this.findCorrectionById(correctionId);
    if (!existing) {
      throw new AttendanceNotFoundError(`Regularization request #${correctionId} not found`);
    }
    if (existing.empId !== empId) {
      throw new AttendanceDomainError('UNAUTHORIZED', 'You can only cancel your own regularization request', 403);
    }
    if (existing.status !== 'pending') {
      throw new AttendanceDomainError('INVALID_STATE', `Only pending requests can be cancelled. Current status is ${existing.status}`, 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        UPDATE attendance_corrections 
        SET status = 'cancelled', updated_at = clock_timestamp(), updated_by = ${empId}
        WHERE correction_id = ${correctionId}
      `;

      await tx.$queryRaw`
        UPDATE attendance_correction_approvals 
        SET action = 'cancelled', action_date = clock_timestamp(), updated_at = clock_timestamp(), updated_by = ${empId}
        WHERE correction_id = ${correctionId} AND action = 'pending'
      `;
    });

    return (await this.findCorrectionById(correctionId))!;
  }

  async approveRegularization(
    correctionId: number,
    approverId: number,
    comment?: string,
  ): Promise<AttendanceCorrectionEntity> {
    const existing = await this.findCorrectionById(correctionId);
    if (!existing) {
      throw new AttendanceNotFoundError(`Regularization request #${correctionId} not found`);
    }
    if (existing.empId === approverId) {
      throw new AttendanceDomainError('SELF_APPROVAL_FORBIDDEN', 'You cannot approve your own request.', 400);
    }
    if (existing.status !== 'pending') {
      throw new AttendanceDomainError('INVALID_STATE', `Only pending requests can be approved. Current status is ${existing.status}`, 400);
    }

    const checkIn = existing.requestedCheckInAt || existing.currentCheckInAt || new Date(`${existing.workDate}T09:30:00.000Z`);
    const checkOut = existing.requestedCheckOutAt || existing.currentCheckOutAt || new Date(`${existing.workDate}T18:30:00.000Z`);

    const durationMinutes = Math.max(0, Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000));
    const dayStatus = durationMinutes >= 480 ? 'present' : (durationMinutes >= 240 ? 'half_day' : 'short');

    await this.prisma.$transaction(async (tx) => {
      // 1. Update approval row
      await tx.$queryRaw`
        UPDATE attendance_correction_approvals 
        SET 
          action = 'approved',
          approver_id = ${approverId},
          comment = ${comment || null},
          action_date = clock_timestamp(),
          updated_at = clock_timestamp(),
          updated_by = ${approverId}
        WHERE correction_id = ${correctionId} AND action = 'pending'
      `;

      // 2. Update correction status
      await tx.$queryRaw`
        UPDATE attendance_corrections 
        SET 
          status = 'approved',
          decided_at = clock_timestamp(),
          decided_by = ${approverId},
          updated_at = clock_timestamp(),
          updated_by = ${approverId}
        WHERE correction_id = ${correctionId}
      `;

      // 3. Upsert attendance_days
      const existingDay = await tx.attendance_days.findFirst({
        where: {
          emp_id: existing.empId,
          work_date: new Date(existing.workDate),
          deleted_at: null,
        },
      });

      if (existingDay) {
        await tx.attendance_days.update({
          where: { attendance_id: existingDay.attendance_id },
          data: {
            check_in_at: checkIn,
            check_out_at: checkOut,
            production_minutes: durationMinutes,
            day_status: dayStatus,
            note: `Regularized via ${existing.requestId || `REG-${correctionId}`}`,
            updated_at: new Date(),
            updated_by: approverId,
          },
        });
      } else {
        await tx.attendance_days.create({
          data: {
            emp_id: existing.empId,
            work_date: new Date(existing.workDate),
            check_in_at: checkIn,
            check_out_at: checkOut,
            production_minutes: durationMinutes,
            day_status: dayStatus,
            note: `Regularized via ${existing.requestId || `REG-${correctionId}`}`,
            created_by: approverId,
          },
        });
      }
    });

    return (await this.findCorrectionById(correctionId))!;
  }

  async rejectRegularization(
    correctionId: number,
    approverId: number,
    comment: string,
  ): Promise<AttendanceCorrectionEntity> {
    if (!comment || comment.trim().length === 0) {
      throw new AttendanceDomainError('COMMENT_REQUIRED', 'Please enter a comment to reject.', 400);
    }
    const existing = await this.findCorrectionById(correctionId);
    if (!existing) {
      throw new AttendanceNotFoundError(`Regularization request #${correctionId} not found`);
    }
    if (existing.status !== 'pending') {
      throw new AttendanceDomainError('INVALID_STATE', `Only pending requests can be rejected. Current status is ${existing.status}`, 400);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        UPDATE attendance_correction_approvals 
        SET 
          action = 'rejected',
          approver_id = ${approverId},
          comment = ${comment.trim()},
          action_date = clock_timestamp(),
          updated_at = clock_timestamp(),
          updated_by = ${approverId}
        WHERE correction_id = ${correctionId} AND action = 'pending'
      `;

      await tx.$queryRaw`
        UPDATE attendance_corrections 
        SET 
          status = 'rejected',
          rejection_reason = ${comment.trim()},
          decided_at = clock_timestamp(),
          decided_by = ${approverId},
          updated_at = clock_timestamp(),
          updated_by = ${approverId}
        WHERE correction_id = ${correctionId}
      `;
    });

    return (await this.findCorrectionById(correctionId))!;
  }

  async bulkApproveRegularizations(
    correctionIds: number[],
    approverId: number,
  ): Promise<{ successCount: number; failedCount: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const id of correctionIds) {
      try {
        await this.approveRegularization(id, approverId);
        successCount++;
      } catch {
        failedCount++;
      }
    }

    return { successCount, failedCount };
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
      dayStatus: 'present' | 'half_day' | 'short' | 'absent';
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
    dayStatus: 'present' | 'half_day' | 'short' | 'absent',
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
      graceMinutes?: number;
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
      leave: { type_name: string; part: string; [key: string]: any } | null;
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
    const [ymY, ymM] = yearMonth.split('-').map(Number);
    const monthEndStr = `${yearMonth}-${String(new Date(Date.UTC(ymY, ymM, 0)).getUTCDate()).padStart(2, '0')}`;
    const leaveByDate = await this.findApprovedLeaveDays(empId, monthStartStr, monthEndStr);
    const fullDayMins = options?.fullDayMinutes ?? 480;
    const halfDayMins = options?.halfDayMinutes ?? 240;
    const graceMins = options?.graceMinutes ?? 0;

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

      // Weekly Offs and Holidays inside a leave keep WO / H (BFD Leave 8).
      const leaveDay = !isWeeklyOff && !isHoliday ? leaveByDate.get(dateStr) : undefined;
      const isFullLeave = leaveDay?.day_part === 'FULL_DAY';
      const isLegacyLeaveRow = r.day_status === 'leave';
      // A half-day leave leaves one working half: that half is measured against the half-day target
      const halfLeaveWorked = !!leaveDay && !isFullLeave;
      const dayTargetMins = halfLeaveWorked ? halfDayMins : fullDayMins;

      if (isFullLeave || (isLegacyLeaveRow && !leaveDay)) {
        state = isFullLeave ? 'leave' : (isPast ? 'absent' : 'upcoming');
        dayStatus = isFullLeave ? 'leave' : null;
        prodMinutes = 0;
        brkMinutes = 0;
      } else if (r.check_in_at && (!isLegacyLeaveRow || leaveDay)) {
        // A row the old leave code marked 'leave' under a half-day leave is a real check-in.
        if (r.check_out_at) {
          state = determineDayStatus(new Date(r.check_out_at), prodMinutes, dayTargetMins, halfLeaveWorked ? Math.floor(halfDayMins / 2) : halfDayMins, graceMins);
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
          } else if (isPast) {
            const totalBreakMinutes = breaksList.reduce((acc, b) => {
              const end = b.ended_at || new Date(new Date(r.check_in_at).getTime() + dayTargetMins * 60000);
              return acc + Math.max(0, Math.floor((end.getTime() - b.started_at.getTime()) / 60000));
            }, 0);
            brkMinutes = totalBreakMinutes;
            prodMinutes = Math.max(0, dayTargetMins - totalBreakMinutes);
            state = determineDayStatus(
              new Date(new Date(r.check_in_at).getTime() + (dayTargetMins + totalBreakMinutes) * 60000),
              prodMinutes,
              dayTargetMins,
              halfLeaveWorked ? Math.floor(halfDayMins / 2) : halfDayMins,
              graceMins,
            );
            dayStatus = state;
          }
        }
      } else if (leaveDay) {
        // Half day of approved leave with no check-in for the other half.
        state = 'leave';
        dayStatus = 'leave';
        prodMinutes = 0;
        brkMinutes = 0;
      } else if (r.day_status === 'absent') {
        state = 'absent';
        dayStatus = 'absent';
        prodMinutes = 0;
        brkMinutes = 0;
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
        leave: leaveDay
          ? {
              type_name: leaveDay.leave_type_name,
              part: leaveDay.day_part === 'FULL_DAY' ? 'full' : 'half',
              half: leaveDay.day_part,
              request_no: leaveDay.request_no,
              from_date: leaveDay.from_date,
              to_date: leaveDay.to_date,
              approved_by: leaveDay.approved_by,
              is_paid: leaveDay.is_paid,
            }
          : null,
        holiday_name: holidayMatch ? holidayMatch.name : null,
        flags: {
          worked_on_non_working_day: r.worked_on_non_working_day || (isWeeklyOff || isHoliday),
        },
        breaks: breaksList,
      };
    });

    return { days };
  }

  /**
   * Approved leave days of an employee (Leave Management is the source of truth).
   * Pending, Rejected, Withdrawn and Cancelled leave never reach Attendance.
   */
  async findApprovedLeaveDays(empId: number, fromDate: string, toDate: string): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    try {
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT TO_CHAR(d.leave_date, 'YYYY-MM-DD') AS leave_date, d.day_part, t.name AS leave_type_name,
               r.request_no, r.request_id, TO_CHAR(r.from_date, 'YYYY-MM-DD') AS from_date,
               TO_CHAR(r.to_date, 'YYYY-MM-DD') AS to_date, a.name AS approved_by, r.is_paid
        FROM leave_request_days d
        JOIN leave_requests r ON r.request_id = d.request_id
        JOIN leave_types t ON t.leave_type_id = r.leave_type_id
        LEFT JOIN employees a ON a.emp_id = r.decided_by
        WHERE d.emp_id = ${empId}
          AND d.leave_date BETWEEN ${fromDate}::date AND ${toDate}::date
          AND r.status IN ('APPROVED', 'CANCELLATION_REQUESTED');
      `;
      for (const r of rows) map.set(r.leave_date, r);
    } catch {
      /* leave tables not migrated yet */
    }
    return map;
  }

  /** Approved and pending leave on one date (check-in rules, today block). */
  async findLeaveForDate(empId: number, dateStr: string): Promise<{
    approved: {
      day_part: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
      leave_type_name: string;
      request_no: string;
      from_date: string;
      to_date: string;
      approved_by: string | null;
    } | null;
    pending: { request_no: string; leave_type_name: string } | null;
    second_half_starts_at: Date | null;
  }> {
    try {
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT d.day_part, r.status, t.name AS leave_type_name, r.request_no,
               TO_CHAR(r.from_date, 'YYYY-MM-DD') AS from_date, TO_CHAR(r.to_date, 'YYYY-MM-DD') AS to_date,
               a.name AS approved_by
        FROM leave_request_days d
        JOIN leave_requests r ON r.request_id = d.request_id
        JOIN leave_types t ON t.leave_type_id = r.leave_type_id
        LEFT JOIN employees a ON a.emp_id = r.decided_by
        WHERE d.emp_id = ${empId} AND d.leave_date = ${dateStr}::date
          AND r.status IN ('APPROVED', 'CANCELLATION_REQUESTED', 'PENDING');
      `;
      const approved = rows.find((r) => r.status !== 'PENDING') || null;
      const pending = rows.find((r) => r.status === 'PENDING') || null;
      let secondHalf: Date | null = null;
      if (approved && approved.day_part === 'FIRST_HALF') {
        let shiftId: number | null = null;
        const setting = await this.prisma.app_settings.findFirst({ where: { setting_key: 'attendance_employee_shifts' } });
        try {
          const m = JSON.parse(setting?.setting_value || '{}');
          if (m[String(empId)]) shiftId = Number(m[String(empId)]);
        } catch {
          /* ignore */
        }
        const shifts = await this.prisma.$queryRaw<any[]>`
          SELECT shift_id, is_default, start_time, end_time FROM attendance_shifts WHERE deleted_at IS NULL;
        `;
        const shift = shifts.find((x) => shiftId && x.shift_id === shiftId) || shifts.find((x) => x.is_default);
        if (shift?.start_time && shift?.end_time) {
          const toMin = (t: Date) => new Date(t).getUTCHours() * 60 + new Date(t).getUTCMinutes();
          const start = toMin(shift.start_time);
          let end = toMin(shift.end_time);
          if (end <= start) end += 24 * 60;
          const mid = start + Math.floor((end - start) / 2);
          // Shift times are company-local (Asia/Kolkata, UTC+05:30).
          secondHalf = new Date(new Date(`${dateStr}T00:00:00+05:30`).getTime() + mid * 60000);
        }
      }
      return {
        approved: approved
          ? {
              day_part: approved.day_part,
              leave_type_name: approved.leave_type_name,
              request_no: approved.request_no,
              from_date: approved.from_date,
              to_date: approved.to_date,
              approved_by: approved.approved_by,
            }
          : null,
        pending: pending ? { request_no: pending.request_no, leave_type_name: pending.leave_type_name } : null,
        second_half_starts_at: secondHalf,
      };
    } catch {
      return { approved: null, pending: null, second_half_starts_at: null };
    }
  }

  async findDayDetail(empId: number, dateStr: string): Promise<{
    date: string;
    state: string;
    events: Array<{ type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out'; at: string }>;
    breaks: Array<{ started_at: string; ended_at: string | null; minutes: number }>;
    production_minutes: number;
    break_minutes: number;
    status: string;
    leave: { type_name: string; part: string; [key: string]: any } | null;
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

    const leaveInfo = await this.findLeaveForDate(empId, dateStr);
    const approvedLeave = leaveInfo.approved;
    if (approvedLeave?.day_part === 'FULL_DAY') {
      stateStr = 'leave';
      statusStr = 'leave';
    }
    // An L day cannot be corrected; the leave must be cancelled first.
    const canRequestCorrection =
      approvedLeave?.day_part !== 'FULL_DAY' && (!correction || correction.status === 'rejected');

    return {
      date: dateStr,
      state: stateStr,
      events,
      breaks,
      production_minutes: prodMins,
      break_minutes: brkMins,
      status: statusStr,
      leave: approvedLeave
        ? {
            type_name: approvedLeave.leave_type_name,
            part: approvedLeave.day_part === 'FULL_DAY' ? 'full' : 'half',
            half: approvedLeave.day_part,
            request_no: approvedLeave.request_no,
            from_date: approvedLeave.from_date,
            to_date: approvedLeave.to_date,
            approved_by: approvedLeave.approved_by,
          }
        : null,
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

  async getAttendanceRegister(query: {
    date?: string;
    departmentId?: number;
    shiftId?: number;
    status?: string;
    search?: string;
  }): Promise<any> {
    const workDateStr = query.date || new Date().toISOString().slice(0, 10);
    const [year, month, day] = workDateStr.split('-').map(Number);
    const workDateObj = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = workDateObj.getUTCDay();
    const todayStr = new Date().toISOString().slice(0, 10);
    const isPastDate = workDateStr < todayStr;
    const isToday = workDateStr === todayStr;

    const [
      allDepartments,
      shifts,
      dbStatuses,
      employees,
      holiday,
      empShiftsSetting,
      workingDaysSetting,
      attendanceDays,
      leaves,
    ] = await Promise.all([
      this.prisma.departments.findMany({
        where: { deleted_at: null },
        select: { dep_id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.attendance_shifts.findMany({
        where: { deleted_at: null, is_active: true },
        orderBy: { shift_name: 'asc' },
      }),
      this.prisma.attendance_statuses.findMany({
        where: { deleted_at: null, is_active: true },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.employees.findMany({
        where: {
          deleted_at: null,
          status: { not: 'Inactive' },
        },
        select: {
          emp_id: true,
          name: true,
          dep_id: true,
          status: true,
          departments_employees_dep_idTodepartments: {
            select: { name: true },
          },
        },
        orderBy: { emp_id: 'asc' },
      }),
      this.prisma.company_holidays.findFirst({
        where: { holiday_date: workDateObj, deleted_at: null },
      }),
      this.prisma.app_settings.findFirst({ where: { setting_key: 'attendance_employee_shifts' } }),
      this.prisma.app_settings.findFirst({ where: { setting_key: 'attendance_working_days' } }),
      this.prisma.attendance_days.findMany({
        where: { work_date: workDateObj, deleted_at: null },
      }),
      this.prisma.$queryRaw<any[]>`
        SELECT d.emp_id, d.day_part, d.leave_date AS from_date, d.leave_date AS to_date,
               t.name AS leave_type_name, r.is_paid, r.request_no
        FROM leave_request_days d
        JOIN leave_requests r ON r.request_id = d.request_id
        JOIN leave_types t ON t.leave_type_id = r.leave_type_id
        WHERE d.leave_date = ${workDateObj}::date
          AND r.status IN ('APPROVED', 'CANCELLATION_REQUESTED');
      `,
    ]);

    const defaultShift = shifts.find((s) => s.is_default) || shifts[0];

    let empShifts: Record<string, number> = {};
    if (empShiftsSetting?.setting_value) {
      try {
        empShifts = JSON.parse(empShiftsSetting.setting_value) || {};
      } catch {}
    }

    let workingDays: number[] = [1, 2, 3, 4, 5, 6];
    if (workingDaysSetting?.setting_value) {
      try {
        workingDays = JSON.parse(workingDaysSetting.setting_value) || [1, 2, 3, 4, 5, 6];
      } catch {}
    }

    const formatRegisterTime = (d: Date | string | null | undefined): string | null => {
      if (!d) return null;
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return null;
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    const formatRegisterHours = (minutes: number): string => {
      if (!minutes || minutes <= 0) return '--';
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const records = employees.map((emp) => {
      const empCode = `EMP-${String(emp.emp_id).padStart(4, '0')}`;
      const departmentName = emp.departments_employees_dep_idTodepartments?.name || 'General';
      const assignedShiftId = empShifts[String(emp.emp_id)];
      const shift = (assignedShiftId ? shifts.find((s) => s.shift_id === assignedShiftId) : null) || defaultShift;
      const shiftName = shift?.shift_name || 'General';

      const isWeeklyOff = shift?.weekly_off_days ? shift.weekly_off_days.includes(dayOfWeek) : !workingDays.includes(dayOfWeek);
      const isHoliday = Boolean(holiday);
      const leaveRecord = leaves.find((l) => l.emp_id === emp.emp_id);
      const isFullDayLeaveRecord = leaveRecord?.day_part === 'FULL_DAY';
      const rawDayRecord = attendanceDays.find((d) => d.emp_id === emp.emp_id);
      // An approved full day of leave is always L. A 'leave' row is an old placeholder,
      // except under a half-day leave, where it is a real check-in.
      const dayRecord =
        isFullDayLeaveRecord || (rawDayRecord?.day_status === 'leave' && !leaveRecord) ? undefined : rawDayRecord;

      let status: 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Weekly Off' | 'Holiday' | 'Missing Punch' | 'Late' = 'Absent';
      let checkInAt: string | null = null;
      let checkOutAt: string | null = null;
      let workingHours = '--';
      let prodMins = 0;

      if (dayRecord) {
        prodMins = dayRecord.production_minutes ?? 0;
        if (dayRecord.check_in_at) {
          checkInAt = formatRegisterTime(dayRecord.check_in_at);
          if (dayRecord.check_out_at) {
            checkOutAt = formatRegisterTime(dayRecord.check_out_at);
            workingHours = formatRegisterHours(prodMins);
            if (dayRecord.day_status === 'half_day') {
              status = 'Half Day';
            } else if (dayRecord.day_status === 'on_leave') {
              status = 'On Leave';
            } else if (dayRecord.day_status === 'late') {
              status = 'Late';
            } else {
              status = 'Present';
            }
          } else {
            if (isPastDate) {
              status = 'Missing Punch';
            } else if (isToday) {
              const nowHour = new Date().getHours();
              status = nowHour >= 20 ? 'Missing Punch' : 'Present';
            } else {
              status = 'Present';
            }
          }
        } else {
          if (leaveRecord || dayRecord.day_status === 'on_leave') {
            status = 'On Leave';
          } else if (isHoliday || dayRecord.day_status === 'holiday') {
            status = 'Holiday';
          } else if (isWeeklyOff || dayRecord.day_status === 'weekly_off') {
            status = 'Weekly Off';
          } else {
            status = 'Absent';
          }
        }
      } else {
        if (leaveRecord) {
          status = 'On Leave';
        } else if (isHoliday) {
          status = 'Holiday';
        } else if (isWeeklyOff) {
          status = 'Weekly Off';
        } else {
          status = 'Absent';
        }
      }

      let isLate = false;
      if (dayRecord?.check_in_at) {
        const checkInDate = new Date(dayRecord.check_in_at);
        // IST offset UTC + 5h30m
        const istDate = new Date(checkInDate.getTime() + 5.5 * 60 * 60 * 1000);
        const punchMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
        let shiftStartMins = 570; // 09:30 AM default
        let lateGrace = 15;
        if (shift) {
          if (shift.start_time) {
            const st = new Date(shift.start_time);
            shiftStartMins = st.getUTCHours() * 60 + st.getUTCMinutes();
          }
          if (typeof shift.late_arrival_grace_minutes === 'number') {
            lateGrace = shift.late_arrival_grace_minutes;
          }
        }
        if (punchMins > shiftStartMins + lateGrace) {
          isLate = true;
        }
      }

      return {
        emp_id: emp.emp_id,
        employee_code: empCode,
        name: emp.name,
        department: departmentName,
        department_id: emp.dep_id,
        shift_id: shift?.shift_id || null,
        shift_name: shiftName,
        in_time: checkInAt || '--',
        out_time: checkOutAt || '--',
        working_hours: workingHours,
        production_minutes: prodMins,
        status,
        is_late: isLate,
        date: workDateStr,
        attendance_id: dayRecord?.attendance_id || null,
      };
    });

    let filtered = records;
    if (query.departmentId) {
      filtered = filtered.filter((r) => r.department_id === Number(query.departmentId));
    }
    if (query.shiftId) {
      filtered = filtered.filter((r) => r.shift_id === Number(query.shiftId));
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.employee_code.toLowerCase().includes(q));
    }

    const summary = {
      total_employees: filtered.length,
      present_count: filtered.filter((r) => r.status === 'Present' || r.status === 'Late' || r.is_late).length,
      absent_count: filtered.filter((r) => r.status === 'Absent').length,
      on_leave_count: filtered.filter((r) => r.status === 'On Leave').length,
      half_day_count: filtered.filter((r) => r.status === 'Half Day').length,
      missing_punch_count: filtered.filter((r) => r.status === 'Missing Punch').length,
    };

    if (query.status && query.status !== 'All') {
      const targetStatus = query.status.toLowerCase();
      if (targetStatus === 'late') {
        filtered = filtered.filter((r) => r.is_late || r.status.toLowerCase() === 'late');
      } else {
        filtered = filtered.filter((r) => r.status.toLowerCase() === targetStatus);
      }
    }

    // Merge database departments with any departments from records
    const deptMap = new Map<number, string>();
    allDepartments.forEach((d) => deptMap.set(d.dep_id, d.name));
    records.forEach((r) => {
      if (r.department_id && !deptMap.has(r.department_id)) {
        deptMap.set(r.department_id, r.department);
      }
    });

    // Merge database shifts with any shifts from records
    const shiftMap = new Map<number, string>();
    shifts.forEach((s) => shiftMap.set(s.shift_id, s.shift_name));
    records.forEach((r) => {
      if (r.shift_id && !shiftMap.has(r.shift_id)) {
        shiftMap.set(r.shift_id, r.shift_name);
      }
    });

    // Dynamic statuses from database plus spec filters
    const baseStatuses = ['All', 'Present', 'Absent', 'Half Day', 'On Leave', 'Weekly Off', 'Holiday', 'Missing Punch', 'Late'];
    const dbStatusLabels = dbStatuses.map((s) => s.label).filter(Boolean);
    const combinedStatuses = Array.from(new Set(['All', ...dbStatusLabels, ...baseStatuses]));

    const dateObjForFormatted = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = dateObjForFormatted.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

    return {
      date: workDateStr,
      formatted_date: formattedDate,
      summary,
      records: filtered,
      departments: Array.from(deptMap.entries()).map(([id, name]) => ({ id, name })),
      shifts: Array.from(shiftMap.entries()).map(([id, name]) => ({ id, name })),
      statuses: combinedStatuses,
    };
  }

  async getAttendanceReports(query: {
    reportType?: string;
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    employeeId?: number;
    shiftId?: number;
    status?: string;
  }): Promise<any> {
    const reportType = query.reportType || 'daily';
    const todayStr = new Date().toISOString().slice(0, 10);

    // Default dates
    let fromDateStr = query.fromDate;
    let toDateStr = query.toDate;

    if (!fromDateStr) {
      if (reportType === 'monthly_summary') {
        const [y, m] = todayStr.split('-');
        fromDateStr = `${y}-${m}-01`;
      } else {
        fromDateStr = todayStr;
      }
    }
    if (!toDateStr) {
      if (reportType === 'monthly_summary') {
        const [y, m] = fromDateStr.split('-').map(Number);
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        toDateStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else {
        toDateStr = fromDateStr;
      }
    }

    if (fromDateStr > toDateStr) {
      toDateStr = fromDateStr;
    }

    const [fromY, fromM, fromD] = fromDateStr.split('-').map(Number);
    const fromDateObj = new Date(Date.UTC(fromY, fromM - 1, fromD));

    const [toY, toM, toD] = toDateStr.split('-').map(Number);
    const toDateObj = new Date(Date.UTC(toY, toM - 1, toD, 23, 59, 59, 999));

    // Department IDs filter
    let deptIds: number[] | undefined = undefined;
    if (query.departmentId && query.departmentId !== 'all') {
      deptIds = query.departmentId
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
      if (deptIds.length === 0) deptIds = undefined;
    }

    // Parallel queries
    const [
      allDepartments,
      shifts,
      dbStatuses,
      allEmployees,
      holidays,
      leaves,
      attendanceDays,
      empShiftsSetting,
      workingDaysSetting,
      corrections,
    ] = await Promise.all([
      this.prisma.departments.findMany({
        where: { deleted_at: null },
        select: { dep_id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.attendance_shifts.findMany({
        where: { deleted_at: null, is_active: true },
        orderBy: { shift_name: 'asc' },
      }),
      this.prisma.attendance_statuses.findMany({
        where: { deleted_at: null, is_active: true },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.employees.findMany({
        where: {
          deleted_at: null,
          status: { not: 'Inactive' },
          ...(deptIds ? { dep_id: { in: deptIds } } : {}),
          ...(query.employeeId ? { emp_id: Number(query.employeeId) } : {}),
        },
        select: {
          emp_id: true,
          name: true,
          dep_id: true,
          status: true,
          departments_employees_dep_idTodepartments: {
            select: { name: true },
          },
        },
        orderBy: { emp_id: 'asc' },
      }),
      this.prisma.company_holidays.findMany({
        where: {
          holiday_date: { gte: fromDateObj, lte: toDateObj },
          deleted_at: null,
        },
      }),
      this.prisma.$queryRaw<any[]>`
        SELECT d.emp_id, d.day_part, d.leave_date AS from_date, d.leave_date AS to_date,
               t.name AS leave_type_name, r.is_paid, r.request_no
        FROM leave_request_days d
        JOIN leave_requests r ON r.request_id = d.request_id
        JOIN leave_types t ON t.leave_type_id = r.leave_type_id
        WHERE d.leave_date BETWEEN ${fromDateObj}::date AND ${toDateObj}::date
          AND r.status IN ('APPROVED', 'CANCELLATION_REQUESTED');
      `,
      this.prisma.attendance_days.findMany({
        where: {
          work_date: { gte: fromDateObj, lte: toDateObj },
          deleted_at: null,
        },
      }),
      this.prisma.app_settings.findFirst({ where: { setting_key: 'attendance_employee_shifts' } }),
      this.prisma.app_settings.findFirst({ where: { setting_key: 'attendance_working_days' } }),
      reportType === 'regularization'
        ? this.prisma.attendance_corrections.findMany({
            where: {
              work_date: { gte: fromDateObj, lte: toDateObj },
              ...(query.employeeId ? { emp_id: Number(query.employeeId) } : {}),
            },
            orderBy: { work_date: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const defaultShift = shifts.find((s) => s.is_default) || shifts[0];

    let empShifts: Record<string, number> = {};
    if (empShiftsSetting?.setting_value) {
      try {
        empShifts = JSON.parse(empShiftsSetting.setting_value) || {};
      } catch {}
    }

    let workingDays: number[] = [1, 2, 3, 4, 5, 6];
    if (workingDaysSetting?.setting_value) {
      try {
        workingDays = JSON.parse(workingDaysSetting.setting_value) || [1, 2, 3, 4, 5, 6];
      } catch {}
    }

    // Generate list of date strings in the range [fromDateStr .. toDateStr]
    const dateRangeList: string[] = [];
    const curIterDate = new Date(fromDateObj);
    while (curIterDate <= toDateObj) {
      dateRangeList.push(curIterDate.toISOString().slice(0, 10));
      curIterDate.setUTCDate(curIterDate.getUTCDate() + 1);
    }

    // Helper functions
    const formatTime = (d: Date | string | null | undefined): string => {
      if (!d) return '--';
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return '--';
      return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatMins = (minutes: number): string => {
      if (!minutes || minutes <= 0) return '00:00';
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const formatDuration = (mins: number): string => {
      if (!mins || mins <= 0) return '--';
      if (mins < 60) return `${mins}m`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    // Calculate late & early exit for a record
    const getPunctuality = (shift: any, checkInAt: Date | string | null, checkOutAt: Date | string | null) => {
      let lateMins = 0;
      let earlyExitMins = 0;

      let shiftStartMins = 570; // 09:30
      let shiftEndMins = 1110;  // 18:30
      let lateGrace = 15;
      let earlyGrace = 15;

      if (shift) {
        if (shift.start_time) {
          const st = new Date(shift.start_time);
          shiftStartMins = st.getUTCHours() * 60 + st.getUTCMinutes();
        }
        if (shift.end_time) {
          const et = new Date(shift.end_time);
          shiftEndMins = et.getUTCHours() * 60 + et.getUTCMinutes();
        }
        if (typeof shift.late_arrival_grace_minutes === 'number') {
          lateGrace = shift.late_arrival_grace_minutes;
        }
        if (typeof shift.early_exit_grace_minutes === 'number') {
          earlyGrace = shift.early_exit_grace_minutes;
        }
      }

      if (checkInAt) {
        const inDate = typeof checkInAt === 'string' ? new Date(checkInAt) : checkInAt;
        const istIn = new Date(inDate.getTime() + 5.5 * 60 * 60 * 1000);
        const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
        if (inMins > shiftStartMins + lateGrace) {
          lateMins = inMins - shiftStartMins;
        }
      }

      if (checkOutAt) {
        const outDate = typeof checkOutAt === 'string' ? new Date(checkOutAt) : checkOutAt;
        const istOut = new Date(outDate.getTime() + 5.5 * 60 * 60 * 1000);
        const outMins = istOut.getUTCHours() * 60 + istOut.getUTCMinutes();
        if (outMins < shiftEndMins - earlyGrace) {
          earlyExitMins = shiftEndMins - outMins;
        }
      }

      return {
        isLate: lateMins > 0,
        lateMinutes: lateMins,
        isEarlyExit: earlyExitMins > 0,
        earlyExitMinutes: earlyExitMins,
      };
    };

    // Pre-organize attendance records by key: `${emp_id}_${dateStr}`
    const dayMap = new Map<string, any>();
    attendanceDays.forEach((d) => {
      const dateStr = d.work_date.toISOString().slice(0, 10);
      dayMap.set(`${d.emp_id}_${dateStr}`, d);
    });

    // Pre-organize leaves by employee and date
    const isEmpOnLeave = (empId: number, dateStr: string) => {
      const targetDate = new Date(`${dateStr}T00:00:00Z`);
      return leaves.find((l) => l.emp_id === empId && l.from_date <= targetDate && l.to_date >= targetDate);
    };

    // Pre-organize holidays by date
    const holidayDateMap = new Map<string, string>();
    holidays.forEach((h) => {
      const hStr = h.holiday_date.toISOString().slice(0, 10);
      holidayDateMap.set(hStr, h.name || 'Holiday');
    });

    // Evaluator for single employee single date
    const evaluateDay = (emp: any, dateStr: string) => {
      const dateObj = new Date(`${dateStr}T00:00:00Z`);
      const dayOfWeek = dateObj.getUTCDay();
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;

      const assignedShiftId = empShifts[String(emp.emp_id)];
      const shift = (assignedShiftId ? shifts.find((s) => s.shift_id === assignedShiftId) : null) || defaultShift;

      const isWeeklyOff = shift?.weekly_off_days ? shift.weekly_off_days.includes(dayOfWeek) : !workingDays.includes(dayOfWeek);
      const holidayName = holidayDateMap.get(dateStr) || null;
      const leave = isEmpOnLeave(emp.emp_id, dateStr);
      const rawDayRecord = dayMap.get(`${emp.emp_id}_${dateStr}`);
      // An approved full day of leave is always L. A 'leave' row is an old placeholder,
      // except under a half-day leave, where it is a real check-in.
      const dayRecord = (leave && (leave as any).day_part === 'FULL_DAY') || (rawDayRecord?.day_status === 'leave' && !leave)
        ? undefined
        : rawDayRecord;

      let status = 'Absent';
      let statusCode = 'A';
      let checkInAt: string | null = null;
      let checkOutAt: string | null = null;
      let prodMins = 0;
      let punctuality = { isLate: false, lateMinutes: 0, isEarlyExit: false, earlyExitMinutes: 0 };

      if (dayRecord) {
        prodMins = dayRecord.production_minutes ?? 0;
        punctuality = getPunctuality(shift, dayRecord.check_in_at, dayRecord.check_out_at);

        if (dayRecord.check_in_at) {
          checkInAt = formatTime(dayRecord.check_in_at);
          if (dayRecord.check_out_at) {
            checkOutAt = formatTime(dayRecord.check_out_at);
            if (dayRecord.day_status === 'half_day') {
              status = 'Half Day';
              statusCode = 'HD';
            } else if (dayRecord.day_status === 'on_leave') {
              status = 'On Leave';
              statusCode = 'L';
            } else {
              status = 'Present';
              statusCode = 'P';
            }
          } else {
            if (isPast) {
              status = 'Missing Punch';
              statusCode = 'MP';
            } else if (isToday) {
              const nowH = new Date().getHours();
              status = nowH >= 20 ? 'Missing Punch' : 'Present';
              statusCode = nowH >= 20 ? 'MP' : 'P';
            } else {
              status = 'Present';
              statusCode = 'P';
            }
          }
        } else {
          if (leave) {
            status = 'On Leave';
            statusCode = 'L';
          } else if (holidayName) {
            status = 'Holiday';
            statusCode = 'H';
          } else if (isWeeklyOff) {
            status = 'Weekly Off';
            statusCode = 'WO';
          } else {
            status = 'Absent';
            statusCode = 'A';
          }
        }
      } else {
        if (leave) {
          status = 'On Leave';
          statusCode = 'L';
        } else if (holidayName) {
          status = 'Holiday';
          statusCode = 'H';
        } else if (isWeeklyOff) {
          status = 'Weekly Off';
          statusCode = 'WO';
        } else {
          status = isPast ? 'Absent' : (isToday ? 'Absent' : '--');
          statusCode = isPast ? 'A' : (isToday ? 'A' : '');
        }
      }

      return {
        emp_id: emp.emp_id,
        employee_code: `EMP-${String(emp.emp_id).padStart(4, '0')}`,
        name: emp.name,
        department: emp.departments_employees_dep_idTodepartments?.name || 'General',
        department_id: emp.dep_id,
        shift_id: shift?.shift_id || null,
        shift_name: shift?.shift_name || 'General Shift',
        date: dateStr,
        in_time: checkInAt || '--',
        out_time: checkOutAt || '--',
        working_hours: formatMins(prodMins),
        production_minutes: prodMins,
        status,
        status_code: statusCode,
        holiday_name: holidayName,
        is_late: punctuality.isLate,
        late_by: formatDuration(punctuality.lateMinutes),
        early_exit_by: formatDuration(punctuality.earlyExitMinutes),
        is_early_exit: punctuality.isEarlyExit,
      };
    };

    // Filter employees by shift if shiftId passed
    let scopedEmployees = allEmployees;
    if (query.shiftId) {
      scopedEmployees = scopedEmployees.filter((emp) => {
        const assigned = empShifts[String(emp.emp_id)] || defaultShift?.shift_id;
        return assigned === Number(query.shiftId);
      });
    }

    // ----------------------------------------------------
    // BUILD RESULTS PER REPORT TYPE
    // ----------------------------------------------------
    let reportData: any = {};

    if (reportType === 'daily') {
      let rows: any[] = [];
      for (const dStr of dateRangeList) {
        for (const emp of scopedEmployees) {
          const evalRes = evaluateDay(emp, dStr);
          rows.push({
            emp_id: evalRes.emp_id,
            employee_code: evalRes.employee_code,
            name: evalRes.name,
            department: evalRes.department,
            shift: evalRes.shift_name,
            date: evalRes.date,
            in_time: evalRes.in_time,
            out_time: evalRes.out_time,
            hours: evalRes.working_hours,
            status: evalRes.status,
            is_late: evalRes.is_late,
          });
        }
      }

      if (query.status && query.status !== 'All') {
        const sTarget = query.status.toLowerCase();
        if (sTarget === 'late') {
          rows = rows.filter((r) => r.is_late || r.status.toLowerCase() === 'late');
        } else {
          rows = rows.filter((r) => r.status.toLowerCase() === sTarget);
        }
      }

      reportData = {
        type: 'daily',
        columns: ['Emp ID', 'Name', 'Department', 'Shift', 'Date', 'In', 'Out', 'Hours', 'Status'],
        rows,
      };
    } else if (reportType === 'monthly_summary') {
      const summaryRows = scopedEmployees.map((emp) => {
        const dayCodes: Record<string, string> = {};
        let present = 0;
        let absent = 0;
        let halfDay = 0;
        let leave = 0;
        let weeklyOff = 0;
        let holiday = 0;
        let lateMarks = 0;
        let totalProdMins = 0;

        for (const dStr of dateRangeList) {
          const evalRes = evaluateDay(emp, dStr);
          dayCodes[dStr] = evalRes.status_code;

          if (evalRes.status_code === 'P') present++;
          if (evalRes.status_code === 'A') absent++;
          if (evalRes.status_code === 'HD') halfDay++;
          if (evalRes.status_code === 'L') leave++;
          if (evalRes.status_code === 'WO') weeklyOff++;
          if (evalRes.status_code === 'H') holiday++;
          if (evalRes.is_late) lateMarks++;
          totalProdMins += evalRes.production_minutes;
        }

        return {
          emp_id: emp.emp_id,
          employee_code: `EMP-${String(emp.emp_id).padStart(4, '0')}`,
          name: emp.name,
          department: emp.departments_employees_dep_idTodepartments?.name || 'General',
          days: dayCodes,
          present,
          absent,
          half_day: halfDay,
          leave,
          weekly_off: weeklyOff,
          holiday,
          late_marks: lateMarks,
          total_hours: formatMins(totalProdMins),
        };
      });

      reportData = {
        type: 'monthly_summary',
        date_columns: dateRangeList,
        rows: summaryRows,
      };
    } else if (reportType === 'employee') {
      // Pick target employee
      const targetEmp = (query.employeeId ? scopedEmployees.find((e) => e.emp_id === Number(query.employeeId)) : null) || scopedEmployees[0];

      let rows: any[] = [];
      if (targetEmp) {
        for (const dStr of dateRangeList) {
          const evalRes = evaluateDay(targetEmp, dStr);
          rows.push({
            date: evalRes.date,
            shift: evalRes.shift_name,
            in_time: evalRes.in_time,
            out_time: evalRes.out_time,
            hours: evalRes.working_hours,
            late_by: evalRes.late_by,
            early_exit_by: evalRes.early_exit_by,
            status: evalRes.status,
            is_late: evalRes.is_late,
          });
        }
      }

      if (query.status && query.status !== 'All') {
        const sTarget = query.status.toLowerCase();
        if (sTarget === 'late') {
          rows = rows.filter((r) => r.is_late || r.status.toLowerCase() === 'late');
        } else {
          rows = rows.filter((r) => r.status.toLowerCase() === sTarget);
        }
      }

      reportData = {
        type: 'employee',
        employee: targetEmp
          ? {
              emp_id: targetEmp.emp_id,
              employee_code: `EMP-${String(targetEmp.emp_id).padStart(4, '0')}`,
              name: targetEmp.name,
              department: targetEmp.departments_employees_dep_idTodepartments?.name || 'General',
            }
          : null,
        rows,
      };
    } else if (reportType === 'department') {
      // Group scoped employees by department
      const deptGroup = new Map<number, { name: string; employees: any[] }>();
      allDepartments.forEach((d) => deptGroup.set(d.dep_id, { name: d.name, employees: [] }));
      scopedEmployees.forEach((emp) => {
        const dId = emp.dep_id || 1;
        if (!deptGroup.has(dId)) {
          deptGroup.set(dId, { name: emp.departments_employees_dep_idTodepartments?.name || 'General', employees: [] });
        }
        deptGroup.get(dId)!.employees.push(emp);
      });

      const deptRows: any[] = [];
      for (const [dId, val] of deptGroup.entries()) {
        if (deptIds && !deptIds.includes(dId)) continue;
        const empCount = val.employees.length;
        if (empCount === 0) continue;

        let present = 0;
        let absent = 0;
        let halfDay = 0;
        let leave = 0;
        let lateMarks = 0;
        let totalProdMins = 0;

        for (const emp of val.employees) {
          for (const dStr of dateRangeList) {
            const evalRes = evaluateDay(emp, dStr);
            if (evalRes.status_code === 'P') present++;
            if (evalRes.status_code === 'A') absent++;
            if (evalRes.status_code === 'HD') halfDay++;
            if (evalRes.status_code === 'L') leave++;
            if (evalRes.is_late) lateMarks++;
            totalProdMins += evalRes.production_minutes;
          }
        }

        const avgMins = empCount > 0 ? Math.round(totalProdMins / (empCount * Math.max(1, dateRangeList.length))) : 0;

        deptRows.push({
          department_id: dId,
          department: val.name,
          employees: empCount,
          present,
          absent,
          half_day: halfDay,
          leave,
          late_marks: lateMarks,
          average_hours: formatMins(avgMins),
        });
      }

      reportData = {
        type: 'department',
        rows: deptRows,
      };
    } else if (reportType === 'late_early') {
      // Find all days with late arrival or early exit
      const violationRows: any[] = [];

      for (const emp of scopedEmployees) {
        // Count monthly late marks for this employee
        let monthlyLateMarks = 0;
        for (const dStr of dateRangeList) {
          const evalRes = evaluateDay(emp, dStr);
          if (evalRes.is_late) monthlyLateMarks++;
        }

        for (const dStr of dateRangeList) {
          const evalRes = evaluateDay(emp, dStr);
          if (evalRes.is_late || evalRes.is_early_exit) {
            violationRows.push({
              date: evalRes.date,
              emp_id: evalRes.emp_id,
              employee_code: evalRes.employee_code,
              name: evalRes.name,
              department: evalRes.department,
              shift: evalRes.shift_name,
              in_time: evalRes.in_time,
              out_time: evalRes.out_time,
              late_by: evalRes.late_by,
              early_exit_by: evalRes.early_exit_by,
              late_marks_in_month: monthlyLateMarks,
            });
          }
        }
      }

      reportData = {
        type: 'late_early',
        rows: violationRows,
      };
    } else if (reportType === 'regularization') {
      // Regularization requests
      const approverMap = new Map<number, string>();
      const allDbEmps = await this.prisma.employees.findMany({
        where: { deleted_at: null },
        select: { emp_id: true, name: true },
      });
      allDbEmps.forEach((e) => approverMap.set(e.emp_id, e.name));

      const regRows = (corrections as any[]).map((c) => {
        const emp = allEmployees.find((e) => e.emp_id === c.emp_id);
        const approverName = c.decided_by ? approverMap.get(c.decided_by) || 'HR Admin' : '--';

        let daysTaken: string = '--';
        if (c.decided_at && c.created_at) {
          const diffMs = new Date(c.decided_at).getTime() - new Date(c.created_at).getTime();
          const d = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          daysTaken = `${d} day${d > 1 ? 's' : ''}`;
        }

        return {
          request_id: `REG-${String(c.correction_id).padStart(4, '0')}`,
          emp_id: c.emp_id,
          employee_code: emp ? `EMP-${String(emp.emp_id).padStart(4, '0')}` : `EMP-${c.emp_id}`,
          employee: emp ? emp.name : `Employee #${c.emp_id}`,
          date: c.work_date.toISOString().slice(0, 10),
          type: c.reason?.slice(0, 30) || 'Time Regularization',
          status: c.status,
          approver: approverName,
          days_taken: daysTaken,
        };
      });

      let filteredRegRows = regRows;
      if (query.status && query.status !== 'All') {
        filteredRegRows = filteredRegRows.filter((r) => r.status.toLowerCase() === query.status!.toLowerCase());
      }

      reportData = {
        type: 'regularization',
        rows: filteredRegRows,
      };
    }

    // Dynamic statuses from database plus spec filters
    const baseStatuses = ['All', 'Present', 'Absent', 'Half Day', 'On Leave', 'Weekly Off', 'Holiday', 'Missing Punch', 'Late'];
    const dbStatusLabels = dbStatuses.map((s) => s.label).filter(Boolean);
    const combinedStatuses = Array.from(new Set(['All', ...dbStatusLabels, ...baseStatuses]));

    return {
      report_type: reportType,
      from_date: fromDateStr,
      to_date: toDateStr,
      data: reportData,
      departments: allDepartments.map((d) => ({ id: d.dep_id, name: d.name })),
      shifts: shifts.map((s) => ({ id: s.shift_id, name: s.shift_name })),
      statuses: combinedStatuses,
      employees: allEmployees.map((e) => ({
        id: e.emp_id,
        code: `EMP-${String(e.emp_id).padStart(4, '0')}`,
        name: e.name,
        department: e.departments_employees_dep_idTodepartments?.name || 'General',
      })),
    };
  }
}
