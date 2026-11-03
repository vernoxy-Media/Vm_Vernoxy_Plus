import { SalesCompanyRepositoryPort, SalesCompanyDetail } from '../ports/sales-company.repository.port';
import { NotFoundSalesError } from '../../domain/errors/sales.errors';

export class GetSalesCompanyUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  async execute(companyId: number): Promise<SalesCompanyDetail> {
    const detail = await this.repo.getDetail(companyId);
    if (!detail) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    return detail;
  }
}
