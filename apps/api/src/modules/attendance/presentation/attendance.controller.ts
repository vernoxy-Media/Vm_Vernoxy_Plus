import { TASK_TOKENS } from '../../tasks/public-api';
import type { TaskRepositoryPort } from '../../tasks/public-api';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  Header,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/public-api';
import { AttendanceAdminGuard } from './guards/attendance-admin.guard';
import { PunchInUseCase } from '../application/use-cases/punch-in.use-case';
import { PunchOutUseCase } from '../application/use-cases/punch-out.use-case';
import { StartBreakUseCase } from '../application/use-cases/start-break.use-case';
import { EndBreakUseCase } from '../application/use-cases/end-break.use-case';
import { GetTodayAttendanceUseCase } from '../application/use-cases/get-today-attendance.use-case';
import { GetDashboardUseCase } from '../application/use-cases/get-dashboard.use-case';
import { GetDayDetailUseCase } from '../application/use-cases/get-day-detail.use-case';
import { CreateCorrectionUseCase } from '../application/use-cases/create-correction.use-case';
import { ApproveCorrectionUseCase } from '../application/use-cases/approve-correction.use-case';
import { RejectCorrectionUseCase } from '../application/use-cases/reject-correction.use-case';
import { AdminUpsertDayUseCase } from '../application/use-cases/admin-upsert-day.use-case';
import { GetTeamAttendanceUseCase } from '../application/use-cases/get-team-attendance.use-case';
import { GetAttendanceReportUseCase } from '../application/use-cases/get-attendance-report.use-case';
import { AppSettingsRepository } from '../domain/ports/app-settings.repository.port';
import { AttendanceRepository } from '../domain/ports/attendance.repository.port';
import type { PunchLocationRepository } from '../domain/ports/punch-location.repository.port';
import type { BirthdayRepository } from '../domain/ports/birthday.repository.port';
import { AttendanceNotFoundError } from '../domain/errors/attendance.errors';
import { ATTENDANCE_TOKENS } from '../domain/ports/tokens';
import { ACCESS_POLICY_TOKEN, AccessPolicy } from '../../auth/public-api';
import { Inject, Logger, Optional } from '@nestjs/common';
import { mapAttendanceErrorToHttp } from './attendance-error.mapper';
import {
  TodayAttendanceBlockDto,
  DashboardResponseDto,
  MonthBlockDto,
  DayDetailDto,
  CreateCorrectionDto,
  RejectCorrectionDto,
  AdminUpsertDayDto,
  TeamAttendanceQueryDto,
  StartBreakDto,
  CreateRegularizationDto,
  ApproveRegularizationDto,
  RejectRegularizationDto,
  BulkApproveRegularizationDto,
  RegularizationQueryDto,
  PunchLocationDto,
  AttendanceReportsQueryDto,
} from './dto/attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly punchInUseCase: PunchInUseCase,
    private readonly punchOutUseCase: PunchOutUseCase,
    private readonly startBreakUseCase: StartBreakUseCase,
    private readonly endBreakUseCase: EndBreakUseCase,
    private readonly getTodayAttendanceUseCase: GetTodayAttendanceUseCase,
    private readonly getDashboardUseCase: GetDashboardUseCase,
    private readonly getDayDetailUseCase: GetDayDetailUseCase,
    private readonly createCorrectionUseCase: CreateCorrectionUseCase,
    private readonly approveCorrectionUseCase: ApproveCorrectionUseCase,
    private readonly rejectCorrectionUseCase: RejectCorrectionUseCase,
    private readonly adminUpsertDayUseCase: AdminUpsertDayUseCase,
    private readonly getTeamAttendanceUseCase: GetTeamAttendanceUseCase,
    private readonly getAttendanceReportUseCase: GetAttendanceReportUseCase,
    @Inject(ATTENDANCE_TOKENS.ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: AttendanceRepository,
    @Inject(ATTENDANCE_TOKENS.APP_SETTINGS_REPOSITORY)
    private readonly appSettingsRepo: AppSettingsRepository,
    @Inject(ATTENDANCE_TOKENS.PUNCH_LOCATION_REPOSITORY)
    private readonly punchLocations: PunchLocationRepository,
    @Inject(ACCESS_POLICY_TOKEN)
    private readonly accessPolicy: AccessPolicy,
    @Inject(ATTENDANCE_TOKENS.BIRTHDAY_REPOSITORY)
    private readonly birthdays: BirthdayRepository,
    @Optional() @Inject(TASK_TOKENS.TaskRepository)
    private readonly taskRepo?: TaskRepositoryPort,
  ) {}

  private readonly logger = new Logger('AttendanceController');

  /** Project BFD 3.4: Break and Clock-out pause the running task (it stays In Progress, timer stopped). */
  private async pauseRunningTask(empId: number, reason: string) {
    try {
      await this.taskRepo?.pauseRunningTasks(empId, reason);
    } catch (err: any) {
      this.logger.warn(`Could not pause the running task for emp #${empId}: ${err?.message}`);
    }
  }

  /** Whose attendance is being read: always your own, unless an administrator asks for somebody else's. */
  private async resolveTarget(req: Request, empIdParam?: string): Promise<number> {
    const me = req.user!.emp_id;
    if (!empIdParam) return me;
    const target = Number(empIdParam);
    if (!Number.isInteger(target) || target <= 0) throw new BadRequestException('Invalid emp_id');
    if (target === me) return me;
    if (!(await this.isAdmin(me))) {
      throw new ForbiddenException('Only administrators can view another employee\'s attendance');
    }
    return target;
  }

  /** Only organization administrators may see or change other people's attendance. */
  private isAdmin(empId: number): Promise<boolean> {
    return this.accessPolicy.canManageOrganization(empId);
  }

  @Post(['check-in', 'me/punch-in'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Punch in for today' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async punchIn(@Req() req: Request): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.punchInUseCase.execute(empId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post(['check-out', 'me/punch-out'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Punch out for today' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async punchOut(@Req() req: Request): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      const res = await this.punchOutUseCase.execute(empId);
      await this.pauseRunningTask(empId, 'Paused automatically at clock-out');
      return res;
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  /** Everyone in the company can see whose birthday is today and who is next. Names only, never the birth year. */
  @Get('birthdays')
  @ApiOperation({ summary: 'Birthdays today and in the next days' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  async getBirthdays(@Query('days') daysParam?: string) {
    const n = Number(daysParam);
    const days = Number.isInteger(n) && n >= 0 ? Math.min(n, 90) : 30;
    return this.birthdays.findUpcoming(days);
  }

  @Post('me/punch-location')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Remember where today\'s clock-in / clock-out happened' })
  async savePunchLocation(@Req() req: Request, @Body() body: PunchLocationDto): Promise<void> {
    await this.punchLocations.save(req.user!.emp_id, body.kind, {
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyM: body.accuracy != null ? Math.round(body.accuracy) : null,
    });
  }

  @Post(['break/start', 'me/break'])
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Start a break' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async startBreak(
    @Req() req: Request,
    @Body() dto?: StartBreakDto,
  ): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      const res = await this.startBreakUseCase.execute(empId, dto?.break_type, dto?.reason);
      await this.pauseRunningTask(empId, 'Paused automatically for a break');
      return res;
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post(['break/end', 'me/resume'])
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'End a break (resume working)' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async endBreak(@Req() req: Request): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.endBreakUseCase.execute(empId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('today')
  @ApiOperation({ summary: 'Get current employee attendance status for today' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async getToday(@Req() req: Request): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.getTodayAttendanceUseCase.execute(empId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Get full attendance dashboard for current employee and month' })
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  @ApiQuery({ name: 'emp_id', required: false, description: 'Administrators only: view this employee instead of yourself' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async getDashboard(
    @Req() req: Request,
    @Query('month') month?: string,
    @Query('emp_id') empIdParam?: string,
  ): Promise<DashboardResponseDto> {
    try {
      const empId = await this.resolveTarget(req, empIdParam);
      const dashboard = await this.getDashboardUseCase.execute(empId, month);
      const days = dashboard.month.days;
      if (days.length > 0) {
        const places = await this.punchLocations
          .findRange(empId, days[0].date, days[days.length - 1].date)
          .catch(() => null);
        for (const d of days) {
          const p = places?.get(d.date);
          if (p) d.punch_location = { in: p.in ?? null, out: p.out ?? null };
        }
      }
      return dashboard;
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('employees/:id/dashboard')
  @ApiOperation({ summary: 'Get full attendance dashboard for a specific employee and month' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async getEmployeeDashboard(
    @Param('id', ParseIntPipe) id: number,
    @Query('month') month?: string,
  ): Promise<DashboardResponseDto> {
    try {
      return await this.getDashboardUseCase.execute(id, month);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get month attendance data for current employee' })
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  @ApiResponse({ status: 200, type: MonthBlockDto })
  async getMe(
    @Req() req: Request,
    @Query('month') month?: string,
  ): Promise<MonthBlockDto> {
    try {
      const empId = req.user!.emp_id;
      const dashboard = await this.getDashboardUseCase.execute(empId, month);
      return dashboard.month;
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('me/days/:date')
  @ApiOperation({ summary: 'Get attendance day details by date' })
  @ApiParam({ name: 'date', type: String, description: 'Date in YYYY-MM-DD format', required: true })
  @ApiResponse({ status: 200, type: DayDetailDto })
  async getDayDetail(
    @Req() req: Request,
    @Param('date') date: string,
    @Query('emp_id') empIdParam?: string,
  ): Promise<DayDetailDto> {
    try {
      const empId = await this.resolveTarget(req, empIdParam);
      return await this.getDayDetailUseCase.execute(empId, date);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('employees/:id/days/:date')
  @ApiOperation({ summary: 'Get attendance day details by date for a specific employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiParam({ name: 'date', type: String, description: 'Date in YYYY-MM-DD format', required: true })
  @ApiResponse({ status: 200, type: DayDetailDto })
  async getEmployeeDayDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('date') date: string,
  ): Promise<DayDetailDto> {
    try {
      return await this.getDayDetailUseCase.execute(id, date);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('corrections')
  @ApiOperation({ summary: 'Request attendance correction' })
  @ApiBody({ type: CreateCorrectionDto })
  @ApiResponse({ status: 201 })
  async createCorrection(
    @Req() req: Request,
    @Body() dto: CreateCorrectionDto,
  ) {
    try {
      const empId = req.user!.emp_id;
      return await this.createCorrectionUseCase.execute({
        empId,
        workDate: dto.work_date,
        requestedCheckInAt: new Date(dto.requested_check_in_at),
        requestedCheckOutAt: new Date(dto.requested_check_out_at),
        requestedBreakMinutes: dto.requested_break_minutes ?? 0,
        reason: dto.reason,
      });
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('corrections/:id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Approve attendance correction' })
  @ApiParam({ name: 'id', type: Number, description: 'Correction ID', required: true })
  @ApiResponse({ status: 200 })
  async approveCorrection(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const adminId = req.user!.emp_id;
      return await this.approveCorrectionUseCase.execute(id, adminId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('corrections/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Reject attendance correction' })
  @ApiParam({ name: 'id', type: Number, description: 'Correction ID', required: true })
  @ApiBody({ type: RejectCorrectionDto })
  @ApiResponse({ status: 200 })
  async rejectCorrection(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectCorrectionDto,
  ) {
    try {
      const adminId = req.user!.emp_id;
      return await this.rejectCorrectionUseCase.execute(id, adminId, dto.rejection_reason);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  // --- REGULARIZATION WORKFLOW ENDPOINTS ---

  @Get('regularizations')
  @ApiOperation({ summary: 'List attendance regularization requests' })
  async listRegularizations(@Req() req: Request, @Query() query: RegularizationQueryDto) {
    try {
      const viewerEmpId = req.user!.emp_id;
      const isManagerOrAdmin = await this.isAdmin(viewerEmpId);

      // If scope is 'me' or user is general employee, filter to their own
      const wanted = Number(query.emp_id);
      const empId =
        isManagerOrAdmin && Number.isInteger(wanted) && wanted > 0
          ? wanted
          : query.scope === 'me' || !isManagerOrAdmin
            ? viewerEmpId
            : undefined;

      return await this.attendanceRepo.listRegularizations({
        empId,
        status: query.status,
        tab: query.tab,
        departmentId: query.department_id ? Number(query.department_id) : undefined,
        requestType: query.request_type,
        fromDate: query.from_date,
        toDate: query.to_date,
        search: query.search,
        isManagerOrAdmin,
        viewerEmpId,
      });
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('regularizations')
  @ApiOperation({ summary: 'Create attendance regularization request' })
  async createRegularization(@Req() req: Request, @Body() dto: CreateRegularizationDto) {
    try {
      const viewerEmpId = req.user!.emp_id;
      const targetEmpId = dto.emp_id && (await this.isAdmin(viewerEmpId)) ? dto.emp_id : viewerEmpId;

      const parseDate = (val?: string | null): Date | null => {
        if (!val || val === '--') return null;
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
        if (/^\d{1,2}:\d{2}(:\d{2})?/.test(val)) {
          const combined = new Date(`${dto.work_date}T${val.length === 5 ? val + ':00' : val}.000Z`);
          if (!isNaN(combined.getTime())) return combined;
        }
        return null;
      };

      return await this.attendanceRepo.createRegularization({
        empId: targetEmpId,
        workDate: dto.work_date,
        requestType: dto.request_type,
        currentCheckInAt: parseDate(dto.current_check_in_at),
        currentCheckOutAt: parseDate(dto.current_check_out_at),
        requestedCheckInAt: parseDate(dto.requested_check_in_at),
        requestedCheckOutAt: parseDate(dto.requested_check_out_at),
        reason: dto.reason,
        remarks: dto.remarks,
        attachmentUrl: dto.attachment_url,
        attachmentName: dto.attachment_name,
        createdBy: viewerEmpId,
      });
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('regularizations/:id')
  @ApiOperation({ summary: 'Get regularization request detail' })
  async getRegularizationDetail(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    try {
      const item = await this.attendanceRepo.findCorrectionById(id);
      // someone else's request is reported as missing rather than forbidden
      if (!item || (item.empId !== req.user!.emp_id && !(await this.isAdmin(req.user!.emp_id)))) {
        throw new AttendanceNotFoundError(`Regularization #${id} not found`);
      }
      return item;
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('regularizations/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel regularization request' })
  async cancelRegularization(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    try {
      const empId = req.user!.emp_id;
      return await this.attendanceRepo.cancelRegularization(id, empId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('regularizations/:id/approve')
  @UseGuards(AttendanceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve regularization request' })
  async approveRegularization(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveRegularizationDto,
  ) {
    try {
      const approverId = req.user!.emp_id;
      return await this.attendanceRepo.approveRegularization(id, approverId, dto.comment);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('regularizations/:id/reject')
  @UseGuards(AttendanceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject regularization request' })
  async rejectRegularization(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRegularizationDto,
  ) {
    try {
      const approverId = req.user!.emp_id;
      return await this.attendanceRepo.rejectRegularization(id, approverId, dto.comment);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('regularizations/bulk-approve')
  @UseGuards(AttendanceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve regularization requests' })
  async bulkApproveRegularizations(
    @Req() req: Request,
    @Body() dto: BulkApproveRegularizationDto,
  ) {
    try {
      const approverId = req.user!.emp_id;
      return await this.attendanceRepo.bulkApproveRegularizations(dto.ids, approverId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Put('employees/:id/:date')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Admin edit attendance day' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID', required: true })
  @ApiParam({ name: 'date', type: String, description: 'Date in YYYY-MM-DD format', required: true })
  @ApiBody({ type: AdminUpsertDayDto })
  @ApiResponse({ status: 200 })
  async adminUpsertDay(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('date') date: string,
    @Body() dto: AdminUpsertDayDto,
  ) {
    try {
      const adminId = req.user!.emp_id;
      return await this.adminUpsertDayUseCase.execute({
        empId: id,
        workDate: date,
        checkInAt: new Date(dto.check_in_at),
        checkOutAt: new Date(dto.check_out_at),
        breakMinutes: dto.break_minutes ?? 0,
        adminId,
        note: dto.note,
      });
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('register')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get daily attendance register for all employees' })
  @ApiResponse({ status: 200 })
  async getRegister(
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      return await this.attendanceRepo.getAttendanceRegister({
        date,
        departmentId: departmentId ? Number(departmentId) : undefined,
        shiftId: shiftId ? Number(shiftId) : undefined,
        status,
        search,
      });
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('team')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get team attendance records' })
  @ApiResponse({ status: 200 })
  async getTeam(@Query() query: TeamAttendanceQueryDto) {
    try {
      return await this.getTeamAttendanceUseCase.execute(query);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Get('report/csv')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Export monthly attendance report as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="attendance-report.csv"')
  async getReport(
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    try {
      const csv = await this.getAttendanceReportUseCase.execute(month);
      res.send(csv);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  // ----------------------------------------------------
  // ATTENDANCE REPORTS ENDPOINT
  // ----------------------------------------------------

  @Get('reports')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get attendance reports (Daily, Monthly Summary, Employee-wise, Department-wise, Late & Early Exit, Regularization)' })
  @ApiQuery({ name: 'reportType', required: false, enum: ['daily', 'monthly_summary', 'employee', 'department', 'late_early', 'regularization'] })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'shiftId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAttendanceReports(@Query() query: AttendanceReportsQueryDto) {
    try {
      return await this.attendanceRepo.getAttendanceReports({
        reportType: query.reportType || 'daily',
        fromDate: query.fromDate || new Date().toISOString().slice(0, 10),
        toDate: query.toDate || query.fromDate || new Date().toISOString().slice(0, 10),
        departmentId: query.departmentId,
        employeeId: query.employeeId ? Number(query.employeeId) : undefined,
        shiftId: query.shiftId ? Number(query.shiftId) : undefined,
        status: query.status,
      });
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  // ----------------------------------------------------
  // ATTENDANCE SETTINGS ENDPOINTS
  // ----------------------------------------------------

  @Get('settings')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get organizational attendance settings' })
  async getSettings() {
    return await this.appSettingsRepo.getAttendanceSettings();
  }

  @Put('settings/working-days')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Update working and work off days' })
  async updateWorkingDays(@Req() req: Request, @Body() body: { working_days: number[] }) {
    await this.appSettingsRepo.saveWorkingDays(body.working_days, req.user!.emp_id);
    return await this.appSettingsRepo.getAttendanceSettings();
  }

  @Post('settings/holidays')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Add a new company holiday' })
  async addHoliday(@Req() req: Request, @Body() body: { date: string; name: string; type?: string }) {
    const holiday = await this.appSettingsRepo.addHoliday(body, req.user!.emp_id);
    return holiday;
  }

  @Delete('settings/holidays/:id')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Delete a company holiday' })
  async deleteHoliday(@Req() req: Request, @Param('id') id: string) {
    await this.appSettingsRepo.deleteHoliday(id, req.user!.emp_id);
    return { success: true };
  }

  @Put('settings/working-hours/default')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Update default full day and half day working hours' })
  async updateDefaultHours(
    @Req() req: Request,
    @Body() body: { full_day_hours: number; half_day_hours: number; grace_minutes?: number },
  ) {
    await this.appSettingsRepo.saveDefaultWorkingHours(body, req.user!.emp_id);
    return await this.appSettingsRepo.getAttendanceSettings();
  }

  @Put('settings/working-hours/employee/:id')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Update or reset employee-specific working hours' })
  async updateEmployeeHours(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      full_day_hours?: number;
      half_day_hours?: number;
      start_time?: string;
      end_time?: string;
      reset_to_default?: boolean;
    },
  ) {
    if (body.reset_to_default) {
      await this.appSettingsRepo.saveEmployeeWorkingHours(id, null, req.user!.emp_id);
    } else {
      await this.appSettingsRepo.saveEmployeeWorkingHours(
        id,
        {
          full_day_hours: body.full_day_hours ?? 8,
          half_day_hours: body.half_day_hours ?? (body.full_day_hours ? body.full_day_hours / 2 : 4),
          start_time: body.start_time,
          end_time: body.end_time,
        },
        req.user!.emp_id,
      );
    }
    return await this.appSettingsRepo.getAttendanceSettings();
  }

  // ----------------------------------------------------
  // SHIFT MANAGEMENT ENDPOINTS
  // ----------------------------------------------------

  @Get('settings/shifts')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get all attendance shifts' })
  async getShifts() {
    return await this.appSettingsRepo.getShifts();
  }

  @Post('settings/shifts')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Create a new attendance shift' })
  async createShift(@Req() req: Request, @Body() body: any) {
    const shift = await this.appSettingsRepo.createShift(body, req.user!.emp_id);
    return shift;
  }

  @Patch('settings/shifts/:id')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Update an attendance shift' })
  async updateShift(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const shift = await this.appSettingsRepo.updateShift(id, body, req.user!.emp_id);
    return shift;
  }

  @Post('settings/shifts/:id/set-default')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Set a shift as the company default shift' })
  async setDefaultShift(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const shift = await this.appSettingsRepo.setDefaultShift(id, req.user!.emp_id);
    return shift;
  }

  @Delete('settings/shifts/:id')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Delete an attendance shift' })
  async deleteShift(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.appSettingsRepo.deleteShift(id, req.user!.emp_id);
    return { success: true };
  }

  // ----------------------------------------------------
  // ATTENDANCE STATUS ENDPOINTS
  // ----------------------------------------------------

  @Get('settings/statuses')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get all attendance statuses' })
  async getStatuses() {
    return await this.appSettingsRepo.getStatuses();
  }

  @Post('settings/statuses')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Create a custom attendance status' })
  async createStatus(@Req() req: Request, @Body() body: any) {
    const status = await this.appSettingsRepo.createStatus(body, req.user!.emp_id);
    return status;
  }

  @Patch('settings/statuses/:id')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Update an attendance status' })
  async updateStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const status = await this.appSettingsRepo.updateStatus(id, body, req.user!.emp_id);
    return status;
  }

  @Delete('settings/statuses/:id')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Delete a custom attendance status' })
  async deleteStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.appSettingsRepo.deleteStatus(id, req.user!.emp_id);
    return { success: true };
  }

  // ----------------------------------------------------
  // EMPLOYEE SHIFT ASSIGNMENT ENDPOINTS
  // ----------------------------------------------------

  @Get('settings/shifts/assignments')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Get employee shift assignments' })
  async getShiftAssignments() {
    return await this.appSettingsRepo.getEmployeeShiftAssignments();
  }

  @Put('settings/shifts/assignments/:empId')
  @UseGuards(AttendanceAdminGuard)
  @ApiOperation({ summary: 'Assign a shift to an employee' })
  async assignShift(
    @Req() req: Request,
    @Param('empId', ParseIntPipe) empId: number,
    @Body() body: { shift_id: number | null },
  ) {
    await this.appSettingsRepo.assignEmployeeShift(empId, body.shift_id ?? null, req.user!.emp_id);
    return await this.appSettingsRepo.getAttendanceSettings();
  }
}

