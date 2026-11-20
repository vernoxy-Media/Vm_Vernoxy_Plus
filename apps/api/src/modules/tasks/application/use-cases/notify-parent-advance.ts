import { TaskEntity } from '../../domain/entities/task.entity';
import { ApproverResolverPort } from '../../domain/ports/approver-resolver.port';
import { TaskRepositoryPort } from '../../domain/ports/task.repository.port';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface ParentAdvanceDeps {
  taskRepo: TaskRepositoryPort;
  approverResolver: ApproverResolverPort;
  createNotificationUseCase: CreateNotificationUseCase;
}

/**
 * When the last sub-task is finished, the main task moves on by itself: to QA when it has a tester, otherwise to
 * Submitted. Nobody pressed a button on the main task, so nobody was told. This tells the right people:
 *  - moved to In QA      -> the main task's QA tester
 *  - moved to Submitted  -> the Admin approvers and the project's manager
 * `parentBefore` is the main task as it was before the sub-task changed.
 */
export async function notifyParentAdvance(
  deps: ParentAdvanceDeps,
  parentBefore: TaskEntity | null,
  child: TaskEntity,
  actor: { empId: number; name: string },
): Promise<void> {
  if (!parentBefore || !child.parent_task_id) return;
  const parent = await deps.taskRepo.findById(child.parent_task_id);
  if (!parent || parent.stage === parentBefore.stage) return;

  if (parent.stage === 'in_qa') {
    if (!parent.qa_assignee_id || parent.qa_assignee_id === actor.empId) return;
    await deps.createNotificationUseCase.execute({
      recipient_id: parent.qa_assignee_id,
      kind: 'task_ready_for_qa',
      title: `Submitted for QA: ${parent.task_code}`,
      body: `All sub-tasks of "${parent.title}" are finished. ${actor.name} submitted the last one, so the task is ready for your testing.`,
      entity_type: 'task',
      entity_id: parent.task_id,
      created_by: actor.empId,
    });
    return;
  }

  if (parent.stage === 'requested') {
    const ids = await deps.approverResolver.getAdminApproverIds();
    const managerId = await deps.taskRepo.getTaskProjectManagerId(parent.task_id);
    if (managerId) ids.push(managerId);
    const notices = Array.from(new Set(ids))
      .filter((id) => id !== actor.empId)
      .map((id) => ({
        recipient_id: id,
        kind: 'task_review_requested',
        title: `Submitted for Review: ${parent.task_code}`,
        body: `All sub-tasks of "${parent.title}" are finished. ${actor.name} submitted the last one, so the task is ready for your approval.`,
        entity_type: 'task',
        entity_id: parent.task_id,
        created_by: actor.empId,
      }));
    if (notices.length) await deps.createNotificationUseCase.executeMany(notices);
  }
}
