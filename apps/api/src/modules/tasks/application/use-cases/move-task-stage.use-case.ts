import { TaskEntity, TaskStage } from '../../domain/entities/task.entity';
import {
  InvalidStageTransitionError,
  TaskNotFoundError,
  TaskPermissionDeniedError,
} from '../../domain/errors/task.errors';
import { ApproverResolverPort } from '../../domain/ports/approver-resolver.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { canTransitionStage } from '../../domain/services/task-rules';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface MoveTaskStageCommand {
  taskId: number;
  targetStage: TaskStage;
  actorEmpId: number;
  actorName: string;
  isAdmin: boolean;
  note?: string | null;
}

export class MoveTaskStageUseCase {
  constructor(
    private readonly taskRepo: TaskRepositoryPort,
    private readonly approverResolver: ApproverResolverPort,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(command: MoveTaskStageCommand): Promise<TaskEntity> {
    const existing = await this.taskRepo.findById(command.taskId);
    if (!existing) {
      throw new TaskNotFoundError(command.taskId);
    }

    if (!command.isAdmin) {
      const isAssignee = existing.assignees.some((a) => a.employee_id === command.actorEmpId);
      if (!isAssignee) {
        throw new TaskPermissionDeniedError('Only assigned employees or administrators can move this task');
      }
    }

    const check = canTransitionStage(existing.stage, command.targetStage, command.isAdmin);
    if (!check.allowed) {
      throw new InvalidStageTransitionError(check.reason || 'Invalid stage transition');
    }

    const updated = await this.taskRepo.moveStage(command.taskId, {
      target_stage: command.targetStage,
      actor_emp_id: command.actorEmpId,
      note: command.note?.trim() || null,
    });

    // Handle notifications asynchronously without failing the stage transition
    this.dispatchNotifications(existing.stage, command.targetStage, updated, command).catch(() => {});

    return updated;
  }

  private async dispatchNotifications(
    fromStage: TaskStage,
    toStage: TaskStage,
    task: TaskEntity,
    command: MoveTaskStageCommand,
  ): Promise<void> {
    // 1. Moving to requested (review requested) -> notify admin approvers
    if (toStage === 'requested') {
      const approverIds = await this.approverResolver.getAdminApproverIds();
      const notifyApprovers = approverIds
        .filter((id) => id !== command.actorEmpId)
        .map((id) => ({
          recipient_id: id,
          kind: 'task_review_requested',
          title: `Review Requested: ${task.task_code}`,
          body: `${command.actorName} submitted "${task.title}" for review`,
          entity_type: 'task',
          entity_id: task.task_id,
          created_by: command.actorEmpId,
        }));
      if (notifyApprovers.length) {
        await this.createNotificationUseCase.executeMany(notifyApprovers);
      }
    }

    // 2. Moving to completed (approved) -> notify assignees
    if (toStage === 'completed') {
      const notifyAssignees = task.assignees
        .filter((a) => a.employee_id !== command.actorEmpId)
        .map((a) => ({
          recipient_id: a.employee_id,
          kind: 'task_approved',
          title: `Task Approved: ${task.task_code}`,
          body: `Task "${task.title}" was approved and marked complete`,
          entity_type: 'task',
          entity_id: task.task_id,
          created_by: command.actorEmpId,
        }));
      if (notifyAssignees.length) {
        await this.createNotificationUseCase.executeMany(notifyAssignees);
      }
    }

    // 3. Rejected back to in_progress from requested -> notify assignees
    if (fromStage === 'requested' && toStage === 'in_progress' && command.isAdmin) {
      const notifyAssignees = task.assignees
        .filter((a) => a.employee_id !== command.actorEmpId)
        .map((a) => ({
          recipient_id: a.employee_id,
          kind: 'task_rejected',
          title: `Changes Requested: ${task.task_code}`,
          body: command.note
            ? `Review note: "${command.note}"`
            : `Task "${task.title}" was returned to In Progress`,
          entity_type: 'task',
          entity_id: task.task_id,
          created_by: command.actorEmpId,
        }));
      if (notifyAssignees.length) {
        await this.createNotificationUseCase.executeMany(notifyAssignees);
      }
    }
  }
}
