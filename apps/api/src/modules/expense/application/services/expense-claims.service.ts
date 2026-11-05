import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { PayrollService } from '../../../payroll/application/services/payroll.service';
import {
  ApproveClaimDto,
  ClaimsListQueryDto,
  ExpenseReportsQueryDto,
  MyClaimsQueryDto,
  PayrollReimbursementDto,
  RecordPaymentDto,
  RejectClaimDto,
  ReopenExpenseClaimDto,
  SaveClaimDto,
  WithdrawClaimDto,
} from '../../presentation/dto/expense-claims.dto';
import {
  CategoryRule,
  ClaimInput,
  FieldErrors,
  Flag,
  computeFlags,
  daysBetween,
  draftErrors,
  formatClaimNo,
  inr,
  submitErrors,
  toDateStr,
  todayStr,
} from '../../domain/expense-rules';
import { ExpenseAccessService, ExpenseViewer } from './expense-access.service';
import { ExpenseNotifierService } from './expense-notifier.service';

const PAGE_SIZE = 20;
const ENTITY = 'EXPENSE_CLAIM';

function fieldError(errors: FieldErrors, status = HttpStatus.BAD_REQUEST, code = 'VALIDATION_ERROR') {
  const first = Object.values(errors)[0] || 'Please check the form.';
  return new HttpException(
    {
      type: 'about:blank',
      title: 'Bad Request',
      status,
      detail: first,
      message: first,
      errors: Object.entries(errors).map(([field, message]) => ({ field, code, message })),
    },
    status,
  );
}

const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return '';
  const s = toDateStr(d);
  const [y, m, day] = s.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
};

/** Expense claims: BFD Sections 3–8 and 11. */
@Injectable()
export class ExpenseClaimsService {
  private readonly logger = new Logger(ExpenseClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ExpenseAccessService,
    private readonly notifier: ExpenseNotifierService,
    @Optional() private readonly payroll?: PayrollService,
  ) {}

  // ===========================================================================
  // Shared helpers
  // ===========================================================================

  private settingsCache: { at: number; value: any } | null = null;

  /** Expense Settings, cached for 15 seconds (read on every submit and decision). */
  async settings() {
    if (this.settingsCache && Date.now() - this.settingsCache.at < 15_000) return this.settingsCache.value;
    const value = await this.loadSettings();
    this.settingsCache = { at: Date.now(), value };
    return value;
  }

  private async loadSettings() {
    const [s] = await this.prisma.$queryRaw<any[]>`SELECT setting_id, claim_window_days, after_claim_window_action, duplicate_check_enabled, default_reimbursement_method, approver_reminder_days, currency FROM expense_general_settings ORDER BY setting_id LIMIT 1;`;
    if (s) return s;
    await this.prisma.$executeRaw`INSERT INTO expense_general_settings DEFAULT VALUES;`;
    const [created] = await this.prisma.$queryRaw<any[]>`SELECT setting_id, claim_window_days, after_claim_window_action, duplicate_check_enabled, default_reimbursement_method, approver_reminder_days, currency FROM expense_general_settings ORDER BY setting_id LIMIT 1;`;
    return created;
  }

  private async category(id?: number | null): Promise<CategoryRule | null> {
    if (!id) return null;
    const c = await this.prisma.expense_categories.findFirst({ where: { category_id: Number(id), deleted_at: null } });
    if (!c) return null;
    return {
      category_id: c.category_id,
      name: c.name,
      is_active: c.is_active,
      allowed_type: c.allowed_type as any,
      limit_per_claim: c.limit_per_claim !== null ? Number(c.limit_per_claim) : null,
      receipt_rule: c.receipt_rule as any,
      receipt_threshold_amount: Number(c.receipt_threshold_amount),
    };
  }

  private async receipts(claimId: number) {
    return this.prisma.attachments.findMany({
      where: { entity_type: ENTITY, entity_id: claimId, deleted_at: null },
      orderBy: { display_order: 'asc' },
    });
  }

  /** Files uploaded but not yet linked (entity_id 0) by this employee, plus files already on the claim. */
  private async receiptsFor(empId: number, claimId: number | null, attachmentIds: number[] | undefined) {
    if (!attachmentIds) return claimId ? this.receipts(claimId) : [];
    if (!attachmentIds.length) return [];
    const rows = await this.prisma.attachments.findMany({
      where: { attachment_id: { in: attachmentIds.map(Number) }, entity_type: ENTITY, deleted_at: null },
    });
    for (const r of rows) {
      const mine = r.entity_id === 0 ? r.created_by === empId : r.entity_id === claimId;
      if (!mine) throw new ForbiddenException('One of the receipts does not belong to this claim.');
    }
    return rows;
  }

  private async linkReceipts(tx: any, empId: number, claimId: number, attachmentIds: number[] | undefined) {
    if (!attachmentIds) return;
    const ids = attachmentIds.map(Number);
    await tx.$executeRaw`
      UPDATE attachments SET deleted_at = clock_timestamp(), deleted_by = ${empId}
      WHERE entity_type = ${ENTITY} AND entity_id = ${claimId} AND deleted_at IS NULL AND NOT (attachment_id = ANY(${ids}::int[]));
    `;
    if (ids.length) {
      await tx.$executeRaw`
        UPDATE attachments SET entity_id = ${claimId}
        WHERE attachment_id = ANY(${ids}::int[]) AND entity_type = ${ENTITY} AND deleted_at IS NULL
          AND (entity_id = ${claimId} OR (entity_id = 0 AND created_by = ${empId}));
      `;
    }
  }

  private async findDuplicate(empId: number, input: ClaimInput, excludeId: number | null) {
    if (!input.expense_date || !input.category_id || !input.amount) return null;
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT claim_id, claim_no FROM expense_claims
      WHERE emp_id = ${empId} AND deleted_at IS NULL AND status NOT IN ('REJECTED', 'DRAFT')
        AND expense_date = ${input.expense_date}::date AND category_id = ${Number(input.category_id)}
        AND amount = ${Number(input.amount)}
        AND (${excludeId}::int IS NULL OR claim_id <> ${excludeId}::int)
      ORDER BY claim_id LIMIT 1;
    `;
    return row ? { claim_id: Number(row.claim_id), claim_no: row.claim_no } : null;
  }

  /** BFD 5 "Who reviews a claim": department Authorised Approver, otherwise the Admin (approver null = Admin queue). */
  private async routeApprover(empId: number): Promise<number | null> {
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT a.approver_emp_id
      FROM employees e
      JOIN expense_authorised_approvers a ON a.department_id = e.dep_id AND a.deleted_at IS NULL
      JOIN employees ap ON ap.emp_id = a.approver_emp_id AND ap.status = 'Active' AND ap.deleted_at IS NULL
      WHERE e.emp_id = ${empId}
      LIMIT 1;
    `;
    const approver = row ? Number(row.approver_emp_id) : null;
    return approver && approver !== empId ? approver : null;
  }

  /**
   * EXP/<year>/<month>/<n> by month of submission. The counter key is 'YYYY/MM'
   * (as seeded by the migration) and never goes below the highest number already
   * used that month, so a number is never handed out twice.
   */
  private async nextClaimNo(tx: any): Promise<string> {
    const today = todayStr();
    const key = `${today.slice(0, 4)}/${today.slice(5, 7)}`;
    const prefix = `EXP/${key}/`;
    const rows: any[] = await tx.$queryRaw`
      WITH used AS (
        SELECT COALESCE(max(split_part(claim_no, '/', 4)::int), 0) AS n
        FROM expense_claims
        WHERE claim_no LIKE ${prefix + '%'} AND split_part(claim_no, '/', 4) ~ '^[0-9]+$'
      )
      INSERT INTO entity_counters (entity_type, counter_key, last_number)
      SELECT 'EXPENSE_CLAIM', ${key}, used.n + 1 FROM used
      ON CONFLICT (entity_type, counter_key)
      DO UPDATE SET last_number = GREATEST(entity_counters.last_number + 1, EXCLUDED.last_number)
      RETURNING last_number;
    `;
    return formatClaimNo(today, Number(rows[0].last_number));
  }

  private async history(tx: any, claimId: number, event: string, by: number, summary: string, details: Record<string, any> = {}) {
    await tx.activity_logs.create({
      data: { entity_type: ENTITY, entity_id: claimId, event, summary: summary.slice(0, 500), details, performed_by: by },
    });
  }

  private flagsOf(c: any): Flag[] {
    const out: Flag[] = [];
    if (c.is_above_limit) out.push({ code: 'ABOVE_LIMIT', label: 'Above limit', message: 'Above the category limit' });
    if (c.is_possible_duplicate) out.push({ code: 'POSSIBLE_DUPLICATE', label: 'Possible duplicate', message: 'Same date, category and amount as another claim', claim_id: c.duplicate_reference_claim_id });
    if (c.is_late) out.push({ code: 'LATE', label: 'Late', message: 'Submitted after the Claim Window' });
    return out;
  }

  private async lookupLabel(type: string, code: string): Promise<string | null> {
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT label FROM master_lookup WHERE lookup_type = ${type} AND code = ${code} AND is_active = true AND deleted_at IS NULL LIMIT 1;
    `;
    return r?.label ?? null;
  }

  // ===========================================================================
  // Screen 1: My Expenses
  // ===========================================================================

  async getMyClaims(empId: number, q: MyClaimsQueryDto) {
    const today = todayStr();
    const month = q.month || today.slice(0, 7);
    const from = q.from_date || `${month}-01`;
    const to = q.to_date || toDateStr(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)));
    const page = Math.max(1, Number(q.page) || 1);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.claim_id, c.claim_no, to_char(c.expense_date, 'YYYY-MM-DD') AS expense_date, c.category_id, cat.name AS category_name,
             c.expense_type, c.amount::float8 AS amount, c.merchant_name, c.status, c.rejection_reason, c.decision_remarks,
             c.is_above_limit, c.is_possible_duplicate, c.is_late, c.copied_from_claim_id, c.submitted_at, c.decided_at,
             (SELECT count(*)::int FROM attachments a WHERE a.entity_type = ${ENTITY} AND a.entity_id = c.claim_id AND a.deleted_at IS NULL) AS receipts
      FROM expense_claims c LEFT JOIN expense_categories cat ON cat.category_id = c.category_id
      WHERE c.emp_id = ${empId} AND c.deleted_at IS NULL
        AND (c.status = 'DRAFT' OR c.expense_date BETWEEN ${from}::date AND ${to}::date)
        AND (${q.status ?? null}::text IS NULL OR c.status = ${q.status ?? null})
        AND (${q.category_id ?? null}::int IS NULL OR c.category_id = ${q.category_id ?? null}::int)
        AND (${q.expense_type ?? null}::text IS NULL OR c.expense_type = ${q.expense_type ?? null})
      ORDER BY (c.status = 'DRAFT') DESC, c.expense_date DESC NULLS LAST, c.claim_id DESC;
    `;
    const [counters] = await this.prisma.$queryRaw<any[]>`
      SELECT
        count(*) FILTER (WHERE status = 'DRAFT')::int AS drafts,
        COALESCE(sum(amount) FILTER (WHERE status = 'SUBMITTED'), 0)::float8 AS waiting_amount,
        count(*) FILTER (WHERE status = 'SUBMITTED')::int AS waiting_count,
        COALESCE(sum(amount) FILTER (WHERE status = 'APPROVED'), 0)::float8 AS approved_unpaid_amount,
        COALESCE(sum(amount) FILTER (WHERE status = 'REIMBURSED' AND date_part('year', COALESCE(payment_date, reimbursed_at::date)) = ${Number(today.slice(0, 4))}), 0)::float8 AS reimbursed_this_year
      FROM expense_claims WHERE emp_id = ${empId} AND deleted_at IS NULL;
    `;
    const [anyClaim] = await this.prisma.$queryRaw<any[]>`SELECT EXISTS (SELECT 1 FROM expense_claims WHERE emp_id = ${empId} AND deleted_at IS NULL) AS any;`;
    return {
      counters,
      has_any_claim: Boolean(anyClaim?.any),
      period: { month, from, to },
      total: rows.length,
      page,
      page_size: PAGE_SIZE,
      rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => ({
        ...r,
        can_delete: r.status === 'DRAFT' && !r.claim_no,
        actions:
          r.status === 'DRAFT' ? (r.claim_no ? ['EDIT'] : ['EDIT', 'DELETE']) : r.status === 'SUBMITTED' ? ['WITHDRAW'] : r.status === 'REJECTED' ? ['COPY'] : ['VIEW'],
      })),
    };
  }

  /** Form data: active categories with their rules, types and the employee header (BFD 4 Part 1). */
  async formOptions(empId: number) {
    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, d.name AS department_name FROM employees e LEFT JOIN departments d ON d.dep_id = e.dep_id WHERE e.emp_id = ${empId};
    `;
    const categories = await this.prisma.expense_categories.findMany({ where: { deleted_at: null, is_active: true }, orderBy: [{ display_order: 'asc' }, { name: 'asc' }] });
    const types = await this.prisma.expense_types.findMany({ where: { deleted_at: null, is_active: true }, orderBy: { display_order: 'asc' } });
    const s = await this.settings();
    return {
      employee: { emp_id: empId, name: emp?.name, emp_code: `EMP-${String(empId).padStart(4, '0')}`, department_name: emp?.department_name || null },
      categories: categories.map((c) => ({
        category_id: c.category_id,
        name: c.name,
        allowed_type: c.allowed_type,
        limit_per_claim: c.limit_per_claim !== null ? Number(c.limit_per_claim) : null,
        receipt_rule: c.receipt_rule,
        receipt_threshold_amount: Number(c.receipt_threshold_amount),
      })),
      types: types.map((t: any) => ({ code: t.code, name: t.name })),
      claim_window_days: s.claim_window_days,
      after_claim_window_action: s.after_claim_window_action,
      today: todayStr(),
    };
  }

  // ===========================================================================
  // Screen 2: Add Expense — Save as Draft / Submit Claim
  // ===========================================================================

  async saveClaim(empId: number, dto: SaveClaimDto, claimId: number | null) {
    let existing: any = null;
    if (claimId) {
      existing = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
      if (!existing) throw new NotFoundException('Claim not found.');
      if (existing.emp_id !== empId) throw new ForbiddenException('You can edit only your own claims.');
      if (existing.status !== 'DRAFT') throw new BadRequestException('Only a Draft can be edited. Withdraw the claim first.');
    }
    const input: ClaimInput = {
      expense_date: dto.expense_date ?? (existing ? toDateStr(existing.expense_date) : null),
      category_id: dto.category_id ?? existing?.category_id ?? null,
      expense_type: dto.expense_type ?? existing?.expense_type ?? null,
      amount: dto.amount ?? (existing?.amount != null ? Number(existing.amount) : null),
      merchant_name: dto.merchant_name !== undefined ? dto.merchant_name?.trim() || null : existing?.merchant_name ?? null,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing?.description ?? null,
    };
    const today = todayStr();
    const dErr = draftErrors(input, today);
    if (Object.keys(dErr).length) throw fieldError(dErr);

    const receipts = await this.receiptsFor(empId, claimId, dto.attachment_ids);
    const checked = dto.submit ? await this.assertSubmittable(empId, input, receipts, claimId, Boolean(dto.confirm_flags)) : null;

    const id = await this.prisma.$transaction(async (tx) => {
      let cid = claimId;
      if (cid) {
        await tx.$executeRaw`
          UPDATE expense_claims SET expense_date = ${input.expense_date}::date, category_id = ${input.category_id ?? null}::int,
            expense_type = ${input.expense_type ?? null}, amount = ${input.amount ?? null}::numeric, merchant_name = ${input.merchant_name ?? null},
            description = ${input.description ?? null}, updated_at = clock_timestamp(), updated_by = ${empId}, row_version = row_version + 1
          WHERE claim_id = ${cid} AND status = 'DRAFT';
        `;
        await this.history(tx, cid, 'Draft Saved', empId, `Saved as Draft by employee`);
      } else {
        const [row] = await tx.$queryRaw<any[]>`
          INSERT INTO expense_claims (emp_id, expense_date, category_id, expense_type, amount, merchant_name, description, status,
                                      copied_from_claim_id, created_by)
          VALUES (${empId}, ${input.expense_date}::date, ${input.category_id ?? null}::int, ${input.expense_type ?? null},
                  ${input.amount ?? null}::numeric, ${input.merchant_name ?? null}, ${input.description ?? null}, 'DRAFT',
                  ${dto.copied_from_claim_id ?? null}::int, ${empId})
          RETURNING claim_id;
        `;
        cid = Number(row.claim_id);
        await this.history(tx, cid, 'Draft Saved', empId, 'Saved as Draft by employee');
      }
      await this.linkReceipts(tx, empId, cid!, dto.attachment_ids);
      return cid!;
    });

    if (checked) return this.submitDraft(id, empId, { confirm_flags: true }, checked);
    return { claim_id: id, claim_no: existing?.claim_no ?? null, status: 'DRAFT' };
  }

  /** "Stops" must pass; "Flags" need a confirmation ("Submit anyway?"). */
  private async assertSubmittable(empId: number, input: ClaimInput, receipts: any[], claimId: number | null, confirmFlags: boolean) {
    const cat = await this.category(input.category_id);
    const errors = submitErrors(
      input,
      cat,
      receipts.map((r) => ({ file_name: r.file_name, mime_type: r.mime_type, file_size_bytes: Number(r.file_size_bytes) })),
    );
    if (Object.keys(errors).length) throw fieldError(errors);
    const s = await this.settings();
    const dup = s.duplicate_check_enabled ? await this.findDuplicate(empId, input, claimId) : null;
    const flags = computeFlags(input, cat, dup, Number(s.claim_window_days));
    const late = flags.find((f) => f.code === 'LATE');
    if (late && s.after_claim_window_action === 'STOP_SUBMISSION') {
      throw fieldError({ expense_date: `This expense is older than ${s.claim_window_days} days and can no longer be claimed.` });
    }
    if (flags.length && !confirmFlags) {
      throw new ConflictException({
        type: 'about:blank',
        title: 'Confirm',
        status: 409,
        code: 'FLAGS_CONFIRM',
        detail: `${flags.map((f) => f.message).join(' ')} Submit anyway?`,
        message: `${flags.map((f) => f.message).join(' ')} Submit anyway?`,
        // The global filter forwards `errors`; the web reads the flags from here.
        errors: flags.map((f) => ({ field: 'flags', code: f.code, message: f.message })),
      });
    }
    return { cat, flags, dup };
  }

  async submitDraft(claimId: number, empId: number, dto: { confirm_flags?: boolean }, checked?: { flags: Flag[]; dup: { claim_id: number; claim_no: string | null } | null }) {
    const c = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!c) throw new NotFoundException('Claim not found.');
    if (c.emp_id !== empId) throw new ForbiddenException('You can submit only your own claims.');
    if (c.status !== 'DRAFT') throw new BadRequestException('Only a Draft can be submitted.');
    const input: ClaimInput = {
      expense_date: toDateStr(c.expense_date),
      category_id: c.category_id,
      expense_type: c.expense_type,
      amount: c.amount != null ? Number(c.amount) : null,
      merchant_name: c.merchant_name,
      description: c.description,
    };
    const { flags, dup } = checked ?? (await this.assertSubmittable(empId, input, await this.receipts(claimId), claimId, Boolean(dto.confirm_flags)));
    const [s, approver] = await Promise.all([this.settings(), this.routeApprover(empId)]);

    const claimNo = await this.prisma.$transaction(async (tx) => {
      const no = c.claim_no || (await this.nextClaimNo(tx));
      const updated = await tx.$executeRaw`
        UPDATE expense_claims SET status = 'SUBMITTED', claim_no = ${no}, submitted_at = clock_timestamp(),
          approver_emp_id = ${approver}::int,
          is_above_limit = ${flags.some((f) => f.code === 'ABOVE_LIMIT')},
          is_possible_duplicate = ${flags.some((f) => f.code === 'POSSIBLE_DUPLICATE')},
          duplicate_reference_claim_id = ${dup?.claim_id ?? null}::int,
          is_late = ${flags.some((f) => f.code === 'LATE')},
          reimbursement_method = COALESCE(reimbursement_method, ${s.default_reimbursement_method}),
          decided_at = NULL, decided_by = NULL, decision_remarks = NULL, rejection_reason = NULL, flags_acknowledged = false,
          updated_at = clock_timestamp(), updated_by = ${empId}, row_version = row_version + 1
        WHERE claim_id = ${claimId} AND status = 'DRAFT';
      `;
      if (!updated) throw new ConflictException('This claim has changed. Please reload.');
      await this.history(tx, claimId, 'Submitted', empId, `Submitted by employee as ${no}`, { flags: flags.map((f) => f.code) });
      return no;
    });

    // Notifications go out in the background so the employee does not wait for email.
    void (async () => {
      const [[emp], recipients] = await Promise.all([
        this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${empId}`,
        approver ? Promise.resolve([approver]) : this.access.adminIds(),
      ]);
      await this.notifier.notify({
        recipients,
        kind: 'expense_claim_submitted',
        title: `Expense claim ${claimNo}`,
        body: `${emp?.name || 'An employee'} submitted ${claimNo} for ${inr(Number(c.amount))}. Please review it.`,
        email: true,
        claimId,
        actorId: empId,
      });
    })().catch((err) => this.logger.warn(`Submit notice for ${claimNo} failed: ${err?.message}`));
    return { claim_id: claimId, claim_no: claimNo, status: 'SUBMITTED' };
  }

  // ===========================================================================
  // Section 5: Withdraw, Delete, Copy
  // ===========================================================================

  async withdrawClaim(claimId: number, empId: number, dto: WithdrawClaimDto) {
    const c = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!c) throw new NotFoundException('Claim not found.');
    if (c.emp_id !== empId) throw new ForbiddenException('You can withdraw only your own claims.');
    if (c.status !== 'SUBMITTED') throw new BadRequestException('Only a Submitted claim can be withdrawn.');
    const approver = c.approver_emp_id;
    await this.prisma.$transaction(async (tx) => {
      const n = await tx.$executeRaw`
        UPDATE expense_claims SET status = 'DRAFT', approver_emp_id = NULL, updated_at = clock_timestamp(), updated_by = ${empId},
          row_version = row_version + 1
        WHERE claim_id = ${claimId} AND status = 'SUBMITTED';
      `;
      if (!n) throw new ConflictException('This claim was already decided.');
      await this.history(tx, claimId, 'Withdrawn', empId, dto.reason?.trim() ? `Withdrawn: ${dto.reason.trim()}` : 'Withdrawn by employee', { remarks: dto.reason?.trim() || null });
    });
    await this.notifier.notify({
      recipients: approver ? [approver] : await this.access.adminIds(),
      kind: 'expense_claim_withdrawn',
      title: `Claim ${c.claim_no} withdrawn`,
      body: `${c.claim_no} was withdrawn by the employee and has left your queue.`,
      claimId,
      actorId: empId,
    });
    return { claim_id: claimId, claim_no: c.claim_no, status: 'DRAFT' };
  }

  /** Only a Draft that was never submitted (no Claim No.) can be deleted (BFD 5). */
  async deleteClaim(claimId: number, empId: number) {
    const c = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!c) throw new NotFoundException('Claim not found.');
    if (c.emp_id !== empId) throw new ForbiddenException('You can delete only your own claims.');
    if (c.status !== 'DRAFT') throw new BadRequestException('Only a Draft can be deleted.');
    if (c.claim_no) throw new BadRequestException('This Draft was submitted before and has a Claim No. It can only be submitted again.');
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE attachments SET deleted_at = clock_timestamp(), deleted_by = ${empId} WHERE entity_type = ${ENTITY} AND entity_id = ${claimId} AND deleted_at IS NULL;`;
      await tx.$executeRaw`UPDATE expense_claims SET deleted_at = clock_timestamp(), deleted_by = ${empId} WHERE claim_id = ${claimId};`;
    });
    return { success: true };
  }

  /** "Copy to new claim" for a Rejected claim: a new Draft with the same details and receipts. */
  async copyToDraft(claimId: number, empId: number) {
    const o = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!o) throw new NotFoundException('Claim not found.');
    if (o.emp_id !== empId) throw new ForbiddenException('You can copy only your own claims.');
    if (o.status !== 'REJECTED') throw new BadRequestException('Only a Rejected claim can be copied into a new claim.');
    const newId = await this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<any[]>`
        INSERT INTO expense_claims (emp_id, expense_date, category_id, expense_type, amount, merchant_name, description, status, copied_from_claim_id, created_by)
        SELECT emp_id, LEAST(expense_date, CURRENT_DATE), category_id, expense_type, amount, merchant_name, description, 'DRAFT', claim_id, ${empId}
        FROM expense_claims WHERE claim_id = ${claimId}
        RETURNING claim_id;
      `;
      const nid = Number(row.claim_id);
      await tx.$executeRaw`
        INSERT INTO attachments (entity_type, entity_id, file_name, file_url, file_size_bytes, mime_type, display_order, created_by)
        SELECT entity_type, ${nid}, file_name, file_url, file_size_bytes, mime_type, display_order, ${empId}
        FROM attachments WHERE entity_type = ${ENTITY} AND entity_id = ${claimId} AND deleted_at IS NULL;
      `;
      await this.history(tx, nid, 'Draft Saved', empId, `Copied from ${o.claim_no}`, { copied_from: o.claim_no });
      return nid;
    });
    return { claim_id: newId, claim_no: null, status: 'DRAFT' };
  }

  // ===========================================================================
  // Screen 4: Review Claim (role-scoped)
  // ===========================================================================

  private async canView(v: ExpenseViewer, c: any, empDept: number | null) {
    if (c.emp_id === v.empId) return true;
    if (c.status === 'DRAFT') return false;
    if (v.isAdmin) return true;
    if (v.isAccounts && ['APPROVED', 'REJECTED', 'REIMBURSED'].includes(c.status)) return true;
    if (c.approver_emp_id === v.empId || c.decided_by === v.empId) return true;
    return empDept !== null && v.approverDeptIds.includes(empDept);
  }

  /** Approve/Reject buttons: only an approver of this claim, never the submitter (except a sole Admin). */
  private async canDecide(v: ExpenseViewer, c: any): Promise<{ ok: boolean; selfApproval: boolean }> {
    if (c.status !== 'SUBMITTED') return { ok: false, selfApproval: false };
    if (c.emp_id === v.empId) {
      if (!v.isAdmin) return { ok: false, selfApproval: false };
      const admins = await this.access.adminIds();
      const sole = admins.length === 1 && admins[0] === v.empId;
      return { ok: sole, selfApproval: sole };
    }
    if (v.isAdmin) return { ok: true, selfApproval: false };
    return { ok: c.approver_emp_id === v.empId, selfApproval: false };
  }

  async getClaimById(claimId: number, viewerEmpId: number) {
    const [v, c] = await Promise.all([
      this.access.viewer(viewerEmpId),
      this.prisma.expense_claims.findFirst({
        where: { claim_id: claimId, deleted_at: null },
        include: {
          expense_categories: true,
          employees_expense_claims_emp_idToemployees: { select: { emp_id: true, name: true, dep_id: true } },
          employees_expense_claims_approver_emp_idToemployees: { select: { emp_id: true, name: true } },
          employees_expense_claims_decided_byToemployees: { select: { emp_id: true, name: true } },
        },
      }) as Promise<any>,
    ]);
    if (!c) throw new NotFoundException('Claim not found.');
    const emp = c.employees_expense_claims_emp_idToemployees;
    if (!(await this.canView(v, c, emp?.dep_id ?? null))) throw new ForbiddenException('You do not have access to this claim.');

    const isFinance = v.isAdmin || v.isAccounts;
    // Independent lookups run together instead of one after another.
    const [deptRows, receipts, hist, decide, s, dupRow, bankRows] = await Promise.all([
      emp?.dep_id ? this.prisma.$queryRaw<any[]>`SELECT name FROM departments WHERE dep_id = ${emp.dep_id}` : Promise.resolve([] as any[]),
      this.receipts(claimId),
      this.prisma.activity_logs.findMany({
        where: { entity_type: ENTITY, entity_id: claimId },
        include: { employees: { select: { name: true } } },
        orderBy: { performed_at: 'asc' },
      }),
      this.canDecide(v, c),
      this.settings(),
      c.duplicate_reference_claim_id
        ? this.prisma.expense_claims.findFirst({ where: { claim_id: c.duplicate_reference_claim_id }, select: { claim_no: true } })
        : Promise.resolve(null),
      isFinance && ['APPROVED', 'REIMBURSED'].includes(c.status)
        ? this.prisma.$queryRaw<any[]>`SELECT bank_name, account_number, ifsc_code FROM employee_pay_policies WHERE emp_id = ${c.emp_id}`
        : Promise.resolve([] as any[]),
    ]);
    const [dept] = deptRows;
    const flags = this.flagsOf(c);
    const dupNo: string | null = dupRow?.claim_no ?? null;
    const cat = c.expense_categories;
    const bank: any = bankRows[0] || null;
    const checks =
      c.status === 'DRAFT'
        ? []
        : [
            { ok: !c.is_above_limit, label: c.is_above_limit ? `Above the category limit (${inr(cat?.limit_per_claim)})` : 'Within category limit' },
            { ok: receipts.length > 0 || !(cat && Number(c.amount) > Number(cat.receipt_threshold_amount)), label: receipts.length ? `Receipts attached (${receipts.length})` : 'No receipt' },
            { ok: !c.is_possible_duplicate, label: c.is_possible_duplicate ? `Possible duplicate${dupNo ? ` of ${dupNo}` : ''}` : 'No similar claim found', claim_id: c.duplicate_reference_claim_id },
            { ok: !c.is_late, label: c.is_late ? `Submitted after ${s.claim_window_days} days (Late)` : `Submitted within ${s.claim_window_days} days` },
          ];

    return {
      claim_id: c.claim_id,
      claim_no: c.claim_no,
      status: c.status,
      emp_id: c.emp_id,
      employee: { emp_id: c.emp_id, name: emp?.name, emp_code: `EMP-${String(c.emp_id).padStart(4, '0')}`, department_name: dept?.name || null },
      expense_date: c.expense_date ? toDateStr(c.expense_date) : null,
      category_id: c.category_id,
      category: cat
        ? {
            category_id: cat.category_id,
            name: cat.name,
            is_active: cat.is_active,
            allowed_type: cat.allowed_type,
            limit_per_claim: cat.limit_per_claim !== null ? Number(cat.limit_per_claim) : null,
            receipt_rule: cat.receipt_rule,
            receipt_threshold_amount: Number(cat.receipt_threshold_amount),
          }
        : null,
      expense_type: c.expense_type,
      amount: c.amount != null ? Number(c.amount) : null,
      merchant_name: c.merchant_name,
      description: c.description,
      submitted_at: c.submitted_at,
      approver_name: c.employees_expense_claims_approver_emp_idToemployees?.name || (c.status === 'SUBMITTED' ? 'Admin' : null),
      decided_at: c.decided_at,
      decided_by_name: c.employees_expense_claims_decided_byToemployees?.name || null,
      decision_remarks: c.decision_remarks,
      rejection_reason: c.rejection_reason,
      is_self_approved: c.is_self_approved,
      flags: flags.map((f) => (f.code === 'POSSIBLE_DUPLICATE' ? { ...f, claim_no: dupNo } : f)),
      checks,
      copied_from_claim_id: c.copied_from_claim_id,
      reimbursement_method: c.reimbursement_method,
      payment_mode: c.payment_mode,
      payment_reference_no: c.payment_reference_no,
      payment_date: c.payment_date ? toDateStr(c.payment_date) : null,
      payroll_run_id: c.payroll_run_id,
      bank,
      receipts: receipts.map((r) => ({
        attachment_id: r.attachment_id,
        file_name: r.file_name,
        file_url: r.file_url,
        mime_type: r.mime_type,
        file_size_bytes: Number(r.file_size_bytes),
      })),
      history: hist.map((h: any) => ({ at: h.performed_at, event: h.event, by: h.employees?.name || null, summary: h.summary })),
      permissions: {
        can_edit: c.emp_id === v.empId && c.status === 'DRAFT',
        can_withdraw: c.emp_id === v.empId && c.status === 'SUBMITTED',
        can_copy: c.emp_id === v.empId && c.status === 'REJECTED',
        can_delete: c.emp_id === v.empId && c.status === 'DRAFT' && !c.claim_no,
        can_decide: decide.ok,
        self_approval: decide.selfApproval,
        can_reopen: v.isAdmin && c.status === 'APPROVED' && !c.payroll_run_id,
        can_pay: isFinance && c.status === 'APPROVED' && !c.payroll_run_id,
      },
    };
  }

  // ===========================================================================
  // Screen 3: Expense Claims (approvers, Accounts, Admin)
  // ===========================================================================

  private scopeSql(v: ExpenseViewer) {
    // Returned as parameters for the SQL below.
    return {
      all: v.isAdmin,
      accountsOnly: !v.isAdmin && v.isAccounts && v.approverDeptIds.length === 0,
      accounts: v.isAccounts,
      depts: v.approverDeptIds,
    };
  }

  async listClaims(viewerEmpId: number, q: ClaimsListQueryDto) {
    const v = await this.access.viewer(viewerEmpId);
    if (!this.access.canUseClaims(v)) throw new ForbiddenException('You do not approve or pay expense claims.');
    const sc = this.scopeSql(v);
    let tab = (q.tab || (sc.accountsOnly ? 'approved' : 'pending')).toLowerCase();
    if (tab === 'pending' && sc.accountsOnly) tab = 'approved';
    const statuses =
      tab === 'pending' ? ['SUBMITTED'] : tab === 'approved' ? ['APPROVED', 'REIMBURSED'] : tab === 'rejected' ? ['REJECTED'] : ['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'];
    const search = q.search?.trim() ? `%${q.search.trim()}%` : null;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.claim_id, c.claim_no, c.emp_id, e.name AS employee_name, d.name AS department_name, e.dep_id,
             to_char(c.expense_date, 'YYYY-MM-DD') AS expense_date, cat.name AS category_name, c.expense_type,
             c.amount::float8 AS amount, c.status, c.is_above_limit, c.is_possible_duplicate, c.is_late, c.is_self_approved,
             c.submitted_at, c.decided_at, dec.name AS decided_by_name, c.approver_emp_id, c.reimbursement_method, c.payroll_run_id,
             to_char(c.payment_date, 'YYYY-MM-DD') AS payment_date
      FROM expense_claims c
      JOIN employees e ON e.emp_id = c.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN expense_categories cat ON cat.category_id = c.category_id
      LEFT JOIN employees dec ON dec.emp_id = c.decided_by
      WHERE c.deleted_at IS NULL AND c.status = ANY(${statuses}::text[])
        AND (
          ${sc.all}::boolean
          OR (${sc.accounts}::boolean AND c.status IN ('APPROVED', 'REJECTED', 'REIMBURSED'))
          OR c.approver_emp_id = ${v.empId}
          OR e.dep_id = ANY(${sc.depts}::int[])
        )
        AND (${q.emp_id ?? null}::int IS NULL OR c.emp_id = ${q.emp_id ?? null}::int)
        AND (${q.department_id ?? null}::int IS NULL OR e.dep_id = ${q.department_id ?? null}::int)
        AND (${q.category_id ?? null}::int IS NULL OR c.category_id = ${q.category_id ?? null}::int)
        AND (${q.expense_type ?? null}::text IS NULL OR c.expense_type = ${q.expense_type ?? null})
        AND (${q.from_date ?? null}::date IS NULL OR c.expense_date >= ${q.from_date ?? null}::date)
        AND (${q.to_date ?? null}::date IS NULL OR c.expense_date <= ${q.to_date ?? null}::date)
        AND (${search}::text IS NULL OR c.claim_no ILIKE ${search} OR e.name ILIKE ${search})
      ORDER BY
        CASE WHEN ${tab}::text = 'pending' THEN extract(epoch FROM c.submitted_at) END ASC NULLS LAST,
        COALESCE(c.decided_at, c.submitted_at) DESC NULLS LAST, c.claim_id DESC;
    `;
    const [counters] = await this.prisma.$queryRaw<any[]>`
      SELECT
        count(*) FILTER (WHERE c.status = 'SUBMITTED')::int AS waiting_count,
        COALESCE(sum(c.amount) FILTER (WHERE c.status = 'SUBMITTED'), 0)::float8 AS waiting_amount,
        COALESCE(sum(c.amount) FILTER (WHERE c.status IN ('APPROVED', 'REIMBURSED') AND date_trunc('month', c.decided_at) = date_trunc('month', now())), 0)::float8 AS approved_this_month,
        COALESCE(max(CURRENT_DATE - c.submitted_at::date) FILTER (WHERE c.status = 'SUBMITTED'), 0)::int AS oldest_waiting_days,
        COALESCE(sum(c.amount) FILTER (WHERE c.status = 'APPROVED'), 0)::float8 AS approved_unpaid_amount,
        count(*) FILTER (WHERE c.status = 'APPROVED')::int AS approved_unpaid_count
      FROM expense_claims c JOIN employees e ON e.emp_id = c.emp_id
      WHERE c.deleted_at IS NULL AND c.status <> 'DRAFT'
        AND (${sc.all}::boolean OR (${sc.accounts}::boolean AND c.status IN ('APPROVED', 'REJECTED', 'REIMBURSED'))
             OR c.approver_emp_id = ${v.empId} OR e.dep_id = ANY(${sc.depts}::int[]));
    `;
    const page = Math.max(1, Number(q.page) || 1);
    return {
      tab,
      tabs: sc.accountsOnly ? ['approved', 'rejected', 'all'] : ['pending', 'approved', 'rejected', 'all'],
      viewer: { is_admin: v.isAdmin, is_accounts: v.isAccounts, is_approver: v.approverDeptIds.length > 0 },
      counters,
      total: rows.length,
      page,
      page_size: PAGE_SIZE,
      rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => ({ ...r, flags: this.flagsOf(r).map((f) => f.label) })),
      all_rows: q.export ? rows : undefined,
    };
  }

  // ===========================================================================
  // Section 7: Approve / Reject / Reopen
  // ===========================================================================

  private async decidedMessage(claimId: number) {
    const [c] = await this.prisma.$queryRaw<any[]>`
      SELECT c.status, c.decided_at, e.name FROM expense_claims c LEFT JOIN employees e ON e.emp_id = c.decided_by WHERE c.claim_id = ${claimId};
    `;
    if (!c) return 'Claim not found.';
    if (c.status === 'DRAFT') return 'This claim was withdrawn by the employee.';
    if (['APPROVED', 'REIMBURSED', 'REJECTED'].includes(c.status)) {
      return `This claim was already ${c.status === 'REJECTED' ? 'rejected' : 'approved'} by ${c.name || 'another approver'} on ${fmtDate(c.decided_at)}.`;
    }
    return 'This claim cannot be decided now.';
  }

  async approveClaim(claimId: number, viewerEmpId: number, dto: ApproveClaimDto) {
    const v = await this.access.viewer(viewerEmpId);
    const c: any = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!c) throw new NotFoundException('Claim not found.');
    if (c.status !== 'SUBMITTED') throw new ConflictException(await this.decidedMessage(claimId));
    const d = await this.canDecide(v, c);
    if (!d.ok) throw new ForbiddenException('You cannot decide this claim.');
    if (this.flagsOf(c).length && !dto.flags_acknowledged) {
      throw fieldError({ flags_acknowledged: 'Please tick "I have checked the flags" before you approve.' });
    }
    const remarks = dto.remarks?.trim() || null;
    const n = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE expense_claims SET status = 'APPROVED', decided_at = clock_timestamp(), decided_by = ${v.empId},
          decision_remarks = ${remarks}, flags_acknowledged = ${Boolean(dto.flags_acknowledged)}, is_self_approved = ${d.selfApproval},
          updated_at = clock_timestamp(), updated_by = ${v.empId}, row_version = row_version + 1
        WHERE claim_id = ${claimId} AND status = 'SUBMITTED';
      `;
      if (updated) await this.history(tx, claimId, 'Approved', v.empId, remarks ? `Approved: ${remarks}` : 'Approved', { remarks, self_approved: d.selfApproval });
      return updated;
    });
    if (!n) throw new ConflictException(await this.decidedMessage(claimId));
    const [me] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${v.empId}`;
    await this.notifier.notify({
      recipients: [c.emp_id],
      kind: 'expense_claim_approved',
      title: `Claim ${c.claim_no} approved`,
      body: `${c.claim_no} for ${inr(Number(c.amount))} was approved by ${me?.name || 'your approver'}.${remarks ? ` Remarks: ${remarks}` : ''}`,
      email: true,
      claimId,
      actorId: v.empId,
    });
    return { claim_id: claimId, claim_no: c.claim_no, status: 'APPROVED' };
  }

  async rejectClaim(claimId: number, viewerEmpId: number, dto: RejectClaimDto) {
    const v = await this.access.viewer(viewerEmpId);
    const c: any = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!c) throw new NotFoundException('Claim not found.');
    if (c.status !== 'SUBMITTED') throw new ConflictException(await this.decidedMessage(claimId));
    const d = await this.canDecide(v, c);
    if (!d.ok) throw new ForbiddenException('You cannot decide this claim.');
    const reason = await this.lookupLabel('expense_rejection_reason', dto.reason_code);
    if (!reason) throw fieldError({ reason_code: 'Please choose the reason.' });
    const remarks = dto.remarks.trim();
    const n = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE expense_claims SET status = 'REJECTED', decided_at = clock_timestamp(), decided_by = ${v.empId},
          rejection_reason = ${reason}, decision_remarks = ${remarks}, is_self_approved = false,
          updated_at = clock_timestamp(), updated_by = ${v.empId}, row_version = row_version + 1
        WHERE claim_id = ${claimId} AND status = 'SUBMITTED';
      `;
      if (updated) await this.history(tx, claimId, 'Rejected', v.empId, `Rejected (${reason}): ${remarks}`, { reason, remarks });
      return updated;
    });
    if (!n) throw new ConflictException(await this.decidedMessage(claimId));
    await this.notifier.notify({
      recipients: [c.emp_id],
      kind: 'expense_claim_rejected',
      title: `Claim ${c.claim_no} rejected`,
      body: `${c.claim_no} was rejected. Reason: ${reason}. Remarks: ${remarks} You can copy it into a new claim.`,
      email: true,
      claimId,
      actorId: v.empId,
    });
    return { claim_id: claimId, claim_no: c.claim_no, status: 'REJECTED' };
  }

  /** Only the Admin, only an Approved claim that is not yet reimbursed (BFD 7 Part 3, Point 10). */
  async reopenClaim(claimId: number, adminId: number, dto: ReopenExpenseClaimDto) {
    const v = await this.access.viewer(adminId);
    this.access.assertAdmin(v);
    const c: any = await this.prisma.expense_claims.findFirst({ where: { claim_id: claimId, deleted_at: null } });
    if (!c) throw new NotFoundException('Claim not found.');
    if (c.status !== 'APPROVED') throw new BadRequestException('Only an Approved claim that is not yet reimbursed can be reopened.');
    if (c.payroll_run_id) throw new BadRequestException('This claim is in a payroll run. Remove it from the run first.');
    const approver = await this.routeApprover(c.emp_id);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE expense_claims SET status = 'SUBMITTED', approver_emp_id = ${approver}::int, decided_at = NULL, decided_by = NULL,
          decision_remarks = NULL, rejection_reason = NULL, flags_acknowledged = false, is_self_approved = false,
          updated_at = clock_timestamp(), updated_by = ${adminId}, row_version = row_version + 1
        WHERE claim_id = ${claimId} AND status = 'APPROVED';
      `;
      await this.history(tx, claimId, 'Reopened', adminId, `Approval reopened by Admin: ${dto.reason.trim()}`, { reason: dto.reason.trim() });
    });
    await this.notifier.notify({
      recipients: [c.emp_id, ...(await this.access.accountsIds())],
      kind: 'expense_claim_reopened',
      title: `Claim ${c.claim_no} reopened`,
      body: `The approval of ${c.claim_no} was reopened by the Admin and is waiting for a decision again. Reason: ${dto.reason.trim()}`,
      email: true,
      claimId,
      actorId: adminId,
    });
    return { claim_id: claimId, claim_no: c.claim_no, status: 'SUBMITTED' };
  }

  // ===========================================================================
  // Section 8: Reimbursement (Accounts or Admin)
  // ===========================================================================

  async reimbursementQueue(viewerEmpId: number, status?: string) {
    const v = await this.access.viewer(viewerEmpId);
    this.access.assertFinance(v);
    await this.syncPayrollClaims();
    const st = (status || 'APPROVED').toUpperCase();
    return this.prisma.$queryRaw<any[]>`
      SELECT c.claim_id, c.claim_no, c.emp_id, e.name AS employee_name, d.name AS department_name,
             pp.bank_name, pp.account_number, pp.ifsc_code, e.status AS employee_status,
             to_char(c.expense_date, 'YYYY-MM-DD') AS expense_date, cat.name AS category_name, c.expense_type,
             c.amount::float8 AS amount, c.status, c.decided_at, c.reimbursement_method, c.payroll_run_id,
             pr.payroll_month, pr.payroll_year, pr.status AS payroll_status,
             to_char(c.payment_date, 'YYYY-MM-DD') AS payment_date, c.payment_mode, c.payment_reference_no
      FROM expense_claims c
      JOIN employees e ON e.emp_id = c.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN expense_categories cat ON cat.category_id = c.category_id
      LEFT JOIN payroll_runs pr ON pr.payroll_run_id = c.payroll_run_id
      LEFT JOIN employee_pay_policies pp ON pp.emp_id = c.emp_id
      WHERE c.deleted_at IS NULL
        AND ((${st}::text = 'ALL' AND c.status IN ('APPROVED', 'REIMBURSED')) OR c.status = ${st}::text)
      ORDER BY e.name, c.decided_at;
    `;
  }

  /** Directly: one or more approved claims of one employee (BFD 8 Part 2). */
  async recordPayment(viewerEmpId: number, dto: RecordPaymentDto) {
    const v = await this.access.viewer(viewerEmpId);
    this.access.assertFinance(v);
    const ids = Array.from(new Set(dto.claim_ids.map(Number)));
    const claims = await this.prisma.expense_claims.findMany({ where: { claim_id: { in: ids }, deleted_at: null } });
    if (claims.length !== ids.length) throw new NotFoundException('One of the claims was not found.');
    if (new Set(claims.map((c) => c.emp_id)).size !== 1) throw fieldError({ claim_ids: 'Please select the claims of one employee.' });
    for (const c of claims) {
      if (c.status !== 'APPROVED') throw fieldError({ claim_ids: `${c.claim_no} is not waiting for payment.` });
      if (c.payroll_run_id) throw fieldError({ claim_ids: `${c.claim_no} is already added to a payroll run. A claim can be reimbursed once.` });
    }
    const today = todayStr();
    const latestApproval = claims.map((c) => toDateStr(c.decided_at)).sort().pop() || today;
    if (dto.payment_date > today) throw fieldError({ payment_date: 'The payment date cannot be in the future.' });
    if (dto.payment_date < latestApproval) throw fieldError({ payment_date: `The payment date cannot be before the approval date (${fmtDate(latestApproval)}).` });
    const mode = await this.lookupLabel('expense_payment_mode', dto.payment_mode_code);
    if (!mode) throw fieldError({ payment_mode_code: 'Please choose the payment mode.' });
    const ref = dto.payment_reference_no.trim();
    await this.prisma.$transaction(async (tx) => {
      for (const c of claims) {
        const n = await tx.$executeRaw`
          UPDATE expense_claims SET status = 'REIMBURSED', reimbursement_method = 'DIRECT', reimbursed_at = clock_timestamp(),
            reimbursed_by = ${v.empId}, payment_mode = ${mode}, payment_reference_no = ${ref}, payment_date = ${dto.payment_date}::date,
            updated_at = clock_timestamp(), updated_by = ${v.empId}, row_version = row_version + 1
          WHERE claim_id = ${c.claim_id} AND status = 'APPROVED' AND payroll_run_id IS NULL;
        `;
        if (!n) throw new ConflictException(`${c.claim_no} was changed by someone else. Please reload.`);
        await this.history(tx, c.claim_id, 'Reimbursed', v.empId, `Paid directly by ${mode}, ref ${ref}, on ${fmtDate(dto.payment_date)}`, { mode, ref, date: dto.payment_date });
      }
    });
    const total = claims.reduce((s, c) => s + Number(c.amount), 0);
    await this.notifier.notify({
      recipients: [claims[0].emp_id],
      kind: 'expense_claim_reimbursed',
      title: 'Expense reimbursed',
      body: `${claims.map((c) => c.claim_no).join(', ')} (${inr(total)}) paid by ${mode} on ${fmtDate(dto.payment_date)}. Reference: ${ref}.`,
      email: true,
      claimId: claims.length === 1 ? claims[0].claim_id : null,
      actorId: v.empId,
    });
    return { success: true, count: claims.length, total };
  }

  async draftPayrollRuns(viewerEmpId: number) {
    const v = await this.access.viewer(viewerEmpId);
    this.access.assertFinance(v);
    return this.prisma.$queryRaw<any[]>`
      SELECT payroll_run_id, payroll_month, payroll_year, status FROM payroll_runs
      WHERE status = 'DRAFT' AND locked_at IS NULL ORDER BY payroll_year DESC, payroll_month DESC;
    `;
  }

  /** With salary: one "Reimbursement" Addition per claim in a Draft run (BFD 8 Part 2). */
  async addToPayroll(viewerEmpId: number, dto: PayrollReimbursementDto) {
    const v = await this.access.viewer(viewerEmpId);
    this.access.assertFinance(v);
    if (!this.payroll) throw new BadRequestException('Salary & Payroll is not available.');
    const [run] = await this.prisma.$queryRaw<any[]>`SELECT payroll_run_id, payroll_month, payroll_year, status, locked_at FROM payroll_runs WHERE payroll_run_id = ${dto.payroll_run_id}`;
    if (!run) throw fieldError({ payroll_run_id: 'Please choose a Payroll Month.' });
    if (run.status !== 'DRAFT' || run.locked_at) {
      throw fieldError({ payroll_run_id: 'Claims cannot be added to a Locked or Paid run. Pick the next month or pay directly.' });
    }
    const ids = Array.from(new Set(dto.claim_ids.map(Number)));
    const claims = await this.prisma.expense_claims.findMany({ where: { claim_id: { in: ids }, deleted_at: null } });
    if (claims.length !== ids.length) throw new NotFoundException('One of the claims was not found.');
    for (const c of claims) {
      if (c.status !== 'APPROVED') throw fieldError({ claim_ids: `${c.claim_no} is not waiting for payment.` });
      if (c.payroll_run_id) throw fieldError({ claim_ids: `${c.claim_no} is already in a payroll run.` });
    }
    let added = 0;
    for (const c of claims) {
      const [pe] = await this.prisma.$queryRaw<any[]>`
        SELECT payroll_employee_id FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id} AND emp_id = ${c.emp_id} LIMIT 1;
      `;
      if (!pe) throw fieldError({ claim_ids: `${c.claim_no}: the employee is not included in this payroll run. Pay it directly.` });
      await this.payroll.addAdjustment(
        Number(pe.payroll_employee_id),
        {
          kind: 'ADDITION',
          category_code: 'reimbursement',
          amount: Number(c.amount),
          related_date: toDateStr(c.expense_date),
          reference_number: c.claim_no!,
          reason: `Expense reimbursement ${c.claim_no}`,
        } as any,
        v.empId,
      );
      const [adj] = await this.prisma.$queryRaw<any[]>`
        SELECT pa.payroll_adjustment_id FROM payroll_adjustments pa
        JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
        WHERE pe.payroll_run_id = ${run.payroll_run_id} AND pa.reference_number = ${c.claim_no} AND pa.is_active = true
        ORDER BY pa.payroll_adjustment_id DESC LIMIT 1;
      `;
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE expense_claims SET reimbursement_method = 'PAYROLL', payroll_run_id = ${run.payroll_run_id},
            payroll_adjustment_id = ${adj?.payroll_adjustment_id ?? null}::int, updated_at = clock_timestamp(), updated_by = ${v.empId}
          WHERE claim_id = ${c.claim_id};
        `;
        await this.history(tx, c.claim_id, 'Added to Payroll', v.empId, `Added to the ${run.payroll_month}/${run.payroll_year} payroll run as a Reimbursement Addition`);
      });
      added++;
    }
    return { success: true, count: added };
  }

  /**
   * Keeps payroll-paid claims in step with Salary & Payroll:
   *  - run marked Paid → claim Reimbursed (BFD 8 "When the Payroll Run is marked Paid");
   *  - Addition removed from the Draft run → back to "Approved, not reimbursed".
   */
  async syncPayrollClaims() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.claim_id, c.claim_no, c.emp_id, c.amount::float8 AS amount, pr.status AS run_status, pr.payment_date, pr.paid_at,
             pr.payment_reference, pr.payroll_month, pr.payroll_year,
             EXISTS (SELECT 1 FROM payroll_adjustments pa JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
                     WHERE pe.payroll_run_id = c.payroll_run_id AND pa.reference_number = c.claim_no AND pa.is_active = true) AS has_addition
      FROM expense_claims c JOIN payroll_runs pr ON pr.payroll_run_id = c.payroll_run_id
      WHERE c.deleted_at IS NULL AND c.status = 'APPROVED' AND c.payroll_run_id IS NOT NULL;
    `;
    for (const r of rows) {
      try {
        if (r.run_status === 'PAID' && r.has_addition) {
          const paidOn = toDateStr(r.payment_date || r.paid_at) || todayStr();
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
              UPDATE expense_claims SET status = 'REIMBURSED', reimbursed_at = clock_timestamp(), payment_date = ${paidOn}::date,
                payment_reference_no = ${r.payment_reference || `Payroll ${r.payroll_month}/${r.payroll_year}`}, updated_at = clock_timestamp()
              WHERE claim_id = ${r.claim_id} AND status = 'APPROVED';
            `;
            await this.history(tx, r.claim_id, 'Reimbursed', r.emp_id, `Paid with salary (${r.payroll_month}/${r.payroll_year} payroll marked Paid)`);
          });
          await this.notifier.notify({
            recipients: [r.emp_id],
            kind: 'expense_claim_reimbursed',
            title: 'Expense reimbursed',
            body: `${r.claim_no} (${inr(r.amount)}) was paid with your salary for ${r.payroll_month}/${r.payroll_year}.`,
            email: true,
            claimId: r.claim_id,
          });
        } else if (!r.has_addition && r.run_status === 'DRAFT') {
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
              UPDATE expense_claims SET payroll_run_id = NULL, payroll_adjustment_id = NULL, updated_at = clock_timestamp()
              WHERE claim_id = ${r.claim_id} AND status = 'APPROVED';
            `;
            await this.history(tx, r.claim_id, 'Removed from Payroll', r.emp_id, 'The Reimbursement Addition was removed from the payroll run. Back to Approved, not reimbursed.');
          });
        }
      } catch (err: any) {
        this.logger.warn(`Payroll sync for ${r.claim_no} failed: ${err?.message}`);
      }
    }
  }

  // ===========================================================================
  // Receipts: "Download all" as a ZIP (BFD 7 Part 1, marker 6)
  // ===========================================================================

  async receiptsZip(claimId: number, viewerEmpId: number): Promise<{ buffer: Buffer; filename: string }> {
    const claim = await this.getClaimById(claimId, viewerEmpId);
    // Same storage roots the attachments module writes to and reads from.
    const root = [
      path.resolve(__dirname, '../../../../../../..', 'storage'),
      path.resolve(process.cwd(), 'storage'),
      path.resolve(__dirname, '../../../../../..', 'storage'),
    ].find((p) => fs.existsSync(p));
    const files: Array<{ name: string; data: Buffer }> = [];
    const used = new Set<string>();
    for (const r of claim.receipts) {
      if (!root) break;
      const rel = r.file_url.startsWith('/files/attachments/') ? path.join('attachments', r.file_url.replace('/files/attachments/', '')) : r.file_url.replace(/^\/+/, '');
      const full = path.resolve(root, rel);
      if (!full.startsWith(root) || !fs.existsSync(full)) continue;
      let name = r.file_name.replace(/[\\/:*?"<>|]/g, '_');
      while (used.has(name)) name = `1_${name}`;
      used.add(name);
      files.push({ name, data: fs.readFileSync(full) });
    }
    if (!files.length) throw new NotFoundException('No receipt files were found for this claim.');
    return { buffer: buildZip(files), filename: `${(claim.claim_no || `claim-${claimId}`).replace(/\//g, '-')}-receipts.zip` };
  }

  // ===========================================================================
  // Section 11: Expense Reports
  // ===========================================================================

  async getReports(viewerEmpId: number, query: ExpenseReportsQueryDto) {
    const v = await this.access.viewer(viewerEmpId);
    if (!this.access.canUseClaims(v)) throw new ForbiddenException('You do not have access to Expense Reports.');
    // Admin and Accounts see all employees; an Authorised Approver only their departments (BFD 11 Part 3).
    const allowedDeptIds: number[] | null = v.isAdmin || v.isAccounts ? null : v.approverDeptIds;

    if (query.from_date || query.to_date) {
      if (!query.from_date || !query.to_date) throw fieldError({ from_date: 'Please choose both From and To dates.' });
      if (query.to_date < query.from_date) throw fieldError({ to_date: 'The To date cannot be before the From date.' });
      const months = (Number(query.to_date.slice(0, 4)) - Number(query.from_date.slice(0, 4))) * 12 + Number(query.to_date.slice(5, 7)) - Number(query.from_date.slice(5, 7));
      if (months >= 24) throw fieldError({ to_date: 'A date range can be up to 24 months.' });
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let selectedMonthStr = query.month;
    if (query.from_date && query.to_date) {
      startDate = new Date(`${query.from_date}T00:00:00.000Z`);
      endDate = new Date(`${query.to_date}T23:59:59.999Z`);
      if (!selectedMonthStr) selectedMonthStr = query.to_date.substring(0, 7);
    } else {
      if (!selectedMonthStr) selectedMonthStr = todayStr(now).slice(0, 7);
      const [y, m] = selectedMonthStr.split('-').map(Number);
      startDate = new Date(Date.UTC(y, m - 1, 1));
      endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    }
    const dateBasis = query.date_basis || 'EXPENSE_DATE';
    let statusFilter: string[] = ['APPROVED', 'REIMBURSED'];
    if (query.report_type === 'rejected') statusFilter = ['REJECTED'];
    else if (query.report_type === 'approvals') statusFilter = ['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'];
    else if (query.status) {
      statusFilter = query.status === 'ALL' ? ['SUBMITTED', 'APPROVED', 'REIMBURSED'] : query.status.split(',').map((s) => s.trim().toUpperCase());
      statusFilter = statusFilter.filter((s) => s !== 'DRAFT');
    }

    const deptScope = allowedDeptIds !== null ? { employees_expense_claims_emp_idToemployees: { dep_id: { in: allowedDeptIds } } } : {};
    const where: any = { deleted_at: null, status: { in: statusFilter }, ...deptScope };
    if (query.department_id) {
      where.employees_expense_claims_emp_idToemployees = { ...(where.employees_expense_claims_emp_idToemployees || {}), dep_id: Number(query.department_id) };
      if (allowedDeptIds !== null && !allowedDeptIds.includes(Number(query.department_id))) where.claim_id = -1;
    }
    if (query.emp_id) where.emp_id = Number(query.emp_id);
    if (query.category_id) where.category_id = Number(query.category_id);
    if (query.expense_type) where.expense_type = query.expense_type;
    if (dateBasis === 'APPROVAL_DATE') where.decided_at = { gte: startDate, lte: endDate };
    else if (dateBasis === 'REIMBURSEMENT_DATE') where.payment_date = { gte: startDate, lte: endDate };
    else where.expense_date = { gte: startDate, lte: endDate };

    const claims: any[] = await this.prisma.expense_claims.findMany({
      where,
      include: {
        expense_categories: true,
        employees_expense_claims_emp_idToemployees: { select: { emp_id: true, name: true, dep_id: true } },
        employees_expense_claims_approver_emp_idToemployees: { select: { name: true } },
        employees_expense_claims_decided_byToemployees: { select: { name: true } },
      },
      orderBy: { expense_date: 'desc' },
    });
    const deps = await this.prisma.departments.findMany({ select: { dep_id: true, name: true } });
    const depMap = new Map(deps.map((d) => [d.dep_id, d.name]));

    const rows = claims.map((c) => ({
      claim_id: c.claim_id,
      claim_no: c.claim_no,
      emp_id: c.emp_id,
      employee_name: c.employees_expense_claims_emp_idToemployees?.name || `Employee #${c.emp_id}`,
      department_id: c.employees_expense_claims_emp_idToemployees?.dep_id || null,
      department_name: depMap.get(c.employees_expense_claims_emp_idToemployees?.dep_id) || '—',
      expense_date: toDateStr(c.expense_date),
      category_id: c.category_id,
      category_name: c.expense_categories?.name || '—',
      category_limit: c.expense_categories?.limit_per_claim ? Number(c.expense_categories.limit_per_claim) : null,
      expense_type: c.expense_type,
      amount: Number(c.amount),
      merchant_name: c.merchant_name,
      description: c.description,
      status: c.status,
      is_above_limit: c.is_above_limit,
      is_possible_duplicate: c.is_possible_duplicate,
      is_late: c.is_late,
      is_self_approved: c.is_self_approved,
      submitted_at: c.submitted_at?.toISOString() || null,
      approver_name: c.employees_expense_claims_decided_byToemployees?.name || c.employees_expense_claims_approver_emp_idToemployees?.name || 'Admin',
      decided_at: c.decided_at?.toISOString() || null,
      rejection_reason: c.rejection_reason,
      decision_remarks: c.decision_remarks,
      reimbursement_method: c.reimbursement_method,
      payment_mode: c.payment_mode,
      payment_reference_no: c.payment_reference_no,
      payment_date: c.payment_date ? toDateStr(c.payment_date) : null,
    }));

    const counted = rows.filter((c) => c.status === 'APPROVED' || c.status === 'REIMBURSED');
    const sum = (list: any[]) => Math.round(list.reduce((a, c) => a + c.amount, 0) * 100) / 100;
    const office = counted.filter((c) => /office/i.test(c.expense_type || ''));
    const personal = counted.filter((c) => /personal/i.test(c.expense_type || ''));
    const rejectedInPeriod = await this.prisma.expense_claims.findMany({
      where: { deleted_at: null, status: 'REJECTED', decided_at: { gte: startDate, lte: endDate }, ...deptScope },
      select: { amount: true },
    });

    const [selY, selM] = selectedMonthStr.split('-').map(Number);
    const trend: any[] = [];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(selY, selM - 1 - i, 1));
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const mClaims = await this.prisma.expense_claims.findMany({
        where: { deleted_at: null, status: { in: ['APPROVED', 'REIMBURSED'] }, expense_date: { gte: new Date(Date.UTC(y, m, 1)), lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)) }, ...deptScope },
        select: { amount: true, expense_type: true },
      });
      const tot = (f: (t: string) => boolean) => Math.round(mClaims.filter((c) => f(c.expense_type || '')).reduce((a, c) => a + Number(c.amount), 0) * 100) / 100;
      trend.push({
        month: key,
        label: `${MONTHS[m]} ${y}`,
        total_amount: tot(() => true),
        claim_count: mClaims.length,
        office_amount: tot((t) => /office/i.test(t)),
        personal_amount: tot((t) => /personal/i.test(t)),
        is_selected: key === selectedMonthStr,
      });
    }

    const groupBy = query.group_by || 'category';
    const totalAmount = sum(counted);
    const bmap = new Map<string, any>();
    for (const c of counted) {
      const [key, id, name] =
        groupBy === 'department' ? [String(c.department_id || 0), c.department_id, c.department_name] : groupBy === 'employee' ? [String(c.emp_id), c.emp_id, c.employee_name] : [String(c.category_id), c.category_id, c.category_name];
      if (!bmap.has(key)) bmap.set(key, { id, name, claims_count: 0, office_amount: 0, personal_amount: 0, total_amount: 0, above_limit: 0, limit: c.category_limit });
      const b = bmap.get(key);
      b.claims_count++;
      b.total_amount += c.amount;
      if (/office/i.test(c.expense_type || '')) b.office_amount += c.amount;
      if (/personal/i.test(c.expense_type || '')) b.personal_amount += c.amount;
      if (c.is_above_limit) b.above_limit++;
    }
    const breakdown = Array.from(bmap.values())
      .map((b) => ({
        ...b,
        office_amount: Math.round(b.office_amount * 100) / 100,
        personal_amount: Math.round(b.personal_amount * 100) / 100,
        total_amount: Math.round(b.total_amount * 100) / 100,
        average_amount: b.claims_count ? Math.round((b.total_amount / b.claims_count) * 100) / 100 : 0,
        share_percentage: totalAmount > 0 ? Math.round((b.total_amount / totalAmount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    // Approvals report (scoped).
    const decided: any[] = await this.prisma.expense_claims.findMany({
      where: { deleted_at: null, status: { in: ['APPROVED', 'REJECTED', 'REIMBURSED'] }, decided_at: { gte: startDate, lte: endDate }, decided_by: { not: null }, ...deptScope },
      include: { employees_expense_claims_decided_byToemployees: { select: { name: true } } },
    });
    const waiting: any[] = await this.prisma.expense_claims.findMany({
      where: { deleted_at: null, status: 'SUBMITTED', ...deptScope },
      include: { employees_expense_claims_approver_emp_idToemployees: { select: { name: true } } },
    });
    const amap = new Map<number, any>();
    const ensure = (id: number, name: string) => {
      if (!amap.has(id)) amap.set(id, { approver_id: id, approver_name: name, claims_decided: 0, claims_approved: 0, claims_rejected: 0, days: 0, waiting_now: 0, oldest_waiting_days: 0 });
      return amap.get(id);
    };
    for (const c of decided) {
      const st = ensure(c.decided_by, c.employees_expense_claims_decided_byToemployees?.name || `#${c.decided_by}`);
      st.claims_decided++;
      if (c.status === 'REJECTED') st.claims_rejected++;
      else st.claims_approved++;
      if (c.submitted_at && c.decided_at) st.days += Math.max(0, (c.decided_at.getTime() - c.submitted_at.getTime()) / 86400000);
    }
    for (const c of waiting) {
      const st = ensure(c.approver_emp_id || 0, c.employees_expense_claims_approver_emp_idToemployees?.name || 'Admin');
      st.waiting_now++;
      if (c.submitted_at) st.oldest_waiting_days = Math.max(st.oldest_waiting_days, daysBetween(toDateStr(c.submitted_at), todayStr()));
    }
    const approvals = Array.from(amap.values()).map(({ days, ...st }) => ({ ...st, avg_days_to_decide: st.claims_decided ? Math.round((days / st.claims_decided) * 10) / 10 : 0 }));

    return {
      period: { month: selectedMonthStr, from_date: toDateStr(startDate), to_date: toDateStr(endDate), date_basis: dateBasis },
      totals: {
        total_amount: totalAmount,
        total_claims: counted.length,
        office_amount: sum(office),
        office_count: office.length,
        personal_amount: sum(personal),
        personal_count: personal.length,
        rejected_count: rejectedInPeriod.length,
        rejected_amount: Math.round(rejectedInPeriod.reduce((a, c) => a + Number(c.amount), 0) * 100) / 100,
      },
      trend,
      breakdown,
      approvals_summary: approvals,
      claims: rows,
    };
  }
}

// -----------------------------------------------------------------------------
// Minimal ZIP writer (stored, no compression) — receipts are already compressed formats.
// -----------------------------------------------------------------------------
function buildZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const crc = (zlib as any).crc32(f.data) >>> 0;
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(0, 8);
    h.writeUInt32LE(0, 10);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(f.data.length, 18);
    h.writeUInt32LE(f.data.length, 22);
    h.writeUInt16LE(name.length, 26);
    h.writeUInt16LE(0, 28);
    local.push(h, name, f.data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt32LE(0, 12);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(f.data.length, 20);
    c.writeUInt32LE(f.data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += h.length + name.length + f.data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}
