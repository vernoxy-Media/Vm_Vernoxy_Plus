import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/shared/socket/SocketContext';
import { Avatar } from '@/shared/ui/Avatar';
import { ChatLogo } from './components/ChatLogo';
import { messengerApi } from './api';
import type { Conversation, Message, PresenceState } from './types';
import { conversationTitle, isMuted, messagePreview } from './utils';
import { getSettings, playPing } from './settings';

/** The address of a conversation (and optionally a message in it): /messenger/<opaque id>?m=<message>. */
export function conversationPath(list: Conversation[] | undefined, conversationId: number, messageId?: number): string {
  const ref = list?.find((c) => c.conversation_id === conversationId)?.public_id ?? String(conversationId);
  return `/messenger/${ref}${messageId ? `?m=${messageId}` : ''}`;
}

export const msgKeys = {
  conversations: ['msg', 'conversations'] as const,
  detail: (id: number) => ['msg', 'detail', id] as const,
  messages: (id: number) => ['msg', 'messages', id] as const,
};

export interface MessagesCache {
  messages: Message[];
  has_more: boolean;
}

interface Toast {
  id: number;
  conversationId: number;
  title: string;
  text: string;
  photo: string | null;
}

interface MessengerContextValue {
  conversations: Conversation[];
  isLoading: boolean;
  isError: boolean;
  reload: () => void;
  totalUnread: number;
  presence: Record<number, PresenceState>;
  ensurePresence: (ids: number[]) => void;
  typingNames: (conversationId: number) => string[];
  setActiveConversation: (id: number | null) => void;
  /** Called by the open chat to tell the server it has been read. */
  markRead: (conversationId: number) => void;
}

const MessengerContext = createContext<MessengerContextValue>({
  conversations: [],
  isLoading: false,
  isError: false,
  reload: () => {},
  totalUnread: 0,
  presence: {},
  ensurePresence: () => {},
  typingNames: () => [],
  setActiveConversation: () => {},
  markRead: () => {},
});

export const useMessenger = () => useContext(MessengerContext);

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = user?.emp_id ?? 0;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: msgKeys.conversations,
    queryFn: messengerApi.conversations,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const conversations = useMemo(() => data ?? [], [data]);
  const isLoading = isPending && !isError;

  const [presence, setPresence] = useState<Record<number, PresenceState>>({});
  const asked = useRef<Set<number>>(new Set());
  const [typing, setTyping] = useState<Record<number, Record<number, { name: string; until: number }>>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const activeRef = useRef<number | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  const ensurePresence = useCallback((ids: number[]) => {
    const missing = [...new Set(ids)].filter((id) => id && !asked.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => asked.current.add(id));
    messengerApi
      .presence(missing)
      .then((list) => setPresence((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.emp_id, p])) })))
      .catch(() => missing.forEach((id) => asked.current.delete(id)));
  }, []);

  // Everyone we chat with, so the dots in the list are right straight away.
  useEffect(() => {
    ensurePresence(conversations.map((c) => c.peer?.emp_id ?? 0));
  }, [conversations, ensurePresence]);

  // Reads are batched so a burst of messages makes one request.
  const readTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const markRead = useCallback(
    (conversationId: number) => {
      clearTimeout(readTimers.current[conversationId]);
      readTimers.current[conversationId] = setTimeout(() => {
        messengerApi.markRead(conversationId).catch(() => undefined);
        qc.setQueryData<Conversation[]>(msgKeys.conversations, (old) =>
          old?.map((c) => (c.conversation_id === conversationId ? { ...c, unread_count: 0, marked_unread: false } : c)),
        );
      }, 250);
    },
    [qc],
  );

  const setActiveConversation = useCallback((id: number | null) => {
    activeRef.current = id;
  }, []);

  const refetchSoon = useRef<ReturnType<typeof setTimeout>>();
  const refreshList = useCallback(() => {
    clearTimeout(refetchSoon.current);
    refetchSoon.current = setTimeout(() => qc.invalidateQueries({ queryKey: msgKeys.conversations }), 300);
  }, [qc]);

  // Ticks only need two numbers per chat, so fetch just those instead of the whole list.
  const receiptTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const refreshReceipts = useCallback(
    ({ conversation_id: cid }: { conversation_id: number }) => {
      if (!conversationsRef.current.some((c) => c.conversation_id === cid)) return;
      clearTimeout(receiptTimers.current[cid]);
      receiptTimers.current[cid] = setTimeout(() => {
        messengerApi
          .receipts(cid)
          .then((r) =>
            qc.setQueryData<Conversation[]>(msgKeys.conversations, (old) =>
              old?.map((c) => (c.conversation_id === cid ? { ...c, ...r } : c)),
            ),
          )
          .catch(() => undefined);
      }, 150);
    },
    [qc],
  );

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }, []);

  useEffect(() => {
    if (!socket || !me) return;

    const onNew = ({ message }: { message: Message }) => {
      const cid = message.conversation_id;
      const mine = message.sender_id === me;
      const viewing = activeRef.current === cid && document.visibilityState === 'visible';

      qc.setQueryData<MessagesCache>(msgKeys.messages(cid), (old) => {
        if (!old || old.messages.some((m) => m.message_id === message.message_id)) return old;
        // Our own message coming back replaces the one still waiting to send.
        const pendingIdx = mine
          ? old.messages.findIndex((m) => m.pending === 'sending' && m.kind === message.kind && (m.body ?? '') === (message.body ?? ''))
          : -1;
        if (pendingIdx >= 0) {
          const next = [...old.messages];
          next[pendingIdx] = message;
          return { ...old, messages: next };
        }
        return { ...old, messages: [...old.messages, message] };
      });

      const known = conversationsRef.current.some((c) => c.conversation_id === cid);
      if (!known) {
        refreshList();
      } else {
        qc.setQueryData<Conversation[]>(msgKeys.conversations, (old) =>
          old
            ?.map((c) =>
              c.conversation_id !== cid
                ? c
                : {
                    ...c,
                    is_archived: false,
                    last_message_at: message.created_at,
                    last_message: {
                      message_id: message.message_id,
                      kind: message.kind,
                      body: message.body,
                      file_name: message.file?.name ?? null,
                      sender_id: message.sender_id,
                      sender_name: message.sender_name,
                      deleted: message.deleted,
                      created_at: message.created_at,
                    },
                    unread_count: !mine && !viewing && message.kind !== 'system' ? c.unread_count + 1 : c.unread_count,
                  },
            )
            .sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at)),
        );
      }

      if (mine || message.kind === 'system') return;
      setTyping((prev) => {
        const inConv = prev[cid];
        if (!inConv?.[message.sender_id ?? 0]) return prev;
        const { [message.sender_id ?? 0]: _gone, ...rest } = inConv;
        return { ...prev, [cid]: rest };
      });
      if (viewing) {
        markRead(cid);
        return;
      }
      const conv = conversationsRef.current.find((c) => c.conversation_id === cid);
      if (conv && isMuted(conv)) return;
      const title = conv ? conversationTitle(conv) : (message.sender_name ?? 'New message');
      let text = `${conv?.kind === 'group' ? `${message.sender_name}: ` : ''}${messagePreview({ ...message, file_name: message.file?.name })}`;
      if (!getSettings().preview) text = `New message from ${message.sender_name ?? 'a colleague'}`;
      playPing();
      pushToast({ conversationId: cid, title, text, photo: conv?.peer?.photo_url ?? message.sender_photo });
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const n = new Notification(title, { body: text, tag: `msg-${cid}` });
        n.onclick = () => {
          window.focus();
          navigate(conversationPath(qc.getQueryData<Conversation[]>(msgKeys.conversations), cid));
        };
      }
    };

    const onUpdated = ({ message }: { message: Message }) => {
      qc.setQueryData<MessagesCache>(msgKeys.messages(message.conversation_id), (old) =>
        old && {
          ...old,
          messages: old.messages.map((m) => (m.message_id === message.message_id ? { ...message, starred: m.starred } : m)),
        },
      );
      qc.setQueryData<Conversation[]>(msgKeys.conversations, (old) =>
        old?.map((c) =>
          c.last_message?.message_id === message.message_id
            ? {
                ...c,
                last_message: { ...c.last_message, body: message.body, file_name: message.file?.name ?? null, deleted: message.deleted },
              }
            : c,
        ),
      );
      qc.invalidateQueries({ queryKey: msgKeys.detail(message.conversation_id) });
    };

    const onConversation = ({ conversation_id }: { conversation_id: number }) => {
      refreshList();
      qc.invalidateQueries({ queryKey: msgKeys.detail(conversation_id) });
    };

    const onRead = ({ conversation_id }: { conversation_id: number }) =>
      qc.setQueryData<Conversation[]>(msgKeys.conversations, (old) =>
        old?.map((c) => (c.conversation_id === conversation_id ? { ...c, unread_count: 0, marked_unread: false } : c)),
      );

    const onTyping = ({ conversation_id, emp_id, name }: { conversation_id: number; emp_id: number; name: string }) => {
      setTyping((prev) => ({ ...prev, [conversation_id]: { ...prev[conversation_id], [emp_id]: { name, until: Date.now() + 5000 } } }));
    };

    const onPresence = (p: Partial<PresenceState> & { emp_id: number }) =>
      setPresence((prev) => {
        const base: PresenceState = prev[p.emp_id] ?? { emp_id: p.emp_id, online: false, status: 'auto', status_text: null, last_seen_at: null };
        return { ...prev, [p.emp_id]: { ...base, ...p } };
      });

    const onReconnect = () => {
      qc.invalidateQueries({ queryKey: ['msg'] });
      asked.current.clear();
    };

    socket.on('msg:new', onNew);
    socket.on('msg:updated', onUpdated);
    socket.on('msg:conversation', onConversation);
    socket.on('msg:receipt', refreshReceipts);
    socket.on('msg:read', onRead);
    socket.on('msg:typing', onTyping);
    socket.on('presence:update', onPresence);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('msg:new', onNew);
      socket.off('msg:updated', onUpdated);
      socket.off('msg:conversation', onConversation);
      socket.off('msg:receipt', refreshReceipts);
      socket.off('msg:read', onRead);
      socket.off('msg:typing', onTyping);
      socket.off('presence:update', onPresence);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, me, qc, markRead, refreshList, refreshReceipts, pushToast, navigate]);

  // Away: no mouse, key or touch for 10 minutes. The server shows a yellow dot to everyone else.
  useEffect(() => {
    if (!socket || !me) return;
    const IDLE_MS = 10 * 60_000;
    let last = Date.now();
    let idle = false;
    const bump = () => {
      last = Date.now();
      if (idle) {
        idle = false;
        socket.emit('presence:active');
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && bump();
    const onConnect = () => {
      last = Date.now();
      idle = false;
    };
    const watched = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'wheel'] as const;
    watched.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    socket.on('connect', onConnect);
    const timer = setInterval(() => {
      if (!idle && Date.now() - last >= IDLE_MS) {
        idle = true;
        socket.emit('presence:idle');
      }
    }, 30_000);
    return () => {
      watched.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      socket.off('connect', onConnect);
      clearInterval(timer);
    };
  }, [socket, me]);

  // Typing fades 5 seconds after the last keystroke.
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};
        for (const [cid, people] of Object.entries(prev)) {
          const alive = Object.fromEntries(Object.entries(people).filter(([, v]) => v.until > now));
          if (Object.keys(alive).length !== Object.keys(people).length) changed = true;
          if (Object.keys(alive).length) next[Number(cid)] = alive as Record<number, { name: string; until: number }>;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const typingNames = useCallback((cid: number) => Object.values(typing[cid] ?? {}).map((v) => v.name), [typing]);

  const totalUnread = useMemo(
    () => conversations.reduce((n, c) => (isMuted(c) ? n : n + (c.unread_count || (c.marked_unread ? 1 : 0))), 0),
    [conversations],
  );

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = totalUnread > 0 ? `(${totalUnread > 99 ? '99+' : totalUnread}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [totalUnread]);

  const value = useMemo(
    () => ({ conversations, isLoading, isError, reload: () => void refetch(), totalUnread, presence, ensurePresence, typingNames, setActiveConversation, markRead }),
    [conversations, isLoading, isError, refetch, totalUnread, presence, ensurePresence, typingNames, setActiveConversation, markRead],
  );

  return (
    <MessengerContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="msg-slide-up pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => {
                navigate(conversationPath(qc.getQueryData<Conversation[]>(msgKeys.conversations), t.conversationId));
                setToasts((prev) => prev.filter((x) => x.id !== t.id));
              }}
            >
              {t.photo ? (
                <Avatar src={t.photo} name={t.title} size="md" />
              ) : (
                <ChatLogo size={40} />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{t.title}</span>
                <span className="block truncate text-xs text-slate-500">{t.text}</span>
              </span>
            </button>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </MessengerContext.Provider>
  );
};
