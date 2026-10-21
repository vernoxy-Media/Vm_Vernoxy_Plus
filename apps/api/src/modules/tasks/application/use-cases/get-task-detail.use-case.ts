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
      const isLead = task.lead_employee_id === requestingEmpId;
      const isSubTaskAssignee = task.sub_tasks?.some((st) =>
        st.assignees.some((a) => a.employee_id === requestingEmpId)
      );

      if (!isAssignee && !isLead && !isSubTaskAssignee) {
        throw new TaskPermissionDeniedError('You do not have access to view this task');
      }

      // Employee should only see their own sub-task details unless they are the Lead (BFD Section 3.6)
      if (!isLead && task.sub_tasks) {
        task.sub_tasks = task.sub_tasks.filter((st) =>
          st.assignees.some((a) => a.employee_id === requestingEmpId)
        );
      }
    }

    const history = await this.taskRepo.getHistory(taskId);
    return { task, history };
  }
}
