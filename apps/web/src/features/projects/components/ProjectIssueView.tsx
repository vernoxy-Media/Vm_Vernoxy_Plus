import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Clock,
  Equal,
  GitBranch,
  History,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  X,
} from 'lucide-react';
import type { TaskDetailDto } from '@vernoxy-pulse/api-client';
import { HoldReasonModal } from '@/features/tasks/components/HoldReasonModal';
import { StageDecisionDialog } from '@/features/tasks/components/StageDecisionDialog';
import type { TaskStage } from '@/features/tasks/types';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import { useContainerWidth } from '@/shared/ui/useContainerWidth';
import { ProjectComments } from './ProjectComments';
import type { ProjectDiscussionItem, ProjectMember } from '../types';

/* ───────────────────────────── Jira vocabulary ───────────────────────────── */

const STAGES: Record<string, { label: string; cls: string }> = {
  assigned: { label: 'To Do', cls: 'bg-[#DFE1E6] text-[#42526E]' },
  in_progress: { label: 'In Progress', cls: 'bg-[#DEEBFF] text-[#0747A6]' },
  hold: { label: 'On Hold', cls: 'bg-[#FFF0B3] text-[#172B4D]' },
  requested: { label: 'In Review', cls: 'bg-[#EAE6FF] text-[#403294]' },
  completed: { label: 'Done', cls: 'bg-[#E3FCEF] text-[#006644]' },
};

const PRIORITY: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  critical: { label: 'Highest', icon: ChevronsUp, color: 'text-[#CD1317]' },
  high: { label: 'High', icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { label: 'Medium', icon: Equal, color: 'text-[#E97F33]' },
  low: { label: 'Low', icon: ChevronDown, color: 'text-[#2D8738]' },
};

const BTN = 'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] px-3 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
const BTN_SUCCESS = `${BTN} bg-[#00875A] text-white hover:bg-[#006644]`;
const BTN_SUBTLE = `${BTN} bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]`;

const IssueType: React.FC<{ sub?: boolean }> = ({ sub }) => (
  <span title={sub ? 'Sub-task' : 'Task'} className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#4BADE8] text-white">
    {sub ? <GitBranch className="h-2.5 w-2.5" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3.5} />}
  </span>
);

const Lozenge: React.FC<{ stage?: string }> = ({ stage }) => {
  const s = STAGES[stage ?? 'assigned'] ?? STAGES.assigned;
  return <span className={`inline-block rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase tracking-[0.01em] ${s.cls}`}>{s.label}</span>;
};

const PriorityBadge: React.FC<{ priority?: string }> = ({ priority }) => {
  const p = PRIORITY[priority ?? 'medium'] ?? PRIORITY.medium;
  const Icon = p.icon;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={`h-4 w-4 ${p.color}`} strokeWidth={3} />
      {p.label}
    </span>
  );
};

/* ─────────────────────────────── Time helpers ─────────────────────────────── */

type WorkLog = NonNullable<TaskDetailDto['work_logs']>[number];

/** Seconds worked on one task: stored logs when present, else stored minutes, plus the running session. */
function secondsFor(t: Pick<TaskDetailDto, 'actual_minutes' | 'is_timer_running' | 'timer_started_at' | 'work_logs'>, now: number): number {
  let sec = (t.actual_minutes || 0) * 60;
  const logged = (t.work_logs ?? []).reduce((a, l) => a + (typeof l.duration_seconds === 'number' ? l.duration_seconds : 0), 0);
  if (logged > 0) sec = logged;
  if (t.is_timer_running && t.timer_started_at) {
    const start = new Date(t.timer_started_at).getTime();
    if (!Number.isNaN(start) && now > start) sec += Math.floor((now - start) / 1000);
  }
  return Math.max(0, sec);
}

/** Jira's duration style: 1d 2h 30m is not used here; hours and minutes are clearer for a work log. */
const dur = (sec: number, withSeconds = false) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [h ? `${h}h` : '', m ? `${m}m` : '', withSeconds || (!h && !m) ? `${s}s` : ''].filter(Boolean);
  return parts.join(' ');
};
const durMin = (min: number) => dur(min * 60);

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const WORK_ACTION: Record<string, string> = { start: 'started work', resume: 'resumed work', pause: 'paused work', finish: 'finished work' };

/* ───────────────────────────────── View ───────────────────────────────── */

export interface ProjectIssueViewProps {
  task: TaskDetailDto;
  projectName: string;
  /** The sprint's name, null for the backlog; leave it out for a task that has no sprints. */
  sprintName?: string | null;
  isAdmin: boolean;
  /** Approve or send back work that is In Review: the admin, or the project manager. */
  canApprove: boolean;
  currentEmpId?: number;
  /** Admin or project manager: may add child issues. */
  canManage?: boolean;
  members: ProjectMember[];
  /** Comments written on this issue, already without the [KEY] prefix. */
  comments: ProjectDiscussionItem[];
  currentUserName?: string;
  currentUserAvatar?: string | null;
  onClose: () => void;
  onEdit?: (task: TaskDetailDto) => void;
  onMoveStage: (taskId: number, stage: TaskStage, note?: string, holdReason?: string) => void | Promise<void>;
  onTrackWorkSession: (taskId: number, action: 'start' | 'pause' | 'finish', note?: string) => Promise<void>;
  /** Without it the issue has no comments (a task that is not part of a project has no discussion). */
  onComment?: (message: string, taggedEmployeeIds: number[]) => Promise<void>;
  onAddChild?: (task: TaskDetailDto) => void;
  /** Open another issue of the project: a child from the list, or the parent from the breadcrumb. */
  onOpenIssue?: (taskId: number) => void;
  /** Deadline of the project, shown beside every due date. */
  projectDeadline?: string | null;
  /** Who may change a due date in place (the admin). */
  canEditDates?: boolean;
  onChangeDate?: (taskId: number, field: 'start_date' | 'due_date', date: string | null) => Promise<void>;
}

export const ProjectIssueView: React.FC<ProjectIssueViewProps> = ({
  task,
  projectName,
  sprintName,
  isAdmin,
  canApprove,
  currentEmpId,
  canManage = false,
  members,
  comments,
  currentUserName,
  currentUserAvatar,
  onClose,
  onEdit,
  onMoveStage,
  onTrackWorkSession,
  onComment,
  onAddChild,
  onOpenIssue,
  projectDeadline,
  canEditDates = false,
  onChangeDate,
}) => {
  const [box, boxWidth] = useContainerWidth<HTMLDivElement>();
  const twoColumns = boxWidth >= 760;
  const [tab, setTab] = useState<'comments' | 'worklog' | 'history'>(onComment ? 'comments' : 'worklog');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [sendBackFor, setSendBackFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [childFilter, setChildFilter] = useState<'all' | 'todo' | 'doing' | 'review' | 'done'>('all');
  const [childLimit, setChildLimit] = useState(8);

  const subs = task.sub_tasks ?? [];
  const stage = task.stage as string;
  const isAssignee = task.assignees?.some((a) => a.employee_id === currentEmpId) || task.lead_employee_id === currentEmpId;
  const mySub = task.has_sub_tasks || subs.length ? subs.find((s) => s.assignees.some((a) => a.employee_id === currentEmpId)) : null;
  /** The issue this user does the work on: their own sub-task, or the task itself when it has none. */
  const mine = mySub ?? (!task.has_sub_tasks && subs.length === 0 && isAssignee ? task : null);

  // When a child issue may be added (mirrors the server's rules)
  // With many child issues: filter by status and show them a page at a time
  const childGroup = (st: string) => (st === 'completed' ? 'done' : st === 'requested' ? 'review' : st === 'in_progress' ? 'doing' : 'todo');
  const childCounts = { all: subs.length, todo: 0, doing: 0, review: 0, done: 0 };
  subs.forEach((x) => { childCounts[childGroup(x.stage as string) as 'todo' | 'doing' | 'review' | 'done'] += 1; });
  const filteredSubs = childFilter === 'all' ? subs : subs.filter((x) => childGroup(x.stage as string) === childFilter);
  const visibleSubs = filteredSubs.slice(0, childLimit);

  const hasKids = task.has_sub_tasks || subs.length > 0;
  const isChild = Boolean(task.parent_task_id);
  const canSplit = !isChild && stage !== 'completed' && (hasKids || (stage === 'assigned' && !(task.actual_minutes > 0) && !task.is_timer_running));
  const splitHint = stage === 'completed' ? 'Approved tasks are locked' : 'Work has already started on this task, so it cannot be split into sub-tasks';
  const showAddChild = Boolean(onAddChild && canManage && !isChild);

  const anyRunning = Boolean(task.is_timer_running) || subs.some((s) => s.is_timer_running);
  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [anyRunning]);

  /* Time tracking: the estimate, and the time worked. Like Jira, it is the sum of what every person logged
     on this issue and its sub-tasks, plus every timer that is running right now. */
  const estimateMin = task.allocated_minutes || subs.reduce((n, s) => n + (s.allocated_minutes || 0), 0);
  const spentSec = useMemo(() => [task, ...subs].reduce((n, t) => n + secondsFor(t, now), 0), [task, subs, now]);

  /* Time per person: finished sessions from the log, and the session running now for whoever started it */
  const byPerson = useMemo(() => {
    const map = new Map<number, { id: number; name: string; seconds: number; running: boolean }>();
    const credit = (id: number, name: string, sec: number, running = false) => {
      const row = map.get(id) ?? { id, name, seconds: 0, running: false };
      row.seconds += sec;
      row.running = row.running || running;
      map.set(id, row);
    };
    [task, ...subs].forEach((t) => {
      const logs = t.work_logs ?? [];
      logs.forEach((l) => {
        if (typeof l.duration_seconds === 'number' && l.duration_seconds > 0) credit(l.employee_id, l.employee_name, l.duration_seconds);
      });
      if (t.is_timer_running && t.timer_started_at) {
        const starter = [...logs].reverse().find((l) => l.action === 'start' || l.action === 'resume');
        const started = new Date(t.timer_started_at).getTime();
        if (starter && !Number.isNaN(started) && now > started) credit(starter.employee_id, starter.employee_name, Math.floor((now - started) / 1000), true);
      }
    });
    return [...map.values()].sort((a, b) => b.seconds - a.seconds);
  }, [task, subs, now]);
  const topPerson = byPerson[0]?.seconds || 0;
  const estimateSec = estimateMin * 60;
  const remainingSec = Math.max(0, estimateSec - spentSec);
  const overBy = Math.max(0, spentSec - estimateSec);
  const pct = estimateSec ? Math.min(100, Math.round((spentSec / estimateSec) * 100)) : 0;

  const overdue = stage !== 'completed' && Boolean(task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0));
  const doneSubs = subs.filter((s) => s.stage === 'completed').length;

  const run = async (key: string, fn: () => void | Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      setError(e?.detail || e?.message || 'That did not work. Please try again.');
    } finally {
      setBusy(null);
    }
  };
  const session = (t: { task_id: number }, action: 'start' | 'pause' | 'finish') => run(`${t.task_id}_${action}`, () => onTrackWorkSession(t.task_id, action));

  /* Work log and history feeds */
  const worklog = useMemo(() => {
    const rows: Array<WorkLog & { code: string; title: string }> = [];
    (task.work_logs ?? []).forEach((l) => rows.push({ ...l, code: task.task_code, title: task.title }));
    subs.forEach((s) => (s.work_logs ?? []).forEach((l) => rows.push({ ...l, code: s.task_code, title: s.title })));
    return rows.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [task, subs]);
  const history = useMemo(() => [...(task.history ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)), [task.history]);

  /* A compact set of buttons for one issue (the task, or a sub-task row) */
  const WorkButtons: React.FC<{ t: TaskDetailDto; big?: boolean }> = ({ t, big }) => {
    const st = t.stage as string;
    const b = big ? BTN : `${BTN} !h-7 !px-2 !text-[13px]`;
    const wait = busy !== null;
    return (
      <>
        {st === 'assigned' && (
          <button type="button" disabled={wait} onClick={() => session(t, 'start')} className={`${b} ${big ? 'bg-[color:var(--ac-main,#0052CC)] text-white hover:bg-[color:var(--ac-hover,#0065FF)]' : 'bg-[#DEEBFF] text-[#0747A6] hover:bg-[#B3D4FF]'}`}>
            <Play className="h-3.5 w-3.5" /> Start work
          </button>
        )}
        {st === 'in_progress' && (
          <>
            {t.is_timer_running ? (
              <button type="button" disabled={wait} onClick={() => session(t, 'pause')} className={`${b} bg-[#FFF0B3] text-[#172B4D] hover:bg-[#FFE380]`}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            ) : (
              <button type="button" disabled={wait} onClick={() => session(t, 'start')} className={`${b} bg-[#DEEBFF] text-[#0747A6] hover:bg-[#B3D4FF]`}>
                <Play className="h-3.5 w-3.5" /> Resume
              </button>
            )}
            <button type="button" disabled={wait} onClick={() => session(t, 'finish')} className={`${b} bg-[#EAE6FF] text-[#403294] hover:bg-[color:var(--ac-200,#C0B6F2)]`} title="Finish work and send it for review">
              <CheckCircle2 className="h-3.5 w-3.5" /> Finish
            </button>
          </>
        )}
        {st === 'hold' && (
          <button type="button" disabled={wait} onClick={() => run(`${t.task_id}_resume`, () => onMoveStage(t.task_id, 'in_progress'))} className={`${b} bg-[#DEEBFF] text-[#0747A6] hover:bg-[#B3D4FF]`}>
            <Play className="h-3.5 w-3.5" /> Resume
          </button>
        )}
      </>
    );
  };

  const keyPrefix = `${task.task_code}`;

  return (
    <div ref={box} className="mx-auto w-full max-w-[1100px]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-[#5E6C84]">
        <button type="button" onClick={onClose} className="cursor-pointer text-[color:var(--ac-main,#0052CC)] hover:underline">{projectName}</button>
        <span aria-hidden>/</span>
        {task.parent_task_code && (
          <>
            {onOpenIssue && task.parent_task_id ? (
              <button type="button" onClick={() => onOpenIssue(task.parent_task_id!)} title={task.parent_task_title ?? undefined} className="inline-flex cursor-pointer items-center gap-1 text-[color:var(--ac-main,#0052CC)] hover:underline"><IssueType />{task.parent_task_code}</button>
            ) : (
              <span className="inline-flex items-center gap-1"><IssueType />{task.parent_task_code}</span>
            )}
            <span aria-hidden>/</span>
          </>
        )}
        <span className="inline-flex items-center gap-1 font-medium text-[#172B4D]"><IssueType sub={Boolean(task.parent_task_id)} />{keyPrefix}</span>
        <button type="button" onClick={onClose} aria-label="Close issue" title="Back to board" className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
          <X className="h-4 w-4" />
        </button>
      </nav>

      <div className={`grid gap-x-8 gap-y-6 ${twoColumns ? 'grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
        {/* ───────── Main column ───────── */}
        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="text-[24px] font-medium leading-8 text-[#172B4D]">{task.title}</h2>

            {/* Action bar */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {mine && <WorkButtons t={mine as TaskDetailDto} big />}
              {mine && (mine.stage === 'assigned' || mine.stage === 'in_progress') && (
                <button type="button" onClick={() => setHoldOpen(true)} className={BTN_SUBTLE}>On hold</button>
              )}
              {canApprove && stage === 'requested' && (
                <>
                  <button type="button" disabled={busy !== null} onClick={() => run('approve', () => onMoveStage(task.task_id, 'completed'))} className={BTN_SUCCESS}>
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => setSendBackFor(task.task_id)} className={BTN_SUBTLE}>Send back</button>
                </>
              )}
              {showAddChild && (
                <button type="button" disabled={!canSplit} title={canSplit ? 'Add a child issue' : splitHint} onClick={() => onAddChild!(task)} className={BTN_SUBTLE}>
                  <Plus className="h-4 w-4" /> Child issue
                </button>
              )}
              {isAdmin && stage !== 'completed' && onEdit && (
                <button type="button" onClick={() => onEdit(task)} className={BTN_SUBTLE}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-[#5E6C84]" />}
            </div>

            {error && <p role="alert" className="mt-3 rounded-[3px] bg-[#FFEBE6] px-3 py-2 text-[13px] text-[#BF2600] shadow-[inset_3px_0_0_#DE350B]">{error}</p>}
            {stage === 'completed' && (
              <p className="mt-3 flex items-center gap-2 rounded-[3px] bg-[#E3FCEF] px-3 py-2 text-[13px] text-[#006644] shadow-[inset_3px_0_0_#36B37E]">
                <CheckCircle2 className="h-4 w-4" /> Done{task.completed_by_name ? ` · approved by ${task.completed_by_name}` : ''} on {fmtDateTime(task.completed_at)}
              </p>
            )}
            {stage === 'hold' && task.hold_reason && (
              <p className="mt-3 rounded-[3px] bg-[#FFFAE6] px-3 py-2 text-[13px] text-[#172B4D] shadow-[inset_3px_0_0_#FF991F]"><b>On hold:</b> {task.hold_reason}</p>
            )}
            {stage === 'in_progress' && task.review_note && (
              <p className="mt-3 rounded-[3px] bg-[#FFFAE6] px-3 py-2 text-[13px] text-[#172B4D] shadow-[inset_3px_0_0_#FF991F]"><b>Sent back:</b> {task.review_note}</p>
            )}
          </div>

          {/* Description */}
          <section aria-label="Description">
            <h3 className="mb-2 text-[16px] font-semibold text-[#172B4D]">Description</h3>
            {task.description ? (
              <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-[#172B4D]">{task.description}</p>
            ) : (
              <p className="text-[14px] text-[#7A869A]">No description yet.</p>
            )}
          </section>

          {/* Child issues */}
          {(subs.length > 0 || showAddChild) && (
            <section aria-label="Child issues">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-semibold text-[#172B4D]">Child issues {subs.length > 0 && <span className="ml-1 text-[13px] font-normal text-[#5E6C84]">{doneSubs} of {subs.length} done</span>}</h3>
                {showAddChild && (
                  <button
                    type="button"
                    disabled={!canSplit}
                    onClick={() => onAddChild!(task)}
                    aria-label="Add child issue"
                    title={canSplit ? 'Add a child issue' : splitHint}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              {subs.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#DFE1E6]">
                    <div className="h-full rounded-full bg-[#36B37E] transition-all" style={{ width: `${Math.round((doneSubs / subs.length) * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right text-[12px] text-[#5E6C84]">{Math.round((doneSubs / subs.length) * 100)}%</span>
                </div>
              )}
              {subs.length === 0 ? (
                <p className="rounded-[3px] bg-[#F4F5F7] px-3 py-5 text-center text-[13px] text-[#5E6C84]">
                  No child issues yet. Split this work into smaller pieces and give each one an owner and an estimate.
                </p>
              ) : (
                <>
                {subs.length > 5 && (
                  <div role="tablist" aria-label="Filter child issues" className="mb-2 flex flex-wrap gap-1.5">
                    {([['all', 'All'], ['todo', 'To Do'], ['doing', 'In Progress'], ['review', 'In Review'], ['done', 'Done']] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={childFilter === id}
                        onClick={() => { setChildFilter(id); setChildLimit(8); }}
                        className={`h-7 cursor-pointer rounded-[3px] px-2.5 text-[13px] font-medium transition ${childFilter === id ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
                      >
                        {label} <span className="opacity-70">{childCounts[id]}</span>
                      </button>
                    ))}
                  </div>
                )}
                <ul className="overflow-hidden rounded-[3px] border border-[#DFE1E6]">
                  {visibleSubs.length === 0 && <li className="bg-white px-3 py-4 text-center text-[13px] text-[#5E6C84]">No child issues in this status.</li>}
                  {visibleSubs.map((s) => {
                    const own = s.assignees.some((a) => a.employee_id === currentEmpId);
                    const p = PRIORITY[s.priority as string] ?? PRIORITY.medium;
                    const PIcon = p.icon;
                    return (
                      <li key={s.task_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#DFE1E6] bg-white px-3 py-2 last:border-b-0 hover:bg-[#F4F5F7]">
                        <IssueType sub />
                        <span className={`w-[110px] shrink-0 truncate text-[13px] text-[#5E6C84] ${s.stage === 'completed' ? 'line-through' : ''}`}>{s.task_code}</span>
                        {onOpenIssue ? (
                          <button type="button" onClick={() => onOpenIssue(s.task_id)} className="min-w-0 flex-1 basis-40 cursor-pointer truncate text-left text-[14px] text-[#172B4D] hover:text-[color:var(--ac-main,#0052CC)] hover:underline">{s.title}</button>
                        ) : (
                          <span className="min-w-0 flex-1 basis-40 truncate text-[14px] text-[#172B4D]">{s.title}</span>
                        )}
                        {s.due_date && (
                          <span
                            title="Due date"
                            className={`inline-flex items-center gap-1 rounded-[3px] px-1 py-px text-[12px] font-medium ${s.stage !== 'completed' && s.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10) ? 'bg-[#FFEBE6] text-[#BF2600]' : 'bg-[rgba(9,30,66,0.08)] text-[#42526E]'}`}
                          >
                            <Clock className="h-3 w-3" />
                            {(() => {
                              const f = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                              const from = (s as { start_date?: string | null }).start_date;
                              return from ? `${f(from)} – ${f(s.due_date!)}` : f(s.due_date!);
                            })()}
                          </span>
                        )}
                        <span className="text-[12px] tabular-nums text-[#5E6C84]" title="Time worked">{dur(secondsFor(s, now))}{s.allocated_minutes ? ` / ${durMin(s.allocated_minutes)}` : ''}</span>
                        <PIcon className={`h-4 w-4 ${p.color}`} strokeWidth={3} aria-label={`${p.label} priority`} />
                        <div className="flex -space-x-1.5">
                          {s.assignees.slice(0, 3).map((a) => <JiraAvatar key={a.employee_id} name={a.name} id={a.employee_id} src={a.avatar_url} size={24} ring />)}
                        </div>
                        <Lozenge stage={s.stage} />
                        <div className="flex items-center gap-1.5">
                          {own && <WorkButtons t={s} />}
                          {canApprove && s.stage === 'requested' && (
                            <button type="button" disabled={busy !== null} onClick={() => run(`${s.task_id}_ok`, () => onMoveStage(s.task_id, 'completed'))} className={`${BTN} !h-7 !px-2 !text-[13px] bg-[#E3FCEF] text-[#006644] hover:bg-[#ABF5D1]`}>
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {filteredSubs.length > childLimit && (
                  <button type="button" onClick={() => setChildLimit((n) => n + 8)} className="mt-2 h-8 w-full cursor-pointer rounded-[3px] bg-[rgba(9,30,66,0.04)] text-[13px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)]">
                    Show {Math.min(8, filteredSubs.length - childLimit)} more ({filteredSubs.length - childLimit} remaining)
                  </button>
                )}
                </>
              )}
            </section>
          )}

          {/* Activity */}
          <section aria-label="Activity">
            <h3 className="mb-3 text-[16px] font-semibold text-[#172B4D]">Activity</h3>
            <div role="tablist" aria-label="Activity" className="mb-4 flex gap-1.5">
              {([['comments', 'Comments', comments.length], ['worklog', 'Work log', worklog.length], ['history', 'History', history.length]] as const).filter(([id]) => id !== 'comments' || Boolean(onComment)).map(([id, label, n]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`h-7 cursor-pointer rounded-[3px] px-2.5 text-[13px] font-medium transition ${tab === id ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
                >
                  {label} <span className="ml-0.5 opacity-70">{n}</span>
                </button>
              ))}
            </div>

            {tab === 'comments' && onComment && (
              <ProjectComments
                heading={null}
                comments={comments}
                members={members}
                currentUserId={currentEmpId}
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                onSend={onComment}
              />
            )}

            {tab === 'worklog' && (
              <div className="space-y-5">
                {byPerson.length > 0 && (
                  <div className="rounded-[3px] border border-[#DFE1E6]">
                    <div className="flex items-center justify-between border-b border-[#DFE1E6] px-4 py-2.5">
                      <h4 className="text-[14px] font-semibold text-[#172B4D]">Time by person</h4>
                      <span className="text-[13px] text-[#5E6C84]">Total <b className="font-semibold text-[#172B4D]">{dur(spentSec, anyRunning) || '0m'}</b></span>
                    </div>
                    <ul className="divide-y divide-[#DFE1E6]">
                      {byPerson.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                          <JiraAvatar name={p.name} id={p.id} size={28} />
                          <span className="w-32 min-w-0 shrink-0 truncate text-[14px] text-[#172B4D] sm:w-40">{p.name}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#DFE1E6]">
                            <span className="block h-full rounded-full bg-[color:var(--ac-main,#0052CC)] transition-all" style={{ width: `${topPerson ? Math.max(4, Math.round((p.seconds / topPerson) * 100)) : 0}%` }} />
                          </span>
                          <span className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-[14px] font-medium tabular-nums text-[#172B4D]">
                            {p.running && <span title="Timer running" className="h-2 w-2 animate-pulse rounded-full bg-[#36B37E]" />}
                            {dur(p.seconds, p.running) || '0m'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {worklog.length === 0 ? (
                <p className="rounded-[3px] bg-[#F4F5F7] px-3 py-6 text-center text-[13px] text-[#5E6C84]">No work has been logged yet. Use “Start work” to begin tracking time.</p>
              ) : (
                <ul className="space-y-4">
                  {worklog.map((l) => (
                    <li key={l.log_id} className="flex gap-3">
                      <JiraAvatar name={l.employee_name} id={l.employee_id} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-5 text-[#172B4D]">
                          <b className="font-semibold">{l.employee_name}</b> <span className="text-[#42526E]">{WORK_ACTION[l.action] ?? l.action}</span>
                          {l.code !== task.task_code && <span className="ml-1.5 rounded-[3px] bg-[#DFE1E6] px-1 py-px text-[11px] font-semibold text-[#42526E]">{l.code}</span>}
                          {typeof l.duration_seconds === 'number' && l.duration_seconds > 0 && <span className="ml-2 inline-flex items-center gap-1 rounded-[3px] bg-[#DEEBFF] px-1 py-px text-[12px] font-medium text-[#0747A6]"><Clock className="h-3 w-3" />{dur(l.duration_seconds)}</span>}
                        </p>
                        {l.note && <p className="mt-1 whitespace-pre-wrap text-[14px] text-[#172B4D]">{l.note}</p>}
                        <p className="mt-0.5 text-[12px] text-[#5E6C84]">{fmtDateTime(l.timestamp)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            )}

            {tab === 'history' && (
              history.length === 0 ? (
                <p className="rounded-[3px] bg-[#F4F5F7] px-3 py-6 text-center text-[13px] text-[#5E6C84]">Nothing has changed on this issue yet.</p>
              ) : (
                <ul className="space-y-4">
                  {history.map((h) => (
                    <li key={h.history_id} className="flex gap-3">
                      <JiraAvatar name={h.actor_name ?? 'System'} id={h.actor_id ?? 0} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-5 text-[#172B4D]">
                          <b className="font-semibold">{h.actor_name ?? 'System'}</b>{' '}
                          <span className="text-[#42526E]">{h.event_type.replace(/_/g, ' ')}</span>
                        </p>
                        {h.from_stage && h.to_stage && (
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px]">
                            <Lozenge stage={h.from_stage} /> <span className="text-[#5E6C84]">→</span> <Lozenge stage={h.to_stage} />
                          </p>
                        )}
                        {h.note && <p className="mt-1 whitespace-pre-wrap text-[14px] text-[#172B4D]">{h.note}</p>}
                        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#5E6C84]"><History className="h-3 w-3" />{fmtDateTime(h.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </section>
        </div>

        {/* ───────── Details panel ───────── */}
        <aside className="space-y-4" aria-label="Issue details">
          <div className="rounded-[3px] border border-[#DFE1E6]">
            <h3 className="border-b border-[#DFE1E6] px-4 py-2.5 text-[14px] font-semibold text-[#172B4D]">Details</h3>
            <dl className="space-y-3.5 px-4 py-3.5 text-[14px]">
              <Row label="Status"><Lozenge stage={stage} /></Row>
              <Row label="Assignee">
                {task.assignees?.length ? (
                  <ul className="space-y-1.5">
                    {task.assignees.map((a) => (
                      <li key={a.employee_id} className="flex items-center gap-2">
                        <JiraAvatar name={a.name} id={a.employee_id} src={a.avatar_url} size={24} />
                        <span className="truncate">{a.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-[#7A869A]">Unassigned</span>}
              </Row>
              {task.lead_employee_name && <Row label="Lead"><span>{task.lead_employee_name}</span></Row>}
              <Row label="Reporter">
                {task.created_by_name ? (
                  <span className="flex items-center gap-2"><JiraAvatar name={task.created_by_name} id={task.created_by ?? 0} size={24} /><span className="truncate">{task.created_by_name}</span></span>
                ) : <span className="text-[#7A869A]">—</span>}
              </Row>
              <Row label="Priority"><PriorityBadge priority={task.priority as string} /></Row>
              <Row label="Type"><span>{task.other_task_type || task.task_type_label || 'Task'}</span></Row>
              {sprintName !== undefined && <Row label="Sprint"><span className={sprintName ? '' : 'text-[#7A869A]'}>{sprintName || 'Backlog'}</span></Row>}
              <Row label="Start date">
                <DueDateRow
                  value={(task as TaskDetailDto & { start_date?: string | null }).start_date}
                  overdue={false}
                  canEdit={canEditDates && stage !== 'completed'}
                  onSave={onChangeDate ? (d) => onChangeDate(task.task_id, 'start_date', d) : undefined}
                />
              </Row>
              <Row label="Due date">
                <DueDateRow
                  value={task.due_date}
                  overdue={overdue}
                  canEdit={canEditDates && stage !== 'completed'}
                  projectDeadline={projectDeadline}
                  onSave={onChangeDate ? (d) => onChangeDate(task.task_id, 'due_date', d) : undefined}
                />
              </Row>
              {projectDeadline && <Row label="Project ends"><span>{fmtDate(projectDeadline)}</span></Row>}
            </dl>
          </div>

          <div className="rounded-[3px] border border-[#DFE1E6]">
            <h3 className="flex items-center justify-between border-b border-[#DFE1E6] px-4 py-2.5 text-[14px] font-semibold text-[#172B4D]">
              Time tracking
              {anyRunning && <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#006644]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#36B37E]" />Running</span>}
            </h3>
            <div className="space-y-3 px-4 py-3.5 text-[14px]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[#5E6C84]" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DFE1E6]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Time worked against the estimate">
                  <div className={`h-full rounded-full transition-all ${overBy ? 'bg-[#DE350B]' : 'bg-[color:var(--ac-main,#0052CC)]'}`} style={{ width: `${estimateSec ? pct : spentSec ? 100 : 0}%` }} />
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div><dt className="text-[11px] text-[#5E6C84]">Logged</dt><dd className="font-semibold tabular-nums text-[#172B4D]">{dur(spentSec, anyRunning) || '0m'}</dd></div>
                <div><dt className="text-[11px] text-[#5E6C84]">{overBy ? 'Over by' : 'Remaining'}</dt><dd className={`font-semibold tabular-nums ${overBy ? 'text-[#BF2600]' : 'text-[#172B4D]'}`}>{estimateSec ? dur(overBy || remainingSec) || '0m' : '—'}</dd></div>
                <div><dt className="text-[11px] text-[#5E6C84]">Estimate</dt><dd className="font-semibold tabular-nums text-[#172B4D]">{estimateMin ? durMin(estimateMin) : '—'}</dd></div>
              </dl>
              {byPerson.length > 1 && (
                <ul className="space-y-1.5 border-t border-[#DFE1E6] pt-3">
                  {byPerson.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-[13px]">
                      <JiraAvatar name={p.name} id={p.id} size={20} />
                      <span className="min-w-0 flex-1 truncate text-[#42526E]">{p.name}</span>
                      <span className="font-medium tabular-nums text-[#172B4D]">{dur(p.seconds, p.running) || '0m'}</span>
                    </li>
                  ))}
                  {byPerson.length > 4 && <li className="text-[12px] text-[#5E6C84]">+{byPerson.length - 4} more in the Work log tab</li>}
                </ul>
              )}
            </div>
          </div>

          <p className="space-y-0.5 px-1 text-[12px] leading-5 text-[#5E6C84]">
            <span className="block">Created {fmtDateTime(task.created_at)}</span>
            {task.started_at && <span className="block">Started {fmtDateTime(task.started_at)}</span>}
            {task.requested_at && <span className="block">Sent for review {fmtDateTime(task.requested_at)}</span>}
            {task.completed_at && <span className="block">Completed {fmtDateTime(task.completed_at)}</span>}
          </p>
        </aside>
      </div>

      <HoldReasonModal
        isOpen={holdOpen}
        taskTitle={(mine ?? task).title}
        onClose={() => setHoldOpen(false)}
        onConfirm={(reason) => {
          setHoldOpen(false);
          run('hold', () => onMoveStage((mine ?? task).task_id, 'hold', undefined, reason));
        }}
      />
      <StageDecisionDialog
        isOpen={sendBackFor !== null}
        title="Send back for rework"
        description="The issue returns to In Progress. Tell the assignee what needs to change."
        confirmLabel="Send back"
        requiresNote
        onClose={() => setSendBackFor(null)}
        onConfirm={(note) => {
          const id = sendBackFor;
          setSendBackFor(null);
          if (id !== null) run('back', () => onMoveStage(id, 'in_progress', note));
        }}
      />
    </div>
  );
};

/** The due date in the Details panel. Admins change it in place, like clicking a field in Jira. */
const DueDateRow: React.FC<{
  value?: string | null;
  overdue: boolean;
  canEdit: boolean;
  projectDeadline?: string | null;
  onSave?: (date: string | null) => Promise<void>;
}> = ({ value, overdue, canEdit, projectDeadline, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = value ? value.slice(0, 10) : '';
  const end = projectDeadline ? projectDeadline.slice(0, 10) : '';
  const after = Boolean(current && end && current > end);

  const save = async (next: string | null) => {
    if (!onSave) return;
    setBusy(true);
    setErr(null);
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      const x = e as { detail?: string; message?: string } | null;
      setErr(x?.detail || x?.message || 'Could not save the due date');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <input
          type="date"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Due date"
          className="block h-8 w-full rounded-[3px] border-2 border-[color:var(--ac-400,#4C9AFF)] bg-white px-2 text-[14px] text-[#172B4D] focus:outline-none"
        />
        {err && <p role="alert" className="text-[12px] text-[#BF2600]">{err}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" disabled={busy} onClick={() => save(draft || null)} className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-2.5 text-[13px] font-medium text-white hover:bg-[color:var(--ac-hover,#0065FF)] disabled:opacity-50">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Save
          </button>
          {current && (
            <button type="button" disabled={busy} onClick={() => save(null)} className="h-7 cursor-pointer rounded-[3px] px-2 text-[13px] font-medium text-[#BF2600] hover:bg-[#FFEBE6] disabled:opacity-50">Clear</button>
          )}
          <button type="button" disabled={busy} onClick={() => { setEditing(false); setErr(null); }} className="h-7 cursor-pointer rounded-[3px] px-2 text-[13px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={current ? (overdue ? 'font-medium text-[#BF2600]' : '') : 'text-[#7A869A]'}>
          {current ? fmtDate(current) : 'None'}
          {overdue && ' · overdue'}
        </span>
        {canEdit && onSave && (
          <button
            type="button"
            onClick={() => { setDraft(current); setEditing(true); }}
            aria-label="Change due date"
            title="Change due date"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-[#5E6C84] hover:bg-[rgba(9,30,66,0.08)]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {after && <p className="mt-1 text-[12px] font-medium text-[#974F0C]">After the project deadline</p>}
    </div>
  );
};

/** A label on the left and a value on the right, like a row of Jira's Details panel. */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
    <dt className="pt-0.5 text-[12px] font-semibold text-[#5E6C84]">{label}</dt>
    <dd className="min-w-0 text-[#172B4D]">{children}</dd>
  </div>
);
