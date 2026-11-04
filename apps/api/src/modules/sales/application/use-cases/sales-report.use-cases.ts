import { SalesActor } from '../ports/sales-access-policy.port';
import { SalesReportRepositoryPort } from '../ports/sales-report.repository.port';
import { FieldValidationError } from '../../domain/errors/sales.errors';
import { buildSalesReport, istDayBoundary, SalesReport } from '../../domain/services/sales-report.service';

export interface SalesReportQuery {
  /** YYYY-MM-DD, first day of the period. */
  from?: string;
  /** YYYY-MM-DD, last day of the period. */
  to?: string;
  /** "me", "all" or an employee id. A Sales User always gets their own leads whatever is asked. */
  lead_by?: string;
}

/** The Sales Reports page: the Admin sees every lead, a Sales User sees only their own. */
export class SalesReportUseCases {
  constructor(private readonly repo: SalesReportRepositoryPort) {}

  async summary(query: SalesReportQuery, actor: SalesActor): Promise<SalesReport> {
    if (query.from && query.to && query.from > query.to) {
      throw new FieldValidationError([{ field: 'from', message: 'The start date must not be after the end date.' }]);
    }

    let personId: number | undefined;
    if (!actor.is_admin || query.lead_by === 'me') personId = actor.emp_id;
    else if (query.lead_by && query.lead_by !== 'all') personId = Number(query.lead_by);

    const period = {
      from: query.from ? istDayBoundary(query.from, 'start') : null,
      to: query.to ? istDayBoundary(query.to, 'end') : null,
    };
    const [rows, extras] = await Promise.all([this.repo.leadRows(personId), this.repo.extras(period, personId)]);
    return buildSalesReport(rows, period, extras);
  }
}
