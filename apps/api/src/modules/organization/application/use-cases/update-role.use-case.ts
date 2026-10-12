import { RoleRepositoryPort } from '../ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';
import {
  NotFoundDomainError,
  ConflictDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

export interface UpdateRoleCommand {
  id: number;
  role_name?: string;
  description?: string | null;
  is_active?: boolean;
  acting_admin_id: number;
}

export class UpdateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(command: UpdateRoleCommand): Promise<Role> {
    const role = await this.roleRepo.findById(command.id);
    if (!role) {
      throw new NotFoundDomainError('Role', command.id);
    }

    let trimmedRoleName: string | undefined;
    if (command.role_name !== undefined) {
      trimmedRoleName = command.role_name.trim();
      if (!trimmedRoleName) {
        throw new ValidationDomainError('Role name cannot be empty', 'role_name');
      }

      if (trimmedRoleName.toLowerCase() !== role.role_name.toLowerCase()) {
        const existingRole = await this.roleRepo.findByDepAndName(role.dep_id, trimmedRoleName);
        if (existingRole && existingRole.role_id !== command.id) {
          throw new ConflictDomainError(
            'ROLE_NAME_EXISTS',
            'A role with this name already exists in the department',
            'role_name',
          );
        }
      }
    }

    if (command.is_active === false && role.is_active === true) {
      if (role.is_admin) {
        throw new ConflictDomainError(
          'CANNOT_DEACTIVATE_ADMIN_ROLE',
          'Admin role cannot be deactivated',
        );
      }

      const hasActive = await this.roleRepo.hasActiveEmployees(command.id);
      if (hasActive) {
        throw new ConflictDomainError(
          'ROLE_HAS_ACTIVE_EMPLOYEES',
          'Cannot deactivate role with active employees',
        );
      }
    }

    return this.roleRepo.update(command.id, {
      role_name: trimmedRoleName,
      description: command.description !== undefined ? command.description?.trim() || null : undefined,
      is_active: command.is_active,
      updated_by: command.acting_admin_id,
    });
  }
}
