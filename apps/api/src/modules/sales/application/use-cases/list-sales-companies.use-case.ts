import {
  SalesCompanyRepositoryPort,
  ListSalesCompaniesParams,
  SalesCompanyList,
} from '../ports/sales-company.repository.port';

export const DEFAULT_PAGE_SIZE = 10; // BFD section 3: 10 companies on one page
export const MAX_PAGE_SIZE = 100;

export class ListSalesCompaniesUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  async execute(
    params: Omit<ListSalesCompaniesParams, 'page' | 'limit'> & { page?: number; limit?: number },
  ): Promise<SalesCompanyList> {
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const page = Math.max(params.page ?? 1, 1);
    return this.repo.list({ ...params, page, limit });
  }
}
