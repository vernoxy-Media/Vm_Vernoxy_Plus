import { ProjectRepositoryPort } from '../../domain/ports/project.repository.port';
import { SprintEntity } from '../../domain/entities/project.entity';

export class GetProjectSprintsUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(projectId: number): Promise<SprintEntity[]> {
    return this.projectRepo.getSprints(projectId);
  }
}
