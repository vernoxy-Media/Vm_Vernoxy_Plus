import { CompanyRepositoryPort } from '../ports/company.repository.port';
import { CrmUnitOfWorkPort } from '../ports/unit-of-work.port';
import { NotFoundDomainError, ConflictDomainError } from '../../domain/errors/crm.errors';

export class DeleteCompanyUseCase {
  constructor(
    private readonly companyRepo: CompanyRepositoryPort,
    private readonly uow: CrmUnitOfWorkPort,
  ) {}

  async execute(params: { id: number; acting_admin_id: number }): Promise<void> {
    const { id, acting_admin_id } = params;

    const company = await this.companyRepo.findById(id);
    if (!company) {
      throw new NotFoundDomainError(`Company with ID ${id} not found`, 'COMPANY_NOT_FOUND', 'id');
    }

    const hasChildren = await this.companyRepo.hasActiveChildren(id);
    if (hasChildren) {
      throw new ConflictDomainError('Company cannot be deleted while it has active child companies', 'IN_USE');
    }

    const hasLeads = await this.companyRepo.hasActiveLeads(id);
    if (hasLeads) {
      throw new ConflictDomainError('Company cannot be deleted while it has active leads', 'IN_USE');
    }

    await this.uow.runInTransaction(async (tx) => {
      const now = new Date();

      await tx.companies.update({
        where: { company_id: id },
        data: {
          deleted_at: now,
          deleted_by: acting_admin_id,
        },
      });

      await tx.company_channels.updateMany({
        where: { company_id: id, deleted_at: null },
        data: {
          deleted_at: now,
          deleted_by: acting_admin_id,
        },
      });

      await tx.company_persons.updateMany({
        where: { company_id: id, deleted_at: null },
        data: {
          deleted_at: now,
          deleted_by: acting_admin_id,
        },
      });
    });
  }
}
