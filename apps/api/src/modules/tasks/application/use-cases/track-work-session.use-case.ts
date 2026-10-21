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

    if (!command.isAdmin) {
      const isAssignee = existing.assignees.some((a) => a.employee_id === command.actorEmpId);
      const isLead = existing.lead_employee_id === command.actorEmpId;
      if (!isAssignee && !isLead) {
        throw new TaskPermissionDeniedError('Only assigned employees or administrators can track work on this task');
      }
    }

    const updated = await this.taskRepo.trackWorkSession(command.taskId, {
      action: command.action,
      actor_emp_id: command.actorEmpId,
      actor_name: command.actorName,
      note: command.note,
    });

    if (command.action === 'finish') {
      this.notifyApprovers(updated, command).catch(() => {});
    }

    return updated;
  }

  private async notifyApprovers(task: TaskEntity, command: TrackWorkSessionCommand): Promise<void> {
    const approverIds = await this.approverResolver.getAdminApproverIds();
    const notifyApprovers = approverIds
      .filter((id) => id !== command.actorEmpId)
      .map((id) => ({
        recipient_id: id,
        kind: 'task_review_requested',
        title: `Work Finished & Review Requested: ${task.task_code}`,
        body: `${command.actorName} finished work on "${task.title}" and submitted for review`,
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
