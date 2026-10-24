import { ProjectRepositoryPort } from '../../domain/ports/project.repository.port';
import { ProjectEntity, ProjectStatus } from '../../domain/entities/project.entity';
import { EventsService } from '../../../websockets/events.service';

export class UpdateProjectStatusUseCase {
  constructor(
    private readonly projectRepo: ProjectRepositoryPort,
    private readonly eventsService?: EventsService,
  ) {}

  async execute(
    projectId: number,
    status: ProjectStatus,
    reason: string | undefined,
    actorId: number,
  ): Promise<ProjectEntity> {
    if ((status === 'on_hold' || status === 'cancelled') && (!reason || reason.trim().length === 0)) {
      throw new Error(`Reason is required when moving project to ${status}`);
    }

    const updated = await this.projectRepo.updateProjectStatus(projectId, status, reason, actorId);

    if (this.eventsService) {
      this.eventsService.broadcast('project:status_changed', {
        projectId,
        status,
        reason,
        actorId,
        project: updated,
      });
      this.eventsService.emitToProject(projectId, 'project:status_changed', {
        projectId,
        status,
        reason,
        actorId,
        project: updated,
      });
    }

    return updated;
  }
}
