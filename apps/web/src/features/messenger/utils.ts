import type { Conversation, Message, PresenceState } from './types';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

export const formatTime = (iso: string | Date) => timeFmt.format(new Date(iso));

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (iso: string | Date) => Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);

export function dayLabel(iso: string | Date): string {
  const n = daysAgo(iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return weekdayFmt.format(new Date(iso));
  return dateFmt.format(new Date(iso));
}

/** Time for today, "Yesterday", weekday or date in the conversation list. */
export function listTime(iso: string | Date): string {
  const n = daysAgo(iso);
  if (n === 0) return formatTime(iso);
  return dayLabel(iso);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isMuted(c: Pick<Conversation, 'muted_until'>): boolean {
  return !!c.muted_until && new Date(c.muted_until).getTime() > Date.now();
}

export function conversationTitle(c: Conversation): string {
  return c.kind === 'direct' ? (c.peer?.name ?? 'Unknown') + (c.peer && !c.peer.is_active ? ' (Inactive)' : '') : (c.name ?? 'Group');
}

export function messagePreview(m: { kind: string; body: string | null; file_name?: string | null; deleted?: string | null }): string {
  if (m.deleted === 'admin') return 'Removed by group admin';
  if (m.deleted) return 'This message was deleted';
  if (m.kind === 'file') return `📎 ${m.body?.trim() || m.file_name || 'File'}`;
  return m.body ?? '';
}

export function isImage(mime: string) {
  return mime.startsWith('image/');
}

export type Presence = 'online' | 'away' | 'busy' | 'dnd' | 'offline';

export function presenceOf(p: PresenceState | undefined): Presence {
  if (!p || !p.online) return 'offline';
  if (p.status === 'busy') return 'busy';
  if (p.status === 'dnd') return 'dnd';
  if (p.away) return 'away';
  return 'online';
}

export function presenceLabel(p: PresenceState | undefined): string {
  if (!p) return '';
  if (p.online) {
    if (p.status === 'busy') return 'Busy';
    if (p.status === 'dnd') return 'Do not disturb';
    if (p.away) return 'Away';
    return 'Online';
  }
  if (!p.last_seen_at) return 'Offline';
  const n = daysAgo(p.last_seen_at);
  if (n === 0) return `Last seen today at ${formatTime(p.last_seen_at)}`;
  if (n === 1) return `Last seen yesterday at ${formatTime(p.last_seen_at)}`;
  return `Last seen ${dateFmt.format(new Date(p.last_seen_at))}`;
}

export const presenceDot: Record<Presence, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-400',
  busy: 'bg-red-500',
  dnd: 'bg-red-600',
  offline: 'bg-slate-300',
};

export function withinMinutes(iso: string, minutes: number) {
  return Date.now() - new Date(iso).getTime() <= minutes * 60_000;
}

export function groupByDay(messages: Message[]): Array<{ day: string; items: Message[] }> {
  const out: Array<{ day: string; items: Message[] }> = [];
  for (const m of messages) {
    const day = dayLabel(m.created_at);
    const last = out[out.length - 1];
    if (last && last.day === day) last.items.push(m);
    else out.push({ day, items: [m] });
  }
  return out;
}

/** Stable colour for a sender's name in group chats. */
const NAME_COLOURS = ['text-indigo-700', 'text-sky-700', 'text-violet-700', 'text-rose-700', 'text-amber-700', 'text-teal-700', 'text-indigo-700', 'text-fuchsia-700'];
export const nameColour = (id: number | null) => NAME_COLOURS[Math.abs(id ?? 0) % NAME_COLOURS.length];

/** Splits text into plain, link and @mention parts for rendering. */
export function tokenize(text: string): Array<{ type: 'text' | 'link' | 'mention'; value: string }> {
  const out: Array<{ type: 'text' | 'link' | 'mention'; value: string }> = [];
  const re = /(https?:\/\/[^\s<]+)|(@[\w.]+(?: [A-Z][\w.]*)?)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: m[1] ? 'link' : 'mention', value: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}
