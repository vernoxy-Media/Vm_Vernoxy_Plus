import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  SalesReportCallCounts,
  SalesReportCallRecord,
  SalesReportCallScope,
  SalesReportRepositoryPort,
  SalesReportScope,
} from '../../application/ports/sales-report.repository.port';
import { OUTCOMES } from '../../domain/services/activity-validator.service';
import { CompanyCallAttempt } from '../../domain/services/company-call-report.service';
import { ReportExtras, ReportLeadRow } from '../../domain/services/sales-report.service';

@Injectable()
export class PrismaSalesReportRepository implements SalesReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async campaignCompanyIds(campaignId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ company_id: number }[]>`
      SELECT cc.company_id
        FROM crm_campaign_companies cc
        JOIN crm_campaigns c ON c.campaign_id = cc.campaign_id AND c.deleted_at IS NULL
       WHERE cc.campaign_id = ${campaignId} AND cc.deleted_at IS NULL`;
    return rows.map((r) => r.company_id);
  }

  /** The one definition of "a call that matches the filters", shared by the cards, the outcome counts and their records. */
  private callWhere(range: { from: Date | null; to: Date | null }, { personId, campaignId }: SalesReportCallScope): Prisma.Sql {
    const conds: Prisma.Sql[] = [Prisma.sql`m.deleted_at IS NULL`, Prisma.sql`m.type = 'Call'`];
    if (range.from) conds.push(Prisma.sql`m.communication_date >= ${range.from}`);
    if (range.to) conds.push(Prisma.sql`m.communication_date <= ${range.to}`);
    if (personId) conds.push(Prisma.sql`m.created_by = ${personId}`);
    if (campaignId) {
      conds.push(Prisma.sql`EXISTS (
        SELECT 1 FROM crm_campaign_calls k
          JOIN crm_campaigns c ON c.campaign_id = k.campaign_id AND c.deleted_at IS NULL
         WHERE k.communication_id = m.communication_id AND k.campaign_id = ${campaignId} AND k.deleted_at IS NULL)`);
    }
    return Prisma.join(conds, ' AND ');
  }

  async callCounts(range: { from: Date | null; to: Date | null }, scope: SalesReportCallScope): Promise<SalesReportCallCounts> {
    const rows = await this.prisma.$queryRaw<SalesReportCallCounts[]>(Prisma.sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE m.call_status = 'Received')::int AS received,
             count(*) FILTER (WHERE m.call_status = 'Not received')::int AS not_received
        FROM crm_communications m
       WHERE ${this.callWhere(range, scope)}`);
    return rows[0];
  }

  async receivedOutcomeCounts(range: { from: Date | null; to: Date | null }, scope: SalesReportCallScope) {
    return this.prisma.$queryRaw<Array<{ outcome: string | null; count: number }>>(Prisma.sql`
      SELECT m.outcome, count(*)::int AS count
        FROM crm_communications m
       WHERE ${this.callWhere(range, scope)} AND m.call_status = 'Received'
       GROUP BY m.outcome`);
  }

  async receivedCalls(range: { from: Date | null; to: Date | null }, scope: SalesReportCallScope, outcome: string | null) {
    // null asks for the calls whose outcome is empty or no longer on the list.
    const match =
      outcome === null
        ? Prisma.sql`(m.outcome IS NULL OR m.outcome NOT IN (${Prisma.join([...OUTCOMES])}))`
        : Prisma.sql`m.outcome = ${outcome}`;
    return this.prisma.$queryRaw<SalesReportCallRecord[]>(Prisma.sql`
      SELECT m.communication_id, co.company_id, COALESCE(co.name, l.company_name) AS company_name,
             m.contact_person_name AS contact_person, m.communication_date AS call_date, m.what_discussed, e.name AS called_by
        FROM crm_communications m
        LEFT JOIN leads l ON l.lead_id = m.lead_id
        LEFT JOIN companies co ON co.company_id = COALESCE(m.company_id, l.company_id)
        LEFT JOIN employees e ON e.emp_id = m.created_by
       WHERE ${this.callWhere(range, scope)} AND m.call_status = 'Received' AND ${match}
       ORDER BY lower(COALESCE(co.name, l.company_name)), co.company_id, m.communication_date DESC`);
  }

  private selectCalls(where: Prisma.Sql): Promise<CompanyCallAttempt[]> {
    return this.prisma.$queryRaw<CompanyCallAttempt[]>(Prisma.sql`
      SELECT m.communication_id, co.company_id, m.lead_id, COALESCE(co.name, l.company_name) AS company_name,
             COALESCE(co.contact_person, l.contact_person) AS company_contact, m.contact_person_name AS call_contact,
             m.communication_date AS call_date, m.call_status, m.not_received_reason, m.outcome,
             m.call_duration_seconds AS duration_seconds, m.what_discussed AS remark, e.name AS called_by
        FROM crm_communications m
        LEFT JOIN leads l ON l.lead_id = m.lead_id
        LEFT JOIN companies co ON co.company_id = COALESCE(m.company_id, l.company_id)
        LEFT JOIN employees e ON e.emp_id = m.created_by
       WHERE ${where}
       ORDER BY m.communication_date DESC, m.communication_id DESC`);
  }

  callAttempts(range: { from: Date | null; to: Date | null }, scope: SalesReportCallScope): Promise<CompanyCallAttempt[]> {
    return this.selectCalls(this.callWhere(range, scope));
  }

  companyCallHistory(companyId: number, personId?: number): Promise<CompanyCallAttempt[]> {
    const where = this.callWhere({ from: null, to: null }, { personId });
    return this.selectCalls(Prisma.sql`${where} AND co.company_id = ${companyId}`);
  }

  async leadRows({ personId, companyIds }: SalesReportScope): Promise<ReportLeadRow[]> {
    const rows = await this.prisma.leads.findMany({
      where: {
        deleted_at: null,
        ...(personId ? { lead_by_id: personId } : {}),
        ...(companyIds ? { company_id: { in: companyIds } } : {}),
      },
      select: {
        lead_id: true,
        lead_stage: true,
        lead_source: true,
        service_fit: true,
        lead_by_id: true,
        lost_reason: true,
        created_at: true,
        won_on: true,
        employees_leads_lead_by_idToemployees: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      lead_id: r.lead_id,
      stage: r.lead_stage,
      source: r.lead_source,
      service_fit: r.service_fit,
      lead_by_id: r.lead_by_id,
      lead_by_name: r.employees_leads_lead_by_idToemployees?.name ?? null,
      lost_reason: r.lost_reason,
      created_at: r.created_at,
      won_on: r.won_on,
    }));
  }

  async extras(range: { from: Date | null; to: Date | null }, { personId, companyIds }: SalesReportScope): Promise<ReportExtras> {
    const created: { gte?: Date; lte?: Date } = {};
    if (range.from) created.gte = range.from;
    if (range.to) created.lte = range.to;

    const companyWhere = { deleted_at: null, ...(companyIds ? { company_id: { in: companyIds } } : {}) };

    const [companiesTotal, companiesInPeriod, overdue] = await Promise.all([
      this.prisma.companies.count({ where: companyWhere }),
      this.prisma.companies.count({ where: { ...companyWhere, ...(range.from || range.to ? { created_at: created } : {}) } }),
      this.prisma.crm_follow_ups.count({
        where: {
          deleted_at: null,
          status: 'Overdue',
          ...(personId ? { assigned_to: personId } : {}),
          // A follow-up may be linked to the company directly or only through its lead.
          ...(companyIds ? { OR: [{ company_id: { in: companyIds } }, { leads: { company_id: { in: companyIds } } }] } : {}),
        },
      }),
    ]);
    return { companies_total: companiesTotal, companies_in_period: companiesInPeriod, overdue_follow_ups: overdue };
  }
}
