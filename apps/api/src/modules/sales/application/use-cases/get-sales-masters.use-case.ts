import { SalesCompanyRepositoryPort, SalesMasters } from '../ports/sales-company.repository.port';

export class GetSalesMastersUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  execute(): Promise<SalesMasters> {
    return this.repo.getMasters();
  }
}
