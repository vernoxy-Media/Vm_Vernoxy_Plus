import { ProjectRepositoryPort } from '../../domain/ports/project.repository.port';
import { ProjectEntity, ProjectStatus } from '../../domain/entities/project.entity';

export class UpdateProjectStatusUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(
    projectId: number,
    status: ProjectStatus,
    reason: string | undefined,
    actorId: number,
  ): Promise<ProjectEntity> {
    if ((status === 'on_hold' || status === 'cancelled') && (!reason || reason.trim().length === 0)) {
      throw new Error(`Reason is required when moving project to ${status}`);
    }

    return this.projectRepo.updateProjectStatus(projectId, status, reason, actorId);
  }
}
