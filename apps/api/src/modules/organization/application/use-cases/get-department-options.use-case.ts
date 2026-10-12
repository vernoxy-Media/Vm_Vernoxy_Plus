import { DepartmentRepositoryPort } from '../ports/department.repository.port';

export class GetDepartmentOptionsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepositoryPort) {}

  async execute(): Promise<Array<{ dep_id: number; name: string }>> {
    return this.departmentRepo.findActiveOptions();
  }
}
