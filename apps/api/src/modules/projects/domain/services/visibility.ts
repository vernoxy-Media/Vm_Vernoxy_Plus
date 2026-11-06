/**
 * Who sees and who works on what inside a project, the way a Jira project role scheme does it.
 *
 *  - Admin (a role marked is_admin) and the project's manager see everything in the project.
 *  - Every other member sees only the work that is theirs: the tasks and sub-tasks assigned to them,
 *    the bugs assigned to or reported by them, and the discussion and activity about those.
 *
 * Pure functions, so every rule can be tested without a database.
 */

export interface Viewer {
  empId: number;
  isAdmin: boolean;
  isPM: boolean;
}

/** Admin and the project's manager are not limited to their own work. */
export const seesEverything = (v: Viewer): boolean => v.isAdmin || v.isPM;

export interface BugRef {
  assigned_to: number;
  reported_by: number;
}

/** A member sees a bug when it is assigned to them or they reported it. */
export const canSeeBug = (v: Viewer, bug: BugRef): boolean =>
  seesEverything(v) || Number(bug.assigned_to) === v.empId || Number(bug.reported_by) === v.empId;

/**
 * Who moves a bug out of a given status:
 *  - New / Open (triage) is the manager's call;
 *  - Ready for dev / In dev is the developer's work, so the person the bug is assigned to;
 *  - Ready for QA / In QA is the tester's work, so the person who reported it.
 * Admin and the project's manager can move a bug from any status.
 */
export const canMoveBug = (v: Viewer, bug: BugRef, from: string): boolean => {
  if (seesEverything(v)) return true;
  if (from === 'ready_for_dev' || from === 'dev_in_progress') return Number(bug.assigned_to) === v.empId;
  if (from === 'ready_for_qa' || from === 'qa_in_progress') return Number(bug.reported_by) === v.empId;
  return false;
};

/** The [TSK-2026-0016] a task comment starts with, or null for a plain team message. */
export const taskKeyOfMessage = (message: string): string | null => /^\[([A-Z]{2,5}-[\w-]+)\]\s/.exec(message)?.[1] ?? null;

/**
 * Team messages are for everyone in the project. A comment on a task is for the people who can see that task,
 * and always for whoever wrote it.
 */
export const canSeeDiscussionMessage = (v: Viewer, msg: { message: string; sender_emp_id: number }, myTaskCodes: ReadonlySet<string>): boolean => {
  if (seesEverything(v) || Number(msg.sender_emp_id) === v.empId) return true;
  const key = taskKeyOfMessage(msg.message);
  return key === null || myTaskCodes.has(key);
};

/** Activity a member sees: what they did themselves, or what happened to their own tasks and bugs. */
export const canSeeActivity = (v: Viewer, log: { actor_emp_id?: number | null; description?: string | null }, myCodes: readonly string[]): boolean => {
  if (seesEverything(v) || Number(log.actor_emp_id) === v.empId) return true;
  const text = log.description ?? '';
  return myCodes.some((code) => text.includes(code));
};
