import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { Department } from '../../domain/entities/department.entity';
import { ConflictDomainError, ValidationDomainError } from '../../domain/errors/organization.errors';

export interface CreateDepartmentCommand {
  name: string;
  acting_admin_id: number;
}

export class CreateDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepositoryPort) {}

  async execute(command: CreateDepartmentCommand): Promise<Department> {
    const trimmedName = command.name?.trim();
    if (!trimmedName) {
      throw new ValidationDomainError('Department name is required', 'name');
    }

    const existing = await this.departmentRepo.findByName(trimmedName);
    if (existing) {
      throw new ConflictDomainError('DEPARTMENT_NAME_EXISTS', 'Department with this name already exists', 'name');
    }

    return this.departmentRepo.create({
      name: trimmedName,
      created_by: command.acting_admin_id,
    });
  }
}
