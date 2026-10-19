import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';

export class GetPendingRequestsCountUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(): Promise<number> {
    return this.taskRepo.getPendingReviewCount();
  }
}
