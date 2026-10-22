import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepositoryPort, UpdateProjectInput } from '../../domain/ports/project.repository.port';
import { ProjectEntity } from '../../domain/entities/project.entity';

@Injectable()
export class UpdateProjectUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(
    projectId: number,
    input: UpdateProjectInput,
    actorEmpId: number,
    isAdmin: boolean,
  ): Promise<ProjectEntity> {
    const existing = await this.projectRepo.getProjectById(projectId, actorEmpId, isAdmin);
    if (!existing) {
      throw new NotFoundException(`Project #${projectId} not found`);
    }

    if (!isAdmin && existing.project_manager_id !== actorEmpId) {
      throw new ForbiddenException(
        'Only Administrators or the assigned Project Manager can update project details',
      );
    }

    return this.projectRepo.updateProject(projectId, input, actorEmpId);
  }
}
