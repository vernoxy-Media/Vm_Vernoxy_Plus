import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, BellOff, Settings, Check, BellRing, ChevronDown, Loader2, MailOpen, MessageSquarePlus, MessagesSquare, Pin, PinOff, Search, Star, Users, X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { errorMessage, messengerApi } from '../api';
import { msgKeys, useMessenger } from '../MessengerContext';
import type { Conversation, PresenceState } from '../types';
import { conversationTitle, dayLabel, isMuted, listTime, messagePreview } from '../utils';
import { readDraft } from './Composer';
import { ChatLogo } from './ChatLogo';
import { PersonAvatar } from './parts';
import { SettingsModal } from './SettingsModal';

type Filter = 'all' | 'unread' | 'groups' | 'pinned' | 'archived';
const FILTERS: Array<[Filter, string]> = [['all', 'All'], ['unread', 'Unread'], ['groups', 'Groups'], ['pinned', 'Pinned'], ['archived', 'Archived']];

interface Props {
  selectedId: number | null;
  onSelect: (conversationId: number, messageId?: number) => void;
  onOpenDirect: (empId: number) => void;
  onNew: (tab: 'chat' | 'group') => void;
}

export const ConversationList: React.FC<Props> = ({ selectedId, onSelect, onOpenDirect, onNew }) => {
  const { conversations, isLoading, isError, reload, presence, typingNames } = useMessenger();
  const { user } = useAuth();
  const me = user!.emp_id;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [starredView, setStarredView] = useState(false);
  const [, bump] = useState(0);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifAsk, setNotifAsk] = useState(() => 'Notification' in window && Notification.permission === 'default');

  useEffect(() => {
    const on = () => bump((n) => n + 1);
    window.addEventListener('msg-draft', on);
    return () => window.removeEventListener('msg-draft', on);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const myState = presence[me];

  const visible = useMemo(() => {
    const list = conversations.filter((c) => {
      if (filter === 'archived') return c.is_archived;
      if (c.is_archived) return false;
      if (filter === 'unread') return c.unread_count > 0 || c.marked_unread;
      if (filter === 'groups') return c.kind === 'group';
      if (filter === 'pinned') return !!c.pinned_at;
      return true;
    });
    return [...list].sort((a, b) => {
      if (!!a.pinned_at !== !!b.pinned_at) return a.pinned_at ? -1 : 1;
      return +new Date(b.last_message_at) - +new Date(a.last_message_at);
    });
  }, [conversations, filter]);

  const archivedCount = conversations.filter((c) => c.is_archived).length;
  const searching = term.length >= 2;

  const prefs = async (c: Conversation, p: Parameters<typeof messengerApi.setPrefs>[1]) => {
    setMenuFor(null);
    try {
      await messengerApi.setPrefs(c.conversation_id, p);
      qc.invalidateQueries({ queryKey: msgKeys.conversations });
    } catch (e) {
      alert(errorMessage(e));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center gap-1 bg-[#f0f2f5] px-3 py-3">
        <div className="relative">
          <button type="button" onClick={() => setStatusOpen((v) => !v)} aria-haspopup="menu" aria-expanded={statusOpen} aria-label="Set my status" className="flex items-center gap-1 rounded-full p-0.5 hover:bg-slate-200">
            <PersonAvatar name={user!.name} src={user!.profile_picture_url} size={40} presence={{ ...(myState ?? ({} as PresenceState)), online: true }} />
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>
          {statusOpen && <StatusMenu current={myState} name={user!.name} photo={user!.profile_picture_url} onClose={() => setStatusOpen(false)} />}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
          <ChatLogo size={34} />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate bg-gradient-to-r from-slate-900 via-indigo-800 to-indigo-600 bg-clip-text text-[17px] font-extrabold tracking-tight text-transparent">Messenger</h1>
            <p className="truncate text-[11px] font-medium text-slate-500">Vernoxy Pulse</p>
          </div>
        </div>
        <button type="button" onClick={() => setStarredView((v) => !v)} aria-label="Starred messages" aria-pressed={starredView} className={`rounded-full p-2.5 text-slate-600 hover:bg-slate-200 ${starredView ? 'bg-slate-200 text-amber-500' : ''}`}><Star className="h-5 w-5" /></button>
        <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Messenger settings" className="rounded-full p-2.5 text-slate-600 hover:bg-slate-200"><Settings className="h-5 w-5" /></button>
        <button type="button" onClick={() => onNew('group')} aria-label="New group" className="rounded-full p-2.5 text-slate-600 hover:bg-slate-200"><Users className="h-5 w-5" /></button>
        <button type="button" onClick={() => onNew('chat')} aria-label="New chat" className="rounded-full bg-[#4F46E5] p-2.5 text-white shadow-sm hover:bg-[#4338CA]"><MessageSquarePlus className="h-5 w-5" /></button>
      </div>

      {notifAsk && (
        <button type="button" onClick={() => Notification.requestPermission().finally(() => setNotifAsk(false))} className="flex items-center gap-3 bg-sky-50 px-4 py-2.5 text-left text-sm text-sky-800 hover:bg-sky-100">
          <BellRing className="h-5 w-5 shrink-0" />
          <span><span className="font-semibold">Turn on desktop notifications</span><span className="block text-xs text-sky-700">Get notified when a message arrives in the background.</span></span>
        </button>
      )}

      {starredView ? (
        <StarredList onBack={() => setStarredView(false)} onPick={(cid, mid) => { setStarredView(false); onSelect(cid, mid); }} />
      ) : (
        <>
          <div className="px-3 pb-2 pt-2">
            <label className="relative block">
              <span className="sr-only">Search chats and messages</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search or start a new chat" className="h-10 w-full rounded-xl border-0 bg-[#f0f2f5] pl-10 pr-9 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:text-sm" />
              {q && <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>}
            </label>
            {q.trim().length > 0 && q.trim().length < 2 && <p className="px-1 pt-1 text-xs text-slate-500">Please enter at least 2 characters.</p>}
          </div>

          {searching ? (
            <SearchPanel term={term} onSelect={(cid, mid) => { setQ(''); onSelect(cid, mid); }} onOpenDirect={(id) => { setQ(''); onOpenDirect(id); }} />
          ) : (
            <>
              <div className="flex gap-1.5 overflow-x-auto px-3 pb-2" role="tablist" aria-label="Chat filters">
                {FILTERS.map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === key ? 'bg-indigo-100 text-indigo-800' : 'bg-[#f0f2f5] text-slate-500 hover:bg-slate-200'}`}>
                    {label}{key === 'archived' && archivedCount ? ` (${archivedCount})` : ''}
                  </button>
                ))}
              </div>

              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label="Conversations">
                {isLoading && <li className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></li>}
                {isError && conversations.length === 0 && (
                  <li className="flex flex-col items-center gap-3 px-8 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-700">Could not load your chats.</p>
                    <button type="button" onClick={reload} className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338CA]">Retry</button>
                  </li>
                )}
                {!isLoading && !isError && visible.length === 0 && (
                  <li className="flex flex-col items-center gap-3 px-8 py-16 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100"><MessagesSquare className="h-7 w-7" /></span>
                    <p className="text-sm font-semibold text-slate-700">{filter === 'all' ? 'No chats yet' : 'Nothing here'}</p>
                    <p className="text-xs text-slate-500">{filter === 'all' ? 'Start a conversation with a teammate or create a group.' : 'No chats match this filter.'}</p>
                    {filter === 'all' && <button type="button" onClick={() => onNew('chat')} className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338CA]">Start a chat</button>}
                  </li>
                )}
                {visible.map((c) => (
                  <ConversationRow
                    key={c.conversation_id}
                    c={c}
                    me={me}
                    selected={c.conversation_id === selectedId}
                    presence={c.peer ? presence[c.peer.emp_id] : undefined}
                    typing={typingNames(c.conversation_id)}
                    menuOpen={menuFor === c.conversation_id}
                    onMenu={(o) => setMenuFor(o ? c.conversation_id : null)}
                    onSelect={() => onSelect(c.conversation_id)}
                    onPrefs={(p) => prefs(c, p)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};

const ConversationRow: React.FC<{
  c: Conversation;
  me: number;
  selected: boolean;
  presence?: PresenceState;
  typing: string[];
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onSelect: () => void;
  onPrefs: (p: Parameters<typeof messengerApi.setPrefs>[1]) => void;
}> = ({ c, me, selected, presence, typing, menuOpen, onMenu, onSelect, onPrefs }) => {
  const title = conversationTitle(c);
  const muted = isMuted(c);
  const draft = !selected ? readDraft(c.conversation_id).trim() : '';
  const unread = c.unread_count;
  const lm = c.last_message;
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const warm = () => {
    const id = c.conversation_id;
    qc.prefetchQuery({ queryKey: msgKeys.messages(id), queryFn: () => messengerApi.messages(id), staleTime: Infinity });
    qc.prefetchQuery({ queryKey: msgKeys.detail(id), queryFn: () => messengerApi.conversation(id), staleTime: 30_000 });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const out = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onMenu(false);
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [menuOpen, onMenu]);

  const prefix = lm && lm.kind !== 'system' && !lm.deleted ? (lm.sender_id === me ? 'You: ' : c.kind === 'group' && lm.sender_name ? `${lm.sender_name.split(' ')[0]}: ` : '') : '';

  return (
    <li className="relative">
      <div ref={ref} className="group relative">
        <button type="button" onClick={onSelect} onPointerEnter={warm} onFocus={warm} aria-current={selected ? 'true' : undefined} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${selected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}>
          <PersonAvatar name={title} src={c.peer?.photo_url} size={48} presence={presence} group={c.kind === 'group'} />
          <span className="min-w-0 flex-1 border-b border-slate-100 pb-3 pt-0.5 group-last:border-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[15px] font-semibold text-slate-900">{title}</span>
              <time className={`shrink-0 text-xs ${unread > 0 && !muted ? 'font-semibold text-indigo-600' : 'text-slate-500'}`}>{lm ? listTime(lm.created_at) : ''}</time>
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-2">
              <span className={`min-w-0 flex-1 truncate text-sm ${typing.length ? 'font-medium text-indigo-600' : 'text-slate-500'}`}>
                {typing.length ? (c.kind === 'group' ? `${typing[0]} is typing…` : 'typing…') : draft ? (<><span className="font-medium text-red-500">Draft: </span>{draft}</>) : lm ? `${prefix}${messagePreview(lm)}` : 'No messages yet'}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {muted && <BellOff className="h-3.5 w-3.5 text-slate-400" aria-label="Muted" />}
                {c.pinned_at && <Pin className="h-3.5 w-3.5 text-slate-400" aria-label="Pinned" />}
                {(unread > 0 || c.marked_unread) && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${muted ? 'bg-slate-400' : 'bg-[#4F46E5]'}`} aria-label={`${unread || 1} unread`}>
                    {unread > 99 ? '99+' : unread || ''}
                  </span>
                )}
              </span>
            </span>
          </span>
        </button>
        <button type="button" aria-label={`Options for ${title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => onMenu(!menuOpen)} className="absolute bottom-2 right-2 hidden rounded-full bg-white/90 p-1 text-slate-500 shadow-sm hover:bg-white group-hover:block focus:block">
          <ChevronDown className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-3 top-12 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {[
              { icon: c.pinned_at ? PinOff : Pin, label: c.pinned_at ? 'Unpin chat' : 'Pin chat', run: () => onPrefs({ pinned: !c.pinned_at }) },
              { icon: BellOff, label: muted ? 'Unmute' : 'Mute 8 hours', run: () => onPrefs({ mute: muted ? null : '8h' }) },
              { icon: Archive, label: c.is_archived ? 'Unarchive' : 'Archive', run: () => onPrefs({ archived: !c.is_archived }) },
              { icon: MailOpen, label: 'Mark as unread', run: () => onPrefs({ marked_unread: true }) },
            ].map((a) => (
              <button key={a.label} type="button" role="menuitem" onClick={a.run} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><a.icon className="h-4 w-4" />{a.label}</button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
};

const SearchPanel: React.FC<{ term: string; onSelect: (cid: number, mid?: number) => void; onOpenDirect: (empId: number) => void }> = ({ term, onSelect, onOpenDirect }) => {
  const { data, isFetching } = useQuery({ queryKey: ['msg', 'global-search', term], queryFn: () => messengerApi.search(term) });
  const empty = data && !data.messages.length && !data.people.length && !data.groups.length;
  const needle = term.toLowerCase();
  const hl = (text: string) => {
    const i = text.toLowerCase().indexOf(needle);
    return i < 0 ? text : <>{text.slice(Math.max(0, i - 25), i)}<mark className="rounded bg-amber-200 px-0.5">{text.slice(i, i + needle.length)}</mark>{text.slice(i + needle.length)}</>;
  };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
      {isFetching && <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
      {empty && <p className="p-8 text-center text-sm text-slate-500">No results found.</p>}
      {data && data.groups.length > 0 && (
        <section>
          <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">Groups</h3>
          {data.groups.map((g) => (
            <button key={g.conversation_id} type="button" onClick={() => onSelect(g.conversation_id)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
              <PersonAvatar name={g.name} size={40} group showPresence={false} />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{g.name}</span><span className="block text-xs text-slate-500">{g.member_count} members</span></span>
            </button>
          ))}
        </section>
      )}
      {data && data.people.length > 0 && (
        <section>
          <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">People</h3>
          {data.people.map((p) => (
            <button key={p.emp_id} type="button" onClick={() => onOpenDirect(p.emp_id)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
              <PersonAvatar name={p.name} src={p.photo_url} size={40} showPresence={false} />
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{p.name}</span><span className="block truncate text-xs text-slate-500">{p.department ?? p.email}</span></span>
            </button>
          ))}
        </section>
      )}
      {data && data.messages.length > 0 && (
        <section>
          <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">Messages</h3>
          {data.messages.map((m) => (
            <button key={m.message_id} type="button" onClick={() => onSelect(m.conversation_id, m.message_id)} className="block w-full px-4 py-2 text-left hover:bg-slate-50">
              <span className="flex justify-between gap-2 text-xs text-slate-500"><span className="truncate font-medium text-slate-700">{m.conversation_name ?? m.sender_name}</span><span className="shrink-0">{dayLabel(m.created_at)}</span></span>
              <span className="block truncate text-sm text-slate-600"><span className="text-slate-500">{m.sender_name}: </span>{hl(m.body ?? m.file?.name ?? '')}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
};

const StarredList: React.FC<{ onBack: () => void; onPick: (cid: number, mid: number) => void }> = ({ onBack, onPick }) => {
  const { data, isLoading } = useQuery({ queryKey: ['msg', 'starred'], queryFn: messengerApi.starred, staleTime: 0 });
  const groups = useMemo(() => {
    const map = new Map<number, { name: string; items: NonNullable<typeof data> }>();
    for (const m of data ?? []) {
      const g = map.get(m.conversation_id) ?? { name: m.conversation_name ?? m.sender_name ?? 'Chat', items: [] };
      g.items.push(m);
      map.set(m.conversation_id, g);
    }
    return [...map.entries()];
  }, [data]);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Starred messages</button>
      {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
      {!isLoading && groups.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No starred messages. Tap a message’s menu and choose Star.</p>}
      {groups.map(([cid, g]) => (
        <section key={cid}>
          <h3 className="bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.name}</h3>
          {g.items.map((m) => (
            <button key={m.message_id} type="button" onClick={() => onPick(cid, m.message_id)} className="block w-full px-4 py-2.5 text-left hover:bg-slate-50">
              <span className="flex justify-between text-xs text-slate-500"><span className="font-medium">{m.sender_name}</span><span>{dayLabel(m.created_at)}</span></span>
              <span className="block truncate text-sm text-slate-700">{messagePreview({ ...m, file_name: m.file?.name })}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
};

const DURATIONS: Array<[string, number | undefined]> = [['30 minutes', 30], ['1 hour', 60], ['2 hours', 120], ['Today', minutesToMidnight()], ['Until I change it', undefined]];
function minutesToMidnight() {
  const n = new Date();
  return Math.max(1, Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime()) / 60000));
}

const STATUSES = [
  { value: 'auto', label: 'Automatic', hint: 'Online while you are signed in', dot: 'bg-emerald-500' },
  { value: 'available', label: 'Available', hint: 'Ready to chat', dot: 'bg-emerald-500' },
  { value: 'busy', label: 'Busy', hint: 'Notifications still shown', dot: 'bg-red-500' },
  { value: 'dnd', label: 'Do not disturb', hint: 'People see your notifications are paused', dot: 'bg-red-600' },
] as const;
const PRESETS = [
  { emoji: '📅', text: 'In a meeting' },
  { emoji: '🚗', text: 'Commuting' },
  { emoji: '🏠', text: 'Working remotely' },
  { emoji: '🤒', text: 'Out sick' },
  { emoji: '☕', text: 'On a break' },
];

/** Availability and a short "about" line, kept small enough to fit without scrolling. */
const StatusMenu: React.FC<{ current?: PresenceState; name: string; photo?: string | null; onClose: () => void }> = ({ current, name, photo, onClose }) => {
  const [status, setStatus] = useState<PresenceState['status']>(current?.status ?? 'auto');
  const [text, setText] = useState(current?.status_text ?? '');
  const [duration, setDuration] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  const save = async () => {
    setBusy(true);
    try {
      await messengerApi.setStatus(status, text.trim() || undefined, status === 'auto' && !text.trim() ? undefined : DURATIONS[duration][1]);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  const chosen = STATUSES.find((o) => o.value === status)!;
  return (
    <div ref={ref} role="dialog" aria-label="My status" className="msg-pop absolute left-0 top-12 z-40 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center gap-3 bg-[#f0f2f5] px-4 py-2.5">
        <PersonAvatar name={name} src={photo} size={40} presence={{ ...(current ?? ({} as PresenceState)), online: true, status }} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{text.trim() || chosen.label}</p>
        </div>
      </div>

      <div className="max-h-[70dvh] space-y-3 overflow-y-auto px-4 py-3">
        <section>
          <div role="radiogroup" aria-label="Availability" className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={status === o.value}
                onClick={() => setStatus(o.value)}
                title={o.hint}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-left text-sm transition ${status === o.value ? 'border-[#4F46E5] bg-[#4F46E5]/5 font-semibold text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${o.dot}`} />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {status === o.value && <Check className="h-4 w-4 shrink-0 text-[#4F46E5]" />}
              </button>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-xs text-slate-500">{chosen.hint}</p>
        </section>

        <section>
          <label htmlFor="status-text" className="mb-1 block text-xs font-semibold text-[#4F46E5]">About</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
            <input
              id="status-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={100}
              placeholder="Add a status message"
              className="h-10 min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
            />
            {text ? (
              <button type="button" aria-label="Clear status message" onClick={() => setText('')} className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{text.length}/100</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick status messages">
            {PRESETS.map((p) => {
              const on = text.trim() === p.text;
              return (
                <button
                  key={p.text}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setText(on ? '' : p.text)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-[#4F46E5] bg-[#4F46E5]/10 font-semibold text-[#4F46E5]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <span aria-hidden>{p.emoji}</span>
                  {p.text}
                </button>
              );
            })}
          </div>
        </section>

        <label htmlFor="status-for" className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-800">Clear after</span>
          <select id="status-for" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-[#4F46E5] focus:outline-none">
            {DURATIONS.map(([l], i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex gap-2 border-t border-slate-100 p-3">
        <button type="button" onClick={onClose} className="flex-1 rounded-full bg-slate-100 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Cancel</button>
        <button type="button" disabled={busy} onClick={save} className="flex-1 rounded-full bg-[#4F46E5] py-2 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
};
