import { TaskEntity, TaskPriority } from '../../domain/entities/task.entity';
import { AssigneeValidationError, TaskCompletedLockedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import { EmployeeDirectoryPort } from '../../domain/ports/employee-directory.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { parseDueDate, validateAssigneeIds, validateDateRange } from '../../domain/services/task-rules';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface AddSubTaskCommand {
  parentTaskId: number;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  task_type_id?: number | null;
  other_task_type?: string | null;
  allocated_minutes?: number | null;
  assignee_ids: number[];
  start_date?: string | null;
  due_date?: string | null;
  actor_emp_id: number;
}

const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];

/**
 * Adds a sub-task to a task that already exists (the same fields and checks as a sub-task made with the task).
 * The parent then carries the total time of its sub-tasks, so the time rule of Task BFD 2.4 keeps holding.
 */
export class AddSubTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepositoryPort,
    private readonly employeeDirectory: EmployeeDirectoryPort,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(command: AddSubTaskCommand): Promise<{ parent: TaskEntity; sub_task: TaskEntity }> {
    const fail = (msg: string): never => {
      throw new AssigneeValidationError(msg);
    };

    const parent = await this.taskRepo.findById(command.parentTaskId);
    if (!parent) throw new TaskNotFoundError(command.parentTaskId);
    if (parent.stage === 'completed') throw new TaskCompletedLockedError(command.parentTaskId);
    if (parent.parent_task_id) fail('A sub-task cannot have sub-tasks of its own.');

    // Splitting a task that someone already worked on directly would leave its logged time with no owner.
    const hasChildren = parent.has_sub_tasks || (parent.sub_tasks_count ?? 0) > 0;
    if (!hasChildren && (parent.stage !== 'assigned' || parent.actual_minutes > 0 || parent.is_timer_running)) {
      fail('Work has already started on this task, so it cannot be split into sub-tasks. Add sub-tasks before work starts.');
    }

    const title = command.title?.trim();
    if (!title) fail('Please enter the Task Name.');
    if (title.length > 150) fail('Task Name cannot be longer than 150 characters.');

    const minutes = Number(command.allocated_minutes || 0);
    if (!Number.isInteger(minutes) || minutes <= 0) fail('Allocated Time is mandatory and must be greater than zero.');

    const dueDate = parseDueDate(command.due_date);
    if (dueDate === undefined) fail('Please enter a valid Due Date.');
    const startDate = parseDueDate(command.start_date);
    if (startDate === undefined) fail('Please enter a valid Start Date.');
    const rangeError = validateDateRange(startDate, dueDate);
    if (rangeError) fail(rangeError);

    const priority = (command.priority || parent.priority) as TaskPriority;
    if (!PRIORITIES.includes(priority)) fail('Please select the Priority: High, Medium or Low.');

    // Task Type is optional on a sub-task: it follows the parent, and "Others" needs its own text.
    let other: string | null = null;
    if (command.task_type_id) {
      const code = await this.taskRepo.getTaskTypeCode(Number(command.task_type_id));
      if (!code) fail('Please select a valid Task Type.');
      if (code === 'other') {
        other = (command.other_task_type || '').trim();
        if (!other) fail('Please enter the Other Task Type.');
        if (other.length > 100) fail('Other Task Type cannot be longer than 100 characters.');
      }
    }

    const assignees = Array.from(new Set((command.assignee_ids || []).map(Number)));
    if (!validateAssigneeIds(assignees).valid) fail('Please select the employee in Assigned To.');
    if (!(await this.employeeDirectory.validateActiveEmployees(assignees))) fail('A task can be assigned only to an Active employee.');

    const result = await this.taskRepo.addSubTask(command.parentTaskId, {
      title,
      description: command.description?.trim() || null,
      priority,
      task_type_id: command.task_type_id || null,
      other_task_type: other,
      allocated_minutes: minutes,
      assignee_ids: assignees,
      start_date: startDate,
      due_date: dueDate,
      actor_emp_id: command.actor_emp_id,
    });

    const inputs = assignees
      .filter((id) => id !== command.actor_emp_id)
      .map((id) => ({
        recipient_id: id,
        kind: 'task_assigned',
        title: `Task assigned: ${result.sub_task.task_code}`,
        body: `You have been assigned the sub-task "${result.sub_task.title}" of ${result.parent.task_code}.`,
        entity_type: 'task',
        entity_id: result.sub_task.task_id,
        created_by: command.actor_emp_id,
      }));
    if (inputs.length) await this.createNotificationUseCase.executeMany(inputs).catch(() => {});

    return result;
  }
}
