import {
  Controller,
  Get,
  Post,
  Put,
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
import { PrismaAppSettingsRepository } from '../infrastructure/repositories/prisma-app-settings.repository';
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
    private readonly appSettingsRepo: PrismaAppSettingsRepository,
  ) {}

  @Post('check-in')
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

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Punch out for today' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async punchOut(@Req() req: Request): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.punchOutUseCase.execute(empId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('break/start')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Start a break' })
  @ApiResponse({ status: 200, type: TodayAttendanceBlockDto })
  async startBreak(@Req() req: Request): Promise<TodayAttendanceBlockDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.startBreakUseCase.execute(empId);
    } catch (err) {
      throw mapAttendanceErrorToHttp(err);
    }
  }

  @Post('break/end')
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
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async getDashboard(
    @Req() req: Request,
    @Query('month') month?: string,
  ): Promise<DashboardResponseDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.getDashboardUseCase.execute(empId, month);
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
  ): Promise<DayDetailDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.getDayDetailUseCase.execute(empId, date);
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
    @Body() body: { full_day_hours: number; half_day_hours: number },
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
    @Body() body: { full_day_hours?: number; half_day_hours?: number; reset_to_default?: boolean },
  ) {
    if (body.reset_to_default) {
      await this.appSettingsRepo.saveEmployeeWorkingHours(id, null, req.user!.emp_id);
    } else {
      await this.appSettingsRepo.saveEmployeeWorkingHours(
        id,
        {
          full_day_hours: body.full_day_hours ?? 8,
          half_day_hours: body.half_day_hours ?? (body.full_day_hours ? body.full_day_hours / 2 : 4),
        },
        req.user!.emp_id,
      );
    }
    return await this.appSettingsRepo.getAttendanceSettings();
  }
}
