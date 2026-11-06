import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PayrollAccessService, requireEmpId } from '../../application/services/payroll-access.service';
import { PayrollReportsService, REPORT_TYPES, ReportType } from '../../application/services/payroll-reports.service';
import { PayrollService } from '../../application/services/payroll.service';
import {
  AddAdjustmentDto,
  ApproveOtDto,
  BatchApproveOtDto,
  CategoryDto,
  DayAdjustmentDto,
  LockPayrollDto,
  MarkPaidDto,
  RemoveWithReasonDto,
  ReportQueryDto,
  StartPayrollDto,
  UnlockPayrollDto,
  UpdateCategoryDto,
  UpdatePayrollSettingsDto,
} from '../dto/payroll.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payroll: PayrollService,
    private readonly access: PayrollAccessService,
    private readonly reports: PayrollReportsService,
  ) {}

  // --- Who am I -------------------------------------------------------------

  @Get('me')
  async me(@Req() req: any) {
    const v = await this.access.viewer(requireEmpId(req.user));
    return {
      emp_id: v.empId,
      is_admin: v.isAdmin,
      is_accounts: v.isAccounts,
      can_use_payroll: v.isAdmin || v.isAccounts,
      can_approve_ot: v.isAdmin || v.isManager,
      can_edit_settings: v.isAdmin,
      can_unlock: v.isAdmin,
    };
  }

  // --- Own Salary Slips (every employee) -------------------------------------

  @Get('my-slips')
  mySlips(@Req() req: any) {
    return this.payroll.slipsOf(requireEmpId(req.user));
  }

  @Get('slips/:slipId')
  slip(@Req() req: any, @Param('slipId', ParseIntPipe) slipId: number) {
    return this.payroll.slipById(slipId, requireEmpId(req.user));
  }

  @Get('employees/:empId/slips')
  async employeeSlips(@Req() req: any, @Param('empId', ParseIntPipe) empId: number) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.slipsOf(empId);
  }

  // --- OT approvals (Reporting Manager or Admin) ----------------------------

  @Get('ot-approvals')
  async otApprovals(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const v = await this.access.viewer(requireEmpId(req.user));
    if (!v.isAdmin && !v.isAccounts && !v.isManager) return { run: null, entries: [] };
    return this.payroll.listOtEntries(v, Number(year), Number(month));
  }

  @Post('ot-entries/:id/decide')
  @HttpCode(HttpStatus.OK)
  async decideOt(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ApproveOtDto) {
    const v = await this.access.viewer(requireEmpId(req.user));
    return this.payroll.decideOt(id, dto, v);
  }

  @Post('ot-entries/bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(@Req() req: any, @Body() dto: BatchApproveOtDto) {
    const v = await this.access.viewer(requireEmpId(req.user));
    return this.payroll.bulkApproveOt(dto.ot_entry_ids, v);
  }

  // --- Settings ---------------------------------------------------------------

  @Get('settings')
  async settings(@Req() req: any) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.getPayrollSettings();
  }

  @Put('settings')
  async updateSettings(@Req() req: any, @Body() dto: UpdatePayrollSettingsDto) {
    const v = await this.access.assertAdmin(requireEmpId(req.user));
    return this.payroll.updatePayrollSettings(dto, v.empId);
  }

  @Get('settings/change-log')
  async changeLog(@Req() req: any) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.getChangeLog();
  }

  @Post('settings/categories')
  async addCategory(@Req() req: any, @Body() dto: CategoryDto) {
    const v = await this.access.assertAdmin(requireEmpId(req.user));
    return this.payroll.addCategory(dto, v.empId);
  }

  @Patch('settings/categories/:id')
  async updateCategory(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    const v = await this.access.assertAdmin(requireEmpId(req.user));
    return this.payroll.updateCategory(id, dto, v.empId);
  }

  // --- Reports (Section 13) ---------------------------------------------------

  @Get('reports/:type')
  @ApiOperation({ summary: 'Payroll reports; format=xlsx|csv to export' })
  async report(@Req() req: any, @Param('type') type: string, @Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    await this.access.assertPayroll(requireEmpId(req.user));
    if (!REPORT_TYPES.includes(type as ReportType)) return { error: 'Unknown report' };
    const report = await this.reports.build(type as ReportType, q);
    if (q.format === 'xlsx') {
      res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="payroll-${type}.xlsx"` });
      return new StreamableFile(await this.reports.toXlsx(report));
    }
    if (q.format === 'csv') {
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="payroll-${type}.csv"` });
      return new StreamableFile(Buffer.from('﻿' + this.reports.toCsv(report), 'utf8'));
    }
    return report;
  }

  // --- Runs -------------------------------------------------------------------

  @Get('runs')
  async runs(@Req() req: any, @Query('year') year?: string, @Query('status') status?: string, @Query('page') page?: string) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.listPayrollRuns(year ? Number(year) : undefined, status, Number(page) || 1);
  }

  @Get('startable-months')
  async startable(@Req() req: any) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.startableMonths();
  }

  @Get(':year/:month/eligibility')
  async eligibility(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.getStartPayrollEligibility(year, month);
  }

  @Post('start')
  async start(@Req() req: any, @Body() dto: StartPayrollDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.startPayroll(dto.payroll_year, dto.payroll_month, v.empId);
  }

  @Post(':year/:month/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalc(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.recalculate(year, month, v.empId);
  }

  @Get(':year/:month')
  async register(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.getPayrollRegister(year, month);
  }

  @Get(':year/:month/employee/:empId')
  async sheet(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number, @Param('empId', ParseIntPipe) empId: number) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.getEmployeeSalarySheet(year, month, empId);
  }

  // --- Adjustments (Section 8) -------------------------------------------------

  @Post('employees/:payrollEmployeeId/days/:dayId/adjust')
  async adjustDay(@Req() req: any, @Param('payrollEmployeeId', ParseIntPipe) pe: number, @Param('dayId', ParseIntPipe) dayId: number, @Body() dto: DayAdjustmentDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.saveDayAdjustment(pe, dayId, dto, v.empId);
  }

  @Post('employees/:payrollEmployeeId/days/:dayId/remove-adjustment')
  @HttpCode(HttpStatus.OK)
  async removeDay(@Req() req: any, @Param('payrollEmployeeId', ParseIntPipe) pe: number, @Param('dayId', ParseIntPipe) dayId: number, @Body() dto: RemoveWithReasonDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.removeDayAdjustment(pe, dayId, dto.reason, v.empId);
  }

  @Post('employees/:payrollEmployeeId/adjustments')
  async addAdjustment(@Req() req: any, @Param('payrollEmployeeId', ParseIntPipe) pe: number, @Body() dto: AddAdjustmentDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.addAdjustment(pe, dto, v.empId);
  }

  @Delete('adjustments/:id')
  async removeAdjustment(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: RemoveWithReasonDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.removeAdjustment(id, dto.reason, v.empId);
  }

  // --- Lock, unlock, pay (Section 10) -----------------------------------------

  @Post(':year/:month/lock')
  @HttpCode(HttpStatus.OK)
  async lock(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number, @Body() dto: LockPayrollDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.lockPayroll(year, month, dto, v.empId);
  }

  @Post(':year/:month/unlock')
  @HttpCode(HttpStatus.OK)
  async unlock(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number, @Body() dto: UnlockPayrollDto) {
    const v = await this.access.assertAdmin(requireEmpId(req.user));
    return this.payroll.unlockPayroll(year, month, dto, v.empId);
  }

  @Post(':year/:month/pay')
  @HttpCode(HttpStatus.OK)
  async pay(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number, @Body() dto: MarkPaidDto) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.markAsPaid(year, month, dto, v.empId);
  }

  @Get(':year/:month/bank-file')
  async bankFile(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number, @Res({ passthrough: true }) res: Response) {
    await this.access.assertPayroll(requireEmpId(req.user));
    const f = await this.payroll.bankFile(year, month);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${f.filename}"` });
    return new StreamableFile(Buffer.from('﻿' + f.csv, 'utf8'));
  }

  @Post(':year/:month/slips/generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.generateSalarySlips(year, month, v.empId);
  }

  @Post(':year/:month/slips/release')
  @HttpCode(HttpStatus.OK)
  async release(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number) {
    const v = await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.releaseSalarySlips(year, month, v.empId);
  }

  @Get(':year/:month/employee/:empId/slip')
  async employeeSlip(@Req() req: any, @Param('year', ParseIntPipe) year: number, @Param('month', ParseIntPipe) month: number, @Param('empId', ParseIntPipe) empId: number) {
    await this.access.assertPayroll(requireEmpId(req.user));
    return this.payroll.getEmployeeSalarySlip(year, month, empId);
  }
}
