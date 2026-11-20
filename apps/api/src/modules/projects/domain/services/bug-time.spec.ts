import { computeBugTimes, totalBugSeconds } from './bug-time';

const t = (m: number) => new Date(Date.UTC(2026, 10, 14, 10, 0, 0) + m * 60_000);

describe('computeBugTimes', () => {
  it('has no time before development starts', () => {
    const r = computeBugTimes([{ at: t(0), to: 'new' }, { at: t(5), to: 'open' }, { at: t(8), to: 'ready_for_dev' }]);
    expect(r).toMatchObject({ dev_closed_seconds: 0, qa_closed_seconds: 0, dev_running_since: null, qa_running_since: null });
  });

  it('keeps the open development stretch as running', () => {
    const r = computeBugTimes([{ at: t(0), to: 'new' }, { at: t(10), to: 'dev_in_progress' }]);
    expect(r.dev_closed_seconds).toBe(0);
    expect(r.dev_running_since).toEqual(t(10));
    expect(totalBugSeconds(r, t(25))).toBe(15 * 60);
  });

  it('adds development and QA stretches', () => {
    const r = computeBugTimes([
      { at: t(0), to: 'new' },
      { at: t(10), to: 'dev_in_progress' },
      { at: t(70), to: 'ready_for_qa' },
      { at: t(80), to: 'qa_in_progress' },
      { at: t(95), to: 'done' },
    ]);
    expect(r.dev_closed_seconds).toBe(60 * 60);
    expect(r.qa_closed_seconds).toBe(15 * 60);
    expect(r.dev_running_since).toBeNull();
    expect(r.qa_running_since).toBeNull();
  });

  it('counts every round when QA fails and the bug goes back to development', () => {
    const r = computeBugTimes([
      { at: t(0), to: 'dev_in_progress' },
      { at: t(30), to: 'ready_for_qa' },
      { at: t(40), to: 'qa_in_progress' },
      { at: t(50), to: 'ready_for_dev' },
      { at: t(60), to: 'dev_in_progress' },
    ]);
    expect(r.dev_closed_seconds).toBe(30 * 60); // first round
    expect(r.qa_closed_seconds).toBe(10 * 60);
    expect(r.dev_running_since).toEqual(t(60)); // second round still open
    expect(totalBugSeconds(r, t(75))).toBe((30 + 10 + 15) * 60);
  });

  it('ignores moves that arrive out of order and repeated statuses', () => {
    const r = computeBugTimes([
      { at: t(20), to: 'ready_for_qa' },
      { at: t(0), to: 'dev_in_progress' },
      { at: t(5), to: 'dev_in_progress' },
    ]);
    expect(r.dev_closed_seconds).toBe(20 * 60);
  });
});
