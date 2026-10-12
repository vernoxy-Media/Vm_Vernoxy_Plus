import { CustomerTypeRepositoryPort } from '../ports/customer-type.repository.port';
import { CustomerType } from '../../domain/entities/customer-type.entity';
import {
  ValidationDomainError,
  ConflictDomainError,
} from '../../domain/errors/master-data.errors';

export interface CreateCustomerTypeInput {
  name: string;
  created_by: number;
}

export class CreateCustomerTypeUseCase {
  constructor(private readonly customerTypeRepo: CustomerTypeRepositoryPort) {}

  async execute(input: CreateCustomerTypeInput): Promise<CustomerType> {
    const trimmedName = (input.name || '').trim();
    if (!trimmedName) {
      throw new ValidationDomainError('Customer type name cannot be empty', 'VALIDATION_ERROR', 'name');
    }

    const existing = await this.customerTypeRepo.findByName(trimmedName);
    if (existing) {
      throw new ConflictDomainError(
        `Customer type with name "${trimmedName}" already exists`,
        'DUPLICATE_NAME',
        'name',
      );
    }

    return this.customerTypeRepo.create({
      name: trimmedName,
      created_by: input.created_by,
    });
  }
}
