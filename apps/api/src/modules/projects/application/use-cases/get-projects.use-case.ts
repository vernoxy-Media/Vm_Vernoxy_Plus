import {
  ProjectsFilter,
  ProjectRepositoryPort,
} from '../../domain/ports/project.repository.port';
import { ProjectEntity } from '../../domain/entities/project.entity';

export class GetProjectsUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(filter: ProjectsFilter): Promise<ProjectEntity[]> {
    return this.projectRepo.getProjects(filter);
  }
}
