import {
  TaskRepositoryPort,
  TaskSummaryResult,
} from '../../domain/ports/task.repository.port';

export class GetAdminSummaryUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(): Promise<TaskSummaryResult> {
    return this.taskRepo.getSummary();
  }
}
