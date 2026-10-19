import {
  TaskRepositoryPort,
  TaskSummaryResult,
} from '../../domain/ports/task.repository.port';

export class GetMySummaryUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(empId: number): Promise<TaskSummaryResult> {
    return this.taskRepo.getMySummary(empId);
  }
}
