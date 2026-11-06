import { deliveryBlockMessage, evaluateDelivery, DeliveryCounts } from './delivery';

const clean: DeliveryCounts = { openSprints: 0, openIssues: 0, openBugs: 0, overdueIssues: 0, estimatedMinutes: 600, loggedSeconds: 30_000 };

describe('evaluateDelivery', () => {
  it('is ready when every sprint is finished, every issue is Done and no bug is open', () => {
    const r = evaluateDelivery(clean);
    expect(r.ready).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(r.checks.every((c) => c.done)).toBe(true);
  });

  it('is not ready while a sprint is still open', () => {
    const r = evaluateDelivery({ ...clean, openSprints: 1 });
    expect(r.ready).toBe(false);
    expect(r.blockers).toEqual(['1 sprint not completed yet']);
  });

  it('lists every open thing, with the right singular and plural', () => {
    const r = evaluateDelivery({ ...clean, openSprints: 2, openIssues: 1, openBugs: 3 });
    expect(r.ready).toBe(false);
    expect(r.blockers).toEqual(['2 sprints not completed yet', '1 issue not Done yet', '3 bugs still open']);
  });

  it('does not let overdue work, or time over the estimate, block delivery by themselves', () => {
    expect(evaluateDelivery({ ...clean, overdueIssues: 4, loggedSeconds: 999_999 }).ready).toBe(true);
  });

  it('keeps the counts for the admin to read', () => {
    expect(evaluateDelivery({ ...clean, overdueIssues: 4 }).counts.overdueIssues).toBe(4);
  });
});

describe('deliveryBlockMessage', () => {
  it('names what is open and says an admin can still deliver with a reason', () => {
    const m = deliveryBlockMessage(['1 issue not Done yet', '2 bugs still open']);
    expect(m).toContain('1 issue not Done yet, 2 bugs still open');
    expect(m).toContain('with a reason');
  });
});
