import { RoleRepositoryPort } from '../ports/role.repository.port';
import { NotFoundDomainError, ConflictDomainError } from '../../domain/errors/organization.errors';

export interface DeleteRoleCommand {
  id: number;
  acting_admin_id: number;
}

export class DeleteRoleUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roleRepo.findById(command.id);
    if (!role) {
      throw new NotFoundDomainError('Role', command.id);
    }

    if (role.is_admin) {
      throw new ConflictDomainError('CANNOT_DELETE_ADMIN_ROLE', 'Admin role cannot be deleted');
    }

    const hasActive = await this.roleRepo.hasActiveEmployees(command.id);
    if (hasActive) {
      throw new ConflictDomainError('ROLE_HAS_ACTIVE_EMPLOYEES', 'Cannot delete role with active employees');
    }

    await this.roleRepo.softDelete(command.id, command.acting_admin_id);
  }
}
