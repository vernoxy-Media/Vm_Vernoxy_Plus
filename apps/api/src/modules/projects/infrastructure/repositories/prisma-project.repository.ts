import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  AssignableEmployee,
  CreateProjectInput,
  CreateProjectTaskInput,
  CreateSprintInput,
  ProjectRepositoryPort,
  ProjectsFilter,
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

  private getProjectPrefix(type: ProjectType): string {
    switch (type) {
      case 'client':
        return 'VM-CL';
      case 'internal':
        return 'VM-IN';
      case 'product':
        return 'VM-PR';
      case 'maintenance':
        return 'VM-MN';
      default:
        return 'VM-PR';
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
      created_at: p.created_at.toISOString(),
      created_by: p.created_by,
    };
  }

  async createProject(input: CreateProjectInput): Promise<ProjectEntity> {
    const prefix = this.getProjectPrefix(input.project_type);

    return this.prisma.$transaction(async (tx) => {
      // 1. Increment project counter
      const counter = await tx.project_counters.upsert({
        where: { project_type: input.project_type as any },
        create: { project_type: input.project_type as any, last_number: 1 },
        update: { last_number: { increment: 1 } },
      });

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
      await tx.project_activity_logs.create({
        data: {
          project_id: project.project_id,
          actor_emp_id: input.created_by,
          action_type: 'project_created',
          description: `Project "${project.project_name}" (${projectNo}) was created.`,
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
      where.OR = [
        { project_name: { contains: q, mode: 'insensitive' } },
        { project_no: { contains: q, mode: 'insensitive' } },
        { client_name: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filter.start_date && filter.end_date) {
      where.start_date = { gte: new Date(filter.start_date) };
      where.deadline = { lte: new Date(filter.end_date) };
    }

    // Role-based visibility
    if (!filter.is_admin && filter.employee_id) {
      where.OR = [
        { project_manager_id: filter.employee_id },
        {
          project_members: {
            some: {
              employee_id: filter.employee_id,
              deleted_at: null,
            },
          },
        },
      ];
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
        tasks: { where: { deleted_at: null }, select: { task_id: true, stage: true } },
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

    await this.prisma.project_activity_logs.create({
      data: {
        project_id: projectId,
        actor_emp_id: actorId,
        action_type: 'status_changed',
        description: `Status changed from ${existing.project_status} to ${status}${reason ? `. Reason: ${reason}` : ''}`,
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

    await this.prisma.project_activity_logs.create({
      data: {
        project_id: input.project_id,
        actor_emp_id: input.created_by,
        action_type: 'sprint_created',
        description: `Sprint "${sprint.sprint_name}" was created.`,
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
        `INSERT INTO task_counters (counter_year, last_number)
         VALUES ($1, 1)
         ON CONFLICT (counter_year)
         DO UPDATE SET last_number = task_counters.last_number + 1
         RETURNING last_number;`,
        year,
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
      await tx.task_history.create({
        data: {
          task_id: created.task_id,
          event_type: 'created',
          actor_id: input.created_by,
          to_stage: 'assigned',
          note: `Project task created for ${project.project_name}`,
        },
      });

      // Project activity log
      await tx.project_activity_logs.create({
        data: {
          project_id: input.project_id,
          actor_emp_id: input.created_by,
          action_type: 'task_created',
          description: `Task "${created.title}" (${taskCode}) was added to project.`,
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
}
