import { EmployeeRepositoryPort, EmployeeListFilter } from '../ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';

export class ListEmployeesUseCase {
  constructor(private readonly employeeRepo: EmployeeRepositoryPort) {}

  async execute(
    filter: EmployeeListFilter,
  ): Promise<{ items: Employee[]; next_cursor: string | null; stats?: { total: number; active: number; inactive: number } }> {
    return this.employeeRepo.findMany(filter);
  }
}
