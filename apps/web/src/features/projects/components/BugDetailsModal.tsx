import React, { useState, useEffect } from 'react';
import { Bug, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ChevronsUp, Equal, Loader2, Play, RotateCcw, X } from 'lucide-react';
import type { BugStatus, ProjectBugItem } from '../types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import { fetchProjectBugDetail, updateProjectBugStatus, addProjectBugComment, updateBugDates } from '../api/projects.api';

interface BugDetailsModalProps {
  projectId: number;
  bugId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onBugUpdated?: () => void;
  /** Admin or project manager: may change the bug's dates. */
  canEditDates?: boolean;
}

const LIFECYCLE_STEPS: { status: BugStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'open', label: 'Open' },
  { status: 'ready_for_dev', label: 'Ready for dev' },
  { status: 'dev_in_progress', label: 'In development' },
  { status: 'ready_for_qa', label: 'Ready for QA' },
  { status: 'qa_in_progress', label: 'In QA' },
  { status: 'done', label: 'Done' },
];

const STATUS_LOZENGE: Record<string, string> = {
  new: 'bg-[#FFEBE6] text-[#BF2600]',
  open: 'bg-[#FFEBE6] text-[#BF2600]',
  ready_for_dev: 'bg-[#FFF0B3] text-[#172B4D]',
  dev_in_progress: 'bg-[#DEEBFF] text-[#0747A6]',
  ready_for_qa: 'bg-[#EAE6FF] text-[#403294]',
  qa_in_progress: 'bg-[#EAE6FF] text-[#403294]',
  done: 'bg-[#E3FCEF] text-[#006644]',
  not_a_bug: 'bg-[#DFE1E6] text-[#42526E]',
};
const statusName = (s: string) => LIFECYCLE_STEPS.find((x) => x.status === s)?.label ?? (s === 'not_a_bug' ? 'Not a bug' : s.replace(/_/g, ' '));

const PRIORITY: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  critical: { label: 'Highest', icon: ChevronsUp, color: 'text-[#CD1317]' },
  high: { label: 'High', icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { label: 'Medium', icon: Equal, color: 'text-[#E97F33]' },
  low: { label: 'Low', icon: ChevronDown, color: 'text-[#2D8738]' },
};

const BTN = 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-3 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BTN} bg-[color:var(--ac-main,#0052CC)] text-white hover:bg-[color:var(--ac-hover,#0065FF)]`;
const SUBTLE = `${BTN} bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]`;
const DATE_FIELD = 'h-8 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2 text-[13px] text-[#172B4D] hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none';

const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const day = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'None');

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[110px_1fr] items-center gap-2 py-1.5 text-[14px]">
    <dt className="text-[12px] font-semibold text-[#5E6C84]">{label}</dt>
    <dd className="min-w-0 text-[#172B4D]">{children}</dd>
  </div>
);

const Person: React.FC<{ id?: number | null; name?: string | null; empty: string }> = ({ id, name, empty }) =>
  id ? (
    <span className="inline-flex items-center gap-2">
      <JiraAvatar name={name} id={id} size={24} /> <span className="truncate">{name}</span>
    </span>
  ) : (
    <span className="text-[#7A869A]">{empty}</span>
  );

const Block: React.FC<{ title: string; children: React.ReactNode; mono?: boolean }> = ({ title, children, mono }) => (
  <section>
    <h3 className="mb-1.5 text-[14px] font-semibold text-[#172B4D]">{title}</h3>
    <div className={`whitespace-pre-wrap text-[14px] leading-6 text-[#172B4D] ${mono ? 'rounded-[3px] bg-[#F4F5F7] p-3 font-mono text-[13px]' : ''}`}>{children}</div>
  </section>
);

/** A bug, opened like a Jira issue: summary and workflow on the left, Details on the right. */
export const BugDetailsModal: React.FC<BugDetailsModalProps> = ({ projectId, bugId, isOpen, onClose, onBugUpdated, canEditDates }) => {
  const [bug, setBug] = useState<ProjectBugItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'comments' | 'history'>('comments');
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [dateBusy, setDateBusy] = useState(false);
  const [dateErr, setDateErr] = useState<string | null>(null);
  const { user } = useAuth();

  const loadBug = async () => {
    if (!bugId) return;
    try {
      setIsLoading(true);
      setBug(await fetchProjectBugDetail(projectId, bugId));
    } catch (err) {
      console.error('Failed to load bug details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bugId) {
      loadBug();
      setTab('comments');
      setComment('');
    } else {
      setBug(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bugId]);

  useEffect(() => {
    setStart((bug?.start_date ?? '').slice(0, 10));
    setDue((bug?.due_date ?? '').slice(0, 10));
    setDateErr(null);
  }, [bug?.bug_id, bug?.start_date, bug?.due_date]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !bugId) return null;

  // Who moves a bug on: triage is the manager's, the developer's stages belong to the assignee and
  // the QA stages to the reporter. The server enforces the same rule.
  const stageOwner = (() => {
    if (!bug) return null;
    if (bug.status === 'ready_for_dev' || bug.status === 'dev_in_progress') return { id: bug.assigned_to, label: bug.assigned_to_name || 'the assignee' };
    if (bug.status === 'ready_for_qa' || bug.status === 'qa_in_progress') return { id: bug.reported_by, label: `${bug.reported_by_name || 'the reporter'} to verify it` };
    return { id: null, label: 'the project manager' };
  })();
  const canMove = Boolean(canEditDates) || (stageOwner?.id != null && stageOwner.id === user?.emp_id);

  const move = async (status: BugStatus, note?: string) => {
    if (!canMove || !bugId) return;
    try {
      setBusy(true);
      setBug(await updateProjectBugStatus(projectId, bugId, status, note));
      onBugUpdated?.();
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      alert(e?.detail || e?.message || 'Failed to update bug status');
    } finally {
      setBusy(false);
    }
  };

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || posting || !bugId) return;
    try {
      setPosting(true);
      await addProjectBugComment(projectId, bugId, comment.trim());
      setComment('');
      loadBug();
    } catch (err) {
      const x = err as { detail?: string; message?: string } | null;
      alert(x?.detail || x?.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const dirty = bug ? start !== (bug.start_date ?? '').slice(0, 10) || due !== (bug.due_date ?? '').slice(0, 10) : false;
  const saveDates = async () => {
    if (!bug) return;
    if (start && due && start > due) return setDateErr('Start date cannot be after the due date.');
    setDateBusy(true);
    setDateErr(null);
    try {
      await updateBugDates(projectId, bug.bug_id, { start_date: start || null, due_date: due || null });
      await loadBug();
      onBugUpdated?.();
    } catch (err) {
      const x = err as { detail?: string; message?: string } | null;
      setDateErr(x?.detail || x?.message || 'Could not save the dates');
    } finally {
      setDateBusy(false);
    }
  };

  const stepIdx = bug ? LIFECYCLE_STEPS.findIndex((s) => s.status === bug.status) : -1;
  const closed = bug?.status === 'done' || bug?.status === 'not_a_bug';
  const pr = PRIORITY[bug?.priority ?? 'medium'] ?? PRIORITY.medium;
  const PIcon = pr.icon;
  const overdue = Boolean(bug && !closed && bug.due_date && bug.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(9,30,66,0.54)]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label="Bug details" className="flex h-full w-screen flex-col bg-white shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] animate-in slide-in-from-right duration-200 sm:max-w-3xl xl:max-w-[1000px]">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-[#DFE1E6] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[14px] text-[#5E6C84]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-[#E5493A]">
              <Bug className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="font-medium">{bug?.bug_code || `BUG-${bugId}`}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
            <X className="h-5 w-5" />
          </button>
        </header>

        {isLoading || !bug ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-[14px] text-[#5E6C84]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading bug…
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              {/* ─── Left: the bug and its workflow ─── */}
              <div className="min-w-0 space-y-6">
                <h1 className="text-[24px] font-medium leading-8 text-[#172B4D]">{bug.title}</h1>

                {/* Workflow */}
                <section className="space-y-3 rounded-[3px] border border-[#DFE1E6] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-[3px] px-2 py-1 text-[12px] font-bold uppercase ${STATUS_LOZENGE[bug.status] ?? STATUS_LOZENGE.new}`}>{statusName(bug.status)}</span>
                    {!closed && (canMove ? <span className="text-[13px] text-[#5E6C84]">Move it on:</span> : <span className="text-[13px] text-[#5E6C84]">Waiting for {stageOwner?.label ?? 'someone else'}</span>)}
                    {closed && <span className="text-[13px] text-[#5E6C84]">This bug is closed.</span>}
                  </div>

                  {bug.status !== 'not_a_bug' && (
                    <ol className="flex gap-1" aria-label="Progress">
                      {LIFECYCLE_STEPS.map((s, i) => (
                        <li key={s.status} className="min-w-0 flex-1" title={s.label}>
                          <div className={`h-1.5 rounded-full ${i < stepIdx ? 'bg-[#36B37E]' : i === stepIdx ? (closed ? 'bg-[#36B37E]' : 'bg-[color:var(--ac-main,#0052CC)]') : 'bg-[#DFE1E6]'}`} />
                          <p className={`mt-1 hidden truncate text-[11px] sm:block ${i === stepIdx ? 'font-semibold text-[#172B4D]' : 'text-[#7A869A]'}`}>{s.label}</p>
                        </li>
                      ))}
                    </ol>
                  )}

                  {!closed && (
                    <div className={`flex flex-wrap items-center gap-2 ${canMove ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!canMove}>
                      {bug.status === 'new' && (
                        <button type="button" disabled={busy} onClick={() => move('open')} className={PRIMARY}>
                          Accept bug
                        </button>
                      )}
                      {bug.status === 'open' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => move('ready_for_dev')} className={PRIMARY}>
                            Ready for dev
                          </button>
                          <button type="button" disabled={busy} onClick={() => move('not_a_bug')} className={SUBTLE}>
                            Not a bug
                          </button>
                        </>
                      )}
                      {bug.status === 'ready_for_dev' && (
                        <button type="button" disabled={busy} onClick={() => move('dev_in_progress')} className={PRIMARY}>
                          <Play className="h-3.5 w-3.5 fill-current" /> Start development
                        </button>
                      )}
                      {bug.status === 'dev_in_progress' && (
                        <button type="button" disabled={busy} onClick={() => move('ready_for_qa')} className={PRIMARY}>
                          Send to QA
                        </button>
                      )}
                      {bug.status === 'ready_for_qa' && (
                        <button type="button" disabled={busy} onClick={() => move('qa_in_progress')} className={PRIMARY}>
                          <Play className="h-3.5 w-3.5 fill-current" /> Start QA testing
                        </button>
                      )}
                      {bug.status === 'qa_in_progress' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => move('done')} className={`${BTN} bg-[#36B37E] text-white hover:bg-[#57D9A3] hover:text-[#172B4D]`}>
                            <CheckCircle2 className="h-4 w-4" /> QA passed
                          </button>
                          <button type="button" disabled={busy} onClick={() => move('ready_for_dev', 'QA failed, returning to dev')} className={SUBTLE}>
                            <RotateCcw className="h-3.5 w-3.5" /> QA failed, back to dev
                          </button>
                        </>
                      )}
                      {busy && <Loader2 className="h-4 w-4 animate-spin text-[#5E6C84]" />}
                    </div>
                  )}
                </section>

                <Block title="Description">{bug.description || <span className="text-[#7A869A]">No description.</span>}</Block>
                <Block title="Steps to reproduce" mono>
                  {bug.steps_to_reproduce || <span className="font-sans text-[#7A869A]">No steps provided.</span>}
                </Block>
                <div className="grid gap-4 sm:grid-cols-2">
                  <section>
                    <h3 className="mb-1.5 text-[14px] font-semibold text-[#172B4D]">Expected result</h3>
                    <p className="whitespace-pre-wrap rounded-[3px] border-l-4 border-[#36B37E] bg-[#E3FCEF]/50 p-3 text-[14px] text-[#172B4D]">{bug.expected_result || '—'}</p>
                  </section>
                  <section>
                    <h3 className="mb-1.5 text-[14px] font-semibold text-[#172B4D]">Actual result</h3>
                    <p className="whitespace-pre-wrap rounded-[3px] border-l-4 border-[#DE350B] bg-[#FFEBE6]/50 p-3 text-[14px] text-[#172B4D]">{bug.actual_result || '—'}</p>
                  </section>
                </div>

                {/* Activity */}
                <section>
                  <h3 className="mb-2 text-[14px] font-semibold text-[#172B4D]">Activity</h3>
                  <div role="tablist" className="mb-4 flex gap-1">
                    {(
                      [
                        ['comments', 'Comments', bug.comments?.length ?? 0],
                        ['history', 'History', bug.history?.length ?? 0],
                      ] as const
                    ).map(([id, label, n]) => (
                      <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-3 text-[14px] font-medium ${tab === id ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}>
                        {label}
                        <span className="rounded-full bg-[rgba(9,30,66,0.08)] px-1.5 text-[11px] font-semibold">{n}</span>
                      </button>
                    ))}
                  </div>

                  {tab === 'comments' && (
                    <div className="space-y-4">
                      <form onSubmit={post} className="flex gap-3">
                        <JiraAvatar name={user?.name ?? 'You'} id={user?.emp_id ?? 0} size={32} />
                        <div className="min-w-0 flex-1">
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={comment ? 3 : 1}
                            placeholder="Add a comment…"
                            aria-label="Add a comment"
                            className="w-full resize-none rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-3 py-2 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none"
                          />
                          {comment.trim() && (
                            <div className="mt-2 flex gap-2">
                              <button type="submit" disabled={posting} className={PRIMARY}>
                                {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                              </button>
                              <button type="button" onClick={() => setComment('')} className={SUBTLE}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </form>
                      {(bug.comments ?? []).length === 0 ? (
                        <p className="py-4 text-center text-[14px] text-[#7A869A]">No comments yet.</p>
                      ) : (
                        bug.comments!.map((c) => (
                          <div key={c.comment_id} className="flex gap-3">
                            <JiraAvatar name={c.author_name} id={c.comment_id} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px]">
                                <b className="font-semibold text-[#172B4D]">{c.author_name}</b> <span className="ml-1 text-[12px] text-[#5E6C84]">{when(c.created_at)}</span>
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-6 text-[#172B4D]">{c.comment}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tab === 'history' &&
                    ((bug.history ?? []).length === 0 ? (
                      <p className="py-4 text-center text-[14px] text-[#7A869A]">No history yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {bug.history!.map((h) => (
                          <li key={h.history_id} className="flex gap-3">
                            <JiraAvatar name={h.actor_name} id={(h.actor_name ?? "").length} size={32} />
                            <div className="min-w-0 flex-1 text-[14px]">
                              <p>
                                <b className="font-semibold text-[#172B4D]">{h.actor_name}</b> <span className="text-[#5E6C84]">changed the status</span>
                                <span className="ml-2 text-[12px] text-[#5E6C84]">{when(h.created_at)}</span>
                              </p>
                              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                                {h.from_status && <span className={`rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase ${STATUS_LOZENGE[h.from_status] ?? STATUS_LOZENGE.new}`}>{statusName(h.from_status)}</span>}
                                {h.from_status && <span className="text-[#5E6C84]">→</span>}
                                <span className={`rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase ${STATUS_LOZENGE[h.to_status] ?? STATUS_LOZENGE.new}`}>{statusName(h.to_status)}</span>
                              </p>
                              {h.note && <p className="mt-1 text-[13px] italic text-[#5E6C84]">“{h.note}”</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ))}
                </section>
              </div>

              {/* ─── Right: Details, dates, time ─── */}
              <div className="space-y-4">
                <section className="rounded-[3px] border border-[#DFE1E6]">
                  <h2 className="border-b border-[#DFE1E6] px-4 py-3 text-[14px] font-semibold text-[#172B4D]">Details</h2>
                  <dl className="px-4 py-2">
                    <Row label="Assignee">
                      <Person id={bug.assigned_to} name={bug.assigned_to_name} empty="Unassigned" />
                    </Row>
                    <Row label="Reporter">
                      <Person id={bug.reported_by} name={bug.reported_by_name} empty="Unknown" />
                    </Row>
                    <Row label="Priority">
                      <span className="inline-flex items-center gap-1.5">
                        <PIcon className={`h-4 w-4 ${pr.color}`} strokeWidth={3} /> {pr.label}
                      </span>
                    </Row>
                    <Row label="Type">
                      <span className="capitalize">{bug.bug_type === 'other' && bug.other_bug_type ? bug.other_bug_type : bug.bug_type}</span>
                    </Row>
                    <Row label="Start date">
                      {canEditDates ? <input type="date" value={start} max={due || undefined} onChange={(e) => setStart(e.target.value)} aria-label="Start date" className={DATE_FIELD} /> : <span>{day(bug.start_date)}</span>}
                    </Row>
                    <Row label="Due date">
                      {canEditDates ? (
                        <input type="date" value={due} min={start || undefined} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className={DATE_FIELD} />
                      ) : (
                        <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-[#BF2600]' : ''}`}>
                          <CalendarDays className="h-3.5 w-3.5" /> {day(bug.due_date)}
                        </span>
                      )}
                    </Row>
                    {dateErr && (
                      <p role="alert" className="pb-1 text-[12px] text-[#BF2600]">
                        {dateErr}
                      </p>
                    )}
                    {canEditDates && dirty && (
                      <div className="flex gap-2 pb-2 pt-1">
                        <button type="button" disabled={dateBusy} onClick={saveDates} className={PRIMARY}>
                          {dateBusy ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" disabled={dateBusy} onClick={() => { setStart((bug.start_date ?? '').slice(0, 10)); setDue((bug.due_date ?? '').slice(0, 10)); setDateErr(null); }} className={SUBTLE}>
                          Cancel
                        </button>
                      </div>
                    )}
                    <Row label="Created">
                      <span className="text-[13px]">{when(bug.created_at)}</span>
                    </Row>
                  </dl>
                </section>

                <section className="rounded-[3px] border border-[#DFE1E6]">
                  <h2 className="border-b border-[#DFE1E6] px-4 py-3 text-[14px] font-semibold text-[#172B4D]">Time tracking</h2>
                  <dl className="px-4 py-2">
                    <Row label="Development">
                      {bug.dev_started_at ? (
                        <span className="text-[13px]">
                          {when(bug.dev_started_at)}
                          <br />
                          {bug.dev_ended_at ? <span className="text-[#5E6C84]">to {when(bug.dev_ended_at)}</span> : <span className="font-semibold text-[color:var(--ac-main,#0052CC)]">● In progress</span>}
                        </span>
                      ) : (
                        <span className="text-[#7A869A]">Not started</span>
                      )}
                    </Row>
                    <Row label="QA testing">
                      {bug.qa_started_at ? (
                        <span className="text-[13px]">
                          {when(bug.qa_started_at)}
                          <br />
                          {bug.qa_ended_at ? <span className="text-[#5E6C84]">to {when(bug.qa_ended_at)}</span> : <span className="font-semibold text-[#6554C0]">● In progress</span>}
                        </span>
                      ) : (
                        <span className="text-[#7A869A]">Not started</span>
                      )}
                    </Row>
                    <Row label="Total">
                      {bug.total_time_minutes > 0 ? <b>{Math.floor(bug.total_time_minutes / 60)}h {bug.total_time_minutes % 60}m</b> : <span className="text-[#7A869A]">Not yet</span>}
                    </Row>
                  </dl>
                </section>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
