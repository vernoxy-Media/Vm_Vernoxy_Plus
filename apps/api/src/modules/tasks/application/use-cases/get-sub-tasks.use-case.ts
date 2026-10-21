import { TaskEntity } from '../../domain/entities/task.entity';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';

export class GetSubTasksUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(parentTaskId: number): Promise<TaskEntity[]> {
    return this.taskRepo.getSubTasks(parentTaskId);
  }
}
