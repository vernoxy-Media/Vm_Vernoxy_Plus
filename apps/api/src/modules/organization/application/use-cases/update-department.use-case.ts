import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { Department } from '../../domain/entities/department.entity';
import {
  NotFoundDomainError,
  ConflictDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

export interface UpdateDepartmentCommand {
  id: number;
  name?: string;
  is_active?: boolean;
  acting_admin_id: number;
}

export class UpdateDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepositoryPort) {}

  async execute(command: UpdateDepartmentCommand): Promise<Department> {
    const department = await this.departmentRepo.findById(command.id);
    if (!department) {
      throw new NotFoundDomainError('Department', command.id);
    }

    let trimmedName: string | undefined;
    if (command.name !== undefined) {
      trimmedName = command.name.trim();
      if (!trimmedName) {
        throw new ValidationDomainError('Department name cannot be empty', 'name');
      }
      if (trimmedName.toLowerCase() !== department.name.toLowerCase()) {
        const existing = await this.departmentRepo.findByName(trimmedName);
        if (existing && existing.dep_id !== command.id) {
          throw new ConflictDomainError(
            'DEPARTMENT_NAME_EXISTS',
            'Department with this name already exists',
            'name',
          );
        }
      }
    }

    if (command.is_active === false && department.is_active === true) {
      const { hasActiveRoles, hasActiveEmployees } = await this.departmentRepo.hasActiveRolesOrEmployees(
        command.id,
      );
      if (hasActiveRoles || hasActiveEmployees) {
        throw new ConflictDomainError(
          'DEPARTMENT_HAS_ACTIVE_MEMBERS',
          'Cannot deactivate department with active roles or active employees',
        );
      }
    }

    return this.departmentRepo.update(command.id, {
      name: trimmedName,
      is_active: command.is_active,
      updated_by: command.acting_admin_id,
    });
  }
}
