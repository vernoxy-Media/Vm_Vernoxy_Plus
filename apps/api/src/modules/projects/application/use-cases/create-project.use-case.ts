import {
  CreateProjectInput,
  ProjectRepositoryPort,
} from '../../domain/ports/project.repository.port';
import { ProjectEntity } from '../../domain/entities/project.entity';

export class CreateProjectUseCase {
  constructor(private readonly projectRepo: ProjectRepositoryPort) {}

  async execute(input: CreateProjectInput): Promise<ProjectEntity> {
    if (!input.project_name || input.project_name.trim().length === 0) {
      throw new Error('Project name is mandatory');
    }
    if (!input.project_type) {
      throw new Error('Project type is mandatory');
    }
    if (!input.category) {
      throw new Error('Category is mandatory');
    }
    if (input.category === 'other' && (!input.other_category || input.other_category.trim().length === 0)) {
      throw new Error('Category details are required when Other is selected');
    }
    if (!input.project_manager_id) {
      throw new Error('Project Manager is mandatory');
    }
    if (!input.start_date || !input.deadline) {
      throw new Error('Start date and deadline are mandatory');
    }
    if (new Date(input.deadline) < new Date(input.start_date)) {
      throw new Error('Deadline cannot be earlier than start date');
    }

    return this.projectRepo.createProject(input);
  }
}
