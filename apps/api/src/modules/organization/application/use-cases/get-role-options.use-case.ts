import { RoleRepositoryPort } from '../ports/role.repository.port';

export class GetRoleOptionsUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(depId: number): Promise<Array<{ role_id: number; role_name: string }>> {
    return this.roleRepo.findActiveOptionsByDepartment(depId);
  }
}
