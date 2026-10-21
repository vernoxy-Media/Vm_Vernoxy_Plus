import {
  ProjectRepositoryPort,
  UpdateSprintInput,
} from '../../domain/ports/project.repository.port';
import { SprintEntity } from '../../domain/entities/project.entity';

export class UpdateSprintUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(sprintId: number, input: UpdateSprintInput): Promise<SprintEntity> {
    return this.projectRepo.updateSprint(sprintId, input);
  }
}
