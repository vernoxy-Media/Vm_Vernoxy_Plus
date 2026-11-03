import { SalesCompanyRepositoryPort } from '../ports/sales-company.repository.port';
import { SalesActor } from '../ports/sales-access-policy.port';
import { ConflictSalesError, ForbiddenSalesError, NotFoundSalesError } from '../../domain/errors/sales.errors';

export class DeleteSalesCompanyUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  /** BFD section 3: only the Admin, and only when it has no lead, no client and no communication. */
  async execute(companyId: number, actor: SalesActor): Promise<void> {
    if (!actor.is_admin) {
      throw new ForbiddenSalesError('Only the Admin can delete a company.');
    }
    const blockers = await this.repo.getDeleteBlockers(companyId);
    if (!blockers) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    if (blockers.has_lead || blockers.is_client || blockers.has_communication) {
      const why = [
        blockers.has_lead ? 'a lead' : null,
        blockers.is_client ? 'a client' : null,
        blockers.has_communication ? 'communication history' : null,
      ]
        .filter(Boolean)
        .join(', ');
      throw new ConflictSalesError(
        `This company cannot be deleted because it has ${why}.`,
        'COMPANY_HAS_DEPENDENCIES',
      );
    }
    await this.repo.softDelete(companyId, actor.emp_id);
  }
}
