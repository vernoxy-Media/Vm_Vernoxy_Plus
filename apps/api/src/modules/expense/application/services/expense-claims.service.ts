import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateExpenseClaimDto,
  UpdateExpenseClaimDto,
  ReviewExpenseClaimDto,
  ReopenExpenseClaimDto,
  DirectReimbursementDto,
  PayrollReimbursementDto,
  ExpenseReportsQueryDto,
  ExpenseType,
} from '../../presentation/dto/expense-claims.dto';

@Injectable()
export class ExpenseClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // 1. GENERATE CLAIM NUMBER (EXP/YYYY/MM/NNNN)
  // ===========================================================================

  private async generateClaimNo(dateStr: string): Promise<string> {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `EXP/${year}/${month}/`;

    const count = await this.prisma.expense_claims.count({
      where: {
        claim_no: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  // ===========================================================================
  // 2. EMPLOYEE CLAIMS & STATS
  // ===========================================================================

  async getMyClaims(empId: number, status?: string) {
    const where: any = {
      emp_id: empId,
      deleted_at: null,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const claims = await this.prisma.expense_claims.findMany({
      where,
      include: {
        expense_categories: {
          select: {
            category_id: true,
            name: true,
            code: true,
            allowed_type: true,
            limit_per_claim: true,
          },
        },
        employees_expense_claims_approver_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ expense_date: 'desc' }, { claim_id: 'desc' }],
    });

    // Compute stats
    const allUserClaims = await this.prisma.expense_claims.findMany({
      where: { emp_id: empId, deleted_at: null },
      select: { status: true, amount: true },
    });

    let totalClaimed = 0;
    let pendingApproval = 0;
    let approvedReady = 0;
    let reimbursedTotal = 0;
    let draftCount = 0;
    let submittedCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let reimbursedCount = 0;

    for (const c of allUserClaims) {
      const amt = Number(c.amount);
      totalClaimed += amt;

      if (c.status === 'DRAFT') draftCount++;
      if (c.status === 'SUBMITTED') {
        submittedCount++;
        pendingApproval += amt;
      }
      if (c.status === 'APPROVED') {
        approvedCount++;
        approvedReady += amt;
      }
      if (c.status === 'REJECTED') rejectedCount++;
      if (c.status === 'REIMBURSED') {
        reimbursedCount++;
        reimbursedTotal += amt;
      }
    }

    return {
      stats: {
        totalClaimed,
        pendingApproval,
        approvedReady,
        reimbursedTotal,
        draftCount,
        submittedCount,
        approvedCount,
        rejectedCount,
        reimbursedCount,
      },
      claims: claims.map((c) => ({
        ...c,
        amount: Number(c.amount),
        category: c.expense_categories,
        approver: c.employees_expense_claims_approver_emp_idToemployees,
      })),
    };
  }

  async getClaimById(claimId: number, currentEmpId: number, isAdmin: boolean = false) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
      include: {
        expense_categories: true,
        employees_expense_claims_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
          },
        },
        employees_expense_claims_approver_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_expense_claims_decided_byToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        expense_claim_history: {
          orderBy: { performed_at: 'desc' },
          include: {
            employees: { select: { emp_id: true, name: true } },
          },
        },
      },
    });

    if (!claim) {
      throw new NotFoundException(`Expense claim #${claimId} not found`);
    }

    // Permission check: employee can only see their own claim unless approver or admin
    if (claim.emp_id !== currentEmpId && claim.approver_emp_id !== currentEmpId && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this expense claim');
    }

    // Fetch department details
    const department = claim.employees_expense_claims_emp_idToemployees?.dep_id
      ? await this.prisma.departments.findFirst({
          where: { dep_id: claim.employees_expense_claims_emp_idToemployees.dep_id },
          select: { dep_id: true, name: true },
        })
      : null;

    // Fetch attachments from unified attachments table
    const rawAttachments = await this.prisma.attachments.findMany({
      where: {
        entity_type: 'EXPENSE_CLAIM',
        entity_id: claimId,
        deleted_at: null,
      },
      orderBy: { display_order: 'asc' },
    });

    const attachments = rawAttachments.map((a) => ({
      attachment_id: a.attachment_id,
      file_name: a.file_name,
      file_url: a.file_url,
      file_size_bytes: Number(a.file_size_bytes),
      mime_type: a.mime_type,
      display_order: a.display_order,
      created_at: a.created_at,
    }));

    return {
      ...claim,
      amount: Number(claim.amount),
      employee: {
        ...claim.employees_expense_claims_emp_idToemployees,
        department_name: department?.name || null,
      },
      approver: claim.employees_expense_claims_approver_emp_idToemployees,
      decided_by_user: claim.employees_expense_claims_decided_byToemployees,
      attachments,
      history: claim.expense_claim_history.map((h: any) => ({
        ...h,
        performed_by_name: h.employees?.name || `Emp #${h.performed_by}`,
      })),
    };
  }

  // ===========================================================================
  // 3. CREATE & SUBMIT CLAIM
  // ===========================================================================

  async createClaim(empId: number, dto: CreateExpenseClaimDto) {
    const expenseDate = new Date(dto.expense_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (expenseDate > today) {
      throw new BadRequestException('Expense date cannot be in the future');
    }

    // 1. Category validation
    const category = await this.prisma.expense_categories.findFirst({
      where: { category_id: dto.category_id, deleted_at: null },
    });
    if (!category) {
      throw new NotFoundException('Selected expense category does not exist');
    }
    if (!category.is_active) {
      throw new BadRequestException('Selected expense category is currently inactive');
    }

    // Allowed type check
    if (category.allowed_type === 'OFFICE' && dto.expense_type === ExpenseType.PERSONAL) {
      throw new BadRequestException('This category only allows Office Expenses');
    }
    if (category.allowed_type === 'PERSONAL' && dto.expense_type === ExpenseType.OFFICE) {
      throw new BadRequestException('This category only allows Personal Expenses');
    }

    // 2. Fetch General Settings
    let generalSettings = await this.prisma.expense_general_settings.findFirst();
    if (!generalSettings) {
      generalSettings = await this.prisma.expense_general_settings.create({
        data: {
          claim_window_days: 60,
          after_claim_window_action: 'FLAG_AS_LATE',
          duplicate_check_enabled: true,
          default_reimbursement_method: 'DIRECT',
          approver_reminder_days: 3,
          currency: 'INR',
        },
      });
    }

    // 3. Automated Flags Calculation
    // Above Limit Check
    const isAboveLimit =
      category.limit_per_claim !== null &&
      category.limit_per_claim !== undefined &&
      dto.amount > Number(category.limit_per_claim);

    // Submission Window / Late Check
    const diffTime = Math.abs(today.getTime() - expenseDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let isLate = false;

    if (diffDays > generalSettings.claim_window_days) {
      if (generalSettings.after_claim_window_action === 'STOP_SUBMISSION') {
        throw new BadRequestException(
          `This expense date (${dto.expense_date}) is outside the allowed window of ${generalSettings.claim_window_days} days. Policy does not allow late submissions.`,
        );
      } else {
        isLate = true;
      }
    }

    // Duplicate Claim Check
    let isPossibleDuplicate = false;
    let duplicateRefId: number | null = null;

    if (generalSettings.duplicate_check_enabled) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const duplicate = await this.prisma.expense_claims.findFirst({
        where: {
          emp_id: empId,
          expense_date: expenseDate,
          amount: dto.amount,
          status: { in: ['SUBMITTED', 'APPROVED', 'REIMBURSED'] },
          deleted_at: null,
          created_at: { gte: ninetyDaysAgo },
          OR: [
            { category_id: dto.category_id },
            ...(dto.merchant_name
              ? [{ merchant_name: { equals: dto.merchant_name.trim(), mode: 'insensitive' as const } }]
              : []),
          ],
        },
        select: { claim_id: true, claim_no: true },
      });

      if (duplicate) {
        isPossibleDuplicate = true;
        duplicateRefId = duplicate.claim_id;
      }
    }

    // 4. Receipt Verification
    const hasAttachments = Boolean(dto.attachment_ids && dto.attachment_ids.length > 0);
    const receiptRequired =
      category.receipt_rule === 'ALWAYS' ||
      (category.receipt_rule === 'ABOVE_THRESHOLD' &&
        dto.amount > Number(category.receipt_threshold_amount));

    if (dto.submit_immediately && receiptRequired && !hasAttachments) {
      throw new BadRequestException(
        `Receipt is required for ${category.name} ${
          category.receipt_rule === 'ALWAYS'
            ? '(always mandatory)'
            : `for amounts above ₹${category.receipt_threshold_amount}`
        }`,
      );
    }

    // 5. Routing Determination
    const employee = await this.prisma.employees.findFirst({
      where: { emp_id: empId },
      select: { dep_id: true },
    });

    let assignedApproverId: number | null = null;
    if (employee?.dep_id) {
      const mapping = await this.prisma.expense_authorised_approvers.findFirst({
        where: { department_id: employee.dep_id, deleted_at: null },
      });

      // If mapped and approver is not the employee themselves
      if (mapping && mapping.approver_emp_id !== empId) {
        assignedApproverId = mapping.approver_emp_id;
      }
    }

    // 6. Claim Status & Claim Number
    const status = dto.submit_immediately ? 'SUBMITTED' : 'DRAFT';
    const claimNo = await this.generateClaimNo(dto.expense_date);

    const created = await this.prisma.expense_claims.create({
      data: {
        claim_no: claimNo,
        emp_id: empId,
        expense_date: expenseDate,
        category_id: dto.category_id,
        expense_type: dto.expense_type,
        amount: dto.amount,
        merchant_name: dto.merchant_name?.trim() || null,
        description: dto.description.trim(),
        status,
        is_above_limit: isAboveLimit,
        is_possible_duplicate: isPossibleDuplicate,
        duplicate_reference_claim_id: duplicateRefId,
        is_late: isLate,
        submitted_at: dto.submit_immediately ? new Date() : null,
        approver_emp_id: dto.submit_immediately ? assignedApproverId : null,
        reimbursement_method: generalSettings.default_reimbursement_method,
        created_by: empId,
      },
    });

    // 7. Associate attachments
    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: {
          attachment_id: { in: dto.attachment_ids },
          entity_type: 'EXPENSE_CLAIM',
        },
        data: {
          entity_id: created.claim_id,
        },
      });
    }

    // 8. Record audit history
    await this.recordHistory(
      created.claim_id,
      dto.submit_immediately ? 'Submitted' : 'Draft Saved',
      empId,
      dto.submit_immediately ? 'Claim submitted for approval' : 'Claim saved as draft',
    );

    return created;
  }

  // ===========================================================================
  // 4. UPDATE DRAFT CLAIM
  // ===========================================================================

  async updateClaim(claimId: number, empId: number, dto: UpdateExpenseClaimDto) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) {
      throw new NotFoundException(`Expense claim #${claimId} not found`);
    }
    if (claim.emp_id !== empId) {
      throw new ForbiddenException('You can only edit your own claims');
    }
    if (claim.status !== 'DRAFT') {
      throw new BadRequestException('Only claims in DRAFT status can be modified');
    }

    const updateData: any = {
      updated_at: new Date(),
      updated_by: empId,
      row_version: { increment: 1 },
    };

    if (dto.expense_date) {
      const expenseDate = new Date(dto.expense_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (expenseDate > today) {
        throw new BadRequestException('Expense date cannot be in the future');
      }
      updateData.expense_date = expenseDate;
    }

    if (dto.category_id) {
      const category = await this.prisma.expense_categories.findFirst({
        where: { category_id: dto.category_id, deleted_at: null },
      });
      if (!category) throw new NotFoundException('Category not found');
      updateData.category_id = dto.category_id;
    }

    if (dto.expense_type) updateData.expense_type = dto.expense_type;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.merchant_name !== undefined) updateData.merchant_name = dto.merchant_name?.trim() || null;
    if (dto.description) updateData.description = dto.description.trim();

    // Link new attachments if provided
    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: {
          attachment_id: { in: dto.attachment_ids },
          entity_type: 'EXPENSE_CLAIM',
        },
        data: {
          entity_id: claimId,
        },
      });
    }

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: updateData,
    });

    await this.recordHistory(claimId, 'Draft Saved', empId, 'Draft claim updated');
    return updated;
  }

  // ===========================================================================
  // 5. SUBMIT DRAFT CLAIM
  // ===========================================================================

  async submitDraft(claimId: number, empId: number) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
      include: { expense_categories: true },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.emp_id !== empId) throw new ForbiddenException('Not authorized');
    if (claim.status !== 'DRAFT') throw new BadRequestException('Only drafts can be submitted');

    // Verify receipt requirement
    const category = claim.expense_categories;
    const attachmentCount = await this.prisma.attachments.count({
      where: {
        entity_type: 'EXPENSE_CLAIM',
        entity_id: claimId,
        deleted_at: null,
      },
    });

    const receiptRequired =
      category.receipt_rule === 'ALWAYS' ||
      (category.receipt_rule === 'ABOVE_THRESHOLD' &&
        Number(claim.amount) > Number(category.receipt_threshold_amount));

    if (receiptRequired && attachmentCount === 0) {
      throw new BadRequestException('Receipt attachment is required before submitting this claim');
    }

    // Routing
    const employee = await this.prisma.employees.findFirst({
      where: { emp_id: empId },
      select: { dep_id: true },
    });

    let assignedApproverId: number | null = null;
    if (employee?.dep_id) {
      const mapping = await this.prisma.expense_authorised_approvers.findFirst({
        where: { department_id: employee.dep_id, deleted_at: null },
      });
      if (mapping && mapping.approver_emp_id !== empId) {
        assignedApproverId = mapping.approver_emp_id;
      }
    }

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
        approver_emp_id: assignedApproverId,
        updated_at: new Date(),
        updated_by: empId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(claimId, 'Submitted', empId, 'Submitted for approval');
    return updated;
  }

  // ===========================================================================
  // 6. WITHDRAW CLAIM
  // ===========================================================================

  async withdrawClaim(claimId: number, empId: number) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.emp_id !== empId) throw new ForbiddenException('Not authorized');
    if (claim.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted claims awaiting approval can be withdrawn');
    }

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        status: 'DRAFT',
        approver_emp_id: null,
        updated_at: new Date(),
        updated_by: empId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(claimId, 'Withdrawn', empId, 'Withdrawn by employee to Draft');
    return updated;
  }

  // ===========================================================================
  // 7. DELETE DRAFT CLAIM (SOFT DELETE)
  // ===========================================================================

  async deleteClaim(claimId: number, empId: number) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.emp_id !== empId) throw new ForbiddenException('Not authorized');
    if (claim.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT claims can be deleted');
    }

    // Soft-delete attachments
    await this.prisma.attachments.updateMany({
      where: { entity_type: 'EXPENSE_CLAIM', entity_id: claimId, deleted_at: null },
      data: { deleted_at: new Date(), deleted_by: empId },
    });

    return this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        deleted_at: new Date(),
        deleted_by: empId,
      },
    });
  }

  // ===========================================================================
  // 8. COPY REJECTED CLAIM TO NEW DRAFT
  // ===========================================================================

  async copyToDraft(claimId: number, empId: number) {
    const original = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!original) throw new NotFoundException('Original claim not found');
    if (original.emp_id !== empId) throw new ForbiddenException('Not authorized');

    const todayStr = new Date().toISOString().split('T')[0];
    const newClaimNo = await this.generateClaimNo(todayStr);

    const created = await this.prisma.expense_claims.create({
      data: {
        claim_no: newClaimNo,
        emp_id: empId,
        expense_date: original.expense_date,
        category_id: original.category_id,
        expense_type: original.expense_type,
        amount: original.amount,
        merchant_name: original.merchant_name,
        description: original.description,
        status: 'DRAFT',
        copied_from_claim_id: original.claim_id,
        created_by: empId,
      },
    });

    // Copy original attachments to new claim in unified attachments table
    const origAttachments = await this.prisma.attachments.findMany({
      where: {
        entity_type: 'EXPENSE_CLAIM',
        entity_id: claimId,
        deleted_at: null,
      },
    });

    for (const a of origAttachments) {
      await this.prisma.attachments.create({
        data: {
          entity_type: 'EXPENSE_CLAIM',
          entity_id: created.claim_id,
          file_name: a.file_name,
          file_url: a.file_url,
          file_size_bytes: a.file_size_bytes,
          mime_type: a.mime_type,
          display_order: a.display_order,
          created_by: empId,
        },
      });
    }

    await this.recordHistory(
      created.claim_id,
      'Draft Saved',
      empId,
      `Cloned from rejected claim ${original.claim_no}`,
    );

    return created;
  }

  // ===========================================================================
  // 9. APPROVALS QUEUE (FOR APPROVER / ADMIN)
  // ===========================================================================

  async getApprovalsQueue(approverEmpId: number, isAdmin: boolean) {
    const where: any = {
      status: 'SUBMITTED',
      deleted_at: null,
    };

    if (!isAdmin) {
      where.approver_emp_id = approverEmpId;
    } else {
      // Admin sees claims assigned to them OR claims with no assigned approver (routed to admin)
      where.OR = [{ approver_emp_id: approverEmpId }, { approver_emp_id: null }];
    }

    const claims = await this.prisma.expense_claims.findMany({
      where,
      include: {
        expense_categories: true,
        employees_expense_claims_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
          },
        },
      },
      orderBy: { submitted_at: 'asc' },
    });

    const departments = await this.prisma.departments.findMany({
      select: { dep_id: true, name: true },
    });
    const depMap = new Map(departments.map((d) => [d.dep_id, d.name]));

    return claims.map((c: any) => ({
      ...c,
      amount: Number(c.amount),
      employee_name: c.employees_expense_claims_emp_idToemployees?.name,
      department_name: c.employees_expense_claims_emp_idToemployees?.dep_id
        ? depMap.get(c.employees_expense_claims_emp_idToemployees.dep_id) || null
        : null,
      category_name: c.expense_categories?.name,
    }));
  }

  // ===========================================================================
  // 10. REVIEW CLAIM (APPROVE / REJECT)
  // ===========================================================================

  async reviewClaim(
    claimId: number,
    reviewerId: number,
    isAdmin: boolean,
    dto: ReviewExpenseClaimDto,
  ) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted claims can be reviewed');
    }

    // Permission check
    if (!isAdmin && claim.approver_emp_id !== reviewerId) {
      throw new ForbiddenException('You are not the designated approver for this claim');
    }

    // If claim has flags (is_above_limit or is_possible_duplicate), require flag acknowledgment
    const hasFlags = claim.is_above_limit || claim.is_possible_duplicate;
    if (dto.action === 'APPROVE' && hasFlags && !dto.flags_acknowledged) {
      throw new BadRequestException(
        'This claim has policy flags (above limit or duplicate). You must acknowledge these flags to approve.',
      );
    }

    if (dto.action === 'REJECT') {
      if (!dto.rejection_reason) {
        throw new BadRequestException('Rejection reason is mandatory when rejecting a claim');
      }
      if (!dto.decision_remarks || dto.decision_remarks.trim().length < 10) {
        throw new BadRequestException(
          'Detailed remarks of at least 10 characters are required when rejecting a claim',
        );
      }
    }

    const isSelfApproved = claim.emp_id === reviewerId;

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        status: dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decided_at: new Date(),
        decided_by: reviewerId,
        decision_remarks: dto.decision_remarks?.trim() || null,
        rejection_reason: dto.action === 'REJECT' ? dto.rejection_reason : null,
        flags_acknowledged: Boolean(dto.flags_acknowledged),
        is_self_approved: isSelfApproved,
        updated_at: new Date(),
        updated_by: reviewerId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      claimId,
      dto.action === 'APPROVE' ? 'Approved' : 'Rejected',
      reviewerId,
      dto.decision_remarks || (dto.action === 'APPROVE' ? 'Approved' : `Rejected: ${dto.rejection_reason}`),
    );

    return updated;
  }

  // ===========================================================================
  // 11. ADMIN REOPEN CLAIM
  // ===========================================================================

  async reopenClaim(claimId: number, adminId: number, dto: ReopenExpenseClaimDto) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'APPROVED' && claim.status !== 'REJECTED') {
      throw new BadRequestException('Only decided claims (Approved or Rejected) can be reopened');
    }

    const targetStatus = dto.target_status || 'SUBMITTED';

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        status: targetStatus,
        decided_at: null,
        decided_by: null,
        decision_remarks: null,
        rejection_reason: null,
        flags_acknowledged: false,
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      claimId,
      'Reopened by Admin',
      adminId,
      dto.remarks || `Reopened to ${targetStatus}`,
    );

    return updated;
  }

  // ===========================================================================
  // 12. REIMBURSEMENT QUEUE (APPROVED CLAIMS)
  // ===========================================================================

  async getReimbursementQueue(statusFilter?: string) {
    const where: any = {
      deleted_at: null,
    };

    if (statusFilter === 'REIMBURSED') {
      where.status = 'REIMBURSED';
    } else if (statusFilter === 'ALL') {
      where.status = { in: ['APPROVED', 'REIMBURSED'] };
    } else {
      where.status = 'APPROVED';
    }

    const claims = await this.prisma.expense_claims.findMany({
      where,
      include: {
        expense_categories: true,
        employees_expense_claims_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
          },
        },
      },
      orderBy: [{ decided_at: 'desc' }, { claim_id: 'desc' }],
    });

    const departments = await this.prisma.departments.findMany({
      select: { dep_id: true, name: true },
    });
    const depMap = new Map(departments.map((d) => [d.dep_id, d.name]));

    return claims.map((c: any) => ({
      ...c,
      amount: Number(c.amount),
      employee_name: c.employees_expense_claims_emp_idToemployees?.name,
      department_name: c.employees_expense_claims_emp_idToemployees?.dep_id
        ? depMap.get(c.employees_expense_claims_emp_idToemployees.dep_id) || null
        : null,
      category_name: c.expense_categories?.name,
    }));
  }

  // ===========================================================================
  // 13. DIRECT REIMBURSEMENT
  // ===========================================================================

  async processDirectReimbursement(
    claimId: number,
    adminId: number,
    dto: DirectReimbursementDto,
  ) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED claims can be reimbursed');
    }

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        status: 'REIMBURSED',
        reimbursement_method: 'DIRECT',
        reimbursed_at: new Date(),
        reimbursed_by: adminId,
        payment_mode: dto.payment_mode,
        payment_reference_no: dto.payment_reference_no.trim(),
        payment_date: new Date(dto.payment_date),
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      claimId,
      'Reimbursed Directly',
      adminId,
      `Mode: ${dto.payment_mode}, Ref: ${dto.payment_reference_no}`,
    );

    return updated;
  }

  // ===========================================================================
  // 14. PAYROLL REIMBURSEMENT
  // ===========================================================================

  async addToPayroll(claimId: number, adminId: number, dto?: PayrollReimbursementDto) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED claims can be added to payroll');
    }

    // If target payroll run provided, verify it exists and is not locked/paid
    let targetRunId = dto?.payroll_run_id || null;
    if (targetRunId) {
      const run = await this.prisma.payroll_runs.findFirst({
        where: { payroll_run_id: targetRunId },
      });
      if (!run) throw new NotFoundException('Payroll run not found');
      if (run.locked_at !== null || run.status === 'PAID') {
        throw new BadRequestException('Cannot add expense to a locked or paid payroll run');
      }
    }

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        reimbursement_method: 'PAYROLL',
        payroll_run_id: targetRunId,
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(
      claimId,
      'Added to Payroll',
      adminId,
      targetRunId ? `Queued for Payroll Run #${targetRunId}` : 'Queued for next Payroll run',
    );

    return updated;
  }

  async removeFromPayroll(claimId: number, adminId: number) {
    const claim = await this.prisma.expense_claims.findFirst({
      where: { claim_id: claimId, deleted_at: null },
    });

    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED claims can be modified');
    }

    const updated = await this.prisma.expense_claims.update({
      where: { claim_id: claimId },
      data: {
        reimbursement_method: 'DIRECT',
        payroll_run_id: null,
        payroll_adjustment_id: null,
        updated_at: new Date(),
        updated_by: adminId,
        row_version: { increment: 1 },
      },
    });

    await this.recordHistory(claimId, 'Removed from Payroll', adminId, 'Reverted to Direct payment queue');
    return updated;
  }

  // ===========================================================================
  // 15. EXPENSE REPORTS (SECTION 11)
  // ===========================================================================

  async getReports(currentEmpId: number, isAdmin: boolean, query: ExpenseReportsQueryDto) {
    // 1. Authorised departments if not admin
    let allowedDeptIds: number[] | null = null;
    if (!isAdmin) {
      const authorized = await this.prisma.expense_authorised_approvers.findMany({
        where: { approver_emp_id: currentEmpId, deleted_at: null },
        select: { department_id: true },
      });
      if (authorized.length > 0) {
        allowedDeptIds = authorized.map((a) => a.department_id);
      } else {
        const me = await this.prisma.employees.findUnique({
          where: { emp_id: currentEmpId },
          select: { dep_id: true },
        });
        if (me?.dep_id) allowedDeptIds = [me.dep_id];
      }
    }

    // 2. Date Range determination
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let selectedMonthStr = query.month;

    if (query.from_date && query.to_date) {
      startDate = new Date(`${query.from_date}T00:00:00.000Z`);
      endDate = new Date(`${query.to_date}T23:59:59.999Z`);
      if (!selectedMonthStr) {
        selectedMonthStr = query.from_date.substring(0, 7);
      }
    } else {
      if (!selectedMonthStr) {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        selectedMonthStr = `${y}-${m}`;
      }
      const [yearStr, monthStr] = selectedMonthStr.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      endDate = new Date(Date.UTC(year, monthIndex, lastDay, 23, 59, 59, 999));
    }

    // 3. Date Basis
    const dateBasis = query.date_basis || 'EXPENSE_DATE';

    // 4. Status determination
    let statusFilter: string[] = ['APPROVED', 'REIMBURSED'];
    if (query.report_type === 'rejected') {
      statusFilter = ['REJECTED'];
    } else if (query.report_type === 'approvals') {
      statusFilter = ['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'];
    } else if (query.status) {
      if (query.status === 'ALL') {
        statusFilter = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'];
      } else {
        statusFilter = query.status.split(',').map((s) => s.trim().toUpperCase());
      }
    }

    // Build base where condition
    const whereCondition: any = {
      deleted_at: null,
    };

    if (allowedDeptIds !== null) {
      whereCondition.employees_expense_claims_emp_idToemployees = {
        dep_id: { in: allowedDeptIds },
      };
    }

    if (query.department_id) {
      whereCondition.employees_expense_claims_emp_idToemployees = {
        ...(whereCondition.employees_expense_claims_emp_idToemployees || {}),
        dep_id: Number(query.department_id),
      };
    }

    if (query.emp_id) {
      whereCondition.emp_id = Number(query.emp_id);
    }

    if (query.category_id) {
      whereCondition.category_id = Number(query.category_id);
    }

    if (query.expense_type) {
      whereCondition.expense_type = query.expense_type;
    }

    // Date range filter
    if (dateBasis === 'APPROVAL_DATE') {
      whereCondition.decided_at = { gte: startDate, lte: endDate };
      whereCondition.status = { in: statusFilter };
    } else if (dateBasis === 'REIMBURSEMENT_DATE') {
      whereCondition.reimbursed_at = { gte: startDate, lte: endDate };
      whereCondition.status = { in: statusFilter };
    } else {
      whereCondition.expense_date = { gte: startDate, lte: endDate };
      whereCondition.status = { in: statusFilter };
    }

    // Fetch matching claims for the report period
    const claims = await this.prisma.expense_claims.findMany({
      where: whereCondition,
      include: {
        expense_categories: true,
        employees_expense_claims_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
          },
        },
        employees_expense_claims_approver_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
          },
        },
        employees_expense_claims_decided_byToemployees: {
          select: {
            emp_id: true,
            name: true,
          },
        },
      },
      orderBy: { expense_date: 'desc' },
    });

    const departments = await this.prisma.departments.findMany({
      select: { dep_id: true, name: true },
    });
    const depMap = new Map(departments.map((d) => [d.dep_id, d.name]));

    const formattedClaims = claims.map((c) => ({
      claim_id: c.claim_id,
      claim_no: c.claim_no,
      emp_id: c.emp_id,
      employee_name: c.employees_expense_claims_emp_idToemployees?.name || `Employee #${c.emp_id}`,
      department_id: c.employees_expense_claims_emp_idToemployees?.dep_id || null,
      department_name: c.employees_expense_claims_emp_idToemployees?.dep_id
        ? depMap.get(c.employees_expense_claims_emp_idToemployees.dep_id) || 'Unknown'
        : 'Unknown',
      expense_date: c.expense_date.toISOString().split('T')[0],
      category_id: c.category_id,
      category_name: c.expense_categories?.name || 'Unknown',
      category_limit: c.expense_categories?.limit_per_claim ? Number(c.expense_categories.limit_per_claim) : null,
      expense_type: c.expense_type,
      amount: Number(c.amount),
      merchant_name: c.merchant_name,
      description: c.description,
      status: c.status,
      is_above_limit: c.is_above_limit,
      is_possible_duplicate: c.is_possible_duplicate,
      is_late: c.is_late,
      is_self_approved: c.is_self_approved,
      submitted_at: c.submitted_at?.toISOString() || null,
      approver_id: c.approver_emp_id || c.decided_by || null,
      approver_name:
        c.employees_expense_claims_decided_byToemployees?.name ||
        c.employees_expense_claims_approver_emp_idToemployees?.name ||
        'Unassigned',
      decided_at: c.decided_at?.toISOString() || null,
      rejection_reason: c.rejection_reason,
      decision_remarks: c.decision_remarks,
      reimbursement_method: c.reimbursement_method,
      payment_mode: c.payment_mode,
      payment_reference_no: c.payment_reference_no,
      payment_date: c.payment_date ? c.payment_date.toISOString().split('T')[0] : null,
    }));

    // Period Totals calculation (Approved and Reimbursed claims)
    const approvedClaims = formattedClaims.filter((c) => c.status === 'APPROVED' || c.status === 'REIMBURSED');
    const totalAmount = approvedClaims.reduce((acc, c) => acc + c.amount, 0);
    const totalClaimsCount = approvedClaims.length;

    const officeClaims = approvedClaims.filter((c) => /office/i.test(c.expense_type));
    const officeAmount = officeClaims.reduce((acc, c) => acc + c.amount, 0);
    const officeCount = officeClaims.length;

    const personalClaims = approvedClaims.filter((c) => /personal/i.test(c.expense_type));
    const personalAmount = personalClaims.reduce((acc, c) => acc + c.amount, 0);
    const personalCount = personalClaims.length;

    // Period Rejected claims calculation
    const rejectedClaimsInPeriod = await this.prisma.expense_claims.findMany({
      where: {
        deleted_at: null,
        status: 'REJECTED',
        decided_at: { gte: startDate, lte: endDate },
        ...(allowedDeptIds !== null
          ? { employees_expense_claims_emp_idToemployees: { dep_id: { in: allowedDeptIds } } }
          : {}),
      },
      select: { amount: true },
    });
    const rejectedCount = rejectedClaimsInPeriod.length;
    const rejectedAmount = rejectedClaimsInPeriod.reduce((acc, c) => acc + Number(c.amount), 0);

    // 6-Month Trend Calculation ending at selectedMonth
    const [selYearStr, selMonthStr] = selectedMonthStr.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = parseInt(selMonthStr, 10);

    const trend: Array<{
      month: string;
      label: string;
      total_amount: number;
      claim_count: number;
      office_amount: number;
      personal_amount: number;
      is_selected: boolean;
    }> = [];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(selYear, selMonth - 1 - i, 1));
      const tYear = d.getUTCFullYear();
      const tMonth = d.getUTCMonth();
      const tMonthStr = String(tMonth + 1).padStart(2, '0');
      const key = `${tYear}-${tMonthStr}`;
      const label = `${monthNames[tMonth]} ${tYear}`;

      const tStart = new Date(Date.UTC(tYear, tMonth, 1, 0, 0, 0));
      const tEnd = new Date(Date.UTC(tYear, tMonth + 1, 0, 23, 59, 59, 999));

      const monthClaims = await this.prisma.expense_claims.findMany({
        where: {
          deleted_at: null,
          status: { in: ['APPROVED', 'REIMBURSED'] },
          expense_date: { gte: tStart, lte: tEnd },
          ...(allowedDeptIds !== null
            ? { employees_expense_claims_emp_idToemployees: { dep_id: { in: allowedDeptIds } } }
            : {}),
        },
        select: { amount: true, expense_type: true },
      });

      let mTotal = 0;
      let mOffice = 0;
      let mPersonal = 0;
      for (const mc of monthClaims) {
        const amt = Number(mc.amount);
        mTotal += amt;
        if (/office/i.test(mc.expense_type)) mOffice += amt;
        if (/personal/i.test(mc.expense_type)) mPersonal += amt;
      }

      trend.push({
        month: key,
        label,
        total_amount: Math.round(mTotal * 100) / 100,
        claim_count: monthClaims.length,
        office_amount: Math.round(mOffice * 100) / 100,
        personal_amount: Math.round(mPersonal * 100) / 100,
        is_selected: key === selectedMonthStr,
      });
    }

    // Group By Breakdown (Category, Department, or Employee)
    const groupBy = query.group_by || 'category';
    const breakdownMap = new Map<string, { id: number | null; name: string; claims: number; office: number; personal: number; total: number }>();

    for (const c of approvedClaims) {
      let key = '';
      let id: number | null = null;
      let name = '';

      if (groupBy === 'department') {
        key = String(c.department_id || 0);
        id = c.department_id;
        name = c.department_name;
      } else if (groupBy === 'employee') {
        key = String(c.emp_id);
        id = c.emp_id;
        name = c.employee_name;
      } else {
        key = String(c.category_id);
        id = c.category_id;
        name = c.category_name;
      }

      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, { id, name, claims: 0, office: 0, personal: 0, total: 0 });
      }
      const entry = breakdownMap.get(key)!;
      entry.claims += 1;
      entry.total += c.amount;
      if (/office/i.test(c.expense_type)) entry.office += c.amount;
      if (/personal/i.test(c.expense_type)) entry.personal += c.amount;
    }

    const breakdown = Array.from(breakdownMap.values())
      .map((b) => ({
        id: b.id,
        name: b.name,
        claims_count: b.claims,
        office_amount: Math.round(b.office * 100) / 100,
        personal_amount: Math.round(b.personal * 100) / 100,
        total_amount: Math.round(b.total * 100) / 100,
        share_percentage: totalAmount > 0 ? Math.round((b.total / totalAmount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    // Approvals Report
    const approverStatsMap = new Map<number, {
      approver_id: number;
      approver_name: string;
      decided_count: number;
      approved_count: number;
      rejected_count: number;
      total_decision_days: number;
      waiting_now: number;
      oldest_waiting_days: number;
    }>();

    const decidedClaimsInPeriod = await this.prisma.expense_claims.findMany({
      where: {
        deleted_at: null,
        status: { in: ['APPROVED', 'REJECTED', 'REIMBURSED'] },
        decided_at: { gte: startDate, lte: endDate },
        decided_by: { not: null },
      },
      include: {
        employees_expense_claims_decided_byToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    for (const c of decidedClaimsInPeriod) {
      if (!c.decided_by) continue;
      const appName = c.employees_expense_claims_decided_byToemployees?.name || `Approver #${c.decided_by}`;
      if (!approverStatsMap.has(c.decided_by)) {
        approverStatsMap.set(c.decided_by, {
          approver_id: c.decided_by,
          approver_name: appName,
          decided_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_decision_days: 0,
          waiting_now: 0,
          oldest_waiting_days: 0,
        });
      }
      const st = approverStatsMap.get(c.decided_by)!;
      st.decided_count += 1;
      if (c.status === 'APPROVED' || c.status === 'REIMBURSED') st.approved_count += 1;
      if (c.status === 'REJECTED') st.rejected_count += 1;

      if (c.submitted_at && c.decided_at) {
        const diffMs = c.decided_at.getTime() - c.submitted_at.getTime();
        const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        st.total_decision_days += diffDays;
      }
    }

    const pendingClaims = await this.prisma.expense_claims.findMany({
      where: {
        deleted_at: null,
        status: 'SUBMITTED',
      },
      include: {
        employees_expense_claims_approver_emp_idToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    const nowTime = Date.now();
    for (const pc of pendingClaims) {
      const appEmpId = pc.approver_emp_id || 0;
      const appName = pc.employees_expense_claims_approver_emp_idToemployees?.name || (appEmpId === 0 ? 'Admin Queue' : `Approver #${appEmpId}`);
      if (!approverStatsMap.has(appEmpId)) {
        approverStatsMap.set(appEmpId, {
          approver_id: appEmpId,
          approver_name: appName,
          decided_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_decision_days: 0,
          waiting_now: 0,
          oldest_waiting_days: 0,
        });
      }
      const st = approverStatsMap.get(appEmpId)!;
      st.waiting_now += 1;
      if (pc.submitted_at) {
        const days = Math.round((nowTime - pc.submitted_at.getTime()) / (1000 * 60 * 60 * 24));
        if (days > st.oldest_waiting_days) {
          st.oldest_waiting_days = days;
        }
      }
    }

    const approvalsReport = Array.from(approverStatsMap.values()).map((st) => ({
      approver_id: st.approver_id,
      approver_name: st.approver_name,
      claims_decided: st.decided_count,
      claims_approved: st.approved_count,
      claims_rejected: st.rejected_count,
      avg_days_to_decide: st.decided_count > 0 ? Math.round((st.total_decision_days / st.decided_count) * 10) / 10 : 0,
      waiting_now: st.waiting_now,
      oldest_waiting_days: st.oldest_waiting_days,
    }));

    return {
      period: {
        month: selectedMonthStr,
        from_date: startDate.toISOString().split('T')[0],
        to_date: endDate.toISOString().split('T')[0],
        date_basis: dateBasis,
      },
      totals: {
        total_amount: Math.round(totalAmount * 100) / 100,
        total_claims: totalClaimsCount,
        office_amount: Math.round(officeAmount * 100) / 100,
        office_count: officeCount,
        personal_amount: Math.round(personalAmount * 100) / 100,
        personal_count: personalCount,
        rejected_amount: Math.round(rejectedAmount * 100) / 100,
        rejected_count: rejectedCount,
      },
      trend,
      breakdown,
      approvals_summary: approvalsReport,
      claims: formattedClaims,
    };
  }

  // ===========================================================================
  // 16. AUDIT HISTORY RECORDER
  // ===========================================================================

  private async recordHistory(
    claimId: number,
    event: string,
    performedBy: number,
    remarks?: string,
    details?: string,
  ) {
    try {
      await this.prisma.expense_claim_history.create({
        data: {
          claim_id: claimId,
          event,
          performed_by: performedBy,
          remarks: remarks || null,
          details: details || null,
        },
      });
    } catch (err) {
      console.error('Failed to record expense claim history:', err);
    }
  }
}
