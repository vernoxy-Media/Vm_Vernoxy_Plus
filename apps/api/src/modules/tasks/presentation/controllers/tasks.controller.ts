import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CreateTaskUseCase } from '../../application/use-cases/create-task.use-case';
import { GetAdminBoardUseCase } from '../../application/use-cases/get-admin-board.use-case';
import { GetAdminSummaryUseCase } from '../../application/use-cases/get-admin-summary.use-case';
import { GetAssignableEmployeesUseCase } from '../../application/use-cases/get-assignable-employees.use-case';
import { GetPendingRequestsCountUseCase } from '../../application/use-cases/get-pending-requests-count.use-case';
import { GetTaskDetailUseCase } from '../../application/use-cases/get-task-detail.use-case';
import { GetSubTasksUseCase } from '../../application/use-cases/get-sub-tasks.use-case';
import { MoveTaskStageUseCase } from '../../application/use-cases/move-task-stage.use-case';
import { TrackWorkSessionUseCase } from '../../application/use-cases/track-work-session.use-case';
import { UpdateTaskUseCase } from '../../application/use-cases/update-task.use-case';
import {
  AssignableEmployeeDto,
  CreateTaskDto,
  MoveTaskStageDto,
  PendingReviewCountDto,
  TaskBoardQueryDto,
  TaskBoardResultDto,
  TaskDetailDto,
  TaskSummaryDto,
  TrackWorkSessionDto,
  UpdateTaskDto,
} from '../dto/task.dto';
import { TaskAdminGuard } from '../guards/task-admin.guard';
import { mapTaskErrorToHttp } from '../tasks-error.mapper';
import { EventsService } from '../../../websockets/public-api';

@ApiTags('Admin Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TaskAdminGuard)
@Controller('admin/tasks')
export class TasksController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly getAdminBoardUseCase: GetAdminBoardUseCase,
    private readonly getAdminSummaryUseCase: GetAdminSummaryUseCase,
    private readonly getPendingRequestsCountUseCase: GetPendingRequestsCountUseCase,
    private readonly getAssignableEmployeesUseCase: GetAssignableEmployeesUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getTaskDetailUseCase: GetTaskDetailUseCase,
    private readonly getSubTasksUseCase: GetSubTasksUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly moveTaskStageUseCase: MoveTaskStageUseCase,
    private readonly trackWorkSessionUseCase: TrackWorkSessionUseCase,
  ) {}

  @Get('board')
  @ApiOperation({ summary: 'Get admin task kanban board' })
  @ApiResponse({ status: 200, type: TaskBoardResultDto })
  async getBoard(@Query() query: TaskBoardQueryDto): Promise<TaskBoardResultDto> {
    try {
      return await this.getAdminBoardUseCase.execute(query);
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get admin task summary metrics' })
  @ApiResponse({ status: 200, type: TaskSummaryDto })
  async getSummary(): Promise<TaskSummaryDto> {
    try {
      return await this.getAdminSummaryUseCase.execute();
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get('requests/count')
  @ApiOperation({ summary: 'Get count of tasks waiting in review' })
  @ApiResponse({ status: 200, type: PendingReviewCountDto })
  async getRequestsCount(): Promise<PendingReviewCountDto> {
    try {
      const count = await this.getPendingRequestsCountUseCase.execute();
      return { pending_count: count };
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get('assignable-employees')
  @ApiOperation({ summary: 'Get list of active employees assignable to tasks' })
  @ApiResponse({ status: 200, type: [AssignableEmployeeDto] })
  async getAssignableEmployees(): Promise<AssignableEmployeeDto[]> {
    try {
      return await this.getAssignableEmployeesUseCase.execute();
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task with assignees' })
  @ApiResponse({ status: 201, type: TaskDetailDto })
  async createTask(@Req() req: Request, @Body() dto: CreateTaskDto): Promise<any> {
    try {
      const empId = req.user!.emp_id;
      const res = await this.createTaskUseCase.execute({
        ...dto,
        assignee_ids: dto.assignee_ids || [],
        creator_emp_id: empId,
      });
      this.eventsService.emitToBoard('task:created', res);
      if ((res as any)?.project_id) {
        this.eventsService.emitToProject((res as any).project_id, 'task:created', res);
      }
      if (dto.assignee_ids?.length) {
        dto.assignee_ids.forEach((aId) => this.eventsService.emitToUser(aId, 'task:assigned', res));
      }
      return res;
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details by ID with history' })
  @ApiResponse({ status: 200, type: TaskDetailDto })
  async getTaskDetail(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskDetailDto> {
    try {
      const empId = req.user!.emp_id;
      const res = await this.getTaskDetailUseCase.execute(id, empId, true);
      return { ...res.task, history: res.history } as any;
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get sub tasks for a parent task' })
  @ApiResponse({ status: 200, type: [TaskDetailDto] })
  async getSubTasks(@Param('id', ParseIntPipe) id: number): Promise<any> {
    try {
      return await this.getSubTasksUseCase.execute(id);
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task details or assignees' })
  @ApiResponse({ status: 200, type: TaskDetailDto })
  async updateTask(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ): Promise<any> {
    try {
      const empId = req.user!.emp_id;
      const res = await this.updateTaskUseCase.execute({
        taskId: id,
        ...dto,
        actor_emp_id: empId,
      });
      this.eventsService.emitToBoard('task:updated', res);
      if ((res as any)?.project_id) {
        this.eventsService.emitToProject((res as any).project_id, 'task:updated', res);
      }
      if (dto.assignee_ids?.length) {
        dto.assignee_ids.forEach((aId) => this.eventsService.emitToUser(aId, 'task:assigned', res));
      }
      return res;
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move task stage (admin)' })
  @ApiResponse({ status: 200, type: TaskDetailDto })
  async moveStage(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveTaskStageDto,
  ): Promise<any> {
    try {
      const user = req.user!;
      const res = await this.moveTaskStageUseCase.execute({
        taskId: id,
        targetStage: dto.target_stage,
        actorEmpId: user.emp_id,
        actorName: (user as any).name || 'Admin',
        isAdmin: true,
        note: dto.note,
        hold_reason: dto.hold_reason,
      });
      this.eventsService.emitToBoard('task:stage_changed', res);
      if ((res as any)?.project_id) {
        this.eventsService.emitToProject((res as any).project_id, 'task:stage_changed', res);
      }
      return res;
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Post(':id/work-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track work session (start, pause, finish)' })
  @ApiResponse({ status: 200, type: TaskDetailDto })
  async trackWorkSession(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TrackWorkSessionDto,
  ): Promise<any> {
    try {
      const user = req.user!;
      const res = await this.trackWorkSessionUseCase.execute({
        taskId: id,
        action: dto.action,
        actorEmpId: user.emp_id,
        actorName: (user as any).name || 'Admin',
        isAdmin: true,
        note: dto.note,
      });
      this.eventsService.emitToBoard('task:stage_changed', res);
      if ((res as any)?.project_id) {
        this.eventsService.emitToProject((res as any).project_id, 'task:stage_changed', res);
      }
      return res;
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }
}
