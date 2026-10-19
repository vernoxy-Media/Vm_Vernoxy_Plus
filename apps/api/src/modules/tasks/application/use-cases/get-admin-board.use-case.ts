import {
  TaskBoardFilters,
  TaskBoardResult,
  TaskRepositoryPort,
} from '../../domain/ports/task.repository.port';

export class GetAdminBoardUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    return this.taskRepo.getBoard(filters);
  }
}
