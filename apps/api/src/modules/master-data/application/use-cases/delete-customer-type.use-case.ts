import { CustomerTypeRepositoryPort } from '../ports/customer-type.repository.port';
import {
  NotFoundDomainError,
  ConflictDomainError,
} from '../../domain/errors/master-data.errors';

export class DeleteCustomerTypeUseCase {
  constructor(private readonly customerTypeRepo: CustomerTypeRepositoryPort) {}

  async execute(id: number, deleted_by: number): Promise<void> {
    const existing = await this.customerTypeRepo.findById(id);
    if (!existing || existing.deleted_at) {
      throw new NotFoundDomainError(`Customer type with id ${id} not found`, 'NOT_FOUND', 'id');
    }

    if (existing.is_default) {
      throw new ConflictDomainError(
        'Default customer type cannot be deactivated or deleted',
        'DEFAULT_PROTECTED',
      );
    }

    await this.customerTypeRepo.softDelete(id, deleted_by);
  }
}
