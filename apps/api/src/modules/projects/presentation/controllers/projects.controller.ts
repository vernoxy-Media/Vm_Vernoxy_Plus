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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
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
import {
  CreateProjectDto,
  CreateProjectTaskDto,
  CreateSprintDto,
  ProjectsFilterDto,
  UpdateProjectStatusDto,
  UpdateSprintDto,
} from '../dto/project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
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
    return this.createSprintUseCase.execute({
      project_id: id,
      ...dto,
      created_by: user.emp_id,
    });
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
    return this.updateSprintUseCase.execute(sprintId, {
      ...dto,
      updated_by: user.emp_id,
    });
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
    return this.createProjectTaskUseCase.execute({
      project_id: id,
      ...dto,
      created_by: user.emp_id,
    });
  }
}
