import {
  Controller,
  Get,
  Post,
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
import { GetMyBoardUseCase } from '../../application/use-cases/get-my-board.use-case';
import { GetMySummaryUseCase } from '../../application/use-cases/get-my-summary.use-case';
import { GetTaskDetailUseCase } from '../../application/use-cases/get-task-detail.use-case';
import { GetSubTasksUseCase } from '../../application/use-cases/get-sub-tasks.use-case';
import { MoveTaskStageUseCase } from '../../application/use-cases/move-task-stage.use-case';
import { TrackWorkSessionUseCase } from '../../application/use-cases/track-work-session.use-case';
import {
  CreateTaskDto,
  MoveTaskStageDto,
  TaskBoardQueryDto,
  TaskBoardResultDto,
  TaskDetailDto,
  TaskSummaryDto,
  TrackWorkSessionDto,
} from '../dto/task.dto';
import { mapTaskErrorToHttp } from '../tasks-error.mapper';

@ApiTags('My Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-tasks')
export class MyTasksController {
  constructor(
    private readonly getMyBoardUseCase: GetMyBoardUseCase,
    private readonly getMySummaryUseCase: GetMySummaryUseCase,
    private readonly getTaskDetailUseCase: GetTaskDetailUseCase,
    private readonly getSubTasksUseCase: GetSubTasksUseCase,
    private readonly moveTaskStageUseCase: MoveTaskStageUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly trackWorkSessionUseCase: TrackWorkSessionUseCase,
  ) {}

  @Get('board')
  @ApiOperation({ summary: 'Get employee personal task kanban board' })
  @ApiResponse({ status: 200, type: TaskBoardResultDto })
  async getBoard(
    @Req() req: Request,
    @Query() query: TaskBoardQueryDto,
  ): Promise<TaskBoardResultDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.getMyBoardUseCase.execute(empId, query);
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get employee personal task summary metrics' })
  @ApiResponse({ status: 200, type: TaskSummaryDto })
  async getSummary(@Req() req: Request): Promise<TaskSummaryDto> {
    try {
      const empId = req.user!.emp_id;
      return await this.getMySummaryUseCase.execute(empId);
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Post('quick-task')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quick task for the current employee (Section 3.5 BFD)' })
  @ApiResponse({ status: 201, type: TaskDetailDto })
  async createQuickTask(
    @Req() req: Request,
    @Body() dto: CreateTaskDto,
  ): Promise<any> {
    try {
      const empId = req.user!.emp_id;
      return await this.createTaskUseCase.execute({
        ...dto,
        creator_emp_id: empId,
        source: 'quick',
        assignee_ids: [empId],
      });
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a task assigned to current employee' })
  @ApiResponse({ status: 200, type: TaskDetailDto })
  async getTaskDetail(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskDetailDto> {
    try {
      const empId = req.user!.emp_id;
      const res = await this.getTaskDetailUseCase.execute(id, empId, false);
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

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move assigned task stage (e.g. to in_progress, hold, or requested)' })
  @ApiResponse({ status: 200, type: TaskDetailDto })
  async moveStage(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveTaskStageDto,
  ): Promise<any> {
    try {
      const user = req.user!;
      return await this.moveTaskStageUseCase.execute({
        taskId: id,
        targetStage: dto.target_stage,
        actorEmpId: user.emp_id,
        actorName: (user as any).name || 'Employee',
        isAdmin: false,
        note: dto.note,
        hold_reason: dto.hold_reason,
      });
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
      return await this.trackWorkSessionUseCase.execute({
        taskId: id,
        action: dto.action,
        actorEmpId: user.emp_id,
        actorName: (user as any).name || 'Employee',
        isAdmin: false,
        note: dto.note,
      });
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
  }
}
