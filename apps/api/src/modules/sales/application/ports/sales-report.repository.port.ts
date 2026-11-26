import { ReportExtras, ReportLeadRow } from '../../domain/services/sales-report.service';

export interface SalesReportScope {
  /** Only this person's leads and follow-ups. */
  personId?: number;
  /** Only these companies. An empty list means nothing matches; leave out for no company restriction. */
  companyIds?: number[];
}

export interface SalesReportRepositoryPort {
  /** The companies in a live campaign; empty when the campaign does not exist. */
  campaignCompanyIds(campaignId: number): Promise<number[]>;
  /** Every live lead in the scope, with the few fields the report needs. */
  leadRows(scope: SalesReportScope): Promise<ReportLeadRow[]>;
  /** Company counts (narrowed by companies only) and the number of Overdue follow-ups (narrowed by both). */
  extras(range: { from: Date | null; to: Date | null }, scope: SalesReportScope): Promise<ReportExtras>;
}

export const SALES_REPORT_REPOSITORY_PORT_TOKEN = Symbol('SalesReportRepositoryPort');
