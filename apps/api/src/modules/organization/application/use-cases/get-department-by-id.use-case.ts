import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { Department } from '../../domain/entities/department.entity';
import { NotFoundDomainError } from '../../domain/errors/organization.errors';

export class GetDepartmentByIdUseCase {
  constructor(private readonly departmentRepo: DepartmentRepositoryPort) {}

  async execute(id: number): Promise<Department> {
    const department = await this.departmentRepo.findById(id);
    if (!department) {
      throw new NotFoundDomainError('Department', id);
    }
    return department;
  }
}
