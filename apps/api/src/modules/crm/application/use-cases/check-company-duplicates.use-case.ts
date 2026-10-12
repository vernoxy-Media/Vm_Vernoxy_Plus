import {
  CompanyRepositoryPort,
  CompanyDuplicateMatch,
} from '../ports/company.repository.port';

export class CheckCompanyDuplicatesUseCase {
  constructor(private readonly companyRepo: CompanyRepositoryPort) {}

  async execute(params: { name?: string; email?: string; phone?: string; website?: string }): Promise<CompanyDuplicateMatch[]> {
    return this.companyRepo.checkDuplicates(params);
  }
}
