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
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
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
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import { CreateTaskUseCase } from '../../../tasks/public-api';
import { mapTaskErrorToHttp } from '../../../tasks/presentation/tasks-error.mapper';
import { ProjectAccessService } from '../../application/services/project-access.service';

/** Project BFD 3.6: allowed bug status moves ("If QA fails, the bug goes back to Ready for Dev"). */
const BUG_FLOW: Record<string, string[]> = {
  new: ['open'],
  open: ['ready_for_dev', 'not_a_bug'],
  ready_for_dev: ['dev_in_progress'],
  dev_in_progress: ['ready_for_qa'],
  ready_for_qa: ['qa_in_progress'],
  qa_in_progress: ['done', 'ready_for_dev'],
  done: [],
  not_a_bug: [],
};

/** Fields the Project Manager may edit: Additional, Tech-Stack and Deployment Details (BFD 2.8). */
const PM_EDITABLE = [
  'client_name',
  'lead_received_date',
  'project_approved_date',
  'tech_frontend',
  'tech_backend',
  'tech_cloud',
  'deployment',
  'credentials',
];

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
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly access: ProjectAccessService,
    private readonly createTaskUseCase: CreateTaskUseCase,
  ) {}

  private readonly logger = new Logger(ProjectsController.name);

  /** BFD 2.8: employees receive an in-app notification when they are added to a project. */
  private async notifyAdded(projectId: number, projectName: string, empIds: number[], actorId: number) {
    const ids = Array.from(new Set(empIds)).filter((id) => id && id !== actorId);
    if (!ids.length) return;
    await this.createNotificationUseCase
      .executeMany(
        ids.map((id) => ({
          recipient_id: id,
          kind: 'project_member_added',
          title: 'Added to a project',
          body: `You have been added to the project "${projectName}".`,
          entity_type: 'project',
          entity_id: projectId,
          created_by: actorId,
        })),
      )
      .catch((err: any) => this.logger.warn(`Project member notification failed: ${err?.message}`));
  }

  @Get()
  @ApiOperation({ summary: 'Get projects with filtering and role-based scope' })
  async getProjects(
    @Req() req: Request,
    @Query() query: ProjectsFilterDto,
  ) {
    const user = req.user!;
    const isAdmin = await this.access.isAdmin(user.emp_id);

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
    if (!(await this.access.isAdmin(user.emp_id))) {
      throw new ForbiddenException('Only the Admin can create a project.');
    }
    const project = await this.createProjectUseCase.execute({
      ...dto,
      created_by: user.emp_id,
    });
    await this.notifyAdded(project.project_id, project.project_name, [...(dto.member_ids || []), dto.project_manager_id], user.emp_id);
    return project;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details by ID' })
  async getProjectDetail(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = req.user!;
    const isAdmin = await this.access.isAdmin(user.emp_id);
    const project = await this.getProjectDetailUseCase.execute(id, user.emp_id, isAdmin);
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project details (Admin and Project Manager)' })
  async updateProject(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    const user = req.user!;
    const role = await this.access.assertManager(id, user.emp_id);
    let input: any = dto;
    if (!role.isAdmin) {
      // The Project Manager can edit only Additional, Tech-Stack and Deployment Details.
      input = Object.fromEntries(Object.entries(dto).filter(([k]) => PM_EDITABLE.includes(k)));
    }
    const membersChanging = role.isAdmin && Boolean(dto.member_ids || dto.project_manager_id);
    const before = membersChanging ? await this.access.memberIds(id) : [];
    const updated = await this.updateProjectUseCase.execute(id, input, user.emp_id, role.isAdmin);
    if (membersChanging) {
      const after = await this.access.memberIds(id);
      await this.notifyAdded(id, role.project.project_name, after.filter((x) => !before.includes(x)), user.emp_id);
    }
    return updated;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project status (Admin and Project Manager)' })
  async updateProjectStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    const user = req.user!;
    // Status (and Kanban moves) are changed by the Admin or the Project Manager only.
    await this.access.assertManager(id, user.emp_id);
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
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertMember(id, req.user!.emp_id);
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
    const role = await this.access.assertManager(id, user.emp_id);
    this.assertSprintDates(role.project, dto.start_date, dto.end_date);
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
    const role = await this.access.assertManager(id, user.emp_id);
    const current: any = (await this.getProjectSprintsUseCase.execute(id)).find((x: any) => x.sprint_id === sprintId);
    if (!current) throw new NotFoundException('Sprint not found in this project.');
    this.assertSprintDates(
      role.project,
      dto.start_date ?? String(current.start_date).slice(0, 10),
      dto.end_date ?? String(current.end_date).slice(0, 10),
    );
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
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('sprint_id') sprintId?: string,
  ) {
    const empId = req.user!.emp_id;
    const role = await this.access.assertMember(id, empId);
    const sId = sprintId ? parseInt(sprintId, 10) : undefined;
    const tasks = await this.getSprintTasksUseCase.execute(id, sId);
    if (role.isAdmin || role.isPM) return tasks;
    // BFD 3.3: an employee sees only their own tasks in the project.
    return tasks.filter((t: any) => (t.assignees || []).some((a: any) => (a.emp_id ?? a.employee_id) === empId));
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
    await this.access.assertManager(id, user.emp_id);
    // Assigned To lists only the employees of the project (BFD 2.7).
    const members = await this.access.memberIds(id);
    const chosen = [...(dto.assignee_ids || []), ...(dto.sub_tasks || []).flatMap((x) => x.assignee_ids || [])];
    if (chosen.some((empId) => !members.includes(Number(empId)))) {
      throw new BadRequestException('Tasks can be assigned only to employees of this project.');
    }
    if (dto.sprint_id) {
      const sprints = await this.getProjectSprintsUseCase.execute(id);
      if (!sprints.some((x: any) => x.sprint_id === dto.sprint_id)) {
        throw new BadRequestException('Please select a Sprint of this project.');
      }
    }
    let task: any;
    try {
      // Same rules as Create Task in the Task Module, as a Project Task.
      task = await this.createTaskUseCase.execute({
        ...dto,
        source: 'project',
        project_id: id,
        sprint_id: dto.sprint_id ?? null,
        creator_emp_id: user.emp_id,
      });
    } catch (err) {
      throw mapTaskErrorToHttp(err);
    }
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
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertMember(id, req.user!.emp_id);
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
    await this.access.assertMember(id, user.emp_id);
    const msg = await this.projectRepo.createDiscussion(
      id,
      user.emp_id,
      dto.message,
      dto.attachments,
    );
    this.eventsService.emitToProject(id, 'discussion:new_message', msg);

    // If employees are tagged in this discussion message, notify ONLY the tagged employees
    if (dto.tagged_employee_ids && dto.tagged_employee_ids.length > 0) {
      try {
        const project = await this.projectRepo.getProjectById(id, user.emp_id, true);
        const projectName = project?.project_name || `Project #${id}`;
        const senderName = user.name || 'Team member';

        const uniqueTaggedIds = Array.from(
          new Set(dto.tagged_employee_ids.map(Number))
        ).filter((empId) => empId !== user.emp_id);

        for (const taggedEmpId of uniqueTaggedIds) {
          await this.createNotificationUseCase.execute({
            recipient_id: taggedEmpId,
            kind: 'project_discussion_mention',
            title: `Tagged in ${projectName}`,
            body: `${senderName} tagged you in discussion: "${dto.message.slice(0, 100)}"`,
            entity_type: 'project',
            entity_id: id,
            created_by: user.emp_id,
          });
        }
      } catch (err) {
        console.error('Failed to dispatch discussion tag notifications:', err);
      }
    }
    return msg;
  }

  @Get(':id/activity-logs')
  @ApiOperation({ summary: 'Get activity logs for a project' })
  async getProjectActivityLogs(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertMember(id, req.user!.emp_id);
    return this.projectRepo.getActivityLogs(id);
  }

  @Get(':id/bugs')
  @ApiOperation({ summary: 'Get bugs for a project' })
  async getProjectBugs(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.access.assertMember(id, req.user!.emp_id);
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
    await this.access.assertMember(id, user.emp_id);
    if (!(await this.access.memberIds(id)).includes(Number(dto.assigned_to))) {
      throw new BadRequestException('A bug can be assigned only to an employee of this project.');
    }
    if (dto.bug_type === 'other' && !dto.other_bug_type?.trim()) {
      throw new BadRequestException('Please enter the Other Bug Type.');
    }
    const bug = await this.projectRepo.createBug(
      id,
      user.emp_id,
      {
        task_id: dto.task_id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        steps_to_reproduce: dto.steps_to_reproduce.trim(),
        expected_result: dto.expected_result.trim(),
        actual_result: dto.actual_result.trim(),
        assigned_to: dto.assigned_to,
        priority: dto.priority || 'low',
        status: 'new',
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
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('bugId', ParseIntPipe) bugId: number,
  ) {
    await this.access.assertMember(id, req.user!.emp_id);
    await this.assertBugInProject(id, bugId);
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
    await this.access.assertMember(id, user.emp_id);
    const current = await this.assertBugInProject(id, bugId);
    const allowed = BUG_FLOW[current] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        allowed.length
          ? `A bug in "${current.replace(/_/g, ' ')}" can move only to: ${allowed.map((x) => x.replace(/_/g, ' ')).join(', ')}.`
          : 'This bug is closed and its status cannot be changed.',
      );
    }
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
    await this.access.assertMember(id, user.emp_id);
    await this.assertBugInProject(id, bugId);
    const comment = await this.projectRepo.addBugComment(bugId, user.emp_id, dto.comment);
    this.eventsService.emitToProject(id, 'bug:comment_added', { bugId, comment });
    return comment;
  }

  /** BFD 2.7: sprint dates must be within the project dates. */
  private assertSprintDates(project: { start_date: Date; deadline: Date }, start?: string, end?: string) {
    if (!start || !end) throw new BadRequestException('Please select the Start Date and End Date.');
    const ps = project.start_date.toISOString().slice(0, 10);
    const pe = project.deadline.toISOString().slice(0, 10);
    if (start > end) throw new BadRequestException('End Date cannot be earlier than the Start Date.');
    if (start < ps || end > pe) {
      throw new BadRequestException(`Sprint dates must be within the project dates (${ps} to ${pe}).`);
    }
  }

  private async assertBugInProject(projectId: number, bugId: number): Promise<string> {
    const status = await this.access.bugStatusInProject(projectId, bugId);
    if (!status) throw new NotFoundException('Bug not found in this project.');
    return status;
  }
}
