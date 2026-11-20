/**
 * Where a click on a notification leads. The bell list and the pop-up toast both use this, so a person lands on the
 * same page whichever way they open a notification.
 *
 * Keep in sync with `notificationLink` in apps/api/src/modules/push/domain/push-rules.ts (the desktop push click).
 */

export interface NotificationTarget {
  kind?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
}

// Notifications that ask the reader to act on someone else's request open the approver's view, not their own list.
const LEAVE_APPROVER_KINDS = new Set(['leave_submitted', 'leave_cancellation_requested', 'leave_review', 'leave_withdrawn']);
const EXPENSE_APPROVER_KINDS = new Set([
  'expense_claim_submitted',
  'expense_claim_withdrawn',
  'expense_approval_reminder',
  'expense_approval_overdue',
  'expense_weekly_summary',
]);
const COMPLAINT_HANDLER_KINDS = new Set([
  'complaint_assigned',
  'complaint_received',
  'complaint_overdue',
  'complaint_overdue_daily',
  'complaint_review_reminder',
  'complaint_handler_inactive',
]);

const withId = (path: string, id: number | null | undefined) => (id ? `${path}/${id}` : path);

/** The app page for a notification, or null when there is no page to open for it (it is then only marked read). */
export function notificationPath(n: NotificationTarget): string | null {
  const kind = n.kind ?? '';
  const type = (n.entity_type ?? '').toUpperCase();
  const id = n.entity_id ?? null;

  if (kind.startsWith('attendance_regularization') || type === 'REGULARIZATION') {
    return kind === 'attendance_regularization_requested' && id
      ? `/attendance?tab=regularization&request=${id}`
      : '/attendance?tab=regularization';
  }
  // My Tasks opens the task itself (an Admin's in Task management)
  if (kind.startsWith('task_') || type === 'TASK') return id ? `/my-tasks?task=${id}` : '/my-tasks';
  // My bugs finds the bug's project and opens the bug there
  if (kind.startsWith('bug_') || type === 'BUG') return id ? `/my-tasks?tab=bugs&bug=${id}` : '/my-tasks?tab=bugs';
  if (kind.startsWith('project_') || type === 'PROJECT') return withId('/projects', id);
  if (kind.startsWith('calendar_') || type === 'CALENDAR_EVENT') return '/calendar';
  if (kind.startsWith('follow_up') || kind === 'lead_assigned' || type === 'FOLLOW_UP') return '/sales/follow-ups';
  if (kind === 'client_converted' || type === 'LEAD') return withId('/sales/leads', id);

  if (kind.startsWith('leave_') || type === 'LEAVE_REQUEST') {
    return LEAVE_APPROVER_KINDS.has(kind) ? '/leave?tab=management' : '/leave';
  }
  if (kind.startsWith('expense_') || type === 'EXPENSE_CLAIM') {
    return EXPENSE_APPROVER_KINDS.has(kind) ? '/expense?tab=claims' : '/expense';
  }
  if (kind.startsWith('complaint_') || type.startsWith('COMPLAINT')) {
    return COMPLAINT_HANDLER_KINDS.has(kind) ? '/complaints?tab=manage' : '/complaints';
  }
  if (kind.startsWith('perf_') || type.startsWith('PERF_')) return '/performance';
  if (kind.startsWith('license_') || type === 'SOFTWARE_LICENSE') {
    return kind.startsWith('license_seat_') || !id ? '/licenses?tab=my' : `/licenses/${id}`;
  }
  if (type === 'KB_ARTICLE' || type === 'KB_ARTICLE_VERSION') return id && type === 'KB_ARTICLE' ? `/knowledge-base/articles/${id}` : '/knowledge-base';
  if (type === 'CANDIDATE') return withId('/recruitment', id);
  // Run by the Admin; an employee has no salary slip page yet, so that notification only marks itself read
  if (kind === 'payroll_calculated') return '/admin/payroll';

  return null;
}
