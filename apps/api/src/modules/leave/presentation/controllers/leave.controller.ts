import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationAdminGuard } from '../../../organization/presentation/guards/organization-admin.guard';
import { LeaveService, Viewer } from '../../application/services/leave.service';
import { LeaveSettingsService } from '../../application/services/leave-settings.service';
import { LeaveReportsService } from '../../application/services/leave-reports.service';
import { LeaveCoreService } from '../../application/services/leave-core.service';
import {
  AddLeaveForEmployeeDto,
  AdjustBalanceDto,
  AdminCancelLeaveDto,
  ApplyLeaveDto,
  AssignEmployeePolicyDto,
  BulkAdjustBalanceDto,
  CalculateLeaveDaysDto,
  CopyLeavePolicyDto,
  CreateLeavePolicyDto,
  CreateLeaveTypeDto,
  DecideCancellationDto,
  LeaveReportsQueryDto,
  LeaveRequestsQueryDto,
  RequestCancellationDto,
  ReviewLeaveRequestDto,
  SetOpeningBalanceDto,
  UpdateGeneralSettingsDto,
  UpdateLeavePolicyDto,
  UpdateLeaveTypeDto,
  WithdrawLeaveDto,
  YearEndDto,
} from '../dto/leave.dto';

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave')
export class LeaveController {
  constructor(
    private readonly leave: LeaveService,
    private readonly settings: LeaveSettingsService,
    private readonly reports: LeaveReportsService,
    private readonly core: LeaveCoreService,
  ) {}

  private empId(req: any): number {
    const id = req.user?.emp_id;
    if (!id) throw new ForbiddenException('Authentication required.');
    return Number(id);
  }

  private async viewer(req: any): Promise<Viewer> {
    const empId = this.empId(req);
    return { empId, isAdmin: await this.core.isAdmin(empId) };
  }

  private send(res: Response, file: { buffer: Buffer; filename: string; mime: string }) {
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  // ---------------------------------------------------------------------------
  // Leave Settings (Admin edits; types/policies/lookups readable by all users)
  // ---------------------------------------------------------------------------

  @Get('settings/lookups')
  @ApiOperation({ summary: 'Leave dropdown values from master data' })
  getLookups() {
    return this.settings.getLookups();
  }

  @Get('settings/types')
  getLeaveTypes() {
    return this.settings.getLeaveTypes();
  }

  @Get('settings/types/:id')
  getLeaveType(@Param('id', ParseIntPipe) id: number) {
    return this.settings.getLeaveTypeById(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('settings/types')
  createLeaveType(@Body() dto: CreateLeaveTypeDto, @Req() req: any) {
    return this.settings.createLeaveType(dto, this.empId(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('settings/types/:id')
  updateLeaveType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeaveTypeDto, @Req() req: any) {
    return this.settings.updateLeaveType(id, dto, this.empId(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Patch('settings/types/:id/toggle')
  toggleLeaveType(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.settings.toggleLeaveTypeStatus(id, this.empId(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete('settings/types/:id')
  deleteLeaveType(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.settings.deleteLeaveType(id, this.empId(req));
  }

  @Get('settings/policies')
  getLeavePolicies() {
    return this.settings.getLeavePolicies();
  }

  @Get('settings/policies/:id')
  getLeavePolicy(@Param('id', ParseIntPipe) id: number) {
    return this.settings.getLeavePolicyById(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('settings/policies')
  createLeavePolicy(@Body() dto: CreateLeavePolicyDto, @Req() req: any) {
    return this.settings.createLeavePolicy(dto, this.empId(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('settings/policies/:id')
  updateLeavePolicy(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeavePolicyDto, @Req() req: any) {
    return this.settings.updateLeavePolicy(id, dto, this.empId(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('settings/policies/:id/copy')
  copyLeavePolicy(@Param('id', ParseIntPipe) id: number, @Body() dto: CopyLeavePolicyDto, @Req() req: any) {
    return this.settings.copyLeavePolicy(id, dto.new_name, this.empId(req));
  }

  @Get('settings/general')
  getGeneralSettings() {
    return this.settings.getGeneralSettings();
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('settings/general')
  updateGeneralSettings(@Body() dto: UpdateGeneralSettingsDto, @Req() req: any) {
    return this.settings.updateGeneralSettings(dto, this.empId(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Get('settings/change-log')
  getChangeLog() {
    return this.settings.getSettingsChangeLog();
  }

  // ---------------------------------------------------------------------------
  // Employee: My Leave
  // ---------------------------------------------------------------------------

  @Get('my')
  @ApiOperation({ summary: 'My Leave: header, balances, apply types and own requests' })
  getMyLeave(@Req() req: any, @Query('year') year?: string) {
    return this.leave.getMyLeaveOverview(this.empId(req), year ? parseInt(year, 10) : undefined);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Leave dashboard cards for the current user' })
  async getDashboard(@Req() req: any) {
    return this.leave.getDashboard(await this.viewer(req));
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Leave Days preview and checks for the Apply Leave form' })
  async calculate(@Body() dto: CalculateLeaveDaysDto, @Req() req: any) {
    return this.leave.preview(await this.viewer(req), dto);
  }

  @Post('apply')
  apply(@Body() dto: ApplyLeaveDto, @Req() req: any) {
    return this.leave.applyLeave(this.empId(req), dto);
  }

  @Post('requests/:id/withdraw')
  withdraw(@Param('id', ParseIntPipe) id: number, @Body() dto: WithdrawLeaveDto, @Req() req: any) {
    return this.leave.withdrawLeave(id, this.empId(req), dto || {});
  }

  @Post('requests/:id/request-cancel')
  requestCancellation(@Param('id', ParseIntPipe) id: number, @Body() dto: RequestCancellationDto, @Req() req: any) {
    return this.leave.requestCancellation(id, this.empId(req), dto);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Leave Ledger: own, or any employee for the Admin' })
  async getLedger(
    @Req() req: any,
    @Query('empId') empIdParam?: string,
    @Query('typeId') typeId?: string,
    @Query('year') year?: string,
  ) {
    const viewer = await this.viewer(req);
    const target = empIdParam ? parseInt(empIdParam, 10) : viewer.empId;
    if (target !== viewer.empId && !viewer.isAdmin) {
      throw new ForbiddenException('You can see only your own Leave Ledger.');
    }
    return this.leave.getLeaveLedger(target, {
      typeId: typeId ? parseInt(typeId, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Get('ledger/export')
  async exportLedger(
    @Req() req: any,
    @Res() res: Response,
    @Query('empId') empIdParam?: string,
    @Query('year') year?: string,
    @Query('format') format?: string,
  ) {
    const viewer = await this.viewer(req);
    const target = empIdParam ? parseInt(empIdParam, 10) : viewer.empId;
    if (target !== viewer.empId && !viewer.isAdmin) {
      throw new ForbiddenException('You can see only your own Leave Ledger.');
    }
    const emp = await this.core.getEmployee(target);
    const rows = await this.leave.getLeaveLedger(target, { year: year ? parseInt(year, 10) : undefined });
    this.send(res, await this.reports.exportLedger(rows, emp.name, format));
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Approved leave in a month (Admin: all, others: own and team)' })
  async calendar(@Req() req: any, @Query('month') month?: string, @Query('department_id') dep?: string) {
    return this.reports.calendar(await this.viewer(req), month, dep ? parseInt(dep, 10) : undefined);
  }

  // ---------------------------------------------------------------------------
  // Reporting Manager: team
  // ---------------------------------------------------------------------------

  @Get('team/requests')
  @ApiOperation({ summary: 'Leave requests of the Reporting Manager\'s team (read only)' })
  getTeamRequests(@Req() req: any, @Query() q: LeaveRequestsQueryDto) {
    return this.leave.getTeamLeaveRequests(this.empId(req), q);
  }

  // ---------------------------------------------------------------------------
  // Leave Requests (Admin)
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Get('requests')
  getRequests(@Query() q: LeaveRequestsQueryDto) {
    return this.leave.getAdminLeaveRequests(q);
  }

  @UseGuards(OrganizationAdminGuard)
  @Get('requests/export')
  async exportRequests(@Query() q: LeaveRequestsQueryDto, @Query('format') format: string, @Res() res: Response) {
    this.send(res, await this.reports.exportRequests(q, format));
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Leave Request Details (Admin, the employee, or their Reporting Manager)' })
  async getRequestDetails(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.leave.getLeaveRequestDetails(id, await this.viewer(req));
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewLeaveRequestDto, @Req() req: any) {
    return this.leave.approveLeaveRequest(id, this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewLeaveRequestDto, @Req() req: any) {
    return this.leave.rejectLeaveRequest(id, this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/decide-cancellation')
  decideCancellation(@Param('id', ParseIntPipe) id: number, @Body() dto: DecideCancellationDto, @Req() req: any) {
    return this.leave.decideCancellation(id, this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/admin-cancel')
  adminCancel(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminCancelLeaveDto, @Req() req: any) {
    return this.leave.adminCancelLeave(id, this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/add-for-employee')
  addForEmployee(@Body() dto: AddLeaveForEmployeeDto, @Req() req: any) {
    return this.leave.addLeaveForEmployee(this.empId(req), dto);
  }

  // ---------------------------------------------------------------------------
  // Balances (Admin)
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Get('balances')
  getBalances(
    @Query('year') year?: string,
    @Query('search') search?: string,
    @Query('department_id') dep?: string,
  ) {
    return this.leave.getAllEmployeeBalances({
      year: year ? parseInt(year, 10) : undefined,
      search,
      department_id: dep ? parseInt(dep, 10) : undefined,
    });
  }

  @Get('employees/:empId/summary')
  @ApiOperation({ summary: 'Leave policy and balances of an employee (Employee Profile)' })
  async getEmployeeSummary(@Param('empId', ParseIntPipe) empId: number, @Req() req: any) {
    const viewer = await this.viewer(req);
    if (empId !== viewer.empId && !viewer.isAdmin) {
      throw new ForbiddenException('You can see only your own leave balances.');
    }
    return this.leave.getEmployeeLeaveSummary(empId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/adjust-balance')
  adjust(@Body() dto: AdjustBalanceDto, @Req() req: any) {
    return this.leave.adjustBalance(this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/bulk-adjust-balance')
  bulkCredit(@Body() dto: BulkAdjustBalanceDto, @Req() req: any) {
    return this.leave.bulkCredit(this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('admin/opening-balance')
  setOpeningBalance(@Body() dto: SetOpeningBalanceDto, @Req() req: any) {
    return this.leave.setOpeningBalance(this.empId(req), dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('admin/employee-policy/:empId')
  assignPolicy(@Param('empId', ParseIntPipe) empId: number, @Body() dto: AssignEmployeePolicyDto, @Req() req: any) {
    return this.leave.assignEmployeePolicy(this.empId(req), empId, dto.policy_id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/year-end')
  @ApiOperation({ summary: 'Run year-end processing for a leave year (manual setting)' })
  yearEnd(@Body() dto: YearEndDto, @Req() req: any) {
    return this.leave.runYearEndManually(this.empId(req), dto.leave_year);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/run-credits')
  @ApiOperation({ summary: 'Bring all credits up to date now' })
  runCredits() {
    return this.leave.runCreditsManually();
  }

  // ---------------------------------------------------------------------------
  // Reports (Admin)
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Get('reports')
  getReports(@Query() q: LeaveReportsQueryDto) {
    return this.reports.getReport(q);
  }

  @UseGuards(OrganizationAdminGuard)
  @Get('reports/export')
  async exportReports(@Query() q: LeaveReportsQueryDto, @Res() res: Response) {
    this.send(res, await this.reports.exportReport(q));
  }
}
