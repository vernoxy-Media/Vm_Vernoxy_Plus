import { TaskEntity, TaskPriority } from '../../domain/entities/task.entity';
import { AssigneeValidationError } from '../../domain/errors/task.errors';
import { ApproverResolverPort } from '../../domain/ports/approver-resolver.port';
import { TaskClockPort } from '../../domain/ports/clock.port';
import { EmployeeDirectoryPort } from '../../domain/ports/employee-directory.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { validateAssigneeIds } from '../../domain/services/task-rules';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface CreateTaskCommand {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  task_type_id?: number | null;
  due_date?: string | null;
  allocated_minutes?: number | null;
  assignee_ids: number[];
  creator_emp_id: number;
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepositoryPort,
    private readonly employeeDirectory: EmployeeDirectoryPort,
    private readonly clock: TaskClockPort,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(command: CreateTaskCommand): Promise<TaskEntity> {
    const title = command.title?.trim();
    if (!title) {
      throw new AssigneeValidationError('Task title cannot be blank');
    }

    const validation = validateAssigneeIds(command.assignee_ids);
    if (!validation.valid) {
      throw new AssigneeValidationError(validation.error!);
    }

    const allActive = await this.employeeDirectory.validateActiveEmployees(command.assignee_ids);
    if (!allActive) {
      throw new AssigneeValidationError('One or more assignees are inactive or deleted');
    }

    const now = this.clock.now();
    const year = now.getFullYear();
    const taskCode = await this.taskRepo.getNextTaskCode(year);

    const task = await this.taskRepo.createTask({
      task_code: taskCode,
      title,
      description: command.description?.trim() || null,
      priority: command.priority || 'medium',
      task_type_id: command.task_type_id || null,
      due_date: command.due_date || null,
      allocated_minutes: command.allocated_minutes || null,
      assignee_ids: Array.from(new Set(command.assignee_ids)),
      created_by: command.creator_emp_id,
    });

    // Notify assignees (except creator if they assigned themselves)
    const notificationInputs = task.assignees
      .filter((a) => a.employee_id !== command.creator_emp_id)
      .map((a) => ({
        recipient_id: a.employee_id,
        kind: 'task_assigned',
        title: `Assigned: ${task.task_code}`,
        body: `You have been assigned to task: "${task.title}"`,
        entity_type: 'task',
        entity_id: task.task_id,
        created_by: command.creator_emp_id,
      }));

    if (notificationInputs.length > 0) {
      await this.createNotificationUseCase.executeMany(notificationInputs).catch(() => {});
    }

    return task;
  }
}
