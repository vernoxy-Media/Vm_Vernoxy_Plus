import { ReportExtras, ReportLeadRow } from '../../domain/services/sales-report.service';

export interface SalesReportRepositoryPort {
  /** Every live lead (optionally only one person's), with the few fields the report needs. */
  leadRows(leadById?: number): Promise<ReportLeadRow[]>;
  /** Company counts and the number of Overdue follow-ups (optionally only one person's). */
  extras(range: { from: Date | null; to: Date | null }, assignedTo?: number): Promise<ReportExtras>;
}

export const SALES_REPORT_REPOSITORY_PORT_TOKEN = Symbol('SalesReportRepositoryPort');
