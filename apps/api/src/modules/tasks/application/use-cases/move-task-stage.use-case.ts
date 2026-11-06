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
  hold_reason?: string | null;
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

    const isAssignee = existing.assignees.some((a) => a.employee_id === command.actorEmpId);
    const isLead = existing.lead_employee_id === command.actorEmpId;

    // Approver actions (BFD Section 3.3): Approving a submitted task, or rejecting back to in_progress with notes
    const isApproverAction =
      (existing.stage === 'requested' && command.targetStage === 'completed') ||
      (existing.stage === 'requested' && command.targetStage === 'in_progress');

    // Approver (BFD 3.4): Admin for every task; the Project Manager also for Project Tasks.
    const projectManagerId = await this.taskRepo.getTaskProjectManagerId(existing.task_id);
    const isApprover = command.isAdmin || (projectManagerId !== null && projectManagerId === command.actorEmpId);

    if (isApproverAction) {
      if (!isApprover) {
        throw new TaskPermissionDeniedError('Only the Admin, or the Project Manager for Project Tasks, can approve or send back this task.');
      }
    } else {
      // Execution actions (moving to In Progress, Hold, or submitting): only assigned employees can perform
      if (!isAssignee && !isLead) {
        throw new TaskPermissionDeniedError('Only assigned employees can move, pause, or submit this task');
      }
    }

    const check = canTransitionStage(existing.stage, command.targetStage, isApprover);
    if (!check.allowed) {
      throw new InvalidStageTransitionError(check.reason || 'Invalid stage transition');
    }

    // Mandatory hold reason validation
    if (command.targetStage === 'hold') {
      const reason = command.hold_reason?.trim() || command.note?.trim();
      if (!reason) {
        throw new InvalidStageTransitionError('Hold reason is mandatory when placing a task on hold');
      }
    }

    // Section 3.6: Main task approval requires all sub tasks to be approved
    if (command.targetStage === 'completed' && existing.has_sub_tasks) {
      const subTasks = await this.taskRepo.getSubTasks(existing.task_id);
      const unapprovedSubTasks = subTasks.filter((st) => st.stage !== 'completed');
      if (unapprovedSubTasks.length > 0) {
        throw new InvalidStageTransitionError(
          `Cannot approve main task: ${unapprovedSubTasks.length} sub task(s) are not yet approved`,
        );
      }
    }

    // The work clock starts when an assignee moves the task into In Progress.
    // An approver sending a task back for rework does not start anyone's clock;
    // a main task with sub-tasks is timed on its sub-tasks.
    const startTimer =
      command.targetStage === 'in_progress' && (isAssignee || isLead) && !isApproverAction && !existing.has_sub_tasks;

    const updated = await this.taskRepo.moveStage(command.taskId, {
      target_stage: command.targetStage,
      actor_emp_id: command.actorEmpId,
      actor_name: command.actorName,
      note: command.note?.trim() || null,
      hold_reason: command.targetStage === 'hold' ? (command.hold_reason?.trim() || command.note?.trim() || null) : null,
      self_approved: isApprover,
      start_timer: startTimer,
    });

    // Handle notifications asynchronously without failing the stage transition
    this.dispatchNotifications(existing.stage, command.targetStage, updated, { ...command, isAdmin: isApprover }, projectManagerId).catch(() => {});

    return updated;
  }

  private async dispatchNotifications(
    fromStage: TaskStage,
    toStage: TaskStage,
    task: TaskEntity,
    command: MoveTaskStageCommand,
    projectManagerId: number | null = null,
  ): Promise<void> {
    // 1. Moving to requested (Submitted) -> notify admin approvers
    if (toStage === 'requested') {
      const approverIds = await this.approverResolver.getAdminApproverIds();
      if (projectManagerId) approverIds.push(projectManagerId);
      const notifyApprovers = Array.from(new Set(approverIds))
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

    // 2. Moving to completed (Approved) -> notify assignees
    if (toStage === 'completed') {
      const notifyAssignees = task.assignees
        .filter((a) => a.employee_id !== command.actorEmpId)
        .map((a) => ({
          recipient_id: a.employee_id,
          kind: 'task_approved',
          title: `Task Approved: ${task.task_code}`,
          body: `Task "${task.title}" was approved and closed`,
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
            : `Task "${task.title}" was returned to In Progress for rework`,
          entity_type: 'task',
          entity_id: task.task_id,
          created_by: command.actorEmpId,
        }));
      if (notifyAssignees.length) {
        await this.createNotificationUseCase.executeMany(notifyAssignees);
      }
    }

    // 4. Moving to hold -> notify assignees & admin
    if (toStage === 'hold') {
      const notifyAssignees = task.assignees
        .filter((a) => a.employee_id !== command.actorEmpId)
        .map((a) => ({
          recipient_id: a.employee_id,
          kind: 'task_held',
          title: `Task on Hold: ${task.task_code}`,
          body: `Task "${task.title}" was placed on hold. Reason: ${task.hold_reason || 'Work paused'}`,
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
