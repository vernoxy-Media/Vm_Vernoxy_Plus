import React, { useMemo, useRef, useState } from 'react';
import { ArrowDownUp, CheckSquare, ChevronDown, Loader2, MessageSquare, Paperclip, Search } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import type { DiscussionAttachment, ProjectDiscussionItem, ProjectMember } from '../types';
import { AttachmentList, ATTACH_ACCEPT, FILES_ONLY_TEXT, MAX_FILES, PendingFiles, fileProblem } from './DiscussionFiles';

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

const PAGE = 15;
/** A comment written on an issue is saved as "[TSK-2026-0021] text"; the key tells which issue it belongs to. */
const KEY_RE = /^\[([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\]\s*/;
const splitKey = (m: string) => {
  const x = KEY_RE.exec(m);
  return x ? { key: x[1], text: m.slice(x[0].length) } : { key: null as string | null, text: m };
};
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** A long comment is folded after a few lines, with "Show more", so one long update does not push the rest away. */
const Folded: React.FC<{ children: React.ReactNode; long: boolean }> = ({ children, long }) => {
  const [more, setMore] = useState(false);
  return (
    <div>
      <div className={long && !more ? 'max-h-[9.5rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]' : ''}>{children}</div>
      {long && (
        <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 cursor-pointer text-[13px] font-medium text-[color:var(--ac-main,#0052CC)] hover:underline">
          {more ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

interface ProjectCommentsProps {
  /** Open the issue a comment is about (project discussion only). */
  onOpenIssue?: (key: string) => void;
  /** Section heading; pass null to hide it (for example inside an issue). */
  heading?: string | null;
  comments: ProjectDiscussionItem[];
  members: ProjectMember[];
  currentUserId?: number;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  onSend: (message: string, taggedEmployeeIds: number[], attachments: DiscussionAttachment[]) => Promise<void>;
  /** Uploads one file; leave out to hide the attach button. */
  onUploadFile?: (file: File) => Promise<DiscussionAttachment>;
}

/** Project discussion in the shape of Jira's comment section: a composer on top, comments below. */
export const ProjectComments: React.FC<ProjectCommentsProps> = ({ heading = 'Discussion', comments, members, currentUserId, currentUserName = 'You', currentUserAvatar, onSend, onUploadFile, onOpenIssue }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newestFirst, setNewestFirst] = useState(true);
  const [pick, setPick] = useState(0);
  const [caret, setCaret] = useState(0);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'general' | 'issues'>('all');
  const [limit, setLimit] = useState(PAGE);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const people = useMemo(() => Array.from(new Map(members.map((m) => [m.employee_id, m])).values()), [members]);
  const byId = useMemo(() => new Map(people.map((m) => [m.employee_id, m])), [people]);

  /** The @name being typed right before the cursor (anywhere in the text, not only at the end), if any. */
  const mentionMatch = useMemo(() => /(^|\s)@([\w.-]*(?:[ ][\w.-]*)?)$/.exec(text.slice(0, caret)), [text, caret]);
  const mention = mentionMatch ? mentionMatch[2] : null;
  const suggestions = useMemo(() => {
    if (mention === null) return [];
    const q = mention.toLowerCase();
    return people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mention, people]);

  const choose = (name: string) => {
    if (!mentionMatch) return;
    const start = mentionMatch.index + mentionMatch[1].length;
    const insert = `@${name} `;
    const next = text.slice(0, start) + insert + text.slice(caret);
    const pos = start + insert.length;
    setText(next);
    setCaret(pos);
    setPick(0);
    const box = boxRef.current;
    box?.focus();
    // Put the cursor right after the inserted name once React has rendered the new text.
    window.setTimeout(() => box?.setSelectionRange(pos, pos), 0);
  };

  /** Adds picked, pasted or dropped files to the comment, skipping (and telling about) the ones that cannot be sent. */
  const addFiles = (picked: File[]) => {
    if (!onUploadFile || picked.length === 0) return;
    const problems: string[] = [];
    const good: File[] = [];
    for (const f of picked) {
      const why = fileProblem(f);
      if (why) problems.push(why);
      else good.push(f);
    }
    setFiles((cur) => {
      const room = MAX_FILES - cur.length;
      if (good.length > room) problems.push(`A comment can carry at most ${MAX_FILES} files.`);
      return [...cur, ...good.slice(0, Math.max(room, 0))];
    });
    setError(problems.length ? problems.join(' ') : null);
    setOpen(true);
  };

  const submit = async () => {
    const message = text.trim();
    if ((!message && files.length === 0) || busy) return;
    const tagged = people.filter((p) => message.toLowerCase().includes(`@${p.name.toLowerCase()}`)).map((p) => p.employee_id);
    setBusy(true);
    setError(null);
    try {
      const uploaded = onUploadFile ? await Promise.all(files.map((f) => onUploadFile(f))) : [];
      await onSend(message || FILES_ONLY_TEXT, tagged, uploaded);
      setText('');
      setFiles([]);
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
    setFiles([]);
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

  const rows = useMemo(() => sorted.map((c) => ({ c, ...splitKey(c.message) })), [sorted]);
  const hasIssueComments = rows.some((r) => r.key);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (scope === 'general' && r.key) return false;
    if (scope === 'issues' && !r.key) return false;
    return !q || r.text.toLowerCase().includes(q) || r.c.sender_name.toLowerCase().includes(q) || (r.key ?? '').toLowerCase().includes(q);
  });
  const visible = filtered.slice(0, limit);
  const showTools = comments.length > 5 || (heading !== null && hasIssueComments);

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
                onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); setPick(0); }}
                onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
                onKeyDown={onKeyDown}
                onPaste={(e) => {
                  const pasted = Array.from(e.clipboardData?.files ?? []);
                  if (pasted.length && onUploadFile) { e.preventDefault(); addFiles(pasted); }
                }}
                onDragOver={(e) => { if (onUploadFile && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  setDragging(false);
                  if (!onUploadFile) return;
                  e.preventDefault();
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                rows={3}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className={`block w-full resize-y rounded-[3px] border-2 bg-white p-2.5 ${dragging ? 'border-dashed border-[color:var(--ac-main,#0052CC)] bg-[color:var(--ac-50,#DEEBFF)]' : 'border-[color:var(--ac-400,#4C9AFF)]'} text-[14px] leading-5 text-[#172B4D] placeholder:text-[#7A869A] focus:outline-none`}
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
              <PendingFiles files={files} onRemove={(i) => setFiles((cur) => cur.filter((_, k) => k !== i))} disabled={busy} />
              {error && <p role="alert" className="mt-2 rounded-[3px] bg-[#FFEBE6] px-2.5 py-1.5 text-[13px] text-[#BF2600]">{error}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" disabled={(!text.trim() && files.length === 0) || busy} onClick={submit} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-3 text-[14px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)] disabled:cursor-not-allowed disabled:opacity-50">
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                </button>
                <button type="button" onClick={cancel} className="h-8 cursor-pointer rounded-[3px] px-3 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">Cancel</button>
                {onUploadFile && (
                  <>
                    <input ref={pickerRef} type="file" multiple accept={ATTACH_ACCEPT} className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                    <button type="button" disabled={busy} onClick={() => pickerRef.current?.click()} title="Attach pictures, videos or files" className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)] disabled:opacity-50">
                      <Paperclip className="h-4 w-4" /> Attach
                    </button>
                  </>
                )}
                <span className="hidden text-[12px] text-[#5E6C84] md:inline">Type <b>@</b> to mention · paste or drop files · Ctrl+Enter to save</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search and filter: for a long conversation */}
      {showTools && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A869A]" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
              placeholder="Search comments"
              aria-label="Search comments"
              className="h-8 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] pl-8 pr-2 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none"
            />
          </div>
          {heading !== null && hasIssueComments && (
            <div className="inline-flex overflow-hidden rounded-[3px] border border-[#DFE1E6]" role="group" aria-label="Filter comments">
              {([['all', 'All'], ['general', 'Project'], ['issues', 'Issues']] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={scope === k}
                  onClick={() => { setScope(k); setLimit(PAGE); }}
                  className={`h-8 cursor-pointer px-3 text-[13px] font-medium transition ${scope === k ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-dark,#0747A6)]' : 'bg-white text-[#42526E] hover:bg-[#F4F5F7]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      {comments.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[3px] bg-[#F4F5F7] px-4 py-10 text-center">
          <MessageSquare className="mb-2 h-9 w-9 text-[#97A0AF]" />
          <p className="text-[14px] font-medium text-[#172B4D]">No comments yet</p>
          <p className="mt-0.5 text-[13px] text-[#5E6C84]">Start the discussion, and mention a teammate with @ to notify them.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-[3px] bg-[#F4F5F7] px-4 py-8 text-center text-[13px] text-[#5E6C84]">No comment matches your search.</p>
      ) : (
        <>
          <ul className="mt-5">
            {visible.map((r, i) => {
              const { c } = r;
              const mine = c.sender_emp_id === currentUserId;
              const who = byId.get(c.sender_emp_id);
              const label = dayLabel(c.created_at);
              const newDay = i === 0 || label !== dayLabel(visible[i - 1].c.created_at);
              const long = r.text.length > 420 || r.text.split('\n').length > 9;
              return (
                <React.Fragment key={c.message_id}>
                  {newDay && (
                    <li aria-hidden className="flex items-center gap-3 pb-3 pt-3 first:pt-0">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#5E6C84]">{label}</span>
                      <span className="h-px flex-1 bg-[#DFE1E6]" />
                    </li>
                  )}
                  <li className="flex gap-3 pb-5">
                    <Avatar name={c.sender_name} id={c.sender_emp_id} src={c.sender_avatar ?? who?.profile_picture} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-5">
                        <b className="font-semibold text-[#172B4D]">{c.sender_name}</b>
                        {mine && <span className="rounded-[3px] bg-[#DFE1E6] px-1 py-px text-[11px] font-bold uppercase text-[#42526E]">You</span>}
                        <span className="text-[12px] text-[#5E6C84]" title={new Date(c.created_at).toLocaleString('en-GB')}>{ago(c.created_at)}</span>
                        {r.key && (
                          <button
                            type="button"
                            disabled={!onOpenIssue}
                            onClick={() => onOpenIssue?.(r.key!)}
                            title={onOpenIssue ? `Open ${r.key}` : r.key}
                            className="inline-flex items-center gap-1 rounded-[3px] bg-[color:var(--ac-50,#DEEBFF)] px-1.5 py-px text-[12px] font-semibold text-[color:var(--ac-dark,#0747A6)] enabled:cursor-pointer enabled:hover:bg-[color:var(--ac-200,#B3D4FF)]"
                          >
                            <CheckSquare className="h-3 w-3" /> {r.key}
                          </button>
                        )}
                      </p>
                      {!(c.attachments?.length && r.text.trim() === FILES_ONLY_TEXT) && (
                        <div className="mt-1 text-[14px] leading-6 text-[#172B4D]">
                          <Folded long={long}>
                            <p className="whitespace-pre-wrap break-words">{withMentions(r.text)}</p>
                          </Folded>
                        </div>
                      )}
                      <AttachmentList files={c.attachments ?? []} />
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
          {filtered.length > visible.length && (
            <div className="flex justify-center pb-2">
              <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] bg-[rgba(9,30,66,0.04)] px-4 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
                <ChevronDown className="h-4 w-4" /> Load {Math.min(PAGE, filtered.length - visible.length)} more · {filtered.length - visible.length} older
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
