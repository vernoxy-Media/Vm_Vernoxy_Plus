import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

export interface ProjectRole {
  projectId: number;
  isAdmin: boolean;
  isPM: boolean;
  isMember: boolean;
  project: {
    project_id: number;
    project_name: string;
    project_manager_id: number;
    start_date: Date;
    deadline: Date;
  };
}

/**
 * Who may do what in a project (Project Management BFD 1.5 Access Summary).
 * Admin = an active employee whose role is marked is_admin.
 */
@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isAdmin(empId: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
        WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL
      ) AS ok;
    `;
    return Boolean(rows[0]?.ok);
  }

  async role(projectId: number, empId: number): Promise<ProjectRole> {
    const project = await this.prisma.projects.findFirst({
      where: { project_id: projectId, deleted_at: null },
      select: { project_id: true, project_name: true, project_manager_id: true, start_date: true, deadline: true },
    });
    if (!project) throw new NotFoundException('Project not found.');
    const [isAdmin, member] = await Promise.all([
      this.isAdmin(empId),
      this.prisma.project_members.findFirst({
        where: { project_id: projectId, employee_id: empId, deleted_at: null },
        select: { member_id: true },
      }),
    ]);
    const isPM = project.project_manager_id === empId;
    return { projectId, isAdmin, isPM, isMember: Boolean(member) || isPM, project };
  }

  /** Admin, the Project Manager or a project employee. */
  async assertMember(projectId: number, empId: number): Promise<ProjectRole> {
    const r = await this.role(projectId, empId);
    if (!r.isAdmin && !r.isMember) throw new ForbiddenException('You are not a member of this project.');
    return r;
  }

  /** Admin or the Project Manager of this project. */
  async assertManager(projectId: number, empId: number): Promise<ProjectRole> {
    const r = await this.role(projectId, empId);
    if (!r.isAdmin && !r.isPM) {
      throw new ForbiddenException('Only the Admin or the Project Manager of this project can do this.');
    }
    return r;
  }

  /** Current status of a bug if it belongs to the project, else null. */
  async bugStatusInProject(projectId: number, bugId: number): Promise<string | null> {
    const bug = await this.prisma.project_bugs.findFirst({
      where: { bug_id: bugId, project_id: projectId, deleted_at: null },
      select: { status: true },
    });
    return bug ? String(bug.status) : null;
  }

  /** Active employees of the project, including the Project Manager. */
  async memberIds(projectId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM project_members pm JOIN employees e ON e.emp_id = pm.employee_id
      WHERE pm.project_id = ${projectId} AND pm.deleted_at IS NULL AND e.status = 'Active' AND e.deleted_at IS NULL
      UNION
      SELECT p.project_manager_id FROM projects p WHERE p.project_id = ${projectId};
    `;
    return rows.map((r) => Number(r.emp_id));
  }
}
