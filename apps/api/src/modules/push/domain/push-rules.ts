/** The rules around a desktop notification: where it may be sent, what it says and where a click leads. */

export interface PushPayload {
  title: string;
  body: string;
  /** A page of the web app to open on a click, e.g. "/attendance?tab=regularization" */
  url: string;
  /** Messages with the same tag replace each other instead of piling up */
  tag?: string;
}

/**
 * The browser tells us where to send its notifications (the "endpoint"). The server then calls that address, so it
 * must only be the push service of a real browser, never an address inside our own network.
 */
const PUSH_SERVICE_HOSTS = [
  /(^|\.)googleapis\.com$/i, // Chrome, Edge (new), Brave, Opera: fcm.googleapis.com
  /(^|\.)push\.services\.mozilla\.com$/i, // Firefox
  /(^|\.)push\.apple\.com$/i, // Safari
  /(^|\.)notify\.windows\.com$/i, // older Edge
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && u.port === '' && u.username === '' && PUSH_SERVICE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Keeps a notification short enough to be read at a glance (and far below the size a push can carry). */
export function toPayload(p: PushPayload): PushPayload {
  return { title: clip(p.title.trim(), 80), body: clip(p.body.replace(/\s+/g, ' ').trim(), 180), url: p.url.startsWith('/') ? p.url : '/', ...(p.tag ? { tag: p.tag } : {}) };
}

// Notifications that ask the reader to act on someone else's request open the approver's view, not their own list
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

/**
 * Where a click on a notification leads: the item it is about. The same places as the bell and the pop-up inside the
 * app, so a person lands on the same page whichever way they open it.
 * Keep in sync with `notificationPath` in apps/web/src/features/notifications/notification-link.ts.
 */
export function notificationLink(kind: string, entityId?: number | null, entityType?: string | null): string {
  const type = (entityType ?? '').toUpperCase();
  const id = entityId ?? null;
  const withId = (path: string) => (id ? `${path}/${id}` : path);

  if (kind.startsWith('attendance_regularization') || type === 'REGULARIZATION') {
    return kind === 'attendance_regularization_requested' && id ? `/attendance?tab=regularization&request=${id}` : '/attendance?tab=regularization';
  }
  if (kind.startsWith('task_') || type === 'TASK') return id ? `/my-tasks?task=${id}` : '/my-tasks';
  if (kind.startsWith('bug_') || type === 'BUG') return id ? `/my-tasks?tab=bugs&bug=${id}` : '/my-tasks?tab=bugs';
  if (kind.startsWith('project_') || type === 'PROJECT') return withId('/projects');
  if (kind.startsWith('calendar_') || type === 'CALENDAR_EVENT') return '/calendar';
  if (kind.startsWith('follow_up') || kind === 'lead_assigned' || type === 'FOLLOW_UP') return '/sales/follow-ups';
  if (kind === 'client_converted' || type === 'LEAD') return withId('/sales/leads');
  if (kind.startsWith('leave_') || type === 'LEAVE_REQUEST') return LEAVE_APPROVER_KINDS.has(kind) ? '/leave?tab=management' : '/leave';
  if (kind.startsWith('expense_') || type === 'EXPENSE_CLAIM') return EXPENSE_APPROVER_KINDS.has(kind) ? '/expense?tab=claims' : '/expense';
  if (kind.startsWith('complaint_') || type.startsWith('COMPLAINT')) return COMPLAINT_HANDLER_KINDS.has(kind) ? '/complaints?tab=manage' : '/complaints';
  if (kind.startsWith('perf_') || type.startsWith('PERF_')) return '/performance';
  if (kind.startsWith('license_') || type === 'SOFTWARE_LICENSE') return kind.startsWith('license_seat_') || !id ? '/licenses?tab=my' : `/licenses/${id}`;
  if (type === 'KB_ARTICLE' || type === 'KB_ARTICLE_VERSION') return id && type === 'KB_ARTICLE' ? `/knowledge-base/articles/${id}` : '/knowledge-base';
  if (type === 'CANDIDATE') return withId('/recruitment');
  if (kind === 'payroll_calculated') return '/admin/payroll';
  return '/';
}

/** What a chat message looks like in a notification: the text, or the name of the file that was sent. */
export function messagePreview(m: { kind: string; body?: string | null; file_name?: string | null }): string {
  if (m.kind === 'file') return `Sent a file${m.file_name ? `: ${m.file_name}` : ''}`;
  return (m.body ?? '').trim() || 'Sent a message';
}
