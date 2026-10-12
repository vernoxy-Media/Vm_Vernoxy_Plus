import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export class GetEmployeeByIdUseCase {
  constructor(private readonly employeeRepo: EmployeeRepositoryPort) {}

  async execute(id: number): Promise<Employee> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) {
      throw new NotFoundDomainError('Employee', id);
    }
    return employee;
  }
}
