import {
  CustomerTypeRepositoryPort,
  ListCustomerTypesParams,
} from '../ports/customer-type.repository.port';
import { CustomerType } from '../../domain/entities/customer-type.entity';

export class ListCustomerTypesUseCase {
  constructor(private readonly customerTypeRepo: CustomerTypeRepositoryPort) {}

  async execute(params: ListCustomerTypesParams): Promise<{ items: CustomerType[]; next_cursor: number | null }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    return this.customerTypeRepo.list({ ...params, limit });
  }
}
