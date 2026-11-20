import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { PayrollSection, PeopleScope, PeopleSection } from '../application/ports/home-dashboard.repository.port';

type Row = Record<string, any>;

const APP_TIMEZONE = 'Asia/Kolkata';
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const iso = (v: unknown): string | null => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v));
const counts = (rows: Row[]) => rows.map((r) => ({ key: String(r.key ?? 'Unknown'), count: num(r.count), ...(r.id !== undefined ? { id: r.id === null ? null : Number(r.id) } : {}) }));

/** Candidate stages are stored in lower case with spaces or underscores. */
const STAGE = Prisma.sql`replace(lower(btrim(c.stage)), '_', ' ')`;
const OPEN_STAGES = ['new', 'open', 'screening', 'interviewing', 'interview', 'on hold', 'selected', 'onboarding'];
const INTERVIEW_STAGES = ['interviewing', 'interview'];
const ACTION_STAGES = ['interviewing', 'interview', 'selected', 'onboarding'];
const DECISION_STAGES = ['interviewing', 'interview', 'selected', 'on hold'];

/**
 * Read-only queries for the HR, Recruiter and Leadership dashboards (BFD VM-004 sections 02 to 05).
 * Salary, PF and every other payroll field are never selected here. Which parts a designation gets is decided by the
 * use case (`PeopleScope`), not by the browser.
 */
export async function getPeopleSection(prisma: PrismaService, scope: PeopleScope): Promise<PeopleSection> {
  const q = (sql: Prisma.Sql) => prisma.$queryRaw<Row[]>(sql);
  const today = Prisma.sql`(now() AT TIME ZONE ${APP_TIMEZONE})::date`;
  const out: PeopleSection = { employees: null, candidates: null, attendance: null, leave: null, onboarding: null, documents: null };

  const missingDoc = Prisma.sql`COALESCE(d.is_required_for_activation, false) AND COALESCE(d.status, 'not_ticked') NOT IN ('uploaded', 'final', 'locked')`;

  const jobs: Array<Promise<void>> = [];

  if (scope.employees) {
    jobs.push(
      (async () => {
        const [[c], departments, designations, monthly, recent] = await Promise.all([
          q(Prisma.sql`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE status = 'Active')::int AS active,
                   count(*) FILTER (WHERE status = 'Inactive')::int AS inactive,
                   count(*) FILTER (WHERE status = 'Onboarding')::int AS onboarding,
                   count(*) FILTER (WHERE joining_date >= date_trunc('month', ${today})::date AND joining_date <= ${today})::int AS new_joiners
            FROM employees WHERE deleted_at IS NULL`),
          q(Prisma.sql`
            SELECT d.dep_id AS id, COALESCE(d.name, 'No department') AS key, count(*)::int AS count
            FROM employees e LEFT JOIN departments d ON d.dep_id = e.dep_id
            WHERE e.deleted_at IS NULL AND e.status = 'Active' GROUP BY d.dep_id, d.name ORDER BY 3 DESC, 2 ASC LIMIT 10`),
          q(Prisma.sql`
            SELECT r.role_id AS id, COALESCE(r.role_name, 'No designation') AS key, count(*)::int AS count
            FROM employees e LEFT JOIN roles r ON r.role_id = e.role_id
            WHERE e.deleted_at IS NULL AND e.status = 'Active' GROUP BY r.role_id, r.role_name ORDER BY 3 DESC, 2 ASC LIMIT 10`),
          q(Prisma.sql`
            SELECT to_char(m.month, 'YYYY-MM') AS month,
                   (SELECT count(*)::int FROM employees e WHERE e.deleted_at IS NULL AND date_trunc('month', e.joining_date::timestamptz) = m.month) AS joined
            FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS m(month)
            ORDER BY m.month`),
          q(Prisma.sql`
            SELECT e.emp_id, e.name, r.role_name, d.name AS department_name, to_char(e.joining_date, 'YYYY-MM-DD') AS joining_date, e.status::text AS status
            FROM employees e LEFT JOIN roles r ON r.role_id = e.role_id LEFT JOIN departments d ON d.dep_id = e.dep_id
            WHERE e.deleted_at IS NULL ORDER BY e.joining_date DESC, e.emp_id DESC LIMIT 5`),
        ]);
        out.employees = {
          total: num(c?.total),
          active: num(c?.active),
          inactive: num(c?.inactive),
          onboarding: num(c?.onboarding),
          new_joiners: num(c?.new_joiners),
          departments: counts(departments),
          designations: counts(designations),
          monthly_joining: monthly.map((r) => ({ month: r.month, joined: num(r.joined) })),
          recent: recent.map((r) => ({
            emp_id: num(r.emp_id),
            name: r.name,
            role_name: r.role_name ?? null,
            department_name: r.department_name ?? null,
            joining_date: r.joining_date ?? null,
            status: r.status,
          })),
        };
      })(),
    );
  }

  if (scope.candidates) {
    jobs.push(
      (async () => {
        const [[c], stages, byPosition, bySource, recent, decisions] = await Promise.all([
          q(Prisma.sql`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE ${STAGE} IN ('new', 'open'))::int AS new,
                   count(*) FILTER (WHERE ${STAGE} = ANY(${INTERVIEW_STAGES}::text[]))::int AS interviewing,
                   count(*) FILTER (WHERE ${STAGE} = 'selected')::int AS selected,
                   count(*) FILTER (WHERE ${STAGE} = 'on hold')::int AS on_hold,
                   count(*) FILTER (WHERE ${STAGE} = ANY(${OPEN_STAGES}::text[]))::int AS in_process,
                   count(*) FILTER (WHERE ${STAGE} = ANY(${ACTION_STAGES}::text[]))::int AS requiring_action,
                   count(*) FILTER (WHERE ${STAGE} = ANY(${OPEN_STAGES}::text[]) AND COALESCE(c.on_hold_review_date, c.review_on_date) < ${today})::int AS overdue_review
            FROM candidates c`),
          q(Prisma.sql`SELECT c.stage AS key, count(*)::int AS count FROM candidates c GROUP BY c.stage ORDER BY 2 DESC`),
          q(Prisma.sql`
            SELECT COALESCE(r.role_name, 'Not set') AS key, count(*)::int AS count
            FROM candidates c LEFT JOIN roles r ON r.role_id = c.role_id GROUP BY 1 ORDER BY 2 DESC, 1 ASC LIMIT 8`),
          q(Prisma.sql`SELECT COALESCE(NULLIF(btrim(c.source), ''), 'Unknown') AS key, count(*)::int AS count FROM candidates c GROUP BY 1 ORDER BY 2 DESC, 1 ASC LIMIT 8`),
          q(Prisma.sql`
            SELECT c.candidate_id, c.name, r.role_name AS position, c.source, c.stage, COALESCE(c.updated_at, c.created_at) AS updated_at
            FROM candidates c LEFT JOIN roles r ON r.role_id = c.role_id
            ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.candidate_id DESC LIMIT 5`),
          q(Prisma.sql`
            SELECT c.candidate_id, c.name, r.role_name AS position, c.stage,
                   to_char(COALESCE(c.review_on_date, c.on_hold_review_date), 'YYYY-MM-DD') AS review_date
            FROM candidates c LEFT JOIN roles r ON r.role_id = c.role_id
            WHERE ${STAGE} = ANY(${DECISION_STAGES}::text[])
            ORDER BY COALESCE(c.review_on_date, c.on_hold_review_date) ASC NULLS LAST, c.candidate_id ASC LIMIT 5`),
        ]);
        out.candidates = {
          total: num(c?.total),
          new: num(c?.new),
          interviewing: num(c?.interviewing),
          selected: num(c?.selected),
          on_hold: num(c?.on_hold),
          in_process: num(c?.in_process),
          requiring_action: num(c?.requiring_action),
          overdue_review: num(c?.overdue_review),
          stages: counts(stages),
          by_position: counts(byPosition),
          by_source: counts(bySource),
          recent: recent.map((r) => ({
            candidate_id: num(r.candidate_id),
            name: r.name,
            position: r.position ?? null,
            source: r.source ?? null,
            stage: r.stage,
            updated_at: iso(r.updated_at),
          })),
          decisions: decisions.map((r) => ({
            candidate_id: num(r.candidate_id),
            name: r.name,
            position: r.position ?? null,
            stage: r.stage,
            review_date: r.review_date ?? null,
          })),
        };
      })(),
    );
  }

  if (scope.attendance) {
    jobs.push(
      (async () => {
        const [[a], regs] = await Promise.all([
          q(Prisma.sql`
            SELECT
              (SELECT count(*)::int FROM employees e WHERE e.deleted_at IS NULL AND e.status = 'Active') AS active,
              (SELECT count(DISTINCT x.emp_id)::int FROM attendance_days x JOIN employees e ON e.emp_id = x.emp_id AND e.deleted_at IS NULL AND e.status = 'Active'
                WHERE x.deleted_at IS NULL AND x.work_date = ${today} AND x.check_in_at IS NOT NULL) AS present_today,
              (SELECT count(DISTINCT x.emp_id)::int FROM attendance_days x JOIN employees e ON e.emp_id = x.emp_id AND e.deleted_at IS NULL AND e.status = 'Active'
                WHERE x.deleted_at IS NULL AND x.work_date = ${today} AND x.check_in_at IS NOT NULL AND x.check_out_at IS NULL) AS still_working,
              (SELECT count(DISTINCT d.emp_id)::int FROM leave_request_days d JOIN leave_requests r ON r.request_id = d.request_id
                JOIN employees e ON e.emp_id = d.emp_id AND e.deleted_at IS NULL AND e.status = 'Active'
                WHERE r.status = 'APPROVED' AND d.leave_date = ${today}) AS on_leave,
              (SELECT count(*)::int FROM attendance_corrections k WHERE k.deleted_at IS NULL AND k.decided_at IS NULL) AS regularization_pending`),
          q(Prisma.sql`
            SELECT k.correction_id, e.name AS employee_name, to_char(k.work_date, 'YYYY-MM-DD') AS work_date, k.reason, k.created_at AS submitted_at
            FROM attendance_corrections k JOIN employees e ON e.emp_id = k.emp_id
            WHERE k.deleted_at IS NULL AND k.decided_at IS NULL ORDER BY k.created_at ASC, k.correction_id ASC LIMIT 5`),
        ]);
        out.attendance = {
          active: num(a?.active),
          present_today: num(a?.present_today),
          still_working: num(a?.still_working),
          on_leave: num(a?.on_leave),
          not_yet_in: Math.max(num(a?.active) - num(a?.present_today) - num(a?.on_leave), 0),
          regularization_pending: num(a?.regularization_pending),
          regularizations: regs.map((r) => ({
            correction_id: num(r.correction_id),
            employee_name: r.employee_name,
            work_date: r.work_date,
            reason: r.reason,
            submitted_at: iso(r.submitted_at),
          })),
        };
      })(),
    );
  }

  if (scope.leave) {
    jobs.push(
      (async () => {
        const [[c], rows] = await Promise.all([
          q(Prisma.sql`SELECT count(*)::int AS pending FROM leave_requests WHERE status IN ('PENDING', 'CANCELLATION_REQUESTED')`),
          q(Prisma.sql`
            SELECT r.request_id, e.name AS employee_name, dep.name AS department_name, t.name AS leave_type_name,
                   to_char(r.from_date, 'YYYY-MM-DD') AS from_date, to_char(r.to_date, 'YYYY-MM-DD') AS to_date,
                   r.leave_days::float8 AS days, r.applied_at AS submitted_at, r.status
            FROM leave_requests r
            JOIN employees e ON e.emp_id = r.emp_id
            LEFT JOIN departments dep ON dep.dep_id = e.dep_id
            LEFT JOIN leave_types t ON t.leave_type_id = r.leave_type_id
            WHERE r.status IN ('PENDING', 'CANCELLATION_REQUESTED') ORDER BY r.applied_at ASC, r.request_id ASC LIMIT 5`),
        ]);
        out.leave = {
          pending: num(c?.pending),
          rows: rows.map((r) => ({
            request_id: num(r.request_id),
            employee_name: r.employee_name,
            department_name: r.department_name ?? null,
            leave_type_name: r.leave_type_name ?? null,
            from_date: r.from_date,
            to_date: r.to_date,
            days: num(r.days),
            submitted_at: iso(r.submitted_at),
            status: r.status,
          })),
        };
      })(),
    );
  }

  if (scope.documents) {
    jobs.push(
      (async () => {
        const [onboarding, [m], queue] = await Promise.all([
          q(Prisma.sql`
            SELECT e.emp_id, e.name, r.role_name, dep.name AS department_name, to_char(e.joining_date, 'YYYY-MM-DD') AS joining_date,
                   (SELECT count(*)::int FROM employee_documents d WHERE d.emp_id = e.emp_id AND ${missingDoc}) AS missing_documents
            FROM employees e LEFT JOIN roles r ON r.role_id = e.role_id LEFT JOIN departments dep ON dep.dep_id = e.dep_id
            WHERE e.deleted_at IS NULL AND e.status = 'Onboarding' ORDER BY e.joining_date DESC, e.emp_id DESC LIMIT 5`),
          q(Prisma.sql`
            SELECT count(*)::int AS missing_total FROM employee_documents d JOIN employees e ON e.emp_id = d.emp_id AND e.deleted_at IS NULL
            WHERE ${missingDoc}`),
          q(Prisma.sql`
            SELECT d.emp_id, e.name AS employee_name, d.document_type, COALESCE(d.status, 'not_ticked') AS status, COALESCE(d.updated_at, d.created_at) AS updated_at
            FROM employee_documents d JOIN employees e ON e.emp_id = d.emp_id AND e.deleted_at IS NULL
            WHERE ${missingDoc} ORDER BY COALESCE(d.updated_at, d.created_at) DESC NULLS LAST, d.doc_id DESC LIMIT 5`),
        ]);
        out.onboarding = onboarding.map((r) => ({
          emp_id: num(r.emp_id),
          name: r.name,
          role_name: r.role_name ?? null,
          department_name: r.department_name ?? null,
          joining_date: r.joining_date ?? null,
          missing_documents: num(r.missing_documents),
        }));
        out.documents = {
          missing_total: num(m?.missing_total),
          queue: queue.map((r) => ({
            emp_id: num(r.emp_id),
            employee_name: r.employee_name,
            document_type: r.document_type,
            status: r.status,
            updated_at: iso(r.updated_at),
          })),
        };
      })(),
    );
  }

  await Promise.all(jobs);
  return out;
}

/**
 * Payroll for the Finance Manager, Accountant and Payroll Executive dashboards (sections 06 to 08).
 * The warning rule is the Payroll module's own: ERROR, WARNING, joined in the month and left in the month.
 */
export async function getPayrollSection(prisma: PrismaService): Promise<PayrollSection> {
  const q = (sql: Prisma.Sql) => prisma.$queryRaw<Row[]>(sql);
  const flagged = Prisma.sql`pe.flag IN ('ERROR', 'WARNING', 'JOINED_IN_MONTH', 'LEFT_IN_MONTH')`;
  const runs = await q(Prisma.sql`
    SELECT pr.payroll_run_id, pr.payroll_month, pr.payroll_year, pr.status::text AS status, pr.total_employees, pr.total_salary::float8 AS total_salary,
           pr.attendance_locked,
           (SELECT count(*) FILTER (WHERE pe.calculated_at IS NOT NULL)::int FROM payroll_employees pe WHERE pe.payroll_run_id = pr.payroll_run_id) AS processed,
           (SELECT count(*) FILTER (WHERE ${flagged})::int FROM payroll_employees pe WHERE pe.payroll_run_id = pr.payroll_run_id) AS warnings
    FROM payroll_runs pr ORDER BY pr.payroll_year DESC, pr.payroll_month DESC LIMIT 6`);
  const map = (r: Row) => ({
    payroll_month: num(r.payroll_month),
    payroll_year: num(r.payroll_year),
    status: r.status as string,
    included: num(r.total_employees),
    processed: num(r.processed),
    warnings: num(r.warnings),
    total_salary: num(r.total_salary),
    attendance_locked: r.attendance_locked === true,
  });
  const current = runs[0] ? map(runs[0]) : null;
  if (!runs[0]) return { current: null, runs: [], exceptions: [], shift_issues: [] };
  const id = Number(runs[0].payroll_run_id);
  const [exceptions, shift] = await Promise.all([
    q(Prisma.sql`
      SELECT pe.employee_code, pe.employee_name,
             COALESCE(NULLIF(btrim(pe.validation_message), ''), CASE pe.flag WHEN 'JOINED_IN_MONTH' THEN 'Joined in month' WHEN 'LEFT_IN_MONTH' THEN 'Left in month' ELSE 'Calculation check' END) AS issue
      FROM payroll_employees pe WHERE pe.payroll_run_id = ${id} AND ${flagged}
      ORDER BY (pe.flag = 'ERROR') DESC, pe.employee_name ASC LIMIT 5`),
    q(Prisma.sql`
      SELECT pe.employee_code, pe.employee_name, 'Missing punch on ' || trim_scale(pe.missing_punch_days)::text || ' day(s)' AS issue
      FROM payroll_employees pe WHERE pe.payroll_run_id = ${id} AND pe.missing_punch_days > 0
      ORDER BY pe.missing_punch_days DESC, pe.employee_name ASC LIMIT 5`),
  ]);
  const status = String(runs[0].status);
  const row = (r: Row) => ({ employee_code: r.employee_code as string, employee_name: r.employee_name as string, issue: r.issue as string, run_status: status });
  return { current, runs: runs.map(map), exceptions: exceptions.map(row), shift_issues: shift.map(row) };
}
