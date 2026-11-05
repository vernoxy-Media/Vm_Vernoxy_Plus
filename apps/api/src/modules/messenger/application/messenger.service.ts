import type { ConversationIdCodecPort } from '../domain/ports/conversation-id-codec.port';
import type { MessengerEventsPort } from '../domain/ports/messenger-events.port';
import type { ConversationContext, MessengerRepositoryPort } from '../domain/ports/messenger.repository.port';
import {
  BLOCKED_FILE_EXTENSIONS,
  ConversationView,
  ManualStatus,
  MESSENGER_LIMITS as L,
  MessageView,
  MessengerError,
  MuteDuration,
  SearchResults,
  UserStateView,
} from '../domain/messenger.types';

const minutesSince = (d: Date) => (Date.now() - new Date(d).getTime()) / 60000;

/** All Messenger rules live here; the controller only translates HTTP. */
export class MessengerService {
  constructor(
    private readonly repo: MessengerRepositoryPort,
    private readonly events: MessengerEventsPort,
    private readonly ids: ConversationIdCodecPort,
  ) {}

  private withPublicId<T extends ConversationView>(c: T): T {
    return { ...c, public_id: this.ids.encode(c.conversation_id) };
  }

  private lastSweep = 0;

  /**
   * People who were deactivated leave every group on their own (history stays for the others). If the last
   * admin goes, the longest-standing active member takes over. Cheap enough to run at most once a minute.
   */
  async sweepInactiveMembers(force = false): Promise<number> {
    if (!force && Date.now() - this.lastSweep < 60_000) return 0;
    this.lastSweep = Date.now();
    const gone = await this.repo.findInactiveGroupMembers();
    for (const g of gone) {
      const before = await this.memberIds(g.conversation_id);
      let note = `${g.name} was removed (no longer an employee)`;
      if (g.is_admin && (await this.repo.countAdmins(g.conversation_id)) <= 1) {
        const next = await this.repo.oldestMember(g.conversation_id, g.emp_id);
        if (next) {
          await this.repo.setAdmin(g.conversation_id, next, true);
          note += `. ${await this.nameOf(next)} is now a group admin`;
        }
      }
      await this.repo.removeMember(g.conversation_id, g.emp_id);
      await this.system(g.conversation_id, note);
      this.events.emitToUsers(before, 'msg:conversation', { conversation_id: g.conversation_id });
    }
    return gone.length;
  }

  /** Starts listening for people coming online and going offline. */
  start(): void {
    void this.sweepInactiveMembers(true).catch(() => undefined);
    this.events.onAwayChange((empId, away) => {
      this.events.emitToAllUsers('presence:update', { emp_id: empId, online: true, away });
    });
    this.events.onPresenceChange((empId, online) => {
      void this.handlePresence(empId, online).catch(() => undefined);
    });
  }

  private async handlePresence(empId: number, online: boolean) {
    if (online) {
      const convIds = await this.repo.markDeliveredAll(empId);
      for (const id of convIds) await this.pushReceipt(id);
      this.events.emitToAllUsers('presence:update', { emp_id: empId, online: true, away: false });
    } else {
      await this.repo.touchLastSeen(empId);
      this.events.emitToAllUsers('presence:update', { emp_id: empId, online: false, last_seen_at: new Date() });
    }
  }

  // ------------------------------------------------------------------ helpers

  private memberIds(conversationId: number): Promise<number[]> {
    return this.repo.memberIds(conversationId);
  }

  /** One light query: am I a member, what may I do here, who else is in it. */
  private async context(empId: number, conversationId: number): Promise<ConversationContext> {
    const ctx = await this.repo.getContext(empId, conversationId);
    if (!ctx) throw new MessengerError('not_found', 'Conversation not found.');
    return ctx;
  }

  private async mustBeMember(empId: number, conversationId: number): Promise<ConversationView> {
    const conv = await this.repo.getConversation(empId, conversationId);
    if (!conv) throw new MessengerError('not_found', 'Conversation not found.');
    return conv;
  }

  private assertCanPost(_empId: number, conv: ConversationContext) {
    if (conv.is_closed) throw new MessengerError('forbidden', 'This group is closed.');
    if (conv.kind === 'direct' && conv.peer_active === false) {
      throw new MessengerError('forbidden', 'You can no longer message this employee.');
    }
    if (conv.kind === 'group' && conv.only_admins_post && !conv.my_is_admin) {
      throw new MessengerError('forbidden', 'Only admins can send messages in this group.');
    }
  }

  private cleanBody(raw: string | undefined | null, required = true): string {
    const body = (raw ?? '').trim();
    if (!body && required) throw new MessengerError('invalid', 'Message cannot be empty.');
    if (body.length > L.maxBodyLength) throw new MessengerError('invalid', 'Message is too long (max 4,000 characters).');
    return body;
  }

  private async pushReceipt(conversationId: number) {
    const ids = await this.memberIds(conversationId);
    this.events.emitToUsers(ids, 'msg:receipt', { conversation_id: conversationId });
  }

  /** Stores a message, tells every member, and marks it delivered to whoever is online. */
  private async publish(
    conversationId: number,
    senderId: number | null,
    input: Parameters<MessengerRepositoryPort['insertMessage']>[0],
    knownMembers?: number[],
  ): Promise<MessageView> {
    const id = await this.repo.insertMessage(input);
    const [view, members] = await Promise.all([
      this.repo.getMessage(senderId ?? 0, id),
      knownMembers ?? this.memberIds(conversationId),
    ]);
    this.events.emitToUsers(members, 'msg:new', { message: { ...view!, starred: false } });
    // Delivery marks never hold up the sender's request.
    const online = members.filter((m) => m !== senderId && this.events.isOnline(m));
    if (online.length) {
      void this.repo
        .markDeliveredFor(conversationId, online)
        .then(() => this.events.emitToUsers(members, 'msg:receipt', { conversation_id: conversationId }))
        .catch(() => undefined);
    }
    return view!;
  }

  private async system(conversationId: number, text: string) {
    await this.publish(conversationId, null, { conversationId, senderId: null, kind: 'system', body: text });
  }

  private async nameOf(empId: number): Promise<string> {
    return (await this.repo.getPeople([empId]))[0]?.name ?? 'Someone';
  }

  // ---------------------------------------------------------------- Directory

  directory(empId: number, query: string) {
    return this.repo.searchPeople(query ?? '', empId, 30);
  }

  // ------------------------------------------------------------ Conversations

  /** The conversation behind an address-bar id (or, for old bookmarks, a plain number), if this person is in it. */
  async resolveConversation(empId: number, ref: string): Promise<ConversationView & { public_id: string }> {
    const id = /^\d+$/.test(ref) ? Number(ref) : this.ids.decode(ref);
    if (id === null) throw new MessengerError('not_found', 'Conversation not found.');
    return this.withPublicId(await this.mustBeMember(empId, id)) as ConversationView & { public_id: string };
  }

  listConversations(empId: number) {
    void this.sweepInactiveMembers().catch(() => undefined);
    return this.repo.listConversations(empId).then((list) => list.map((c) => this.withPublicId(c)));
  }

  async getConversation(empId: number, conversationId: number) {
    const [conv, members, pinned] = await Promise.all([
      this.mustBeMember(empId, conversationId),
      this.repo.getMembers(conversationId),
      this.repo.listPinned(empId, conversationId),
    ]);
    return { ...this.withPublicId(conv), members, pinned_messages: pinned };
  }

  async openDirect(empId: number, peerId: number): Promise<ConversationView> {
    if (peerId === empId) throw new MessengerError('invalid', 'You cannot message yourself.');
    const [peer] = await this.repo.getPeople([peerId]);
    if (!peer?.is_active) throw new MessengerError('invalid', 'This employee is not available on Messenger.');
    const key = `${Math.min(empId, peerId)}:${Math.max(empId, peerId)}`;
    let id = await this.repo.findDirectConversation(key);
    if (!id) {
      id = await this.repo.createConversation({
        kind: 'direct',
        directKey: key,
        createdBy: empId,
        memberIds: [empId, peerId],
        adminIds: [],
      });
    } else if (!(await this.repo.getMemberRow(id, empId))) {
      await this.repo.addMember(id, empId);
    }
    return this.withPublicId((await this.repo.getConversation(empId, id))!);
  }

  async createGroup(empId: number, input: { name: string; description?: string; member_ids: number[] }) {
    const name = (input.name ?? '').trim();
    if (!name) throw new MessengerError('invalid', 'Please enter a group name.');
    if (name.length < 3 || name.length > 60) throw new MessengerError('invalid', 'Group name must be 3 to 60 characters.');
    const description = (input.description ?? '').trim();
    if (description.length > 500) throw new MessengerError('invalid', 'Description cannot exceed 500 characters.');
    const others = [...new Set(input.member_ids ?? [])].filter((id) => id !== empId);
    if (!others.length) throw new MessengerError('invalid', 'Please add at least one member.');
    if (others.length + 1 > L.maxGroupMembers) throw new MessengerError('invalid', 'A group can have up to 500 members.');
    if (await this.repo.groupNameTaken(empId, name)) throw new MessengerError('conflict', 'You already have a group with this name.');
    const people = await this.repo.getPeople(others);
    const active = people.filter((p) => p.is_active).map((p) => p.emp_id);
    if (active.length !== others.length) throw new MessengerError('invalid', 'Some selected employees are not available on Messenger.');

    const id = await this.repo.createConversation({
      kind: 'group',
      name,
      description: description || undefined,
      createdBy: empId,
      memberIds: [empId, ...active],
      adminIds: [empId],
    });
    await this.system(id, `${await this.nameOf(empId)} created the group "${name}"`);
    return this.withPublicId((await this.repo.getConversation(empId, id))!);
  }

  private async mustBeGroupAdmin(empId: number, conversationId: number) {
    const conv = await this.mustBeMember(empId, conversationId);
    if (conv.kind !== 'group') throw new MessengerError('invalid', 'This is not a group.');
    if (!conv.my_is_admin) throw new MessengerError('forbidden', 'Only group admins can do this.');
    return conv;
  }

  private async refreshConversation(conversationId: number) {
    const ids = await this.memberIds(conversationId);
    this.events.emitToUsers(ids, 'msg:conversation', { conversation_id: conversationId });
  }

  async updateGroup(
    empId: number,
    conversationId: number,
    patch: { name?: string; description?: string; only_admins_post?: boolean },
  ) {
    const conv = await this.mustBeGroupAdmin(empId, conversationId);
    const who = await this.nameOf(empId);
    const update: Parameters<MessengerRepositoryPort['updateConversation']>[1] = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 3 || name.length > 60) throw new MessengerError('invalid', 'Group name must be 3 to 60 characters.');
      update.name = name;
    }
    if (patch.description !== undefined) {
      const d = patch.description.trim();
      if (d.length > 500) throw new MessengerError('invalid', 'Description cannot exceed 500 characters.');
      update.description = d || null;
    }
    if (patch.only_admins_post !== undefined) update.onlyAdminsPost = patch.only_admins_post;
    await this.repo.updateConversation(conversationId, update);
    if (update.name && update.name !== conv.name) await this.system(conversationId, `${who} changed the group name to "${update.name}"`);
    if (update.onlyAdminsPost !== undefined) {
      await this.system(conversationId, update.onlyAdminsPost ? `${who} set the group to admins-only posting` : `${who} allowed everyone to send messages`);
    }
    await this.refreshConversation(conversationId);
  }

  async addMembers(empId: number, conversationId: number, memberIds: number[]) {
    await this.mustBeGroupAdmin(empId, conversationId);
    const existing = new Set(await this.memberIds(conversationId));
    const toAdd = [...new Set(memberIds)].filter((id) => !existing.has(id));
    if (existing.size + toAdd.length > L.maxGroupMembers) throw new MessengerError('invalid', 'A group can have up to 500 members.');
    const people = (await this.repo.getPeople(toAdd)).filter((p) => p.is_active);
    const who = await this.nameOf(empId);
    for (const p of people) {
      await this.repo.addMember(conversationId, p.emp_id);
      await this.system(conversationId, `${who} added ${p.name}`);
    }
    await this.refreshConversation(conversationId);
  }

  async removeMember(empId: number, conversationId: number, targetId: number) {
    await this.mustBeGroupAdmin(empId, conversationId);
    if (targetId === empId) return this.leave(empId, conversationId);
    if (!(await this.repo.getMemberRow(conversationId, targetId))) throw new MessengerError('not_found', 'Member not found.');
    const who = await this.nameOf(empId);
    const target = await this.nameOf(targetId);
    const before = await this.memberIds(conversationId);
    await this.repo.removeMember(conversationId, targetId);
    await this.system(conversationId, `${who} removed ${target}`);
    this.events.emitToUsers(before, 'msg:conversation', { conversation_id: conversationId });
  }

  async setAdmin(empId: number, conversationId: number, targetId: number, isAdmin: boolean) {
    await this.mustBeGroupAdmin(empId, conversationId);
    if (!(await this.repo.getMemberRow(conversationId, targetId))) throw new MessengerError('not_found', 'Member not found.');
    if (!isAdmin && (await this.repo.countAdmins(conversationId)) <= 1) {
      throw new MessengerError('invalid', 'A group must have at least one admin.');
    }
    await this.repo.setAdmin(conversationId, targetId, isAdmin);
    const target = await this.nameOf(targetId);
    await this.system(conversationId, isAdmin ? `${target} is now a group admin` : `${target} is no longer a group admin`);
    await this.refreshConversation(conversationId);
  }

  async leave(empId: number, conversationId: number) {
    const conv = await this.mustBeMember(empId, conversationId);
    if (conv.kind !== 'group') throw new MessengerError('invalid', 'You cannot leave a one-to-one chat.');
    const who = await this.nameOf(empId);
    const before = await this.memberIds(conversationId);
    if (conv.my_is_admin && (await this.repo.countAdmins(conversationId)) <= 1) {
      const next = await this.repo.oldestMember(conversationId, empId);
      if (next) {
        await this.repo.setAdmin(conversationId, next, true);
        await this.repo.removeMember(conversationId, empId);
        await this.system(conversationId, `${who} left. ${await this.nameOf(next)} is now a group admin`);
        this.events.emitToUsers(before, 'msg:conversation', { conversation_id: conversationId });
        return;
      }
    }
    await this.repo.removeMember(conversationId, empId);
    await this.system(conversationId, `${who} left`);
    this.events.emitToUsers(before, 'msg:conversation', { conversation_id: conversationId });
  }

  async closeGroup(empId: number, conversationId: number) {
    await this.mustBeGroupAdmin(empId, conversationId);
    await this.repo.updateConversation(conversationId, { isClosed: true });
    await this.system(conversationId, `${await this.nameOf(empId)} closed this group`);
    await this.refreshConversation(conversationId);
  }

  async setPrefs(
    empId: number,
    conversationId: number,
    prefs: { pinned?: boolean; mute?: MuteDuration | null; archived?: boolean; marked_unread?: boolean },
  ) {
    await this.mustBeMember(empId, conversationId);
    if (prefs.pinned && (await this.repo.countPinnedConversations(empId)) >= L.maxPinnedConversations) {
      const conv = await this.repo.getConversation(empId, conversationId);
      if (!conv?.pinned_at) throw new MessengerError('invalid', 'You can pin up to 5 conversations.');
    }
    let mutedUntil: Date | null | undefined;
    if (prefs.mute !== undefined) {
      if (prefs.mute === null) mutedUntil = null;
      else if (prefs.mute === '8h') mutedUntil = new Date(Date.now() + 8 * 3600_000);
      else if (prefs.mute === '1w') mutedUntil = new Date(Date.now() + 7 * 86400_000);
      else mutedUntil = new Date('2999-01-01T00:00:00Z');
    }
    await this.repo.setMemberPrefs(conversationId, empId, {
      pinned: prefs.pinned,
      mutedUntil,
      archived: prefs.archived,
      markedUnread: prefs.marked_unread,
    });
    this.events.emitToUsers([empId], 'msg:conversation', { conversation_id: conversationId });
  }

  // ----------------------------------------------------------------- Messages

  async listMessages(
    empId: number,
    conversationId: number,
    opts: { before?: number; query?: string; onlyFiles?: boolean },
  ) {
    await this.mustBeMember(empId, conversationId);
    const query = opts.query?.trim();
    if (query && query.length < 2) throw new MessengerError('invalid', 'Please enter at least 2 characters.');
    const messages = await this.repo.listMessages(empId, conversationId, {
      before: opts.before,
      query,
      onlyFiles: opts.onlyFiles,
      limit: query ? 100 : L.pageSize,
    });
    return { messages, has_more: messages.length >= (query ? 100 : L.pageSize) };
  }

  async send(empId: number, conversationId: number, input: { body: string; reply_to_id?: number }) {
    const body = this.cleanBody(input.body);
    const [conv, replyToId] = await Promise.all([
      this.context(empId, conversationId),
      this.validReply(conversationId, input.reply_to_id),
    ]);
    this.assertCanPost(empId, conv);
    return this.publish(conversationId, empId, { conversationId, senderId: empId, kind: 'text', body, replyToId }, conv.member_ids);
  }

  async sendFile(
    empId: number,
    conversationId: number,
    file: { name: string; path: string; size: number; mime: string },
    input: { caption?: string; reply_to_id?: number },
    save: () => Promise<string>,
  ) {
    const conv = await this.context(empId, conversationId);
    this.assertCanPost(empId, conv);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (BLOCKED_FILE_EXTENSIONS.includes(ext)) throw new MessengerError('invalid', 'This file type is not allowed.');
    if (file.size > L.maxFileBytes) throw new MessengerError('invalid', 'File exceeds the 25 MB limit.');
    const caption = (input.caption ?? '').trim();
    if (caption.length > 1000) throw new MessengerError('invalid', 'Caption cannot exceed 1,000 characters.');
    const replyToId = await this.validReply(conversationId, input.reply_to_id);
    const path = await save();
    return this.publish(conversationId, empId, {
      conversationId,
      senderId: empId,
      kind: 'file',
      body: caption || null,
      replyToId,
      file: { ...file, path },
    }, conv.member_ids);
  }

  private async validReply(conversationId: number, replyToId?: number): Promise<number | null> {
    if (!replyToId) return null;
    const raw = await this.repo.getMessageRaw(replyToId);
    if (!raw || raw.conversation_id !== conversationId || raw.deleted_at || raw.kind === 'system') {
      throw new MessengerError('invalid', 'The message you are replying to is not available.');
    }
    return raw.message_id;
  }

  private async mustAccessMessage(empId: number, messageId: number) {
    const raw = await this.repo.getMessageRaw(messageId);
    if (!raw) throw new MessengerError('not_found', 'Message not found.');
    const conv = await this.context(empId, raw.conversation_id);
    return { raw, conv };
  }

  private async pushUpdate(conversationId: number, messageId: number) {
    const members = await this.memberIds(conversationId);
    // Per-viewer fields (starred) are rebuilt on the client from its own cache.
    const view = await this.repo.getMessage(0, messageId);
    this.events.emitToUsers(members, 'msg:updated', { message: view });
  }

  async edit(empId: number, messageId: number, text: string) {
    const { raw, conv } = await this.mustAccessMessage(empId, messageId);
    if (raw.sender_id !== empId || raw.deleted_at || raw.kind === 'system') {
      throw new MessengerError('forbidden', 'This message can no longer be edited.');
    }
    if (minutesSince(raw.created_at) > L.editWindowMinutes) throw new MessengerError('forbidden', 'This message can no longer be edited.');
    this.assertCanPost(empId, conv);
    const body = this.cleanBody(text, raw.kind === 'text');
    await this.repo.editMessage(messageId, body, empId);
    await this.pushUpdate(raw.conversation_id, messageId);
    return (await this.repo.getMessage(empId, messageId))!;
  }

  async remove(empId: number, messageId: number, mode: 'me' | 'everyone') {
    const { raw, conv } = await this.mustAccessMessage(empId, messageId);
    if (raw.kind === 'system') throw new MessengerError('forbidden', 'System messages cannot be deleted.');
    if (mode === 'me') {
      await this.repo.deleteForMe(messageId, empId);
      return;
    }
    if (raw.deleted_at) return;
    const own = raw.sender_id === empId;
    if (own) {
      if (minutesSince(raw.created_at) > L.deleteForEveryoneWindowMinutes) {
        throw new MessengerError('forbidden', 'This message can no longer be deleted for everyone.');
      }
      await this.repo.deleteForEveryone(messageId, empId, 'everyone');
    } else if (conv.kind === 'group' && conv.my_is_admin) {
      await this.repo.deleteForEveryone(messageId, empId, 'admin');
    } else {
      throw new MessengerError('forbidden', 'You cannot delete this message for everyone.');
    }
    await this.pushUpdate(raw.conversation_id, messageId);
    await this.refreshConversation(raw.conversation_id);
  }

  async react(empId: number, messageId: number, emoji: string) {
    const { raw } = await this.mustAccessMessage(empId, messageId);
    if (raw.deleted_at || raw.kind === 'system') throw new MessengerError('invalid', 'You cannot react to this message.');
    const e = (emoji ?? '').trim();
    if (!e || e.length > 16) throw new MessengerError('invalid', 'Invalid reaction.');
    await this.repo.toggleReaction(messageId, empId, e);
    await this.pushUpdate(raw.conversation_id, messageId);
  }

  async star(empId: number, messageId: number): Promise<boolean> {
    const { raw } = await this.mustAccessMessage(empId, messageId);
    if (raw.deleted_at || raw.kind === 'system') throw new MessengerError('invalid', 'You cannot star this message.');
    return this.repo.toggleStar(messageId, empId);
  }

  starred(empId: number) {
    return this.repo.listStarred(empId);
  }

  async pin(empId: number, messageId: number): Promise<boolean> {
    const { raw, conv } = await this.mustAccessMessage(empId, messageId);
    if (raw.deleted_at || raw.kind === 'system') throw new MessengerError('invalid', 'You cannot pin this message.');
    if (conv.kind === 'group' && !conv.my_is_admin) throw new MessengerError('forbidden', 'Only group admins can pin messages.');
    if (conv.is_closed) throw new MessengerError('forbidden', 'This group is closed.');
    const pinnedNow = await this.repo.listPinned(empId, raw.conversation_id);
    const already = pinnedNow.some((m) => m.message_id === messageId);
    if (!already && (await this.repo.countPinnedMessages(raw.conversation_id)) >= L.maxPinnedMessages) {
      throw new MessengerError('invalid', 'You can pin up to 10 messages. Unpin one to continue.');
    }
    const pinned = await this.repo.togglePin(raw.conversation_id, messageId, empId);
    await this.pushUpdate(raw.conversation_id, messageId);
    await this.system(raw.conversation_id, `${await this.nameOf(empId)} ${pinned ? 'pinned' : 'unpinned'} a message`);
    await this.refreshConversation(raw.conversation_id);
    return pinned;
  }

  async messageInfo(empId: number, messageId: number) {
    const { raw } = await this.mustAccessMessage(empId, messageId);
    if (raw.sender_id !== empId) throw new MessengerError('forbidden', 'Message info is only available for your own messages.');
    return this.repo.messageInfo(messageId);
  }

  async forward(empId: number, messageIds: number[], targetIds: number[], comment?: string) {
    const ids = [...new Set(messageIds ?? [])];
    const targets = [...new Set(targetIds ?? [])];
    if (!ids.length || ids.length > L.maxForwardMessages) throw new MessengerError('invalid', 'You can forward up to 10 messages.');
    if (!targets.length || targets.length > L.maxForwardTargets) throw new MessengerError('invalid', 'You can forward to up to 5 conversations at a time.');
    const note = this.cleanBody(comment, false);
    const sources = [];
    for (const id of ids) {
      const { raw } = await this.mustAccessMessage(empId, id);
      if (raw.deleted_at || raw.kind === 'system') throw new MessengerError('invalid', 'One of the messages cannot be forwarded.');
      sources.push(raw);
    }
    sources.sort((a, b) => a.message_id - b.message_id);
    const ctxs = new Map<number, ConversationContext>();
    for (const target of targets) {
      const conv = await this.context(empId, target);
      this.assertCanPost(empId, conv);
      ctxs.set(target, conv);
    }
    for (const target of targets) {
      const members = ctxs.get(target)!.member_ids;
      if (note) await this.publish(target, empId, { conversationId: target, senderId: empId, kind: 'text', body: note }, members);
      for (const s of sources) {
        await this.publish(target, empId, {
          conversationId: target,
          senderId: empId,
          kind: s.kind === 'file' ? 'file' : 'text',
          body: s.body,
          isForwarded: true,
          file: s.kind === 'file' && s.file_path ? { name: s.file_name!, path: s.file_path, size: Number(s.file_size ?? 0), mime: s.mime_type ?? '' } : null,
        }, members);
      }
    }
  }

  /** The file behind a message, only for people who can see the conversation. */
  async fileOf(empId: number, messageId: number) {
    const { raw } = await this.mustAccessMessage(empId, messageId);
    if (raw.kind !== 'file' || raw.deleted_at || !raw.file_path) throw new MessengerError('not_found', 'File not available.');
    return { path: raw.file_path, name: raw.file_name ?? 'file', mime: raw.mime_type ?? 'application/octet-stream' };
  }

  // ------------------------------------------------------------------ Search

  async search(empId: number, query: string): Promise<SearchResults> {
    const q = (query ?? '').trim();
    if (q.length < 2) throw new MessengerError('invalid', 'Please enter at least 2 characters.');
    const [messages, people, groups] = await Promise.all([
      this.repo.searchEverywhere(empId, q, 50),
      this.repo.searchPeople(q, empId, 10),
      this.repo.searchGroups(empId, q, 10),
    ]);
    return { messages, people, groups };
  }

  // ----------------------------------------------------------------- Receipts

  async markRead(empId: number, conversationId: number) {
    const [last, ids] = await Promise.all([this.repo.markRead(conversationId, empId), this.memberIds(conversationId)]);
    if (last === null) throw new MessengerError('not_found', 'Conversation not found.');
    this.events.emitToUsers(ids, 'msg:receipt', { conversation_id: conversationId });
    // Other devices of the same person clear their counter too.
    this.events.emitToUsers([empId], 'msg:read', { conversation_id: conversationId });
  }

  async typing(empId: number, conversationId: number) {
    const [ctx, name] = await Promise.all([this.context(empId, conversationId), this.nameOf(empId)]);
    const ids = ctx.member_ids.filter((id) => id !== empId);
    this.events.emitToUsers(ids, 'msg:typing', { conversation_id: conversationId, emp_id: empId, name });
  }

  async receipts(empId: number, conversationId: number) {
    const r = await this.repo.receiptsFor(conversationId, empId);
    if (!r) throw new MessengerError('not_found', 'Conversation not found.');
    return r;
  }

  unreadCount(empId: number) {
    return this.repo.totalUnread(empId);
  }

  // ----------------------------------------------------------------- Presence

  async presence(ids: number[]): Promise<UserStateView[]> {
    const unique = [...new Set(ids)].slice(0, 500);
    const states = await this.repo.getUserStates(unique);
    return states.map((s) => ({ ...s, online: this.events.isOnline(s.emp_id), away: this.events.isAway(s.emp_id) }));
  }

  async setStatus(empId: number, status: ManualStatus, text: string | null, minutes: number | null) {
    const clean = (text ?? '').trim();
    if (clean.length > 100) throw new MessengerError('invalid', 'Status cannot exceed 100 characters.');
    const until = status === 'auto' && !clean ? null : minutes ? new Date(Date.now() + minutes * 60_000) : null;
    await this.repo.setUserStatus(empId, status, clean || null, until);
    this.events.emitToAllUsers('presence:update', {
      emp_id: empId,
      online: this.events.isOnline(empId),
      status,
      status_text: clean || null,
    });
  }
}
