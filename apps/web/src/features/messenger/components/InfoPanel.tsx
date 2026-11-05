import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, BellOff, Bell, Check, Crown, ExternalLink, FileText, Loader2, LogOut, Pencil, Pin, PinOff, Plus, Search, ShieldOff, UserMinus, X, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { errorMessage, messengerApi, type MuteChoice } from '../api';
import { msgKeys, useMessenger } from '../MessengerContext';
import type { Conversation, ConversationDetail, Message, Person } from '../types';
import { conversationTitle, formatSize, isMuted, presenceLabel, tokenize } from '../utils';
import { Lightbox, Modal, PersonAvatar, useFileUrl } from './parts';

interface Props {
  conversation: Conversation;
  onClose: () => void;
  onOpenDirect: (empId: number) => void;
  onLeft: () => void;
}

const row = 'flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50';

const MediaTile: React.FC<{ m: Message; onOpen: () => void }> = ({ m, onOpen }) => {
  const { url } = useFileUrl(m.message_id);
  return (
    <button type="button" onClick={onOpen} className="aspect-square overflow-hidden rounded-lg bg-slate-100" aria-label={m.file?.name}>
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </button>
  );
};

export const InfoPanel: React.FC<Props> = ({ conversation: conv, onClose, onOpenDirect, onLeft }) => {
  const { user } = useAuth();
  const me = user!.emp_id;
  const qc = useQueryClient();
  const { presence } = useMessenger();
  const [tab, setTab] = useState<'media' | 'files' | 'links'>('media');
  const [memberQ, setMemberQ] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conv.name ?? '');
  const [desc, setDesc] = useState(conv.description ?? '');
  const [adding, setAdding] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'leave' | 'close' | null>(null);
  const [muteOpen, setMuteOpen] = useState(false);

  const id = conv.conversation_id;
  const isGroup = conv.kind === 'group';
  const title = conversationTitle(conv);
  const { data: detail } = useQuery<ConversationDetail>({ queryKey: msgKeys.detail(id), queryFn: () => messengerApi.conversation(id), staleTime: 30_000 });
  const { data: files, isLoading: loadingFiles } = useQuery({ queryKey: ['msg', 'files', id], queryFn: () => messengerApi.messages(id, { files: true }), staleTime: 15_000 });
  const { data: linkMsgs } = useQuery({ queryKey: ['msg', 'links', id], queryFn: () => messengerApi.messages(id, { q: 'http' }), enabled: tab === 'links', staleTime: 15_000 });

  const media = useMemo(() => [...(files?.messages ?? [])].filter((m) => m.file?.mime.startsWith('image/')).reverse(), [files]);
  const docs = useMemo(() => [...(files?.messages ?? [])].filter((m) => !m.file?.mime.startsWith('image/')).reverse(), [files]);
  const links = useMemo(
    () => [...(linkMsgs?.messages ?? [])].reverse().flatMap((m) => tokenize(m.body ?? '').filter((t) => t.type === 'link').map((t) => ({ url: t.value, m }))),
    [linkMsgs],
  );
  const members = (detail?.members ?? []).filter((m) => m.name.toLowerCase().includes(memberQ.trim().toLowerCase()));
  const peerPresence = conv.peer ? presence[conv.peer.emp_id] : undefined;
  const muted = isMuted(conv);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: msgKeys.conversations });
    qc.invalidateQueries({ queryKey: msgKeys.detail(id) });
  };
  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    try {
      await fn();
      refresh();
      after?.();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const mute = (choice: MuteChoice) => {
    setMuteOpen(false);
    return run(() => messengerApi.setPrefs(id, { mute: choice }));
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-white" aria-label="Chat info">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-[#f0f2f5] px-3 py-3">
        <button type="button" aria-label="Close info" onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        <h2 className="text-base font-semibold text-slate-900">{isGroup ? 'Group info' : 'Contact info'}</h2>
      </div>

      <div className="flex flex-col items-center gap-2 border-b-8 border-slate-100 px-6 py-6 text-center">
        <PersonAvatar name={title} src={conv.peer?.photo_url} size={96} presence={peerPresence} group={isGroup} />
        {editing ? (
          <div className="w-full space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Group name" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} aria-label="Description" placeholder="Group description" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => run(() => messengerApi.updateGroup(id, { name, description: desc }), () => setEditing(false))} className="flex-1 rounded-xl bg-[#4F46E5] py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            {isGroup ? (
              <p className="text-sm text-slate-500">Group · {conv.member_count} members</p>
            ) : (
              <>
                <p className="text-sm text-slate-500">{conv.peer?.email}</p>
                {conv.peer?.department && <p className="text-sm text-slate-500">{conv.peer.department}</p>}
                <p className="text-sm text-indigo-600">{presenceLabel(peerPresence)}</p>
                {peerPresence?.status_text && <p className="text-sm italic text-slate-500">“{peerPresence.status_text}”</p>}
              </>
            )}
            {isGroup && conv.description && <p className="whitespace-pre-wrap text-sm text-slate-600">{conv.description}</p>}
            {isGroup && conv.my_is_admin && !conv.is_closed && (
              <button type="button" onClick={() => { setName(conv.name ?? ''); setDesc(conv.description ?? ''); setEditing(true); }} className="flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit group</button>
            )}
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="border-b-8 border-slate-100">
        <div className="relative">
          <button type="button" className={row} onClick={() => (muted ? mute(null) : setMuteOpen((v) => !v))}>
            {muted ? <Bell className="h-5 w-5 text-slate-500" /> : <BellOff className="h-5 w-5 text-slate-500" />}
            <span className="flex-1">{muted ? 'Unmute notifications' : 'Mute notifications'}</span>
          </button>
          {muteOpen && (
            <div className="mx-5 mb-2 overflow-hidden rounded-xl border border-slate-200">
              {([['8h', '8 hours'], ['1w', '1 week'], ['always', 'Always']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => mute(v)} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50">{l}</button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className={row} onClick={() => run(() => messengerApi.setPrefs(id, { pinned: !conv.pinned_at }))}>
          {conv.pinned_at ? <PinOff className="h-5 w-5 text-slate-500" /> : <Pin className="h-5 w-5 text-slate-500" />}
          {conv.pinned_at ? 'Unpin chat' : 'Pin chat'}
        </button>
        <button type="button" className={row} onClick={() => run(() => messengerApi.setPrefs(id, { archived: !conv.is_archived }))}>
          <Archive className="h-5 w-5 text-slate-500" />
          {conv.is_archived ? 'Unarchive chat' : 'Archive chat'}
        </button>
        {isGroup && conv.my_is_admin && !conv.is_closed && (
          <label className={`${row} cursor-pointer`}>
            <ShieldOff className="h-5 w-5 text-slate-500" />
            <span className="flex-1">Only admins can send messages</span>
            <input type="checkbox" checked={conv.only_admins_post} onChange={(e) => run(() => messengerApi.updateGroup(id, { only_admins_post: e.target.checked }))} className="h-5 w-5 accent-indigo-600" />
          </label>
        )}
      </div>

      {/* Shared media */}
      <div className="border-b-8 border-slate-100">
        <div className="flex border-b border-slate-100">
          {(['media', 'files', 'links'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-semibold capitalize ${tab === t ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-slate-500'}`}>
              {t}{t === 'media' && media.length ? ` (${media.length})` : t === 'files' && docs.length ? ` (${docs.length})` : ''}
            </button>
          ))}
        </div>
        <div className="p-3">
          {loadingFiles && <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />}
          {tab === 'media' && (media.length ? (
            <div className="grid grid-cols-3 gap-1.5">{media.map((m, i) => <MediaTile key={m.message_id} m={m} onOpen={() => setViewer(i)} />)}</div>
          ) : !loadingFiles && <p className="py-4 text-center text-sm text-slate-500">No media shared yet.</p>)}
          {tab === 'files' && (docs.length ? (
            <ul className="divide-y divide-slate-100">
              {docs.map((m) => (
                <li key={m.message_id} className="flex items-center gap-3 py-2">
                  <FileText className="h-8 w-8 shrink-0 text-rose-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{m.file?.name}</span>
                    <span className="block text-xs text-slate-500">{formatSize(m.file?.size ?? 0)} · {m.sender_name} · {new Date(m.created_at).toLocaleDateString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : !loadingFiles && <p className="py-4 text-center text-sm text-slate-500">No files shared yet.</p>)}
          {tab === 'links' && (links.length ? (
            <ul className="divide-y divide-slate-100">
              {links.map((l, i) => (
                <li key={i} className="py-2">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all text-sm text-sky-700 hover:underline"><ExternalLink className="h-4 w-4 shrink-0" />{l.url}</a>
                  <span className="text-xs text-slate-500">{l.m.sender_name} · {new Date(l.m.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-4 text-center text-sm text-slate-500">No links shared yet.</p>)}
        </div>
      </div>

      {/* Members */}
      {isGroup && (
        <div className="border-b-8 border-slate-100">
          <div className="flex items-center justify-between px-5 pb-1 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">{conv.member_count} members</h3>
          </div>
          <div className="px-4 pb-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder="Search members" aria-label="Search members" className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
            </label>
          </div>
          {conv.my_is_admin && !conv.is_closed && (
            <button type="button" onClick={() => setAdding(true)} className={`${row} text-indigo-700`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100"><Plus className="h-5 w-5" /></span>
              <span className="font-semibold">Add members</span>
            </button>
          )}
          <ul>
            {members.map((m) => (
              <li key={m.emp_id} className="group flex items-center gap-3 px-5 py-2 hover:bg-slate-50">
                <button type="button" disabled={m.emp_id === me} onClick={() => onOpenDirect(m.emp_id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={m.emp_id === me ? 'You' : `Message ${m.name}`}>
                  <PersonAvatar name={m.name} src={m.photo_url} size={40} presence={presence[m.emp_id]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{m.emp_id === me ? 'You' : m.name}</span>
                    <span className="block truncate text-xs text-slate-500">{[m.department, presence[m.emp_id]?.status_text].filter(Boolean).join(' · ') || m.email}</span>
                  </span>
                  {m.is_admin && <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"><Crown className="h-3 w-3" />Admin</span>}
                </button>
                {conv.my_is_admin && !conv.is_closed && m.emp_id !== me && (
                  <span className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button type="button" title={m.is_admin ? 'Remove admin' : 'Make group admin'} aria-label={m.is_admin ? `Remove admin from ${m.name}` : `Make ${m.name} admin`} onClick={() => run(() => messengerApi.setAdmin(id, m.emp_id, !m.is_admin))} className="rounded-full p-2 text-slate-500 hover:bg-slate-200"><Crown className="h-4 w-4" /></button>
                    <button type="button" title="Remove from group" aria-label={`Remove ${m.name}`} onClick={() => run(() => messengerApi.removeMember(id, m.emp_id))} className="rounded-full p-2 text-red-500 hover:bg-red-50"><UserMinus className="h-4 w-4" /></button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isGroup && (
        <div className="pb-6">
          {confirm ? (
            <div className="space-y-2 p-5">
              <p className="text-sm text-slate-700">{confirm === 'leave' ? 'Leave this group? You will no longer see its messages.' : 'Close this group? It becomes read-only for everyone.'}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="button" onClick={() => run(() => (confirm === 'leave' ? messengerApi.leave(id) : messengerApi.close(id)), () => { setConfirm(null); if (confirm === 'leave') onLeft(); })} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white">{confirm === 'leave' ? 'Leave' : 'Close group'}</button>
              </div>
            </div>
          ) : (
            <>
              {!conv.is_closed && <button type="button" onClick={() => setConfirm('leave')} className={`${row} text-red-600`}><LogOut className="h-5 w-5" /> Leave group</button>}
              {conv.my_is_admin && !conv.is_closed && <button type="button" onClick={() => setConfirm('close')} className={`${row} text-red-600`}><XCircle className="h-5 w-5" /> Close group</button>}
            </>
          )}
        </div>
      )}

      {adding && <AddMembersModal conversationId={id} existing={(detail?.members ?? []).map((m) => m.emp_id)} onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
      {viewer !== null && media[viewer] && <Lightbox items={media} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </aside>
  );
};

const AddMembersModal: React.FC<{ conversationId: number; existing: number[]; onClose: () => void; onDone: () => void }> = ({ conversationId, existing, onClose, onDone }) => {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data = [] } = useQuery({ queryKey: ['msg', 'directory', q], queryFn: () => messengerApi.directory(q) });
  const list = data.filter((p) => !existing.includes(p.emp_id));
  return (
    <Modal
      title="Add members"
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="button" disabled={!picked.length || busy} onClick={async () => { setBusy(true); try { await messengerApi.addMembers(conversationId, picked.map((p) => p.emp_id)); onDone(); } catch (e) { setError(errorMessage(e)); setBusy(false); } }} className="w-full rounded-xl bg-[#4F46E5] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Add{picked.length ? ` (${picked.length})` : ''}
          </button>
        </div>
      }
    >
      <div className="px-4 py-3">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employees" aria-label="Search employees" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base focus:border-indigo-500 sm:text-sm focus:outline-none" />
      </div>
      <ul className="px-2 pb-3">
        {list.map((p) => {
          const on = picked.some((x) => x.emp_id === p.emp_id);
          return (
            <li key={p.emp_id}>
              <button type="button" onClick={() => setPicked((l) => (on ? l.filter((x) => x.emp_id !== p.emp_id) : [...l, p]))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                <PersonAvatar name={p.name} src={p.photo_url} size={40} showPresence={false} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.name}</span><span className="block truncate text-xs text-slate-500">{p.department}</span></span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};
