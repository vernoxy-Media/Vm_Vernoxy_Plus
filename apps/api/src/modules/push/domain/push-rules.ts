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

/**
 * Where a click on a notification leads. The same places as the bell and the pop-up inside the app, so a person
 * lands on the same page whichever way they open it.
 */
export function notificationLink(kind: string, entityId?: number | null): string {
  if (kind === 'attendance_regularization_requested' && entityId) return `/attendance?tab=regularization&request=${entityId}`;
  if (kind.startsWith('attendance_regularization')) return '/attendance?tab=regularization';
  if (kind.startsWith('project_') && entityId) return `/projects/${entityId}`;
  if (kind.startsWith('task_') || kind.startsWith('bug_')) return '/my-tasks';
  if (kind.startsWith('calendar_')) return '/calendar';
  if (kind.startsWith('follow_up') || kind === 'lead_assigned') return '/sales/follow-ups';
  if (kind.startsWith('leave_')) return '/leave';
  if (kind.startsWith('expense_')) return '/expense';
  return '/';
}

/** What a chat message looks like in a notification: the text, or the name of the file that was sent. */
export function messagePreview(m: { kind: string; body?: string | null; file_name?: string | null }): string {
  if (m.kind === 'file') return `Sent a file${m.file_name ? `: ${m.file_name}` : ''}`;
  return (m.body ?? '').trim() || 'Sent a message';
}
