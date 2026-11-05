import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { inr, todayStr } from '../../domain/expense-rules';
import { ExpenseAccessService } from './expense-access.service';
import { ExpenseClaimsService } from './expense-claims.service';
import { ExpenseNotifierService } from './expense-notifier.service';

/**
 * BFD 13 "System" jobs, run at startup and then hourly:
 *  - payroll sync (Paid run → Reimbursed);
 *  - claims waiting with an approver who left or was changed go to the new approver / Admin;
 *  - approver reminder after N days, Admin reminder after 7 days (once each);
 *  - Monday summary to Accounts of approved, unpaid claims;
 *  - Draft older than 30 days reminder to the employee.
 */
@Injectable()
export class ExpenseSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExpenseSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ExpenseAccessService,
    private readonly claims: ExpenseClaimsService,
    private readonly notifier: ExpenseNotifierService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.EXPENSE_JOBS_ENABLED === 'false') return;
    setTimeout(() => void this.run(), 20_000);
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('payroll sync', () => this.claims.syncPayrollClaims());
      await this.step('reassign', () => this.reassignWaitingClaims());
      await this.step('approver reminders', () => this.approverReminders());
      await this.step('weekly summary', () => this.weeklyAccountsSummary());
      await this.step('old drafts', () => this.oldDrafts());
    } finally {
      this.running = false;
    }
  }

  private async step(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err: any) {
      this.logger.warn(`Expense job "${name}" failed: ${err?.message}`);
    }
  }

  /**
   * Waiting claims follow the department's current Authorised Approver; when there is none,
   * or the approver is inactive or is the submitter, the claim goes to the Admin queue (null).
   * Called by the job and after Expense Settings changes.
   */
  async reassignWaitingClaims(actorId?: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<any[]>`
      WITH target AS (
        SELECT c.claim_id, c.claim_no, c.emp_id, c.amount::float8 AS amount, c.approver_emp_id AS old_approver,
               CASE WHEN ap.emp_id IS NOT NULL AND ap.emp_id <> c.emp_id THEN ap.emp_id END AS new_approver
        FROM expense_claims c
        JOIN employees e ON e.emp_id = c.emp_id
        LEFT JOIN expense_authorised_approvers a ON a.department_id = e.dep_id AND a.deleted_at IS NULL
        LEFT JOIN employees ap ON ap.emp_id = a.approver_emp_id AND ap.status = 'Active' AND ap.deleted_at IS NULL
        WHERE c.deleted_at IS NULL AND c.status = 'SUBMITTED'
      )
      SELECT claim_id, claim_no, emp_id, amount, old_approver, new_approver FROM target WHERE old_approver IS DISTINCT FROM new_approver;
    `;
    if (!rows.length) return 0;
    const admins = await this.access.adminIds();
    for (const r of rows) {
      const n = await this.prisma.$executeRaw`
        UPDATE expense_claims SET approver_emp_id = ${r.new_approver}::int, updated_at = clock_timestamp()
        WHERE claim_id = ${r.claim_id} AND status = 'SUBMITTED' AND approver_emp_id IS NOT DISTINCT FROM ${r.old_approver}::int;
      `;
      if (!n) continue;
      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'EXPENSE_CLAIM',
          entity_id: Number(r.claim_id),
          event: 'Approver Changed',
          summary: r.new_approver ? 'Moved to the new Authorised Approver of the department' : 'No active Authorised Approver; moved to the Admin',
          details: { from: r.old_approver, to: r.new_approver },
          performed_by: actorId ?? r.emp_id,
        },
      });
      await this.notifier.notify({
        recipients: r.new_approver ? [r.new_approver] : admins,
        kind: 'expense_claim_submitted',
        title: `Expense claim ${r.claim_no}`,
        body: `${r.claim_no} for ${inr(r.amount)} is now waiting for your decision.`,
        claimId: Number(r.claim_id),
      });
    }
    return rows.length;
  }

  private async approverReminders() {
    const [s] = await this.prisma.$queryRaw<any[]>`SELECT approver_reminder_days FROM expense_general_settings ORDER BY setting_id LIMIT 1;`;
    const days = Number(s?.approver_reminder_days || 3);
    const waiting = await this.prisma.$queryRaw<any[]>`
      SELECT claim_id, claim_no, approver_emp_id, amount::float8 AS amount, (CURRENT_DATE - submitted_at::date)::int AS age
      FROM expense_claims
      WHERE deleted_at IS NULL AND status = 'SUBMITTED' AND submitted_at IS NOT NULL
        AND (CURRENT_DATE - submitted_at::date) >= ${days};
    `;
    if (!waiting.length) return;
    const admins = await this.access.adminIds();
    for (const c of waiting) {
      // Approver reminder after the setting's days (or the Admin queue when no approver).
      await this.notifier.notifyOnce({
        recipients: c.approver_emp_id ? [c.approver_emp_id] : admins,
        kind: 'expense_approval_reminder',
        title: `Reminder: ${c.claim_no} is waiting`,
        body: `${c.claim_no} for ${inr(c.amount)} has been waiting for your decision for ${c.age} days.`,
        email: true,
        claimId: Number(c.claim_id),
      });
      if (c.age >= 7 && c.approver_emp_id) {
        await this.notifier.notifyOnce({
          recipients: admins,
          kind: 'expense_approval_overdue',
          title: `${c.claim_no} waiting over 7 days`,
          body: `${c.claim_no} for ${inr(c.amount)} has been waiting for the approver for ${c.age} days.`,
          email: true,
          claimId: Number(c.claim_id),
        });
      }
    }
  }

  private async weeklyAccountsSummary() {
    const today = todayStr();
    if (new Date(`${today}T00:00:00Z`).getUTCDay() !== 1) return;
    const [sum] = await this.prisma.$queryRaw<any[]>`
      SELECT count(*)::int AS n, COALESCE(sum(amount), 0)::float8 AS total
      FROM expense_claims WHERE deleted_at IS NULL AND status = 'APPROVED';
    `;
    if (!sum?.n) return;
    await this.notifier.notifyOnce({
      recipients: await this.access.accountsIds(),
      kind: 'expense_weekly_summary',
      title: 'Weekly expense summary',
      body: `Week of ${today}: ${sum.n} approved claims (${inr(sum.total)}) are waiting for payment.`,
      email: true,
      claimId: null,
      dedupeKey: `Week of ${today}`,
    });
  }

  private async oldDrafts() {
    const drafts = await this.prisma.$queryRaw<any[]>`
      SELECT claim_id, emp_id, to_char(expense_date, 'DD Mon YYYY') AS d FROM expense_claims
      WHERE deleted_at IS NULL AND status = 'DRAFT' AND created_at < now() - interval '30 days';
    `;
    for (const d of drafts) {
      await this.notifier.notifyOnce({
        recipients: [d.emp_id],
        kind: 'expense_draft_reminder',
        title: 'Draft expense not submitted',
        body: `Your draft expense dated ${d.d} has not been submitted for 30 days. Submit it or delete it.`,
        claimId: Number(d.claim_id),
      });
    }
  }
}
