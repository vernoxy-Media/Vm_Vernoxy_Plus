import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export interface DeactivateWarningResult {
  direct_reports_count: number;
  direct_reports: Array<{
    emp_id: number;
    name: string;
    email: string;
  }>;
}

export class GetDeactivateWarningUseCase {
  constructor(private readonly employeeRepo: EmployeeRepositoryPort) {}

  async execute(empId: number): Promise<DeactivateWarningResult> {
    const employee = await this.employeeRepo.findById(empId);
    if (!employee) {
      throw new NotFoundDomainError('Employee', empId);
    }

    const directReports = await this.employeeRepo.getDirectReports(empId);
    return {
      direct_reports_count: directReports.length,
      direct_reports: directReports,
    };
  }
}
