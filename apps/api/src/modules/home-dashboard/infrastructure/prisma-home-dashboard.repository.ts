import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  AdminSection,
  AssignedComplaintsSection,
  CountByKey,
  DashboardActivityItem,
  DashboardAssignments,
  DashboardAttendance,
  DashboardComplaints,
  DashboardDeadlineItem,
  DashboardExpenses,
  DashboardKbItem,
  DashboardLeaveRequests,
  DashboardMessages,
  DashboardProjectItem,
  DashboardTaskItem,
  DashboardViewer,
  ExpenseApprovalsSection,
  HomeDashboardRepositoryPort,
  ManagedProjectsSection,
  SalesSection,
  TaskKpis,
} from '../application/ports/home-dashboard.repository.port';

type Row = Record<string, any>;

/** Attendance, Leave and Follow-ups count the day in India time; Tasks use the database date (as their own pages do). */
const APP_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** Follow-ups: a Pending follow-up is Overdue 15 minutes after its time (Sales follow-up rule). */
const FOLLOW_UP_OVERDUE_GRACE_MS = 15 * 60 * 1000;
const OPEN_LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'On Hold'];
/** Stored in lower case, with spaces or underscores, so the match is made on the normalised value. */
const OPEN_CANDIDATE_STAGES = ['new', 'open', 'screening', 'interviewing', 'interview', 'on hold', 'selected', 'onboarding'];
const OPEN_COMPLAINT_STATUSES = ['New', 'Open', 'In Progress'];
/** Recent activity looks back this far, which keeps the query on recent rows of the activity log. */
const ACTIVITY_WINDOW_DAYS = 90;

const iso = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : String(v);
};
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const counts = (rows: Row[]): CountByKey[] =>
  rows.map((r) => ({ key: String(r.key ?? 'Unknown'), count: num(r.count), ...(r.id !== undefined ? { id: numOrNull(r.id) } : {}) }));

/** The start and end of today in India time, as instants. */
function istDayRange(now: Date): { from: Date; to: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const from = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
  return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * Read-only queries behind GET /home-dashboard. Nothing here writes to the database.
 * Each visibility rule is the one the owning module applies to its own listing (see the port for the list).
 */
@Injectable()
export class PrismaHomeDashboardRepository implements HomeDashboardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Shared scopes
  // ---------------------------------------------------------------------------

  /** The My Tasks rule (tasks repository, getMyBoard/getMySummary), on alias `t`. */
  private myTask(empId: number): Prisma.Sql {
    return Prisma.sql`(
      (t.parent_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM task_assignees ta_st
        WHERE ta_st.task_id = t.task_id AND ta_st.employee_id = ${empId} AND ta_st.deleted_at IS NULL))
      OR (t.parent_task_id IS NULL AND t.has_sub_tasks = false AND EXISTS (
        SELECT 1 FROM task_assignees ta_main
        WHERE ta_main.task_id = t.task_id AND ta_main.employee_id = ${empId} AND ta_main.deleted_at IS NULL))
      OR (t.parent_task_id IS NULL AND t.has_sub_tasks = true AND t.lead_employee_id = ${empId} AND NOT EXISTS (
        SELECT 1 FROM tasks st_chk
        JOIN task_assignees ta_chk ON ta_chk.task_id = st_chk.task_id AND ta_chk.deleted_at IS NULL
        WHERE st_chk.parent_task_id = t.task_id AND ta_chk.employee_id = ${empId}))
      OR (t.source = 'quick' AND t.created_by = ${empId})
      OR (t.qa_assignee_id = ${empId} AND t.stage IN ('in_qa', 'requested', 'completed'))
    )`;
  }

  /** The Projects listing rule: Admin sees all; others the projects they manage or belong to. Alias `p`. */
  private projectAccess(viewer: DashboardViewer): Prisma.Sql {
    if (viewer.is_admin) return Prisma.sql`TRUE`;
    return Prisma.sql`(p.project_manager_id = ${viewer.emp_id} OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = p.project_id AND pm.employee_id = ${viewer.emp_id} AND pm.deleted_at IS NULL))`;
  }

  /** Progress as the Projects module computes it: completed top-level tasks / top-level tasks. Alias `p`. */
  private readonly projectProgressJoin = Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS total, count(*) FILTER (WHERE tt.stage = 'completed')::int AS done
      FROM tasks tt
      WHERE tt.project_id = p.project_id AND tt.deleted_at IS NULL AND tt.parent_task_id IS NULL
    ) pt ON true`;

  private toProject(r: Row): DashboardProjectItem {
    const total = num(r.task_total);
    return {
      project_id: num(r.project_id),
      project_no: r.project_no,
      project_name: r.project_name,
      project_status: r.project_status,
      deadline: r.deadline ?? null,
      progress: total > 0 ? Math.round((num(r.task_done) / total) * 100) : 0,
      task_count: total,
      updated_at: iso(r.updated_at),
    };
  }

  // ---------------------------------------------------------------------------
  // Viewer and assignments
  // ---------------------------------------------------------------------------

  async getViewer(empId: number): Promise<DashboardViewer | null> {
    const [r] = await this.prisma.$queryRaw<Row[]>`
      SELECT e.emp_id, e.name, e.role_id, r.role_name, e.dep_id, d.name AS department_name, e.status::text AS status,
             COALESCE(r.is_admin, false) AS role_is_admin
      FROM employees e
      LEFT JOIN roles r ON r.role_id = e.role_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE e.emp_id = ${empId} AND e.deleted_at IS NULL`;
    if (!r) return null;
    const active = r.status === 'Active';
    return {
      emp_id: num(r.emp_id),
      name: r.name,
      role_id: numOrNull(r.role_id),
      role_name: r.role_name ?? null,
      dep_id: num(r.dep_id),
      department_name: r.department_name ?? null,
      // Same rules as the auth access summary and the SalesAccessGuard
      is_admin: active && r.role_is_admin === true,
      is_sales: active && String(r.department_name ?? '').trim().toLowerCase().startsWith('sales'),
    };
  }

  async getAssignments(empId: number): Promise<DashboardAssignments> {
    const [r] = await this.prisma.$queryRaw<Row[]>`
      SELECT
        EXISTS (SELECT 1 FROM projects WHERE project_manager_id = ${empId} AND deleted_at IS NULL) AS project_manager,
        COALESCE((SELECT array_agg(department_id) FROM expense_authorised_approvers
                  WHERE approver_emp_id = ${empId} AND deleted_at IS NULL), '{}') AS approver_dept_ids,
        EXISTS (SELECT 1 FROM complaints WHERE handler_id = ${empId} AND deleted_at IS NULL) AS complaint_handler`;
    return {
      project_manager: r?.project_manager === true,
      expense_approver_dept_ids: ((r?.approver_dept_ids as unknown[]) || []).map(Number),
      complaint_handler: r?.complaint_handler === true,
    };
  }

  // ---------------------------------------------------------------------------
  // Personal work
  // ---------------------------------------------------------------------------

  async getTaskKpis(empId: number): Promise<TaskKpis> {
    const [r] = await this.prisma.$queryRaw<Row[]>`
      SELECT
        count(*)::int AS total,
        -- In QA counts as in progress, the same as the Tasks page does
        count(*) FILTER (WHERE t.stage IN ('assigned', 'in_progress', 'in_qa'))::int AS todo_in_progress,
        count(*) FILTER (WHERE t.stage = 'hold')::int AS on_hold,
        count(*) FILTER (WHERE t.stage = 'requested')::int AS in_review,
        count(*) FILTER (WHERE t.stage = 'completed')::int AS done,
        count(*) FILTER (WHERE t.stage <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE)::int AS overdue,
        count(*) FILTER (WHERE t.stage <> 'completed' AND t.due_date = CURRENT_DATE)::int AS due_today
      FROM tasks t
      WHERE t.deleted_at IS NULL AND ${this.myTask(empId)}`;
    return {
      total: num(r?.total),
      todo_in_progress: num(r?.todo_in_progress),
      on_hold: num(r?.on_hold),
      in_review: num(r?.in_review),
      done: num(r?.done),
      overdue: num(r?.overdue),
      due_today: num(r?.due_today),
    };
  }

  /** VM-004 rule 2: due today first, then overdue (oldest first), then upcoming (nearest first); no completed tasks. */
  async getMyTasks(empId: number, limit: number): Promise<DashboardTaskItem[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT t.task_id, t.task_code, t.title, t.project_id, pr.project_name, t.priority::text AS priority, t.stage::text AS stage,
             to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
             CASE WHEN t.due_date = CURRENT_DATE THEN 'today'
                  WHEN t.due_date < CURRENT_DATE THEN 'overdue'
                  WHEN t.due_date > CURRENT_DATE THEN 'upcoming'
                  ELSE 'no_date' END AS bucket
      FROM tasks t
      LEFT JOIN projects pr ON pr.project_id = t.project_id
      WHERE t.deleted_at IS NULL AND t.stage <> 'completed' AND ${this.myTask(empId)}
      ORDER BY CASE WHEN t.due_date = CURRENT_DATE THEN 0
                    WHEN t.due_date < CURRENT_DATE THEN 1
                    WHEN t.due_date > CURRENT_DATE THEN 2
                    ELSE 3 END,
               t.due_date ASC NULLS LAST, t.task_id ASC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      task_id: num(r.task_id),
      task_code: r.task_code,
      title: r.title,
      project_id: numOrNull(r.project_id),
      project_name: r.project_name ?? null,
      priority: r.priority,
      stage: r.stage,
      due_date: r.due_date ?? null,
      bucket: r.bucket,
    }));
  }

  /** VM-004 rule 3: accessible open projects, nearest deadline first. */
  async getRecentProjects(viewer: DashboardViewer, limit: number): Promise<DashboardProjectItem[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT p.project_id, p.project_no, p.project_name, p.project_status::text AS project_status,
             to_char(p.deadline, 'YYYY-MM-DD') AS deadline, COALESCE(p.updated_at, p.created_at) AS updated_at,
             pt.total AS task_total, pt.done AS task_done
      FROM projects p
      ${this.projectProgressJoin}
      WHERE p.deleted_at IS NULL AND p.project_status NOT IN ('delivered', 'cancelled') AND ${this.projectAccess(viewer)}
      ORDER BY p.deadline ASC NULLS LAST, p.project_id ASC
      LIMIT ${limit}`;
    return rows.map((r) => this.toProject(r));
  }

  /** VM-004 rule 4: upcoming task, project and calendar dates, today first; overdue items are left out. */
  async getUpcomingDeadlines(viewer: DashboardViewer, limit: number): Promise<DashboardDeadlineItem[]> {
    const me = viewer.emp_id;
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT * FROM (
        SELECT 'task' AS kind, t.task_id AS id, t.title, pr.project_name AS context,
               to_char(t.due_date, 'YYYY-MM-DD') AS date_text, t.due_date::timestamptz AS sort_at
        FROM tasks t
        LEFT JOIN projects pr ON pr.project_id = t.project_id
        WHERE t.deleted_at IS NULL AND t.stage <> 'completed' AND t.due_date >= CURRENT_DATE AND ${this.myTask(me)}
        UNION ALL
        SELECT 'project', p.project_id, p.project_name, p.project_no,
               to_char(p.deadline, 'YYYY-MM-DD'), p.deadline::timestamptz
        FROM projects p
        WHERE p.deleted_at IS NULL AND p.project_status NOT IN ('delivered', 'cancelled')
          AND p.deadline >= CURRENT_DATE AND ${this.projectAccess(viewer)}
        UNION ALL
        SELECT 'event', e.event_id, e.title, e.location, NULL, e.start_time
        FROM calendar_events e
        WHERE e.deleted_at IS NULL AND e.status IN ('scheduled', 'in_progress') AND e.event_type <> 'task_block'
          AND e.end_time >= now()
          AND (e.organizer_id = ${me} OR EXISTS (
            SELECT 1 FROM calendar_event_attendees a
            WHERE a.event_id = e.event_id AND a.employee_id = ${me} AND a.deleted_at IS NULL))
      ) x
      ORDER BY x.sort_at ASC, x.kind ASC, x.id ASC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      kind: r.kind,
      id: num(r.id),
      title: r.title,
      context: r.context ?? null,
      date: r.date_text ?? iso(r.sort_at)!,
    }));
  }

  async getAttendanceToday(empId: number): Promise<DashboardAttendance> {
    const [r] = await this.prisma.$queryRaw<Row[]>`
      SELECT check_in_at, check_out_at, break_minutes, production_minutes, day_status
      FROM attendance_days
      WHERE emp_id = ${empId} AND deleted_at IS NULL
        AND work_date = (now() AT TIME ZONE ${APP_TIMEZONE})::date
      ORDER BY attendance_id DESC
      LIMIT 1`;
    return {
      checked_in: Boolean(r?.check_in_at),
      check_in_at: iso(r?.check_in_at),
      check_out_at: iso(r?.check_out_at),
      break_minutes: num(r?.break_minutes),
      production_minutes: num(r?.production_minutes),
      day_status: r?.day_status ?? null,
    };
  }

  async getLeaveRequests(empId: number): Promise<DashboardLeaveRequests> {
    const [[c], [latest]] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE status IN ('PENDING', 'CANCELLATION_REQUESTED'))::int AS pending
        FROM leave_requests WHERE emp_id = ${empId}`,
      this.prisma.$queryRaw<Row[]>`
        SELECT r.request_id, r.request_no, lt.name AS leave_type_name, to_char(r.from_date, 'YYYY-MM-DD') AS from_date,
               to_char(r.to_date, 'YYYY-MM-DD') AS to_date, r.leave_days, r.status
        FROM leave_requests r
        LEFT JOIN leave_types lt ON lt.leave_type_id = r.leave_type_id
        WHERE r.emp_id = ${empId}
        ORDER BY r.applied_at DESC, r.request_id DESC
        LIMIT 1`,
    ]);
    return {
      total: num(c?.total),
      pending: num(c?.pending),
      latest: latest
        ? {
            request_id: num(latest.request_id),
            request_no: latest.request_no,
            leave_type_name: latest.leave_type_name ?? null,
            from_date: latest.from_date,
            to_date: latest.to_date,
            leave_days: num(latest.leave_days),
            status: latest.status,
          }
        : null,
    };
  }

  /** A claim is "raised" once it is submitted; drafts are counted apart and never make the card appear. */
  async getExpenses(empId: number): Promise<DashboardExpenses> {
    const [[c], [latest]] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*) FILTER (WHERE status <> 'DRAFT')::int AS total,
               count(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
               count(*) FILTER (WHERE status = 'SUBMITTED')::int AS waiting,
               count(*) FILTER (WHERE status = 'APPROVED')::int AS approved_unpaid
        FROM expense_claims WHERE emp_id = ${empId} AND deleted_at IS NULL`,
      this.prisma.$queryRaw<Row[]>`
        SELECT claim_id, claim_no, amount::float8 AS amount, status, to_char(expense_date, 'YYYY-MM-DD') AS expense_date
        FROM expense_claims
        WHERE emp_id = ${empId} AND deleted_at IS NULL AND status <> 'DRAFT'
        ORDER BY COALESCE(updated_at, created_at) DESC, claim_id DESC
        LIMIT 1`,
    ]);
    return {
      total: num(c?.total),
      draft: num(c?.draft),
      waiting_approval: num(c?.waiting),
      approved_unpaid: num(c?.approved_unpaid),
      latest: latest
        ? {
            claim_id: num(latest.claim_id),
            claim_no: latest.claim_no ?? null,
            amount: numOrNull(latest.amount),
            status: latest.status,
            expense_date: latest.expense_date,
          }
        : null,
    };
  }

  async getComplaints(empId: number): Promise<DashboardComplaints> {
    const [[c], [latest]] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE status <> 'Closed')::int AS active
        FROM complaints WHERE complainant_id = ${empId} AND deleted_at IS NULL`,
      this.prisma.$queryRaw<Row[]>`
        SELECT complaint_id, complaint_no, subject, status, COALESCE(updated_at, created_at) AS updated_at
        FROM complaints
        WHERE complainant_id = ${empId} AND deleted_at IS NULL
        ORDER BY COALESCE(updated_at, created_at) DESC, complaint_id DESC
        LIMIT 1`,
    ]);
    return {
      total: num(c?.total),
      active: num(c?.active),
      latest: latest
        ? {
            complaint_id: num(latest.complaint_id),
            complaint_no: latest.complaint_no,
            subject: latest.subject,
            status: latest.status,
            updated_at: iso(latest.updated_at)!,
          }
        : null,
    };
  }

  /**
   * VM-004 rule 11. Admin: all recent activity. Others: what they did themselves, and activity on tasks they can see
   * on My Tasks and projects they can open.
   */
  async getRecentActivities(viewer: DashboardViewer, limit: number): Promise<DashboardActivityItem[]> {
    const me = viewer.emp_id;
    const scope = viewer.is_admin
      ? Prisma.sql`TRUE`
      : Prisma.sql`(
          l.performed_by = ${me}
          OR (l.entity_type = 'TASK' AND EXISTS (
            SELECT 1 FROM tasks t WHERE t.task_id = l.entity_id AND t.deleted_at IS NULL AND ${this.myTask(me)}))
          OR (l.entity_type = 'PROJECT' AND EXISTS (
            SELECT 1 FROM projects p WHERE p.project_id = l.entity_id AND p.deleted_at IS NULL AND ${this.projectAccess(viewer)}))
        )`;
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT l.log_id::text AS log_id, l.entity_type, l.entity_id, l.event, l.summary, e.name AS performed_by_name, l.performed_at
      FROM activity_logs l
      LEFT JOIN employees e ON e.emp_id = l.performed_by
      WHERE l.performed_at >= now() - make_interval(days => ${ACTIVITY_WINDOW_DAYS}::int) AND ${scope}
      ORDER BY l.performed_at DESC, l.log_id DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      log_id: r.log_id,
      entity_type: r.entity_type,
      entity_id: num(r.entity_id),
      event: r.event,
      summary: r.summary,
      performed_by_name: r.performed_by_name ?? null,
      performed_at: iso(r.performed_at)!,
    }));
  }

  /** VM-004 rule 12: the latest conversations, with the Messenger's own unread rule. */
  async getMessages(empId: number, limit: number): Promise<DashboardMessages> {
    const unreadSql = Prisma.sql`(
      SELECT count(*)::int FROM msg_message um
      WHERE um.conversation_id = c.conversation_id AND um.message_id > me.last_read_message_id
        AND um.sender_id IS DISTINCT FROM ${empId} AND um.kind <> 'system' AND um.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM msg_hidden h WHERE h.message_id = um.message_id AND h.emp_id = ${empId}))`;

    const [rows, [u]] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT c.conversation_id::int AS conversation_id, c.kind, c.name, c.last_message_at, me.marked_unread,
               peer.name AS peer_name, lm.kind AS lm_kind, lm.body AS lm_body, lm.file_name AS lm_file,
               lm.deleted_mode AS lm_deleted, lms.name AS lm_sender_name, ${unreadSql} AS unread_count
        FROM msg_conversation c
        JOIN msg_member me ON me.conversation_id = c.conversation_id AND me.emp_id = ${empId} AND me.left_at IS NULL
        LEFT JOIN LATERAL (
          SELECT pm.emp_id FROM msg_member pm
          WHERE c.kind = 'direct' AND pm.conversation_id = c.conversation_id AND pm.emp_id <> ${empId} LIMIT 1
        ) pm ON true
        LEFT JOIN employees peer ON peer.emp_id = pm.emp_id
        LEFT JOIN LATERAL (
          SELECT m.kind, m.body, m.file_name, m.sender_id, m.deleted_mode
          FROM msg_message m
          WHERE m.conversation_id = c.conversation_id
            AND NOT EXISTS (SELECT 1 FROM msg_hidden h WHERE h.message_id = m.message_id AND h.emp_id = ${empId})
          ORDER BY m.message_id DESC LIMIT 1
        ) lm ON true
        LEFT JOIN employees lms ON lms.emp_id = lm.sender_id
        WHERE me.is_archived = false AND lm.kind IS NOT NULL
        ORDER BY c.last_message_at DESC, c.conversation_id DESC
        LIMIT ${limit}`,
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*)::int AS unread_conversations FROM (
          SELECT me.marked_unread, ${unreadSql} AS unread_count
          FROM msg_conversation c
          JOIN msg_member me ON me.conversation_id = c.conversation_id AND me.emp_id = ${empId} AND me.left_at IS NULL
          WHERE me.is_archived = false
        ) s
        WHERE s.unread_count > 0 OR s.marked_unread = true`,
    ]);

    return {
      unread_conversations: num(u?.unread_conversations),
      items: rows.map((r) => {
        const deleted = Boolean(r.lm_deleted);
        const text = deleted ? null : r.lm_body ?? (r.lm_file ? `📎 ${r.lm_file}` : null);
        return {
          conversation_id: num(r.conversation_id),
          kind: r.kind,
          title: r.kind === 'direct' ? r.peer_name ?? 'Direct message' : r.name ?? 'Group',
          preview: deleted ? 'Message deleted' : text ? String(text).slice(0, 140) : null,
          sender_name: r.lm_kind === 'system' ? null : r.lm_sender_name ?? null,
          last_message_at: iso(r.last_message_at)!,
          unread_count: num(r.unread_count) + (r.marked_unread === true && num(r.unread_count) === 0 ? 1 : 0),
        };
      }),
    };
  }

  /** VM-004 rule 13: published internal articles the Knowledge Base would list for this person. */
  async getKnowledgeBase(viewer: DashboardViewer, limit: number): Promise<DashboardKbItem[]> {
    const me = viewer.emp_id;
    const audience = viewer.is_admin
      ? Prisma.sql`TRUE`
      : Prisma.sql`(
          a.audience_scope = 'ALL' OR a.owner_emp_id = ${me} OR a.created_by = ${me}
          OR ${viewer.dep_id}::int = ANY(a.audience_departments)
          OR (${viewer.role_id}::int IS NOT NULL AND ${viewer.role_id}::int = ANY(a.audience_roles))
          OR ${me}::int = ANY(a.audience_employees)
        )`;
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT a.article_id, a.article_code, v.title, v.summary, cat.name AS category_name,
             GREATEST(COALESCE(v.published_at, a.created_at), COALESCE(a.updated_at, a.created_at)) AS updated_at
      FROM kb_articles a
      JOIN kb_article_versions v ON v.version_id = a.current_published_version_id
      LEFT JOIN kb_categories cat ON cat.category_id = a.category_id
      WHERE a.deleted_at IS NULL AND a.is_archived = false AND a.space = 'INTERNAL' AND ${audience}
      ORDER BY 6 DESC, a.article_id DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      article_id: num(r.article_id),
      article_code: r.article_code,
      title: r.title,
      summary: r.summary ?? null,
      category_name: r.category_name ?? null,
      updated_at: iso(r.updated_at)!,
    }));
  }

  // ---------------------------------------------------------------------------
  // Assignment-based sections
  // ---------------------------------------------------------------------------

  async getManagedProjects(empId: number): Promise<ManagedProjectsSection> {
    const managed = Prisma.sql`p.project_manager_id = ${empId} AND p.deleted_at IS NULL`;
    const [[c], [tk], stages, projects, progressRows, overdue, workload] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*)::int AS managed,
               count(*) FILTER (WHERE p.project_status = 'in_progress')::int AS in_progress,
               count(*) FILTER (WHERE p.project_status = 'delivered')::int AS delivered,
               count(*) FILTER (WHERE p.project_status = 'on_hold')::int AS on_hold
        FROM projects p WHERE ${managed}`,
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE t.stage <> 'completed' AND t.due_date < CURRENT_DATE)::int AS overdue,
               count(*) FILTER (WHERE t.stage = 'requested')::int AS awaiting
        FROM tasks t JOIN projects p ON p.project_id = t.project_id
        WHERE ${managed} AND t.deleted_at IS NULL AND t.parent_task_id IS NULL`,
      this.prisma.$queryRaw<Row[]>`
        SELECT t.stage::text AS key, count(*)::int AS count
        FROM tasks t JOIN projects p ON p.project_id = t.project_id
        WHERE ${managed} AND t.deleted_at IS NULL AND t.parent_task_id IS NULL
        GROUP BY t.stage ORDER BY t.stage`,
      this.prisma.$queryRaw<Row[]>`
        SELECT p.project_id, p.project_no, p.project_name, p.project_status::text AS project_status,
               to_char(p.deadline, 'YYYY-MM-DD') AS deadline, COALESCE(p.updated_at, p.created_at) AS updated_at,
               pt.total AS task_total, pt.done AS task_done
        FROM projects p ${this.projectProgressJoin}
        WHERE ${managed}
        ORDER BY COALESCE(p.updated_at, p.created_at) DESC, p.project_id DESC
        LIMIT 5`,
      this.prisma.$queryRaw<Row[]>`
        SELECT pt.total AS task_total, pt.done AS task_done
        FROM projects p ${this.projectProgressJoin}
        WHERE ${managed} AND p.project_status NOT IN ('cancelled')`,
      this.prisma.$queryRaw<Row[]>`
        SELECT t.task_id, t.title, p.project_id, p.project_name, t.priority::text AS priority,
               to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
               (SELECT string_agg(e.name, ', ' ORDER BY e.name) FROM task_assignees ta JOIN employees e ON e.emp_id = ta.employee_id
                WHERE ta.task_id = t.task_id AND ta.deleted_at IS NULL) AS assignees
        FROM tasks t JOIN projects p ON p.project_id = t.project_id
        WHERE ${managed} AND t.deleted_at IS NULL AND t.stage <> 'completed' AND t.due_date < CURRENT_DATE
        ORDER BY t.due_date ASC, t.task_id ASC
        LIMIT 5`,
      this.prisma.$queryRaw<Row[]>`
        SELECT e.emp_id, e.name,
               count(DISTINCT t.task_id)::int AS assigned,
               count(DISTINCT t.task_id) FILTER (WHERE t.stage <> 'completed')::int AS pending,
               count(DISTINCT t.task_id) FILTER (WHERE t.stage <> 'completed' AND t.due_date < CURRENT_DATE)::int AS overdue,
               COALESCE(sum(t.allocated_minutes) FILTER (WHERE t.stage <> 'completed'), 0)::int AS allocated_minutes
        FROM tasks t
        JOIN projects p ON p.project_id = t.project_id
        JOIN task_assignees ta ON ta.task_id = t.task_id AND ta.deleted_at IS NULL
        JOIN employees e ON e.emp_id = ta.employee_id
        WHERE ${managed} AND t.deleted_at IS NULL
        GROUP BY e.emp_id, e.name
        ORDER BY pending DESC, e.name ASC
        LIMIT 8`,
    ]);

    const withTasks = progressRows.filter((r) => num(r.task_total) > 0);
    const average = withTasks.length
      ? Math.round(withTasks.reduce((s, r) => s + (num(r.task_done) / num(r.task_total)) * 100, 0) / withTasks.length)
      : null;

    return {
      counts: { managed: num(c?.managed), in_progress: num(c?.in_progress), delivered: num(c?.delivered), on_hold: num(c?.on_hold) },
      project_tasks: num(tk?.total),
      overdue_tasks: num(tk?.overdue),
      awaiting_approval: num(tk?.awaiting),
      average_progress: average,
      task_stages: counts(stages),
      projects: projects.map((r) => this.toProject(r)),
      overdue_list: overdue.map((r) => ({
        task_id: num(r.task_id),
        title: r.title,
        project_id: num(r.project_id),
        project_name: r.project_name,
        assignees: r.assignees ?? null,
        priority: r.priority,
        due_date: r.due_date,
      })),
      workload: workload.map((r) => ({
        emp_id: num(r.emp_id),
        name: r.name,
        assigned: num(r.assigned),
        pending: num(r.pending),
        overdue: num(r.overdue),
        allocated_minutes: num(r.allocated_minutes),
      })),
    };
  }

  /** The "pending" tab of Expense Claims for an Authorised Approver: routed to them or from their departments. */
  async getExpenseApprovals(empId: number, deptIds: number[]): Promise<ExpenseApprovalsSection> {
    const scope = Prisma.sql`c.deleted_at IS NULL AND c.status = 'SUBMITTED'
      AND (c.approver_emp_id = ${empId} OR e.dep_id = ANY(${deptIds}::int[]))`;
    const [[c], items] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*)::int AS waiting_count, COALESCE(sum(c.amount), 0)::float8 AS waiting_amount,
               COALESCE(max(CURRENT_DATE - c.submitted_at::date), 0)::int AS oldest_waiting_days
        FROM expense_claims c JOIN employees e ON e.emp_id = c.emp_id
        WHERE ${scope}`,
      this.prisma.$queryRaw<Row[]>`
        SELECT c.claim_id, c.claim_no, e.name AS employee_name, d.name AS department_name, c.amount::float8 AS amount, c.submitted_at
        FROM expense_claims c
        JOIN employees e ON e.emp_id = c.emp_id
        LEFT JOIN departments d ON d.dep_id = e.dep_id
        WHERE ${scope}
        ORDER BY c.submitted_at ASC NULLS LAST, c.claim_id ASC
        LIMIT 5`,
    ]);
    return {
      waiting_count: num(c?.waiting_count),
      waiting_amount: num(c?.waiting_amount),
      oldest_waiting_days: num(c?.oldest_waiting_days),
      items: items.map((r) => ({
        claim_id: num(r.claim_id),
        claim_no: r.claim_no ?? null,
        employee_name: r.employee_name,
        department_name: r.department_name ?? null,
        amount: numOrNull(r.amount),
        submitted_at: iso(r.submitted_at),
      })),
    };
  }

  async getAssignedComplaints(empId: number): Promise<AssignedComplaintsSection> {
    const [[c], items] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT count(*) FILTER (WHERE status = ANY(${OPEN_COMPLAINT_STATUSES}::text[]))::int AS open,
               count(*) FILTER (WHERE status = ANY(${OPEN_COMPLAINT_STATUSES}::text[]) AND target_date < CURRENT_DATE)::int AS overdue,
               count(*) FILTER (WHERE status = 'Resolved')::int AS awaiting_confirmation
        FROM complaints WHERE handler_id = ${empId} AND deleted_at IS NULL`,
      this.prisma.$queryRaw<Row[]>`
        SELECT complaint_id, complaint_no, subject, priority, status, to_char(target_date, 'YYYY-MM-DD') AS target_date,
               (target_date < CURRENT_DATE) AS overdue
        FROM complaints
        WHERE handler_id = ${empId} AND deleted_at IS NULL AND status = ANY(${OPEN_COMPLAINT_STATUSES}::text[])
        ORDER BY target_date ASC NULLS LAST, complaint_id ASC
        LIMIT 5`,
    ]);
    return {
      open: num(c?.open),
      overdue: num(c?.overdue),
      awaiting_confirmation: num(c?.awaiting_confirmation),
      items: items.map((r) => ({
        complaint_id: num(r.complaint_id),
        complaint_no: r.complaint_no,
        subject: r.subject,
        priority: r.priority ?? null,
        status: r.status,
        target_date: r.target_date ?? null,
        overdue: r.overdue === true,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Role sections (decided by the use case from Admin / Sales access)
  // ---------------------------------------------------------------------------

  async getAdminSection(): Promise<AdminSection> {
    const q = <T = Row[]>(sql: Prisma.Sql) => this.prisma.$queryRaw<T>(sql);
    const now = new Date();
    const overdueBefore = new Date(now.getTime() - FOLLOW_UP_OVERDUE_GRACE_MS);
    const today = istDayRange(now);
    const followUpOverdue = Prisma.sql`(f.status = 'Overdue' OR (f.status = 'Pending' AND f.follow_up_on < ${overdueBefore}))`;

    const [
      [emp],
      deps,
      [cand],
      candStages,
      projStatuses,
      [task],
      taskStages,
      taskPriorities,
      [sales],
      leadStages,
      [leave],
      [payroll],
      [exp],
      [cmp],
      approvals,
      overdueTasks,
      attention,
      recentLeads,
      complaintQueue,
    ] = await Promise.all([
      q(Prisma.sql`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE status = 'Active')::int AS active,
               count(*) FILTER (WHERE status = 'Inactive')::int AS inactive,
               count(*) FILTER (WHERE status = 'Onboarding')::int AS onboarding
        FROM employees WHERE deleted_at IS NULL`),
      q(Prisma.sql`
        SELECT d.dep_id AS id, COALESCE(d.name, 'No department') AS key, count(*)::int AS count
        FROM employees e LEFT JOIN departments d ON d.dep_id = e.dep_id
        WHERE e.deleted_at IS NULL AND e.status = 'Active'
        GROUP BY d.dep_id, d.name ORDER BY 3 DESC, 2 ASC`),
      q(Prisma.sql`
        SELECT count(*)::int AS total, count(*) FILTER (WHERE replace(lower(btrim(stage)), '_', ' ') = ANY(${OPEN_CANDIDATE_STAGES}::text[]))::int AS open
        FROM candidates`),
      q(Prisma.sql`SELECT stage AS key, count(*)::int AS count FROM candidates GROUP BY stage ORDER BY 2 DESC`),
      q(Prisma.sql`
        SELECT project_status::text AS key, count(*)::int AS count FROM projects
        WHERE deleted_at IS NULL GROUP BY project_status ORDER BY project_status`),
      // Same scope as the Admin task board: top-level tasks
      q(Prisma.sql`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE stage <> 'completed' AND due_date < CURRENT_DATE)::int AS overdue,
               count(*) FILTER (WHERE stage <> 'completed' AND due_date = CURRENT_DATE)::int AS due_today,
               count(*) FILTER (WHERE stage = 'requested')::int AS awaiting_review
        FROM tasks WHERE deleted_at IS NULL AND parent_task_id IS NULL`),
      q(Prisma.sql`
        SELECT stage::text AS key, count(*)::int AS count FROM tasks
        WHERE deleted_at IS NULL AND parent_task_id IS NULL GROUP BY stage ORDER BY stage`),
      q(Prisma.sql`
        SELECT priority::text AS key, count(*)::int AS count FROM tasks
        WHERE deleted_at IS NULL AND parent_task_id IS NULL AND stage <> 'completed' GROUP BY priority ORDER BY priority`),
      // Company Database counters, same definitions as the Sales Company list
      q(Prisma.sql`
        SELECT
          (SELECT count(*)::int FROM companies co WHERE co.deleted_at IS NULL) AS companies,
          (SELECT count(*)::int FROM companies co WHERE co.deleted_at IS NULL AND COALESCE(co.is_client, false) = false
             AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.company_id = co.company_id AND l.deleted_at IS NULL
                             AND l.lead_stage = ANY(${OPEN_LEAD_STAGES}::text[]))) AS not_yet_lead,
          (SELECT count(*)::int FROM leads l WHERE l.deleted_at IS NULL) AS leads,
          (SELECT count(*)::int FROM leads l WHERE l.deleted_at IS NULL AND l.lead_stage = ANY(${OPEN_LEAD_STAGES}::text[])) AS open_leads,
          (SELECT count(*)::int FROM clients cl WHERE cl.deleted_at IS NULL) AS clients,
          (SELECT count(*)::int FROM crm_follow_ups f WHERE f.deleted_at IS NULL AND f.status IN ('Pending', 'Overdue')
             AND f.follow_up_on >= ${today.from} AND f.follow_up_on < ${today.to} AND NOT ${followUpOverdue}) AS follow_ups_today,
          (SELECT count(*)::int FROM crm_follow_ups f WHERE f.deleted_at IS NULL AND ${followUpOverdue}) AS follow_ups_overdue`),
      q(Prisma.sql`
        SELECT COALESCE(lead_stage, 'Unknown') AS key, count(*)::int AS count FROM leads
        WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`),
      q(Prisma.sql`
        SELECT count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
               count(*) FILTER (WHERE status = 'CANCELLATION_REQUESTED')::int AS cancellation_requests
        FROM leave_requests`),
      q(Prisma.sql`
        SELECT payroll_month, payroll_year, status::text AS status, total_employees, total_salary::float8 AS total_salary, attendance_locked
        FROM payroll_runs ORDER BY payroll_year DESC, payroll_month DESC LIMIT 1`),
      q(Prisma.sql`
        SELECT count(*) FILTER (WHERE status = 'SUBMITTED')::int AS pending_review,
               count(*) FILTER (WHERE status = 'APPROVED')::int AS approved_unpaid,
               count(*) FILTER (WHERE status = 'REIMBURSED')::int AS reimbursed
        FROM expense_claims WHERE deleted_at IS NULL`),
      q(Prisma.sql`
        SELECT count(*) FILTER (WHERE status = 'New')::int AS new,
               count(*) FILTER (WHERE status IN ('Open', 'In Progress'))::int AS in_progress,
               count(*) FILTER (WHERE status = ANY(${OPEN_COMPLAINT_STATUSES}::text[]) AND target_date < CURRENT_DATE)::int AS overdue,
               count(*) FILTER (WHERE status = 'Resolved')::int AS awaiting_confirmation
        FROM complaints WHERE deleted_at IS NULL`),
      q(Prisma.sql`
        SELECT * FROM (
          SELECT 'Leave' AS module, r.request_id AS record_id, r.request_no AS reference, e.name AS owner,
                 r.applied_at AS submitted_at, to_char(r.from_date, 'YYYY-MM-DD') AS due_date, r.status
          FROM leave_requests r JOIN employees e ON e.emp_id = r.emp_id
          WHERE r.status IN ('PENDING', 'CANCELLATION_REQUESTED')
          UNION ALL
          SELECT 'Expense', c.claim_id, COALESCE(c.claim_no, 'Claim #' || c.claim_id), e.name,
                 c.submitted_at, NULL, c.status
          FROM expense_claims c JOIN employees e ON e.emp_id = c.emp_id
          WHERE c.deleted_at IS NULL AND c.status = 'SUBMITTED'
          UNION ALL
          SELECT 'Task', t.task_id, t.task_code || ' · ' || t.title,
                 (SELECT string_agg(e.name, ', ' ORDER BY e.name) FROM task_assignees ta JOIN employees e ON e.emp_id = ta.employee_id
                  WHERE ta.task_id = t.task_id AND ta.deleted_at IS NULL),
                 t.requested_at, to_char(t.due_date, 'YYYY-MM-DD'), 'In Review'
          FROM tasks t WHERE t.deleted_at IS NULL AND t.stage = 'requested' AND t.parent_task_id IS NULL
        ) x
        ORDER BY x.submitted_at ASC NULLS LAST
        LIMIT 5`),
      q(Prisma.sql`
        SELECT t.task_id, t.title, t.project_id, pr.project_name, t.priority::text AS priority, t.stage::text AS stage,
               to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
               (SELECT string_agg(e.name, ', ' ORDER BY e.name) FROM task_assignees ta JOIN employees e ON e.emp_id = ta.employee_id
                WHERE ta.task_id = t.task_id AND ta.deleted_at IS NULL) AS assignees
        FROM tasks t LEFT JOIN projects pr ON pr.project_id = t.project_id
        WHERE t.deleted_at IS NULL AND t.parent_task_id IS NULL AND t.stage <> 'completed' AND t.due_date < CURRENT_DATE
        ORDER BY t.due_date ASC, t.task_id ASC
        LIMIT 5`),
      q(Prisma.sql`
        SELECT p.project_id, p.project_name, m.name AS manager_name, p.project_status::text AS project_status,
               to_char(p.deadline, 'YYYY-MM-DD') AS deadline, COALESCE(p.updated_at, p.created_at) AS updated_at,
               pt.total AS task_total, pt.done AS task_done
        FROM projects p
        LEFT JOIN employees m ON m.emp_id = p.project_manager_id
        ${this.projectProgressJoin}
        WHERE p.deleted_at IS NULL AND p.project_status NOT IN ('delivered', 'cancelled')
          AND (p.deadline < CURRENT_DATE OR p.project_status IN ('on_hold', 'pending'))
        ORDER BY p.deadline ASC, p.project_id ASC
        LIMIT 5`),
      q(Prisma.sql`
        SELECT l.lead_id, COALESCE(l.company_name, co.name) AS company, o.name AS owner_name, l.lead_stage,
               l.next_follow_up_at, COALESCE(l.updated_at, l.created_at) AS updated_at
        FROM leads l
        LEFT JOIN companies co ON co.company_id = l.company_id
        LEFT JOIN employees o ON o.emp_id = l.lead_by_id
        WHERE l.deleted_at IS NULL
        ORDER BY COALESCE(l.updated_at, l.created_at) DESC, l.lead_id DESC
        LIMIT 5`),
      q(Prisma.sql`
        SELECT c.complaint_id, c.complaint_no, c.subject, d.name AS department_name, h.name AS handler_name, c.priority,
               to_char(c.target_date, 'YYYY-MM-DD') AS target_date, c.status
        FROM complaints c
        LEFT JOIN departments d ON d.dep_id = c.related_department_id
        LEFT JOIN employees h ON h.emp_id = c.handler_id
        WHERE c.deleted_at IS NULL AND c.status = ANY(${OPEN_COMPLAINT_STATUSES}::text[])
        ORDER BY c.target_date ASC NULLS LAST, c.complaint_id ASC
        LIMIT 5`),
    ]);

    const statuses = counts(projStatuses);
    const statusCount = (k: string) => statuses.find((s) => s.key === k)?.count ?? 0;

    return {
      employees: { total: num(emp?.total), active: num(emp?.active), inactive: num(emp?.inactive), onboarding: num(emp?.onboarding) },
      department_distribution: counts(deps),
      recruitment: { total: num(cand?.total), open: num(cand?.open), stages: counts(candStages) },
      projects: {
        total: statuses.reduce((s, x) => s + x.count, 0),
        in_progress: statusCount('in_progress'),
        delivered: statusCount('delivered'),
        on_hold: statusCount('on_hold'),
        statuses,
      },
      tasks: {
        total: num(task?.total),
        overdue: num(task?.overdue),
        due_today: num(task?.due_today),
        awaiting_review: num(task?.awaiting_review),
        stages: counts(taskStages),
        priorities: counts(taskPriorities),
      },
      sales: {
        companies: num(sales?.companies),
        not_yet_lead: num(sales?.not_yet_lead),
        leads: num(sales?.leads),
        open_leads: num(sales?.open_leads),
        clients: num(sales?.clients),
        stages: counts(leadStages),
        follow_ups_today: num(sales?.follow_ups_today),
        follow_ups_overdue: num(sales?.follow_ups_overdue),
      },
      leave: { pending: num(leave?.pending), cancellation_requests: num(leave?.cancellation_requests) },
      payroll: payroll
        ? {
            payroll_month: num(payroll.payroll_month),
            payroll_year: num(payroll.payroll_year),
            status: payroll.status,
            total_employees: num(payroll.total_employees),
            total_salary: num(payroll.total_salary),
            attendance_locked: payroll.attendance_locked === true,
          }
        : null,
      expenses: { pending_review: num(exp?.pending_review), approved_unpaid: num(exp?.approved_unpaid), reimbursed: num(exp?.reimbursed) },
      complaints: {
        new: num(cmp?.new),
        in_progress: num(cmp?.in_progress),
        overdue: num(cmp?.overdue),
        awaiting_confirmation: num(cmp?.awaiting_confirmation),
      },
      pending_approvals: approvals.map((r) => ({
        module: r.module,
        record_id: num(r.record_id),
        reference: r.reference,
        owner: r.owner ?? '—',
        submitted_at: iso(r.submitted_at),
        due_date: r.due_date ?? null,
        status: r.status,
      })),
      overdue_tasks: overdueTasks.map((r) => ({
        task_id: num(r.task_id),
        title: r.title,
        project_id: numOrNull(r.project_id),
        project_name: r.project_name ?? null,
        assignees: r.assignees ?? null,
        priority: r.priority,
        due_date: r.due_date,
        stage: r.stage,
      })),
      projects_attention: attention.map((r) => {
        const p = this.toProject(r);
        return {
          project_id: p.project_id,
          project_name: p.project_name,
          manager_name: r.manager_name ?? null,
          project_status: p.project_status,
          progress: p.progress,
          deadline: r.deadline,
          updated_at: p.updated_at,
        };
      }),
      recent_leads: recentLeads.map((r) => ({
        lead_id: num(r.lead_id),
        company: r.company ?? null,
        owner_name: r.owner_name ?? null,
        lead_stage: r.lead_stage ?? null,
        next_follow_up_at: iso(r.next_follow_up_at),
        updated_at: iso(r.updated_at),
      })),
      complaint_queue: complaintQueue.map((r) => ({
        complaint_id: num(r.complaint_id),
        complaint_no: r.complaint_no,
        subject: r.subject,
        department_name: r.department_name ?? null,
        handler_name: r.handler_name ?? null,
        priority: r.priority ?? null,
        target_date: r.target_date ?? null,
        status: r.status,
      })),
    };
  }

  /**
   * Sales User view (VM-004 section 09). Company Database counters are the ones every Sales user already sees on the
   * Companies screen. Lead and client figures are the person's own (the Leads list scope for a non-admin), and
   * follow-ups use the Follow-ups screen scope.
   */
  async getSalesSection(empId: number): Promise<SalesSection> {
    const q = <T = Row[]>(sql: Prisma.Sql) => this.prisma.$queryRaw<T>(sql);
    const now = new Date();
    const overdueBefore = new Date(now.getTime() - FOLLOW_UP_OVERDUE_GRACE_MS);
    const today = istDayRange(now);
    const followUpScope = Prisma.sql`f.deleted_at IS NULL AND (
      f.assigned_to = ${empId}
      OR EXISTS (SELECT 1 FROM leads fl WHERE fl.lead_id = f.lead_id AND fl.lead_by_id = ${empId})
      OR (f.lead_id IS NULL AND f.created_by = ${empId}))`;
    const followUpOverdue = Prisma.sql`(f.status = 'Overdue' OR (f.status = 'Pending' AND f.follow_up_on < ${overdueBefore}))`;
    const myLead = Prisma.sql`l.deleted_at IS NULL AND l.lead_by_id = ${empId}`;

    const [[c], stages, leads, followUps] = await Promise.all([
      q(Prisma.sql`
        SELECT
          (SELECT count(*)::int FROM companies co WHERE co.deleted_at IS NULL) AS companies,
          (SELECT count(*)::int FROM companies co WHERE co.deleted_at IS NULL AND COALESCE(co.is_client, false) = false
             AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.company_id = co.company_id AND l.deleted_at IS NULL
                             AND l.lead_stage = ANY(${OPEN_LEAD_STAGES}::text[]))) AS not_yet_lead,
          (SELECT count(*)::int FROM leads l WHERE ${myLead}) AS my_leads,
          (SELECT count(*)::int FROM leads l WHERE ${myLead} AND l.lead_stage = ANY(${OPEN_LEAD_STAGES}::text[])) AS open_leads,
          (SELECT count(*)::int FROM leads l WHERE ${myLead} AND l.lead_stage = 'Converted') AS converted,
          (SELECT count(*)::int FROM crm_follow_ups f WHERE ${followUpScope} AND f.status IN ('Pending', 'Overdue')
             AND f.follow_up_on >= ${today.from} AND f.follow_up_on < ${today.to} AND NOT ${followUpOverdue}) AS follow_ups_today,
          (SELECT count(*)::int FROM crm_follow_ups f WHERE ${followUpScope} AND ${followUpOverdue}) AS follow_ups_overdue,
          (SELECT count(*)::int FROM clients cl WHERE cl.deleted_at IS NULL AND cl.owner_id = ${empId}) AS my_clients,
          (SELECT count(*)::int FROM clients cl WHERE cl.deleted_at IS NULL AND cl.owner_id = ${empId}
             AND date_trunc('month', cl.won_on) = date_trunc('month', (now() AT TIME ZONE ${APP_TIMEZONE})::date)) AS won_this_month,
          (SELECT count(*)::int FROM clients cl WHERE cl.deleted_at IS NULL AND cl.owner_id = ${empId}
             AND date_trunc('year', cl.won_on) = date_trunc('year', (now() AT TIME ZONE ${APP_TIMEZONE})::date)) AS won_this_year`),
      q(Prisma.sql`
        SELECT COALESCE(l.lead_stage, 'Unknown') AS key, count(*)::int AS count FROM leads l
        WHERE ${myLead} GROUP BY 1 ORDER BY 2 DESC`),
      q(Prisma.sql`
        SELECT l.lead_id, COALESCE(l.company_name, co.name) AS company, l.contact_person AS contact, l.lead_stage,
               l.lead_source, l.next_follow_up_at
        FROM leads l LEFT JOIN companies co ON co.company_id = l.company_id
        WHERE ${myLead} AND l.lead_stage = ANY(${OPEN_LEAD_STAGES}::text[])
        ORDER BY l.next_follow_up_at ASC NULLS LAST, COALESCE(l.updated_at, l.created_at) DESC
        LIMIT 5`),
      q(Prisma.sql`
        SELECT f.follow_up_id, f.lead_id, COALESCE(fl.company_name, co.name) AS company, f.contact_person_name AS contact,
               f.type, f.follow_up_on, f.purpose,
               CASE WHEN ${followUpOverdue} THEN 'Overdue' ELSE f.status END AS status
        FROM crm_follow_ups f
        LEFT JOIN leads fl ON fl.lead_id = f.lead_id
        LEFT JOIN companies co ON co.company_id = COALESCE(f.company_id, fl.company_id)
        WHERE ${followUpScope} AND f.status IN ('Pending', 'Overdue')
        ORDER BY f.follow_up_on ASC, f.follow_up_id ASC
        LIMIT 5`),
    ]);

    return {
      companies: num(c?.companies),
      not_yet_lead: num(c?.not_yet_lead),
      my_leads: num(c?.my_leads),
      open_leads: num(c?.open_leads),
      converted: num(c?.converted),
      stages: counts(stages),
      follow_ups_today: num(c?.follow_ups_today),
      follow_ups_overdue: num(c?.follow_ups_overdue),
      my_clients: num(c?.my_clients),
      won_this_month: num(c?.won_this_month),
      won_this_year: num(c?.won_this_year),
      leads: leads.map((r) => ({
        lead_id: num(r.lead_id),
        company: r.company ?? null,
        contact: r.contact ?? null,
        lead_stage: r.lead_stage ?? null,
        lead_source: r.lead_source ?? null,
        next_follow_up_at: iso(r.next_follow_up_at),
      })),
      follow_ups: followUps.map((r) => ({
        follow_up_id: num(r.follow_up_id),
        lead_id: numOrNull(r.lead_id),
        company: r.company ?? null,
        contact: r.contact ?? null,
        type: r.type,
        follow_up_on: iso(r.follow_up_on)!,
        purpose: r.purpose ?? null,
        status: r.status,
      })),
    };
  }
}
