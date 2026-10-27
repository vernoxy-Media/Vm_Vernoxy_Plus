import { RoleRepositoryPort } from '../ports/role.repository.port';

export class GetRoleOptionsUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(depIds?: number | number[]): Promise<Array<{ role_id: number; role_name: string; dep_id?: number; dep_name?: string }>> {
    if (typeof depIds === 'number') {
      return this.roleRepo.findActiveOptionsByDepartments([depIds]);
    }
    return this.roleRepo.findActiveOptionsByDepartments(depIds);
  }
}

