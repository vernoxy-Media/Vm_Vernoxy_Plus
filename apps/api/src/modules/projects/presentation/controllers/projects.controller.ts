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
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import {
  PROJECT_TOKENS,
  ProjectRepositoryPort,
} from '../../domain/ports/project.repository.port';
import { CreateProjectUseCase } from '../../application/use-cases/create-project.use-case';
import { GetProjectsUseCase } from '../../application/use-cases/get-projects.use-case';
import { GetProjectDetailUseCase } from '../../application/use-cases/get-project-detail.use-case';
import { UpdateProjectStatusUseCase } from '../../application/use-cases/update-project-status.use-case';
import { GetAssignableEmployeesUseCase } from '../../application/use-cases/get-assignable-employees.use-case';
import { CreateSprintUseCase } from '../../application/use-cases/create-sprint.use-case';
import { GetProjectSprintsUseCase } from '../../application/use-cases/get-project-sprints.use-case';
import { UpdateSprintUseCase } from '../../application/use-cases/update-sprint.use-case';
import { CreateProjectTaskUseCase } from '../../application/use-cases/create-project-task.use-case';
import { GetSprintTasksUseCase } from '../../application/use-cases/get-sprint-tasks.use-case';
import { UpdateProjectUseCase } from '../../application/use-cases/update-project.use-case';
import {
  AddBugCommentDto,
  CreateBugDto,
  CreateDiscussionDto,
  CreateProjectDto,
  CreateProjectTaskDto,
  CreateSprintDto,
  ProjectsFilterDto,
  UpdateBugStatusDto,
  UpdateProjectDto,
  UpdateProjectStatusDto,
  UpdateSprintDto,
} from '../dto/project.dto';

import { EventsService } from '../../../websockets/public-api';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly eventsService: EventsService,
    @Inject(PROJECT_TOKENS.ProjectRepository)
    private readonly projectRepo: ProjectRepositoryPort,
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly getProjectsUseCase: GetProjectsUseCase,
    private readonly getProjectDetailUseCase: GetProjectDetailUseCase,
    private readonly updateProjectStatusUseCase: UpdateProjectStatusUseCase,
    private readonly getAssignableEmployeesUseCase: GetAssignableEmployeesUseCase,
    private readonly createSprintUseCase: CreateSprintUseCase,
    private readonly getProjectSprintsUseCase: GetProjectSprintsUseCase,
    private readonly updateSprintUseCase: UpdateSprintUseCase,
    private readonly createProjectTaskUseCase: CreateProjectTaskUseCase,
    private readonly getSprintTasksUseCase: GetSprintTasksUseCase,
    private readonly updateProjectUseCase: UpdateProjectUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get projects with filtering and role-based scope' })
  async getProjects(
    @Req() req: Request,
    @Query() query: ProjectsFilterDto,
  ) {
    const user = req.user!;
    const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;

    return this.getProjectsUseCase.execute({
      status: query.status,
      project_type: query.project_type,
      project_manager_id: query.project_manager_id ? Number(query.project_manager_id) : undefined,
      search: query.search,
      start_date: query.start_date,
      end_date: query.end_date,
      employee_id: user.emp_id,
      is_admin: isAdmin,
    });
  }

  @Get('assignable-employees')
  @ApiOperation({ summary: 'Get active employees assignable as PM or team members' })
  async getAssignableEmployees() {
    return this.getAssignableEmployeesUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project (Admin only)' })
  async createProject(
    @Req() req: Request,
    @Body() dto: CreateProjectDto,
  ) {
    const user = req.user!;
    const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
    if (!isAdmin) {
      throw new ForbiddenException('Only Administrators can create projects');
    }

    return this.createProjectUseCase.execute({
      ...dto,
      created_by: user.emp_id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details by ID' })
  async getProjectDetail(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = req.user!;
    const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;

    return this.getProjectDetailUseCase.execute(id, user.emp_id, isAdmin);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project details (Admin and Project Manager)' })
  async updateProject(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    const user = req.user!;
    const isAdmin = user.role_name?.toLowerCase().includes('admin') ?? false;
    return this.updateProjectUseCase.execute(id, dto, user.emp_id, isAdmin);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project status (Admin and Project Manager)' })
  async updateProjectStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    const user = req.user!;
    return this.updateProjectStatusUseCase.execute(
      id,
      dto.status,
      dto.reason,
      user.emp_id,
    );
  }

  @Get(':id/sprints')
  @ApiOperation({ summary: 'Get all sprints for a project' })
  async getProjectSprints(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.getProjectSprintsUseCase.execute(id);
  }

  @Post(':id/sprints')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new sprint for a project (Admin and PM)' })
  async createSprint(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSprintDto,
  ) {
    const user = req.user!;
    const sprint = await this.createSprintUseCase.execute({
      project_id: id,
      ...dto,
      created_by: user.emp_id,
    });
    this.eventsService.emitToProject(id, 'sprint:created', sprint);
    return sprint;
  }

  @Patch(':id/sprints/:sprintId')
  @ApiOperation({ summary: 'Update sprint details or status' })
  async updateSprint(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('sprintId', ParseIntPipe) sprintId: number,
    @Body() dto: UpdateSprintDto,
  ) {
    const user = req.user!;
    const sprint = await this.updateSprintUseCase.execute(sprintId, {
      ...dto,
      updated_by: user.emp_id,
    });
    this.eventsService.emitToProject(id, 'sprint:updated', sprint);
    return sprint;
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get project tasks (optionally filtered by sprint_id)' })
  async getProjectTasks(
    @Param('id', ParseIntPipe) id: number,
    @Query('sprint_id') sprintId?: string,
  ) {
    const sId = sprintId ? parseInt(sprintId, 10) : undefined;
    return this.getSprintTasksUseCase.execute(id, sId);
  }

  @Post(':id/tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a task under this project and optional sprint' })
  async createProjectTask(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProjectTaskDto,
  ) {
    const user = req.user!;
    const task = await this.createProjectTaskUseCase.execute({
      project_id: id,
      ...dto,
      created_by: user.emp_id,
    });
    this.eventsService.emitToProject(id, 'task:created', task);
    this.eventsService.emitToBoard('task:created', task);
    if (dto.assignee_ids?.length) {
      dto.assignee_ids.forEach((aId) =>
        this.eventsService.emitToUser(aId, 'task:assigned', task),
      );
    }
    return task;
  }

  @Get(':id/discussions')
  @ApiOperation({ summary: 'Get discussion messages for a project' })
  async getProjectDiscussions(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectRepo.getDiscussions(id);
  }

  @Post(':id/discussions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a discussion message to a project' })
  async createProjectDiscussion(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDiscussionDto,
  ) {
    const user = req.user!;
    const msg = await this.projectRepo.createDiscussion(
      id,
      user.emp_id,
      dto.message,
      dto.attachments,
    );
    this.eventsService.emitToProject(id, 'discussion:new_message', msg);
    return msg;
  }

  @Get(':id/activity-logs')
  @ApiOperation({ summary: 'Get activity logs for a project' })
  async getProjectActivityLogs(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectRepo.getActivityLogs(id);
  }

  @Get(':id/bugs')
  @ApiOperation({ summary: 'Get bugs for a project' })
  async getProjectBugs(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectRepo.getBugs(id);
  }

  @Post(':id/bugs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report a bug for a project' })
  async createProjectBug(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBugDto,
  ) {
    const user = req.user!;
    const bug = await this.projectRepo.createBug(
      id,
      user.emp_id,
      {
        task_id: dto.task_id,
        title: dto.title,
        description: dto.actual_result || dto.title,
        steps_to_reproduce: dto.steps_to_reproduce || '',
        expected_result: dto.expected_result || '',
        actual_result: dto.actual_result || '',
        assigned_to: dto.assigned_to,
        priority: dto.priority || 'low',
        status: dto.status || 'new',
        bug_type: dto.bug_type,
        other_bug_type: dto.other_bug_type,
        attachment_url: dto.attachment_url,
      },
    );
    this.eventsService.emitToProject(id, 'bug:created', bug);
    if (dto.assigned_to) {
      this.eventsService.emitToUser(dto.assigned_to, 'bug:assigned', bug);
    }
    return bug;
  }

  @Get(':id/bugs/:bugId')
  @ApiOperation({ summary: 'Get bug details including time tracking, comments, and history' })
  async getProjectBugDetail(
    @Param('bugId', ParseIntPipe) bugId: number,
  ) {
    return this.projectRepo.getBugDetail(bugId);
  }

  @Patch(':id/bugs/:bugId/status')
  @ApiOperation({ summary: 'Update bug status, track dev/qa time, and notify stakeholders' })
  async updateProjectBugStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('bugId', ParseIntPipe) bugId: number,
    @Body() dto: UpdateBugStatusDto,
  ) {
    const user = req.user!;
    const updated = await this.projectRepo.updateBugStatus(bugId, user.emp_id, dto.status, dto.note);
    this.eventsService.emitToProject(id, 'bug:status_changed', { bugId, status: dto.status, updated });
    return updated;
  }

  @Post(':id/bugs/:bugId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a project bug' })
  async addProjectBugComment(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('bugId', ParseIntPipe) bugId: number,
    @Body() dto: AddBugCommentDto,
  ) {
    const user = req.user!;
    const comment = await this.projectRepo.addBugComment(bugId, user.emp_id, dto.comment);
    this.eventsService.emitToProject(id, 'bug:comment_added', { bugId, comment });
    return comment;
  }
}

