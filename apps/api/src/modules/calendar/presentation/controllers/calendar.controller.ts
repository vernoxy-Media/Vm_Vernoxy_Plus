import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CreateCalendarEventUseCase } from '../../application/use-cases/create-calendar-event.use-case';
import { DeleteCalendarEventUseCase } from '../../application/use-cases/delete-calendar-event.use-case';
import { GetCalendarEventsUseCase } from '../../application/use-cases/get-calendar-events.use-case';
import { GetCalendarHolidaysUseCase } from '../../application/use-cases/get-calendar-holidays.use-case';
import { GetCalendarMonthTasksUseCase } from '../../application/use-cases/get-calendar-month-tasks.use-case';
import { GetCalendarSummaryUseCase } from '../../application/use-cases/get-calendar-summary.use-case';
import { GetUnscheduledTasksUseCase } from '../../application/use-cases/get-unscheduled-tasks.use-case';
import { RespondRsvpUseCase } from '../../application/use-cases/respond-rsvp.use-case';
import { UpdateCalendarEventUseCase } from '../../application/use-cases/update-calendar-event.use-case';
import { mapCalendarErrorToHttp } from '../calendar-error.mapper';
import {
  CalendarEventsQueryDto,
  CalendarEventResponseDto,
  UnscheduledTaskDto,
} from '../dto/calendar-event.dto';
import { CreateCalendarEventDto } from '../dto/create-calendar-event.dto';
import { RespondRsvpDto } from '../dto/rsvp.dto';
import { UpdateCalendarEventDto } from '../dto/update-calendar-event.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly getCalendarEventsUseCase: GetCalendarEventsUseCase,
    private readonly createCalendarEventUseCase: CreateCalendarEventUseCase,
    private readonly updateCalendarEventUseCase: UpdateCalendarEventUseCase,
    private readonly deleteCalendarEventUseCase: DeleteCalendarEventUseCase,
    private readonly respondRsvpUseCase: RespondRsvpUseCase,
    private readonly getUnscheduledTasksUseCase: GetUnscheduledTasksUseCase,
    private readonly getCalendarMonthTasksUseCase: GetCalendarMonthTasksUseCase,
    private readonly getCalendarSummaryUseCase: GetCalendarSummaryUseCase,
    private readonly getCalendarHolidaysUseCase: GetCalendarHolidaysUseCase,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'Get calendar events in time window for current employee or all if admin' })
  @ApiResponse({ status: 200, type: [CalendarEventResponseDto] })
  async getEvents(
    @Req() req: Request,
    @Query() query: CalendarEventsQueryDto,
  ): Promise<CalendarEventResponseDto[]> {
    try {
      const user = req.user!;
      const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
      const employeeIds = query.employee_ids
        ? query.employee_ids.split(',').map((id) => parseInt(id.trim(), 10)).filter((n) => !isNaN(n))
        : undefined;

      return await this.getCalendarEventsUseCase.execute({
        employee_id: user.emp_id,
        is_admin: isAdmin,
        employee_ids: employeeIds,
        start_time: query.start,
        end_time: query.end,
      });
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a meeting or task time-block' })
  @ApiResponse({ status: 201, type: CalendarEventResponseDto })
  async createEvent(
    @Req() req: Request,
    @Body() dto: CreateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.createCalendarEventUseCase.execute({
        ...dto,
        organizer_id: empId,
      });
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update an existing calendar event' })
  @ApiResponse({ status: 200, type: CalendarEventResponseDto })
  async updateEvent(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    try {
      const user = req.user!;
      const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
      return await this.updateCalendarEventUseCase.execute({
        event_id: id,
        actor_id: user.emp_id,
        is_admin: isAdmin,
        ...dto,
      });
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft-delete) a calendar event' })
  @ApiResponse({ status: 204 })
  async deleteEvent(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    try {
      const user = req.user!;
      const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
      await this.deleteCalendarEventUseCase.execute(id, user.emp_id, isAdmin);
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Post('events/:id/rsvp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a meeting invitation (accept, decline, tentative)' })
  @ApiResponse({ status: 200 })
  async respondRsvp(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondRsvpDto,
  ): Promise<{ message: string }> {
    try {
      const empId = req.user!.emp_id;
      await this.respondRsvpUseCase.execute({
        event_id: id,
        employee_id: empId,
        response_status: dto.response_status,
      });
      return { message: 'RSVP updated successfully' };
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Get('unscheduled-tasks')
  @ApiOperation({ summary: 'Get active tasks ready for time-blocking on calendar' })
  @ApiResponse({ status: 200, type: [UnscheduledTaskDto] })
  async getUnscheduledTasks(@Req() req: Request): Promise<UnscheduledTaskDto[]> {
    try {
      const empId = req.user!.emp_id;
      return await this.getUnscheduledTasksUseCase.execute(empId);
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Get('month-tasks')
  @ApiOperation({ summary: 'Get completed and submitted tasks for calendar month view' })
  async getMonthTasks(
    @Req() req: Request,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('employee_ids') employeeIdsStr?: string,
    @Query('project_id') projectIdStr?: string,
    @Query('stage') stage?: 'requested' | 'completed' | 'all',
    @Query('task_type_id') taskTypeIdStr?: string,
    @Query('priority') priority?: string,
  ) {
    try {
      const user = req.user!;
      const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
      const employeeIds = employeeIdsStr
        ? employeeIdsStr.split(',').map((id) => parseInt(id.trim(), 10)).filter((n) => !isNaN(n))
        : undefined;
      const projectId = projectIdStr ? parseInt(projectIdStr, 10) : undefined;
      const taskTypeId = taskTypeIdStr ? parseInt(taskTypeIdStr, 10) : undefined;

      return await this.getCalendarMonthTasksUseCase.execute({
        start_date: start,
        end_date: end,
        employee_ids: employeeIds,
        project_id: isNaN(projectId as number) ? undefined : projectId,
        stage,
        task_type_id: isNaN(taskTypeId as number) ? undefined : taskTypeId,
        priority,
        is_admin: isAdmin,
        requesting_emp_id: user.emp_id,
      });
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get calendar 4 KPI summary cards for month' })
  async getSummary(
    @Req() req: Request,
    @Query('month') month: string,
    @Query('employee_ids') employeeIdsStr?: string,
    @Query('project_id') projectIdStr?: string,
  ) {
    try {
      const user = req.user!;
      const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
      const employeeIds = employeeIdsStr
        ? employeeIdsStr.split(',').map((id) => parseInt(id.trim(), 10)).filter((n) => !isNaN(n))
        : undefined;
      const projectId = projectIdStr ? parseInt(projectIdStr, 10) : undefined;

      return await this.getCalendarSummaryUseCase.execute({
        month: month || new Date().toISOString().slice(0, 7),
        employee_ids: employeeIds,
        project_id: isNaN(projectId as number) ? undefined : projectId,
        is_admin: isAdmin,
        requesting_emp_id: user.emp_id,
      });
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Get holidays for calendar range' })
  async getHolidays(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    try {
      return await this.getCalendarHolidaysUseCase.execute(start, end);
    } catch (err) {
      throw mapCalendarErrorToHttp(err);
    }
  }
}

