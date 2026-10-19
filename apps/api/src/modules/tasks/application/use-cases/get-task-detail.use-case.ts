import { TaskEntity, TaskHistoryEntity } from '../../domain/entities/task.entity';
import { TaskNotFoundError, TaskPermissionDeniedError } from '../../domain/errors/task.errors';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';

export interface TaskDetailResult {
  task: TaskEntity;
  history: TaskHistoryEntity[];
}

export class GetTaskDetailUseCase {
  constructor(private readonly taskRepo: TaskRepositoryPort) {}

  async execute(
    taskId: number,
    requestingEmpId: number,
    isAdmin: boolean,
  ): Promise<TaskDetailResult> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (!isAdmin) {
      const isAssignee = task.assignees.some((a) => a.employee_id === requestingEmpId);
      if (!isAssignee) {
        throw new TaskPermissionDeniedError('You do not have access to view this task');
      }
    }

    const history = await this.taskRepo.getHistory(taskId);
    return { task, history };
  }
}
