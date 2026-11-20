/**
 * Time spent on a bug, Jira style: the sum of every stretch the bug sat in "In development" (dev) or "In QA" (qa).
 * A bug can go back to development after a failed QA, so each round counts, not just the first one.
 * The stretches come from the status history (each move has a timestamp); the stretch that is still open is
 * reported as `*_running_since` so the screen can keep counting up.
 */
export interface BugStatusMove {
  at: Date;
  to: string;
}

export interface BugTimes {
  dev_closed_seconds: number;
  qa_closed_seconds: number;
  dev_running_since: Date | null;
  qa_running_since: Date | null;
}

const DEV = 'dev_in_progress';
const QA = 'qa_in_progress';

export function computeBugTimes(moves: BugStatusMove[]): BugTimes {
  const sorted = [...moves].sort((a, b) => a.at.getTime() - b.at.getTime());
  let devClosed = 0;
  let qaClosed = 0;
  let current: string | null = null;
  let since: Date | null = null;

  for (const m of sorted) {
    if (m.to === current) continue; // a repeated status is not a move
    if (current && since) {
      const secs = Math.max(0, Math.round((m.at.getTime() - since.getTime()) / 1000));
      if (current === DEV) devClosed += secs;
      else if (current === QA) qaClosed += secs;
    }
    current = m.to;
    since = m.at;
  }

  return {
    dev_closed_seconds: devClosed,
    qa_closed_seconds: qaClosed,
    dev_running_since: current === DEV ? since : null,
    qa_running_since: current === QA ? since : null,
  };
}

/** Total seconds as of `now`, counting the open stretch. */
export function totalBugSeconds(t: BugTimes, now: Date): number {
  const running = (s: Date | null) => (s ? Math.max(0, Math.round((now.getTime() - s.getTime()) / 1000)) : 0);
  return t.dev_closed_seconds + t.qa_closed_seconds + running(t.dev_running_since) + running(t.qa_running_since);
}
