import { notifyParentAdvance } from './notify-parent-advance';

const ACTOR = 7;
const QA = 9;
const ADMIN = 1;
const PM = 4;

const parent = (stage: string, over: Record<string, unknown> = {}) => ({
  task_id: 50,
  task_code: 'TSK-2026-0050',
  title: 'Main task',
  stage,
  qa_assignee_id: QA,
  ...over,
});
const child = { task_id: 51, parent_task_id: 50 };

function setup(after: Record<string, unknown>) {
  const taskRepo = {
    findById: jest.fn().mockResolvedValue(after),
    getTaskProjectManagerId: jest.fn().mockResolvedValue(PM),
  };
  const approverResolver = { getAdminApproverIds: jest.fn().mockResolvedValue([ADMIN]) };
  const createNotificationUseCase = { execute: jest.fn().mockResolvedValue({}), executeMany: jest.fn().mockResolvedValue(1) };
  const run = (before: Record<string, unknown> | null, actorId = ACTOR) =>
    notifyParentAdvance(
      { taskRepo, approverResolver, createNotificationUseCase } as never,
      before as never,
      child as never,
      { empId: actorId, name: 'Dev' },
    );
  return { run, createNotificationUseCase };
}

describe('notifyParentAdvance', () => {
  it('tells the main task\'s tester when the main task moved to QA', async () => {
    const { run, createNotificationUseCase } = setup(parent('in_qa'));
    await run(parent('in_progress') as never);
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_id: QA, kind: 'task_ready_for_qa', entity_id: 50 }),
    );
  });

  it('tells the Admin approvers and the project manager when the main task moved to Submitted', async () => {
    const { run, createNotificationUseCase } = setup(parent('requested', { qa_assignee_id: null }));
    await run(parent('in_progress') as never);
    const sent = createNotificationUseCase.executeMany.mock.calls[0][0] as { recipient_id: number; kind: string }[];
    expect(sent.map((n) => n.recipient_id).sort()).toEqual([ADMIN, PM]);
    expect(sent.every((n) => n.kind === 'task_review_requested')).toBe(true);
  });

  it('does not tell the person who just did the work', async () => {
    const { run, createNotificationUseCase } = setup(parent('requested', { qa_assignee_id: null }));
    await run(parent('in_progress') as never, PM);
    const sent = createNotificationUseCase.executeMany.mock.calls[0][0] as { recipient_id: number }[];
    expect(sent.map((n) => n.recipient_id)).toEqual([ADMIN]);
  });

  it('says nothing when the main task did not move', async () => {
    const { run, createNotificationUseCase } = setup(parent('in_progress'));
    await run(parent('in_progress') as never);
    expect(createNotificationUseCase.execute).not.toHaveBeenCalled();
    expect(createNotificationUseCase.executeMany).not.toHaveBeenCalled();
  });

  it('says nothing for a task that is not a sub-task', async () => {
    const { run, createNotificationUseCase } = setup(parent('in_qa'));
    await run(null);
    expect(createNotificationUseCase.execute).not.toHaveBeenCalled();
  });
});
