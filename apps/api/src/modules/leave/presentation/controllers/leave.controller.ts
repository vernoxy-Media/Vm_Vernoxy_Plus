import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationAdminGuard } from '../../../organization/presentation/guards/organization-admin.guard';
import { LeaveService } from '../../application/services/leave.service';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  CopyLeavePolicyDto,
  UpdateGeneralSettingsDto,
  CalculateLeaveDaysDto,
  ApplyLeaveDto,
  AddLeaveForEmployeeDto,
  ReviewLeaveRequestDto,
  RequestCancellationDto,
  DecideCancellationDto,
  AdminCancelLeaveDto,
  AdjustBalanceDto,
} from '../dto/leave.dto';

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ---------------------------------------------------------------------------
  // Master Data Settings: Leave Types (Admin)
  // ---------------------------------------------------------------------------

  @Get('settings/types')
  @ApiOperation({ summary: 'Get all leave types' })
  async getLeaveTypes() {
    return this.leaveService.getLeaveTypes();
  }

  @Get('settings/types/:id')
  @ApiOperation({ summary: 'Get leave type by ID' })
  async getLeaveType(@Param('id', ParseIntPipe) id: number) {
    return this.leaveService.getLeaveTypeById(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('settings/types')
  @ApiOperation({ summary: 'Create new leave type' })
  async createLeaveType(@Body() dto: CreateLeaveTypeDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.createLeaveType(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('settings/types/:id')
  @ApiOperation({ summary: 'Update leave type' })
  async updateLeaveType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveTypeDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.updateLeaveType(id, dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Patch('settings/types/:id/toggle')
  @ApiOperation({ summary: 'Toggle leave type active/inactive status' })
  async toggleLeaveTypeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.toggleLeaveTypeStatus(id, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Delete('settings/types/:id')
  @ApiOperation({ summary: 'Delete unused leave type' })
  async deleteLeaveType(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.deleteLeaveType(id, adminId);
  }

  // ---------------------------------------------------------------------------
  // Master Data Settings: Leave Policies (Admin)
  // ---------------------------------------------------------------------------

  @Get('settings/policies')
  @ApiOperation({ summary: 'Get all leave policies with rules' })
  async getLeavePolicies() {
    return this.leaveService.getLeavePolicies();
  }

  @Get('settings/policies/:id')
  @ApiOperation({ summary: 'Get leave policy by ID' })
  async getLeavePolicy(@Param('id', ParseIntPipe) id: number) {
    return this.leaveService.getLeavePolicyById(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('settings/policies')
  @ApiOperation({ summary: 'Create new leave policy with rules' })
  async createLeavePolicy(@Body() dto: CreateLeavePolicyDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.createLeavePolicy(dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('settings/policies/:id')
  @ApiOperation({ summary: 'Update leave policy and rules' })
  async updateLeavePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeavePolicyDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.updateLeavePolicy(id, dto, adminId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('settings/policies/:id/copy')
  @ApiOperation({ summary: 'Make a copy of an existing policy' })
  async copyLeavePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyLeavePolicyDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.copyLeavePolicy(id, dto.new_name, adminId);
  }

  // ---------------------------------------------------------------------------
  // Master Data Settings: General Settings & Change Log
  // ---------------------------------------------------------------------------

  @Get('settings/general')
  @ApiOperation({ summary: 'Get general leave settings' })
  async getGeneralSettings() {
    return this.leaveService.getGeneralSettings();
  }

  @UseGuards(OrganizationAdminGuard)
  @Put('settings/general')
  @ApiOperation({ summary: 'Update general leave settings' })
  async updateGeneralSettings(@Body() dto: UpdateGeneralSettingsDto, @Req() req: any) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.updateGeneralSettings(dto, adminId);
  }

  @Get('settings/change-log')
  @ApiOperation({ summary: 'Get leave settings change log' })
  async getSettingsChangeLog() {
    return this.leaveService.getSettingsChangeLog();
  }

  // ---------------------------------------------------------------------------
  // Employee: My Leave & Application Flow
  // ---------------------------------------------------------------------------

  @Get('my')
  @ApiOperation({ summary: 'Get current employee balances, policy and recent requests' })
  async getMyLeave(@Req() req: any, @Query('year') year?: string) {
    const empId = req.user?.emp_id || 1;
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.leaveService.getMyLeaveOverview(empId, parsedYear);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Preview working days and breakdown before submitting leave' })
  async calculateDays(@Body() dto: CalculateLeaveDaysDto, @Req() req: any) {
    const empId = req.user?.emp_id || 1;
    return this.leaveService.calculateLeaveDays(empId, dto);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Submit leave request' })
  async applyLeave(@Body() dto: ApplyLeaveDto, @Req() req: any) {
    const empId = req.user?.emp_id || 1;
    return this.leaveService.applyLeave(empId, dto);
  }

  @Post('requests/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw pending leave request' })
  async withdrawLeave(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const empId = req.user?.emp_id || 1;
    return this.leaveService.withdrawLeave(id, empId);
  }

  @Post('requests/:id/request-cancel')
  @ApiOperation({ summary: 'Request cancellation for approved leave' })
  async requestCancellation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestCancellationDto,
    @Req() req: any,
  ) {
    const empId = req.user?.emp_id || 1;
    return this.leaveService.requestCancellation(id, empId, dto);
  }

  // ---------------------------------------------------------------------------
  // Admin: Request Approval & Management
  // ---------------------------------------------------------------------------

  @UseGuards(OrganizationAdminGuard)
  @Get('requests')
  @ApiOperation({ summary: 'List leave requests with counter badges' })
  async getAdminRequests(
    @Query('tab') tab?: string,
    @Query('search') search?: string,
  ) {
    return this.leaveService.getAdminLeaveRequests(tab || 'Pending', search);
  }

  @UseGuards(OrganizationAdminGuard)
  @Get('requests/:id')
  @ApiOperation({ summary: 'Get detailed leave request with policy checks and collision info' })
  async getRequestDetails(@Param('id', ParseIntPipe) id: number) {
    return this.leaveService.getLeaveRequestDetails(id);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve pending leave request' })
  async approveRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewLeaveRequestDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.approveLeaveRequest(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject pending leave request' })
  async rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewLeaveRequestDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.rejectLeaveRequest(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/decide-cancellation')
  @ApiOperation({ summary: 'Agree to cancel or keep leave' })
  async decideCancellation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideCancellationDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.decideCancellation(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('requests/:id/admin-cancel')
  @ApiOperation({ summary: 'Admin directly cancels approved leave' })
  async adminCancelLeave(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminCancelLeaveDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.adminCancelLeave(id, adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/add-for-employee')
  @ApiOperation({ summary: 'Admin adds and approves leave for an employee directly' })
  async addLeaveForEmployee(
    @Body() dto: AddLeaveForEmployeeDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.addLeaveForEmployee(adminId, dto);
  }

  @UseGuards(OrganizationAdminGuard)
  @Post('admin/adjust-balance')
  @ApiOperation({ summary: 'Admin adjusts employee leave balance with a mandatory note' })
  async adjustBalance(
    @Body() dto: AdjustBalanceDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.emp_id || 1;
    return this.leaveService.adjustBalance(adminId, dto);
  }

  // ---------------------------------------------------------------------------
  // Ledger & Balances
  // ---------------------------------------------------------------------------

  @Get('ledger')
  @ApiOperation({ summary: 'Get leave ledger transactions' })
  async getLedger(
    @Req() req: any,
    @Query('empId') empIdParam?: string,
    @Query('typeId') typeIdParam?: string,
  ) {
    const currentEmpId = req.user?.emp_id || 1;
    const targetEmpId = empIdParam ? parseInt(empIdParam, 10) : currentEmpId;
    const typeId = typeIdParam ? parseInt(typeIdParam, 10) : undefined;
    return this.leaveService.getLeaveLedger(targetEmpId, typeId);
  }

  @UseGuards(OrganizationAdminGuard)
  @Get('balances')
  @ApiOperation({ summary: 'List all employee leave balances' })
  async getAllBalances(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.leaveService.getAllEmployeeBalances(parsedYear);
  }
}
