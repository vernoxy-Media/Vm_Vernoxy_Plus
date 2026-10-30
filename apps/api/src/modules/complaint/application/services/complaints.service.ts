import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateComplaintDto,
  AcceptAndAssignDto,
  CloseWithoutActionDto,
  ReassignHandlerDto,
  ChangePriorityDto,
  ChangeTargetDateDto,
  ChangeConfidentialityDto,
  AddActionDto,
  AddRemarkDto,
  RecordResolutionDto,
  ConfirmResolutionDto,
  ReopenComplaintDto,
  SendBackDto,
  CloseComplaintDto,
  WithdrawComplaintDto,
  ComplaintReportsQueryDto,
} from '../../presentation/dto/complaints.dto';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // 1. GENERATE COMPLAINT NUMBER (CMP/YYYY/MM/NNNN) - BFD Page 3
  // ===========================================================================

  private async generateComplaintNo(dateStr: string): Promise<string> {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `CMP/${year}/${month}/`;

    const count = await this.prisma.complaints.count({
      where: {
        complaint_no: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  // ===========================================================================
  // 2. CREATE COMPLAINT (EMPLOYEE) - BFD Page 10, 11, 14
  // ===========================================================================

  async createComplaint(complainantId: number, dto: CreateComplaintDto) {
    const type = await this.prisma.complaint_types.findFirst({
      where: { type_id: dto.complaint_type_id, deleted_at: null },
    });
    if (!type || !type.is_active) {
      throw new BadRequestException('The selected complaint type is not active or available.');
    }

    const complaintDate = new Date(`${dto.complaint_date}T00:00:00.000Z`);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (complaintDate > today) {
      throw new BadRequestException('The complaint date cannot be in the future.');
    }

    // Force confidentiality if type requires it (e.g. Behaviour & Conduct)
    const isConfidential = type.is_always_confidential || dto.is_confidential || false;

    // Generate formatted CMP/YYYY/MM/NNNN
    const complaintNo = await this.generateComplaintNo(dto.complaint_date);

    const created = await this.prisma.complaints.create({
      data: {
        complaint_no: complaintNo,
        complainant_id: complainantId,
        complaint_type_id: dto.complaint_type_id,
        complaint_date: complaintDate,
        related_department_id: dto.related_department_id,
        related_project_id: dto.related_project_id || null,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        is_confidential: isConfidential,
        status: 'New',
        created_by: complainantId,
      },
    });

    // If initial remarks provided, save as the first remark (BFD Pg 11, Marker 7)
    if (dto.remarks && dto.remarks.trim().length > 0) {
      await this.prisma.complaint_remarks.create({
        data: {
          complaint_id: created.complaint_id,
          remark_text: dto.remarks.trim(),
          is_internal: false,
          created_by: complainantId,
        },
      });
    }

    // Link attachments if provided
    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: {
          attachment_id: { in: dto.attachment_ids },
          entity_type: 'COMPLAINT',
        },
        data: {
          entity_id: created.complaint_id,
        },
      });
    }

    await this.recordHistory(
      created.complaint_id,
      'Complaint submitted',
      complainantId,
      undefined,
      undefined,
      isConfidential ? 'Confidential complaint submitted' : 'Complaint submitted',
    );

    return created;
  }

  // ===========================================================================
  // 3. EMPLOYEE: MY COMPLAINTS (BFD Page 8 & 9)
  // ===========================================================================

  async getMyComplaints(
    empId: number,
    year?: number,
    status?: string,
    typeId?: number,
  ) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    const allMy = await this.prisma.complaints.findMany({
      where: {
        complainant_id: empId,
        deleted_at: null,
      },
      include: {
        complaint_types: true,
        employees_complaints_handlerToemployees: {
          select: { emp_id: true, name: true },
        },
        departments: {
          select: { dep_id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();

    // Compute 4 Counters (BFD Pg 8 Marker 1)
    const activeCount = allMy.filter((c) =>
      ['New', 'Open', 'In Progress'].includes(c.status),
    ).length;

    const resolvedWaitingCount = allMy.filter((c) => c.status === 'Resolved').length;

    const closedThisYearCount = allMy.filter(
      (c) =>
        c.status === 'Closed' &&
        c.closed_at &&
        c.closed_at >= startOfYear &&
        c.closed_at <= endOfYear,
    ).length;

    const overdueCount = allMy.filter(
      (c) =>
        ['Open', 'In Progress'].includes(c.status) &&
        c.target_date &&
        new Date(c.target_date) < now,
    ).length;

    // Filter list for display
    let filtered = allMy.filter(
      (c) => c.created_at >= startOfYear && c.created_at <= endOfYear,
    );

    if (status && status !== 'All') {
      filtered = filtered.filter((c) => c.status === status);
    }

    if (typeId) {
      filtered = filtered.filter((c) => c.complaint_type_id === Number(typeId));
    }

    // Sort: Resolved complaints waiting for confirmation always on top (BFD Pg 9)
    filtered.sort((a, b) => {
      if (a.status === 'Resolved' && b.status !== 'Resolved') return -1;
      if (a.status !== 'Resolved' && b.status === 'Resolved') return 1;
      return b.created_at.getTime() - a.created_at.getTime();
    });

    const formatted = filtered.map((c) => {
      const isOverdue =
        ['Open', 'In Progress'].includes(c.status) &&
        c.target_date &&
        new Date(c.target_date) < now;

      return {
        complaint_id: c.complaint_id,
        complaint_no: c.complaint_no,
        complainant_id: c.complainant_id,
        complaint_date: c.complaint_date.toISOString().split('T')[0],
        subject: c.subject,
        type_id: c.complaint_type_id,
        type_name: c.complaint_types?.name,
        department_name: c.departments?.name,
        handler_name: c.employees_complaints_handlerToemployees?.name || '—',
        status: c.status,
        priority: c.priority || '—',
        is_overdue: !!isOverdue,
        target_date: c.target_date ? c.target_date.toISOString().split('T')[0] : null,
        created_at: c.created_at,
      };
    });

    return {
      counters: {
        active: activeCount,
        resolved_waiting: resolvedWaitingCount,
        closed_this_year: closedThisYearCount,
        overdue: overdueCount,
      },
      complaints: formatted,
    };
  }

  // ===========================================================================
  // 4. ADMIN & HANDLERS: ALL COMPLAINTS (BFD Page 16, 17, 33)
  // ===========================================================================

  async getAllComplaints(
    userEmpId: number,
    isAdmin: boolean,
    filters: {
      tab?: 'Active' | 'New' | 'Resolved' | 'Closed' | 'All';
      type_id?: number;
      department_id?: number;
      priority?: string;
      handler_id?: number;
      from_date?: string;
      to_date?: string;
      search?: string;
    } = {},
  ) {
    const where: any = {
      deleted_at: null,
    };

    // Role-based visibility (BFD Pg 16 & 33):
    // Admin sees all. Handlers see complaints assigned to them (now or before).
    if (!isAdmin) {
      where.handler_id = userEmpId;
    }

    if (filters.type_id) where.complaint_type_id = Number(filters.type_id);
    if (filters.department_id) where.related_department_id = Number(filters.department_id);
    if (filters.priority) where.priority = filters.priority;
    if (filters.handler_id) where.handler_id = Number(filters.handler_id);

    if (filters.from_date && filters.to_date) {
      where.complaint_date = {
        gte: new Date(`${filters.from_date}T00:00:00.000Z`),
        lte: new Date(`${filters.to_date}T23:59:59.999Z`),
      };
    }

    // Tabs filtering
    if (filters.tab === 'Active') {
      where.status = { in: ['New', 'Open', 'In Progress'] };
    } else if (filters.tab && filters.tab !== 'All') {
      where.status = filters.tab;
    }

    const allRecords = await this.prisma.complaints.findMany({
      where,
      include: {
        complaint_types: true,
        departments: { select: { dep_id: true, name: true } },
        employees_complaints_complainantToemployees: {
          select: { emp_id: true, name: true, dep_id: true },
        },
        employees_complaints_handlerToemployees: {
          select: { emp_id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();

    // Compute Counters (BFD Pg 16 Marker 1)
    const baseForCounters = await this.prisma.complaints.findMany({
      where: {
        deleted_at: null,
        ...(!isAdmin ? { handler_id: userEmpId } : {}),
      },
      select: {
        status: true,
        target_date: true,
        created_at: true,
        closed_at: true,
        closure_type: true,
      },
    });

    const newCount = baseForCounters.filter((c) => c.status === 'New').length;
    const openOrInProgressCount = baseForCounters.filter((c) =>
      ['Open', 'In Progress'].includes(c.status),
    ).length;
    const overdueCount = baseForCounters.filter(
      (c) =>
        ['Open', 'In Progress'].includes(c.status) &&
        c.target_date &&
        new Date(c.target_date) < now,
    ).length;

    // Average time to resolve this month
    const thisMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const resolvedThisMonth = baseForCounters.filter(
      (c) =>
        c.status === 'Closed' &&
        c.closure_type === 'Resolved' &&
        c.closed_at &&
        c.closed_at >= thisMonthStart,
    );
    let avgDays = 0;
    if (resolvedThisMonth.length > 0) {
      const totalDays = resolvedThisMonth.reduce((acc, c) => {
        const diffMs = (c.closed_at?.getTime() || 0) - c.created_at.getTime();
        return acc + Math.max(1, diffMs / (1000 * 60 * 60 * 24));
      }, 0);
      avgDays = Math.round((totalDays / resolvedThisMonth.length) * 10) / 10;
    }

    // Confidential subject masking for non-admin, non-handler, non-complainant
    const formatted = allRecords.map((c) => {
      const isOverdue =
        ['Open', 'In Progress'].includes(c.status) &&
        c.target_date &&
        new Date(c.target_date) < now;

      const canViewFull =
        isAdmin || c.complainant_id === userEmpId || c.handler_id === userEmpId;

      return {
        complaint_id: c.complaint_id,
        complaint_no: c.complaint_no,
        complainant_id: c.complainant_id,
        complaint_date: c.complaint_date.toISOString().split('T')[0],
        subject: c.is_confidential && !canViewFull ? 'Confidential' : c.subject,
        is_confidential: c.is_confidential,
        complainant_name: c.employees_complaints_complainantToemployees?.name,
        department_name: c.departments?.name,
        type_id: c.complaint_type_id,
        type_name: c.complaint_types?.name,
        priority: c.priority || '—',
        status: c.status,
        handler_name: c.employees_complaints_handlerToemployees?.name || '—',
        target_date: c.target_date ? c.target_date.toISOString().split('T')[0] : null,
        is_overdue: !!isOverdue,
        created_at: c.created_at,
      };
    });

    return {
      counters: {
        new_waiting: newCount,
        open_or_in_progress: openOrInProgressCount,
        overdue: overdueCount,
        avg_days_to_resolve_this_month: avgDays,
      },
      complaints: formatted,
    };
  }

  // ===========================================================================
  // 5. GET COMPLAINT DETAILS (BFD Page 22)
  // ===========================================================================

  async getComplaintById(complaintId: number, userEmpId: number, isAdmin: boolean) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
      include: {
        complaint_types: true,
        departments: true,
        projects: true,
        employees_complaints_complainantToemployees: {
          select: { emp_id: true, name: true, email: true, mob: true, dep_id: true },
        },
        employees_complaints_handlerToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        complaint_actions: {
          include: {
            employees_complaint_actions_created_byToemployees: {
              select: { emp_id: true, name: true },
            },
          },
          orderBy: { action_date: 'asc' },
        },
        complaint_remarks: {
          include: {
            employees_complaint_remarks_created_byToemployees: {
              select: { emp_id: true, name: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        complaint_resolutions: {
          include: {
            employees_complaint_resolutions_resolved_byToemployees: {
              select: { emp_id: true, name: true },
            },
          },
          orderBy: { cycle_number: 'desc' },
        },
        linked_complaint: {
          select: { complaint_id: true, complaint_no: true, subject: true, status: true },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint with ID ${complaintId} not found`);
    }

    const isComplainant = complaint.complainant_id === userEmpId;
    const isHandler = complaint.handler_id === userEmpId;

    // Confidentiality access check (BFD Pg 13 & 33)
    if (complaint.is_confidential && !isAdmin && !isComplainant && !isHandler) {
      throw new ForbiddenException('You do not have permission to view this confidential complaint.');
    }

    // Filter out internal remarks from complainant (BFD Pg 9, 22, 23)
    const visibleRemarks = complaint.complaint_remarks.filter(
      (r) => !r.is_internal || !isComplainant,
    );

    // Fetch history from activity_logs
    const historyRows = await this.prisma.activity_logs.findMany({
      where: {
        entity_type: 'COMPLAINT',
        entity_id: complaintId,
      },
      include: {
        employees: {
          select: { emp_id: true, name: true },
        },
      },
      orderBy: { performed_at: 'desc' },
    });

    const visibleHistory = historyRows
      .map((h: any) => {
        const details = (h.details as any) || {};
        return {
          history_id: Number(h.log_id),
          event: h.event,
          performed_by_name: h.employees?.name || 'System',
          old_value: details.old_value || null,
          new_value: details.new_value || null,
          remarks: details.remarks || h.summary || null,
          is_internal: Boolean(details.is_internal),
          created_at: h.performed_at,
        };
      })
      .filter((h: any) => !h.is_internal || !isComplainant);

    // Fetch attachments for complaint, actions, and resolutions
    const rawAttachments = await this.prisma.attachments.findMany({
      where: {
        entity_type: { in: ['COMPLAINT', 'COMPLAINT_ACTION', 'COMPLAINT_RESOLUTION'] },
        deleted_at: null,
      },
      select: {
        attachment_id: true,
        entity_type: true,
        entity_id: true,
        file_name: true,
        file_url: true,
        file_size_bytes: true,
        mime_type: true,
      },
    });

    const allAttachments = rawAttachments.map((a) => ({
      ...a,
      file_size_bytes: a.file_size_bytes ? Number(a.file_size_bytes) : null,
    }));

    const complaintFiles = allAttachments.filter(
      (a) => a.entity_type === 'COMPLAINT' && a.entity_id === complaint.complaint_id,
    );

    const now = new Date();
    const isOverdue =
      ['Open', 'In Progress'].includes(complaint.status) &&
      complaint.target_date &&
      new Date(complaint.target_date) < now;

    let overdueDays = 0;
    if (isOverdue && complaint.target_date) {
      overdueDays = Math.ceil(
        (now.getTime() - new Date(complaint.target_date).getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return {
      complaint_id: complaint.complaint_id,
      complaint_no: complaint.complaint_no,
      complainant_id: complaint.complainant_id,
      complainant_name: complaint.employees_complaints_complainantToemployees?.name,
      complainant_email: complaint.employees_complaints_complainantToemployees?.email,
      complainant_mobile: complaint.employees_complaints_complainantToemployees?.mob,
      complaint_date: complaint.complaint_date.toISOString().split('T')[0],
      related_department_id: complaint.related_department_id,
      related_department_name: complaint.departments?.name,
      related_project_id: complaint.related_project_id,
      related_project_name: complaint.projects?.project_name || null,
      type_id: complaint.complaint_type_id,
      type_name: complaint.complaint_types?.name,
      subject: complaint.subject,
      description: complaint.description,
      is_confidential: complaint.is_confidential,
      status: complaint.status,
      priority: complaint.priority,
      handler_id: complaint.handler_id,
      handler_name: complaint.employees_complaints_handlerToemployees?.name || null,
      assigned_at: complaint.assigned_at,
      first_target_date: complaint.first_target_date ? complaint.first_target_date.toISOString().split('T')[0] : null,
      target_date: complaint.target_date ? complaint.target_date.toISOString().split('T')[0] : null,
      is_overdue: isOverdue,
      overdue_days: overdueDays,
      reopen_count: complaint.reopen_count,
      is_self_reviewed: complaint.is_self_reviewed,
      closure_type: complaint.closure_type,
      closed_at: complaint.closed_at,
      closure_remarks: complaint.closure_remarks,
      close_without_action_reason: complaint.close_without_action_reason,
      close_without_action_remarks: complaint.close_without_action_remarks,
      linked_complaint: complaint.linked_complaint,
      withdrawal_reason: complaint.withdrawal_reason,
      withdrawn_at: complaint.withdrawn_at,
      created_at: complaint.created_at,
      attachments: complaintFiles,
      actions: complaint.complaint_actions.map((act) => ({
        action_id: act.action_id,
        action_date: act.action_date.toISOString().split('T')[0],
        action_text: act.action_text,
        created_by_name: act.employees_complaint_actions_created_byToemployees?.name,
        created_at: act.created_at,
        files: allAttachments.filter(
          (a) => a.entity_type === 'COMPLAINT_ACTION' && a.entity_id === act.action_id,
        ),
      })),
      remarks: visibleRemarks.map((rem) => ({
        remark_id: rem.remark_id,
        remark_text: rem.remark_text,
        is_internal: rem.is_internal,
        created_by_id: rem.created_by,
        created_by_name: rem.employees_complaint_remarks_created_byToemployees?.name,
        created_at: rem.created_at,
      })),
      resolutions: complaint.complaint_resolutions.map((res) => ({
        resolution_id: res.resolution_id,
        cycle_number: res.cycle_number,
        outcome: res.outcome,
        resolution_details: res.resolution_details,
        root_cause: !isComplainant ? res.root_cause : undefined,
        resolved_by_name: res.employees_complaint_resolutions_resolved_byToemployees?.name,
        resolved_at: res.resolved_at,
        confirmation_window_ends_at: res.confirmation_window_ends_at,
        employee_confirmation_status: res.employee_confirmation_status,
        employee_confirmed_at: res.employee_confirmed_at,
        employee_comment: res.employee_comment,
        reopened_at: res.reopened_at,
        reopen_reason: res.reopen_reason,
        files: allAttachments.filter(
          (a) => a.entity_type === 'COMPLAINT_RESOLUTION' && a.entity_id === res.resolution_id,
        ),
      })),
      history: visibleHistory,
    };
  }

  // ===========================================================================
  // 6. ADMIN: ACCEPT & ASSIGN (BFD Page 18)
  // ===========================================================================

  async acceptAndAssign(complaintId: number, adminId: number, dto: AcceptAndAssignDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.status !== 'New') {
      throw new BadRequestException('Only complaints in New status can be accepted and assigned.');
    }

    if (dto.handler_id === complaint.complainant_id) {
      throw new BadRequestException('A handler can never be assigned to their own complaint.');
    }

    const targetDate = new Date(`${dto.target_date}T00:00:00.000Z`);
    const isSelfReviewed = complaint.complainant_id === adminId;

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'Open',
        handler_id: dto.handler_id,
        priority: dto.priority,
        target_date: targetDate,
        first_target_date: targetDate,
        assigned_at: new Date(),
        assigned_by: adminId,
        is_self_reviewed: isSelfReviewed,
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    if (dto.remarks && dto.remarks.trim().length > 0) {
      await this.prisma.complaint_remarks.create({
        data: {
          complaint_id: complaintId,
          remark_text: dto.remarks.trim(),
          is_internal: false,
          created_by: adminId,
        },
      });
    }

    await this.recordHistory(
      complaintId,
      'Accepted and assigned',
      adminId,
      'New',
      'Open',
      dto.remarks || `Assigned to handler #${dto.handler_id} with priority ${dto.priority}`,
    );

    return updated;
  }

  // ===========================================================================
  // 7. ADMIN: CLOSE WITHOUT ACTION (BFD Page 19)
  // ===========================================================================

  async closeWithoutAction(complaintId: number, adminId: number, dto: CloseWithoutActionDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.status !== 'New') {
      throw new BadRequestException('Only complaints in New status can be closed without action.');
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'Closed',
        closure_type: 'Without action',
        close_without_action_reason: dto.reason,
        close_without_action_remarks: dto.remarks.trim(),
        linked_complaint_id: dto.linked_complaint_id || null,
        closed_at: new Date(),
        closed_by: adminId,
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Closed without action',
      adminId,
      'New',
      'Closed',
      `Reason: ${dto.reason}. ${dto.remarks.trim()}`,
    );

    return updated;
  }

  // ===========================================================================
  // 8. ADMIN: REASSIGN, CHANGE PRIORITY, CHANGE TARGET DATE (BFD Page 20)
  // ===========================================================================

  async reassignHandler(complaintId: number, adminId: number, dto: ReassignHandlerDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!['Open', 'In Progress'].includes(complaint.status)) {
      throw new BadRequestException('Only Open or In Progress complaints can be reassigned.');
    }
    if (dto.handler_id === complaint.complainant_id) {
      throw new BadRequestException('A handler can never be assigned to their own complaint.');
    }

    const oldHandler = complaint.handler_id;
    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        handler_id: dto.handler_id,
        reassign_reason: dto.reason.trim(),
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Reassigned',
      adminId,
      String(oldHandler),
      String(dto.handler_id),
      dto.reason.trim(),
    );

    return updated;
  }

  async changePriority(complaintId: number, adminId: number, dto: ChangePriorityDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!['Open', 'In Progress'].includes(complaint.status)) {
      throw new BadRequestException('Priority can only be changed while Open or In Progress.');
    }

    const oldPriority = complaint.priority;
    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        priority: dto.priority,
        priority_change_reason: dto.reason.trim(),
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Priority changed',
      adminId,
      oldPriority || 'None',
      dto.priority,
      dto.reason.trim(),
    );

    return updated;
  }

  async changeTargetDate(complaintId: number, adminId: number, dto: ChangeTargetDateDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!['Open', 'In Progress'].includes(complaint.status)) {
      throw new BadRequestException('Target Date can only be changed while Open or In Progress.');
    }

    const newDate = new Date(`${dto.target_date}T00:00:00.000Z`);
    const oldDateStr = complaint.target_date ? complaint.target_date.toISOString().split('T')[0] : 'None';

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        target_date: newDate,
        target_change_reason: dto.reason.trim(),
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Target Date changed',
      adminId,
      oldDateStr,
      dto.target_date,
      dto.reason.trim(),
    );

    return updated;
  }

  async changeConfidentiality(complaintId: number, adminId: number, dto: ChangeConfidentialityDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
      include: { complaint_types: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.complaint_types?.is_always_confidential && !dto.is_confidential) {
      throw new BadRequestException('Confidentiality cannot be removed for Behaviour & Conduct complaints.');
    }

    if (!dto.is_confidential && (!dto.reason || dto.reason.trim().length === 0)) {
      throw new BadRequestException('A reason is required to remove confidentiality.');
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        is_confidential: dto.is_confidential,
        confidential_reason: dto.reason?.trim() || null,
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Confidentiality changed',
      adminId,
      String(complaint.is_confidential),
      String(dto.is_confidential),
      dto.reason?.trim() || 'Updated by Admin',
    );

    return updated;
  }

  // ===========================================================================
  // 9. INVESTIGATION & RESOLUTION (BFD Page 21, 22, 23, 24)
  // ===========================================================================

  async startWork(complaintId: number, userEmpId: number, isAdmin: boolean) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!isAdmin && complaint.handler_id !== userEmpId) {
      throw new ForbiddenException('Only the assigned handler or Admin can start work.');
    }
    if (complaint.status !== 'Open') {
      throw new BadRequestException('Only Open complaints can be transitioned to In Progress.');
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'In Progress',
        work_started_at: new Date(),
        updated_at: new Date(),
        updated_by: userEmpId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Status changed',
      userEmpId,
      'Open',
      'In Progress',
      'Handler started work',
    );

    return updated;
  }

  async addAction(complaintId: number, userEmpId: number, isAdmin: boolean, dto: AddActionDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!isAdmin && complaint.handler_id !== userEmpId) {
      throw new ForbiddenException('Only the assigned handler or Admin can record actions taken.');
    }
    if (!['Open', 'In Progress'].includes(complaint.status)) {
      throw new BadRequestException('Actions can only be added while Open or In Progress.');
    }

    // Adding first action on an Open complaint automatically moves it to In Progress (BFD Pg 23)
    if (complaint.status === 'Open') {
      await this.prisma.complaints.update({
        where: { complaint_id: complaintId },
        data: {
          status: 'In Progress',
          work_started_at: new Date(),
          updated_at: new Date(),
          updated_by: userEmpId,
          row_version: { increment: 1 },
        },
      });
      await this.recordHistory(complaintId, 'Status changed', userEmpId, 'Open', 'In Progress', 'Action added');
    }

    const action = await this.prisma.complaint_actions.create({
      data: {
        complaint_id: complaintId,
        action_date: new Date(`${dto.action_date}T00:00:00.000Z`),
        action_text: dto.action_text.trim(),
        created_by: userEmpId,
      },
    });

    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: {
          attachment_id: { in: dto.attachment_ids },
          entity_type: 'COMPLAINT_ACTION',
        },
        data: {
          entity_id: action.action_id,
        },
      });
    }

    await this.recordHistory(
      complaintId,
      'Action added',
      userEmpId,
      undefined,
      undefined,
      dto.action_text.trim().substring(0, 100),
    );

    return action;
  }

  async addRemark(complaintId: number, userEmpId: number, isAdmin: boolean, dto: AddRemarkDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.status === 'Closed') {
      throw new BadRequestException('Remarks cannot be added to a Closed complaint.');
    }

    // Complainant can never post internal remarks
    const isInternal = complaint.complainant_id === userEmpId ? false : dto.is_internal || false;

    const remark = await this.prisma.complaint_remarks.create({
      data: {
        complaint_id: complaintId,
        remark_text: dto.remark_text.trim(),
        is_internal: isInternal,
        created_by: userEmpId,
      },
    });

    await this.recordHistory(
      complaintId,
      'Remark added',
      userEmpId,
      undefined,
      undefined,
      isInternal ? 'Internal remark added' : 'Public remark added',
      isInternal,
    );

    return remark;
  }

  async recordResolution(complaintId: number, userEmpId: number, isAdmin: boolean, dto: RecordResolutionDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!isAdmin && complaint.handler_id !== userEmpId) {
      throw new ForbiddenException('Only the assigned handler or Admin can record resolution.');
    }
    if (complaint.status !== 'In Progress') {
      throw new BadRequestException('Only In Progress complaints can be marked Resolved.');
    }

    const settings = await this.prisma.complaint_settings.findFirst({
      orderBy: { setting_id: 'asc' },
    });
    const windowDays = settings?.confirmation_window_days || 7;

    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const resolution = await this.prisma.complaint_resolutions.create({
      data: {
        complaint_id: complaintId,
        cycle_number: complaint.reopen_count + 1,
        outcome: dto.outcome,
        resolution_details: dto.resolution_details.trim(),
        root_cause: dto.root_cause?.trim() || null,
        resolved_by: userEmpId,
        resolved_at: now,
        confirmation_window_ends_at: windowEnd,
        employee_confirmation_status: 'Pending',
      },
    });

    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: {
          attachment_id: { in: dto.attachment_ids },
          entity_type: 'COMPLAINT_RESOLUTION',
        },
        data: {
          entity_id: resolution.resolution_id,
        },
      });
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'Resolved',
        updated_at: now,
        updated_by: userEmpId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Resolution recorded',
      userEmpId,
      'In Progress',
      'Resolved',
      `Outcome: ${dto.outcome}`,
    );

    return { complaint: updated, resolution };
  }

  // ===========================================================================
  // 10. CONFIRM, REOPEN, CLOSE, WITHDRAW (BFD Page 25 & 26)
  // ===========================================================================

  async confirmResolution(complaintId: number, empId: number, dto: ConfirmResolutionDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
      include: {
        complaint_resolutions: { orderBy: { cycle_number: 'desc' }, take: 1 },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.complainant_id !== empId) {
      throw new ForbiddenException('Only the complainant can confirm resolution.');
    }
    if (complaint.status !== 'Resolved') {
      throw new BadRequestException('Only Resolved complaints can be confirmed.');
    }

    const latestRes = complaint.complaint_resolutions[0];
    if (latestRes) {
      await this.prisma.complaint_resolutions.update({
        where: { resolution_id: latestRes.resolution_id },
        data: {
          employee_confirmation_status: 'Confirmed',
          employee_confirmed_at: new Date(),
          employee_comment: dto.comment?.trim() || null,
        },
      });
    }

    await this.recordHistory(
      complaintId,
      'Confirmed by employee',
      empId,
      undefined,
      undefined,
      dto.comment?.trim() || 'Employee confirmed resolution',
    );

    return { message: 'Complaint resolution confirmed.' };
  }

  async reopenComplaint(complaintId: number, empId: number, dto: ReopenComplaintDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
      include: {
        complaint_resolutions: { orderBy: { cycle_number: 'desc' }, take: 1 },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.complainant_id !== empId) {
      throw new ForbiddenException('Only the complainant can reopen the complaint.');
    }
    if (complaint.status !== 'Resolved') {
      throw new BadRequestException('Only Resolved complaints can be reopened.');
    }

    const latestRes = complaint.complaint_resolutions[0];
    const now = new Date();
    if (latestRes && latestRes.confirmation_window_ends_at < now) {
      throw new BadRequestException('Confirmation window has ended. You cannot reopen this complaint.');
    }

    // Calculate new target date from priority (BFD Pg 26: counted from day of reopening)
    const settings = await this.prisma.complaint_settings.findFirst({
      orderBy: { setting_id: 'asc' },
    });
    let daysToAdd = 7;
    if (complaint.priority === 'Low') daysToAdd = settings?.target_days_low || 15;
    else if (complaint.priority === 'High') daysToAdd = settings?.target_days_high || 3;
    else if (complaint.priority === 'Urgent') daysToAdd = settings?.target_days_urgent || 1;
    else daysToAdd = settings?.target_days_medium || 7;

    const newTarget = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    if (latestRes) {
      await this.prisma.complaint_resolutions.update({
        where: { resolution_id: latestRes.resolution_id },
        data: {
          employee_confirmation_status: 'Reopened',
          reopened_at: now,
          reopen_reason: dto.reason.trim(),
        },
      });
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'In Progress',
        target_date: newTarget,
        reopen_count: { increment: 1 },
        updated_at: now,
        updated_by: empId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Reopened',
      empId,
      'Resolved',
      'In Progress',
      dto.reason.trim(),
    );

    return updated;
  }

  async sendBackToHandler(complaintId: number, adminId: number, dto: SendBackDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.status !== 'Resolved') {
      throw new BadRequestException('Only Resolved complaints can be sent back to handler.');
    }

    const now = new Date();
    let newTarget = complaint.target_date;
    if (dto.target_date) {
      newTarget = new Date(`${dto.target_date}T00:00:00.000Z`);
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'In Progress',
        target_date: newTarget,
        updated_at: now,
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Sent back by Admin',
      adminId,
      'Resolved',
      'In Progress',
      dto.remarks.trim(),
    );

    return updated;
  }

  async closeComplaint(complaintId: number, adminId: number, dto: CloseComplaintDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
      include: {
        complaint_resolutions: { orderBy: { cycle_number: 'desc' }, take: 1 },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.status !== 'Resolved') {
      throw new BadRequestException('Only Resolved complaints can be closed.');
    }

    const latestRes = complaint.complaint_resolutions[0];
    const now = new Date();

    // BFD Pg 26: Before window ends the Admin may close only a Confirmed complaint
    if (
      latestRes &&
      latestRes.confirmation_window_ends_at > now &&
      latestRes.employee_confirmation_status !== 'Confirmed'
    ) {
      throw new BadRequestException(
        'Before the 7-day confirmation window ends, the Admin can only close a complaint that was confirmed by the employee.',
      );
    }

    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'Closed',
        closure_type: 'Resolved',
        closed_at: now,
        closed_by: adminId,
        closure_remarks: dto.remarks?.trim() || null,
        updated_at: now,
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Closed',
      adminId,
      'Resolved',
      'Closed',
      dto.remarks?.trim() || 'Complaint closed as Resolved by Admin',
    );

    return updated;
  }

  async withdrawComplaint(complaintId: number, empId: number, dto: WithdrawComplaintDto) {
    const complaint = await this.prisma.complaints.findFirst({
      where: { complaint_id: complaintId, deleted_at: null },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.complainant_id !== empId) {
      throw new ForbiddenException('Only the complainant can withdraw the complaint.');
    }
    if (!['New', 'Open'].includes(complaint.status)) {
      throw new BadRequestException('Complaints can only be withdrawn while in New or Open status.');
    }

    const now = new Date();
    const updated = await this.prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        status: 'Closed',
        closure_type: 'Withdrawn',
        withdrawal_reason: dto.reason?.trim() || null,
        withdrawn_at: now,
        closed_at: now,
        closed_by: empId,
        updated_at: now,
        updated_by: empId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      complaintId,
      'Withdrawn',
      empId,
      complaint.status,
      'Closed',
      dto.reason?.trim() || 'Withdrawn by employee',
    );

    return updated;
  }

  // ===========================================================================
  // 11. COMPLAINT REPORTS (BFD Section 11 - Reference Screen 7)
  // ===========================================================================

  async getReports(userEmpId: number, isAdmin: boolean, query: ComplaintReportsQueryDto) {
    if (!isAdmin) {
      throw new ForbiddenException('Complaint reports are restricted to Administrators.');
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let selectedMonthStr = query.month;

    if (query.from_date && query.to_date) {
      startDate = new Date(`${query.from_date}T00:00:00.000Z`);
      endDate = new Date(`${query.to_date}T23:59:59.999Z`);
      if (!selectedMonthStr) selectedMonthStr = query.from_date.substring(0, 7);
    } else {
      if (!selectedMonthStr) {
        selectedMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      const [yearStr, monthStr] = selectedMonthStr.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      endDate = new Date(Date.UTC(year, monthIndex, lastDay, 23, 59, 59, 999));
    }

    const dateBasis = query.date_basis || 'SUBMITTED';

    const where: any = {
      deleted_at: null,
      OR: [
        { closure_type: null },
        { closure_type: { not: 'Withdrawn' } },
      ], // BFD Pg 30 Marker 1: Every report counts all except Withdrawn
    };

    if (query.department_id) where.related_department_id = Number(query.department_id);
    if (query.handler_id) where.handler_id = Number(query.handler_id);
    if (query.complaint_type_id) where.complaint_type_id = Number(query.complaint_type_id);
    if (query.priority) where.priority = query.priority;
    if (query.status && query.status !== 'All' && query.status !== 'All Statuses') where.status = query.status;

    // Date range filter based on dateBasis
    if (dateBasis === 'RESOLVED') {
      where.complaint_resolutions = {
        some: { resolved_at: { gte: startDate, lte: endDate } },
      };
    } else if (dateBasis === 'CLOSED') {
      where.closed_at = { gte: startDate, lte: endDate };
      where.status = 'Closed';
    } else {
      // SUBMITTED
      where.complaint_date = { gte: startDate, lte: endDate };
    }

    const claims = await this.prisma.complaints.findMany({
      where,
      include: {
        complaint_types: true,
        departments: true,
        employees_complaints_complainantToemployees: { select: { emp_id: true, name: true, dep_id: true } },
        employees_complaints_handlerToemployees: { select: { emp_id: true, name: true } },
        complaint_resolutions: { orderBy: { cycle_number: 'desc' }, take: 1 },
      },
      orderBy: { complaint_date: 'desc' },
    });

    // Totals for the period (BFD Pg 30 Marker 5)
    const receivedCount = claims.length;
    const closedCount = claims.filter((c) => c.status === 'Closed').length;
    const overdueCount = claims.filter(
      (c) => ['Open', 'In Progress'].includes(c.status) && c.target_date && new Date(c.target_date) < now,
    ).length;
    const reopenedCount = claims.filter((c) => c.reopen_count > 0).length;

    // Calculate average days to resolve
    const closedResolved = claims.filter(
      (c) => c.status === 'Closed' && c.closure_type === 'Resolved' && c.closed_at,
    );
    let avgDaysToResolve = 0;
    if (closedResolved.length > 0) {
      const sumDays = closedResolved.reduce((acc, c) => {
        const diffMs = (c.closed_at?.getTime() || 0) - c.created_at.getTime();
        return acc + Math.max(1, diffMs / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToResolve = Math.round((sumDays / closedResolved.length) * 10) / 10;
    }

    // 6-Month Trend (BFD Pg 30 Marker 6)
    const [selYearStr, selMonthStr] = selectedMonthStr.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = parseInt(selMonthStr, 10);
    const trend: Array<{
      month: string;
      label: string;
      received: number;
      closed: number;
      is_selected: boolean;
    }> = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(selYear, selMonth - 1 - i, 1));
      const tYear = d.getUTCFullYear();
      const tMonth = d.getUTCMonth();
      const key = `${tYear}-${String(tMonth + 1).padStart(2, '0')}`;
      const label = `${monthNames[tMonth]} ${tYear}`;

      const tStart = new Date(Date.UTC(tYear, tMonth, 1, 0, 0, 0));
      const tEnd = new Date(Date.UTC(tYear, tMonth + 1, 0, 23, 59, 59, 999));

      const monthRec = await this.prisma.complaints.count({
        where: {
          deleted_at: null,
          OR: [
            { closure_type: null },
            { closure_type: { not: 'Withdrawn' } },
          ],
          complaint_date: { gte: tStart, lte: tEnd },
        },
      });

      const monthClo = await this.prisma.complaints.count({
        where: {
          deleted_at: null,
          closure_type: { in: ['Resolved', 'Without action'] },
          status: 'Closed',
          closed_at: { gte: tStart, lte: tEnd },
        },
      });

      trend.push({
        month: key,
        label,
        received: monthRec,
        closed: monthClo,
        is_selected: key === selectedMonthStr,
      });
    }

    // Group By Breakdown (By Type, By Department, By Handler) - BFD Pg 30 Marker 7
    const groupBy = query.group_by || 'type';
    const breakdownMap = new Map<string, {
      name: string;
      received: number;
      closed: number;
      active: number;
      overdue: number;
      total_days: number;
      resolved_count: number;
    }>();

    for (const c of claims) {
      let key = '';
      if (groupBy === 'department') {
        key = c.departments?.name || 'Unknown Department';
      } else if (groupBy === 'handler') {
        key = c.employees_complaints_handlerToemployees?.name || 'Unassigned';
      } else {
        key = c.complaint_types?.name || 'Unknown Type';
      }

      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, {
          name: key,
          received: 0,
          closed: 0,
          active: 0,
          overdue: 0,
          total_days: 0,
          resolved_count: 0,
        });
      }
      const st = breakdownMap.get(key)!;
      st.received += 1;
      if (c.status === 'Closed') {
        st.closed += 1;
        if (c.closure_type === 'Resolved' && c.closed_at) {
          st.resolved_count += 1;
          const diffMs = c.closed_at.getTime() - c.created_at.getTime();
          st.total_days += Math.max(1, diffMs / (1000 * 60 * 60 * 24));
        }
      } else {
        st.active += 1;
      }
      if (['Open', 'In Progress'].includes(c.status) && c.target_date && new Date(c.target_date) < now) {
        st.overdue += 1;
      }
    }

    const breakdown = Array.from(breakdownMap.values()).map((b) => ({
      name: b.name,
      received: b.received,
      closed: b.closed,
      active: b.active,
      overdue: b.overdue,
      avg_days: b.resolved_count > 0 ? Math.round((b.total_days / b.resolved_count) * 10) / 10 : 0,
    }));

    return {
      period: {
        month: selectedMonthStr,
        from_date: startDate.toISOString().split('T')[0],
        to_date: endDate.toISOString().split('T')[0],
        date_basis: dateBasis,
      },
      totals: {
        received: receivedCount,
        closed: closedCount,
        avg_time_to_resolve_days: avgDaysToResolve,
        overdue_now: overdueCount,
        reopened: reopenedCount,
      },
      trend,
      breakdown,
      complaints: claims.map((c) => ({
        complaint_id: c.complaint_id,
        complaint_no: c.complaint_no,
        complaint_date: c.complaint_date.toISOString().split('T')[0],
        complainant_name: c.employees_complaints_complainantToemployees?.name,
        department_name: c.departments?.name,
        type_name: c.complaint_types?.name,
        priority: c.priority || '—',
        handler_name: c.employees_complaints_handlerToemployees?.name || '—',
        status: c.status,
        target_date: c.target_date ? c.target_date.toISOString().split('T')[0] : null,
        resolved_at: c.complaint_resolutions[0]?.resolved_at || null,
        outcome: c.complaint_resolutions[0]?.outcome || null,
        closure_type: c.closure_type || null,
        reopen_count: c.reopen_count,
        is_self_reviewed: c.is_self_reviewed,
      })),
    };
  }

  // ===========================================================================
  // 12. AUDIT HISTORY RECORDER (BFD Page 27)
  // ===========================================================================

  private async recordHistory(
    complaintId: number,
    event: string,
    performedBy?: number,
    oldValue?: string,
    newValue?: string,
    remarks?: string,
    isInternal: boolean = false,
  ) {
    try {
      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'COMPLAINT',
          entity_id: complaintId,
          event,
          summary: remarks || event,
          details: {
            old_value: oldValue || null,
            new_value: newValue || null,
            remarks: remarks || null,
            is_internal: isInternal,
          },
          performed_by: performedBy || null,
        },
      });
    } catch (err) {
      console.error('Failed to record complaint history:', err);
    }
  }
}

