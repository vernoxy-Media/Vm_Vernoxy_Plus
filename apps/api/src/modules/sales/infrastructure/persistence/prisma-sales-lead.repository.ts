import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  BoardCard,
  BoardColumn,
  ConvertContext,
  CreateLeadData,
  LeadBoard,
  LeadCounters,
  LeadDetail,
  LeadFilters,
  LeadList,
  LeadListItem,
  LeadMasters,
  ListLeadsParams,
  SalesLeadRepositoryPort,
} from '../../application/ports/sales-lead.repository.port';
import {
  DEFAULT_LEAD_SOURCE,
  EXISTING_CLIENT_LEAD_SOURCE,
  LEAD_STATUSES,
  LeadStatus,
  OPEN_STATUSES,
  joinServiceFit,
  splitServiceFit,
} from '../../domain/entities/sales-lead';
import { OpenLeadExistsError } from '../../domain/errors/sales.errors';
import { initialsOf } from '../../domain/services/sales-normalization.service';
import {
  followUpFlag,
  isFollowUpDue,
  istDayRange,
  istMonthRange,
  istWeekRange,
  OVERDUE_GRACE_MS,
} from '../../domain/services/lead-time.service';

type Tx = Prisma.TransactionClient;

const OPEN = [...OPEN_STATUSES];
const OPEN_FOLLOW_UP_STATUSES = ['Pending', 'Overdue'];
const MAX_TITLE = 200;
const NO_FOLLOW_UP_DAYS = 7;

const LIST_SELECT = {
  lead_id: true,
  lead_code: true,
  lead_stage: true,
  lead_source: true,
  service_fit: true,
  created_at: true,
  next_follow_up_at: true,
  lost_reason: true,
  companies: {
    select: { company_id: true, company_code: true, name: true, city: true, contact_person: true, client_code: true },
  },
  persons: { select: { name: true } },
  employees_leads_lead_by_idToemployees: { select: { emp_id: true, name: true } },
} satisfies Prisma.leadsSelect;

type ListRow = Prisma.leadsGetPayload<{ select: typeof LIST_SELECT }>;

@Injectable()
export class PrismaSalesLeadRepository implements SalesLeadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------- convert ----

  async getConvertContext(companyId: number): Promise<ConvertContext | null> {
    const c = await this.prisma.companies.findFirst({
      where: { company_id: companyId, deleted_at: null },
      select: {
        company_id: true,
        company_code: true,
        name: true,
        is_client: true,
        company_persons: {
          where: { is_primary: true, is_active: true, deleted_at: null },
          take: 1,
          select: { designation: true, persons: { select: { person_id: true, name: true, mobile: true } } },
        },
      },
    });
    if (!c) return null;

    const [communicationCount, open] = await Promise.all([
      this.prisma.crm_communications.count({ where: { company_id: companyId, deleted_at: null } }),
      this.findOpenLead(this.prisma, companyId),
    ]);
    const primary = c.company_persons[0];
    return {
      company: { company_id: c.company_id, company_code: c.company_code, name: c.name, is_client: c.is_client === true },
      primary_contact: primary
        ? {
            person_id: primary.persons.person_id,
            name: primary.persons.name,
            designation: primary.designation,
            mobile: primary.persons.mobile,
          }
        : null,
      communication_count: communicationCount,
      open_lead: open,
    };
  }

  private async findOpenLead(db: Tx | PrismaService, companyId: number) {
    const lead = await db.leads.findFirst({
      where: { company_id: companyId, deleted_at: null, lead_stage: { in: OPEN } },
      select: { lead_id: true, lead_code: true, lead_stage: true },
    });
    return lead ? { lead_id: lead.lead_id, lead_code: lead.lead_code, stage: lead.lead_stage ?? 'New' } : null;
  }

  async getMasters(): Promise<LeadMasters> {
    const labels = async (type: string) =>
      this.prisma.master_lookup.findMany({
        where: { lookup_type: type, deleted_at: null, is_active: true },
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
        select: { code: true, label: true },
      });

    const [sources, fits, lost, users] = await Promise.all([
      labels('lead_source'),
      labels('service_fit'),
      labels('lost_reason'),
      this.prisma.employees.findMany({
        where: { deleted_at: null, status: 'Active', ...this.leadByEligibility() },
        orderBy: { name: 'asc' },
        select: { emp_id: true, name: true, roles_employees_role_idToroles: { select: { is_admin: true } } },
      }),
    ]);

    const find = (re: RegExp) => sources.find((s) => re.test(s.code) || re.test(s.label))?.label;
    return {
      statuses: [...LEAD_STATUSES],
      lead_sources: [...new Set(sources.map((s) => s.label))],
      default_lead_source: find(/^cold[\s_-]?call/i) ?? DEFAULT_LEAD_SOURCE,
      existing_client_lead_source: find(/^existing[\s_-]?client/i) ?? EXISTING_CLIENT_LEAD_SOURCE,
      service_fits: [...new Set(fits.map((s) => s.label))],
      lost_reasons: [...new Set(lost.map((s) => s.label))],
      lead_by_users: users.map((u) => ({
        emp_id: u.emp_id,
        name: u.name,
        is_admin: u.roles_employees_role_idToroles?.is_admin === true,
      })),
    };
  }

  /** "Active Sales users and Admin". */
  private leadByEligibility(): Prisma.employeesWhereInput {
    return {
      OR: [
        { roles_employees_role_idToroles: { is_admin: true } },
        { departments_employees_dep_idTodepartments: { name: { startsWith: 'Sales', mode: 'insensitive' } } },
      ],
    };
  }

  async resolveLeadSource(label: string): Promise<string | null> {
    const hit = await this.prisma.master_lookup.findFirst({
      where: { lookup_type: 'lead_source', deleted_at: null, is_active: true, label: { equals: label, mode: 'insensitive' } },
      select: { label: true },
    });
    return hit?.label ?? null;
  }

  async resolveServiceFit(values: string[]): Promise<{ labels: string[]; unknown: string[] }> {
    const all = await this.prisma.master_lookup.findMany({
      where: { lookup_type: 'service_fit', deleted_at: null, is_active: true },
      select: { label: true },
    });
    const byKey = new Map(all.map((r) => [r.label.toLowerCase(), r.label]));
    const labels: string[] = [];
    const unknown: string[] = [];
    for (const v of values) {
      const hit = byKey.get(v.toLowerCase());
      if (hit) labels.push(hit);
      else unknown.push(v);
    }
    return { labels, unknown };
  }

  async isEligibleLeadBy(empId: number): Promise<boolean> {
    if (!Number.isInteger(empId) || empId <= 0) return false;
    const n = await this.prisma.employees.count({
      where: { emp_id: empId, deleted_at: null, status: 'Active', ...this.leadByEligibility() },
    });
    return n > 0;
  }

  async getNextLeadCode(): Promise<string> {
    const row = await this.prisma.entity_counters.findFirst({ where: { entity_type: 'LEAD', counter_key: 'GLOBAL' } });
    return `LEAD-${String((row?.last_number ?? 0) + 1).padStart(4, '0')}`;
  }

  async createLead(data: CreateLeadData): Promise<{ lead_id: number; lead_code: string }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await this.findOpenLead(tx, data.company_id);
        if (existing) throw new OpenLeadExistsError(existing);

        const stage = await tx.pipeline_stages.findFirst({
          where: { name: { equals: 'New', mode: 'insensitive' }, deleted_at: null },
          select: { pipeline_stage_id: true },
        });
        if (!stage) throw new Error('Pipeline stage "New" is missing; run the lead module migration.');

        const source = await tx.master_lookup.findFirst({
          where: { lookup_type: 'lead_source', deleted_at: null, label: { equals: data.lead_source, mode: 'insensitive' } },
          select: { lookup_id: true },
        });

        const lead = await tx.leads.create({
          data: {
            company_id: data.company_id,
            person_id: data.person_id,
            title: data.company_name.slice(0, MAX_TITLE),
            // lead_stage is the source of truth; a trigger keeps status / pipeline stage in step.
            pipeline_stage_id: stage.pipeline_stage_id,
            owner_id: data.lead_by_id,
            lead_by_id: data.lead_by_id,
            lead_stage: 'New',
            lead_source: data.lead_source,
            source_id: source?.lookup_id ?? null,
            service_fit: joinServiceFit(data.service_fit),
            created_by: data.actor_emp_id,
          },
          select: { lead_id: true, lead_code: true },
        });

        if (data.first_note) {
          await tx.crm_lead_notes.create({
            data: {
              lead_id: lead.lead_id,
              company_id: data.company_id,
              note_type: 'Requirement',
              note: data.first_note,
              created_by: data.actor_emp_id,
            },
          });
        }

        const details = {
          company_id: data.company_id,
          lead_source: data.lead_source,
          service_fit: data.service_fit,
          lead_by_id: data.lead_by_id,
        } as Prisma.InputJsonValue;
        await tx.activity_logs.createMany({
          data: [
            {
              entity_type: 'LEAD',
              entity_id: lead.lead_id,
              event: 'CREATED',
              summary: `Lead ${lead.lead_code} created (New)`,
              details,
              performed_by: data.actor_emp_id,
            },
            {
              entity_type: 'COMPANY',
              entity_id: data.company_id,
              event: 'LEAD_CREATED',
              summary: `Converted to lead ${lead.lead_code}`,
              details,
              performed_by: data.actor_emp_id,
            },
          ],
        });

        return { lead_id: lead.lead_id, lead_code: lead.lead_code as string };
      });
    } catch (err) {
      // Two people converting the same company at once: the unique index lets only one win.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.findOpenLead(this.prisma, data.company_id);
        if (existing) throw new OpenLeadExistsError(existing);
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------- list ----

  async list(p: ListLeadsParams): Promise<LeadList> {
    const where = this.buildWhere(p);
    const [rows, total, counters] = await Promise.all([
      this.prisma.leads.findMany({
        where,
        orderBy: this.buildOrder(p),
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        select: LIST_SELECT,
      }),
      this.prisma.leads.count({ where }),
      this.counters(p),
    ]);
    const tags = await this.noFollowUp(rows, p.now);
    return {
      items: rows.map((r) => this.toItem(r, p.now, tags)),
      total,
      page: p.page,
      limit: p.limit,
      total_pages: Math.max(Math.ceil(total / p.limit), 1),
      counters,
    };
  }

  async board(p: Omit<ListLeadsParams, 'page' | 'limit'> & { per_column: number }): Promise<LeadBoard> {
    const base = { ...p, page: 1, limit: p.per_column };
    const where = this.buildWhere(base);
    const order = this.buildOrder(base);
    // Only the columns the status filter allows are shown (all six by default).
    const wanted = LEAD_STATUSES.filter((s) => this.statusMatches(p.status, s));

    const [columns, counters] = await Promise.all([
      Promise.all(
        wanted.map(async (status): Promise<BoardColumn> => {
          const colWhere: Prisma.leadsWhereInput = { AND: [where, { lead_stage: status }] };
          const [count, rows] = await Promise.all([
            this.prisma.leads.count({ where: colWhere }),
            this.prisma.leads.findMany({ where: colWhere, orderBy: order, take: p.per_column, select: LIST_SELECT }),
          ]);
          const tags = await this.noFollowUp(rows, p.now);
          return { status, count, cards: rows.map((r) => this.toCard(r, p.now, tags)) };
        }),
      ),
      this.counters(base),
    ]);
    return { columns, per_column: p.per_column, counters };
  }

  private statusMatches(filter: ListLeadsParams['status'], status: LeadStatus): boolean {
    if (!filter || filter === 'all') return true;
    if (filter === 'open') return OPEN_STATUSES.includes(status);
    return filter === status;
  }

  private toItem(r: ListRow, now: Date, noFollowUp: Set<number>): LeadListItem {
    const co = r.companies;
    return {
      lead_id: r.lead_id,
      lead_code: r.lead_code,
      status: this.asStatus(r.lead_stage),
      company: {
        company_id: co?.company_id ?? 0,
        company_code: co?.company_code ?? null,
        name: co?.name ?? '',
        initials: initialsOf(co?.name ?? ''),
        city: co?.city ?? null,
      },
      contact_person: r.persons?.name ?? co?.contact_person ?? null,
      lead_by: r.employees_leads_lead_by_idToemployees,
      service_fit: splitServiceFit(r.service_fit),
      lead_source: r.lead_source,
      date_added: r.created_at,
      next_follow_up: r.next_follow_up_at ? { at: r.next_follow_up_at, flag: followUpFlag(r.next_follow_up_at, now) } : null,
      no_follow_up: noFollowUp.has(r.lead_id),
    };
  }

  /**
   * "An open lead with no pending follow-up for 7 days shows a No follow-up tag." The clock starts at the
   * last follow-up activity of the lead, or at the lead itself when it never had one.
   */
  private async noFollowUp(rows: ListRow[], now: Date): Promise<Set<number>> {
    const candidates = rows.filter((r) => r.next_follow_up_at === null && (OPEN as string[]).includes(r.lead_stage ?? ''));
    if (candidates.length === 0) return new Set();
    const last = await this.prisma.crm_follow_ups.groupBy({
      by: ['lead_id'],
      where: { lead_id: { in: candidates.map((r) => r.lead_id) }, deleted_at: null },
      _max: { updated_at: true, created_at: true },
    });
    const lastById = new Map(last.map((g) => [g.lead_id, Math.max(g._max.updated_at?.getTime() ?? 0, g._max.created_at?.getTime() ?? 0)]));
    const cutoff = now.getTime() - NO_FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000;
    return new Set(candidates.filter((r) => Math.max(r.created_at.getTime(), lastById.get(r.lead_id) ?? 0) <= cutoff).map((r) => r.lead_id));
  }

  private toCard(r: ListRow, now: Date, noFollowUp: Set<number>): BoardCard {
    const item = this.toItem(r, now, noFollowUp);
    return {
      ...item,
      follow_up_due: isFollowUpDue(r.next_follow_up_at, now),
      lost_reason: item.status === 'Lost' ? r.lost_reason : null,
      client_code: item.status === 'Converted' ? (r.companies?.client_code ?? null) : null,
    };
  }

  private asStatus(stage: string | null): LeadStatus {
    return (LEAD_STATUSES as readonly string[]).includes(stage ?? '') ? (stage as LeadStatus) : 'New';
  }

  private async counters(p: ListLeadsParams): Promise<LeadCounters> {
    // Counters describe the same leads as the list but ignore the Status and Follow-up filters,
    // so every status keeps its number and a counter can be clicked to narrow the list.
    const where = this.buildWhere({ ...p, status: 'all', follow_up: undefined });
    const day = istDayRange(p.now);
    const [groups, dueToday] = await Promise.all([
      this.prisma.leads.groupBy({ by: ['lead_stage'], where, _count: { _all: true } }),
      this.prisma.crm_follow_ups.count({
        where: {
          deleted_at: null,
          status: { in: OPEN_FOLLOW_UP_STATUSES },
          follow_up_on: { gte: day.from, lt: day.to },
          leads: where,
        },
      }),
    ]);
    const by_status = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const g of groups) {
      if (g.lead_stage && g.lead_stage in by_status) by_status[g.lead_stage as LeadStatus] = g._count._all;
    }
    return { by_status, follow_ups_due_today: dueToday };
  }

  private buildOrder(p: Pick<ListLeadsParams, 'sort' | 'order'>): Prisma.leadsOrderByWithRelationInput[] {
    const dir = p.order ?? 'asc';
    const tail: Prisma.leadsOrderByWithRelationInput = { lead_id: 'desc' };
    switch (p.sort) {
      case 'company':
        return [{ companies: { name: dir } }, tail];
      case 'city':
        return [{ companies: { city: dir } }, tail];
      case 'date_added':
        return [{ created_at: p.order ?? 'desc' }, tail];
      case 'status':
        return [{ lead_stage: dir }, tail];
      default:
        // Next follow-up first, so the most urgent leads are on top; leads without one come last.
        return [{ next_follow_up_at: { sort: dir, nulls: 'last' } }, { created_at: 'desc' }, tail];
    }
  }

  private buildWhere(p: LeadFilters & { now: Date }): Prisma.leadsWhereInput {
    const and: Prisma.leadsWhereInput[] = [{ deleted_at: null }];
    const ci = (v: string) => ({ contains: v, mode: 'insensitive' as const });
    const eqAny = (values: string[]) => values.map((v) => ({ equals: v, mode: 'insensitive' as const }));

    if (p.status === 'open' || p.status === undefined) and.push({ lead_stage: { in: OPEN } });
    else if (p.status !== 'all') and.push({ lead_stage: p.status });

    if (p.lead_by_id !== undefined) and.push({ lead_by_id: p.lead_by_id });

    const q = p.q?.trim();
    if (q) {
      // Only a phone-like search (digits, +, spaces, dashes) looks at mobile numbers, so "COM-1315" never matches a phone containing 1315.
      const digits = /^[+()\d\s-]+$/.test(q) ? q.replace(/\D/g, '') : '';
      and.push({
        OR: [
          { lead_code: ci(q) },
          { companies: { name: ci(q) } },
          { companies: { company_code: ci(q) } },
          { companies: { contact_person: ci(q) } },
          { persons: { name: ci(q) } },
          ...(digits.length >= 3
            ? [{ persons: { mobile: { contains: digits } } }, { companies: { mobile: { contains: digits } } }]
            : []),
        ],
      });
    }

    const company: Prisma.companiesWhereInput[] = [];
    if (p.city?.length) company.push({ OR: eqAny(p.city).map((c) => ({ city: c })) });
    if (p.state?.length) company.push({ OR: eqAny(p.state).map((c) => ({ state: c })) });
    if (p.industry_ids?.length) {
      company.push({ OR: [{ industry_id: { in: p.industry_ids } }, { sub_industry_id: { in: p.industry_ids } }] });
    }
    if (p.nature_of_business?.length) company.push({ OR: eqAny(p.nature_of_business).map((c) => ({ nature_of_business: c })) });
    if (p.gidc_name?.length) company.push({ OR: eqAny(p.gidc_name).map((c) => ({ gidc_name: c })) });
    if (p.website_quality?.length) company.push({ OR: eqAny(p.website_quality).map((c) => ({ website_quality: c })) });
    if (p.is_gidc !== undefined) company.push(p.is_gidc ? { is_gidc: true } : { OR: [{ is_gidc: false }, { is_gidc: null }] });
    if (company.length > 0) and.push({ companies: { AND: company } });

    if (p.lead_source?.length) and.push({ OR: eqAny(p.lead_source).map((v) => ({ lead_source: v })) });
    if (p.service_fit?.length) and.push({ OR: p.service_fit.map((v) => ({ service_fit: ci(v) })) });
    if (p.lost_reason) and.push({ lost_reason: { equals: p.lost_reason, mode: 'insensitive' } });

    if (p.no_conversation_days) {
      const cutoff = new Date(p.now.getTime() - p.no_conversation_days * 24 * 60 * 60 * 1000);
      and.push({ crm_communications: { none: { deleted_at: null, communication_date: { gte: cutoff } } } });
    }

    switch (p.follow_up) {
      case 'today': {
        const d = istDayRange(p.now);
        and.push({ next_follow_up_at: { gte: d.from, lt: d.to } });
        break;
      }
      case 'overdue':
        and.push({ next_follow_up_at: { lt: new Date(p.now.getTime() - OVERDUE_GRACE_MS) } });
        break;
      case 'this_week': {
        const w = istWeekRange(p.now);
        and.push({ next_follow_up_at: { gte: w.from, lt: w.to } });
        break;
      }
      case 'none':
        and.push({ next_follow_up_at: null });
        break;
      default:
        break;
    }

    const added = p.date_added === 'today' ? istDayRange(p.now)
      : p.date_added === 'this_week' ? istWeekRange(p.now)
      : p.date_added === 'this_month' ? istMonthRange(p.now)
      : null;
    if (added) and.push({ created_at: { gte: added.from, lt: added.to } });
    if (p.added_from || p.added_to) {
      and.push({ created_at: { ...(p.added_from ? { gte: p.added_from } : {}), ...(p.added_to ? { lte: p.added_to } : {}) } });
    }

    return { AND: and };
  }

  // -------------------------------------------------------------- detail ----

  async getDetail(leadId: number, now: Date): Promise<LeadDetail | null> {
    const l = await this.prisma.leads.findFirst({
      where: { lead_id: leadId, deleted_at: null },
      select: {
        lead_id: true,
        lead_code: true,
        lead_stage: true,
        lead_source: true,
        service_fit: true,
        created_at: true,
        next_follow_up_at: true,
        won_on: true,
        win_note: true,
        lost_reason: true,
        lost_note: true,
        on_hold_reason: true,
        converted_client_id: true,
        companies: {
          select: {
            company_id: true,
            company_code: true,
            name: true,
            city: true,
            state: true,
            is_gidc: true,
            gidc_name: true,
            is_client: true,
            client_code: true,
          },
        },
        persons: { select: { person_id: true, name: true, mobile: true, email: true } },
        employees_leads_lead_by_idToemployees: { select: { emp_id: true, name: true } },
        employees_leads_created_byToemployees: { select: { emp_id: true, name: true } },
      },
    });
    if (!l || !l.companies) return null;

    const [conversations, openFollowUps, notes, designation] = await Promise.all([
      this.prisma.crm_communications.count({ where: { lead_id: leadId, deleted_at: null } }),
      this.prisma.crm_follow_ups.count({ where: { lead_id: leadId, deleted_at: null, status: { in: OPEN_FOLLOW_UP_STATUSES } } }),
      this.prisma.crm_lead_notes.count({ where: { lead_id: leadId, deleted_at: null } }),
      l.persons
        ? this.prisma.company_persons.findFirst({
            where: { company_id: l.companies.company_id, person_id: l.persons.person_id, deleted_at: null },
            select: { designation: true },
          })
        : Promise.resolve(null),
    ]);

    const status = this.asStatus(l.lead_stage);
    return {
      lead_id: l.lead_id,
      lead_code: l.lead_code,
      status,
      date_added: l.created_at,
      lead_source: l.lead_source,
      service_fit: splitServiceFit(l.service_fit),
      lead_by: l.employees_leads_lead_by_idToemployees,
      created_by: l.employees_leads_created_byToemployees,
      company: {
        company_id: l.companies.company_id,
        company_code: l.companies.company_code,
        name: l.companies.name,
        city: l.companies.city,
        state: l.companies.state,
        is_gidc: l.companies.is_gidc === true,
        gidc_name: l.companies.gidc_name,
      },
      primary_contact: l.persons
        ? { person_id: l.persons.person_id, name: l.persons.name, designation: designation?.designation ?? null, mobile: l.persons.mobile, email: l.persons.email }
        : null,
      counts: { conversations, open_follow_ups: openFollowUps, notes },
      next_follow_up: l.next_follow_up_at ? { at: l.next_follow_up_at, flag: followUpFlag(l.next_follow_up_at, now) } : null,
      won_on: l.won_on,
      win_note: l.win_note,
      lost_reason: l.lost_reason,
      lost_note: l.lost_note,
      on_hold_reason: l.on_hold_reason,
      client_code: status === 'Converted' ? l.companies.client_code : null,
      client_id: l.converted_client_id,
    };
  }
}
