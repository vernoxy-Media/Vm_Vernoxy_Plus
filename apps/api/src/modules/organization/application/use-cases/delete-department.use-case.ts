import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { NotFoundDomainError, ConflictDomainError } from '../../domain/errors/organization.errors';

export interface DeleteDepartmentCommand {
  id: number;
  acting_admin_id: number;
}

export class DeleteDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepositoryPort) {}

  async execute(command: DeleteDepartmentCommand): Promise<void> {
    const department = await this.departmentRepo.findById(command.id);
    if (!department) {
      throw new NotFoundDomainError('Department', command.id);
    }

    const { hasActiveRoles, hasActiveEmployees } = await this.departmentRepo.hasActiveRolesOrEmployees(
      command.id,
    );
    if (hasActiveRoles || hasActiveEmployees) {
      throw new ConflictDomainError(
        'DEPARTMENT_HAS_ACTIVE_MEMBERS',
        'Cannot delete department with active roles or active employees',
      );
    }

    await this.departmentRepo.softDelete(command.id, command.acting_admin_id);
  }
}
