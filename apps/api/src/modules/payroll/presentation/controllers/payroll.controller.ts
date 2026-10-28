import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationAdminGuard } from '../../../organization/presentation/guards/organization-admin.guard';
import { PayrollService } from '../../application/services/payroll.service';
import {
  DayAdjustmentDto,
  AddAdjustmentDto,
  ApproveOtDto,
  LockPayrollDto,
  UnlockPayrollDto,
  MarkPaidDto,
  UpdatePayrollSettingsDto,
} from '../dto/payroll.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get global payroll settings' })
  async getSettings() {
    return this.payrollService.getPayrollSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update global payroll settings (Admin only)' })
  async updateSettings(@Body() dto: UpdatePayrollSettingsDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.updatePayrollSettings(dto, adminId);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List payroll runs for given year and status' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async listRuns(@Query('year') year?: string, @Query('status') status?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.payrollService.listPayrollRuns(parsedYear, status);
  }

  @Get(':year/:month/eligibility')
  @ApiOperation({ summary: 'Pre-calculation checks and employee list before starting a run' })
  async getEligibility(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.payrollService.getStartPayrollEligibility(year, month);
  }

  @Post(':year/:month/start')
  @ApiOperation({ summary: 'Start or recalculate draft payroll run for month' })
  async startOrCalculate(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.startOrCalculatePayroll(year, month, adminId);
  }

  @Get(':year/:month')
  @ApiOperation({ summary: 'Get full payroll register for month' })
  async getRegister(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Query() query: any,
  ) {
    return this.payrollService.getPayrollRegister(year, month, query);
  }

  @Get(':year/:month/employee/:empId')
  @ApiOperation({ summary: 'Get detailed salary sheet for single employee' })
  async getEmployeeSalarySheet(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Param('empId', ParseIntPipe) empId: number,
  ) {
    return this.payrollService.getEmployeeSalarySheet(year, month, empId);
  }

  @Post('employees/:payrollEmployeeId/days/:dayId/adjust')
  @ApiOperation({ summary: 'Save day adjustment for employee' })
  async saveDayAdjustment(
    @Param('payrollEmployeeId', ParseIntPipe) payrollEmployeeId: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @Body() dto: DayAdjustmentDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.saveDayAdjustment(payrollEmployeeId, dayId, dto, adminId);
  }

  @Post('employees/:payrollEmployeeId/adjustments')
  @ApiOperation({ summary: 'Add addition or deduction for employee' })
  async addAdjustment(
    @Param('payrollEmployeeId', ParseIntPipe) payrollEmployeeId: number,
    @Body() dto: AddAdjustmentDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.addAdjustment(payrollEmployeeId, dto, adminId);
  }

  @Post('ot-entries/:otEntryId/approve')
  @ApiOperation({ summary: 'Approve, reduce, or reject overtime entry' })
  async approveOt(
    @Param('otEntryId', ParseIntPipe) otEntryId: number,
    @Body() dto: ApproveOtDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.approveOtEntry(otEntryId, dto, adminId);
  }

  @Post(':year/:month/lock')
  @ApiOperation({ summary: 'Lock payroll run' })
  async lockPayroll(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.lockPayroll(year, month, adminId);
  }

  @Post(':year/:month/unlock')
  @ApiOperation({ summary: 'Unlock payroll run (Admin only)' })
  async unlockPayroll(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: UnlockPayrollDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.unlockPayroll(year, month, dto, adminId);
  }

  @Post(':year/:month/pay')
  @ApiOperation({ summary: 'Mark payroll run as Paid' })
  async markAsPaid(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: MarkPaidDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.markAsPaid(year, month, dto, adminId);
  }

  @Post(':year/:month/slips/generate')
  @ApiOperation({ summary: 'Generate salary slips for locked/paid payroll run' })
  async generateSlips(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.generateSalarySlips(year, month, adminId);
  }

  @Post(':year/:month/slips/release')
  @ApiOperation({ summary: 'Release salary slips to employee portal' })
  async releaseSlips(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.payrollService.releaseSalarySlips(year, month, adminId);
  }

  @Get(':year/:month/employee/:empId/slip')
  @ApiOperation({ summary: 'Get formatted salary slip for printable view and download' })
  async getEmployeeSalarySlip(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Param('empId', ParseIntPipe) empId: number,
  ) {
    return this.payrollService.getEmployeeSalarySlip(year, month, empId);
  }
}

