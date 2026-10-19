import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  TaskEntity,
  TaskHistoryEntity,
  TaskStage,
} from '../../domain/entities/task.entity';
import {
  CreateTaskRepoInput,
  MoveStageRepoInput,
  TaskBoardCard,
  TaskBoardFilters,
  TaskBoardResult,
  TaskRepositoryPort,
  TaskSummaryResult,
  UpdateTaskRepoInput,
} from '../../domain/ports/task.repository.port';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';

@Injectable()
export class PrismaTaskRepository implements TaskRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly fileStorage?: FileStoragePort,
  ) {}

  async getNextTaskCode(year: number): Promise<string> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO task_counters (counter_year, last_number)
       VALUES ($1, 1)
       ON CONFLICT (counter_year)
       DO UPDATE SET last_number = task_counters.last_number + 1
       RETURNING last_number;`,
      year,
    );
    const seq = rows[0]?.last_number ?? 1;
    return `TSK-${year}-${seq.toString().padStart(4, '0')}`;
  }

  async createTask(input: CreateTaskRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.tasks.create({
        data: {
          task_code: input.task_code,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          task_type_id: input.task_type_id ?? null,
          due_date: input.due_date ? new Date(input.due_date) : null,
          allocated_minutes: input.allocated_minutes ?? null,
          created_by: input.created_by,
        },
      });

      await tx.task_assignees.createMany({
        data: input.assignee_ids.map((empId) => ({
          task_id: created.task_id,
          employee_id: empId,
          created_by: input.created_by,
        })),
      });

      await tx.task_history.create({
        data: {
          task_id: created.task_id,
          event_type: 'created',
          actor_id: input.created_by,
          to_stage: 'assigned',
          note: 'Task created',
        },
      });

      return this.fetchTaskEntity(created.task_id, tx);
    });
  }

  async findById(taskId: number): Promise<TaskEntity | null> {
    return this.fetchTaskEntity(taskId, this.prisma);
  }

  async findByCode(taskCode: string): Promise<TaskEntity | null> {
    const task = await this.prisma.tasks.findFirst({
      where: { task_code: taskCode, deleted_at: null },
      select: { task_id: true },
    });
    if (!task) return null;
    return this.fetchTaskEntity(task.task_id, this.prisma);
  }

  async updateTask(taskId: number, input: UpdateTaskRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const data: any = {
        updated_by: input.updated_by,
        updated_at: new Date(),
      };
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.priority !== undefined) data.priority = input.priority;
      if (input.task_type_id !== undefined) data.task_type_id = input.task_type_id;
      if (input.due_date !== undefined) {
        data.due_date = input.due_date ? new Date(input.due_date) : null;
      }
      if (input.allocated_minutes !== undefined) data.allocated_minutes = input.allocated_minutes;

      await tx.tasks.update({
        where: { task_id: taskId },
        data,
      });

      if (input.assignee_ids !== undefined) {
        const currentAssignees = await tx.task_assignees.findMany({
          where: { task_id: taskId, deleted_at: null },
        });
        const currentIds = currentAssignees.map((a) => a.employee_id);
        const newIds = input.assignee_ids;

        const toRemove = currentIds.filter((id) => !newIds.includes(id));
        const toAdd = newIds.filter((id) => !currentIds.includes(id));

        if (toRemove.length > 0) {
          await tx.task_assignees.updateMany({
            where: {
              task_id: taskId,
              employee_id: { in: toRemove },
              deleted_at: null,
            },
            data: {
              deleted_at: new Date(),
              deleted_by: input.updated_by,
            },
          });
        }

        if (toAdd.length > 0) {
          await tx.task_assignees.createMany({
            data: toAdd.map((empId) => ({
              task_id: taskId,
              employee_id: empId,
              created_by: input.updated_by,
            })),
          });
        }
      }

      await tx.task_history.create({
        data: {
          task_id: taskId,
          event_type: 'edited',
          actor_id: input.updated_by,
          note: 'Task details updated',
        },
      });

      return this.fetchTaskEntity(taskId, tx);
    });
  }

  async moveStage(taskId: number, input: MoveStageRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tasks.findUnique({
        where: { task_id: taskId },
        select: { stage: true },
      });
      if (!existing) throw new Error(`Task #${taskId} not found`);

      const fromStage = existing.stage as TaskStage;
      const toStage = input.target_stage;

      let eventType: any = 'stage_changed';
      if (toStage === 'requested') {
        eventType = 'requested';
      } else if (fromStage === 'requested' && toStage === 'in_progress') {
        eventType = input.note ? 'rejected' : 'withdrawn';
      } else if (toStage === 'completed') {
        eventType = 'approved';
      } else if (fromStage === 'completed' && toStage === 'in_progress') {
        eventType = 'reopened';
      }

      const updateData: any = {
        stage: toStage,
        updated_by: input.actor_emp_id,
        updated_at: new Date(),
      };

      if (toStage === 'requested') {
        updateData.requested_at = new Date();
      } else if (toStage === 'completed') {
        updateData.completed_at = new Date();
        updateData.completed_by = input.actor_emp_id;
      } else if (fromStage === 'completed' && toStage === 'in_progress') {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      if (input.note) {
        updateData.review_note = input.note;
      }

      await tx.tasks.update({
        where: { task_id: taskId },
        data: updateData,
      });

      await tx.task_history.create({
        data: {
          task_id: taskId,
          event_type: eventType,
          actor_id: input.actor_emp_id,
          from_stage: fromStage,
          to_stage: toStage,
          note: input.note ?? null,
        },
      });

      return this.fetchTaskEntity(taskId, tx);
    });
  }

  async getBoard(filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    const cards = await this.queryBoardCards(undefined, filters);
    return this.groupCardsByStage(cards);
  }

  async getMyBoard(empId: number, filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    const cards = await this.queryBoardCards(empId, filters);
    return this.groupCardsByStage(cards);
  }

  async getSummary(): Promise<TaskSummaryResult> {
    return this.querySummary(undefined);
  }

  async getMySummary(empId: number): Promise<TaskSummaryResult> {
    return this.querySummary(empId);
  }

  async getHistory(taskId: number): Promise<TaskHistoryEntity[]> {
    const rows = await this.prisma.task_history.findMany({
      where: { task_id: taskId },
      include: { employees: true },
      orderBy: { history_id: 'desc' },
    });

    return rows.map((r) => ({
      history_id: r.history_id.toString(),
      task_id: r.task_id,
      event_type: r.event_type as any,
      actor_id: r.actor_id,
      actor_name: r.employees?.name ?? null,
      from_stage: r.from_stage as any,
      to_stage: r.to_stage as any,
      note: r.note,
      changes: r.changes as any,
      created_at: r.created_at,
    }));
  }

  async getPendingReviewCount(): Promise<number> {
    return this.prisma.tasks.count({
      where: {
        stage: 'requested',
        deleted_at: null,
      },
    });
  }

  private async queryBoardCards(
    forEmpId?: number,
    filters?: TaskBoardFilters,
  ): Promise<TaskBoardCard[]> {
    const params: any[] = [];
    let pIdx = 1;

    let whereClause = 't.deleted_at IS NULL';

    if (forEmpId !== undefined) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM task_assignees ta_filter
        WHERE ta_filter.task_id = t.task_id
          AND ta_filter.employee_id = $${pIdx++}
          AND ta_filter.deleted_at IS NULL
      )`;
      params.push(forEmpId);
    }

    if (filters?.assignee_id) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM task_assignees ta_f
        WHERE ta_f.task_id = t.task_id
          AND ta_f.employee_id = $${pIdx++}
          AND ta_f.deleted_at IS NULL
      )`;
      params.push(filters.assignee_id);
    }

    if (filters?.search) {
      whereClause += ` AND (t.title ILIKE $${pIdx} OR t.task_code ILIKE $${pIdx})`;
      params.push(`%${filters.search}%`);
      pIdx++;
    }

    if (filters?.priority) {
      whereClause += ` AND t.priority = $${pIdx++}::task_priority`;
      params.push(filters.priority);
    }

    if (filters?.task_type_id) {
      whereClause += ` AND t.task_type_id = $${pIdx++}`;
      params.push(filters.task_type_id);
    }

    if (filters?.overdue_only) {
      whereClause += ` AND t.stage <> 'completed' AND t.due_date < CURRENT_DATE`;
    }

    const sql = `
      SELECT
        t.task_id,
        t.task_code,
        t.title,
        t.description,
        t.priority::text AS priority,
        t.task_type_id,
        ml.label AS task_type_label,
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS due_date,
        t.allocated_minutes,
        t.stage::text AS stage,
        (t.stage <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS is_overdue,
        t.requested_at,
        t.completed_at,
        t.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'employee_id', e.emp_id,
              'name', e.name,
              'email', e.email,
              'profile_picture_url', e.profile_picture
            )
          ) FILTER (WHERE e.emp_id IS NOT NULL),
          '[]'::json
        ) AS assignees
      FROM tasks t
      LEFT JOIN master_lookup ml ON t.task_type_id = ml.lookup_id
      LEFT JOIN task_assignees ta ON t.task_id = ta.task_id AND ta.deleted_at IS NULL
      LEFT JOIN employees e ON ta.employee_id = e.emp_id AND e.deleted_at IS NULL
      WHERE ${whereClause}
      GROUP BY t.task_id, ml.label
      ORDER BY t.created_at DESC, t.task_id DESC;
    `;

    const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    return rows.map((r) => ({
      task_id: r.task_id,
      task_code: r.task_code,
      title: r.title,
      description: r.description,
      priority: r.priority,
      task_type_id: r.task_type_id,
      task_type_label: r.task_type_label,
      due_date: r.due_date,
      allocated_minutes: r.allocated_minutes,
      stage: r.stage,
      is_overdue: Boolean(r.is_overdue),
      requested_at: r.requested_at ? new Date(r.requested_at) : null,
      completed_at: r.completed_at ? new Date(r.completed_at) : null,
      created_at: new Date(r.created_at),
      assignees: (r.assignees || []).map((a: any) => ({
        employee_id: a.employee_id,
        name: a.name,
        email: a.email,
        avatar_url: this.signPhotoUrl(a.profile_picture_url),
      })),
    }));
  }

  private groupCardsByStage(cards: TaskBoardCard[]): TaskBoardResult {
    const columns: TaskBoardResult['columns'] = {
      assigned: [],
      in_progress: [],
      requested: [],
      completed: [],
    };

    for (const card of cards) {
      if (columns[card.stage]) {
        columns[card.stage].push(card);
      }
    }

    return {
      columns,
      counts: {
        assigned: columns.assigned.length,
        in_progress: columns.in_progress.length,
        requested: columns.requested.length,
        completed: columns.completed.length,
        total: cards.length,
      },
    };
  }

  private async querySummary(forEmpId?: number): Promise<TaskSummaryResult> {
    const params: any[] = [];
    let pIdx = 1;
    let whereClause = 't.deleted_at IS NULL';

    if (forEmpId !== undefined) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM task_assignees ta_f
        WHERE ta_f.task_id = t.task_id
          AND ta_f.employee_id = $${pIdx++}
          AND ta_f.deleted_at IS NULL
      )`;
      params.push(forEmpId);
    }

    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.stage = 'assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE t.stage = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE t.stage = 'requested')::int AS requested,
        COUNT(*) FILTER (WHERE t.stage <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE)::int AS overdue,
        COUNT(*) FILTER (WHERE t.stage = 'completed' AND DATE(t.completed_at) = CURRENT_DATE)::int AS completed_today,
        COUNT(*) FILTER (WHERE t.stage = 'completed' AND DATE_TRUNC('month', t.completed_at) = DATE_TRUNC('month', CURRENT_DATE))::int AS completed_this_month
      FROM tasks t
      WHERE ${whereClause};
    `;

    const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);
    const row = rows[0] || {};

    return {
      total: row.total ?? 0,
      assigned: row.assigned ?? 0,
      in_progress: row.in_progress ?? 0,
      requested: row.requested ?? 0,
      overdue: row.overdue ?? 0,
      completed_today: row.completed_today ?? 0,
      completed_this_month: row.completed_this_month ?? 0,
    };
  }

  private async fetchTaskEntity(taskId: number, tx: any): Promise<TaskEntity> {
    const row = await tx.tasks.findUnique({
      where: { task_id: taskId },
      include: {
        master_lookup: true,
        employees_tasks_completed_byToemployees: true,
        employees_tasks_created_byToemployees: true,
        task_assignees: {
          where: { deleted_at: null },
          include: {
            employees_task_assignees_employee_idToemployees: true,
          },
        },
      },
    });

    if (!row) throw new Error(`Task #${taskId} not found`);

    return {
      task_id: row.task_id,
      task_code: row.task_code,
      title: row.title,
      description: row.description,
      priority: row.priority,
      task_type_id: row.task_type_id,
      task_type_label: row.master_lookup?.label ?? null,
      due_date: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
      allocated_minutes: row.allocated_minutes,
      stage: row.stage,
      review_note: row.review_note,
      requested_at: row.requested_at,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      completed_by_name: row.employees_tasks_completed_byToemployees?.name ?? null,
      self_approved: row.self_approved,
      row_version: row.row_version,
      created_at: row.created_at,
      created_by: row.created_by,
      created_by_name: row.employees_tasks_created_byToemployees?.name ?? null,
      assignees: row.task_assignees.map((a: any) => ({
        task_assignee_id: a.task_assignee_id,
        task_id: a.task_id,
        employee_id: a.employee_id,
        name: a.employees_task_assignees_employee_idToemployees?.name ?? '',
        email: a.employees_task_assignees_employee_idToemployees?.email ?? '',
        avatar_url: this.signPhotoUrl(
          a.employees_task_assignees_employee_idToemployees?.profile_picture,
        ),
      })),
    };
  }

  private signPhotoUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    if (key.startsWith('http')) return key;
    if (this.fileStorage) {
      try {
        return this.fileStorage.getSignedUrl(key);
      } catch {
        return key;
      }
    }
    return key;
  }
}
