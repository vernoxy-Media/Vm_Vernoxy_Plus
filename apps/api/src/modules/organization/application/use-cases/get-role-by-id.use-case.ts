import { RoleRepositoryPort } from '../ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export class GetRoleByIdUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(id: number): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundDomainError('Role', id);
    }
    return role;
  }
}
