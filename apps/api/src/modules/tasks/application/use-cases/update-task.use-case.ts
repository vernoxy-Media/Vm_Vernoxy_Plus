import { TaskEntity, TaskPriority } from '../../domain/entities/task.entity';
import {
  AssigneeValidationError,
  TaskCompletedLockedError,
  TaskNotFoundError,
} from '../../domain/errors/task.errors';
import { EmployeeDirectoryPort } from '../../domain/ports/employee-directory.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { validateAssigneeIds } from '../../domain/services/task-rules';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface UpdateTaskCommand {
  taskId: number;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  task_type_id?: number | null;
  due_date?: string | null;
  allocated_minutes?: number | null;
  assignee_ids?: number[];
  actor_emp_id: number;
}

export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepositoryPort,
    private readonly employeeDirectory: EmployeeDirectoryPort,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(command: UpdateTaskCommand): Promise<TaskEntity> {
    const existing = await this.taskRepo.findById(command.taskId);
    if (!existing) {
      throw new TaskNotFoundError(command.taskId);
    }

    if (existing.stage === 'completed') {
      throw new TaskCompletedLockedError(command.taskId);
    }

    let cleanAssigneeIds: number[] | undefined;
    if (command.assignee_ids !== undefined) {
      const validation = validateAssigneeIds(command.assignee_ids);
      if (!validation.valid) {
        throw new AssigneeValidationError(validation.error!);
      }
      const allActive = await this.employeeDirectory.validateActiveEmployees(command.assignee_ids);
      if (!allActive) {
        throw new AssigneeValidationError('One or more assignees are inactive or deleted');
      }
      cleanAssigneeIds = Array.from(new Set(command.assignee_ids));
    }

    const updated = await this.taskRepo.updateTask(command.taskId, {
      title: command.title?.trim(),
      description: command.description !== undefined ? command.description?.trim() || null : undefined,
      priority: command.priority,
      task_type_id: command.task_type_id,
      due_date: command.due_date,
      allocated_minutes: command.allocated_minutes,
      assignee_ids: cleanAssigneeIds,
      updated_by: command.actor_emp_id,
    });

    // Notify newly added assignees
    if (cleanAssigneeIds) {
      const existingAssigneeIds = new Set(existing.assignees.map((a) => a.employee_id));
      const newlyAdded = cleanAssigneeIds.filter((id) => !existingAssigneeIds.has(id));
      if (newlyAdded.length > 0) {
        const notifications = newlyAdded.map((id) => ({
          recipient_id: id,
          kind: 'task_assigned',
          title: `Assigned: ${updated.task_code}`,
          body: `You have been assigned to task: "${updated.title}"`,
          entity_type: 'task',
          entity_id: updated.task_id,
          created_by: command.actor_emp_id,
        }));
        await this.createNotificationUseCase.executeMany(notifications).catch(() => {});
      }
    }

    return updated;
  }
}
