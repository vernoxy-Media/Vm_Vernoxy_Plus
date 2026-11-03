import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CalendarCandidate,
  ClaimedFollowUp,
  CreateFollowUpData,
  FollowUpList,
  FollowUpListParams,
  FollowUpRecord,
  SalesFollowUpRepositoryPort,
  SummaryRecipient,
} from '../../application/ports/sales-follow-up.repository.port';
import { InvalidTransitionError } from '../../domain/errors/sales.errors';
import { FOLLOW_UP_TABS, FollowUpTab, REMINDER_LEAD_MS, overdueBefore, todayRange, upcomingFrom } from '../../domain/services/follow-up.service';

type Tx = Prisma.TransactionClient;

const OPEN = ['Pending', 'Overdue'];
const CLAIM_BATCH = 500;

const INCLUDE = {
  companies: { select: { company_id: true, company_code: true, name: true, city: true } },
  leads: { select: { lead_id: true, lead_code: true, lead_stage: true, lead_by_id: true } },
  persons: { select: { person_id: true, name: true } },
  employees_crm_follow_ups_assigned_toToemployees: { select: { emp_id: true, name: true } },
} satisfies Prisma.crm_follow_upsInclude;

type Row = Prisma.crm_follow_upsGetPayload<{ include: typeof INCLUDE }>;

function toRecord(r: Row): FollowUpRecord {
  return {
    follow_up_id: r.follow_up_id,
    status: r.status,
    company: {
      company_id: r.companies?.company_id ?? (r.company_id as number),
      company_code: r.companies?.company_code ?? null,
      name: r.companies?.name ?? '',
      city: r.companies?.city ?? null,
    },
    lead: r.leads ? { lead_id: r.leads.lead_id, lead_code: r.leads.lead_code, stage: r.leads.lead_stage ?? 'New', lead_by_id: r.leads.lead_by_id } : null,
    contact: r.persons ? { person_id: r.persons.person_id, name: r.persons.name } : r.contact_id ? { person_id: r.contact_id, name: r.contact_person_name ?? '' } : null,
    follow_up_on: r.follow_up_on,
    type: r.type,
    purpose: r.purpose,
    assigned_to: r.employees_crm_follow_ups_assigned_toToemployees,
    created_by: r.created_by,
    created_at: r.created_at,
    rescheduled_count: r.rescheduled_count,
    done_on: r.done_on,
    outcome: r.outcome,
    what_happened: r.what_happened,
    reason: r.reason,
    completed_communication_id: r.completed_communication_id,
    calendar_event_id: r.calendar_event_id,
  };
}

@Injectable()
export class PrismaSalesFollowUpRepository implements SalesFollowUpRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private inTx<T>(outer: unknown, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return outer ? fn(outer as Tx) : this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- read ----

  async get(id: number): Promise<FollowUpRecord | null> {
    const r = await this.prisma.crm_follow_ups.findFirst({ where: { follow_up_id: id, deleted_at: null }, include: INCLUDE });
    return r ? toRecord(r) : null;
  }

  async list(p: FollowUpListParams): Promise<FollowUpList> {
    const base = this.baseWhere(p);
    const where: Prisma.crm_follow_upsWhereInput = { AND: [base, this.tabWhere(p.tab, p.now), this.dateWhere(p)] };

    const [rows, total, counts] = await Promise.all([
      this.prisma.crm_follow_ups.findMany({
        where,
        include: INCLUDE,
        orderBy: this.tabOrder(p.tab),
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      this.prisma.crm_follow_ups.count({ where }),
      Promise.all(FOLLOW_UP_TABS.map((t) => this.prisma.crm_follow_ups.count({ where: { AND: [base, this.tabWhere(t, p.now)] } }))),
    ]);
    const tab_counts = Object.fromEntries(FOLLOW_UP_TABS.map((t, i) => [t, counts[i]])) as Record<FollowUpTab, number>;
    return {
      items: rows.map(toRecord),
      total,
      page: p.page,
      limit: p.limit,
      total_pages: Math.max(Math.ceil(total / p.limit), 1),
      tab_counts,
    };
  }

  async listForLead(leadId: number): Promise<FollowUpRecord[]> {
    const rows = await this.prisma.crm_follow_ups.findMany({ where: { lead_id: leadId, deleted_at: null }, include: INCLUDE });
    const open = (r: Row) => (OPEN.includes(r.status) ? 0 : 1);
    return rows
      .sort((a, b) => open(a) - open(b) || (open(a) === 0 ? a.follow_up_on.getTime() - b.follow_up_on.getTime() : b.follow_up_on.getTime() - a.follow_up_on.getTime()))
      .map(toRecord);
  }

  /** Scope and filters shared by the list and the tab counts (the Date filter is applied to the list only). */
  private baseWhere(p: FollowUpListParams): Prisma.crm_follow_upsWhereInput {
    const and: Prisma.crm_follow_upsWhereInput[] = [{ deleted_at: null }];
    const ci = (v: string) => ({ contains: v, mode: 'insensitive' as const });

    if (p.scope_emp_id !== undefined) {
      and.push({
        OR: [
          { assigned_to: p.scope_emp_id },
          { leads: { lead_by_id: p.scope_emp_id } },
          { AND: [{ lead_id: null }, { created_by: p.scope_emp_id }] },
        ],
      });
    }
    if (p.assigned_to !== undefined) and.push({ assigned_to: p.assigned_to });
    if (p.type?.length) and.push({ OR: p.type.map((t) => ({ type: { equals: t, mode: 'insensitive' as const } })) });
    if (p.city?.length) and.push({ OR: p.city.map((c) => ({ companies: { city: { equals: c, mode: 'insensitive' as const } } })) });
    if (p.industry_ids?.length) {
      and.push({ companies: { OR: [{ industry_id: { in: p.industry_ids } }, { sub_industry_id: { in: p.industry_ids } }] } });
    }
    if (p.lead_by_id !== undefined) and.push({ leads: { lead_by_id: p.lead_by_id } });

    const q = p.q?.trim();
    if (q) {
      and.push({
        OR: [
          { companies: { name: ci(q) } },
          { companies: { company_code: ci(q) } },
          { contact_person_name: ci(q) },
          { purpose: ci(q) },
          { leads: { lead_code: ci(q) } },
        ],
      });
    }
    return { AND: and };
  }

  /** Today / Upcoming / Overdue are views of Pending and Overdue by date; Completed and Cancelled show the rest. */
  private tabWhere(tab: FollowUpTab, now: Date): Prisma.crm_follow_upsWhereInput {
    const today = todayRange(now);
    switch (tab) {
      case 'today':
        return { status: { in: OPEN }, follow_up_on: { gte: today.from, lt: today.to } };
      case 'upcoming':
        return { status: 'Pending', follow_up_on: { gte: upcomingFrom(now) } };
      case 'overdue':
        // Computed, so the tab is right even before the background job has marked them.
        return { OR: [{ status: 'Overdue' }, { status: 'Pending', follow_up_on: { lt: overdueBefore(now) } }] };
      case 'completed':
        return { status: 'Completed' };
      case 'cancelled':
        return { status: 'Cancelled' };
    }
  }

  private dateWhere(p: FollowUpListParams): Prisma.crm_follow_upsWhereInput {
    if (!p.date_from && !p.date_to) return {};
    const range = { ...(p.date_from ? { gte: p.date_from } : {}), ...(p.date_to ? { lt: p.date_to } : {}) };
    return p.tab === 'completed' ? { done_on: range } : { follow_up_on: range };
  }

  private tabOrder(tab: FollowUpTab): Prisma.crm_follow_upsOrderByWithRelationInput[] {
    switch (tab) {
      case 'completed':
        return [{ done_on: 'desc' }, { follow_up_id: 'desc' }];
      case 'cancelled':
        return [{ updated_at: 'desc' }, { follow_up_id: 'desc' }];
      default:
        // Today: by time (today's overdue ones are earlier, so they are on top). Upcoming: by date and time. Overdue: oldest first.
        return [{ follow_up_on: 'asc' }, { follow_up_id: 'asc' }];
    }
  }

  // --------------------------------------------------------------- write ----

  async create(d: CreateFollowUpData, outer?: unknown): Promise<{ follow_up_id: number }> {
    return this.inTx(outer, async (tx) => {
      const contact = await tx.persons.findUnique({ where: { person_id: d.contact_id }, select: { name: true } });
      const row = await tx.crm_follow_ups.create({
        data: {
          company_id: d.company_id,
          lead_id: d.lead_id,
          contact_id: d.contact_id,
          contact_person_name: contact?.name ?? null,
          follow_up_on: d.follow_up_on,
          type: d.type,
          assigned_to: d.assigned_to,
          purpose: d.purpose,
          status: 'Pending',
          created_by: d.actor_emp_id,
        },
        select: { follow_up_id: true },
      });
      await this.log(tx, d.lead_id, d.company_id, 'FOLLOW_UP_SCHEDULED', `${d.type} follow-up scheduled`, d.actor_emp_id, {
        follow_up_id: row.follow_up_id, follow_up_on: d.follow_up_on.toISOString(), assigned_to: d.assigned_to,
      });
      return row;
    });
  }

  async updateDetails(id: number, patch: { purpose?: string | null; contact_id?: number; assigned_to?: number }, actor: number, outer?: unknown): Promise<void> {
    await this.inTx(outer, async (tx) => {
      const before = await tx.crm_follow_ups.findFirstOrThrow({ where: { follow_up_id: id, deleted_at: null } });
      const contact = patch.contact_id !== undefined ? await tx.persons.findUnique({ where: { person_id: patch.contact_id }, select: { name: true } }) : null;
      const res = await tx.crm_follow_ups.updateMany({
        where: { follow_up_id: id, status: { in: OPEN } },
        data: {
          ...(patch.purpose !== undefined ? { purpose: patch.purpose } : {}),
          ...(patch.contact_id !== undefined ? { contact_id: patch.contact_id, contact_person_name: contact?.name ?? before.contact_person_name } : {}),
          ...(patch.assigned_to !== undefined ? { assigned_to: patch.assigned_to } : {}),
          updated_at: new Date(),
        },
      });
      if (res.count !== 1) throw new InvalidTransitionError('This follow-up is no longer open, so it cannot be edited.');
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (patch.purpose !== undefined && patch.purpose !== before.purpose) changes.purpose = { from: before.purpose, to: patch.purpose };
      if (patch.contact_id !== undefined && patch.contact_id !== before.contact_id) changes.contact_id = { from: before.contact_id, to: patch.contact_id };
      if (patch.assigned_to !== undefined && patch.assigned_to !== before.assigned_to) changes.assigned_to = { from: before.assigned_to, to: patch.assigned_to };
      if (Object.keys(changes).length > 0) {
        await this.log(tx, before.lead_id, before.company_id as number, 'FOLLOW_UP_EDITED', `Follow-up edited (${Object.keys(changes).join(', ')})`, actor, { follow_up_id: id, changes });
      }
    });
  }

  async reschedule(id: number, d: { follow_up_on: Date; reason: string }, actor: number, outer?: unknown): Promise<{ previous_on: Date; count: number }> {
    return this.inTx(outer, async (tx) => {
      const before = await tx.crm_follow_ups.findFirstOrThrow({ where: { follow_up_id: id, deleted_at: null } });
      const res = await tx.crm_follow_ups.updateMany({
        where: { follow_up_id: id, status: { in: OPEN } },
        data: {
          follow_up_on: d.follow_up_on,
          status: 'Pending',
          rescheduled_count: { increment: 1 },
          reason: d.reason,
          // A new date means a new reminder and a new overdue check.
          reminder_sent_at: null,
          overdue_notified_at: null,
          updated_at: new Date(),
        },
      });
      if (res.count !== 1) throw new InvalidTransitionError('This follow-up is no longer open, so it cannot be rescheduled.');
      const count = before.rescheduled_count + 1;
      await this.log(tx, before.lead_id, before.company_id as number, 'FOLLOW_UP_RESCHEDULED', 'Follow-up rescheduled', actor, {
        follow_up_id: id, from: before.follow_up_on.toISOString(), to: d.follow_up_on.toISOString(), reason: d.reason, count,
      });
      return { previous_on: before.follow_up_on, count };
    });
  }

  async cancel(id: number, reason: string, actor: number, outer?: unknown): Promise<void> {
    await this.inTx(outer, async (tx) => {
      const before = await tx.crm_follow_ups.findFirstOrThrow({ where: { follow_up_id: id, deleted_at: null } });
      const res = await tx.crm_follow_ups.updateMany({
        where: { follow_up_id: id, status: { in: OPEN } },
        data: { status: 'Cancelled', reason, updated_at: new Date() },
      });
      if (res.count !== 1) throw new InvalidTransitionError('This follow-up is no longer open, so it cannot be cancelled.');
      await this.log(tx, before.lead_id, before.company_id as number, 'FOLLOW_UP_CANCELLED', 'Follow-up cancelled', actor, { follow_up_id: id, reason });
    });
  }

  async complete(id: number, d: { done_on: Date; outcome: string; what_happened: string; communication_id: number }, actor: number, outer?: unknown): Promise<void> {
    await this.inTx(outer, async (tx) => {
      const before = await tx.crm_follow_ups.findFirstOrThrow({ where: { follow_up_id: id, deleted_at: null } });
      const res = await tx.crm_follow_ups.updateMany({
        where: { follow_up_id: id, status: { in: OPEN } },
        data: {
          status: 'Completed',
          done_on: d.done_on,
          outcome: d.outcome,
          what_happened: d.what_happened,
          completed_communication_id: d.communication_id,
          updated_at: new Date(),
        },
      });
      if (res.count !== 1) throw new InvalidTransitionError('This follow-up is no longer open, so it cannot be completed.');
      await this.log(tx, before.lead_id, before.company_id as number, 'FOLLOW_UP_COMPLETED', `${before.type} follow-up completed`, actor, {
        follow_up_id: id, outcome: d.outcome, communication_id: d.communication_id,
      });
    });
  }

  // ------------------------------------------------------ background job ----

  /** Pending -> Overdue, once per follow-up, even with two servers running the job. */
  async claimNewlyOverdue(now: Date): Promise<ClaimedFollowUp[]> {
    const rows = await this.prisma.$queryRaw<Array<{ follow_up_id: number }>>(Prisma.sql`
      UPDATE crm_follow_ups f
      SET status = 'Overdue', overdue_notified_at = ${now}, updated_at = ${now}
      WHERE f.follow_up_id IN (
        SELECT follow_up_id FROM crm_follow_ups
        WHERE deleted_at IS NULL AND status = 'Pending' AND follow_up_on < ${overdueBefore(now)}
        ORDER BY follow_up_on
        LIMIT ${CLAIM_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING f.follow_up_id`);
    return this.claimedDetails(rows.map((r) => r.follow_up_id));
  }

  /** Reminder 1 hour before: sent once per follow-up and date (rescheduling resets it). */
  async claimDueReminders(now: Date): Promise<ClaimedFollowUp[]> {
    const horizon = new Date(now.getTime() + REMINDER_LEAD_MS);
    const rows = await this.prisma.$queryRaw<Array<{ follow_up_id: number }>>(Prisma.sql`
      UPDATE crm_follow_ups f
      SET reminder_sent_at = ${now}
      WHERE f.follow_up_id IN (
        SELECT follow_up_id FROM crm_follow_ups
        WHERE deleted_at IS NULL AND status = 'Pending' AND reminder_sent_at IS NULL
          AND follow_up_on > ${now} AND follow_up_on <= ${horizon}
        ORDER BY follow_up_on
        LIMIT ${CLAIM_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING f.follow_up_id`);
    return this.claimedDetails(rows.map((r) => r.follow_up_id));
  }

  private async claimedDetails(ids: number[]): Promise<ClaimedFollowUp[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.crm_follow_ups.findMany({ where: { follow_up_id: { in: ids } }, include: INCLUDE });
    return rows.map((r) => ({
      follow_up_id: r.follow_up_id,
      assigned_to: r.assigned_to,
      follow_up_on: r.follow_up_on,
      type: r.type,
      company_name: r.companies?.name ?? '',
      contact_name: r.persons?.name ?? r.contact_person_name ?? null,
      lead_id: r.lead_id,
    }));
  }

  async listSummaryRecipients(): Promise<SummaryRecipient[]> {
    return this.prisma.employees.findMany({
      where: { deleted_at: null, status: 'Active', departments_employees_dep_idTodepartments: { name: { startsWith: 'Sales', mode: 'insensitive' } } },
      select: { emp_id: true, name: true },
      orderBy: { emp_id: 'asc' },
    });
  }

  async countForSummary(empId: number, now: Date): Promise<{ today: number; overdue: number }> {
    const day = todayRange(now);
    const base: Prisma.crm_follow_upsWhereInput = { deleted_at: null, assigned_to: empId, status: { in: OPEN } };
    const [overdue, today] = await Promise.all([
      this.prisma.crm_follow_ups.count({ where: { AND: [base, this.tabWhere('overdue', now)] } }),
      // "Today" here means still to do today; what is already late is counted as overdue.
      this.prisma.crm_follow_ups.count({ where: { AND: [base, { follow_up_on: { gte: day.from, lt: day.to } }, { NOT: this.tabWhere('overdue', now) }] } }),
    ]);
    return { today, overdue };
  }

  async listAdminIds(): Promise<number[]> {
    const rows = await this.prisma.employees.findMany({
      where: { deleted_at: null, status: 'Active', roles_employees_role_idToroles: { is_admin: true } },
      select: { emp_id: true },
    });
    return rows.map((r) => r.emp_id);
  }

  async employeeName(empId: number): Promise<string> {
    const e = await this.prisma.employees.findUnique({ where: { emp_id: empId }, select: { name: true } });
    return e?.name ?? 'A colleague';
  }

  async listNeedingCalendarEvent(limit: number): Promise<CalendarCandidate[]> {
    return this.candidates({ deleted_at: null, status: { in: OPEN }, calendar_event_id: null }, limit);
  }

  async listCalendarCleanup(limit: number): Promise<CalendarCandidate[]> {
    return this.candidates({ status: { in: ['Completed', 'Cancelled'] }, calendar_event_id: { not: null } }, limit);
  }

  private async candidates(where: Prisma.crm_follow_upsWhereInput, limit: number): Promise<CalendarCandidate[]> {
    const rows = await this.prisma.crm_follow_ups.findMany({ where, include: INCLUDE, orderBy: { follow_up_id: 'asc' }, take: limit });
    return rows.map((r) => ({
      follow_up_id: r.follow_up_id,
      status: r.status,
      calendar_event_id: r.calendar_event_id,
      assigned_to: r.assigned_to,
      follow_up_on: r.follow_up_on,
      type: r.type,
      purpose: r.purpose,
      company_name: r.companies?.name ?? '',
      contact_name: r.persons?.name ?? r.contact_person_name ?? null,
    }));
  }

  async setCalendarEvent(id: number, eventId: number | null): Promise<void> {
    await this.prisma.crm_follow_ups.update({ where: { follow_up_id: id }, data: { calendar_event_id: eventId } });
  }

  private async log(tx: Tx, leadId: number | null, companyId: number, event: string, summary: string, actor: number, details: Record<string, unknown>) {
    await tx.activity_logs.create({
      data: {
        entity_type: leadId !== null ? 'LEAD' : 'COMPANY',
        entity_id: leadId ?? companyId,
        event,
        summary,
        details: details as Prisma.InputJsonValue,
        performed_by: actor,
      },
    });
  }
}
