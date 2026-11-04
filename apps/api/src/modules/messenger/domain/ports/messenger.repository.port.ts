import type {
  ConversationView,
  ManualStatus,
  MemberView,
  MessageInfoEntry,
  MessageView,
  PersonView,
  SearchMessage,
  UserStateView,
} from '../messenger.types';

export const MESSENGER_REPOSITORY = Symbol('MESSENGER_REPOSITORY');

export interface NewMessage {
  conversationId: number;
  senderId: number | null;
  kind: 'text' | 'file' | 'system';
  body?: string | null;
  replyToId?: number | null;
  isForwarded?: boolean;
  file?: { name: string; path: string; size: number; mime: string } | null;
}

export interface MemberPrefs {
  pinned?: boolean;
  mutedUntil?: Date | null;
  archived?: boolean;
  markedUnread?: boolean;
}

export interface MemberRow {
  emp_id: number;
  is_admin: boolean;
  joined_at: Date;
  last_read_message_id: number;
}

/** What every write needs to know about a conversation, from one light query. */
export interface ConversationContext {
  kind: 'direct' | 'group';
  only_admins_post: boolean;
  is_closed: boolean;
  my_is_admin: boolean;
  /** For one-to-one chats: whether the other person is still active. */
  peer_active: boolean | null;
  member_ids: number[];
}

export interface RawMessage {
  message_id: number;
  conversation_id: number;
  sender_id: number | null;
  kind: string;
  body: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

export interface MessengerRepositoryPort {
  // Directory
  searchPeople(query: string, selfId: number, limit: number): Promise<PersonView[]>;
  getPeople(empIds: number[]): Promise<PersonView[]>;

  // Conversations
  findDirectConversation(directKey: string): Promise<number | null>;
  createConversation(input: {
    kind: 'direct' | 'group';
    directKey?: string;
    name?: string;
    description?: string;
    createdBy: number;
    memberIds: number[];
    adminIds: number[];
  }): Promise<number>;
  groupNameTaken(createdBy: number, name: string): Promise<boolean>;
  listConversations(empId: number): Promise<ConversationView[]>;
  getConversation(empId: number, conversationId: number): Promise<ConversationView | null>;
  getMembers(conversationId: number): Promise<MemberView[]>;
  getMemberRow(conversationId: number, empId: number): Promise<MemberRow | null>;
  /** Null when the person is not an active member. */
  getContext(empId: number, conversationId: number): Promise<ConversationContext | null>;
  memberIds(conversationId: number): Promise<number[]>;
  receiptsFor(conversationId: number, viewerId: number): Promise<{ read_upto: number; delivered_upto: number } | null>;
  updateConversation(
    conversationId: number,
    patch: { name?: string; description?: string | null; onlyAdminsPost?: boolean; isClosed?: boolean },
  ): Promise<void>;
  addMember(conversationId: number, empId: number): Promise<void>;
  removeMember(conversationId: number, empId: number): Promise<void>;
  setAdmin(conversationId: number, empId: number, isAdmin: boolean): Promise<void>;
  countAdmins(conversationId: number): Promise<number>;
  oldestMember(conversationId: number, excludeEmpId: number): Promise<number | null>;
  setMemberPrefs(conversationId: number, empId: number, prefs: MemberPrefs): Promise<void>;
  countPinnedConversations(empId: number): Promise<number>;
  conversationIdsOf(empId: number): Promise<number[]>;

  // Messages
  insertMessage(input: NewMessage): Promise<number>;
  getMessage(empId: number, messageId: number): Promise<MessageView | null>;
  getMessageRaw(messageId: number): Promise<RawMessage | null>;
  listMessages(
    empId: number,
    conversationId: number,
    opts: { before?: number; limit: number; query?: string; onlyFiles?: boolean },
  ): Promise<MessageView[]>;
  editMessage(messageId: number, body: string, actorId: number): Promise<void>;
  deleteForEveryone(messageId: number, actorId: number, mode: 'everyone' | 'admin'): Promise<void>;
  deleteForMe(messageId: number, empId: number): Promise<void>;
  toggleReaction(messageId: number, empId: number, emoji: string): Promise<void>;
  toggleStar(messageId: number, empId: number): Promise<boolean>;
  listStarred(empId: number): Promise<SearchMessage[]>;
  togglePin(conversationId: number, messageId: number, empId: number): Promise<boolean>;
  countPinnedMessages(conversationId: number): Promise<number>;
  listPinned(empId: number, conversationId: number): Promise<MessageView[]>;
  messageInfo(messageId: number): Promise<MessageInfoEntry[]>;
  searchEverywhere(empId: number, query: string, limit: number): Promise<SearchMessage[]>;
  searchGroups(empId: number, query: string, limit: number): Promise<Array<{ conversation_id: number; name: string; member_count: number }>>;

  // Receipts
  /** Null when the person is not an active member. */
  markRead(conversationId: number, empId: number): Promise<number | null>;
  markDeliveredAll(empId: number): Promise<number[]>;
  markDeliveredFor(conversationId: number, empIds: number[]): Promise<void>;
  receipts(conversationId: number): Promise<{ read_upto: number; delivered_upto: number }>;
  totalUnread(empId: number): Promise<number>;

  /** People who are no longer active employees but are still in a group. */
  findInactiveGroupMembers(): Promise<Array<{ conversation_id: number; emp_id: number; name: string; is_admin: boolean }>>;

  // Presence
  getUserStates(empIds: number[]): Promise<Array<Omit<UserStateView, 'online'>>>;
  setUserStatus(empId: number, status: ManualStatus, text: string | null, until: Date | null): Promise<void>;
  touchLastSeen(empId: number): Promise<void>;
}
