import { RoleRepositoryPort, RoleListFilter } from '../ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';

export class ListRolesUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(filter: RoleListFilter): Promise<{ items: Role[]; next_cursor: string | null }> {
    return this.roleRepo.findMany(filter);
  }
}
