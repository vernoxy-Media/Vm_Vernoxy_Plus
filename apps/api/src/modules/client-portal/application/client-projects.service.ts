import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { progressPercent } from '../domain/client-rules';

export interface ClientProjectSummary {
  project_id: number;
  project_no: string;
  project_name: string;
  project_status: string;
  start_date: string;
  deadline: string;
  actual_end_date: string | null;
  manager_name: string | null;
  tasks_total: number;
  tasks_done: number;
  progress_percent: number;
  open_bugs: number;
}

export interface ClientProjectDetail extends ClientProjectSummary {
  tasks_by_stage: { to_do: number; in_progress: number; on_hold: number; in_review: number; done: number };
  sprints: Array<{ sprint_id: number; name: string; status: string; start_date: string; end_date: string; tasks_total: number; tasks_done: number; progress_percent: number }>;
}

type SummaryRow = Omit<ClientProjectSummary, 'start_date' | 'deadline' | 'actual_end_date' | 'progress_percent' | 'tasks_total' | 'tasks_done' | 'open_bugs'> & {
  start_date: Date;
  deadline: Date;
  actual_end_date: Date | null;
  tasks_total: bigint;
  tasks_done: bigint;
  open_bugs: bigint;
};

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * What a client sees of its own projects: where the project stands, never who did what.
 * No employee time logs, no internal discussion, no salaries; only counts, dates and status.
 * "Tasks" are the leaf tasks (a task with sub-tasks is counted through its sub-tasks).
 */
@Injectable()
export class ClientProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: number): Promise<ClientProjectSummary[]> {
    return this.summaries(clientId, null);
  }

  async detail(clientId: number, projectId: number): Promise<ClientProjectDetail> {
    const [summary] = await this.summaries(clientId, projectId);
    if (!summary) throw new NotFoundException('Project not found.');

    const stages = await this.prisma.$queryRaw<Array<{ stage: string; n: bigint }>>`
      SELECT t.stage::text AS stage, count(*) AS n FROM tasks t
       WHERE t.project_id = ${projectId} AND t.deleted_at IS NULL AND t.has_sub_tasks = false
       GROUP BY t.stage;
    `;
    const by = (s: string) => Number(stages.find((x) => x.stage === s)?.n ?? 0);

    const sprints = await this.prisma.$queryRaw<
      Array<{ sprint_id: number; name: string; status: string; start_date: Date; end_date: Date; total: bigint; done: bigint }>
    >`
      SELECT s.sprint_id, s.sprint_name AS name, s.status::text AS status, s.start_date, s.end_date,
             count(t.task_id) AS total, count(t.task_id) FILTER (WHERE t.stage = 'completed') AS done
        FROM project_sprints s
        LEFT JOIN tasks t ON t.sprint_id = s.sprint_id AND t.deleted_at IS NULL AND t.has_sub_tasks = false
       WHERE s.project_id = ${projectId} AND s.deleted_at IS NULL
       GROUP BY s.sprint_id ORDER BY s.start_date, s.sprint_id;
    `;

    return {
      ...summary,
      tasks_by_stage: { to_do: by('assigned'), in_progress: by('in_progress'), on_hold: by('hold'), in_review: by('requested'), done: by('completed') },
      sprints: sprints.map((s) => ({
        sprint_id: s.sprint_id,
        name: s.name,
        status: s.status,
        start_date: day(s.start_date),
        end_date: day(s.end_date),
        tasks_total: Number(s.total),
        tasks_done: Number(s.done),
        progress_percent: progressPercent({ total: Number(s.total), done: Number(s.done) }),
      })),
    };
  }

  private async summaries(clientId: number, projectId: number | null): Promise<ClientProjectSummary[]> {
    const rows = await this.prisma.$queryRaw<SummaryRow[]>`
      SELECT p.project_id, p.project_no, p.project_name, p.project_status::text AS project_status,
             p.start_date, p.deadline, p.actual_end_date, m.name AS manager_name,
             (SELECT count(*) FROM tasks t WHERE t.project_id = p.project_id AND t.deleted_at IS NULL AND t.has_sub_tasks = false) AS tasks_total,
             (SELECT count(*) FROM tasks t WHERE t.project_id = p.project_id AND t.deleted_at IS NULL AND t.has_sub_tasks = false AND t.stage = 'completed') AS tasks_done,
             (SELECT count(*) FROM project_bugs b WHERE b.project_id = p.project_id AND b.deleted_at IS NULL AND b.status NOT IN ('done', 'not_a_bug')) AS open_bugs
        FROM projects p
        LEFT JOIN employees m ON m.emp_id = p.project_manager_id
       WHERE p.client_id = ${clientId} AND p.deleted_at IS NULL
         AND (${projectId}::int IS NULL OR p.project_id = ${projectId}::int)
       ORDER BY p.start_date DESC, p.project_id DESC;
    `;
    return rows.map((r) => ({
      project_id: r.project_id,
      project_no: r.project_no,
      project_name: r.project_name,
      project_status: r.project_status,
      start_date: day(r.start_date),
      deadline: day(r.deadline),
      actual_end_date: r.actual_end_date ? day(r.actual_end_date) : null,
      manager_name: r.manager_name,
      tasks_total: Number(r.tasks_total),
      tasks_done: Number(r.tasks_done),
      progress_percent: progressPercent({ total: Number(r.tasks_total), done: Number(r.tasks_done) }),
      open_bugs: Number(r.open_bugs),
    }));
  }
}
