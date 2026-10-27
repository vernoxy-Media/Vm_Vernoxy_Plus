import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export class GetEmployeeHistoryUseCase {
  constructor(private readonly employeeRepo: EmployeeRepositoryPort) {}

  async execute(empId: number) {
    const employee = await this.employeeRepo.findById(empId);
    if (!employee) {
      throw new NotFoundDomainError('Employee', empId);
    }

    return this.employeeRepo.getHistory(empId);
  }
}
