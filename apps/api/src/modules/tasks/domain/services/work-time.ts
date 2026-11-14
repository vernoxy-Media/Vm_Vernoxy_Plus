/**
 * Time-tracking arithmetic for the work log of a task. Pure functions, so the rules are easy to test.
 *
 * A task keeps one log entry per action. "pause" and "finish" entries carry the exact seconds of the
 * session that just ended; that sum is the truth, and minutes are only ever derived from it.
 */

export interface WorkLogLike {
  employee_id?: number;
  employee_name?: string;
  action?: string;
  duration_seconds?: number | null;
}

const asLogs = (logs: unknown): WorkLogLike[] => (Array.isArray(logs) ? (logs as WorkLogLike[]) : []);

/** Exact seconds recorded in the log so far. */
export function loggedSeconds(logs: unknown): number {
  return asLogs(logs).reduce((n, l) => n + (typeof l?.duration_seconds === 'number' && l.duration_seconds > 0 ? l.duration_seconds : 0), 0);
}

/**
 * Whole minutes worked after adding a session of `addSeconds`. Uses the exact seconds of the log, not
 * a minute rounded up per session. Tasks that have minutes but no log (older data) start from those minutes.
 */
export function minutesAfter(logs: unknown, storedMinutes: number | null | undefined, addSeconds: number): number {
  const logged = loggedSeconds(logs);
  const base = logged > 0 ? logged : (storedMinutes || 0) * 60;
  return Math.max(0, Math.round((base + Math.max(0, addSeconds)) / 60));
}

/** The employee who started the timer that is running now, the one to credit for the session. */
export function timerRunner(logs: unknown): { id: number; name: string } | null {
  const list = asLogs(logs);
  for (let i = list.length - 1; i >= 0; i--) {
    const l = list[i];
    if ((l?.action === 'start' || l?.action === 'resume') && typeof l.employee_id === 'number') {
      return { id: l.employee_id, name: l.employee_name ?? '' };
    }
  }
  return null;
}

/** Note for a stop entry: says who actually pressed the button when it was not the person who started the timer. */
export function stoppedNote(note: string | null | undefined, runner: { id: number; name: string } | null, actor: { id: number; name: string }): string | null {
  const text = note?.trim() || null;
  if (runner && runner.id !== actor.id) return `Stopped by ${actor.name}${text ? ` — ${text}` : ''}`;
  return text;
}

export interface EmployeeTime {
  employee_id: number;
  employee_name: string;
  seconds: number;
}

/** Seconds each employee worked on a task, from the sessions that ended. */
export function timeByEmployee(logs: unknown): EmployeeTime[] {
  const map = new Map<number, EmployeeTime>();
  for (const l of asLogs(logs)) {
    if (typeof l?.employee_id !== 'number' || typeof l.duration_seconds !== 'number' || l.duration_seconds <= 0) continue;
    const row = map.get(l.employee_id) ?? { employee_id: l.employee_id, employee_name: l.employee_name ?? '', seconds: 0 };
    row.seconds += l.duration_seconds;
    map.set(l.employee_id, row);
  }
  return [...map.values()];
}
