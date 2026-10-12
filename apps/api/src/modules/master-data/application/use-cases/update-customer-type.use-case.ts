import { CustomerTypeRepositoryPort } from '../ports/customer-type.repository.port';
import { CustomerType } from '../../domain/entities/customer-type.entity';
import {
  NotFoundDomainError,
  ConflictDomainError,
  ValidationDomainError,
} from '../../domain/errors/master-data.errors';

export interface UpdateCustomerTypeInput {
  id: number;
  name?: string;
  is_active?: boolean;
  is_default?: boolean;
  updated_by: number;
}

export class UpdateCustomerTypeUseCase {
  constructor(private readonly customerTypeRepo: CustomerTypeRepositoryPort) {}

  async execute(input: UpdateCustomerTypeInput): Promise<CustomerType> {
    const existing = await this.customerTypeRepo.findById(input.id);
    if (!existing || existing.deleted_at) {
      throw new NotFoundDomainError(`Customer type with id ${input.id} not found`, 'NOT_FOUND', 'id');
    }

    // Default cannot be deactivated
    if (existing.is_default && input.is_active === false) {
      throw new ConflictDomainError(
        'Default customer type cannot be deactivated or deleted',
        'DEFAULT_PROTECTED',
        'is_active',
      );
    }

    // Default cannot be unset directly
    if (existing.is_default && input.is_default === false) {
      throw new ValidationDomainError(
        'The default customer type cannot be unset directly; set another item as default instead',
        'DEFAULT_PROTECTED',
        'is_default',
      );
    }

    let trimmedName: string | undefined = undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const dup = await this.customerTypeRepo.findByName(trimmedName);
        if (dup && dup.customer_type_id !== existing.customer_type_id) {
          throw new ConflictDomainError(
            `Customer type with name "${trimmedName}" already exists`,
            'DUPLICATE_NAME',
            'name',
          );
        }
      }
    }

    if (input.is_default === true) {
      if (input.is_active === false) {
        throw new ValidationDomainError(
          'Default customer type cannot be inactive',
          'VALIDATION_ERROR',
          'is_active',
        );
      }
      if (!existing.is_active && input.is_active !== true) {
        throw new ValidationDomainError(
          'Cannot make an inactive customer type the default without activating it',
          'VALIDATION_ERROR',
          'is_default',
        );
      }

      return this.customerTypeRepo.switchDefault(input.id, input.updated_by, {
        name: trimmedName,
        is_active: input.is_active,
      });
    }

    return this.customerTypeRepo.update(input.id, {
      name: trimmedName,
      is_active: input.is_active,
      updated_by: input.updated_by,
    });
  }
}
