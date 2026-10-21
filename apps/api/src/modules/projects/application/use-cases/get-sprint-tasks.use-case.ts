import { ProjectRepositoryPort } from '../../domain/ports/project.repository.port';
import { ProjectTaskEntity } from '../../domain/entities/project.entity';

export class GetSprintTasksUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(projectId: number, sprintId?: number): Promise<ProjectTaskEntity[]> {
    return this.projectRepo.getSprintTasks(projectId, sprintId);
  }
}
