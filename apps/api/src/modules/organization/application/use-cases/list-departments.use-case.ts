import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { Department } from '../../domain/entities/department.entity';

export interface ListDepartmentsQuery {
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
}

export class ListDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepositoryPort) {}

  async execute(query: ListDepartmentsQuery): Promise<{ items: Department[]; next_cursor: string | null }> {
    return this.departmentRepo.findMany(query);
  }
}
