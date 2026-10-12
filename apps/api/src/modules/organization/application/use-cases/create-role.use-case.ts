import { RoleRepositoryPort } from '../ports/role.repository.port';
import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { Role } from '../../domain/entities/role.entity';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

export interface CreateRoleCommand {
  role_name: string;
  dep_id: number;
  description?: string | null;
  acting_admin_id: number;
}

export class CreateRoleUseCase {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
    private readonly departmentRepo: DepartmentRepositoryPort,
  ) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    const trimmedRoleName = command.role_name?.trim();
    if (!trimmedRoleName) {
      throw new ValidationDomainError('Role name is required', 'role_name');
    }

    if (!command.dep_id) {
      throw new ValidationDomainError('Department ID is required', 'dep_id');
    }

    const department = await this.departmentRepo.findById(command.dep_id);
    if (!department) {
      throw new NotFoundDomainError('Department', command.dep_id);
    }

    if (!department.is_active) {
      throw new UnprocessableDomainError(
        'DEPARTMENT_INACTIVE',
        'Cannot create a role in an inactive department',
        'dep_id',
      );
    }

    const existingRole = await this.roleRepo.findByDepAndName(command.dep_id, trimmedRoleName);
    if (existingRole) {
      throw new ConflictDomainError(
        'ROLE_NAME_EXISTS',
        'A role with this name already exists in the selected department',
        'role_name',
      );
    }

    return this.roleRepo.create({
      role_name: trimmedRoleName,
      dep_id: command.dep_id,
      description: command.description?.trim() || null,
      created_by: command.acting_admin_id,
    });
  }
}
