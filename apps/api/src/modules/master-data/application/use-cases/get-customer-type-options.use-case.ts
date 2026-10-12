import {
  CustomerTypeRepositoryPort,
  CustomerTypeOption,
} from '../ports/customer-type.repository.port';

export class GetCustomerTypeOptionsUseCase {
  constructor(private readonly customerTypeRepo: CustomerTypeRepositoryPort) {}

  async execute(): Promise<CustomerTypeOption[]> {
    return this.customerTypeRepo.getOptions();
  }
}
