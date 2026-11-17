import { TaskEntity } from '../../domain/entities/task.entity';
import {
  TaskNotFoundError,
  TaskPermissionDeniedError,
} from '../../domain/errors/task.errors';
import { ApproverResolverPort } from '../../domain/ports/approver-resolver.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface TrackWorkSessionCommand {
  taskId: number;
  action: 'start' | 'pause' | 'finish';
  actorEmpId: number;
  actorName: string;
  isAdmin: boolean;
  note?: string | null;
}

export class TrackWorkSessionUseCase {
  constructor(
    private readonly taskRepo: TaskRepositoryPort,
    private readonly approverResolver: ApproverResolverPort,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(command: TrackWorkSessionCommand): Promise<TaskEntity> {
    const existing = await this.taskRepo.findById(command.taskId);
    if (!existing) {
      throw new TaskNotFoundError(command.taskId);
    }

    const isAssignee = existing.assignees.some((a) => a.employee_id === command.actorEmpId);
    const isLead = existing.lead_employee_id === command.actorEmpId;
    if (!isAssignee && !isLead) {
      throw new TaskPermissionDeniedError('Only assigned employees can start, pause, or finish work on this task');
    }

    const parentBefore = command.action === 'finish' && existing.parent_task_id ? await this.taskRepo.findById(existing.parent_task_id) : null;

    const updated = await this.taskRepo.trackWorkSession(command.taskId, {
      action: command.action,
      actor_emp_id: command.actorEmpId,
      actor_name: command.actorName,
      note: command.note,
    });

    if (command.action === 'finish') {
      if (updated.stage === 'in_qa') this.notifyQa(updated, command).catch(() => {});
      else this.notifyApprovers(updated, command).catch(() => {});
      this.notifyParentQa(parentBefore, updated, command).catch(() => {});
    }

    return updated;
  }

  /** When the last sub-task is finished the parent task moves to QA by itself: tell the parent's tester too. */
  private async notifyParentQa(parentBefore: TaskEntity | null, child: TaskEntity, command: TrackWorkSessionCommand): Promise<void> {
    if (!parentBefore || parentBefore.stage === 'in_qa' || !child.parent_task_id) return;
    const parent = await this.taskRepo.findById(child.parent_task_id);
    if (!parent || parent.stage !== 'in_qa' || !parent.qa_assignee_id || parent.qa_assignee_id === command.actorEmpId) return;
    await this.createNotificationUseCase.execute({
      recipient_id: parent.qa_assignee_id,
      kind: 'task_ready_for_qa',
      title: `Submitted for QA: ${parent.task_code}`,
      body: `All sub-tasks of "${parent.title}" are finished. ${command.actorName} submitted the last one, so the task is ready for your testing.`,
      entity_type: 'task',
      entity_id: parent.task_id,
      created_by: command.actorEmpId,
    });
  }

  private async notifyQa(task: TaskEntity, command: TrackWorkSessionCommand): Promise<void> {
    if (!task.qa_assignee_id || task.qa_assignee_id === command.actorEmpId) return;
    await this.createNotificationUseCase.execute({
      recipient_id: task.qa_assignee_id,
      kind: 'task_ready_for_qa',
      title: `Submitted for QA: ${task.task_code}`,
      body: `${command.actorName} has submitted "${task.title}" for QA. Please test it and pass or return it.`,
      entity_type: 'task',
      entity_id: task.task_id,
      created_by: command.actorEmpId,
    });
  }

  private async notifyApprovers(task: TaskEntity, command: TrackWorkSessionCommand): Promise<void> {
    const approverIds = await this.approverResolver.getAdminApproverIds();
    const notifyApprovers = approverIds
      .filter((id) => id !== command.actorEmpId)
      .map((id) => ({
        recipient_id: id,
        kind: 'task_review_requested',
        title: `Submitted for Review: ${task.task_code}`,
        body: `${command.actorName} has finished work on "${task.title}" and submitted it for your review.`,
        entity_type: 'task',
        entity_id: task.task_id,
        created_by: command.actorEmpId,
      }));

    if (notifyApprovers.length) {
      await Promise.allSettled(
        notifyApprovers.map((n) => this.createNotificationUseCase.execute(n)),
      );
    }
  }
}
