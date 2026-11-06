import { TaskEntity, TaskPriority } from '../../domain/entities/task.entity';
import {
  AssigneeValidationError,
  TaskCompletedLockedError,
  TaskNotFoundError,
} from '../../domain/errors/task.errors';
import { EmployeeDirectoryPort } from '../../domain/ports/employee-directory.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { parseDueDate, validateAssigneeIds, validateDateRange } from '../../domain/services/task-rules';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface UpdateTaskCommand {
  taskId: number;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  task_type_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  allocated_minutes?: number | null;
  assignee_ids?: number[];
  other_task_type?: string | null;
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

    // Same mandatory rules as Create Task (BFD 2.3).
    if (command.title !== undefined) {
      const t = command.title?.trim();
      if (!t) throw new AssigneeValidationError('Please enter the Task Name.');
      if (t.length > 150) throw new AssigneeValidationError('Task Name cannot be longer than 150 characters.');
    }
    if (command.allocated_minutes !== undefined) {
      const m = Number(command.allocated_minutes || 0);
      if (!Number.isInteger(m) || m <= 0) throw new AssigneeValidationError('Allocated Time is mandatory and must be greater than zero.');
    }
    if (command.due_date !== undefined && parseDueDate(command.due_date) === undefined) {
      throw new AssigneeValidationError('Please enter a valid Due Date.');
    }
    if (command.start_date !== undefined && parseDueDate(command.start_date) === undefined) {
      throw new AssigneeValidationError('Please enter a valid Start Date.');
    }
    // A change to one date is checked against the other date the task already has
    const nextStart = command.start_date !== undefined ? parseDueDate(command.start_date) : existing.start_date;
    const nextDue = command.due_date !== undefined ? parseDueDate(command.due_date) : existing.due_date;
    const rangeError = validateDateRange(nextStart, nextDue);
    if (rangeError) throw new AssigneeValidationError(rangeError);
    if (command.priority !== undefined && !['high', 'medium', 'low'].includes(command.priority)) {
      throw new AssigneeValidationError('Please select the Priority: High, Medium or Low.');
    }
    let otherText: string | null | undefined;
    if (command.task_type_id !== undefined) {
      if (!command.task_type_id) throw new AssigneeValidationError('Please select the Task Type.');
      const code = await this.taskRepo.getTaskTypeCode(Number(command.task_type_id));
      if (!code) throw new AssigneeValidationError('Please select a valid Task Type.');
      if (code === 'other') {
        otherText = (command.other_task_type || '').trim();
        if (!otherText) throw new AssigneeValidationError('Please enter the Other Task Type.');
        if (otherText.length > 100) throw new AssigneeValidationError('Other Task Type cannot be longer than 100 characters.');
      } else {
        otherText = null;
      }
    }
    if (command.assignee_ids !== undefined && !existing.has_sub_tasks && new Set(command.assignee_ids).size !== 1) {
      throw new AssigneeValidationError('Only one employee can be selected in Assigned To for a task without sub tasks.');
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
      start_date: command.start_date === undefined ? undefined : parseDueDate(command.start_date),
      due_date: command.due_date === undefined ? undefined : parseDueDate(command.due_date),
      allocated_minutes: command.allocated_minutes,
      assignee_ids: cleanAssigneeIds,
      ...(otherText !== undefined ? { other_task_type: otherText } : {}),
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
