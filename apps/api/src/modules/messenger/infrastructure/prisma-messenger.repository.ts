import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { FileStoragePort, STORAGE_TOKENS } from '../../storage/public-api';
import type {
  ConversationContext,
  MemberPrefs,
  MemberRow,
  MessengerRepositoryPort,
  NewMessage,
  RawMessage,
} from '../domain/ports/messenger.repository.port';
import type {
  ConversationView,
  ManualStatus,
  MemberView,
  MessageInfoEntry,
  MessageView,
  PersonView,
  SearchMessage,
  UserStateView,
} from '../domain/messenger.types';

type Row = Record<string, any>;

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

@Injectable()
export class PrismaMessengerRepository implements MessengerRepositoryPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(STORAGE_TOKENS.FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  private photo(key: string | null | undefined): string | null {
    return key ? this.storage.getSignedUrlIfExists(key) : null;
  }

  private person(r: Row): PersonView {
    return {
      emp_id: r.emp_id,
      name: r.name,
      email: r.email,
      department: r.department ?? null,
      photo_url: this.photo(r.profile_picture),
      is_active: r.status === 'Active',
    };
  }

  // ---------------------------------------------------------------- Directory

  async searchPeople(query: string, selfId: number, limit: number): Promise<PersonView[]> {
    const q = query.trim();
    const pattern = likePattern(q);
    const asId = /^\d+$/.test(q) ? Number(q) : -1;
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT e.emp_id, e.name, e.email, e.profile_picture, e.status::text AS status, d.name AS department
      FROM employees e LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE e.deleted_at IS NULL AND e.status = 'Active' AND e.emp_id <> ${selfId}
        AND (${q === ''} OR e.name ILIKE ${pattern} OR e.email ILIKE ${pattern} OR d.name ILIKE ${pattern} OR e.emp_id = ${asId})
      ORDER BY e.name LIMIT ${limit}`;
    return rows.map((r) => this.person(r));
  }

  async getPeople(empIds: number[]): Promise<PersonView[]> {
    if (!empIds.length) return [];
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT e.emp_id, e.name, e.email, e.profile_picture, e.status::text AS status, d.name AS department
      FROM employees e LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE e.deleted_at IS NULL AND e.emp_id IN (${Prisma.join(empIds)})`;
    return rows.map((r) => this.person(r));
  }

  // ------------------------------------------------------------ Conversations

  async findDirectConversation(directKey: string): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT conversation_id::int AS id FROM msg_conversation WHERE direct_key = ${directKey}`;
    return rows[0]?.id ?? null;
  }

  async createConversation(input: {
    kind: 'direct' | 'group';
    directKey?: string;
    name?: string;
    description?: string;
    createdBy: number;
    memberIds: number[];
    adminIds: number[];
  }): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Row[]>`
        INSERT INTO msg_conversation (kind, direct_key, name, description, created_by)
        VALUES (${input.kind}, ${input.directKey ?? null}, ${input.name ?? null}, ${input.description ?? null}, ${input.createdBy})
        RETURNING conversation_id::int AS id`;
      const id: number = rows[0].id;
      for (const empId of input.memberIds) {
        await tx.$executeRaw`
          INSERT INTO msg_member (conversation_id, emp_id, is_admin)
          VALUES (${id}, ${empId}, ${input.adminIds.includes(empId)})`;
      }
      return id;
    });
  }

  async groupNameTaken(createdBy: number, name: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT 1 FROM msg_conversation
      WHERE kind = 'group' AND created_by = ${createdBy} AND is_closed = false AND lower(name) = lower(${name}) LIMIT 1`;
    return rows.length > 0;
  }

  private conversationSelect(empId: number, where: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`
      SELECT c.conversation_id::int AS conversation_id, c.kind, c.name, c.description, c.only_admins_post, c.is_closed,
        c.created_at, c.last_message_at,
        (SELECT count(*)::int FROM msg_member x WHERE x.conversation_id = c.conversation_id AND x.left_at IS NULL) AS member_count,
        me.is_admin AS my_is_admin, me.marked_unread, me.pinned_at, me.muted_until, me.is_archived,
        peer.emp_id AS peer_id, peer.name AS peer_name, peer.email AS peer_email, peer.profile_picture AS peer_picture,
        peer.status::text AS peer_status, peer_dep.name AS peer_department,
        lm.message_id::int AS lm_id, lm.kind AS lm_kind, lm.body AS lm_body, lm.file_name AS lm_file, lm.sender_id AS lm_sender_id,
        lms.name AS lm_sender_name, lm.deleted_mode AS lm_deleted, lm.created_at AS lm_created_at,
        (SELECT count(*)::int FROM msg_message um
          WHERE um.conversation_id = c.conversation_id AND um.message_id > me.last_read_message_id
            AND um.sender_id IS DISTINCT FROM ${empId} AND um.kind <> 'system' AND um.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM msg_hidden h WHERE h.message_id = um.message_id AND h.emp_id = ${empId})) AS unread_count,
        (SELECT COALESCE(min(o.last_read_message_id), 0)::int FROM msg_member o
          WHERE o.conversation_id = c.conversation_id AND o.emp_id <> ${empId} AND o.left_at IS NULL) AS read_upto,
        (SELECT COALESCE(min(o.last_delivered_message_id), 0)::int FROM msg_member o
          WHERE o.conversation_id = c.conversation_id AND o.emp_id <> ${empId} AND o.left_at IS NULL) AS delivered_upto
      FROM msg_conversation c
      JOIN msg_member me ON me.conversation_id = c.conversation_id AND me.emp_id = ${empId} AND me.left_at IS NULL
      LEFT JOIN LATERAL (
        SELECT pm.emp_id FROM msg_member pm
        WHERE c.kind = 'direct' AND pm.conversation_id = c.conversation_id AND pm.emp_id <> ${empId} LIMIT 1
      ) pm ON true
      LEFT JOIN employees peer ON peer.emp_id = pm.emp_id
      LEFT JOIN departments peer_dep ON peer_dep.dep_id = peer.dep_id
      LEFT JOIN LATERAL (
        SELECT m.message_id, m.kind, m.body, m.file_name, m.sender_id, m.deleted_mode, m.created_at
        FROM msg_message m
        WHERE m.conversation_id = c.conversation_id
          AND NOT EXISTS (SELECT 1 FROM msg_hidden h WHERE h.message_id = m.message_id AND h.emp_id = ${empId})
        ORDER BY m.message_id DESC LIMIT 1
      ) lm ON true
      LEFT JOIN employees lms ON lms.emp_id = lm.sender_id
      ${where}`;
  }

  private conversation(r: Row): ConversationView {
    return {
      conversation_id: r.conversation_id,
      kind: r.kind,
      name: r.name,
      description: r.description,
      only_admins_post: r.only_admins_post,
      is_closed: r.is_closed,
      created_at: r.created_at,
      last_message_at: r.last_message_at,
      member_count: r.member_count,
      my_is_admin: r.my_is_admin,
      peer: r.peer_id
        ? this.person({
            emp_id: r.peer_id,
            name: r.peer_name,
            email: r.peer_email,
            profile_picture: r.peer_picture,
            status: r.peer_status,
            department: r.peer_department,
          })
        : null,
      last_message: r.lm_id
        ? {
            message_id: r.lm_id,
            kind: r.lm_kind,
            body: r.lm_deleted ? null : r.lm_body,
            file_name: r.lm_deleted ? null : r.lm_file,
            sender_id: r.lm_sender_id,
            sender_name: r.lm_sender_name,
            deleted: r.lm_deleted,
            created_at: r.lm_created_at,
          }
        : null,
      unread_count: r.unread_count,
      marked_unread: r.marked_unread,
      pinned_at: r.pinned_at,
      muted_until: r.muted_until,
      is_archived: r.is_archived,
      read_upto: r.read_upto,
      delivered_upto: r.delivered_upto,
    };
  }

  async listConversations(empId: number): Promise<ConversationView[]> {
    const rows = await this.prisma.$queryRaw<Row[]>(
      this.conversationSelect(empId, Prisma.sql`ORDER BY c.last_message_at DESC`),
    );
    return rows.map((r) => this.conversation(r));
  }

  async getConversation(empId: number, conversationId: number): Promise<ConversationView | null> {
    const rows = await this.prisma.$queryRaw<Row[]>(
      this.conversationSelect(empId, Prisma.sql`WHERE c.conversation_id = ${conversationId}`),
    );
    return rows[0] ? this.conversation(rows[0]) : null;
  }

  async getMembers(conversationId: number): Promise<MemberView[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT e.emp_id, e.name, e.email, e.profile_picture, e.status::text AS status, d.name AS department,
        mm.is_admin, mm.joined_at
      FROM msg_member mm
      JOIN employees e ON e.emp_id = mm.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE mm.conversation_id = ${conversationId} AND mm.left_at IS NULL
      ORDER BY mm.is_admin DESC, e.name`;
    return rows.map((r) => ({ ...this.person(r), is_admin: r.is_admin, joined_at: r.joined_at }));
  }

  async getMemberRow(conversationId: number, empId: number): Promise<MemberRow | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT emp_id, is_admin, joined_at, last_read_message_id::int AS last_read_message_id
      FROM msg_member WHERE conversation_id = ${conversationId} AND emp_id = ${empId} AND left_at IS NULL`;
    return (rows[0] as MemberRow | undefined) ?? null;
  }

  async getContext(empId: number, conversationId: number): Promise<ConversationContext | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT c.kind, c.only_admins_post, c.is_closed, me.is_admin AS my_is_admin,
        (SELECT bool_and(e.status = 'Active') FROM msg_member pm JOIN employees e ON e.emp_id = pm.emp_id
          WHERE c.kind = 'direct' AND pm.conversation_id = c.conversation_id AND pm.emp_id <> ${empId} AND pm.left_at IS NULL) AS peer_active,
        COALESCE((SELECT array_agg(x.emp_id) FROM msg_member x WHERE x.conversation_id = c.conversation_id AND x.left_at IS NULL), '{}') AS member_ids
      FROM msg_conversation c
      JOIN msg_member me ON me.conversation_id = c.conversation_id AND me.emp_id = ${empId} AND me.left_at IS NULL
      WHERE c.conversation_id = ${conversationId}`;
    return (rows[0] as ConversationContext | undefined) ?? null;
  }

  async memberIds(conversationId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT emp_id FROM msg_member WHERE conversation_id = ${conversationId} AND left_at IS NULL`;
    return rows.map((r) => r.emp_id);
  }

  async receiptsFor(conversationId: number, viewerId: number) {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT COALESCE(min(o.last_read_message_id), 0)::int AS read_upto, COALESCE(min(o.last_delivered_message_id), 0)::int AS delivered_upto,
        bool_or(o.emp_id = ${viewerId}) AS is_member
      FROM msg_member o WHERE o.conversation_id = ${conversationId} AND o.left_at IS NULL AND o.emp_id <> ${viewerId}
        AND EXISTS (SELECT 1 FROM msg_member me WHERE me.conversation_id = ${conversationId} AND me.emp_id = ${viewerId} AND me.left_at IS NULL)`;
    const r = rows[0];
    return r ? { read_upto: r.read_upto, delivered_upto: r.delivered_upto } : null;
  }

  async updateConversation(
    conversationId: number,
    patch: { name?: string; description?: string | null; onlyAdminsPost?: boolean; isClosed?: boolean },
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE msg_conversation SET
        name = COALESCE(${patch.name ?? null}, name),
        description = CASE WHEN ${patch.description !== undefined} THEN ${patch.description ?? null} ELSE description END,
        only_admins_post = COALESCE(${patch.onlyAdminsPost ?? null}, only_admins_post),
        is_closed = COALESCE(${patch.isClosed ?? null}, is_closed)
      WHERE conversation_id = ${conversationId}`;
  }

  async addMember(conversationId: number, empId: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO msg_member (conversation_id, emp_id)
      VALUES (${conversationId}, ${empId})
      ON CONFLICT (conversation_id, emp_id) DO UPDATE
        SET left_at = NULL, is_admin = false, joined_at = clock_timestamp(), is_archived = false`;
  }

  async removeMember(conversationId: number, empId: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE msg_member SET left_at = clock_timestamp(), is_admin = false, pinned_at = NULL
      WHERE conversation_id = ${conversationId} AND emp_id = ${empId} AND left_at IS NULL`;
  }

  async setAdmin(conversationId: number, empId: number, isAdmin: boolean): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE msg_member SET is_admin = ${isAdmin}
      WHERE conversation_id = ${conversationId} AND emp_id = ${empId} AND left_at IS NULL`;
  }

  async countAdmins(conversationId: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT count(*)::int AS n FROM msg_member WHERE conversation_id = ${conversationId} AND is_admin AND left_at IS NULL`;
    return rows[0].n;
  }

  async oldestMember(conversationId: number, excludeEmpId: number): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT mm.emp_id FROM msg_member mm JOIN employees e ON e.emp_id = mm.emp_id
      WHERE mm.conversation_id = ${conversationId} AND mm.left_at IS NULL AND mm.emp_id <> ${excludeEmpId} AND e.status = 'Active'
      ORDER BY mm.joined_at LIMIT 1`;
    return rows[0]?.emp_id ?? null;
  }

  async setMemberPrefs(conversationId: number, empId: number, prefs: MemberPrefs): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE msg_member SET
        pinned_at = CASE WHEN ${prefs.pinned === undefined} THEN pinned_at WHEN ${prefs.pinned === true} THEN clock_timestamp() ELSE NULL END,
        muted_until = CASE WHEN ${prefs.mutedUntil === undefined} THEN muted_until ELSE ${prefs.mutedUntil ?? null}::timestamptz END,
        is_archived = COALESCE(${prefs.archived ?? null}, is_archived),
        marked_unread = COALESCE(${prefs.markedUnread ?? null}, marked_unread)
      WHERE conversation_id = ${conversationId} AND emp_id = ${empId} AND left_at IS NULL`;
  }

  async countPinnedConversations(empId: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT count(*)::int AS n FROM msg_member WHERE emp_id = ${empId} AND pinned_at IS NOT NULL AND left_at IS NULL`;
    return rows[0].n;
  }

  async conversationIdsOf(empId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT conversation_id::int AS id FROM msg_member WHERE emp_id = ${empId} AND left_at IS NULL`;
    return rows.map((r) => r.id);
  }

  // ----------------------------------------------------------------- Messages

  async insertMessage(input: NewMessage): Promise<number> {
    // One statement (one round trip): the message, the conversation's activity time, the sender's own read marks,
    // and archived chats coming back for everyone else.
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH ins AS (
        INSERT INTO msg_message (conversation_id, sender_id, kind, body, reply_to_id, is_forwarded, file_name, file_path, file_size, mime_type)
        VALUES (${input.conversationId}, ${input.senderId}, ${input.kind}, ${input.body ?? null}, ${input.replyToId ?? null},
          ${input.isForwarded ?? false}, ${input.file?.name ?? null}, ${input.file?.path ?? null}, ${input.file?.size ?? null}, ${input.file?.mime ?? null})
        RETURNING message_id
      ), touch AS (
        UPDATE msg_conversation SET last_message_at = clock_timestamp() WHERE conversation_id = ${input.conversationId} RETURNING 1
      ), sender AS (
        UPDATE msg_member SET last_read_message_id = (SELECT message_id FROM ins), last_delivered_message_id = (SELECT message_id FROM ins), marked_unread = false
        WHERE conversation_id = ${input.conversationId} AND emp_id = ${input.senderId} RETURNING 1
      ), others AS (
        UPDATE msg_member SET is_archived = false
        WHERE conversation_id = ${input.conversationId} AND emp_id IS DISTINCT FROM ${input.senderId} AND is_archived RETURNING 1
      )
      SELECT message_id::int AS id FROM ins`;
    return rows[0].id;
  }

  private messageSelect(viewer: number): Prisma.Sql {
    return Prisma.sql`
      SELECT m.message_id::int AS message_id, m.conversation_id::int AS conversation_id, m.sender_id,
        s.name AS sender_name, s.profile_picture AS sender_picture, m.kind,
        CASE WHEN m.deleted_at IS NULL THEN m.body END AS body,
        m.is_forwarded,
        CASE WHEN m.deleted_at IS NULL THEN m.file_name END AS file_name,
        CASE WHEN m.deleted_at IS NULL THEN m.file_size END::float8 AS file_size,
        CASE WHEN m.deleted_at IS NULL THEN m.mime_type END AS mime_type,
        m.edited_at, m.deleted_mode, m.created_at, c.name AS conversation_name,
        rm.message_id::int AS reply_id, rs.name AS reply_sender,  rm.kind AS reply_kind,
        CASE WHEN rm.deleted_at IS NULL THEN rm.body END AS reply_body,
        CASE WHEN rm.deleted_at IS NULL THEN rm.file_name END AS reply_file,
        (rm.deleted_at IS NOT NULL) AS reply_deleted,
        CASE WHEN m.deleted_at IS NULL THEN COALESCE((
          SELECT json_agg(x) FROM (
            SELECT re.emoji, count(*)::int AS count, json_agg(re.emp_id ORDER BY re.created_at) AS emp_ids,
              json_agg(e.name ORDER BY re.created_at) AS names
            FROM msg_reaction re JOIN employees e ON e.emp_id = re.emp_id
            WHERE re.message_id = m.message_id GROUP BY re.emoji ORDER BY min(re.created_at)) x
        ), '[]'::json) ELSE '[]'::json END AS reactions,
        EXISTS (SELECT 1 FROM msg_star st WHERE st.message_id = m.message_id AND st.emp_id = ${viewer}) AS starred,
        EXISTS (SELECT 1 FROM msg_pin p WHERE p.message_id = m.message_id) AS pinned
      FROM msg_message m
      JOIN msg_conversation c ON c.conversation_id = m.conversation_id
      LEFT JOIN employees s ON s.emp_id = m.sender_id
      LEFT JOIN msg_message rm ON rm.message_id = m.reply_to_id
      LEFT JOIN employees rs ON rs.emp_id = rm.sender_id`;
  }

  private message(r: Row): SearchMessage {
    return {
      message_id: r.message_id,
      conversation_id: r.conversation_id,
      sender_id: r.sender_id,
      sender_name: r.sender_name,
      sender_photo: this.photo(r.sender_picture),
      kind: r.kind,
      body: r.body,
      reply_to: r.reply_id
        ? {
            message_id: r.reply_id,
            sender_name: r.reply_sender,
            kind: r.reply_kind,
            body: r.reply_body,
            file_name: r.reply_file,
            deleted: r.reply_deleted,
          }
        : null,
      is_forwarded: r.is_forwarded,
      file: r.file_name ? { name: r.file_name, size: Number(r.file_size ?? 0), mime: r.mime_type ?? '' } : null,
      edited_at: r.edited_at,
      deleted: r.deleted_mode,
      created_at: r.created_at,
      reactions: r.reactions ?? [],
      starred: r.starred,
      pinned: r.pinned,
      conversation_name: r.conversation_name,
    };
  }

  private notHidden(viewer: number): Prisma.Sql {
    return Prisma.sql`NOT EXISTS (SELECT 1 FROM msg_hidden h WHERE h.message_id = m.message_id AND h.emp_id = ${viewer})`;
  }

  async getMessage(empId: number, messageId: number): Promise<MessageView | null> {
    const rows = await this.prisma.$queryRaw<Row[]>(
      Prisma.sql`${this.messageSelect(empId)} WHERE m.message_id = ${messageId}`,
    );
    return rows[0] ? this.message(rows[0]) : null;
  }

  async getMessageRaw(messageId: number): Promise<RawMessage | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT message_id::int AS message_id, conversation_id::int AS conversation_id, sender_id, kind, body,
        file_name, file_path, file_size::float8 AS file_size, mime_type, created_at, deleted_at
      FROM msg_message WHERE message_id = ${messageId}`;
    return (rows[0] as RawMessage | undefined) ?? null;
  }

  async listMessages(
    empId: number,
    conversationId: number,
    opts: { before?: number; limit: number; query?: string; onlyFiles?: boolean },
  ): Promise<MessageView[]> {
    const filters: Prisma.Sql[] = [
      Prisma.sql`m.conversation_id = ${conversationId}`,
      this.notHidden(empId),
    ];
    if (opts.before) filters.push(Prisma.sql`m.message_id < ${opts.before}`);
    if (opts.onlyFiles) filters.push(Prisma.sql`m.kind = 'file' AND m.deleted_at IS NULL`);
    if (opts.query) {
      const p = likePattern(opts.query);
      filters.push(Prisma.sql`m.deleted_at IS NULL AND (m.body ILIKE ${p} OR m.file_name ILIKE ${p})`);
    }
    const rows = await this.prisma.$queryRaw<Row[]>(
      Prisma.sql`${this.messageSelect(empId)} WHERE ${Prisma.join(filters, ' AND ')}
        ORDER BY m.message_id DESC LIMIT ${opts.limit}`,
    );
    // Newest first from the database; the chat reads oldest to newest.
    return rows.map((r) => this.message(r)).reverse();
  }

  async editMessage(messageId: number, body: string, actorId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO msg_message_audit (message_id, action, old_body, actor_id)
        SELECT message_id, 'edit', body, ${actorId} FROM msg_message WHERE message_id = ${messageId}`;
      await tx.$executeRaw`UPDATE msg_message SET body = ${body}, edited_at = clock_timestamp() WHERE message_id = ${messageId}`;
    });
  }

  async deleteForEveryone(messageId: number, actorId: number, mode: 'everyone' | 'admin'): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO msg_message_audit (message_id, action, old_body, actor_id)
        SELECT message_id, 'delete', body, ${actorId} FROM msg_message WHERE message_id = ${messageId}`;
      await tx.$executeRaw`
        UPDATE msg_message SET deleted_at = clock_timestamp(), deleted_by = ${actorId}, deleted_mode = ${mode}
        WHERE message_id = ${messageId}`;
      await tx.$executeRaw`DELETE FROM msg_pin WHERE message_id = ${messageId}`;
      await tx.$executeRaw`DELETE FROM msg_star WHERE message_id = ${messageId}`;
    });
  }

  async deleteForMe(messageId: number, empId: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO msg_hidden (message_id, emp_id) VALUES (${messageId}, ${empId}) ON CONFLICT DO NOTHING`;
  }

  async toggleReaction(messageId: number, empId: number, emoji: string): Promise<void> {
    const removed = await this.prisma.$executeRaw`
      DELETE FROM msg_reaction WHERE message_id = ${messageId} AND emp_id = ${empId} AND emoji = ${emoji}`;
    if (removed === 0) {
      await this.prisma.$executeRaw`INSERT INTO msg_reaction (message_id, emp_id, emoji) VALUES (${messageId}, ${empId}, ${emoji})`;
    }
  }

  async toggleStar(messageId: number, empId: number): Promise<boolean> {
    const removed = await this.prisma.$executeRaw`DELETE FROM msg_star WHERE message_id = ${messageId} AND emp_id = ${empId}`;
    if (removed > 0) return false;
    await this.prisma.$executeRaw`INSERT INTO msg_star (emp_id, message_id) VALUES (${empId}, ${messageId})`;
    return true;
  }

  async listStarred(empId: number): Promise<SearchMessage[]> {
    const rows = await this.prisma.$queryRaw<Row[]>(
      Prisma.sql`${this.messageSelect(empId)}
        JOIN msg_star ss ON ss.message_id = m.message_id AND ss.emp_id = ${empId}
        JOIN msg_member sm ON sm.conversation_id = m.conversation_id AND sm.emp_id = ${empId} AND sm.left_at IS NULL
        WHERE m.deleted_at IS NULL AND ${this.notHidden(empId)}
        ORDER BY ss.created_at DESC LIMIT 200`,
    );
    return rows.map((r) => this.message(r));
  }

  async togglePin(conversationId: number, messageId: number, empId: number): Promise<boolean> {
    const removed = await this.prisma.$executeRaw`
      DELETE FROM msg_pin WHERE conversation_id = ${conversationId} AND message_id = ${messageId}`;
    if (removed > 0) return false;
    await this.prisma.$executeRaw`
      INSERT INTO msg_pin (conversation_id, message_id, pinned_by) VALUES (${conversationId}, ${messageId}, ${empId})`;
    return true;
  }

  async countPinnedMessages(conversationId: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<Row[]>`SELECT count(*)::int AS n FROM msg_pin WHERE conversation_id = ${conversationId}`;
    return rows[0].n;
  }

  async listPinned(empId: number, conversationId: number): Promise<MessageView[]> {
    const rows = await this.prisma.$queryRaw<Row[]>(
      Prisma.sql`${this.messageSelect(empId)}
        JOIN msg_pin pp ON pp.message_id = m.message_id
        WHERE m.conversation_id = ${conversationId} AND m.deleted_at IS NULL AND ${this.notHidden(empId)}
        ORDER BY pp.pinned_at DESC`,
    );
    return rows.map((r) => this.message(r));
  }

  async messageInfo(messageId: number): Promise<MessageInfoEntry[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT mm.emp_id, e.name,
        (mm.last_read_message_id >= m.message_id) AS read,
        (mm.last_delivered_message_id >= m.message_id) AS delivered
      FROM msg_message m
      JOIN msg_member mm ON mm.conversation_id = m.conversation_id AND mm.left_at IS NULL AND mm.emp_id IS DISTINCT FROM m.sender_id
      JOIN employees e ON e.emp_id = mm.emp_id
      WHERE m.message_id = ${messageId}
      ORDER BY e.name`;
    return rows as MessageInfoEntry[];
  }

  async searchEverywhere(empId: number, query: string, limit: number): Promise<SearchMessage[]> {
    const p = likePattern(query);
    const rows = await this.prisma.$queryRaw<Row[]>(
      Prisma.sql`${this.messageSelect(empId)}
        JOIN msg_member sm ON sm.conversation_id = m.conversation_id AND sm.emp_id = ${empId} AND sm.left_at IS NULL
        WHERE m.deleted_at IS NULL AND m.kind <> 'system' AND ${this.notHidden(empId)}
          AND (m.body ILIKE ${p} OR m.file_name ILIKE ${p})
        ORDER BY m.message_id DESC LIMIT ${limit}`,
    );
    return rows.map((r) => this.message(r));
  }

  async searchGroups(empId: number, query: string, limit: number) {
    const p = likePattern(query);
    return this.prisma.$queryRaw<Array<{ conversation_id: number; name: string; member_count: number }>>`
      SELECT c.conversation_id::int AS conversation_id, c.name,
        (SELECT count(*)::int FROM msg_member x WHERE x.conversation_id = c.conversation_id AND x.left_at IS NULL) AS member_count
      FROM msg_conversation c
      JOIN msg_member me ON me.conversation_id = c.conversation_id AND me.emp_id = ${empId} AND me.left_at IS NULL
      WHERE c.kind = 'group' AND c.name ILIKE ${p} ORDER BY c.name LIMIT ${limit}`;
  }

  // ----------------------------------------------------------------- Receipts

  async markRead(conversationId: number, empId: number): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      UPDATE msg_member SET
        last_read_message_id = GREATEST(last_read_message_id, COALESCE((SELECT max(message_id) FROM msg_message WHERE conversation_id = ${conversationId}), 0)),
        last_delivered_message_id = GREATEST(last_delivered_message_id, COALESCE((SELECT max(message_id) FROM msg_message WHERE conversation_id = ${conversationId}), 0)),
        marked_unread = false
      WHERE conversation_id = ${conversationId} AND emp_id = ${empId} AND left_at IS NULL
      RETURNING last_read_message_id::int AS id`;
    return rows[0]?.id ?? null;
  }

  async markDeliveredAll(empId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      UPDATE msg_member mm SET last_delivered_message_id = t.max_id
      FROM (
        SELECT m.conversation_id, max(m.message_id) AS max_id FROM msg_message m
        JOIN msg_member x ON x.conversation_id = m.conversation_id AND x.emp_id = ${empId} AND x.left_at IS NULL
        GROUP BY m.conversation_id
      ) t
      WHERE mm.conversation_id = t.conversation_id AND mm.emp_id = ${empId} AND mm.left_at IS NULL
        AND mm.last_delivered_message_id < t.max_id
      RETURNING mm.conversation_id::int AS id`;
    return rows.map((r) => r.id);
  }

  async markDeliveredFor(conversationId: number, empIds: number[]): Promise<void> {
    if (!empIds.length) return;
    await this.prisma.$executeRaw`
      UPDATE msg_member SET last_delivered_message_id = GREATEST(last_delivered_message_id,
        COALESCE((SELECT max(message_id) FROM msg_message WHERE conversation_id = ${conversationId}), 0))
      WHERE conversation_id = ${conversationId} AND emp_id IN (${Prisma.join(empIds)}) AND left_at IS NULL`;
  }

  async receipts(conversationId: number): Promise<{ read_upto: number; delivered_upto: number }> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT COALESCE(min(last_read_message_id), 0)::int AS read_upto, COALESCE(min(last_delivered_message_id), 0)::int AS delivered_upto
      FROM msg_member WHERE conversation_id = ${conversationId} AND left_at IS NULL`;
    return rows[0] as { read_upto: number; delivered_upto: number };
  }

  async totalUnread(empId: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT (
        SELECT count(*)::int FROM msg_message um
        JOIN msg_member me ON me.conversation_id = um.conversation_id AND me.emp_id = ${empId} AND me.left_at IS NULL
        WHERE um.message_id > me.last_read_message_id AND um.sender_id IS DISTINCT FROM ${empId}
          AND um.kind <> 'system' AND um.deleted_at IS NULL
          AND (me.muted_until IS NULL OR me.muted_until < now())
          AND NOT EXISTS (SELECT 1 FROM msg_hidden h WHERE h.message_id = um.message_id AND h.emp_id = ${empId})
      ) AS n`;
    return rows[0].n;
  }

  async findInactiveGroupMembers() {
    return this.prisma.$queryRaw<Array<{ conversation_id: number; emp_id: number; name: string; is_admin: boolean }>>`
      SELECT mm.conversation_id::int AS conversation_id, mm.emp_id, e.name, mm.is_admin
      FROM msg_member mm
      JOIN msg_conversation c ON c.conversation_id = mm.conversation_id AND c.kind = 'group'
      JOIN employees e ON e.emp_id = mm.emp_id
      WHERE mm.left_at IS NULL AND e.status = 'Inactive'
      ORDER BY mm.conversation_id`;
  }

  // ----------------------------------------------------------------- Presence

  async getUserStates(empIds: number[]): Promise<Array<Omit<UserStateView, 'online'>>> {
    if (!empIds.length) return [];
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT emp_id, CASE WHEN status_until IS NOT NULL AND status_until < now() THEN 'auto' ELSE status END AS status,
        CASE WHEN status_until IS NOT NULL AND status_until < now() THEN NULL ELSE status_text END AS status_text, last_seen_at
      FROM msg_user_state WHERE emp_id IN (${Prisma.join(empIds)})`;
    const found = new Map<number, Row>(rows.map((r) => [r.emp_id, r]));
    return empIds.map((id) => {
      const r = found.get(id);
      return {
        emp_id: id,
        status: (r?.status ?? 'auto') as ManualStatus,
        status_text: r?.status_text ?? null,
        last_seen_at: r?.last_seen_at ?? null,
      };
    });
  }

  async setUserStatus(empId: number, status: ManualStatus, text: string | null, until: Date | null): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO msg_user_state (emp_id, status, status_text, status_until) VALUES (${empId}, ${status}, ${text}, ${until})
      ON CONFLICT (emp_id) DO UPDATE SET status = EXCLUDED.status, status_text = EXCLUDED.status_text, status_until = EXCLUDED.status_until`;
  }

  async touchLastSeen(empId: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO msg_user_state (emp_id, last_seen_at) VALUES (${empId}, clock_timestamp())
      ON CONFLICT (emp_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`;
  }
}
