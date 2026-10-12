import { Injectable, Inject } from '@nestjs/common';
import {
  EmployeeDirectoryPort,
  EmployeeDirectoryItem,
} from '../../application/ports/employee-directory.port';
import {
  ORGANIZATION_PUBLIC_API_TOKEN,
  OrganizationPublicApi,
} from '../../../organization/public-api';

@Injectable()
export class OrganizationEmployeeDirectoryAdapter implements EmployeeDirectoryPort {
  constructor(
    @Inject(ORGANIZATION_PUBLIC_API_TOKEN)
    private readonly organizationPublicApi: OrganizationPublicApi,
  ) {}

  async findEmployeeById(id: number): Promise<EmployeeDirectoryItem | null> {
    const emp = await this.organizationPublicApi.findEmployeeById(id);
    if (!emp) return null;
    return {
      emp_id: emp.emp_id,
      full_name: emp.full_name,
      status: emp.status,
      is_admin: emp.is_admin,
    };
  }
}
