import {
  CreateProjectTaskInput,
  ProjectRepositoryPort,
} from '../../domain/ports/project.repository.port';
import { ProjectTaskEntity } from '../../domain/entities/project.entity';

export class CreateProjectTaskUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(input: CreateProjectTaskInput): Promise<ProjectTaskEntity> {
    if (!input.title || !input.title.trim()) {
      throw new Error('Task title cannot be blank');
    }
    if (input.title.trim().length > 150) {
      throw new Error('Task title cannot exceed 150 characters');
    }
    if (!input.assignee_ids || input.assignee_ids.length === 0) {
      throw new Error('At least one project member must be assigned');
    }

    return this.projectRepo.createProjectTask(input);
  }
}
