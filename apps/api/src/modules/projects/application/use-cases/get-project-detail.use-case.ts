import { ProjectRepositoryPort } from '../../domain/ports/project.repository.port';
import { ProjectEntity } from '../../domain/entities/project.entity';

export class GetProjectDetailUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(projectId: number, requestingEmpId: number, isAdmin: boolean): Promise<ProjectEntity | null> {
    return this.projectRepo.getProjectById(projectId, requestingEmpId, isAdmin);
  }
}
