import { AddSubTaskUseCase } from './add-sub-task.use-case';
import { AssigneeValidationError, TaskCompletedLockedError, TaskNotFoundError } from '../../domain/errors/task.errors';

const parent = (over: Record<string, unknown> = {}) =>
  ({
    task_id: 10,
    task_code: 'TSK-2026-0010',
    title: 'Parent',
    stage: 'assigned',
    priority: 'medium',
    parent_task_id: null,
    has_sub_tasks: false,
    sub_tasks_count: 0,
    actual_minutes: 0,
    is_timer_running: false,
    ...over,
  }) as any;

function build(found: any) {
  const repo: any = {
    findById: jest.fn().mockResolvedValue(found),
    getTaskTypeCode: jest.fn().mockResolvedValue('dev'),
    addSubTask: jest.fn().mockImplementation(async (_id: number, input: any) => ({
      parent: { task_id: 10, task_code: 'TSK-2026-0010' },
      sub_task: { task_id: 11, task_code: 'TSK-2026-0010-01', title: input.title, assignees: [] },
    })),
  };
  const directory: any = { validateActiveEmployees: jest.fn().mockResolvedValue(true) };
  const notify: any = { executeMany: jest.fn().mockResolvedValue(undefined) };
  return { repo, directory, notify, useCase: new AddSubTaskUseCase(repo, directory, notify) };
}

const valid = { parentTaskId: 10, title: '  Build the form  ', allocated_minutes: 60, assignee_ids: [5, 6], actor_emp_id: 5 };

describe('AddSubTaskUseCase', () => {
  it('adds a sub-task, trims the name and notifies everyone except the person who added it', async () => {
    const { useCase, repo, notify } = build(parent());
    const res = await useCase.execute(valid);

    expect(repo.addSubTask).toHaveBeenCalledWith(10, expect.objectContaining({ title: 'Build the form', allocated_minutes: 60, assignee_ids: [5, 6], actor_emp_id: 5 }));
    expect(res.sub_task.task_code).toBe('TSK-2026-0010-01');
    const sent = notify.executeMany.mock.calls[0][0];
    expect(sent.map((n: any) => n.recipient_id)).toEqual([6]);
  });

  it('rejects a task that does not exist', async () => {
    const { useCase } = build(null);
    await expect(useCase.execute(valid)).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('rejects an approved task, which is locked', async () => {
    const { useCase } = build(parent({ stage: 'completed' }));
    await expect(useCase.execute(valid)).rejects.toBeInstanceOf(TaskCompletedLockedError);
  });

  it('does not allow a sub-task of a sub-task', async () => {
    const { useCase } = build(parent({ parent_task_id: 3 }));
    await expect(useCase.execute(valid)).rejects.toThrow('cannot have sub-tasks of its own');
  });

  it('does not split a task that already has worked time and no sub-tasks', async () => {
    const { useCase, repo } = build(parent({ stage: 'in_progress', actual_minutes: 25 }));
    await expect(useCase.execute(valid)).rejects.toThrow('Work has already started');
    expect(repo.addSubTask).not.toHaveBeenCalled();
  });

  it('still allows another sub-task once the task is already split, even while it is in progress', async () => {
    const { useCase, repo } = build(parent({ stage: 'in_progress', has_sub_tasks: true, sub_tasks_count: 2, actual_minutes: 90 }));
    await useCase.execute(valid);
    expect(repo.addSubTask).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a missing name', { title: '   ' }, 'Task Name'],
    ['zero time', { allocated_minutes: 0 }, 'Allocated Time'],
    ['no employee', { assignee_ids: [] }, 'Assigned To'],
  ])('rejects %s', async (_label, patch, message) => {
    const { useCase, repo } = build(parent());
    await expect(useCase.execute({ ...valid, ...patch })).rejects.toThrow(message);
    expect(repo.addSubTask).not.toHaveBeenCalled();
  });

  it('keeps the due date of the sub-task, and refuses a date that does not exist', async () => {
    const { useCase, repo } = build(parent());
    await useCase.execute({ ...valid, due_date: '2026-11-20' });
    expect(repo.addSubTask).toHaveBeenCalledWith(10, expect.objectContaining({ due_date: '2026-11-20' }));

    await expect(useCase.execute({ ...valid, due_date: '2026-02-30' })).rejects.toThrow('valid Due Date');
    expect(repo.addSubTask).toHaveBeenCalledTimes(1);
  });

  it('keeps the start date and refuses a start date after the due date', async () => {
    const { useCase, repo } = build(parent());
    await useCase.execute({ ...valid, start_date: '2026-11-10', due_date: '2026-11-20' });
    expect(repo.addSubTask).toHaveBeenCalledWith(10, expect.objectContaining({ start_date: '2026-11-10', due_date: '2026-11-20' }));

    await expect(useCase.execute({ ...valid, start_date: '2026-11-21', due_date: '2026-11-20' })).rejects.toThrow('Start date cannot be after');
    expect(repo.addSubTask).toHaveBeenCalledTimes(1);
  });

  it('rejects an inactive employee', async () => {
    const { useCase, directory } = build(parent());
    directory.validateActiveEmployees.mockResolvedValue(false);
    await expect(useCase.execute(valid)).rejects.toBeInstanceOf(AssigneeValidationError);
  });

  it('asks for the text when the task type is "Others"', async () => {
    const { useCase, repo } = build(parent());
    repo.getTaskTypeCode.mockResolvedValue('other');
    await expect(useCase.execute({ ...valid, task_type_id: 9 })).rejects.toThrow('Other Task Type');
    await useCase.execute({ ...valid, task_type_id: 9, other_task_type: ' Research ' });
    expect(repo.addSubTask).toHaveBeenCalledWith(10, expect.objectContaining({ task_type_id: 9, other_task_type: 'Research' }));
  });
});
