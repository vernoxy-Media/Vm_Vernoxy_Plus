import React, { useMemo, useRef, useState } from 'react';
import { ArrowDownUp, Loader2, MessageSquare } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import type { ProjectDiscussionItem, ProjectMember } from '../types';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const Avatar: React.FC<{ name: string; id?: number; src?: string | null; size?: number }> = ({ name, id = 0, src, size = 32 }) => (
  <JiraAvatar name={name} id={id} src={src} size={size} />
);

/** "5 minutes ago", "yesterday", or the date once it is older than a week. */
const ago = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface ProjectCommentsProps {
  /** Section heading; pass null to hide it (for example inside an issue). */
  heading?: string | null;
  comments: ProjectDiscussionItem[];
  members: ProjectMember[];
  currentUserId?: number;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  onSend: (message: string, taggedEmployeeIds: number[]) => Promise<void>;
}

/** Project discussion in the shape of Jira's comment section: a composer on top, comments below. */
export const ProjectComments: React.FC<ProjectCommentsProps> = ({ heading = 'Discussion', comments, members, currentUserId, currentUserName = 'You', currentUserAvatar, onSend }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newestFirst, setNewestFirst] = useState(true);
  const [pick, setPick] = useState(0);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const people = useMemo(() => Array.from(new Map(members.map((m) => [m.employee_id, m])).values()), [members]);
  const byId = useMemo(() => new Map(people.map((m) => [m.employee_id, m])), [people]);

  /** The @name being typed at the end of the text, if any. */
  const mention = useMemo(() => {
    const m = /(^|\s)@([\w.-]*(?:\s[\w.-]*)?)$/.exec(text);
    return m ? m[2] : null;
  }, [text]);
  const suggestions = useMemo(() => {
    if (mention === null) return [];
    const q = mention.toLowerCase();
    return people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mention, people]);

  const choose = (name: string) => {
    setText((cur) => cur.replace(/@[\w.-]*(?:\s[\w.-]*)?$/, `@${name} `));
    setPick(0);
    boxRef.current?.focus();
  };

  const submit = async () => {
    const message = text.trim();
    if (!message || busy) return;
    const tagged = people.filter((p) => message.toLowerCase().includes(`@${p.name.toLowerCase()}`)).map((p) => p.employee_id);
    setBusy(true);
    setError(null);
    try {
      await onSend(message, tagged);
      setText('');
      setOpen(false);
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      setError(e?.detail || e?.message || 'Could not save your comment. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setText('');
    setError(null);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPick((i) => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPick((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(suggestions[pick]?.name ?? suggestions[0].name); return; }
    }
    if (e.key === 'Escape') cancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
  };

  /** Comment text with each @mention highlighted the way Jira does. */
  const withMentions = (message: string) => {
    if (!people.length) return message;
    const names = [...people].map((p) => p.name).sort((a, b) => b.length - a.length).map(escapeRe);
    const re = new RegExp(`(@(?:${names.join('|')}))`, 'gi');
    return message.split(re).map((part, i) =>
      i % 2 === 1 ? <span key={i} className="rounded-[3px] bg-[color:var(--ac-50,#DEEBFF)] px-1 font-medium text-[color:var(--ac-main,#0052CC)]">{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>,
    );
  };

  const sorted = useMemo(
    () => [...comments].sort((a, b) => (newestFirst ? +new Date(b.created_at) - +new Date(a.created_at) : +new Date(a.created_at) - +new Date(b.created_at))),
    [comments, newestFirst],
  );

  return (
    <section aria-label={heading ?? 'Comments'} className="mx-auto max-w-3xl">
      {(heading !== null || comments.length > 1) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {heading !== null ? (
            <h3 className="text-[20px] font-medium text-[#172B4D]">
              {heading} <span className="ml-1 text-[14px] font-normal text-[#5E6C84]">{comments.length}</span>
            </h3>
          ) : <span />}
          {comments.length > 1 && (
            <button type="button" onClick={() => setNewestFirst((v) => !v)} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-2 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
              <ArrowDownUp className="h-4 w-4" /> {newestFirst ? 'Newest first' : 'Oldest first'}
            </button>
          )}
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-3">
        <Avatar name={currentUserName} id={currentUserId} src={currentUserAvatar} />
        <div className="relative min-w-0 flex-1">
          {!open ? (
            <button
              type="button"
              onClick={() => { setOpen(true); window.setTimeout(() => boxRef.current?.focus(), 0); }}
              className="h-8 w-full cursor-text rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2.5 text-left text-[14px] text-[#7A869A] transition hover:bg-[#EBECF0]"
            >
              Add a comment…
            </button>
          ) : (
            <>
              <textarea
                ref={boxRef}
                value={text}
                onChange={(e) => { setText(e.target.value); setPick(0); }}
                onKeyDown={onKeyDown}
                rows={3}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className="block w-full resize-y rounded-[3px] border-2 border-[color:var(--ac-400,#4C9AFF)] bg-white p-2.5 text-[14px] leading-5 text-[#172B4D] placeholder:text-[#7A869A] focus:outline-none"
              />
              {suggestions.length > 0 && (
                <ul role="listbox" aria-label="Mention a teammate" className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-[3px] bg-white py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
                  {suggestions.map((p, i) => (
                    <li key={p.employee_id} role="option" aria-selected={i === pick}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); choose(p.name); }} className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[14px] ${i === pick ? 'bg-[color:var(--ac-50,#DEEBFF)]' : 'hover:bg-[#F4F5F7]'}`}>
                        <Avatar name={p.name} id={p.employee_id} src={p.profile_picture} size={24} />
                        <span className="truncate text-[#172B4D]">{p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {error && <p role="alert" className="mt-2 rounded-[3px] bg-[#FFEBE6] px-2.5 py-1.5 text-[13px] text-[#BF2600]">{error}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" disabled={!text.trim() || busy} onClick={submit} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-3 text-[14px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)] disabled:cursor-not-allowed disabled:opacity-50">
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                </button>
                <button type="button" onClick={cancel} className="h-8 cursor-pointer rounded-[3px] px-3 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">Cancel</button>
                <span className="hidden text-[12px] text-[#5E6C84] sm:inline">Pro tip: type <b>@</b> to mention a teammate · Ctrl+Enter to save</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comments */}
      {sorted.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[3px] bg-[#F4F5F7] px-4 py-10 text-center">
          <MessageSquare className="mb-2 h-9 w-9 text-[#97A0AF]" />
          <p className="text-[14px] font-medium text-[#172B4D]">No comments yet</p>
          <p className="mt-0.5 text-[13px] text-[#5E6C84]">Start the discussion, and mention a teammate with @ to notify them.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-5">
          {sorted.map((c) => {
            const mine = c.sender_emp_id === currentUserId;
            const who = byId.get(c.sender_emp_id);
            return (
              <li key={c.message_id} className="flex gap-3">
                <Avatar name={c.sender_name} id={c.sender_emp_id} src={c.sender_avatar ?? who?.profile_picture} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-5">
                    <b className="font-semibold text-[#172B4D]">{c.sender_name}</b>
                    {mine && <span className="ml-1.5 rounded-[3px] bg-[#DFE1E6] px-1 py-px text-[11px] font-bold uppercase text-[#42526E]">You</span>}
                    <span className="ml-2 text-[12px] text-[#5E6C84]" title={new Date(c.created_at).toLocaleString('en-GB')}>{ago(c.created_at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-6 text-[#172B4D]">{withMentions(c.message)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
