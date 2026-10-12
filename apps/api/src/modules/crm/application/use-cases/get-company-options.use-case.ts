import {
  CompanyRepositoryPort,
  CompanyOption,
} from '../ports/company.repository.port';

export class GetCompanyOptionsUseCase {
  constructor(private readonly companyRepo: CompanyRepositoryPort) {}

  async execute(params: { q?: string; exclude_id?: number }): Promise<CompanyOption[]> {
    return this.companyRepo.getOptions(params);
  }
}
