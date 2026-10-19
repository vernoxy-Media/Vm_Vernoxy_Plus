import {
  TaskBoardFilters,
  TaskBoardResult,
  TaskRepositoryPort,
} from '../../domain/ports/task.repository.port';

export class GetMyBoardUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(empId: number, filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    return this.taskRepo.getMyBoard(empId, filters);
  }
}
