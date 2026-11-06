/**
 * Is a project ready to be delivered? Like closing a release in Jira: every sprint is finished, every issue
 * is Done and no bug is left open. Time and overdue work are shown to the admin but do not block delivery.
 * Pure functions, so the rule can be tested without a database.
 */

export interface DeliveryCounts {
  openSprints: number;
  openIssues: number;
  openBugs: number;
  overdueIssues: number;
  estimatedMinutes: number;
  loggedSeconds: number;
}

export interface DeliveryCheck {
  key: 'sprints' | 'issues' | 'bugs';
  label: string;
  done: boolean;
  open: number;
  detail: string;
}

export interface DeliveryReadiness {
  ready: boolean;
  checks: DeliveryCheck[];
  /** One sentence per thing that is still open. */
  blockers: string[];
  counts: DeliveryCounts;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function evaluateDelivery(counts: DeliveryCounts): DeliveryReadiness {
  const checks: DeliveryCheck[] = [
    {
      key: 'sprints',
      label: 'All sprints are completed',
      done: counts.openSprints === 0,
      open: counts.openSprints,
      detail: counts.openSprints === 0 ? 'No sprint is left open' : `${plural(counts.openSprints, 'sprint')} not completed yet`,
    },
    {
      key: 'issues',
      label: 'All issues are Done',
      done: counts.openIssues === 0,
      open: counts.openIssues,
      detail: counts.openIssues === 0 ? 'Every issue is approved' : `${plural(counts.openIssues, 'issue')} not Done yet`,
    },
    {
      key: 'bugs',
      label: 'No bug is left open',
      done: counts.openBugs === 0,
      open: counts.openBugs,
      detail: counts.openBugs === 0 ? 'Every bug is closed' : `${plural(counts.openBugs, 'bug')} still open`,
    },
  ];
  const blockers = checks.filter((c) => !c.done).map((c) => c.detail);
  return { ready: blockers.length === 0, checks, blockers, counts };
}

/** The sentence shown when someone tries to deliver a project that still has open work. */
export const deliveryBlockMessage = (blockers: string[]): string =>
  `This project cannot be delivered yet: ${blockers.join(', ')}. Finish the work, or an admin can deliver it anyway with a reason.`;
