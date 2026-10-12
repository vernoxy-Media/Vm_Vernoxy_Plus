import { CustomerTypeRepositoryPort } from '../ports/customer-type.repository.port';
import { CustomerType } from '../../domain/entities/customer-type.entity';
import { NotFoundDomainError } from '../../domain/errors/master-data.errors';

export class GetCustomerTypeByIdUseCase {
  constructor(private readonly customerTypeRepo: CustomerTypeRepositoryPort) {}

  async execute(id: number): Promise<CustomerType> {
    const customerType = await this.customerTypeRepo.findById(id);
    if (!customerType || customerType.deleted_at) {
      throw new NotFoundDomainError(`Customer type with id ${id} not found`, 'NOT_FOUND', 'id');
    }
    return customerType;
  }
}
