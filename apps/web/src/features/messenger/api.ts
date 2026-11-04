import { customFetch, getAccessToken } from '@vernoxy-pulse/api-client';
import type {
  Conversation,
  ConversationDetail,
  Message,
  MessageInfoEntry,
  Person,
  PresenceState,
  SearchResults,
} from './types';

const base = '/api/v1/messenger';
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });

export type MuteChoice = '8h' | '1w' | 'always' | null;

export const messengerApi = {
  directory: (q: string) => customFetch<Person[]>(`${base}/directory?q=${encodeURIComponent(q)}`),
  conversations: () => customFetch<Conversation[]>(`${base}/conversations`),
  /** An address-bar id (or an old numeric link) to the conversation, if this person is in it. */
  resolve: (ref: string) => customFetch<Conversation>(`${base}/resolve/${encodeURIComponent(ref)}`),
  conversation: (id: number) => customFetch<ConversationDetail>(`${base}/conversations/${id}`),
  openDirect: (peerId: number) => customFetch<Conversation>(`${base}/conversations/direct`, json({ peer_id: peerId })),
  createGroup: (input: { name: string; description?: string; member_ids: number[] }) =>
    customFetch<Conversation>(`${base}/conversations/group`, json(input)),
  updateGroup: (id: number, input: { name?: string; description?: string; only_admins_post?: boolean }) =>
    customFetch<void>(`${base}/conversations/${id}`, patch(input)),
  setPrefs: (
    id: number,
    prefs: { pinned?: boolean; mute?: MuteChoice; archived?: boolean; marked_unread?: boolean },
  ) => customFetch<void>(`${base}/conversations/${id}/prefs`, patch(prefs)),
  addMembers: (id: number, memberIds: number[]) =>
    customFetch<void>(`${base}/conversations/${id}/members`, json({ member_ids: memberIds })),
  removeMember: (id: number, empId: number) =>
    customFetch<void>(`${base}/conversations/${id}/members/${empId}`, { method: 'DELETE' }),
  setAdmin: (id: number, empId: number, isAdmin: boolean) =>
    customFetch<void>(`${base}/conversations/${id}/members/${empId}/admin`, put({ is_admin: isAdmin })),
  leave: (id: number) => customFetch<void>(`${base}/conversations/${id}/leave`, { method: 'POST' }),
  close: (id: number) => customFetch<void>(`${base}/conversations/${id}/close`, { method: 'POST' }),
  markRead: (id: number) => customFetch<void>(`${base}/conversations/${id}/read`, { method: 'POST' }),
  receipts: (id: number) => customFetch<{ read_upto: number; delivered_upto: number }>(`${base}/conversations/${id}/receipts`),
  typing: (id: number) => customFetch<void>(`${base}/conversations/${id}/typing`, { method: 'POST' }),

  messages: (id: number, opts: { before?: number; q?: string; files?: boolean } = {}) => {
    const p = new URLSearchParams();
    if (opts.before) p.set('before', String(opts.before));
    if (opts.q) p.set('q', opts.q);
    if (opts.files) p.set('files', '1');
    return customFetch<{ messages: Message[]; has_more: boolean }>(`${base}/conversations/${id}/messages?${p}`);
  },
  send: (id: number, body: string, replyToId?: number) =>
    customFetch<Message>(`${base}/conversations/${id}/messages`, json({ body, reply_to_id: replyToId })),
  sendFile: (id: number, file: File, caption?: string, replyToId?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    if (replyToId) form.append('reply_to_id', String(replyToId));
    return customFetch<void>(`${base}/conversations/${id}/files`, { method: 'POST', body: form });
  },
  edit: (id: number, body: string) => customFetch<Message>(`${base}/messages/${id}`, patch({ body })),
  remove: (id: number, mode: 'me' | 'everyone') => customFetch<void>(`${base}/messages/${id}/delete`, json({ mode })),
  react: (id: number, emoji: string) => customFetch<void>(`${base}/messages/${id}/react`, json({ emoji })),
  star: (id: number) => customFetch<{ starred: boolean }>(`${base}/messages/${id}/star`, { method: 'POST' }),
  pin: (id: number) => customFetch<{ pinned: boolean }>(`${base}/messages/${id}/pin`, { method: 'POST' }),
  info: (id: number) => customFetch<MessageInfoEntry[]>(`${base}/messages/${id}/info`),
  forward: (messageIds: number[], conversationIds: number[], comment?: string) =>
    customFetch<void>(`${base}/forward`, json({ message_ids: messageIds, conversation_ids: conversationIds, comment })),

  starred: () => customFetch<Message[]>(`${base}/starred`),
  search: (q: string) => customFetch<SearchResults>(`${base}/search?q=${encodeURIComponent(q)}`),
  unread: () => customFetch<{ unread_count: number }>(`${base}/unread-count`),
  presence: (ids: number[]) => customFetch<PresenceState[]>(`${base}/presence?ids=${ids.join(',')}`),
  setStatus: (status: PresenceState['status'], text?: string, minutes?: number) =>
    customFetch<void>(`${base}/me/status`, put({ status, status_text: text, minutes })),
};

/** Fetches a private chat file with the user's token. Callers turn it into an object URL. */
export async function fetchMessageFile(messageId: number, download = false): Promise<Blob> {
  const res = await fetch(`${base}/messages/${messageId}/file${download ? '?download=1' : ''}`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'X-Requested-With': 'pulse-web' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('File not available');
  return res.blob();
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const m = (e as { message?: unknown })?.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  return fallback;
}
