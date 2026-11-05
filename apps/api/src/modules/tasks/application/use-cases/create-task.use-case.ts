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
  /** Project Task (Project Management BFD 2.7). */
  project_id?: number | null;
  sprint_id?: number | null;
}

const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];

/**
 * Task BFD 2.3 / 2.4 / 3.5. Used for Admin tasks, employee (quick) tasks and
 * Project Tasks, so all three follow the same rules.
 */
export class CreateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepositoryPort,
    private readonly employeeDirectory: EmployeeDirectoryPort,
    private readonly clock: TaskClockPort,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(command: CreateTaskCommand): Promise<TaskEntity> {
    const fail = (msg: string) => {
      throw new AssigneeValidationError(msg);
    };

    const title = command.title?.trim();
    if (!title) fail('Please enter the Task Name.');
    if (title!.length > 150) fail('Task Name cannot be longer than 150 characters.');

    const allocated = Number(command.allocated_minutes || 0);
    if (!Number.isInteger(allocated) || allocated <= 0) fail('Allocated Time is mandatory and must be greater than zero.');

    const priority = (command.priority || 'medium') as TaskPriority;
    if (!PRIORITIES.includes(priority)) fail('Please select the Priority: High, Medium or Low.');

    const typeInfo = await this.checkTaskType(command.task_type_id, command.other_task_type, 'Task Type');

    const isQuick = command.source === 'quick';
    const hasSubTasks = Boolean(command.has_sub_tasks);

    // An employee's own task cannot be assigned to anyone else (BFD 3.5).
    let assignees = Array.from(new Set((command.assignee_ids || []).map(Number)));
    if (isQuick) assignees = [command.creator_emp_id];

    const validation = validateAssigneeIds(assignees);
    if (!validation.valid) fail('Please select the employee in Assigned To.');

    // Without sub tasks only one employee can be selected (BFD 2.3).
    if (!hasSubTasks && assignees.length !== 1) {
      fail('Only one employee can be selected in Assigned To. Tick "Has Sub Tasks" to share the task.');
    }

    const allActive = await this.employeeDirectory.validateActiveEmployees(assignees);
    if (!allActive) fail('A task can be assigned only to an Active employee.');

    let leadId: number | null = null;
    let subTasks: CreateSubTaskRepoInput[] | undefined;
    if (hasSubTasks) {
      leadId = isQuick ? command.creator_emp_id : Number(command.lead_employee_id || 0) || null;
      if (!leadId) fail('Please select the Lead.');
      if (!assignees.includes(leadId!)) fail('The Lead must be one of the employees in Assigned To.');
      if (!command.sub_tasks || command.sub_tasks.length === 0) fail('Please add at least one sub task, or untick "Has Sub Tasks".');

      subTasks = [];
      for (const [i, st] of command.sub_tasks!.entries()) {
        const stAssignees = isQuick ? [command.creator_emp_id] : Array.from(new Set((st.assignee_ids || []).map(Number)));
        if (!st.title?.trim()) fail(`Please enter the name of sub task ${i + 1}.`);
        if (st.title!.trim().length > 150) fail(`The name of sub task ${i + 1} cannot be longer than 150 characters.`);
        const stPriority = (st.priority || priority) as TaskPriority;
        if (!PRIORITIES.includes(stPriority)) fail(`Please select the Priority of sub task ${i + 1}.`);
        let stOther: string | null = null;
        if (st.task_type_id) {
          stOther = (await this.checkTaskType(st.task_type_id, st.other_task_type, `Task Type of sub task ${i + 1}`)).other;
        }
        subTasks.push({
          title: st.title!.trim(),
          description: st.description?.trim() || null,
          priority: stPriority,
          task_type_id: st.task_type_id || null,
          other_task_type: stOther,
          allocated_minutes: st.allocated_minutes || null,
          assignee_ids: stAssignees,
        });
      }
      // Time rules (BFD 2.4) and sub task employees come from the main task.
      const subValidation = validateSubTasks(allocated, subTasks, assignees);
      if (!subValidation.valid) fail(subValidation.error!);
    }

    const now = this.clock.now();
    const taskCode = await this.taskRepo.getNextTaskCode(now.getFullYear());

    const task = await this.taskRepo.createTask({
      task_code: taskCode,
      title: title!,
      description: command.description?.trim() || null,
      priority,
      task_type_id: command.task_type_id!,
      due_date: command.due_date || null,
      allocated_minutes: allocated,
      assignee_ids: assignees,
      created_by: command.creator_emp_id,
      source: command.source || 'personal',
      lead_employee_id: leadId,
      has_sub_tasks: hasSubTasks,
      other_task_type: typeInfo.other,
      sub_tasks: subTasks,
      project_id: command.project_id ?? null,
      sprint_id: command.sprint_id ?? null,
    });

    // In-app notification when a task is assigned (BFD 2.5). Sub task employees get their own sub task.
    const recipients = new Set<number>();
    if (hasSubTasks) {
      for (const st of subTasks || []) st.assignee_ids.forEach((id) => recipients.add(id));
      if (leadId) recipients.add(leadId);
    } else {
      assignees.forEach((id) => recipients.add(id));
    }
    recipients.delete(command.creator_emp_id);
    const inputs = Array.from(recipients).map((id) => ({
      recipient_id: id,
      kind: 'task_assigned',
      title: `Task assigned: ${task.task_code}`,
      body: `You have been assigned the task "${task.title}".`,
      entity_type: 'task',
      entity_id: task.task_id,
      created_by: command.creator_emp_id,
    }));
    if (inputs.length) await this.createNotificationUseCase.executeMany(inputs).catch(() => {});

    return task;
  }

  /** Task Type is mandatory; "Others" needs its own text (max 100), saved with this task only. */
  private async checkTaskType(typeId: number | null | undefined, other: string | null | undefined, label: string) {
    if (!typeId) throw new AssigneeValidationError(`Please select the ${label}.`);
    const code = await this.taskRepo.getTaskTypeCode(Number(typeId));
    if (!code) throw new AssigneeValidationError(`Please select a valid ${label}.`);
    if (code === 'other') {
      const text = (other || '').trim();
      if (!text) throw new AssigneeValidationError('Please enter the Other Task Type.');
      if (text.length > 100) throw new AssigneeValidationError('Other Task Type cannot be longer than 100 characters.');
      return { code, other: text };
    }
    return { code, other: null as string | null };
  }
}
