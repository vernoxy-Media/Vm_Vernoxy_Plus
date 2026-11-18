import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  AdminOverviewKpis,
  CampaignCallRow,
  CampaignCompanyContext,
  CampaignCompanyFilter,
  CampaignCompanyRow,
  CampaignListFilter,
  CampaignMasters,
  CampaignSummary,
  CampaignWrite,
  CompanySearchFilter,
  CompanySearchRow,
  EmployeeCampaignStats,
  LogCampaignCallData,
  SalesCampaignRepositoryPort,
} from '../../application/ports/sales-campaign.repository.port';
import { FieldValidationError } from '../../domain/errors/sales.errors';
import { deriveCallingStatus } from '../../domain/services/campaign.service';

type Tx = Prisma.TransactionClient;
const sql = Prisma.sql;

/** A day starts and ends at midnight India time, the same as the rest of the Sales module. */
const DAY_START = sql`(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;
const DAY_END = sql`((date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata')`;

/** The stage of the company's latest lead, or "No lead". */
const LEAD_STAGE = sql`COALESCE((SELECT l.lead_stage FROM leads l WHERE l.company_id = co.company_id AND l.deleted_at IS NULL ORDER BY l.created_at DESC, l.lead_id DESC LIMIT 1), 'No lead')`;

/** A Sales employee: active, and either in the Sales department or an Admin (the same rule the access guard uses). */
const ELIGIBLE_EMPLOYEE = sql`e.status = 'Active' AND e.deleted_at IS NULL AND (r.is_admin = true OR lower(d.name) LIKE 'sales%')`;

const MAX_ADD = 5000;

const like = (s: string) => `%${s.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const and = (conds: Prisma.Sql[]) => Prisma.join(conds, ' AND ');

const CAMPAIGN_SELECT = sql`
  SELECT c.campaign_id, c.name, c.campaign_type, c.target_cities, c.target_state, c.industry_id, i.name AS industry_name,
         to_char(c.start_date, 'YYYY-MM-DD') AS start_date, to_char(c.end_date, 'YYYY-MM-DD') AS end_date,
         c.objective, c.description, c.status, c.created_at,
         COALESCE(k.total, 0)::int AS total_companies, COALESCE(k.assigned, 0)::int AS assigned_companies, COALESCE(k.called, 0)::int AS called_companies
    FROM crm_campaigns c
    LEFT JOIN industries i ON i.industry_id = c.industry_id
    LEFT JOIN LATERAL (
      SELECT count(*) AS total, count(x.assigned_to) AS assigned, count(*) FILTER (WHERE x.call_attempts > 0) AS called
        FROM crm_campaign_companies x
       WHERE x.campaign_id = c.campaign_id AND x.deleted_at IS NULL
    ) k ON true`;

/** Meetings are the follow-ups of type Meeting that the assigned employee made on the company since the campaign began. */
const MEETING_LATERAL = sql`
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE f.status <> 'Cancelled') AS scheduled_n, count(*) FILTER (WHERE f.status = 'Completed') AS completed_n
      FROM crm_follow_ups f
     WHERE f.company_id = cc.company_id AND f.type = 'Meeting' AND f.deleted_at IS NULL
       AND f.assigned_to = cc.assigned_to AND f.created_at >= c.start_date
  ) m ON true`;

type CompanyRowRaw = Omit<CampaignCompanyRow, 'calling_status'>;

@Injectable()
export class PrismaSalesCampaignRepository implements SalesCampaignRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------- campaigns ----

  async listCampaigns(filter: CampaignListFilter, page: number, limit: number, scopeEmpId: number | null) {
    const conds: Prisma.Sql[] = [sql`c.deleted_at IS NULL`];
    if (filter.q?.trim()) conds.push(sql`c.name ILIKE ${like(filter.q)}`);
    if (filter.type) conds.push(sql`strpos(c.campaign_type, ${filter.type}) > 0`);
    if (filter.city?.trim()) conds.push(sql`EXISTS (SELECT 1 FROM unnest(c.target_cities) t WHERE lower(btrim(t)) = lower(btrim(${filter.city})))`);
    if (filter.emp_id) {
      conds.push(sql`EXISTS (SELECT 1 FROM crm_campaign_companies x WHERE x.campaign_id = c.campaign_id AND x.assigned_to = ${filter.emp_id} AND x.deleted_at IS NULL)`);
    }
    if (filter.start_from) conds.push(sql`c.start_date >= ${filter.start_from}::date`);
    if (filter.end_to) conds.push(sql`c.end_date <= ${filter.end_to}::date`);
    if (filter.status) conds.push(sql`c.status = ${filter.status}`);
    if (scopeEmpId !== null) {
      conds.push(sql`c.status <> 'Draft'`);
      conds.push(sql`EXISTS (SELECT 1 FROM crm_campaign_companies x WHERE x.campaign_id = c.campaign_id AND x.assigned_to = ${scopeEmpId} AND x.deleted_at IS NULL)`);
    }
    const where = and(conds);

    const [items, total] = await Promise.all([
      this.prisma.$queryRaw<CampaignSummary[]>(sql`${CAMPAIGN_SELECT} WHERE ${where} ORDER BY c.created_at DESC, c.campaign_id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
      this.prisma.$queryRaw<{ n: number }[]>(sql`SELECT count(*)::int AS n FROM crm_campaigns c WHERE ${where}`),
    ]);
    return { items, total: total[0]?.n ?? 0 };
  }

  async getCampaign(id: number) {
    const rows = await this.prisma.$queryRaw<CampaignSummary[]>(sql`${CAMPAIGN_SELECT} WHERE c.campaign_id = ${id} AND c.deleted_at IS NULL`);
    return rows[0] ?? null;
  }

  private async assertIndustry(id: number | null | undefined) {
    if (id === null || id === undefined) return;
    const rows = await this.prisma.$queryRaw<{ n: number }[]>(sql`SELECT count(*)::int AS n FROM industries WHERE industry_id = ${id} AND deleted_at IS NULL`);
    if (!rows[0]?.n) throw new FieldValidationError([{ field: 'industry_id', message: 'Choose an industry from the list.' }]);
  }

  async createCampaign(d: CampaignWrite, actorEmpId: number) {
    await this.assertIndustry(d.industry_id);
    const rows = await this.prisma.$queryRaw<{ campaign_id: number }[]>(sql`
      INSERT INTO crm_campaigns (name, campaign_type, target_cities, target_state, industry_id, start_date, end_date, objective, description, status, created_by)
      VALUES (${d.name}, ${d.campaign_type}, ${d.target_cities}::text[], ${d.target_state}, ${d.industry_id}::int, ${d.start_date}::date, ${d.end_date}::date,
              ${d.objective}, ${d.description}, ${d.status}, ${actorEmpId})
      RETURNING campaign_id`);
    return rows[0].campaign_id;
  }

  async updateCampaign(id: number, d: Partial<CampaignWrite>, actorEmpId: number) {
    if (d.industry_id !== undefined) await this.assertIndustry(d.industry_id);
    const sets: Prisma.Sql[] = [];
    if (d.name !== undefined) sets.push(sql`name = ${d.name}`);
    if (d.campaign_type !== undefined) sets.push(sql`campaign_type = ${d.campaign_type}`);
    if (d.target_cities !== undefined) sets.push(sql`target_cities = ${d.target_cities}::text[]`);
    if (d.target_state !== undefined) sets.push(sql`target_state = ${d.target_state}`);
    if (d.industry_id !== undefined) sets.push(sql`industry_id = ${d.industry_id}::int`);
    if (d.start_date !== undefined) sets.push(sql`start_date = ${d.start_date}::date`);
    if (d.end_date !== undefined) sets.push(sql`end_date = ${d.end_date}::date`);
    if (d.objective !== undefined) sets.push(sql`objective = ${d.objective}`);
    if (d.description !== undefined) sets.push(sql`description = ${d.description}`);
    if (d.status !== undefined) sets.push(sql`status = ${d.status}`);
    if (sets.length === 0) return;
    sets.push(sql`updated_by = ${actorEmpId}`);
    await this.prisma.$executeRaw(sql`UPDATE crm_campaigns SET ${Prisma.join(sets, ', ')} WHERE campaign_id = ${id} AND deleted_at IS NULL`);
  }

  async getMasters(): Promise<CampaignMasters> {
    const [industries, customer_types, states, cities, employees, reasons] = await Promise.all([
      this.prisma.$queryRaw<CampaignMasters['industries']>(sql`SELECT industry_id, name FROM industries WHERE deleted_at IS NULL AND is_active ORDER BY name`),
      this.prisma.$queryRaw<CampaignMasters['customer_types']>(sql`SELECT customer_type_id, name FROM customer_types WHERE deleted_at IS NULL AND is_active ORDER BY name`),
      this.prisma.$queryRaw<{ v: string }[]>(sql`
        SELECT DISTINCT ON (lower(btrim(state))) btrim(state) AS v FROM companies
         WHERE deleted_at IS NULL AND state IS NOT NULL AND btrim(state) <> '' ORDER BY lower(btrim(state)) LIMIT 500`),
      this.prisma.$queryRaw<{ v: string }[]>(sql`
        SELECT DISTINCT ON (lower(btrim(city))) btrim(city) AS v FROM companies
         WHERE deleted_at IS NULL AND city IS NOT NULL AND btrim(city) <> '' ORDER BY lower(btrim(city)) LIMIT 3000`),
      this.prisma.$queryRaw<CampaignMasters['employees']>(sql`
        SELECT e.emp_id, e.name FROM employees e
          LEFT JOIN roles r ON r.role_id = e.role_id
          LEFT JOIN departments d ON d.dep_id = e.dep_id
         WHERE ${ELIGIBLE_EMPLOYEE} ORDER BY e.name`),
      this.prisma.$queryRaw<{ label: string }[]>(sql`
        SELECT label FROM master_lookup
         WHERE lookup_type = 'call_not_received_reason' AND deleted_at IS NULL AND is_active ORDER BY sort_order, label`),
    ]);
    return {
      industries,
      customer_types,
      states: states.map((s) => s.v),
      cities: cities.map((c) => c.v),
      employees,
      not_received_reasons: reasons.map((r) => r.label),
    };
  }

  async isEligibleEmployee(empId: number) {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>(sql`
      SELECT count(*)::int AS n FROM employees e
        LEFT JOIN roles r ON r.role_id = e.role_id
        LEFT JOIN departments d ON d.dep_id = e.dep_id
       WHERE e.emp_id = ${empId} AND ${ELIGIBLE_EMPLOYEE}`);
    return (rows[0]?.n ?? 0) > 0;
  }

  // ------------------------------------------------ choosing companies ----

  private companyWhere(f: CompanySearchFilter, campaignId: number | null): Prisma.Sql {
    const conds: Prisma.Sql[] = [sql`co.deleted_at IS NULL`, sql`co.is_active IS NOT FALSE`];
    if (f.q?.trim()) conds.push(sql`(co.name ILIKE ${like(f.q)} OR co.company_code ILIKE ${like(f.q)})`);
    if (f.cities && f.cities.length > 0) conds.push(sql`lower(btrim(co.city)) = ANY(${f.cities.map((c) => c.trim().toLowerCase())}::text[])`);
    if (f.state?.trim()) conds.push(sql`lower(btrim(co.state)) = lower(btrim(${f.state}))`);
    if (f.industry_ids && f.industry_ids.length > 0) {
      conds.push(sql`(co.industry_id = ANY(${f.industry_ids}::int[]) OR co.sub_industry_id = ANY(${f.industry_ids}::int[]))`);
    }
    if (f.customer_type_id) conds.push(sql`co.customer_type_id = ${f.customer_type_id}`);
    if (f.lead_status) conds.push(sql`${LEAD_STAGE} = ${f.lead_status}`);
    if (f.contacted === 'yes') conds.push(sql`EXISTS (SELECT 1 FROM crm_communications m WHERE m.company_id = co.company_id AND m.deleted_at IS NULL)`);
    if (f.contacted === 'no') conds.push(sql`NOT EXISTS (SELECT 1 FROM crm_communications m WHERE m.company_id = co.company_id AND m.deleted_at IS NULL)`);
    if (f.hide_added && campaignId !== null) {
      conds.push(sql`NOT EXISTS (SELECT 1 FROM crm_campaign_companies x WHERE x.campaign_id = ${campaignId} AND x.company_id = co.company_id AND x.deleted_at IS NULL)`);
    }
    return and(conds);
  }

  async searchCompanies(filter: CompanySearchFilter, campaignId: number | null, page: number, limit: number) {
    const where = this.companyWhere(filter, campaignId);
    const inCampaign = campaignId === null
      ? sql`false`
      : sql`EXISTS (SELECT 1 FROM crm_campaign_companies x WHERE x.campaign_id = ${campaignId} AND x.company_id = co.company_id AND x.deleted_at IS NULL)`;

    const [items, total] = await Promise.all([
      this.prisma.$queryRaw<CompanySearchRow[]>(sql`
        SELECT co.company_id, co.company_code, co.name, co.city, co.state, i.name AS industry, ct.name AS category,
               co.contact_person, co.mobile, ${LEAD_STAGE} AS lead_status,
               EXISTS (SELECT 1 FROM crm_communications m WHERE m.company_id = co.company_id AND m.deleted_at IS NULL) AS contacted,
               ${inCampaign} AS in_campaign
          FROM companies co
          LEFT JOIN industries i ON i.industry_id = co.industry_id
          LEFT JOIN customer_types ct ON ct.customer_type_id = co.customer_type_id
         WHERE ${where}
         ORDER BY co.name, co.company_id
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
      this.prisma.$queryRaw<{ n: number }[]>(sql`SELECT count(*)::int AS n FROM companies co WHERE ${where}`),
    ]);
    return { items, total: total[0]?.n ?? 0 };
  }

  async addCompanies(campaignId: number, by: { company_ids: number[] } | { filter: CompanySearchFilter }, actorEmpId: number) {
    if ('company_ids' in by) {
      const ids = [...new Set(by.company_ids)];
      const added = await this.prisma.$queryRaw<{ company_id: number }[]>(sql`
        INSERT INTO crm_campaign_companies (campaign_id, company_id, created_by)
        SELECT ${campaignId}, co.company_id, ${actorEmpId} FROM companies co
         WHERE co.company_id = ANY(${ids}::int[]) AND co.deleted_at IS NULL
        ON CONFLICT (campaign_id, company_id) WHERE deleted_at IS NULL DO NOTHING
        RETURNING company_id`);
      return { added: added.length, skipped: ids.length - added.length };
    }

    const where = this.companyWhere(by.filter, campaignId);
    const matched = await this.prisma.$queryRaw<{ n: number }[]>(sql`SELECT least(count(*), ${MAX_ADD})::int AS n FROM companies co WHERE ${where}`);
    const added = await this.prisma.$queryRaw<{ company_id: number }[]>(sql`
      INSERT INTO crm_campaign_companies (campaign_id, company_id, created_by)
      SELECT ${campaignId}, s.company_id, ${actorEmpId}
        FROM (SELECT co.company_id FROM companies co WHERE ${where} ORDER BY co.company_id LIMIT ${MAX_ADD}) s
      ON CONFLICT (campaign_id, company_id) WHERE deleted_at IS NULL DO NOTHING
      RETURNING company_id`);
    return { added: added.length, skipped: Math.max(0, (matched[0]?.n ?? 0) - added.length) };
  }

  async removeCompanies(campaignId: number, campaignCompanyIds: number[], actorEmpId: number) {
    const ids = [...new Set(campaignCompanyIds)];
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<{ n: number }[]>(sql`
        SELECT count(*)::int AS n FROM crm_campaign_companies
         WHERE campaign_id = ${campaignId} AND campaign_company_id = ANY(${ids}::int[]) AND deleted_at IS NULL`);
      const removed = await tx.$queryRaw<{ campaign_company_id: number }[]>(sql`
        UPDATE crm_campaign_companies SET deleted_at = clock_timestamp(), deleted_by = ${actorEmpId}
         WHERE campaign_id = ${campaignId} AND campaign_company_id = ANY(${ids}::int[]) AND deleted_at IS NULL AND call_attempts = 0
        RETURNING campaign_company_id`);
      return { removed: removed.length, kept: (existing[0]?.n ?? 0) - removed.length };
    });
  }

  // ------------------------------------------------------- assignment ----

  private companyRowsSelect(): Prisma.Sql {
    return sql`
      SELECT cc.campaign_company_id, cc.campaign_id, cc.company_id, co.company_code, co.name AS company_name, co.city, co.state,
             co.contact_person, co.mobile, cc.assigned_to, e.name AS assigned_to_name,
             cc.call_attempts, cc.last_call_status, cc.last_outcome, cc.last_called_at, cc.next_follow_up_on,
             COALESCE(m.scheduled_n, 0) > 0 AS meeting_scheduled
        FROM crm_campaign_companies cc
        JOIN crm_campaigns c ON c.campaign_id = cc.campaign_id AND c.deleted_at IS NULL
        JOIN companies co ON co.company_id = cc.company_id
        LEFT JOIN employees e ON e.emp_id = cc.assigned_to
        ${MEETING_LATERAL}`;
  }

  private withStatus(rows: CompanyRowRaw[]): CampaignCompanyRow[] {
    return rows.map((r) => ({ ...r, calling_status: deriveCallingStatus(r) }));
  }

  async listCampaignCompanies(campaignId: number, f: CampaignCompanyFilter, page: number, limit: number) {
    const conds: Prisma.Sql[] = [sql`cc.campaign_id = ${campaignId}`, sql`cc.deleted_at IS NULL`];
    if (f.assigned_to === 'unassigned') conds.push(sql`cc.assigned_to IS NULL`);
    else if (typeof f.assigned_to === 'number') conds.push(sql`cc.assigned_to = ${f.assigned_to}`);
    if (f.q?.trim()) conds.push(sql`(co.name ILIKE ${like(f.q)} OR co.company_code ILIKE ${like(f.q)} OR co.mobile ILIKE ${like(f.q)})`);
    switch (f.calling) {
      case 'pending': conds.push(sql`cc.call_attempts = 0`); break;
      case 'connected': conds.push(sql`cc.last_call_status = 'Received'`); break;
      case 'not_received': conds.push(sql`cc.last_call_status = 'Not received'`); break;
      case 'interested': conds.push(sql`cc.last_outcome = 'Interested'`); break;
      case 'not_interested': conds.push(sql`cc.last_outcome = 'Not interested'`); break;
      case 'follow_up_due': conds.push(sql`cc.next_follow_up_on IS NOT NULL AND cc.next_follow_up_on < ${DAY_END}`); break;
      case 'meeting_scheduled': conds.push(sql`COALESCE(m.scheduled_n, 0) > 0`); break;
      default: break;
    }
    const where = and(conds);

    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<CompanyRowRaw[]>(sql`${this.companyRowsSelect()} WHERE ${where} ORDER BY co.name, cc.campaign_company_id LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
      this.prisma.$queryRaw<{ n: number }[]>(sql`
        SELECT count(*)::int AS n
          FROM crm_campaign_companies cc
          JOIN crm_campaigns c ON c.campaign_id = cc.campaign_id AND c.deleted_at IS NULL
          JOIN companies co ON co.company_id = cc.company_id
          ${MEETING_LATERAL}
         WHERE ${where}`),
    ]);
    return { items: this.withStatus(rows), total: total[0]?.n ?? 0 };
  }

  async getCampaignCompanyRow(campaignId: number, campaignCompanyId: number) {
    const rows = await this.prisma.$queryRaw<CompanyRowRaw[]>(sql`
      ${this.companyRowsSelect()} WHERE cc.campaign_id = ${campaignId} AND cc.campaign_company_id = ${campaignCompanyId} AND cc.deleted_at IS NULL`);
    return this.withStatus(rows)[0] ?? null;
  }

  async unassignedIds(campaignId: number) {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>(sql`
      SELECT cc.campaign_company_id AS id FROM crm_campaign_companies cc
       JOIN companies co ON co.company_id = cc.company_id
       WHERE cc.campaign_id = ${campaignId} AND cc.assigned_to IS NULL AND cc.deleted_at IS NULL
       ORDER BY lower(btrim(co.city)), co.name, cc.campaign_company_id`);
    return rows.map((r) => r.id);
  }

  async unassignedCount(campaignId: number) {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>(sql`
      SELECT count(*)::int AS n FROM crm_campaign_companies WHERE campaign_id = ${campaignId} AND assigned_to IS NULL AND deleted_at IS NULL`);
    return rows[0]?.n ?? 0;
  }

  async assign(campaignId: number, plan: { emp_id: number | null; campaign_company_ids: number[] }[], actorEmpId: number) {
    return this.prisma.$transaction(async (tx) => {
      let changed = 0;
      for (const p of plan) {
        changed += await tx.$executeRaw(sql`
          UPDATE crm_campaign_companies SET assigned_to = ${p.emp_id}::int, updated_by = ${actorEmpId}
           WHERE campaign_id = ${campaignId} AND campaign_company_id = ANY(${p.campaign_company_ids}::int[]) AND deleted_at IS NULL
             AND assigned_to IS DISTINCT FROM ${p.emp_id}::int`);
      }
      return changed;
    });
  }

  async setTargets(campaignId: number, targets: { emp_id: number; daily_target: number }[], actorEmpId: number) {
    await this.prisma.$transaction(async (tx) => {
      for (const t of targets) {
        await tx.$executeRaw(sql`
          INSERT INTO crm_campaign_targets (campaign_id, emp_id, daily_target, created_by)
          VALUES (${campaignId}, ${t.emp_id}, ${t.daily_target}, ${actorEmpId})
          ON CONFLICT (campaign_id, emp_id) WHERE deleted_at IS NULL
          DO UPDATE SET daily_target = EXCLUDED.daily_target, updated_by = EXCLUDED.created_by`);
      }
    });
  }

  async listTargets(campaignId: number) {
    return this.prisma.$queryRaw<{ emp_id: number; daily_target: number }[]>(sql`
      SELECT emp_id, daily_target FROM crm_campaign_targets WHERE campaign_id = ${campaignId} AND deleted_at IS NULL`);
  }

  // ------------------------------------------------------------ numbers ----

  async employeeStats(scope: { campaign_id?: number; emp_id?: number; exclude_draft?: boolean }) {
    const conds: Prisma.Sql[] = [sql`cc.deleted_at IS NULL`, sql`cc.assigned_to IS NOT NULL`];
    if (scope.campaign_id !== undefined) conds.push(sql`cc.campaign_id = ${scope.campaign_id}`);
    if (scope.emp_id !== undefined) conds.push(sql`cc.assigned_to = ${scope.emp_id}`);
    if (scope.exclude_draft) conds.push(sql`c.status <> 'Draft'`);

    return this.prisma.$queryRaw<EmployeeCampaignStats[]>(sql`
      WITH today AS (
        SELECT k.campaign_id, k.emp_id, count(*)::int AS n
          FROM crm_campaign_calls k
         WHERE k.deleted_at IS NULL AND k.called_at >= ${DAY_START}
         GROUP BY k.campaign_id, k.emp_id
      )
      SELECT cc.campaign_id, c.name AS campaign_name, c.status AS campaign_status, cc.assigned_to AS emp_id, e.name AS emp_name,
             count(*)::int AS assigned,
             count(*) FILTER (WHERE cc.call_attempts > 0)::int AS called,
             count(*) FILTER (WHERE cc.call_attempts = 0)::int AS pending,
             COALESCE(sum(cc.call_attempts), 0)::int AS call_attempts,
             count(*) FILTER (WHERE cc.last_call_status = 'Received')::int AS connected,
             count(*) FILTER (WHERE cc.last_call_status = 'Not received')::int AS not_received,
             count(*) FILTER (WHERE cc.last_outcome = 'Interested')::int AS interested,
             count(*) FILTER (WHERE cc.next_follow_up_on IS NOT NULL AND cc.next_follow_up_on < ${DAY_END})::int AS follow_ups_due,
             COALESCE(sum(m.scheduled_n), 0)::int AS meetings_scheduled,
             COALESCE(sum(m.completed_n), 0)::int AS meetings_completed,
             COALESCE(t.daily_target, 0)::int AS daily_target,
             COALESCE(td.n, 0)::int AS calls_today
        FROM crm_campaign_companies cc
        JOIN crm_campaigns c ON c.campaign_id = cc.campaign_id AND c.deleted_at IS NULL
        JOIN employees e ON e.emp_id = cc.assigned_to
        LEFT JOIN crm_campaign_targets t ON t.campaign_id = cc.campaign_id AND t.emp_id = cc.assigned_to AND t.deleted_at IS NULL
        LEFT JOIN today td ON td.campaign_id = cc.campaign_id AND td.emp_id = cc.assigned_to
        ${MEETING_LATERAL}
       WHERE ${and(conds)}
       GROUP BY cc.campaign_id, c.name, c.status, c.created_at, cc.assigned_to, e.name, t.daily_target, td.n
       ORDER BY c.created_at DESC, e.name`);
  }

  async adminOverview(): Promise<AdminOverviewKpis> {
    const rows = await this.prisma.$queryRaw<AdminOverviewKpis[]>(sql`
      SELECT (SELECT count(*)::int FROM crm_campaigns WHERE deleted_at IS NULL) AS total_campaigns,
             (SELECT count(*)::int FROM crm_campaigns WHERE deleted_at IS NULL AND status = 'Active') AS active_campaigns,
             count(DISTINCT cc.company_id)::int AS total_companies,
             count(*) FILTER (WHERE cc.assigned_to IS NOT NULL)::int AS assigned_companies,
             count(*) FILTER (WHERE cc.call_attempts = 0)::int AS pending_calls,
             COALESCE(sum(cc.call_attempts), 0)::int AS total_call_attempts,
             count(*) FILTER (WHERE cc.last_call_status = 'Received')::int AS connected_calls,
             COALESCE(sum(m.scheduled_n), 0)::int AS meetings_scheduled,
             COALESCE(sum(m.completed_n), 0)::int AS meetings_completed,
             count(*) FILTER (WHERE cc.last_outcome = 'Interested')::int AS interested_companies
        FROM crm_campaign_companies cc
        JOIN crm_campaigns c ON c.campaign_id = cc.campaign_id AND c.deleted_at IS NULL
        ${MEETING_LATERAL}
       WHERE cc.deleted_at IS NULL`);
    return rows[0];
  }

  // ------------------------------------------------------------- calls ----

  async getCampaignCompany(campaignId: number, campaignCompanyId: number): Promise<CampaignCompanyContext | null> {
    const rows = await this.prisma.$queryRaw<CampaignCompanyContext[]>(sql`
      SELECT cc.campaign_company_id, cc.campaign_id, c.name AS campaign_name, c.status AS campaign_status,
             cc.company_id, cc.assigned_to, co.contact_person
        FROM crm_campaign_companies cc
        JOIN crm_campaigns c ON c.campaign_id = cc.campaign_id AND c.deleted_at IS NULL
        JOIN companies co ON co.company_id = cc.company_id
       WHERE cc.campaign_id = ${campaignId} AND cc.campaign_company_id = ${campaignCompanyId} AND cc.deleted_at IS NULL`);
    return rows[0] ?? null;
  }

  /**
   * One transaction: the call goes into the company's normal history (crm_communications), into the campaign's own call list,
   * and the company's progress in the campaign moves on. Nothing is saved unless all three succeed.
   */
  async logCall(d: LogCampaignCallData) {
    const notReceived = d.call_status === 'Not received';
    await this.prisma.$transaction(async (tx: Tx) => {
      const comm = await tx.crm_communications.create({
        data: {
          company_id: d.company_id,
          contact_person_name: d.contact_person,
          type: 'Call',
          communication_date: new Date(),
          what_discussed: d.what_discussed ?? 'Call not received',
          outcome: d.outcome,
          call_status: d.call_status,
          not_received_reason: d.not_received_reason,
          call_duration_seconds: d.call_duration_seconds,
          created_by: d.actor_emp_id,
        },
        select: { communication_id: true },
      });

      await tx.$executeRaw(sql`
        INSERT INTO crm_campaign_calls (campaign_company_id, campaign_id, company_id, emp_id, communication_id, call_status, outcome, created_by)
        VALUES (${d.campaign_company_id}, ${d.campaign_id}, ${d.company_id}, ${d.actor_emp_id}, ${comm.communication_id}, ${d.call_status}, ${d.outcome}, ${d.actor_emp_id})`);

      // A missed call keeps the result of the last call that was picked up, so an Interested company stays counted.
      await tx.$executeRaw(sql`
        UPDATE crm_campaign_companies
           SET call_attempts = call_attempts + 1,
               last_call_status = ${d.call_status},
               last_outcome = CASE WHEN ${notReceived}::boolean THEN last_outcome ELSE ${d.outcome}::varchar END,
               last_called_at = clock_timestamp(),
               next_follow_up_on = ${d.next_follow_up_on}::timestamptz,
               updated_by = ${d.actor_emp_id}
         WHERE campaign_company_id = ${d.campaign_company_id}`);
    });
    return { campaign_company_id: d.campaign_company_id };
  }

  async listCalls(campaignCompanyId: number) {
    return this.prisma.$queryRaw<CampaignCallRow[]>(sql`
      SELECT k.call_id, k.emp_id, e.name AS emp_name, k.call_status, k.outcome, k.called_at,
             m.what_discussed, m.not_received_reason, m.call_duration_seconds
        FROM crm_campaign_calls k
        LEFT JOIN employees e ON e.emp_id = k.emp_id
        LEFT JOIN crm_communications m ON m.communication_id = k.communication_id
       WHERE k.campaign_company_id = ${campaignCompanyId} AND k.deleted_at IS NULL
       ORDER BY k.called_at DESC, k.call_id DESC
       LIMIT 100`);
  }
}
