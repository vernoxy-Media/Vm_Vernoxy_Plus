import { EmployeeRepositoryPort } from '../ports/employee.repository.port';

export class GetEmployeeOptionsUseCase {
  constructor(private readonly employeeRepo: EmployeeRepositoryPort) {}

  async execute(q?: string): Promise<Array<{ emp_id: number; name: string; email: string }>> {
    return this.employeeRepo.findActiveOptions(q);
  }
}
