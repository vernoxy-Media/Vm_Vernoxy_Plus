import { Body, Controller, Delete, Get, HttpStatus, HttpException, Param, ParseIntPipe, Post, Put, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { ExpenseAccessService } from '../../application/services/expense-access.service';
import { ExpenseClaimsService } from '../../application/services/expense-claims.service';
import { ExpenseExportService } from '../../application/services/expense-export.service';
import { todayStr } from '../../domain/expense-rules';
import {
  ApproveClaimDto,
  ClaimsListQueryDto,
  ExpenseReportsQueryDto,
  MyClaimsQueryDto,
  PayrollReimbursementDto,
  RecordPaymentDto,
  RejectClaimDto,
  ReopenExpenseClaimDto,
  SaveClaimDto,
  SubmitClaimDto,
  WithdrawClaimDto,
} from '../dto/expense-claims.dto';

function empIdOf(req: any): number {
  const id = Number(req?.user?.emp_id ?? req?.user?.sub);
  if (!Number.isInteger(id) || id <= 0) throw new HttpException('Please sign in again.', HttpStatus.UNAUTHORIZED);
  return id;
}

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sendFile(res: Response, buffer: Buffer, filename: string, type: string) {
  res.set({ 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"` });
  return new StreamableFile(buffer);
}

@ApiTags('Expense Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense')
export class ExpenseClaimsController {
  constructor(
    private readonly claims: ExpenseClaimsService,
    private readonly access: ExpenseAccessService,
    private readonly exporter: ExpenseExportService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Who am I (drives the menu and screens)
  // ---------------------------------------------------------------------------

  @Get('me')
  @ApiOperation({ summary: 'Expense roles of the signed-in employee' })
  async me(@Req() req: any) {
    const v = await this.access.viewer(empIdOf(req));
    return {
      emp_id: v.empId,
      is_admin: v.isAdmin,
      is_accounts: v.isAccounts,
      is_approver: v.approverDeptIds.length > 0,
      approver_department_ids: v.approverDeptIds,
      can_use_claims: this.access.canUseClaims(v),
      can_reimburse: v.isAdmin || v.isAccounts,
    };
  }

  /** Rejection reasons and payment modes come from Master Data (never hardcoded). */
  @Get('lookups')
  @ApiOperation({ summary: 'Rejection reasons and payment modes from Master Data' })
  async lookups() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT lookup_type, code, label FROM master_lookup
      WHERE lookup_type IN ('expense_rejection_reason', 'expense_payment_mode') AND is_active = true AND deleted_at IS NULL
      ORDER BY lookup_type, sort_order, label;
    `;
    return {
      rejection_reasons: rows.filter((r) => r.lookup_type === 'expense_rejection_reason').map(({ code, label }) => ({ code, label })),
      payment_modes: rows.filter((r) => r.lookup_type === 'expense_payment_mode').map(({ code, label }) => ({ code, label })),
    };
  }

  // ---------------------------------------------------------------------------
  // Screen 1 & 2: My Expenses / Add Expense
  // ---------------------------------------------------------------------------

  @Get('claims/my')
  @ApiOperation({ summary: 'My Expenses: counters and list (drafts first)' })
  getMyClaims(@Req() req: any, @Query() q: MyClaimsQueryDto) {
    return this.claims.getMyClaims(empIdOf(req), q);
  }

  @Get('claims/form-options')
  @ApiOperation({ summary: 'Add Expense form: categories with rules, types, employee header' })
  formOptions(@Req() req: any) {
    return this.claims.formOptions(empIdOf(req));
  }

  @Post('claims')
  @ApiOperation({ summary: 'Save as Draft or Submit Claim' })
  createClaim(@Req() req: any, @Body() dto: SaveClaimDto) {
    return this.claims.saveClaim(empIdOf(req), dto, null);
  }

  @Put('claims/:id')
  @ApiOperation({ summary: 'Edit a Draft (Save as Draft or Submit Claim)' })
  updateClaim(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveClaimDto) {
    return this.claims.saveClaim(empIdOf(req), dto, id);
  }

  @Post('claims/:id/submit')
  submit(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SubmitClaimDto) {
    return this.claims.submitDraft(id, empIdOf(req), dto || {});
  }

  @Post('claims/:id/withdraw')
  withdraw(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: WithdrawClaimDto) {
    return this.claims.withdrawClaim(id, empIdOf(req), dto || {});
  }

  @Delete('claims/:id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.claims.deleteClaim(id, empIdOf(req));
  }

  @Post('claims/:id/copy')
  copy(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.claims.copyToDraft(id, empIdOf(req));
  }

  // ---------------------------------------------------------------------------
  // Screen 3: Expense Claims list
  // ---------------------------------------------------------------------------

  @Get('claims')
  @ApiOperation({ summary: 'Expense Claims (approvers, Accounts, Admin)' })
  list(@Req() req: any, @Query() q: ClaimsListQueryDto) {
    return this.claims.listClaims(empIdOf(req), { ...q, export: false });
  }

  @Get('claims/export')
  @ApiOperation({ summary: 'Export the filtered Expense Claims list to Excel' })
  async exportList(@Req() req: any, @Query() q: ClaimsListQueryDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.claims.listClaims(empIdOf(req), { ...q, export: true });
    const buffer = await this.exporter.workbook([
      {
        name: 'Expense Claims',
        title: `Expense Claims — ${data.tab}`,
        columns: [
          { header: 'Claim No.', key: 'claim_no', width: 18 },
          { header: 'Employee', key: 'employee_name', width: 24 },
          { header: 'Department', key: 'department_name', width: 18 },
          { header: 'Expense Date', key: 'expense_date', width: 14 },
          { header: 'Category', key: 'category_name', width: 24 },
          { header: 'Type', key: 'expense_type', width: 16 },
          { header: 'Amount (₹)', key: 'amount', width: 14, money: true },
          { header: 'Flags', key: 'flags', width: 26 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Decided By', key: 'decided_by_name', width: 20 },
        ],
        rows: (data.all_rows || []).map((r: any) => ({ ...r, flags: this.flagLabels(r) })),
      },
    ]);
    return sendFile(res, buffer, `expense-claims-${todayStr()}.xlsx`, XLSX);
  }

  private flagLabels(r: any) {
    return [r.is_above_limit && 'Above limit', r.is_possible_duplicate && 'Possible duplicate', r.is_late && 'Late', r.is_self_approved && 'Self-approved']
      .filter(Boolean)
      .join(', ');
  }

  // ---------------------------------------------------------------------------
  // Section 8: Reimbursement (static paths before claims/:id)
  // ---------------------------------------------------------------------------

  @Get('reimbursements')
  @ApiOperation({ summary: 'Approved claims waiting for payment (Accounts/Admin)' })
  reimbursements(@Req() req: any, @Query('status') status?: string) {
    return this.claims.reimbursementQueue(empIdOf(req), status);
  }

  @Get('reimbursements/payroll-runs')
  @ApiOperation({ summary: 'Draft payroll runs claims can be added to' })
  payrollRuns(@Req() req: any) {
    return this.claims.draftPayrollRuns(empIdOf(req));
  }

  @Post('reimbursements/pay')
  @ApiOperation({ summary: 'Record a direct payment for approved claims of one employee' })
  pay(@Req() req: any, @Body() dto: RecordPaymentDto) {
    return this.claims.recordPayment(empIdOf(req), dto);
  }

  @Post('reimbursements/payroll')
  @ApiOperation({ summary: 'Add approved claims to a Draft payroll run' })
  addToPayroll(@Req() req: any, @Body() dto: PayrollReimbursementDto) {
    return this.claims.addToPayroll(empIdOf(req), dto);
  }

  // ---------------------------------------------------------------------------
  // Section 11: Expense Reports
  // ---------------------------------------------------------------------------

  @Get('reports')
  reports(@Req() req: any, @Query() q: ExpenseReportsQueryDto) {
    return this.claims.getReports(empIdOf(req), q);
  }

  @Get('reports/export')
  @ApiOperation({ summary: 'Export Expense Reports to Excel' })
  async exportReports(@Req() req: any, @Query() q: ExpenseReportsQueryDto, @Res({ passthrough: true }) res: Response) {
    const r = await this.claims.getReports(empIdOf(req), q);
    const period = `${r.period.from_date} to ${r.period.to_date}`;
    const buffer = await this.exporter.workbook([
      {
        name: 'Summary',
        title: `Expense Report — ${period}`,
        columns: [
          { header: 'Measure', key: 'k', width: 30 },
          { header: 'Value', key: 'v', width: 18 },
        ],
        rows: [
          { k: 'Total approved (₹)', v: r.totals.total_amount },
          { k: 'Claims', v: r.totals.total_claims },
          { k: 'Office Expense (₹)', v: r.totals.office_amount },
          { k: 'Personal Expense (₹)', v: r.totals.personal_amount },
          { k: 'Rejected claims', v: r.totals.rejected_count },
          { k: 'Rejected amount (₹)', v: r.totals.rejected_amount },
        ],
      },
      {
        name: 'Breakdown',
        columns: [
          { header: 'Name', key: 'name', width: 28 },
          { header: 'Claims', key: 'claims_count' },
          { header: 'Office (₹)', key: 'office_amount', money: true, width: 14 },
          { header: 'Personal (₹)', key: 'personal_amount', money: true, width: 14 },
          { header: 'Total (₹)', key: 'total_amount', money: true, width: 14 },
          { header: 'Average (₹)', key: 'average_amount', money: true, width: 14 },
          { header: 'Share %', key: 'share_percentage' },
          { header: 'Above limit', key: 'above_limit' },
        ],
        rows: r.breakdown,
      },
      {
        name: 'Claims',
        columns: [
          { header: 'Claim No.', key: 'claim_no', width: 18 },
          { header: 'Employee', key: 'employee_name', width: 24 },
          { header: 'Department', key: 'department_name', width: 18 },
          { header: 'Expense Date', key: 'expense_date', width: 14 },
          { header: 'Category', key: 'category_name', width: 24 },
          { header: 'Type', key: 'expense_type', width: 16 },
          { header: 'Amount (₹)', key: 'amount', money: true, width: 14 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Approver', key: 'approver_name', width: 20 },
          { header: 'Rejection Reason', key: 'rejection_reason', width: 26 },
          { header: 'Remarks', key: 'decision_remarks', width: 30 },
          { header: 'Paid On', key: 'payment_date', width: 12 },
          { header: 'Payment Mode', key: 'payment_mode', width: 14 },
          { header: 'Reference', key: 'payment_reference_no', width: 20 },
          { header: 'Flags', key: 'flags', width: 26 },
        ],
        rows: r.claims.map((c: any) => ({ ...c, flags: this.flagLabels(c) })),
      },
      {
        name: 'Approvals',
        columns: [
          { header: 'Approver', key: 'approver_name', width: 24 },
          { header: 'Decided', key: 'claims_decided' },
          { header: 'Approved', key: 'claims_approved' },
          { header: 'Rejected', key: 'claims_rejected' },
          { header: 'Avg days to decide', key: 'avg_days_to_decide', width: 18 },
          { header: 'Waiting now', key: 'waiting_now' },
          { header: 'Oldest waiting (days)', key: 'oldest_waiting_days', width: 20 },
        ],
        rows: r.approvals_summary,
      },
    ]);
    return sendFile(res, buffer, `expense-report-${r.period.from_date}-${r.period.to_date}.xlsx`, XLSX);
  }

  // ---------------------------------------------------------------------------
  // Screen 4: Review Claim
  // ---------------------------------------------------------------------------

  @Get('claims/:id')
  getClaim(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.claims.getClaimById(id, empIdOf(req));
  }

  @Get('claims/:id/receipts.zip')
  @ApiOperation({ summary: 'Download all receipts of a claim as a ZIP' })
  async receiptsZip(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const { buffer, filename } = await this.claims.receiptsZip(id, empIdOf(req));
    return sendFile(res, buffer, filename, 'application/zip');
  }

  @Post('claims/:id/approve')
  approve(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ApproveClaimDto) {
    return this.claims.approveClaim(id, empIdOf(req), dto || {});
  }

  @Post('claims/:id/reject')
  reject(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: RejectClaimDto) {
    return this.claims.rejectClaim(id, empIdOf(req), dto);
  }

  @Post('claims/:id/reopen')
  @ApiOperation({ summary: 'Admin reopens an Approved, not yet reimbursed claim' })
  reopen(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ReopenExpenseClaimDto) {
    return this.claims.reopenClaim(id, empIdOf(req), dto);
  }
}
