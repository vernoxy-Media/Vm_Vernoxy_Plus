import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SalesReportRepositoryPort, SalesReportScope }from '../../application/ports/sales-report.repository.port';
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
