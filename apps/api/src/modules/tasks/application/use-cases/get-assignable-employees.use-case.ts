import {
  ActiveEmployeeSummary,
  EmployeeDirectoryPort,
} from '../../domain/ports/employee-directory.port';

export class GetAssignableEmployeesUseCase {
  constructor(private readonly employeeDirectory: EmployeeDirectoryPort) {}

  async execute(): Promise<ActiveEmployeeSummary[]> {
    return this.employeeDirectory.listActiveEmployees();
  }
}
