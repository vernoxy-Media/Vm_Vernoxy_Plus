import {
  AssignableEmployee,
  ProjectRepositoryPort,
} from '../../domain/ports/project.repository.port';

export class GetAssignableEmployeesUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(): Promise<AssignableEmployee[]> {
    return this.projectRepo.getAssignableEmployees();
  }
}
