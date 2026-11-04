export const MESSENGER_LIMITS = {
  maxBodyLength: 4000,
  editWindowMinutes: 15,
  deleteForEveryoneWindowMinutes: 60,
  maxPinnedMessages: 10,
  maxPinnedConversations: 5,
  maxForwardMessages: 10,
  maxForwardTargets: 5,
  maxGroupMembers: 500,
  maxFileBytes: 25 * 1024 * 1024,
  pageSize: 50,
} as const;

export const BLOCKED_FILE_EXTENSIONS = ['exe', 'bat', 'cmd', 'msi', 'sh', 'ps1', 'vbs', 'jar', 'apk', 'dll'];

export type MuteDuration = '8h' | '1w' | 'always';
export type ManualStatus = 'auto' | 'available' | 'busy' | 'dnd';

export interface PersonView {
  emp_id: number;
  name: string;
  email: string;
  department: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface MemberView extends PersonView {
  is_admin: boolean;
  joined_at: Date;
}

export interface FileView {
  name: string;
  size: number;
  mime: string;
}

export interface ReactionView {
  emoji: string;
  count: number;
  emp_ids: number[];
  names: string[];
}

export interface ReplyView {
  message_id: number;
  sender_name: string | null;
  kind: string;
  body: string | null;
  file_name: string | null;
  deleted: boolean;
}

export interface MessageView {
  message_id: number;
  conversation_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_photo: string | null;
  kind: 'text' | 'file' | 'system';
  body: string | null;
  reply_to: ReplyView | null;
  is_forwarded: boolean;
  file: FileView | null;
  edited_at: Date | null;
  deleted: 'everyone' | 'admin' | null;
  created_at: Date;
  reactions: ReactionView[];
  starred: boolean;
  pinned: boolean;
}

export interface ConversationView {
  conversation_id: number;
  /** The id shown in the address bar. Never the database number. */
  public_id?: string;
  kind: 'direct' | 'group';
  name: string | null;
  description: string | null;
  only_admins_post: boolean;
  is_closed: boolean;
  created_at: Date;
  last_message_at: Date;
  member_count: number;
  my_is_admin: boolean;
  peer: PersonView | null;
  last_message: {
    message_id: number;
    kind: string;
    body: string | null;
    file_name: string | null;
    sender_id: number | null;
    sender_name: string | null;
    deleted: string | null;
    created_at: Date;
  } | null;
  unread_count: number;
  marked_unread: boolean;
  pinned_at: Date | null;
  muted_until: Date | null;
  is_archived: boolean;
  /** Highest message id every other member has read / received. Drives the tick marks. */
  read_upto: number;
  delivered_upto: number;
}

export interface MessageInfoEntry {
  emp_id: number;
  name: string;
  read: boolean;
  delivered: boolean;
}

export type SearchMessage = MessageView & { conversation_name: string | null };

export interface SearchResults {
  messages: SearchMessage[];
  people: PersonView[];
  groups: Array<{ conversation_id: number; name: string; member_count: number }>;
}

export interface UserStateView {
  emp_id: number;
  online: boolean;
  /** Online, but the page has been idle for a while. */
  away?: boolean;
  status: ManualStatus;
  status_text: string | null;
  last_seen_at: Date | null;
}

export class MessengerError extends Error {
  constructor(
    public readonly code: 'not_found' | 'forbidden' | 'invalid' | 'conflict',
    message: string,
  ) {
    super(message);
  }
}
