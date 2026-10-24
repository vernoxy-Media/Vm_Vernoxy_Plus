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
    return this.prisma.$transaction(async (tx) => {
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

      return (await this.findCorrectionById(inserted.correction_id))!;
    });
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
    const dayStatus = durationMinutes >= 480 ? 'present' : (durationMinutes >= 240 ? 'half_day' : 'absent');

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
            day_status: dayStatus as any,
            is_regularized: true,
            check_in_mode: 'Regularized',
            regularization_id: correctionId,
            updated_at: new Date(),
            updated_by: approverId,
          } as any,
        });
      } else {
        await tx.attendance_days.create({
          data: {
            emp_id: existing.empId,
            work_date: new Date(existing.workDate),
            check_in_at: checkIn,
            check_out_at: checkOut,
            production_minutes: durationMinutes,
            day_status: dayStatus as any,
            is_regularized: true,
            check_in_mode: 'Regularized',
            regularization_id: correctionId,
            created_by: approverId,
          } as any,
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
          } else if (isPast) {
            const totalBreakMinutes = breaksList.reduce((acc, b) => {
              const end = b.ended_at || new Date(new Date(r.check_in_at).getTime() + fullDayMins * 60000);
              return acc + Math.max(0, Math.floor((end.getTime() - b.started_at.getTime()) / 60000));
            }, 0);
            brkMinutes = totalBreakMinutes;
            prodMinutes = Math.max(0, fullDayMins - totalBreakMinutes);
            state = determineDayStatus(
              new Date(new Date(r.check_in_at).getTime() + (fullDayMins + totalBreakMinutes) * 60000),
              prodMinutes,
              fullDayMins,
              halfDayMins,
            );
            dayStatus = state;
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
