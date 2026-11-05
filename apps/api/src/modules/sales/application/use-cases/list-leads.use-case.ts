import { SalesLeadRepositoryPort, LeadFilters, LeadList, LeadBoard, LeadSort } from '../ports/sales-lead.repository.port';
import { SalesActor } from '../ports/sales-access-policy.port';

export const LEAD_PAGE_SIZE = 10; // BFD section 6: 10 leads on one page
export const LEAD_MAX_PAGE_SIZE = 100;
export const BOARD_CARDS_PER_COLUMN = 20;
export const BOARD_MAX_CARDS_PER_COLUMN = 100;

export type LeadByParam = 'me' | 'all' | number;

export interface LeadQuery extends Omit<LeadFilters, 'lead_by_id'> {
  lead_by?: LeadByParam;
  sort?: LeadSort;
  order?: 'asc' | 'desc';
}

/**
 * A Sales User only ever sees the leads where they are Lead By; the Admin sees all
 * and may narrow to one user ("Me", a user id, or All).
 */
export function resolveLeadBy(lead_by: LeadByParam | undefined, actor: SalesActor): number | undefined {
  if (!actor.is_admin) return actor.emp_id;
  if (lead_by === 'me') return actor.emp_id;
  if (typeof lead_by === 'number') return lead_by;
  return undefined;
}

export class ListLeadsUseCase {
  constructor(private readonly repo: SalesLeadRepositoryPort) {}

  async execute(
    query: LeadQuery & { page?: number; limit?: number },
    actor: SalesActor,
    now: Date = new Date(),
  ): Promise<LeadList> {
    const { lead_by, page, limit, ...rest } = query;
    return this.repo.list({
      ...rest,
      status: rest.status ?? 'open',
      lead_by_id: resolveLeadBy(lead_by, actor),
      page: Math.max(page ?? 1, 1),
      limit: Math.min(Math.max(limit ?? LEAD_PAGE_SIZE, 1), LEAD_MAX_PAGE_SIZE),
      now,
    });
  }
}

export class GetLeadBoardUseCase {
  constructor(private readonly repo: SalesLeadRepositoryPort) {}

  async execute(
    query: LeadQuery & { per_column?: number },
    actor: SalesActor,
    now: Date = new Date(),
  ): Promise<LeadBoard> {
    const { lead_by, per_column, ...rest } = query;
    return this.repo.board({
      ...rest,
      // The board shows every status, so every column is filled.
      status: rest.status ?? 'all',
      lead_by_id: resolveLeadBy(lead_by, actor),
      per_column: Math.min(Math.max(per_column ?? BOARD_CARDS_PER_COLUMN, 1), BOARD_MAX_CARDS_PER_COLUMN),
      now,
    });
  }
}
