/** The words of the regularization notifications (bell and the pop-up in the corner), kept in one place. */

export interface RegularizationFacts {
  requestId: string;
  employeeName: string;
  workDate: string; // YYYY-MM-DD
  requestType: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-14" -> "14 Nov 2026" */
export function longDate(workDate: string): string {
  const [y, m, d] = workDate.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export const regularizationMessages = {
  /** To the administrators: someone asked for a correction. */
  requested: (f: RegularizationFacts) => ({
    title: `Regularization request: ${f.employeeName}`,
    body: `${f.employeeName} has requested a correction (${f.requestType}) for ${longDate(f.workDate)}. Please review it.`,
  }),
  /** To the employee: an administrator raised it on their behalf. */
  raisedForYou: (by: string, f: RegularizationFacts) => ({
    title: 'A regularization was raised for you',
    body: `${by} raised a regularization (${f.requestType}) on your behalf for ${longDate(f.workDate)}.`,
  }),
  approved: (by: string, f: RegularizationFacts) => ({
    title: 'Regularization approved',
    body: `${by} approved your request ${f.requestId} for ${longDate(f.workDate)}. Your attendance has been updated.`,
  }),
  rejected: (by: string, f: RegularizationFacts, reason: string) => ({
    title: 'Regularization rejected',
    body: `${by} rejected your request ${f.requestId} for ${longDate(f.workDate)}. Reason: ${reason}`,
  }),
};
