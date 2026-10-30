import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  AssignableEmployee,
  CreateProjectInput,
  CreateProjectTaskInput,
  CreateSprintInput,
  ProjectRepositoryPort,
  ProjectsFilter,
  UpdateProjectInput,
  UpdateSprintInput,
} from '../../domain/ports/project.repository.port';
import {
  ProjectCategory,
  ProjectEntity,
  ProjectMemberEntity,
  ProjectStatus,
  ProjectType,
  ProjectTaskEntity,
  SprintEntity,
  SprintStatus,
} from '../../domain/entities/project.entity';

@Injectable()
export class PrismaProjectRepository implements ProjectRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private getProjectPrefix(type: string): string {
    switch (type) {
      case 'client':
        return 'VM-CL';
      case 'internal':
        return 'VM-IN';
      case 'product':
        return 'VM-PR';
      case 'maintenance':
        return 'VM-MN';
      default: {
        const clean = type.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3) || 'PR';
        return `VM-${clean}`;
      }
    }
  }

  private mapProject(p: any, requestingEmpId?: number, isAdmin?: boolean): ProjectEntity {
    const pm = p.employees_projects_project_manager_idToemployees;
    const members: ProjectMemberEntity[] = (p.project_members || []).map((m: any) => {
      const emp = m.employees_project_members_employee_idToemployees;
      return {
        member_id: m.member_id,
        project_id: m.project_id,
        employee_id: m.employee_id,
        name: emp?.name ?? 'Unknown',
        email: emp?.email ?? '',
        profile_picture: emp?.profile_picture ?? null,
        role_in_project: m.role_in_project,
      };
    });

    const isManagerOrAdmin = isAdmin || (requestingEmpId !== undefined && p.project_manager_id === requestingEmpId);

    // Filter tasks if included or count
    const totalTasks = p._count?.tasks ?? (p.tasks ? p.tasks.length : 0);
    const completedTasks = p.tasks
      ? p.tasks.filter((t: any) => t.stage === 'completed').length
      : 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalEstimatedMinutes = p.tasks
      ? p.tasks.reduce((acc: number, t: any) => acc + (t.allocated_minutes || 0), 0)
      : 0;
    const actualWorkMinutes = p.tasks
      ? p.tasks.reduce((acc: number, t: any) => acc + (t.actual_minutes || 0), 0)
      : 0;

    const dep = p.project_deployments;
    const deployment = isManagerOrAdmin && dep
      ? {
          deployment_id: dep.deployment_id,
          project_id: dep.project_id,
          vercel_account: dep.vercel_account,
          vercel_link: dep.vercel_link,
          domain_link: dep.domain_link,
          storage_account: dep.storage_account,
          deployment_date: dep.deployment_date ? dep.deployment_date.toISOString().slice(0, 10) : null,
          go_live_date: dep.go_live_date ? dep.go_live_date.toISOString().slice(0, 10) : null,
          deployment_done_by: dep.deployment_done_by,
          deployment_done_by_name: dep.employees_project_deployments_deployment_done_byToemployees?.name ?? null,
          admin_login_link: dep.admin_login_link,
        }
      : null;

    const credentials = isManagerOrAdmin && p.project_credentials
      ? p.project_credentials.map((c: any) => ({
          credential_id: c.credential_id,
          project_id: c.project_id,
          admin_label: c.admin_label,
          admin_id: c.admin_id,
          admin_password_encrypted: c.admin_password_encrypted,
        }))
      : [];

    return {
      project_id: p.project_id,
      project_no: p.project_no,
      project_name: p.project_name,
      project_type: p.project_type as ProjectType,
      category: p.category as ProjectCategory,
      other_category: p.other_category,
      project_status: p.project_status as ProjectStatus,
      start_date: p.start_date.toISOString().slice(0, 10),
      deadline: p.deadline.toISOString().slice(0, 10),
      actual_end_date: p.actual_end_date ? p.actual_end_date.toISOString().slice(0, 10) : null,
      project_manager_id: p.project_manager_id,
      project_manager_name: pm?.name ?? 'Unknown',
      project_manager_email: pm?.email ?? '',
      project_manager_avatar: pm?.profile_picture ?? null,
      status_change_reason: p.status_change_reason,
      client_name: isManagerOrAdmin ? p.client_name : null,
      lead_received_date: isManagerOrAdmin && p.lead_received_date ? p.lead_received_date.toISOString().slice(0, 10) : null,
      project_approved_date: isManagerOrAdmin && p.project_approved_date ? p.project_approved_date.toISOString().slice(0, 10) : null,
      tech_frontend: p.tech_frontend,
      tech_backend: p.tech_backend,
      tech_cloud: p.tech_cloud,
      members,
      deployment,
      credentials,
      total_tasks_count: totalTasks,
      completed_tasks_count: completedTasks,
      progress_percentage: progress,
      total_estimated_minutes: totalEstimatedMinutes,
      actual_work_minutes: actualWorkMinutes,
      created_at: p.created_at.toISOString(),
      created_by: p.created_by,
    };
  }

  async createProject(input: CreateProjectInput): Promise<ProjectEntity> {
    const prefix = this.getProjectPrefix(input.project_type);

    return this.prisma.$transaction(async (tx) => {
      // 1. Increment project counter
      const counterRows: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO entity_counters (entity_type, counter_key, last_number)
         VALUES ('PROJECT', $1, 1)
         ON CONFLICT (entity_type, counter_key)
         DO UPDATE SET last_number = entity_counters.last_number + 1
         RETURNING last_number;`,
        input.project_type,
      );
      const counter = { last_number: counterRows[0]?.last_number ?? 1 };

      const projectNo = `${prefix}${String(counter.last_number).padStart(3, '0')}`;

      // 2. Create project record
      const project = await tx.projects.create({
        data: {
          project_no: projectNo,
          project_name: input.project_name.trim(),
          project_type: input.project_type as any,
          category: input.category as any,
          other_category: input.other_category?.trim() || null,
          project_status: (input.project_status || 'new') as any,
          start_date: new Date(input.start_date),
          deadline: new Date(input.deadline),
          project_manager_id: input.project_manager_id,
          client_name: input.client_name?.trim() || null,
          lead_received_date: input.lead_received_date ? new Date(input.lead_received_date) : null,
          project_approved_date: input.project_approved_date ? new Date(input.project_approved_date) : null,
          tech_frontend: input.tech_frontend?.trim() || null,
          tech_backend: input.tech_backend?.trim() || null,
          tech_cloud: input.tech_cloud?.trim() || null,
          created_by: input.created_by,
        },
      });

      // 3. Add members (ensure project manager is also included in members if not already)
      const allMemberIds = Array.from(new Set([...input.member_ids, input.project_manager_id]));
      await tx.project_members.createMany({
        data: allMemberIds.map((empId) => ({
          project_id: project.project_id,
          employee_id: empId,
          role_in_project: empId === input.project_manager_id ? 'manager' : 'member',
          created_by: input.created_by,
        })),
      });

      // 4. Create deployment details if provided
      if (input.deployment) {
        await tx.project_deployments.create({
          data: {
            project_id: project.project_id,
            vercel_account: input.deployment.vercel_account?.trim() || null,
            vercel_link: input.deployment.vercel_link?.trim() || null,
            domain_link: input.deployment.domain_link?.trim() || null,
            storage_account: input.deployment.storage_account?.trim() || null,
            deployment_date: input.deployment.deployment_date ? new Date(input.deployment.deployment_date) : null,
            go_live_date: input.deployment.go_live_date ? new Date(input.deployment.go_live_date) : null,
            deployment_done_by: input.deployment.deployment_done_by || null,
            admin_login_link: input.deployment.admin_login_link?.trim() || null,
            created_by: input.created_by,
          },
        });
      }

      // 5. Create admin credentials if provided
      if (input.credentials && input.credentials.length > 0) {
        await tx.project_credentials.createMany({
          data: input.credentials.map((c) => ({
            project_id: project.project_id,
            admin_label: c.admin_label?.trim() || 'Admin',
            admin_id: c.admin_id.trim(),
            admin_password_encrypted: c.admin_password, // in real app encrypt, here plain/masked
            created_by: input.created_by,
          })),
        });
      }

      // 6. Log activity
      await tx.activity_logs.create({
        data: {
          entity_type: 'PROJECT',
          entity_id: project.project_id,
          event: 'project_created',
          summary: `Project "${project.project_name}" (${projectNo}) was created.`,
          performed_by: input.created_by,
        },
      });

      // Fetch complete record
      const full = await tx.projects.findUnique({
        where: { project_id: project.project_id },
        include: {
          employees_projects_project_manager_idToemployees: {
            select: { emp_id: true, name: true, email: true, profile_picture: true },
          },
          project_members: {
            where: { deleted_at: null },
            include: {
              employees_project_members_employee_idToemployees: {
                select: { emp_id: true, name: true, email: true, profile_picture: true },
              },
            },
          },
          project_deployments: true,
          project_credentials: { where: { deleted_at: null } },
          tasks: { where: { deleted_at: null }, select: { task_id: true, stage: true } },
        },
      });

      return this.mapProject(full, input.created_by, true);
    });
  }

  async getProjects(filter: ProjectsFilter): Promise<ProjectEntity[]> {
    const where: any = {
      deleted_at: null,
    };

    const andConditions: any[] = [];

    if (filter.status && filter.status !== 'all') {
      where.project_status = filter.status;
    }

    if (filter.project_type && filter.project_type !== 'all') {
      where.project_type = filter.project_type;
    }

    if (filter.project_manager_id) {
      where.project_manager_id = filter.project_manager_id;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      andConditions.push({
        OR: [
          { project_name: { contains: q, mode: 'insensitive' } },
          { project_no: { contains: q, mode: 'insensitive' } },
          { client_name: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (filter.start_date && filter.end_date) {
      where.start_date = { gte: new Date(filter.start_date) };
      where.deadline = { lte: new Date(filter.end_date) };
    }

    // Role-based visibility
    if (!filter.is_admin && filter.employee_id) {
      andConditions.push({
        OR: [
          { project_manager_id: filter.employee_id },
          {
            project_members: {
              some: {
                employee_id: filter.employee_id,
                deleted_at: null,
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const rows = await this.prisma.projects.findMany({
      where,
      include: {
        employees_projects_project_manager_idToemployees: {
          select: { emp_id: true, name: true, email: true, profile_picture: true },
        },
        project_members: {
          where: { deleted_at: null },
          include: {
            employees_project_members_employee_idToemployees: {
              select: { emp_id: true, name: true, email: true, profile_picture: true },
            },
          },
        },
        project_deployments: {
          include: {
            employees_project_deployments_deployment_done_byToemployees: {
              select: { emp_id: true, name: true },
            },
          },
        },
        project_credentials: { where: { deleted_at: null } },
        tasks: { where: { deleted_at: null }, select: { task_id: true, stage: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((r) => this.mapProject(r, filter.employee_id, filter.is_admin));
  }

  async getProjectById(
    projectId: number,
    requestingEmpId: number,
    isAdmin: boolean,
  ): Promise<ProjectEntity | null> {
    const project = await this.prisma.projects.findFirst({
      where: { project_id: projectId, deleted_at: null },
      include: {
        employees_projects_project_manager_idToemployees: {
          select: { emp_id: true, name: true, email: true, profile_picture: true },
        },
        project_members: {
          where: { deleted_at: null },
          include: {
            employees_project_members_employee_idToemployees: {
              select: { emp_id: true, name: true, email: true, profile_picture: true },
            },
          },
        },
        project_deployments: {
          include: {
            employees_project_deployments_deployment_done_byToemployees: {
              select: { emp_id: true, name: true },
            },
          },
        },
        project_credentials: { where: { deleted_at: null } },
        tasks: {
          where: { deleted_at: null },
          select: { task_id: true, stage: true, allocated_minutes: true, actual_minutes: true },
        },
      },
    });

    if (!project) return null;

    // Check permission
    const isMember = project.project_members.some((m) => m.employee_id === requestingEmpId);
    const isPM = project.project_manager_id === requestingEmpId;
    if (!isAdmin && !isPM && !isMember) {
      throw new Error('Access denied to this project');
    }

    return this.mapProject(project, requestingEmpId, isAdmin);
  }

  async updateProjectStatus(
    projectId: number,
    status: ProjectStatus,
    reason: string | undefined,
    actorId: number,
  ): Promise<ProjectEntity> {
    const existing = await this.prisma.projects.findUnique({
      where: { project_id: projectId },
    });
    if (!existing || existing.deleted_at) {
      throw new Error('Project not found');
    }

    const data: any = {
      project_status: status as any,
      status_change_reason: reason?.trim() || null,
      updated_by: actorId,
      updated_at: new Date(),
    };

    if (status === 'delivered') {
      data.actual_end_date = new Date();
    }

    const updated = await this.prisma.projects.update({
      where: { project_id: projectId },
      data,
      include: {
        employees_projects_project_manager_idToemployees: {
          select: { emp_id: true, name: true, email: true, profile_picture: true },
        },
        project_members: {
          where: { deleted_at: null },
          include: {
            employees_project_members_employee_idToemployees: {
              select: { emp_id: true, name: true, email: true, profile_picture: true },
            },
          },
        },
        project_deployments: true,
        project_credentials: { where: { deleted_at: null } },
        tasks: { where: { deleted_at: null }, select: { task_id: true, stage: true } },
      },
    });

    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'PROJECT',
        entity_id: projectId,
        event: 'status_changed',
        summary: `Status changed from ${existing.project_status} to ${status}${reason ? `. Reason: ${reason}` : ''}`,
        performed_by: actorId,
      },
    });

    return this.mapProject(updated, actorId, true);
  }

  async getAssignableEmployees(): Promise<AssignableEmployee[]> {
    const rows = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
      },
      select: {
        emp_id: true,
        name: true,
        email: true,
        profile_picture: true,
        roles_employees_role_idToroles: {
          select: { role_name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((r) => ({
      emp_id: r.emp_id,
      name: r.name,
      email: r.email,
      profile_picture: r.profile_picture,
      role_name: r.roles_employees_role_idToroles?.role_name ?? null,
    }));
  }

  async createSprint(input: CreateSprintInput): Promise<SprintEntity> {
    const project = await this.prisma.projects.findUnique({
      where: { project_id: input.project_id },
    });
    if (!project || project.deleted_at) {
      throw new Error('Project not found');
    }

    const sprint = await this.prisma.project_sprints.create({
      data: {
        project_id: input.project_id,
        sprint_name: input.sprint_name.trim(),
        start_date: new Date(input.start_date),
        end_date: new Date(input.end_date),
        sprint_goal: input.sprint_goal?.trim() || null,
        status: (input.status || 'planned') as any,
        created_by: input.created_by,
      },
    });

    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'PROJECT',
        entity_id: input.project_id,
        event: 'sprint_created',
        summary: `Sprint "${sprint.sprint_name}" was created.`,
        performed_by: input.created_by,
      },
    });

    return {
      sprint_id: sprint.sprint_id,
      project_id: sprint.project_id,
      sprint_name: sprint.sprint_name,
      start_date: sprint.start_date.toISOString().slice(0, 10),
      end_date: sprint.end_date.toISOString().slice(0, 10),
      sprint_goal: sprint.sprint_goal,
      status: sprint.status as SprintStatus,
      total_tasks_count: 0,
      completed_tasks_count: 0,
      created_at: sprint.created_at.toISOString(),
      created_by: sprint.created_by,
    };
  }

  async getSprints(projectId: number): Promise<SprintEntity[]> {
    const rows = await this.prisma.project_sprints.findMany({
      where: { project_id: projectId, deleted_at: null },
      include: {
        tasks: {
          where: { deleted_at: null },
          select: { task_id: true, stage: true },
        },
      },
      orderBy: { start_date: 'asc' },
    });

    return rows.map((s) => ({
      sprint_id: s.sprint_id,
      project_id: s.project_id,
      sprint_name: s.sprint_name,
      start_date: s.start_date.toISOString().slice(0, 10),
      end_date: s.end_date.toISOString().slice(0, 10),
      sprint_goal: s.sprint_goal,
      status: s.status as SprintStatus,
      total_tasks_count: s.tasks.length,
      completed_tasks_count: s.tasks.filter((t) => t.stage === 'completed').length,
      created_at: s.created_at.toISOString(),
      created_by: s.created_by,
    }));
  }

  async updateSprint(sprintId: number, input: UpdateSprintInput): Promise<SprintEntity> {
    const data: any = {
      updated_by: input.updated_by,
      updated_at: new Date(),
    };
    if (input.sprint_name) data.sprint_name = input.sprint_name.trim();
    if (input.start_date) data.start_date = new Date(input.start_date);
    if (input.end_date) data.end_date = new Date(input.end_date);
    if (input.sprint_goal !== undefined) data.sprint_goal = input.sprint_goal?.trim() || null;
    if (input.status) data.status = input.status as any;

    const updated = await this.prisma.project_sprints.update({
      where: { sprint_id: sprintId },
      data,
      include: {
        tasks: {
          where: { deleted_at: null },
          select: { task_id: true, stage: true },
        },
      },
    });

    return {
      sprint_id: updated.sprint_id,
      project_id: updated.project_id,
      sprint_name: updated.sprint_name,
      start_date: updated.start_date.toISOString().slice(0, 10),
      end_date: updated.end_date.toISOString().slice(0, 10),
      sprint_goal: updated.sprint_goal,
      status: updated.status as SprintStatus,
      total_tasks_count: updated.tasks.length,
      completed_tasks_count: updated.tasks.filter((t) => t.stage === 'completed').length,
      created_at: updated.created_at.toISOString(),
      created_by: updated.created_by,
    };
  }

  async createProjectTask(input: CreateProjectTaskInput): Promise<ProjectTaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.projects.findUnique({
        where: { project_id: input.project_id },
      });
      if (!project || project.deleted_at) {
        throw new Error('Project not found');
      }

      // Generate task code using task_counters
      const year = new Date().getFullYear();
      const counterRows: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO entity_counters (entity_type, counter_key, last_number)
         VALUES ('TASK', $1, 1)
         ON CONFLICT (entity_type, counter_key)
         DO UPDATE SET last_number = entity_counters.last_number + 1
         RETURNING last_number;`,
        String(year),
      );
      const seq = counterRows[0]?.last_number ?? 1;
      const taskCode = `TSK-${year}-${seq.toString().padStart(4, '0')}`;

      const created = await tx.tasks.create({
        data: {
          task_code: taskCode,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          priority: (input.priority || 'medium') as any,
          project_id: input.project_id,
          sprint_id: input.sprint_id || null,
          due_date: input.due_date ? new Date(input.due_date) : null,
          allocated_minutes: input.allocated_minutes || null,
          created_by: input.created_by,
          source: 'project',
          stage: 'assigned',
        },
        include: {
          project_sprints: true,
        },
      });

      // Assignees
      if (input.assignee_ids && input.assignee_ids.length > 0) {
        await tx.task_assignees.createMany({
          data: Array.from(new Set(input.assignee_ids)).map((empId) => ({
            task_id: created.task_id,
            employee_id: empId,
            created_by: input.created_by,
          })),
        });
      }

      // Task history
      await tx.activity_logs.create({
        data: {
          entity_type: 'TASK',
          entity_id: created.task_id,
          event: 'created',
          summary: `Project task created for ${project.project_name}`,
          details: { to_stage: 'assigned' },
          performed_by: input.created_by,
        },
      });

      // Project activity log
      await tx.activity_logs.create({
        data: {
          entity_type: 'PROJECT',
          entity_id: input.project_id,
          event: 'task_created',
          summary: `Task "${created.title}" (${taskCode}) was added to project.`,
          performed_by: input.created_by,
        },
      });

      // Fetch full assignees
      const assignees = await tx.task_assignees.findMany({
        where: { task_id: created.task_id, deleted_at: null },
        include: {
          employees_task_assignees_employee_idToemployees: {
            select: { emp_id: true, name: true, email: true, profile_picture: true },
          },
        },
      });

      return {
        task_id: created.task_id,
        task_code: created.task_code,
        project_id: created.project_id!,
        sprint_id: created.sprint_id,
        sprint_name: created.project_sprints?.sprint_name ?? null,
        title: created.title,
        description: created.description,
        priority: created.priority,
        stage: created.stage,
        status: created.stage,
        progress_percentage: created.stage === 'completed' ? 100 : created.stage === 'in_progress' ? 50 : 0,
        due_date: created.due_date ? created.due_date.toISOString().slice(0, 10) : null,
        allocated_minutes: created.allocated_minutes,
        assignees: assignees.map((a) => {
          const emp = a.employees_task_assignees_employee_idToemployees;
          return {
            emp_id: emp.emp_id,
            name: emp.name,
            email: emp.email,
            profile_picture: emp.profile_picture,
          };
        }),
        created_at: created.created_at.toISOString(),
      };
    });
  }

  async getSprintTasks(projectId: number, sprintId?: number): Promise<ProjectTaskEntity[]> {
    const where: any = {
      project_id: projectId,
      deleted_at: null,
    };
    if (sprintId) {
      where.sprint_id = sprintId;
    }

    const rows = await this.prisma.tasks.findMany({
      where,
      include: {
        project_sprints: true,
        task_assignees: {
          where: { deleted_at: null },
          include: {
            employees_task_assignees_employee_idToemployees: {
              select: { emp_id: true, name: true, email: true, profile_picture: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((t) => ({
      task_id: t.task_id,
      task_code: t.task_code,
      project_id: t.project_id!,
      sprint_id: t.sprint_id,
      sprint_name: t.project_sprints?.sprint_name ?? null,
      title: t.title,
      description: t.description,
      priority: t.priority,
      stage: t.stage,
      status: t.stage,
      progress_percentage: t.stage === 'completed' ? 100 : t.stage === 'in_progress' ? 50 : 0,
      due_date: t.due_date ? t.due_date.toISOString().slice(0, 10) : null,
      allocated_minutes: t.allocated_minutes,
      assignees: t.task_assignees.map((a) => {
        const emp = a.employees_task_assignees_employee_idToemployees;
        return {
          emp_id: emp.emp_id,
          name: emp.name,
          email: emp.email,
          profile_picture: emp.profile_picture,
        };
      }),
      created_at: t.created_at.toISOString(),
    }));
  }

  async updateProject(
    projectId: number,
    input: UpdateProjectInput,
    actorEmpId: number,
  ): Promise<ProjectEntity> {
    const existing = await this.prisma.projects.findUnique({
      where: { project_id: projectId },
    });
    if (!existing || existing.deleted_at) {
      throw new Error(`Project #${projectId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (input.project_name !== undefined) dataToUpdate.project_name = input.project_name.trim();
      if (input.project_type !== undefined) dataToUpdate.project_type = input.project_type as any;
      if (input.category !== undefined) dataToUpdate.category = input.category as any;
      if (input.other_category !== undefined) dataToUpdate.other_category = input.other_category?.trim() || null;
      if (input.project_status !== undefined) dataToUpdate.project_status = input.project_status as any;
      if (input.start_date !== undefined) dataToUpdate.start_date = new Date(input.start_date);
      if (input.deadline !== undefined) dataToUpdate.deadline = new Date(input.deadline);
      if (input.project_manager_id !== undefined) dataToUpdate.project_manager_id = input.project_manager_id;
      if (input.client_name !== undefined) dataToUpdate.client_name = input.client_name?.trim() || null;
      if (input.lead_received_date !== undefined) {
        dataToUpdate.lead_received_date = input.lead_received_date ? new Date(input.lead_received_date) : null;
      }
      if (input.project_approved_date !== undefined) {
        dataToUpdate.project_approved_date = input.project_approved_date ? new Date(input.project_approved_date) : null;
      }
      if (input.tech_frontend !== undefined) dataToUpdate.tech_frontend = input.tech_frontend?.trim() || null;
      if (input.tech_backend !== undefined) dataToUpdate.tech_backend = input.tech_backend?.trim() || null;
      if (input.tech_cloud !== undefined) dataToUpdate.tech_cloud = input.tech_cloud?.trim() || null;

      if (Object.keys(dataToUpdate).length > 0) {
        await tx.projects.update({
          where: { project_id: projectId },
          data: dataToUpdate,
        });
      }

      // Update members if member_ids provided
      if (input.member_ids !== undefined) {
        const pmId = input.project_manager_id ?? existing.project_manager_id;
        const allMemberIds = Array.from(new Set([...input.member_ids, pmId]));
        await tx.project_members.deleteMany({
          where: { project_id: projectId },
        });
        await tx.project_members.createMany({
          data: allMemberIds.map((empId) => ({
            project_id: projectId,
            employee_id: empId,
            role_in_project: empId === pmId ? 'manager' : 'member',
            created_by: actorEmpId,
          })),
        });
      }

      // Update deployment if provided
      if (input.deployment !== undefined) {
        const depData: any = {
          vercel_account: input.deployment.vercel_account?.trim() || null,
          vercel_link: input.deployment.vercel_link?.trim() || null,
          domain_link: input.deployment.domain_link?.trim() || null,
          storage_account: input.deployment.storage_account?.trim() || null,
          deployment_date: input.deployment.deployment_date ? new Date(input.deployment.deployment_date) : null,
          go_live_date: input.deployment.go_live_date ? new Date(input.deployment.go_live_date) : null,
          deployment_done_by: input.deployment.deployment_done_by || null,
          admin_login_link: input.deployment.admin_login_link?.trim() || null,
        };
        const existingDep = await tx.project_deployments.findFirst({
          where: { project_id: projectId },
        });
        if (existingDep) {
          await tx.project_deployments.update({
            where: { deployment_id: existingDep.deployment_id },
            data: depData,
          });
        } else {
          await tx.project_deployments.create({
            data: {
              project_id: projectId,
              ...depData,
              created_by: actorEmpId,
            },
          });
        }
      }

      // Update credentials if provided
      if (input.credentials !== undefined) {
        await tx.project_credentials.deleteMany({
          where: { project_id: projectId },
        });
        if (input.credentials.length > 0) {
          await tx.project_credentials.createMany({
            data: input.credentials.map((c) => ({
              project_id: projectId,
              admin_label: c.admin_label?.trim() || 'Admin',
              admin_id: c.admin_id.trim(),
              admin_password_encrypted: c.admin_password,
              created_by: actorEmpId,
            })),
          });
        }
      }

      // Log activity
      await tx.activity_logs.create({
        data: {
          entity_type: 'PROJECT',
          entity_id: projectId,
          event: 'project_updated',
          summary: `Project details were updated.`,
          performed_by: actorEmpId,
        },
      });

      const updated = await tx.projects.findUnique({
        where: { project_id: projectId },
        include: {
          employees_projects_project_manager_idToemployees: {
            select: { emp_id: true, name: true, email: true, profile_picture: true },
          },
          project_members: {
            include: {
              employees_project_members_employee_idToemployees: {
                select: { emp_id: true, name: true, email: true, profile_picture: true },
              },
            },
          },
          project_deployments: {
            include: {
              employees_project_deployments_deployment_done_byToemployees: {
                select: { emp_id: true, name: true },
              },
            },
          },
          project_credentials: true,
          tasks: {
            select: { task_id: true, stage: true, allocated_minutes: true, actual_minutes: true },
          },
        },
      });

      return this.mapProject(updated, actorEmpId, true);
    });
  }

  async getDiscussions(projectId: number): Promise<any[]> {
    const rows = await this.prisma.project_discussions.findMany({
      where: { project_id: projectId, deleted_at: null },
      include: {
        employees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return rows.map((r) => ({
      message_id: r.message_id.toString(),
      project_id: r.project_id,
      sender_emp_id: r.sender_emp_id,
      sender_name: r.employees?.name ?? 'Unknown',
      sender_avatar: r.employees?.profile_picture ?? null,
      message: r.message,
      created_at: r.created_at.toISOString(),
    }));
  }

  async createDiscussion(
    projectId: number,
    senderEmpId: number,
    message: string,
    attachments?: any,
  ): Promise<any> {
    const created = await this.prisma.project_discussions.create({
      data: {
        project_id: projectId,
        sender_emp_id: senderEmpId,
        message: message.trim(),
        attachments: attachments ?? [],
      },
      include: {
        employees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
      },
    });

    return {
      message_id: created.message_id.toString(),
      project_id: created.project_id,
      sender_emp_id: created.sender_emp_id,
      sender_name: created.employees?.name ?? 'Unknown',
      sender_avatar: created.employees?.profile_picture ?? null,
      message: created.message,
      created_at: created.created_at.toISOString(),
    };
  }

  async getActivityLogs(projectId: number): Promise<any[]> {
    const rows = await this.prisma.activity_logs.findMany({
      where: { entity_type: 'PROJECT', entity_id: projectId },
      include: {
        employees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
      },
      orderBy: { performed_at: 'desc' },
      take: 100,
    });

    return rows.map((r: any) => ({
      log_id: r.log_id.toString(),
      project_id: r.entity_id,
      actor_emp_id: r.performed_by,
      actor_name: r.employees?.name ?? 'System',
      actor_avatar: r.employees?.profile_picture ?? null,
      action_type: r.event,
      description: r.summary,
      metadata: r.details,
      created_at: r.performed_at.toISOString(),
    }));
  }

  async getBugs(projectId: number): Promise<any[]> {
    const rows = await this.prisma.project_bugs.findMany({
      where: { project_id: projectId, deleted_at: null },
      include: {
        employees_project_bugs_assigned_toToemployees: {
          select: { emp_id: true, name: true },
        },
        employees_project_bugs_reported_byToemployees: {
          select: { emp_id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((b) => ({
      bug_id: b.bug_id,
      bug_code: b.bug_code,
      project_id: b.project_id,
      task_id: b.task_id,
      title: b.title,
      description: b.description,
      steps_to_reproduce: b.steps_to_reproduce,
      expected_result: b.expected_result,
      actual_result: b.actual_result,
      assigned_to: b.assigned_to,
      assigned_to_name: b.employees_project_bugs_assigned_toToemployees?.name ?? 'Unassigned',
      reported_by: b.reported_by,
      reported_by_name: b.employees_project_bugs_reported_byToemployees?.name ?? 'Unknown',
      priority: b.priority,
      status: b.status,
      bug_type: b.bug_type,
      other_bug_type: b.other_bug_type,
      attachment_url: b.attachment_url,
      dev_started_at: b.dev_started_at?.toISOString() ?? null,
      dev_ended_at: b.dev_ended_at?.toISOString() ?? null,
      qa_started_at: b.qa_started_at?.toISOString() ?? null,
      qa_ended_at: b.qa_ended_at?.toISOString() ?? null,
      total_time_minutes: b.total_time_minutes,
      created_at: b.created_at.toISOString(),
    }));
  }

  async getBugDetail(bugId: number): Promise<any> {
    const bug = await this.prisma.project_bugs.findUnique({
      where: { bug_id: bugId },
      include: {
        employees_project_bugs_assigned_toToemployees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
        employees_project_bugs_reported_byToemployees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
        bug_comments: {
          where: { deleted_at: null },
          include: {
            employees: {
              select: { emp_id: true, name: true, profile_picture: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        
      },
    });

    if (!bug || bug.deleted_at) {
      throw new Error('Bug not found');
    }

    return {
      bug_id: bug.bug_id,
      bug_code: bug.bug_code,
      project_id: bug.project_id,
      task_id: bug.task_id,
      title: bug.title,
      description: bug.description,
      steps_to_reproduce: bug.steps_to_reproduce,
      expected_result: bug.expected_result,
      actual_result: bug.actual_result,
      assigned_to: bug.assigned_to,
      assigned_to_name: bug.employees_project_bugs_assigned_toToemployees?.name ?? 'Unassigned',
      assigned_to_avatar: bug.employees_project_bugs_assigned_toToemployees?.profile_picture ?? null,
      reported_by: bug.reported_by,
      reported_by_name: bug.employees_project_bugs_reported_byToemployees?.name ?? 'Unknown',
      reported_by_avatar: bug.employees_project_bugs_reported_byToemployees?.profile_picture ?? null,
      priority: bug.priority,
      status: bug.status,
      bug_type: bug.bug_type,
      other_bug_type: bug.other_bug_type,
      attachment_url: bug.attachment_url,
      dev_started_at: bug.dev_started_at?.toISOString() ?? null,
      dev_ended_at: bug.dev_ended_at?.toISOString() ?? null,
      qa_started_at: bug.qa_started_at?.toISOString() ?? null,
      qa_ended_at: bug.qa_ended_at?.toISOString() ?? null,
      total_time_minutes: bug.total_time_minutes,
      created_at: bug.created_at.toISOString(),
      comments: bug.bug_comments.map((c) => ({
        comment_id: c.comment_id,
        bug_id: c.bug_id,
        emp_id: c.emp_id,
        author_name: c.employees?.name ?? 'User',
        author_avatar: c.employees?.profile_picture ?? null,
        comment: c.comment,
        created_at: c.created_at.toISOString(),
      })),
      history: await (async () => {
        const historyRows = await this.prisma.activity_logs.findMany({
          where: { entity_type: 'BUG', entity_id: bugId },
          include: { employees: { select: { emp_id: true, name: true } } },
          orderBy: { performed_at: 'desc' },
        });
        return historyRows.map((h: any) => {
          const details = (h.details as any) || {};
          return {
            history_id: h.log_id.toString(),
            bug_id: h.entity_id,
            actor_emp_id: h.performed_by,
            actor_name: h.employees?.name ?? 'User',
            from_status: details.from_status ?? null,
            to_status: details.to_status ?? h.event,
            note: details.note ?? h.summary,
            created_at: h.performed_at.toISOString(),
          };
        });
      })(),
    };
  }

  async createBug(
    projectId: number,
    reporterEmpId: number,
    input: any,
  ): Promise<any> {
    const year = new Date().getFullYear();
    const counterRows: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO entity_counters (entity_type, counter_key, last_number)
       VALUES ('BUG', $1, 1)
       ON CONFLICT (entity_type, counter_key)
       DO UPDATE SET last_number = entity_counters.last_number + 1
       RETURNING last_number;`,
      String(year),
    );
    const seq = counterRows[0]?.last_number ?? 1;
    const bugCode = `BUG-${year}-${seq.toString().padStart(3, '0')}`;

    const created = await this.prisma.project_bugs.create({
      data: {
        bug_code: bugCode,
        project_id: projectId,
        task_id: input.task_id || null,
        title: input.title.trim(),
        description: input.description.trim(),
        steps_to_reproduce: input.steps_to_reproduce.trim(),
        expected_result: input.expected_result.trim(),
        actual_result: input.actual_result.trim(),
        assigned_to: input.assigned_to,
        reported_by: reporterEmpId,
        priority: (input.priority || 'low') as any,
        status: 'new' as any,
        bug_type: input.bug_type as any,
        other_bug_type: input.other_bug_type?.trim() || null,
        attachment_url: input.attachment_url?.trim() || null,
        created_by: reporterEmpId,
      },
      include: {
        employees_project_bugs_assigned_toToemployees: {
          select: { emp_id: true, name: true },
        },
        employees_project_bugs_reported_byToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    // Record initial history
    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'BUG',
        entity_id: created.bug_id,
        event: 'new',
        summary: 'Bug reported',
        details: { from_status: null, to_status: 'new', note: 'Bug reported' },
        performed_by: reporterEmpId,
      },
    });

    // Log in project_activity_logs
    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'PROJECT',
        entity_id: projectId,
        event: 'bug_created',
        summary: `Bug "${created.title}" (${bugCode}) was reported.`,
        performed_by: reporterEmpId,
      },
    });

    return {
      bug_id: created.bug_id,
      bug_code: created.bug_code,
      project_id: created.project_id,
      task_id: created.task_id,
      title: created.title,
      description: created.description,
      steps_to_reproduce: created.steps_to_reproduce,
      expected_result: created.expected_result,
      actual_result: created.actual_result,
      assigned_to: created.assigned_to,
      assigned_to_name: created.employees_project_bugs_assigned_toToemployees?.name ?? 'Unassigned',
      reported_by: created.reported_by,
      reported_by_name: created.employees_project_bugs_reported_byToemployees?.name ?? 'Unknown',
      priority: created.priority,
      status: created.status,
      bug_type: created.bug_type,
      other_bug_type: created.other_bug_type,
      attachment_url: created.attachment_url,
      dev_started_at: null,
      dev_ended_at: null,
      qa_started_at: null,
      qa_ended_at: null,
      total_time_minutes: 0,
      created_at: created.created_at.toISOString(),
    };
  }

  async updateBugStatus(
    bugId: number,
    actorEmpId: number,
    newStatus: string,
    note?: string,
  ): Promise<any> {
    const bug = await this.prisma.project_bugs.findUnique({
      where: { bug_id: bugId },
    });
    if (!bug || bug.deleted_at) {
      throw new Error('Bug not found');
    }

    const now = new Date();
    const updateData: any = {
      status: newStatus as any,
      updated_by: actorEmpId,
      updated_at: now,
    };

    let devStart = bug.dev_started_at;
    let devEnd = bug.dev_ended_at;
    let qaStart = bug.qa_started_at;
    let qaEnd = bug.qa_ended_at;

    // Time tracking transitions (Section 3.7)
    if (newStatus === 'dev_in_progress') {
      if (!devStart) {
        devStart = now;
        updateData.dev_started_at = devStart;
      }
    } else if (bug.status === 'dev_in_progress' && newStatus !== 'dev_in_progress') {
      devEnd = now;
      updateData.dev_ended_at = devEnd;
    }

    if (newStatus === 'qa_in_progress') {
      if (!qaStart) {
        qaStart = now;
        updateData.qa_started_at = qaStart;
      }
    } else if (bug.status === 'qa_in_progress' && newStatus !== 'qa_in_progress') {
      qaEnd = now;
      updateData.qa_ended_at = qaEnd;
    }

    // Calculate total time in minutes
    let devMs = 0;
    if (devStart) {
      devMs = (devEnd ? devEnd.getTime() : now.getTime()) - devStart.getTime();
    }
    let qaMs = 0;
    if (qaStart) {
      qaMs = (qaEnd ? qaEnd.getTime() : now.getTime()) - qaStart.getTime();
    }
    updateData.total_time_minutes = Math.max(0, Math.round((devMs + qaMs) / 60000));

    const updated = await this.prisma.project_bugs.update({
      where: { bug_id: bugId },
      data: updateData,
    });

    // Record transition history (Section 3.7)
    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'BUG',
        entity_id: bugId,
        event: newStatus,
        summary: note || `Status changed to ${newStatus}`,
        details: {
          from_status: bug.status,
          to_status: newStatus,
          note: note || null,
        },
        performed_by: actorEmpId,
        performed_at: now,
      },
    });

    // Notifications (Section 3.7)
    if (newStatus === 'ready_for_dev') {
      await this.prisma.notifications.create({
        data: {
          recipient_id: bug.assigned_to,
          kind: 'bug_assigned',
          title: 'Bug Assigned to You',
          body: `Bug "${bug.title}" (${bug.bug_code}) is ready for dev.`,
          entity_type: 'bug',
          entity_id: bugId,
          created_by: actorEmpId,
        },
      });
    } else if (newStatus === 'ready_for_qa') {
      await this.prisma.notifications.create({
        data: {
          recipient_id: bug.reported_by,
          kind: 'bug_ready_for_qa',
          title: 'Bug Resolved - Ready for QA',
          body: `Bug "${bug.title}" (${bug.bug_code}) is resolved and ready for QA testing.`,
          entity_type: 'bug',
          entity_id: bugId,
          created_by: actorEmpId,
        },
      });
    }

    // Log in activity_logs
    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'PROJECT',
        entity_id: bug.project_id,
        event: 'bug_status_updated',
        summary: `Bug "${bug.title}" (${bug.bug_code}) moved to ${newStatus.replace(/_/g, ' ')}.`,
        performed_by: actorEmpId,
      },
    });

    return this.getBugDetail(bugId);
  }

  async addBugComment(
    bugId: number,
    empId: number,
    comment: string,
  ): Promise<any> {
    const created = await this.prisma.bug_comments.create({
      data: {
        bug_id: bugId,
        emp_id: empId,
        comment: comment.trim(),
      },
      include: {
        employees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
      },
    });

    return {
      comment_id: created.comment_id,
      bug_id: created.bug_id,
      emp_id: created.emp_id,
      author_name: created.employees?.name ?? 'User',
      author_avatar: created.employees?.profile_picture ?? null,
      comment: created.comment,
      created_at: created.created_at.toISOString(),
    };
  }
}
