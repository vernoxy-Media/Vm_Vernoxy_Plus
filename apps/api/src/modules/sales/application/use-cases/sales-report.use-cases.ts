import { SalesActor } from '../ports/sales-access-policy.port';
import { CompanyCallExcelPort, SalesReportCallCounts, SalesReportCallRecord, SalesReportRepositoryPort } from '../ports/sales-report.repository.port';
import {
  buildCompanyCallRows,
  CompanyCallAttempt,
  CompanyCallRow,
  CompanyCallView,
  viewCompanyCallRows,
} from '../../domain/services/company-call-report.service';
import { FieldValidationError } from '../../domain/errors/sales.errors';
import { OUTCOMES } from '../../domain/services/activity-validator.service';
import { buildSalesReport, istDayBoundary, SalesReport } from '../../domain/services/sales-report.service';

export interface SalesReportQuery {
  /** YYYY-MM-DD, first day of the period. */
  from?: string;
  /** YYYY-MM-DD, last day of the period. */
  to?: string;
  /** "me", "all" or an employee id. A Sales User always gets their own leads whatever is asked. */
  lead_by?: string;
  /** "all" or a campaign id. Narrows the report to the companies in that campaign. */
  campaign_id?: string;
}

/** Stands for received calls whose outcome is empty or not on the Call Outcome list. */
export const OUTCOME_NOT_RECORDED = 'Not recorded';

export interface SalesReportResult extends SalesReport {
  calls: SalesReportCallCounts;
  received_outcomes: Array<{ outcome: string; count: number }>;
}

/** The Sales Reports page: the Admin sees every lead, a Sales User sees only their own. */
export class SalesReportUseCases {
  constructor(
    private readonly repo: SalesReportRepositoryPort,
    private readonly excel: CompanyCallExcelPort,
  ) {}

  /** One row per company with at least one received call in the period, searched and sorted. */
  async companyCalls(query: SalesReportQuery, view: CompanyCallView, actor: SalesActor): Promise<{ items: CompanyCallRow[] }> {
    const { period, personId, campaignId } = this.filters(query, actor);
    const attempts = await this.repo.callAttempts(period, { personId, campaignId });
    return { items: viewCompanyCallRows(buildCompanyCallRows(attempts), view) };
  }

  /** The same rows, in the same order, as an Excel file. */
  async exportCompanyCalls(query: SalesReportQuery, view: CompanyCallView, actor: SalesActor) {
    const { items } = await this.companyCalls(query, view, actor);
    return {
      buffer: await this.excel.build(items),
      filename: `company-wise-calls-${query.from ?? 'all'}-${query.to ?? 'today'}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /** A company's call history under the same date, Sales User and campaign filters as the report. */
  async companyCallHistory(query: SalesReportQuery, companyId: number, actor: SalesActor): Promise<{ items: CompanyCallAttempt[] }> {
    const { period, personId, campaignId } = this.filters(query, actor);
    return { items: await this.repo.companyCallHistory(companyId, period, { personId, campaignId }) };
  }

  async summary(query: SalesReportQuery, actor: SalesActor): Promise<SalesReportResult> {
    const { period, personId, campaignId } = this.filters(query, actor);
    // A campaign has no leads of its own: it reaches them through the companies added to it.
    const companyIds = campaignId ? await this.repo.campaignCompanyIds(campaignId) : undefined;
    const scope = { personId, companyIds };
    const [rows, extras, calls, outcomeRows] = await Promise.all([
      this.repo.leadRows(scope),
      this.repo.extras(period, scope),
      this.repo.callCounts(period, { personId, campaignId }),
      this.repo.receivedOutcomeCounts(period, { personId, campaignId }),
    ]);

    // Every outcome on the list is shown, with zero when nothing matches.
    const received_outcomes = OUTCOMES.map((outcome) => ({
      outcome: outcome as string,
      count: outcomeRows.find((r) => r.outcome === outcome)?.count ?? 0,
    }));
    const listed = received_outcomes.reduce((sum, r) => sum + r.count, 0);
    // Keeps the breakdown adding up to the Calls Received card.
    const unlisted = outcomeRows.reduce((sum, r) => sum + r.count, 0) - listed;
    if (unlisted > 0) received_outcomes.push({ outcome: OUTCOME_NOT_RECORDED, count: unlisted });

    return { ...buildSalesReport(rows, period, extras), calls, received_outcomes };
  }

  /** The records behind one number of the outcome breakdown. */
  async receivedCalls(query: SalesReportQuery, outcome: string, actor: SalesActor): Promise<{ items: SalesReportCallRecord[] }> {
    const { period, personId, campaignId } = this.filters(query, actor);
    const items = await this.repo.receivedCalls(period, { personId, campaignId }, outcome === OUTCOME_NOT_RECORDED ? null : outcome);
    return { items };
  }

  private filters(query: SalesReportQuery, actor: SalesActor) {
    if (query.from && query.to && query.from > query.to) {
      throw new FieldValidationError([{ field: 'from', message: 'The start date must not be after the end date.' }]);
    }

    let personId: number | undefined;
    if (!actor.is_admin || query.lead_by === 'me') personId = actor.emp_id;
    else if (query.lead_by && query.lead_by !== 'all') personId = Number(query.lead_by);

    return {
      period: {
        from: query.from ? istDayBoundary(query.from, 'start') : null,
        to: query.to ? istDayBoundary(query.to, 'end') : null,
      },
      personId,
      campaignId: query.campaign_id && query.campaign_id !== 'all' ? Number(query.campaign_id) : undefined,
    };
  }
}
