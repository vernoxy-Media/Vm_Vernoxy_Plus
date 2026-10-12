import { Injectable, Inject } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY_TOKEN,
  EmployeeRepositoryPort,
} from './application/ports/employee.repository.port';

export { OrganizationModule } from './organization.module';
export { OrganizationAdminGuard } from './presentation/guards/organization-admin.guard';
export { Department } from './domain/entities/department.entity';
export { Role } from './domain/entities/role.entity';
export { Employee } from './domain/entities/employee.entity';

export interface EmployeePublicSummary {
  emp_id: number;
  full_name: string;
  email: string;
  status: string;
  is_admin: boolean;
}

export interface OrganizationPublicApi {
  findEmployeeById(id: number): Promise<EmployeePublicSummary | null>;
}

export const ORGANIZATION_PUBLIC_API_TOKEN = Symbol('OrganizationPublicApi');

@Injectable()
export class OrganizationPublicApiService implements OrganizationPublicApi {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY_TOKEN)
    private readonly employeeRepo: EmployeeRepositoryPort,
  ) {}

  async findEmployeeById(id: number): Promise<EmployeePublicSummary | null> {
    const emp = await this.employeeRepo.findById(id);
    if (!emp || emp.deleted_at !== null) return null;
    return {
      emp_id: emp.emp_id,
      full_name: emp.name,
      email: emp.email,
      status: emp.status,
      is_admin: emp.role?.role_name === 'Administrator' || false,
    };
  }
}
