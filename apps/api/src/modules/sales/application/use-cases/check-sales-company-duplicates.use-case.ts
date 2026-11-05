import { SalesCompanyRepositoryPort, DuplicateQuery } from '../ports/sales-company.repository.port';
import { DuplicateMatch } from '../../domain/errors/sales.errors';
import { normalizeEmail, normalizeMobile } from '../../domain/services/sales-normalization.service';

export class CheckSalesCompanyDuplicatesUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  execute(query: DuplicateQuery): Promise<DuplicateMatch[]> {
    return this.repo.findDuplicates({
      ...query,
      mobile: normalizeMobile(query.mobile),
      email: normalizeEmail(query.email),
    });
  }
}
