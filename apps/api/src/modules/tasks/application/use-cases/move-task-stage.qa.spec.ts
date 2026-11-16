import { MoveTaskStageUseCase } from './move-task-stage.use-case';
import { InvalidStageTransitionError, TaskPermissionDeniedError } from '../../domain/errors/task.errors';

const DEV = 7;
const QA = 9;
const ADMIN = 1;
const STRANGER = 20;

function task(over: Record<string, unknown> = {}) {
  return {
    task_id: 50,
    task_code: 'TSK-2026-0050',
    title: 'Add search',
    stage: 'in_progress',
    has_sub_tasks: false,
    lead_employee_id: null,
    qa_assignee_id: QA,
    assignees: [{ employee_id: DEV }],
    hold_reason: null,
    ...over,
  };
}

function setup(existing = task()) {
  const repo = {
    findById: jest.fn().mockResolvedValue(existing),
    getTaskProjectManagerId: jest.fn().mockResolvedValue(null),
    getSubTasks: jest.fn().mockResolvedValue([]),
    moveStage: jest.fn().mockImplementation(async (_id: number, i: { target_stage: string }) => ({ ...existing, stage: i.target_stage })),
  };
  const approvers = { getAdminApproverIds: jest.fn().mockResolvedValue([ADMIN]) };
  const notify = { execute: jest.fn().mockResolvedValue({}), executeMany: jest.fn().mockResolvedValue(1) };
  const uc = new MoveTaskStageUseCase(repo as never, approvers as never, notify as never);
  const run = (actor: number, targetStage: string, extra: Record<string, unknown> = {}) =>
    uc.execute({ taskId: 50, targetStage: targetStage as never, actorEmpId: actor, actorName: `emp${actor}`, isAdmin: actor === ADMIN, ...extra });
  const flush = () => new Promise((r) => setImmediate(r));
  return { repo, notify, run, flush };
}

describe('QA step: developer finishes', () => {
  it('sends the task to QA instead of approval when it has a QA assignee, and tells the tester', async () => {
    const { repo, notify, run, flush } = setup();
    await run(DEV, 'requested');
    expect(repo.moveStage.mock.calls[0][1].target_stage).toBe('in_qa');
    await flush();
    expect(notify.execute).toHaveBeenCalledWith(expect.objectContaining({ recipient_id: QA, kind: 'task_ready_for_qa' }));
  });

  it('goes straight to approval when there is no QA assignee', async () => {
    const { repo, run } = setup(task({ qa_assignee_id: null }));
    await run(DEV, 'requested');
    expect(repo.moveStage.mock.calls[0][1].target_stage).toBe('requested');
  });

  it('refuses to send a task to QA when nobody is the tester', async () => {
    const { run } = setup(task({ qa_assignee_id: null }));
    await expect(run(DEV, 'in_qa')).rejects.toBeInstanceOf(InvalidStageTransitionError);
  });
});

describe('QA step: the tester decides', () => {
  const inQa = () => task({ stage: 'in_qa' });

  it('passes the task on to approval, and tells the developer and the approver', async () => {
    const { repo, notify, run, flush } = setup(inQa());
    await run(QA, 'requested');
    expect(repo.moveStage.mock.calls[0][1].target_stage).toBe('requested');
    await flush();
    const kinds = [...notify.execute.mock.calls, ...notify.executeMany.mock.calls].flatMap((c) => (Array.isArray(c[0]) ? c[0] : [c[0]])).map((n: { kind: string }) => n.kind);
    expect(kinds).toEqual(expect.arrayContaining(['task_qa_passed', 'task_review_requested']));
  });

  it('sends it back to the developer only with a note, and passes the note on', async () => {
    const a = setup(inQa());
    await expect(a.run(QA, 'in_progress')).rejects.toBeInstanceOf(InvalidStageTransitionError);

    const b = setup(inQa());
    await b.run(QA, 'in_progress', { note: 'Search is empty on refresh' });
    expect(b.repo.moveStage.mock.calls[0][1]).toMatchObject({ target_stage: 'in_progress', note: 'Search is empty on refresh' });
    await b.flush();
    const sent = b.notify.executeMany.mock.calls.flatMap((c) => c[0]) as Array<{ recipient_id: number; kind: string; body: string }>;
    expect(sent).toEqual([expect.objectContaining({ recipient_id: DEV, kind: 'task_qa_failed' })]);
    expect(sent[0].body).toContain('Search is empty on refresh');
  });

  it('is for the tester and the Admin only: not the developer, not a stranger', async () => {
    await expect(setup(inQa()).run(DEV, 'requested')).rejects.toBeInstanceOf(TaskPermissionDeniedError);
    await expect(setup(inQa()).run(STRANGER, 'requested')).rejects.toBeInstanceOf(TaskPermissionDeniedError);
    await expect(setup(inQa()).run(ADMIN, 'requested')).resolves.toBeDefined();
  });

  it('cannot jump from QA to Done or to Hold', async () => {
    await expect(setup(inQa()).run(QA, 'completed')).rejects.toBeInstanceOf(InvalidStageTransitionError);
    await expect(setup(inQa()).run(QA, 'hold', { hold_reason: 'x' })).rejects.toBeInstanceOf(InvalidStageTransitionError);
  });
});
