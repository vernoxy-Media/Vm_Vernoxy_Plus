import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckCheck, Loader2, Search, Users } from 'lucide-react';
import { errorMessage, messengerApi } from '../api';
import { useMessenger } from '../MessengerContext';
import type { Conversation, Message, Person } from '../types';
import { DELETE_WINDOW_MINUTES } from '../types';
import { conversationTitle, withinMinutes } from '../utils';
import { Modal, PersonAvatar } from './parts';

const btn = 'rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export const DeleteDialog: React.FC<{
  message: Message;
  conversation: Conversation;
  me: number;
  onClose: () => void;
  onDelete: (mode: 'me' | 'everyone') => void;
}> = ({ message, conversation, me, onClose, onDelete }) => {
  const own = message.sender_id === me;
  const everyone =
    !message.deleted &&
    !message.pending &&
    ((own && withinMinutes(message.created_at, DELETE_WINDOW_MINUTES)) || (conversation.kind === 'group' && conversation.my_is_admin));
  return (
    <Modal title="Delete message?" onClose={onClose}>
      <div className="space-y-2 p-5">
        <p className="text-sm text-slate-600">
          {everyone ? 'Choose how you want to delete this message.' : 'This removes the message from your view only.'}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          {everyone && (
            <button type="button" onClick={() => onDelete('everyone')} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
              {own ? 'Delete for everyone' : 'Remove for everyone (admin)'}
            </button>
          )}
          <button type="button" onClick={() => onDelete('me')} className={`${btn} ${everyone ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-red-600 text-white hover:bg-red-700'}`}>
            Delete for me
          </button>
          <button type="button" onClick={onClose} className={`${btn} text-slate-600 hover:bg-slate-100`}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
};

export const ForwardDialog: React.FC<{ messageIds: number[]; onClose: () => void; onDone: () => void }> = ({ messageIds, onClose, onDone }) => {
  const { conversations } = useMessenger();
  const [picked, setPicked] = useState<number[]>([]);
  const [q, setQ] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(
    () =>
      conversations.filter((c) => !c.is_closed && conversationTitle(c).toLowerCase().includes(q.trim().toLowerCase())),
    [conversations, q],
  );

  const toggle = (id: number) =>
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 5) {
        setError('You can forward to up to 5 conversations at a time.');
        return p;
      }
      setError(null);
      return [...p, id];
    });

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await messengerApi.forward(messageIds, picked, comment.trim() || undefined);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Forward ${messageIds.length} message${messageIds.length > 1 ? 's' : ''}`}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (optional)" aria-label="Comment" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
          <button type="button" disabled={!picked.length || busy} onClick={send} className={`${btn} w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]`}>
            {busy ? 'Forwarding…' : `Forward${picked.length ? ` to ${picked.length}` : ''}`}
          </button>
        </div>
      }
    >
      <div className="sticky top-0 bg-white px-4 pt-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" aria-label="Search chats" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
        </label>
      </div>
      <ul className="p-2">
        {list.map((c) => {
          const on = picked.includes(c.conversation_id);
          return (
            <li key={c.conversation_id}>
              <button type="button" onClick={() => toggle(c.conversation_id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                <PersonAvatar name={conversationTitle(c)} src={c.peer?.photo_url} size={40} showPresence={false} group={c.kind === 'group'} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{conversationTitle(c)}</span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No chats found.</li>}
      </ul>
    </Modal>
  );
};

export const InfoDialog: React.FC<{ message: Message; conversation: Conversation; onClose: () => void }> = ({ message, conversation, onClose }) => {
  const { data, isLoading } = useQuery({ queryKey: ['msg', 'info', message.message_id], queryFn: () => messengerApi.info(message.message_id) });
  const read = (data ?? []).filter((m) => m.read);
  const delivered = (data ?? []).filter((m) => !m.read && m.delivered);
  const sent = (data ?? []).filter((m) => !m.delivered);
  const section = (label: string, icon: React.ReactNode, list: typeof read) =>
    list.length > 0 && (
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{icon}{label}</h3>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {list.map((m) => <li key={m.emp_id} className="px-3 py-2 text-sm text-slate-800">{m.name}</li>)}
        </ul>
      </section>
    );
  return (
    <Modal title="Message info" onClose={onClose}>
      <div className="space-y-4 p-5">
        <p className="rounded-xl bg-[#e0e7ff] p-3 text-sm text-slate-800">{message.body ?? message.file?.name}</p>
        <p className="text-xs text-slate-500">Sent {new Date(message.created_at).toLocaleString()}</p>
        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <>
            {section(conversation.kind === 'group' ? 'Read by' : 'Read', <CheckCheck className="h-4 w-4 text-sky-500" />, read)}
            {section('Delivered to', <CheckCheck className="h-4 w-4 text-slate-400" />, delivered)}
            {section('Sent, not yet delivered to', <Check className="h-4 w-4 text-slate-400" />, sent)}
            {data?.length === 0 && <p className="text-sm text-slate-500">No other members.</p>}
          </>
        )}
      </div>
    </Modal>
  );
};

/** Pick one person for a chat, or several for a group. */
export const NewChatModal: React.FC<{
  initialTab?: 'chat' | 'group';
  onClose: () => void;
  onOpenConversation: (id: number) => void;
}> = ({ initialTab = 'chat', onClose, onOpenConversation }) => {
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'members' | 'details'>('members');

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: people = [], isFetching } = useQuery({
    queryKey: ['msg', 'directory', debounced],
    queryFn: () => messengerApi.directory(debounced),
    staleTime: 30_000,
  });

  const openChat = async (p: Person) => {
    setBusy(true);
    try {
      const c = await messengerApi.openDirect(p.emp_id);
      onOpenConversation(c.conversation_id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const createGroup = async () => {
    setError(null);
    const n = name.trim();
    if (!n) return setError('Please enter a group name.');
    if (n.length < 3 || n.length > 60) return setError('Group name must be 3 to 60 characters.');
    if (!picked.length) return setError('Please add at least one member.');
    setBusy(true);
    try {
      const c = await messengerApi.createGroup({ name: n, description: description.trim() || undefined, member_ids: picked.map((p) => p.emp_id) });
      onOpenConversation(c.conversation_id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const togglePick = (p: Person) => setPicked((l) => (l.some((x) => x.emp_id === p.emp_id) ? l.filter((x) => x.emp_id !== p.emp_id) : [...l, p]));

  return (
    <Modal
      title={tab === 'chat' ? 'New chat' : step === 'members' ? 'Add group members' : 'New group'}
      onClose={onClose}
      footer={
        tab === 'group' ? (
          <div className="space-y-2">
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {step === 'members' ? (
              <button type="button" disabled={!picked.length} onClick={() => { setError(null); setStep('details'); }} className={`${btn} w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]`}>
                Next{picked.length ? ` (${picked.length})` : ''}
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('members')} className={`${btn} flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200`}>Back</button>
                <button type="button" disabled={busy} onClick={createGroup} className={`${btn} flex-1 bg-[#4F46E5] text-white hover:bg-[#4338CA]`}>{busy ? 'Creating…' : 'Create group'}</button>
              </div>
            )}
          </div>
        ) : (
          error && <p role="alert" className="text-sm text-red-600">{error}</p>
        )
      }
    >
      <div className="flex gap-1 px-4 pt-3">
        {(['chat', 'group'] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setError(null); setStep('members'); }} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${tab === t ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-slate-100 text-slate-500'}`}>
            {t === 'chat' ? 'New chat' : 'New group'}
          </button>
        ))}
      </div>

      {tab === 'group' && step === 'details' ? (
        <div className="space-y-3 p-5">
          <label className="block text-sm font-medium text-slate-700">
            Group name
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description <span className="font-normal text-slate-400">(optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
          </label>
          <p className="text-xs text-slate-500">{picked.length} member{picked.length > 1 ? 's' : ''}: {picked.map((p) => p.name).join(', ')}</p>
        </div>
      ) : (
        <>
          {tab === 'group' && picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {picked.map((p) => (
                <button key={p.emp_id} type="button" onClick={() => togglePick(p)} className="flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-2 text-xs font-medium text-indigo-800 hover:bg-indigo-100" aria-label={`Remove ${p.name}`}>
                  {p.name} <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}
          <div className="px-4 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, department" aria-label="Search employees" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
            </label>
          </div>
          <ul className="px-2 pb-3">
            {people.map((p) => {
              const on = picked.some((x) => x.emp_id === p.emp_id);
              return (
                <li key={p.emp_id}>
                  <button type="button" disabled={busy} onClick={() => (tab === 'chat' ? openChat(p) : togglePick(p))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                    <PersonAvatar name={p.name} src={p.photo_url} size={40} showPresence={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
                      <span className="block truncate text-xs text-slate-500">{[p.department, p.email].filter(Boolean).join(' · ')}</span>
                    </span>
                    {tab === 'group' && (
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {!isFetching && people.length === 0 && (
              <li className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500"><Users className="h-6 w-6 text-slate-300" />No employees found.</li>
            )}
          </ul>
        </>
      )}
    </Modal>
  );
};
