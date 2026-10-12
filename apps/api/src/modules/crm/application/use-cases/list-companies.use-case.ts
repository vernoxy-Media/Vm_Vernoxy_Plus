import {
  CompanyRepositoryPort,
  ListCompaniesParams,
  CompanyListItem,
} from '../ports/company.repository.port';

export class ListCompaniesUseCase {
  constructor(private readonly companyRepo: CompanyRepositoryPort) {}

  async execute(params: ListCompaniesParams): Promise<{ items: CompanyListItem[]; next_cursor: string | null }> {
    return this.companyRepo.list(params);
  }
}
