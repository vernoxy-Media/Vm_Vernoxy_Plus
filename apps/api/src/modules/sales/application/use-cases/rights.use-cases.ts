import { SalesActor } from '../ports/sales-access-policy.port';
import { SalesRights, SalesRightsRepositoryPort, SalesUserRights } from '../ports/sales-rights.repository.port';
import { FieldValidationError, ForbiddenSalesError, NotFoundSalesError, RightRequiredError } from '../../domain/errors/sales.errors';

/** Who may Import and Export: the Admin always, a Sales user only with the right the Admin gave them. */
export class SalesRightsUseCases {
  constructor(private readonly repo: SalesRightsRepositoryPort) {}

  async me(actor: SalesActor): Promise<SalesRights> {
    if (actor.is_admin) return { can_import: true, can_export: true };
    return this.repo.get(actor.emp_id);
  }

  async require(actor: SalesActor, right: 'import' | 'export'): Promise<void> {
    const mine = await this.me(actor);
    if (!(right === 'import' ? mine.can_import : mine.can_export)) throw new RightRequiredError(right);
  }

  async list(actor: SalesActor): Promise<SalesUserRights[]> {
    if (!actor.is_admin) throw new ForbiddenSalesError('Only the Admin can see or change Import / Export rights.');
    return this.repo.listUsers();
  }

  async set(actor: SalesActor, empId: number, rights: Partial<SalesRights>): Promise<SalesUserRights> {
    if (!actor.is_admin) throw new ForbiddenSalesError('Only the Admin can see or change Import / Export rights.');
    if (rights.can_import === undefined && rights.can_export === undefined) {
      throw new FieldValidationError([{ field: 'can_import', message: 'Send can_import and / or can_export.' }]);
    }
    const saved = await this.repo.set(empId, rights, actor.emp_id);
    if (!saved) throw new NotFoundSalesError('Only an active Sales user can be given these rights.', 'SALES_USER_NOT_FOUND', 'emp_id');
    return saved;
  }
}
