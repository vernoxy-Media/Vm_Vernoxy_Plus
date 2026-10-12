import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { RoleRepositoryPort } from '../ports/role.repository.port';
import { OrganizationPolicyService } from '../../domain/services/organization-policy.service';
import { NotFoundDomainError, ConflictDomainError } from '../../domain/errors/organization.errors';

export interface DeleteEmployeeCommand {
  id: number;
  acting_admin_id: number;
}

export class DeleteEmployeeUseCase {
  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(command: DeleteEmployeeCommand): Promise<void> {
    const employee = await this.employeeRepo.findById(command.id);
    if (!employee) {
      throw new NotFoundDomainError('Employee', command.id);
    }

    OrganizationPolicyService.validateSelfModification(command.acting_admin_id, command.id, {
      is_delete: true,
    });

    const role = employee.role_id ? await this.roleRepo.findById(employee.role_id) : null;
    if (role?.is_admin && employee.status === 'Active') {
      const activeAdminCount = await this.employeeRepo.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ConflictDomainError(
          'LAST_ADMIN',
          'Operation rejected: cannot delete the last remaining active administrator',
        );
      }
    }

    await this.employeeRepo.softDelete(command.id, command.acting_admin_id);
  }
}
