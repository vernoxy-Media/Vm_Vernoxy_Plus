import { TaskEntity, TaskPriority, TaskSource } from '../../domain/entities/task.entity';
import { AssigneeValidationError } from '../../domain/errors/task.errors';
import { TaskClockPort } from '../../domain/ports/clock.port';
import { EmployeeDirectoryPort } from '../../domain/ports/employee-directory.port';
import { CreateSubTaskRepoInput, TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { validateAssigneeIds, validateSubTasks } from '../../domain/services/task-rules';
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
  source?: TaskSource;
  lead_employee_id?: number | null;
  has_sub_tasks?: boolean;
  other_task_type?: string | null;
  sub_tasks?: CreateSubTaskRepoInput[];
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
    if (title.length > 150) {
      throw new AssigneeValidationError('Task title cannot exceed 150 characters');
    }

    // For Quick Task (created by employee for themselves), automatically assign to creator
    let assignees = command.assignee_ids;
    if (command.source === 'quick') {
      assignees = [command.creator_emp_id];
    }

    const validation = validateAssigneeIds(assignees);
    if (!validation.valid) {
      throw new AssigneeValidationError(validation.error!);
    }

    const allActive = await this.employeeDirectory.validateActiveEmployees(assignees);
    if (!allActive) {
      throw new AssigneeValidationError('One or more assignees are inactive or deleted');
    }

    // Lead employee validation when has_sub_tasks is checked
    if (command.has_sub_tasks) {
      if (!command.lead_employee_id) {
        throw new AssigneeValidationError('Lead employee is mandatory when task has sub tasks');
      }
      if (!assignees.includes(command.lead_employee_id)) {
        throw new AssigneeValidationError('Lead employee must be selected from the assigned employees list');
      }

      // Validate sub tasks time rules & assignees
      if (command.sub_tasks && command.sub_tasks.length > 0) {
        const subValidation = validateSubTasks(
          command.allocated_minutes,
          command.sub_tasks,
          assignees,
        );
        if (!subValidation.valid) {
          throw new AssigneeValidationError(subValidation.error!);
        }
      }
    }

    // Other Task Type validation
    if (command.other_task_type && command.other_task_type.length > 100) {
      throw new AssigneeValidationError('Other task type cannot exceed 100 characters');
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
      assignee_ids: Array.from(new Set(assignees)),
      created_by: command.creator_emp_id,
      source: command.source || 'personal',
      lead_employee_id: command.has_sub_tasks ? command.lead_employee_id : null,
      has_sub_tasks: Boolean(command.has_sub_tasks),
      other_task_type: command.other_task_type?.trim() || null,
      sub_tasks: command.has_sub_tasks ? command.sub_tasks : undefined,
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
