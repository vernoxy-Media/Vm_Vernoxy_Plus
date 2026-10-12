import {
  CompanyRepositoryPort,
  CompanyDetail,
} from '../ports/company.repository.port';
import { NotFoundDomainError } from '../../domain/errors/crm.errors';

export class GetCompanyDetailUseCase {
  constructor(private readonly companyRepo: CompanyRepositoryPort) {}

  async execute(id: number): Promise<CompanyDetail> {
    const detail = await this.companyRepo.getDetail(id);
    if (!detail) {
      throw new NotFoundDomainError(`Company with ID ${id} not found`, 'COMPANY_NOT_FOUND', 'id');
    }
    return detail;
  }
}
