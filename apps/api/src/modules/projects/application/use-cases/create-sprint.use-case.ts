import {
  CreateSprintInput,
  ProjectRepositoryPort,
} from '../../domain/ports/project.repository.port';
import { SprintEntity } from '../../domain/entities/project.entity';

export class CreateSprintUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(input: CreateSprintInput): Promise<SprintEntity> {
    if (!input.sprint_name || !input.sprint_name.trim()) {
      throw new Error('Sprint name is required');
    }
    if (!input.start_date || !input.end_date) {
      throw new Error('Sprint start date and end date are required');
    }
    if (new Date(input.start_date) > new Date(input.end_date)) {
      throw new Error('Sprint end date cannot be earlier than start date');
    }

    return this.projectRepo.createSprint(input);
  }
}
