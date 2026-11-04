import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Copy, Forward, Loader2, MoreVertical, Pin, Search, UploadCloud, X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/shared/socket/SocketContext';
import { errorMessage, messengerApi } from '../api';
import { MessagesCache, msgKeys, useMessenger } from '../MessengerContext';
import type { Conversation, ConversationDetail, Message } from '../types';
import { conversationTitle, dayLabel, formatTime, presenceLabel, messagePreview } from '../utils';
import { Composer } from './Composer';
import { DeleteDialog, ForwardDialog, InfoDialog } from './dialogs';
import { MessageBubble } from './MessageBubble';
import { EmojiPanel } from './EmojiPicker';
import { Lightbox, Modal, PersonAvatar } from './parts';

interface Props {
  conversation: Conversation;
  jumpTo?: number | null;
  onBack: () => void;
  onToggleInfo: () => void;
  infoOpen: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Outbox {
  text: string;
  file?: File;
  replyToId?: number;
}

export const ChatView: React.FC<Props> = ({ conversation: conv, jumpTo, onBack, onToggleInfo, infoOpen }) => {
  const id = conv.conversation_id;
  const { user } = useAuth();
  const me = user!.emp_id;
  const qc = useQueryClient();
  const { socket } = useSocket();
  const { presence, ensurePresence, typingNames, setActiveConversation, markRead } = useMessenger();

  const { data, isLoading } = useQuery({
    queryKey: msgKeys.messages(id),
    queryFn: () => messengerApi.messages(id),
    staleTime: Infinity,
  });
  const { data: detail } = useQuery<ConversationDetail>({
    queryKey: msgKeys.detail(id),
    queryFn: () => messengerApi.conversation(id),
    staleTime: 30_000,
  });
  const messages = data?.messages ?? [];
  const members = detail?.members ?? [];

  const scroller = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [forwardIds, setForwardIds] = useState<number[] | null>(null);
  const [infoTarget, setInfoTarget] = useState<Message | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [reactFor, setReactFor] = useState<Message | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dropped, setDropped] = useState<File[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [pinIdx, setPinIdx] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const outbox = useRef<Map<string, Outbox>>(new Map());
  const firstUnread = useRef<{ id: number; messageId: number | null } | null>(null);
  const prevCount = useRef(0);
  const initialised = useRef<number | null>(null);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    setTimeout(() => setFlash((f) => (f === text ? null : f)), 2500);
  }, []);

  // ---- Which conversation is on screen
  useEffect(() => {
    setActiveConversation(id);
    setReplyTo(null);
    setEditing(null);
    setSelecting(false);
    setSelected([]);
    setSearching(false);
    setNewBelow(0);
    setPinIdx(0);
    initialised.current = null;
    firstUnread.current = null;
    return () => setActiveConversation(null);
  }, [id, setActiveConversation]);

  useEffect(() => {
    if (conv.peer) ensurePresence([conv.peer.emp_id]);
  }, [conv.peer, ensurePresence]);
  useEffect(() => {
    ensurePresence(members.map((m) => m.emp_id));
  }, [members, ensurePresence]);

  // ---- Reading
  useEffect(() => {
    if (!data) return;
    const visible = () => document.visibilityState === 'visible';
    if (visible() && (conv.unread_count > 0 || conv.marked_unread)) markRead(id);
    const onVisible = () => visible() && markRead(id);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [data, id, conv.unread_count, conv.marked_unread, markRead]);

  // ---- Where the unread divider goes (decided once when the chat opens)
  useEffect(() => {
    if (!data || firstUnread.current?.id === id) return;
    let remaining = conv.unread_count;
    let target: number | null = null;
    if (remaining > 0) {
      for (let i = data.messages.length - 1; i >= 0; i--) {
        const m = data.messages[i];
        if (m.sender_id === me || m.kind === 'system' || m.deleted) continue;
        remaining--;
        target = m.message_id;
        if (remaining === 0) break;
      }
    }
    firstUnread.current = { id, messageId: target };
  }, [data, id, conv.unread_count, me]);

  // ---- Scrolling
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // When the phone keyboard opens or closes the visible area changes; stay on the latest message.
  const atBottomRef = useRef(true);
  atBottomRef.current = atBottom;
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => atBottomRef.current && scrollToBottom();
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    if (!data || initialised.current === id) return;
    initialised.current = id;
    prevCount.current = data.messages.length;
    const divider = scroller.current?.querySelector('[data-divider]');
    if (divider) divider.scrollIntoView({ block: 'start' });
    else scrollToBottom();
  }, [data, id, scrollToBottom]);

  useEffect(() => {
    if (!data || initialised.current !== id) return;
    const added = data.messages.length - prevCount.current;
    prevCount.current = data.messages.length;
    if (added <= 0) return;
    const last = data.messages[data.messages.length - 1];
    if (atBottom || last.sender_id === me) requestAnimationFrame(() => scrollToBottom(true));
    else if (last.created_at > (data.messages[data.messages.length - 1 - added]?.created_at ?? '')) setNewBelow((n) => n + added);
  }, [data?.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAtBottom(near);
    if (near) setNewBelow(0);
    if (el.scrollTop < 80 && data?.has_more && !loadingOlder) void loadOlder();
  };

  const loadOlder = useCallback(async () => {
    const cache = qc.getQueryData<MessagesCache>(msgKeys.messages(id));
    const first = cache?.messages.find((m) => m.message_id > 0);
    if (!cache || !first || loadingOlder) return false;
    setLoadingOlder(true);
    const el = scroller.current;
    const before = el?.scrollHeight ?? 0;
    try {
      const page = await messengerApi.messages(id, { before: first.message_id });
      qc.setQueryData<MessagesCache>(msgKeys.messages(id), (old) => {
        if (!old) return old;
        const known = new Set(old.messages.map((m) => m.message_id));
        return { has_more: page.has_more, messages: [...page.messages.filter((m) => !known.has(m.message_id)), ...old.messages] };
      });
      requestAnimationFrame(() => {
        if (el) el.scrollTop += el.scrollHeight - before;
      });
      return page.messages.length > 0;
    } finally {
      setLoadingOlder(false);
    }
  }, [qc, id, loadingOlder]);

  const jump = useCallback(
    async (messageId: number) => {
      for (let i = 0; i < 20; i++) {
        const el = scroller.current?.querySelector(`[data-mid="${messageId}"]`);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          setHighlight(messageId);
          setTimeout(() => setHighlight((h) => (h === messageId ? null : h)), 2500);
          return;
        }
        const cache = qc.getQueryData<MessagesCache>(msgKeys.messages(id));
        if (!cache?.has_more) break;
        if (!(await loadOlder())) break;
        await new Promise((r) => setTimeout(r, 30));
      }
      showFlash('That message is no longer available.');
    },
    [qc, id, loadOlder, showFlash],
  );

  useEffect(() => {
    if (jumpTo && data) void jump(jumpTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo, !!data]);

  // ---- Sending
  const patchMessages = useCallback(
    (fn: (list: Message[]) => Message[]) =>
      qc.setQueryData<MessagesCache>(msgKeys.messages(id), (old) => (old ? { ...old, messages: fn(old.messages) } : old)),
    [qc, id],
  );

  const attempt = useCallback(
    async (tempId: string) => {
      const item = outbox.current.get(tempId);
      if (!item) return;
      patchMessages((l) => l.map((m) => (m.temp_id === tempId ? { ...m, pending: 'sending' } : m)));
      try {
        if (item.file) {
          await messengerApi.sendFile(id, item.file, item.text || undefined, item.replyToId);
          outbox.current.delete(tempId);
          patchMessages((l) => l.filter((m) => m.temp_id !== tempId));
        } else {
          const saved = await messengerApi.send(id, item.text, item.replyToId);
          outbox.current.delete(tempId);
          patchMessages((l) => {
            const without = l.filter((m) => m.temp_id !== tempId);
            return without.some((m) => m.message_id === saved.message_id) ? without : [...without, saved];
          });
        }
      } catch (e) {
        if (!navigator.onLine) return; // stays "sending"; goes out when the connection returns
        const msg = errorMessage(e);
        patchMessages((l) => l.map((m) => (m.temp_id === tempId ? { ...m, pending: 'failed' } : m)));
        showFlash(msg);
      }
    },
    [id, patchMessages, qc, showFlash],
  );

  useEffect(() => {
    const on = () => {
      setOffline(false);
      outbox.current.forEach((_, tempId) => void attempt(tempId));
    };
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [attempt]);

  const queueSend = (text: string, file: File | undefined, replyToId?: number) => {
    const tempId = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    outbox.current.set(tempId, { text, file, replyToId });
    const temp: Message = {
      message_id: -Date.now() - Math.floor(Math.random() * 1000),
      temp_id: tempId,
      pending: 'sending',
      conversation_id: id,
      sender_id: me,
      sender_name: user!.name,
      sender_photo: null,
      kind: file ? 'file' : 'text',
      body: text || null,
      reply_to: replyToId && replyTo ? { message_id: replyTo.message_id, sender_name: replyTo.sender_name, kind: replyTo.kind, body: replyTo.body, file_name: replyTo.file?.name ?? null, deleted: false } : null,
      is_forwarded: false,
      file: file ? { name: file.name, size: file.size, mime: file.type } : null,
      edited_at: null,
      deleted: null,
      created_at: new Date().toISOString(),
      reactions: [],
      starred: false,
      pinned: false,
    };
    patchMessages((l) => [...l, temp]);
    void attempt(tempId);
  };

  const onSend = (text: string, files: File[]) => {
    const replyId = replyTo?.message_id;
    setReplyTo(null);
    if (!files.length) {
      queueSend(text, undefined, replyId);
      return;
    }
    files.forEach((f, i) => queueSend(i === 0 ? text : '', f, i === 0 ? replyId : undefined));
  };

  const onSaveEdit = async (text: string) => {
    if (!editing) return;
    const target = editing;
    setEditing(null);
    try {
      const saved = await messengerApi.edit(target.message_id, text);
      patchMessages((l) => l.map((m) => (m.message_id === saved.message_id ? { ...saved, starred: m.starred } : m)));
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  const toggleStarLocal = (m: Message) =>
    run(async () => {
      const r = await messengerApi.star(m.message_id);
      patchMessages((l) => l.map((x) => (x.message_id === m.message_id ? { ...x, starred: r.starred } : x)));
    });

  const copy = async (list: Message[]) => {
    const text =
      list.length === 1
        ? (list[0].body ?? '')
        : list.map((m) => `[${stamp(m.created_at)}] ${m.sender_name}: ${m.body ?? m.file?.name ?? ''}`).join('\n');
    await navigator.clipboard.writeText(text).catch(() => undefined);
    showFlash('Copied');
  };

  const selectedMessages = messages.filter((m) => selected.includes(m.message_id));
  const toggleSelect = (mid: number) =>
    setSelected((s) => {
      if (s.includes(mid)) return s.filter((x) => x !== mid);
      if (s.length >= 10) {
        showFlash('You can forward up to 10 messages.');
        return s;
      }
      return [...s, mid];
    });

  // ---- Derived UI
  const typing = typingNames(id);
  const title = conversationTitle(conv);
  const peerPresence = conv.peer ? presence[conv.peer.emp_id] : undefined;
  const subtitle =
    typing.length > 0
      ? `${typing.slice(0, 2).join(', ')} ${typing.length > 1 ? 'are' : 'is'} typing…`
      : conv.kind === 'direct'
        ? peerPresence?.status_text
          ? `${presenceLabel(peerPresence)} · ${peerPresence.status_text}`
          : presenceLabel(peerPresence)
        : members.length
          ? members.map((m) => (m.emp_id === me ? 'You' : m.name.split(' ')[0])).join(', ')
          : `${conv.member_count} members`;

  const blockedReason = conv.is_closed
    ? 'This group is closed. You can read the history but cannot send messages.'
    : conv.kind === 'direct' && conv.peer && !conv.peer.is_active
      ? 'You can no longer message this employee.'
      : conv.kind === 'group' && conv.only_admins_post && !conv.my_is_admin
        ? 'Only admins can send messages in this group.'
        : null;
  const notice =
    offline
      ? 'You are offline. Messages will be sent when the connection returns.'
      : conv.kind === 'direct' && peerPresence?.status === 'dnd'
        ? `${conv.peer?.name} has notifications paused`
        : null;

  const fileMessages = useMemo(() => messages.filter((m) => m.kind === 'file' && m.file && !m.deleted && m.message_id > 0), [messages]);
  const pinned = detail?.pinned_messages ?? [];
  const pinnedShown = pinned.length ? pinned[Math.min(pinIdx, pinned.length - 1)] : null;

  const rows = useMemo(() => {
    const out: React.ReactNode[] = [];
    let prev: Message | null = null;
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const prevDay = prev ? dayLabel(prev.created_at) : null;
      if (day !== prevDay) {
        out.push(
          <div key={`d-${m.message_id}`} className="sticky top-1 z-10 my-3 flex justify-center">
            <span className="rounded-lg bg-white/95 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">{day}</span>
          </div>,
        );
      }
      if (firstUnread.current?.messageId === m.message_id) {
        out.push(
          <div key="unread" data-divider className="my-3 flex justify-center">
            <span className="rounded-lg bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">Unread messages</span>
          </div>,
        );
      }
      const firstOfRun = !prev || prev.kind === 'system' || prev.sender_id !== m.sender_id || day !== prevDay;
      const mine = m.sender_id === me;
      out.push(
        <MessageBubble
          key={m.temp_id ?? m.message_id}
          message={m}
          conversation={conv}
          me={me}
          mine={mine}
          showSender={conv.kind === 'group'}
          firstOfRun={firstOfRun}
          highlighted={highlight === m.message_id}
          selecting={selecting}
          selected={selected.includes(m.message_id)}
          onToggleSelect={() => toggleSelect(m.message_id)}
          onStartSelect={() => {
            setSelecting(true);
            setSelected([m.message_id]);
          }}
          onReply={() => {
            setEditing(null);
            setReplyTo(m);
            setFocusKey((k) => k + 1);
          }}
          onForward={() => setForwardIds([m.message_id])}
          onEdit={() => {
            setReplyTo(null);
            setEditing(m);
          }}
          onDelete={() => setDeleteTarget(m)}
          onInfo={() => setInfoTarget(m)}
          onPin={() =>
            run(async () => {
              await messengerApi.pin(m.message_id);
              qc.invalidateQueries({ queryKey: msgKeys.detail(id) });
            })
          }
          onStar={() => toggleStarLocal(m)}
          onReact={(emoji) => run(() => messengerApi.react(m.message_id, emoji))}
          onMoreReactions={() => setReactFor(m)}
          onCopy={() => copy([m])}
          onOpenFile={() => {
            const i = fileMessages.findIndex((f) => f.message_id === m.message_id);
            if (i >= 0) setViewer(i);
          }}
          onJump={jump}
          onRetry={() => m.temp_id && void attempt(m.temp_id)}
          onDiscard={() => {
            if (m.temp_id) outbox.current.delete(m.temp_id);
            patchMessages((l) => l.filter((x) => x.temp_id !== m.temp_id));
          }}
        />,
      );
      prev = m;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, conv, me, highlight, selecting, selected, fileMessages, data]);

  return (
    <div
      className="relative flex h-full min-w-0 flex-1 flex-col bg-[#eef1f8]"
      onDragOver={(e) => {
        if (blockedReason || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        if (blockedReason) return;
        e.preventDefault();
        setDragging(false);
        setDropped([...e.dataTransfer.files]);
      }}
    >
      {/* Header */}
      {selecting ? (
        <header className="flex items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-3 py-2.5">
          <button type="button" aria-label="Cancel selection" onClick={() => { setSelecting(false); setSelected([]); }} className="rounded-full p-2 text-slate-600 hover:bg-slate-200"><X className="h-5 w-5" /></button>
          <p className="flex-1 text-sm font-semibold text-slate-800">{selected.length} selected</p>
          <button type="button" aria-label="Copy" disabled={!selected.length} onClick={() => void copy(selectedMessages)} className="rounded-full p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-40"><Copy className="h-5 w-5" /></button>
          <button type="button" aria-label="Forward" disabled={!selected.length} onClick={() => setForwardIds(selected)} className="rounded-full p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-40"><Forward className="h-5 w-5" /></button>
        </header>
      ) : (
        <header className="flex items-center gap-1 border-b border-slate-200 bg-[#f0f2f5] px-2 py-2 sm:gap-2 sm:px-3">
          <button type="button" aria-label="Back to chats" onClick={onBack} className="rounded-full p-2 text-slate-600 hover:bg-slate-200 md:hidden"><ArrowLeft className="h-5 w-5" /></button>
          <button type="button" onClick={onToggleInfo} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left hover:bg-slate-200/60" aria-label="Open chat info">
            <PersonAvatar name={title} src={conv.peer?.photo_url} size={40} presence={peerPresence} group={conv.kind === 'group'} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-slate-900">{title}</span>
              <span className={`block truncate text-xs ${typing.length ? 'font-medium text-indigo-600' : 'text-slate-500'}`}>{subtitle}</span>
            </span>
          </button>
          <button type="button" aria-label="Search in conversation" onClick={() => setSearching((s) => !s)} className={`rounded-full p-2 text-slate-600 hover:bg-slate-200 ${searching ? 'bg-slate-200' : ''}`}><Search className="h-5 w-5" /></button>
          <button type="button" aria-label="Chat info" aria-pressed={infoOpen} onClick={onToggleInfo} className={`rounded-full p-2 text-slate-600 hover:bg-slate-200 ${infoOpen ? 'bg-slate-200' : ''}`}><MoreVertical className="h-5 w-5" /></button>
        </header>
      )}

      {searching && <InChatSearch conversationId={id} onClose={() => setSearching(false)} onPick={(mid) => { setSearching(false); void jump(mid); }} />}

      {pinnedShown && !selecting && (
        <button
          type="button"
          onClick={() => {
            void jump(pinnedShown.message_id);
            setPinIdx((i) => (i + 1) % pinned.length);
          }}
          className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 text-left hover:bg-slate-50"
        >
          <Pin className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Pinned{pinned.length > 1 ? ` · ${Math.min(pinIdx, pinned.length - 1) + 1}/${pinned.length}` : ''}</span>
            <span className="block truncate text-sm text-slate-700">{pinnedShown.sender_name}: {messagePreview({ ...pinnedShown, file_name: pinnedShown.file?.name })}</span>
          </span>
        </button>
      )}

      {/* Messages */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
        style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${title}`}
      >
        {loadingOlder && <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="rounded-xl bg-white/90 px-4 py-2 text-center text-sm text-slate-500 shadow-sm">No messages yet. Say hello 👋</p>
          </div>
        ) : (
          rows
        )}
        <div className="h-2" />
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => { scrollToBottom(true); setNewBelow(0); }}
          aria-label="Jump to latest"
          className="absolute bottom-24 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 sm:right-6"
        >
          <ChevronDown className="h-5 w-5" />
          {newBelow > 0 && <span className="absolute -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1 text-[11px] font-bold text-white">{newBelow}</span>}
        </button>
      )}

      {flash && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-16 z-30 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-center text-sm text-white shadow-lg">{flash}</div>
      )}

      <Composer
        conversationId={id}
        members={members}
        isGroup={conv.kind === 'group'}
        me={me}
        replyTo={replyTo}
        editing={editing}
        blockedReason={blockedReason}
        notice={notice}
        droppedFiles={dropped}
        onConsumeDropped={() => setDropped([])}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSend={onSend}
        onSaveEdit={onSaveEdit}
        onTyping={() => socket && void messengerApi.typing(id).catch(() => undefined)}
        onError={showFlash}
        focusKey={focusKey}
      />

      {dragging && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 border-4 border-dashed border-indigo-400 bg-indigo-50/90 text-indigo-700">
          <UploadCloud className="h-12 w-12" />
          <p className="text-sm font-semibold">Drop files to share</p>
        </div>
      )}

      {deleteTarget && (
        <DeleteDialog
          message={deleteTarget}
          conversation={conv}
          me={me}
          onClose={() => setDeleteTarget(null)}
          onDelete={async (mode) => {
            const t = deleteTarget;
            setDeleteTarget(null);
            if (t.pending) {
              if (t.temp_id) outbox.current.delete(t.temp_id);
              patchMessages((l) => l.filter((x) => x.temp_id !== t.temp_id));
              return;
            }
            await run(async () => {
              await messengerApi.remove(t.message_id, mode);
              if (mode === 'me') patchMessages((l) => l.filter((x) => x.message_id !== t.message_id));
            });
          }}
        />
      )}
      {forwardIds && (
        <ForwardDialog
          messageIds={forwardIds}
          onClose={() => setForwardIds(null)}
          onDone={() => {
            setForwardIds(null);
            setSelecting(false);
            setSelected([]);
            showFlash('Forwarded');
          }}
        />
      )}
      {reactFor && (
        <Modal title="React to message" onClose={() => setReactFor(null)}>
          <EmojiPanel
            className="h-[min(26rem,65dvh)]"
            onPick={(emoji) => {
              const t = reactFor;
              setReactFor(null);
              void run(() => messengerApi.react(t.message_id, emoji));
            }}
          />
        </Modal>
      )}
      {infoTarget && <InfoDialog message={infoTarget} conversation={conv} onClose={() => setInfoTarget(null)} />}
      {viewer !== null && fileMessages[viewer] && <Lightbox items={fileMessages} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </div>
  );
};

const InChatSearch: React.FC<{ conversationId: number; onClose: () => void; onPick: (id: number) => void }> = ({ conversationId, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isFetching } = useQuery({
    queryKey: ['msg', 'search', conversationId, debounced],
    queryFn: () => messengerApi.messages(conversationId, { q: debounced }),
    enabled: debounced.length >= 2,
  });
  const results = [...(data?.messages ?? [])].reverse();
  const term = debounced.toLowerCase();
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} placeholder="Search in this conversation" aria-label="Search in this conversation" className="min-w-0 flex-1 bg-transparent text-base focus:outline-none sm:text-sm" />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <button type="button" aria-label="Close search" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      {q.trim().length > 0 && q.trim().length < 2 && <p className="px-4 pb-2 text-xs text-slate-500">Please enter at least 2 characters.</p>}
      {debounced.length >= 2 && !isFetching && results.length === 0 && <p className="px-4 pb-3 text-sm text-slate-500">No messages found.</p>}
      {results.length > 0 && (
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
          {results.map((m) => {
            const text = m.body ?? m.file?.name ?? '';
            const i = text.toLowerCase().indexOf(term);
            return (
              <li key={m.message_id}>
                <button type="button" onClick={() => onPick(m.message_id)} className="block w-full px-4 py-2 text-left hover:bg-slate-50">
                  <span className="flex justify-between text-xs text-slate-500"><span className="font-medium">{m.sender_name}</span><span>{dayLabel(m.created_at)} · {formatTime(m.created_at)}</span></span>
                  <span className="block truncate text-sm text-slate-800">
                    {i >= 0 ? <>{text.slice(Math.max(0, i - 20), i)}<mark className="rounded bg-amber-200 px-0.5">{text.slice(i, i + term.length)}</mark>{text.slice(i + term.length)}</> : text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
