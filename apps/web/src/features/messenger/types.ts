export interface Person {
  emp_id: number;
  name: string;
  email: string;
  department: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface Member extends Person {
  is_admin: boolean;
  joined_at: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  emp_ids: number[];
  names: string[];
}

export interface ReplyPreview {
  message_id: number;
  sender_name: string | null;
  kind: string;
  body: string | null;
  file_name: string | null;
  deleted: boolean;
}

export interface Message {
  message_id: number;
  conversation_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_photo: string | null;
  kind: 'text' | 'file' | 'system';
  body: string | null;
  reply_to: ReplyPreview | null;
  is_forwarded: boolean;
  file: { name: string; size: number; mime: string } | null;
  edited_at: string | null;
  deleted: 'everyone' | 'admin' | null;
  created_at: string;
  reactions: Reaction[];
  starred: boolean;
  pinned: boolean;
  conversation_name?: string | null;
  /** Client-only: a message that has not reached the server yet. */
  pending?: 'sending' | 'failed';
  temp_id?: string;
}

export interface Conversation {
  conversation_id: number;
  /** What the address bar shows (opaque), not the database number. */
  public_id: string;
  kind: 'direct' | 'group';
  name: string | null;
  description: string | null;
  only_admins_post: boolean;
  is_closed: boolean;
  created_at: string;
  last_message_at: string;
  member_count: number;
  my_is_admin: boolean;
  peer: Person | null;
  last_message: {
    message_id: number;
    kind: string;
    body: string | null;
    file_name: string | null;
    sender_id: number | null;
    sender_name: string | null;
    deleted: string | null;
    created_at: string;
  } | null;
  unread_count: number;
  marked_unread: boolean;
  pinned_at: string | null;
  muted_until: string | null;
  is_archived: boolean;
  read_upto: number;
  delivered_upto: number;
}

export interface ConversationDetail extends Conversation {
  members: Member[];
  pinned_messages: Message[];
}

export interface PresenceState {
  emp_id: number;
  online: boolean;
  /** Online, but the page has been idle for about 10 minutes. */
  away?: boolean;
  status: 'auto' | 'available' | 'busy' | 'dnd';
  status_text: string | null;
  last_seen_at: string | null;
}

export interface SearchResults {
  messages: Message[];
  people: Person[];
  groups: Array<{ conversation_id: number; name: string; member_count: number }>;
}

export interface MessageInfoEntry {
  emp_id: number;
  name: string;
  read: boolean;
  delivered: boolean;
}

export const EDIT_WINDOW_MINUTES = 15;
export const DELETE_WINDOW_MINUTES = 60;
export const MAX_BODY = 4000;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'msi', 'sh', 'ps1', 'vbs', 'jar', 'apk', 'dll'];
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
