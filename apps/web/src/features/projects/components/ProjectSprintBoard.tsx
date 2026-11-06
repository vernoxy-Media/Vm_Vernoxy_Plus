import React, { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUp,
  Clock,
  Equal,
  GitBranch,
  GripVertical,
  Inbox,
  Loader2,
  Lock,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import { HoldReasonModal } from '@/features/tasks/components/HoldReasonModal';
import { StageDecisionDialog } from '@/features/tasks/components/StageDecisionDialog';
import type { TaskStage } from '@/features/tasks/types';
import type { ProjectTaskItem, SprintItem } from '../types';

/* ──────────────── Jira (Atlassian) palette, kept in one place ──────────────── */
const JIRA = {
  text: 'text-[#172B4D]',
  subtle: 'text-[#5E6C84]',
  blue: 'text-[color:var(--ac-main,#0052CC)]',
  border: 'border-[#DFE1E6]',
  column: 'bg-[#F4F5F7]',
  card: 'shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]',
};

const BTN_PRIMARY = 'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-3 text-[14px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)] active:bg-[#0747A6] disabled:cursor-not-allowed disabled:opacity-50';
const BTN_SUBTLE = 'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-[rgba(9,30,66,0.04)] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-50';

/** The five task stages, named the way a Jira board names them. */
const COLUMNS = [
  { stage: 'assigned', label: 'To Do' },
  { stage: 'in_progress', label: 'In Progress' },
  { stage: 'hold', label: 'On Hold' },
  { stage: 'requested', label: 'In Review' },
  { stage: 'completed', label: 'Done' },
] as const;

/** Status lozenges: uppercase, bold, small, exactly like Jira's. */
const LOZENGE: Record<string, string> = {
  assigned: 'bg-[#DFE1E6] text-[#42526E]',
  in_progress: 'bg-[#DEEBFF] text-[#0747A6]',
  hold: 'bg-[#FFF0B3] text-[#172B4D]',
  requested: 'bg-[#EAE6FF] text-[#403294]',
  completed: 'bg-[#E3FCEF] text-[#006644]',
};

const PRIORITY: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  critical: { label: 'Highest', icon: ChevronsUp, color: 'text-[#CD1317]' },
  high: { label: 'High', icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { label: 'Medium', icon: Equal, color: 'text-[#E97F33]' },
  low: { label: 'Low', icon: ChevronDown, color: 'text-[#2D8738]' },
};

const SPRINT_STATUS: Record<string, string> = { planned: 'Planned', active: 'Active', completed: 'Completed' };

/* ───────────────────────── Small building blocks ───────────────────────── */


/** Jira's issue-type badge: a small coloured square (task = blue tick, sub-task = branch). */
const IssueType: React.FC<{ sub?: boolean }> = ({ sub }) => (
  <span title={sub ? 'Sub-task' : 'Task'} className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#4BADE8] text-white">
    {sub ? <GitBranch className="h-2.5 w-2.5" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3.5} />}
  </span>
);

const PriorityIcon: React.FC<{ priority?: string }> = ({ priority }) => {
  const p = PRIORITY[priority || 'medium'] ?? PRIORITY.medium;
  const Icon = p.icon;
  return (
    <span title={`Priority: ${p.label}`} className="inline-flex shrink-0">
      <Icon aria-label={`Priority ${p.label}`} className={`h-4 w-4 ${p.color}`} strokeWidth={3} />
    </span>
  );
};

type Assignee = ProjectTaskItem['assignees'][number];

const Avatar: React.FC<{ person: Assignee; size?: number; ring?: boolean }> = ({ person, size = 24, ring = true }) => (
  <JiraAvatar name={person.name} id={person.emp_id} src={person.profile_picture} size={size} ring={ring} />
);

const Avatars: React.FC<{ people: Assignee[]; max?: number }> = ({ people, max = 2 }) => {
  if (!people.length) {
    return <span title="Unassigned" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DFE1E6] text-[10px] text-[#5E6C84]">?</span>;
  }
  return (
    <div className="flex -space-x-1.5" title={people.map((p) => p.name).join(', ')}>
      {people.slice(0, max).map((p) => <Avatar key={p.emp_id} person={p} />)}
      {people.length > max && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DFE1E6] text-[10px] font-semibold text-[#42526E] ring-2 ring-white">+{people.length - max}</span>}
    </div>
  );
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const DueChip: React.FC<{ task: ProjectTaskItem }> = ({ task }) => {
  if (!task.due_date) return null;
  const overdue = task.stage !== 'completed' && task.due_date < todayIso();
  const label = new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <span title={overdue ? 'Overdue' : 'Due date'} className={`inline-flex items-center gap-1 rounded-[3px] px-1 py-px text-[12px] font-medium ${overdue ? 'bg-[#FFEBE6] text-[#BF2600]' : 'bg-[rgba(9,30,66,0.08)] text-[#42526E]'}`}>
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
};

const SubtaskCount: React.FC<{ subs: ProjectTaskItem[] }> = ({ subs }) => {
  if (!subs.length) return null;
  const done = subs.filter((s) => s.stage === 'completed').length;
  return (
    <span title={`${done} of ${subs.length} sub-tasks done`} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5E6C84]">
      <GitBranch className="h-3.5 w-3.5" />
      {done}/{subs.length}
    </span>
  );
};

const STAGE_DOT: Record<string, string> = {
  assigned: 'bg-[#97A0AF]',
  in_progress: 'bg-[color:var(--ac-main,#0052CC)]',
  hold: 'bg-[#FF991F]',
  requested: 'bg-[#6554C0]',
  completed: 'bg-[#36B37E]',
};

/**
 * A Jira card: summary on top, then issue type, key, priority and the assignee.
 * Sub-tasks sit under the card in a collapsible list that scrolls when there are many.
 */
const BoardCard: React.FC<{
  task: ProjectTaskItem;
  subs: ProjectTaskItem[];
  draggable: boolean;
  /** Why this user cannot move the card; shown when they try to drag it. */
  lockedReason?: string;
  overlay?: boolean;
  onOpen: (id: number) => void;
  onBlocked?: (message: string) => void;
}> = ({ task, subs, draggable, lockedReason, overlay = false, onOpen, onBlocked }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.task_id, disabled: !draggable || overlay });
  const [showSubs, setShowSubs] = useState(false);
  const press = useRef<{ x: number; y: number } | null>(null);
  const done = task.stage === 'completed';
  const doneSubs = subs.filter((s) => s.stage === 'completed').length;

  // A card the user may not move: if they try to drag it, say why instead of doing nothing
  const blocked =
    !draggable && !overlay && lockedReason
      ? {
          onPointerDown: (e: React.PointerEvent) => { press.current = { x: e.clientX, y: e.clientY }; },
          onPointerMove: (e: React.PointerEvent) => {
            if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) {
              press.current = null;
              onBlocked?.(lockedReason);
            }
          },
          onPointerUp: () => { press.current = null; },
          onPointerLeave: () => { press.current = null; },
        }
      : {};

  return (
    <div
      ref={setNodeRef}
      {...(draggable && !overlay ? { ...attributes, ...listeners } : {})}
      {...blocked}
      role="button"
      tabIndex={0}
      onClick={() => !overlay && onOpen(task.task_id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(task.task_id); }}
      className={`rounded-[3px] bg-white p-2.5 outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ac-400,#4C9AFF)] ${JIRA.card} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
        overlay ? 'rotate-2 shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]' : isDragging ? 'opacity-40' : 'hover:bg-[#F4F5F7]'
      }`}
    >
      <p className={`text-[14px] leading-5 ${JIRA.text}`}>{task.title}</p>
      {task.due_date && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <DueChip task={task} />
        </div>
      )}

      {subs.length > 0 && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-expanded={showSubs}
            onClick={() => setShowSubs((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-[3px] px-1 py-1 text-[12px] font-medium text-[#5E6C84] transition hover:bg-[rgba(9,30,66,0.06)]"
          >
            {showSubs ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <GitBranch className="h-3.5 w-3.5" />
            {doneSubs}/{subs.length} sub-tasks
            <span className="ml-auto h-1 w-12 overflow-hidden rounded-full bg-[#DFE1E6]">
              <span className="block h-full rounded-full bg-[#36B37E]" style={{ width: `${(doneSubs / subs.length) * 100}%` }} />
            </span>
          </button>
          {showSubs && (
            <ul className="mt-1 max-h-44 space-y-0.5 overflow-y-auto border-t border-[#DFE1E6] pt-1.5">
              {subs.map((s) => (
                <li key={s.task_id}>
                  <button
                    type="button"
                    onClick={() => onOpen(s.task_id)}
                    title={`${s.task_code} · ${COLUMNS.find((c) => c.stage === s.stage)?.label ?? s.stage}`}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[3px] px-1 py-1 text-left transition hover:bg-[rgba(9,30,66,0.06)]"
                  >
                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${STAGE_DOT[s.stage ?? 'assigned'] ?? STAGE_DOT.assigned}`} />
                    <span className="shrink-0 text-[11px] text-[#5E6C84]">#{(s.task_code ?? '').split('-').pop()}</span>
                    <span className={`min-w-0 flex-1 truncate text-[12px] ${s.stage === 'completed' ? 'text-[#5E6C84] line-through' : 'text-[#172B4D]'}`}>{s.title}</span>
                    {s.assignees?.[0] && <Avatar person={s.assignees[0]} size={16} ring={false} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IssueType />
          <span className={`truncate text-[12px] font-medium ${done ? 'text-[#5E6C84] line-through' : 'text-[#5E6C84]'}`}>{task.task_code}</span>
          {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#36B37E]" />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!draggable && !overlay && !done && lockedReason && (
            <span title={lockedReason} aria-label={lockedReason} className="flex text-[#97A0AF]">
              <Lock className="h-3.5 w-3.5" />
            </span>
          )}
          <PriorityIcon priority={task.priority} />
          <Avatars people={task.assignees ?? []} max={1} />
        </div>
      </div>
    </div>
  );
};

const BoardColumn: React.FC<{ col: (typeof COLUMNS)[number]; count: number; children: React.ReactNode }> = ({ col, count, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.stage}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={col.label}
      className={`flex min-h-[260px] w-[78vw] shrink-0 snap-start flex-col rounded-[3px] p-1.5 transition-colors sm:w-[272px] xl:w-auto ${isOver ? 'bg-[color:var(--ac-50,#DEEBFF)]' : JIRA.column}`}
    >
      <header className="flex items-center gap-1.5 px-1.5 pb-2 pt-1.5">
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.02em] text-[#5E6C84]">
          {col.label}
          <span className="ml-1.5 font-medium">{count}</span>
        </h4>
        {col.stage === 'completed' && <Check className="h-3.5 w-3.5 text-[#36B37E]" strokeWidth={3} />}
      </header>
      <div className="flex-1 space-y-1.5">{children}</div>
    </section>
  );
};

/** Grip on a backlog row. Dragging it onto a sprint (or the backlog) moves the issue there. */
const RowDragHandle: React.FC<{ id: number; label: string }> = ({ id, label }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Drag ${label} to another sprint`}
      title="Drag to another sprint or the backlog"
      className={`flex h-5 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-[3px] text-[#97A0AF] hover:bg-[rgba(9,30,66,0.08)] hover:text-[#42526E] active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
};

/** A sprint or backlog panel that issues can be dropped on. */
const DropGroup: React.FC<{ id: string; disabled?: boolean; children: React.ReactNode }> = ({ id, disabled, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `sprint:${id}`, disabled });
  return (
    <section ref={setNodeRef} className={`rounded-[3px] p-1.5 transition-colors ${isOver && !disabled ? 'bg-[color:var(--ac-50,#DEEBFF)] outline outline-2 outline-[color:var(--ac-400,#4C9AFF)]' : 'bg-[#F4F5F7]'}`}>
      {children}
    </section>
  );
};

/** Asks where the unfinished tasks of a sprint should go before it is closed. */
const CompleteSprintModal: React.FC<{
  sprint: SprintItem;
  unfinished: number;
  done: number;
  targets: SprintItem[];
  onClose: () => void;
  onConfirm: (moveTo: number | null) => Promise<void>;
}> = ({ sprint, unfinished, done, targets, onClose, onConfirm }) => {
  const [moveTo, setMoveTo] = useState<string>('backlog');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(moveTo === 'backlog' ? null : Number(moveTo));
      onClose();
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      setError(e?.detail || e?.message || 'Failed to complete the sprint');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(9,30,66,0.54)] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Complete sprint">
      <div className="w-full max-w-[480px] rounded-t-[3px] bg-white shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] sm:rounded-[3px]">
        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-5">
          <h3 className={`text-[20px] font-medium ${JIRA.text}`}>Complete {sprint.sprint_name}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-[3px] p-1 text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-6 pb-4 text-[14px] text-[#172B4D]">
          {error && <p role="alert" className="rounded-[3px] bg-[#FFEBE6] px-3 py-2 text-[13px] text-[#BF2600]">{error}</p>}
          <p>
            This sprint contains <b>{done} completed</b> issue{done === 1 ? '' : 's'} and <b>{unfinished} open</b> issue{unfinished === 1 ? '' : 's'}.
          </p>
          {unfinished > 0 ? (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase text-[#5E6C84]">Move open issues to</p>
              <div className="space-y-1">
                {[{ id: 'backlog', name: 'Backlog' }, ...targets.map((t) => ({ id: String(t.sprint_id), name: t.sprint_name }))].map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-2.5 rounded-[3px] border-2 px-3 py-2 text-[14px] transition ${moveTo === o.id ? 'border-[color:var(--ac-400,#4C9AFF)] bg-[color:var(--ac-50,#DEEBFF)]' : 'border-[#DFE1E6] hover:bg-[#F4F5F7]'}`}>
                    <input type="radio" name="move-to" value={o.id} checked={moveTo === o.id} onChange={() => setMoveTo(o.id)} className="accent-[color:var(--ac-main,#0052CC)]" />
                    {o.name}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-[#006644]"><CheckCircle2 className="h-4 w-4" /> Every issue in this sprint is done.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button type="button" onClick={onClose} className="h-8 cursor-pointer rounded-[3px] px-3 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className={BTN_PRIMARY}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Complete sprint
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export interface ProjectSprintBoardProps {
  tasks: ProjectTaskItem[];
  sprints: SprintItem[];
  members: Array<{ employee_id: number; name: string }>;
  canManage: boolean;
  /** Admins approve or send back work that is In Review. */
  isAdmin: boolean;
  currentEmpId?: number;
  /** When given, the parent owns Board / Backlog (for example a sidebar) and the board hides its own tabs. */
  view?: 'board' | 'list';
  onViewChange?: (view: 'board' | 'list') => void;
  /** 'all' or a sprint id as text. */
  sprintFilter: string;
  onSprintFilter: (value: string) => void;
  /** 'all' or an employee id as text. */
  assigneeFilter: string;
  onAssigneeFilter: (value: string) => void;
  onOpenTask: (taskId: number) => void;
  /** Opens Create Task; a sprint id pre-selects that sprint, null means the backlog. */
  onAddTask: (sprintId?: number | null) => void;
  onAddSprint: () => void;
  onMoveStage: (taskId: number, stage: TaskStage, note?: string, holdReason?: string) => void | Promise<void>;
  onStartSprint: (sprintId: number) => Promise<void>;
  onCompleteSprint: (sprintId: number, moveToSprintId: number | null) => Promise<void>;
  onMoveToSprint: (taskId: number, sprintId: number | null) => Promise<void>;
}

export const ProjectSprintBoard: React.FC<ProjectSprintBoardProps> = ({
  tasks,
  sprints,
  canManage,
  isAdmin,
  currentEmpId,
  view: controlledView,
  onViewChange,
  sprintFilter,
  onSprintFilter,
  assigneeFilter,
  onAssigneeFilter,
  onOpenTask,
  onAddTask,
  onAddSprint,
  onMoveStage,
  onStartSprint,
  onCompleteSprint,
  onMoveToSprint,
}) => {
  const [ownView, setOwnView] = useState<'board' | 'list'>('board');
  const view = controlledView ?? ownView;
  const setView = onViewChange ?? setOwnView;
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [allSubs, setAllSubs] = useState<Set<number>>(new Set());
  const [dragId, setDragId] = useState<number | null>(null);
  const [holdTaskId, setHoldTaskId] = useState<number | null>(null);
  const [sendBackTaskId, setSendBackTaskId] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [sprintBusy, setSprintBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const sprint = sprints.find((s) => String(s.sprint_id) === sprintFilter) ?? null;
  const activeSprint = sprints.find((s) => s.status === 'active') ?? null;

  /** Everyone who has work in this project, for Jira's avatar quick filter. */
  const people = useMemo(() => {
    const map = new Map<number, Assignee>();
    tasks.forEach((t) => t.assignees?.forEach((a) => map.set(a.emp_id, a)));
    return [...map.values()];
  }, [tasks]);

  /** Tasks after the sprint / assignee / search filters. */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (sprintFilter !== 'all' && String(t.sprint_id) !== sprintFilter) return false;
      if (assigneeFilter !== 'all' && !t.assignees?.some((a) => String(a.emp_id) === assigneeFilter)) return false;
      if (q && !`${t.task_code ?? ''} ${t.title}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, sprintFilter, assigneeFilter, search]);

  /** Sub-tasks grouped under their parent; a sub-task whose parent is hidden is shown as a normal task. */
  const { topLevel, subsOf } = useMemo(() => {
    const ids = new Set(visible.map((t) => t.task_id));
    const subs = new Map<number, ProjectTaskItem[]>();
    const top: ProjectTaskItem[] = [];
    visible.forEach((t) => {
      if (t.parent_task_id && ids.has(t.parent_task_id)) {
        subs.set(t.parent_task_id, [...(subs.get(t.parent_task_id) ?? []), t]);
      } else top.push(t);
    });
    return { topLevel: top, subsOf: subs };
  }, [visible]);

  const hasFilters = sprintFilter !== 'all' || assigneeFilter !== 'all' || search !== '';

  const sprintInfo = useMemo(() => {
    if (!sprint) return null;
    const inSprint = tasks.filter((t) => t.sprint_id === sprint.sprint_id);
    const done = inSprint.filter((t) => t.stage === 'completed').length;
    const total = inSprint.length;
    const end = new Date(`${sprint.end_date.slice(0, 10)}T23:59:59`);
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
    return { done, total, unfinished: total - done, pct: total ? Math.round((done / total) * 100) : 0, daysLeft };
  }, [sprint, tasks]);

  const fmt = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  /* ───── Drag and drop, with the same rules as the Task board ───── */

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const collision: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length ? hits : closestCorners(args);
  };

  /** Who may drag a card at all: its assignee, or an admin approving something In Review. */
  const canDrag = (t: ProjectTaskItem) => {
    if (t.stage === 'completed') return false;
    if (isAdmin && t.stage === 'requested') return true;
    return Boolean(currentEmpId && t.assignees?.some((a) => a.emp_id === currentEmpId));
  };

  /** Why the current user cannot move a card, in words. */
  const lockReason = (t: ProjectTaskItem): string | undefined => {
    if (t.stage === 'completed') return 'Done issues cannot be moved';
    if (canDrag(t)) return undefined;
    const names = (t.assignees ?? []).map((a) => a.name).join(', ');
    return names ? `Only ${names} can move this issue` : 'Only the assignee can move this issue';
  };

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((cur) => (cur === msg ? null : cur)), 3500);
  };

  /** Backlog: drop an issue on a sprint (or the backlog) to plan it there. */
  const handleBacklogDrop = (e: DragEndEvent) => {
    setDragId(null);
    const over = e.over ? String(e.over.id) : '';
    if (!over.startsWith('sprint:')) return;
    const task = tasks.find((t) => t.task_id === Number(e.active.id));
    if (!task) return;
    const target = over.slice('sprint:'.length);
    const targetId = target === 'backlog' ? null : Number(target);
    if ((task.sprint_id ?? null) === targetId) return;
    runSprintAction(() => onMoveToSprint(task.task_id, targetId));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const target = e.over ? String(e.over.id).replace('col:', '') : null;
    const task = tasks.find((t) => t.task_id === Number(e.active.id));
    if (!target || !task || task.stage === target) return;
    if (!COLUMNS.some((c) => c.stage === target)) return;

    if (task.stage === 'completed') return flash('Done issues cannot be moved.');
    if (target === 'hold') return setHoldTaskId(task.task_id);
    if (task.stage === 'requested' && target === 'in_progress' && isAdmin) return setSendBackTaskId(task.task_id);
    if (target === 'completed' && !isAdmin) return flash('Only an admin can approve an issue as Done.');
    const approverMove = isAdmin && task.stage === 'requested' && (target === 'completed' || target === 'in_progress');
    if (!approverMove && !canDrag(task)) return flash('Only the assignee can move this issue.');
    onMoveStage(task.task_id, target as TaskStage);
  };

  const dragged = dragId !== null ? tasks.find((t) => t.task_id === dragId) ?? null : null;
  const holdTask = holdTaskId !== null ? tasks.find((t) => t.task_id === holdTaskId) : null;
  const sendBackTask = sendBackTaskId !== null ? tasks.find((t) => t.task_id === sendBackTaskId) : null;

  /* ───── Sprint actions ───── */

  const runSprintAction = async (fn: () => Promise<void>) => {
    setSprintBusy(true);
    try {
      await fn();
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      flash(e?.detail || e?.message || 'Could not update the sprint');
    } finally {
      setSprintBusy(false);
    }
  };

  const moveTargets = (currentId: number | null | undefined) => sprints.filter((s) => s.status !== 'completed' && s.sprint_id !== currentId);

  /* ───── Backlog rows ───── */

  const renderRow = (task: ProjectTaskItem, depth = 0): React.ReactNode => {
    const subs = subsOf.get(task.task_id) ?? [];
    const open = expanded.has(task.task_id);
    const targets = moveTargets(task.sprint_id);
    const done = task.stage === 'completed';
    return (
      <React.Fragment key={task.task_id}>
        <div className="flex min-h-10 items-center gap-2 border-b border-[#DFE1E6] bg-white px-2 py-1.5 transition-colors last:border-b-0 hover:bg-[#F4F5F7] sm:gap-2.5" style={{ paddingLeft: depth ? 40 : undefined }}>
          {depth === 0 && canManage && <RowDragHandle id={task.task_id} label={task.task_code ?? task.title} />}
          {depth === 0 &&
            (subs.length ? (
              <button
                type="button"
                aria-label={open ? 'Hide sub-tasks' : 'Show sub-tasks'}
                onClick={() => setExpanded((cur) => { const n = new Set(cur); if (n.has(task.task_id)) n.delete(task.task_id); else n.add(task.task_id); return n; })}
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]"
              >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            ))}
          <IssueType sub={depth > 0} />
          <span className={`hidden w-[120px] shrink-0 truncate text-[14px] ${done ? 'text-[#5E6C84] line-through' : 'text-[#5E6C84]'} sm:block`}>{task.task_code}</span>
          <button type="button" onClick={() => onOpenTask(task.task_id)} className="min-w-0 flex-1 cursor-pointer text-left">
            <span className={`block truncate text-[14px] hover:text-[color:var(--ac-main,#0052CC)] hover:underline ${JIRA.text}`}>{task.title}</span>
            <span className="block text-[11px] text-[#5E6C84] sm:hidden">{task.task_code}</span>
          </button>
          {depth === 0 && <span className="hidden md:block"><SubtaskCount subs={subs} /></span>}
          <span className="hidden md:block"><DueChip task={task} /></span>
          <span className={`hidden shrink-0 rounded-[3px] px-1 py-px text-[11px] font-bold uppercase tracking-[0.01em] sm:inline-block ${LOZENGE[task.stage ?? 'assigned'] ?? LOZENGE.assigned}`}>
            {COLUMNS.find((c) => c.stage === task.stage)?.label ?? task.stage}
          </span>
          {canManage && depth === 0 && (
            <select
              aria-label={`Move ${task.task_code} to a sprint`}
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                runSprintAction(() => onMoveToSprint(task.task_id, v === 'backlog' ? null : Number(v)));
              }}
              className="hidden h-7 w-24 shrink-0 cursor-pointer rounded-[3px] border-2 border-[#DFE1E6] bg-white px-1 text-[12px] text-[#42526E] hover:border-[#B3BAC5] focus:border-[color:var(--ac-400,#4C9AFF)] focus:outline-none md:block"
            >
              <option value="">Move to…</option>
              {task.sprint_id && <option value="backlog">Backlog</option>}
              {targets.map((s) => <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_name}</option>)}
            </select>
          )}
          <PriorityIcon priority={task.priority} />
          <Avatars people={task.assignees ?? []} max={2} />
        </div>
        {open && (allSubs.has(task.task_id) ? subs : subs.slice(0, 8)).map((s) => renderRow(s, 1))}
        {open && subs.length > 8 && (
          <button
            type="button"
            onClick={() => setAllSubs((cur) => { const n = new Set(cur); if (n.has(task.task_id)) n.delete(task.task_id); else n.add(task.task_id); return n; })}
            className="flex h-8 w-full cursor-pointer items-center border-b border-[#DFE1E6] bg-[#FAFBFC] pl-10 text-left text-[13px] font-medium text-[color:var(--ac-main,#0052CC)] hover:bg-[#F4F5F7]"
          >
            {allSubs.has(task.task_id) ? 'Show fewer' : `Show all ${subs.length} sub-tasks`}
          </button>
        )}
      </React.Fragment>
    );
  };

  const groups = useMemo(() => {
    const out: Array<{ key: string; name: string; sprint?: SprintItem; tasks: ProjectTaskItem[] }> = [];
    sprints.forEach((s) => {
      const list = topLevel.filter((t) => t.sprint_id === s.sprint_id);
      if (sprintFilter === 'all' ? list.length > 0 || s.status !== 'completed' : true) out.push({ key: String(s.sprint_id), name: s.sprint_name, sprint: s, tasks: list });
    });
    const backlog = topLevel.filter((t) => !t.sprint_id || !sprints.some((s) => s.sprint_id === t.sprint_id));
    if (backlog.length || sprintFilter === 'all') out.push({ key: 'backlog', name: 'Backlog', tasks: backlog });
    return out;
  }, [sprints, topLevel, sprintFilter]);

  /** Jira's "To Do / In Progress / Done" counters in a group header. */
  const Counters: React.FC<{ list: ProjectTaskItem[] }> = ({ list }) => {
    const todo = list.filter((t) => t.stage === 'assigned' || t.stage === 'hold').length;
    const doing = list.filter((t) => t.stage === 'in_progress' || t.stage === 'requested').length;
    const done = list.filter((t) => t.stage === 'completed').length;
    const pill = 'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[12px] font-semibold';
    return (
      <span className="flex shrink-0 items-center gap-1" aria-label={`${todo} to do, ${doing} in progress, ${done} done`}>
        <span title="To do" className={`${pill} bg-[#DFE1E6] text-[#42526E]`}>{todo}</span>
        <span title="In progress" className={`${pill} bg-[#DEEBFF] text-[#0747A6]`}>{doing}</span>
        <span title="Done" className={`${pill} bg-[#E3FCEF] text-[#006644]`}>{done}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {notice && <div role="status" className="rounded-[3px] bg-[#FFFAE6] px-3 py-2 text-[13px] text-[#172B4D] shadow-[inset_3px_0_0_#FF991F]">{notice}</div>}

      {/* Sprint header, the way Jira shows it above the board */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className={`text-[20px] font-medium leading-7 ${JIRA.text}`}>{sprint ? sprint.sprint_name : 'All work'}</h3>
            {sprint && <span className={`rounded-[3px] px-1 py-px text-[11px] font-bold uppercase ${sprint.status === 'active' ? 'bg-[#DEEBFF] text-[#0747A6]' : sprint.status === 'completed' ? 'bg-[#E3FCEF] text-[#006644]' : 'bg-[#DFE1E6] text-[#42526E]'}`}>{SPRINT_STATUS[sprint.status]}</span>}
            {sprint && sprintInfo && sprint.status !== 'completed' && (
              <span className={`inline-flex items-center gap-1 rounded-[3px] bg-[rgba(9,30,66,0.08)] px-1.5 py-0.5 text-[12px] font-medium ${sprintInfo.daysLeft < 0 ? 'text-[#BF2600]' : 'text-[#42526E]'}`}>
                <Clock className="h-3 w-3" />
                {sprintInfo.daysLeft < 0 ? `${-sprintInfo.daysLeft} day${sprintInfo.daysLeft === -1 ? '' : 's'} overdue` : sprintInfo.daysLeft === 0 ? 'Ends today' : `${sprintInfo.daysLeft} day${sprintInfo.daysLeft === 1 ? '' : 's'} remaining`}
              </span>
            )}
          </div>
          {sprint ? (
            <p className="mt-0.5 text-[12px] text-[#5E6C84]">
              {fmt(sprint.start_date)} – {fmt(sprint.end_date)}
              {sprintInfo && <> · {sprintInfo.done} of {sprintInfo.total} issues done ({sprintInfo.pct}%)</>}
              {sprint.sprint_goal && <> · <span className="text-[#42526E]">Goal: {sprint.sprint_goal}</span></>}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-[#5E6C84]">{tasks.length} issue{tasks.length === 1 ? '' : 's'} in this project</p>
          )}
          {sprint && sprintInfo && (
            <div className="mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full bg-[#DFE1E6]">
              <div className="h-full rounded-full bg-[#36B37E] transition-all" style={{ width: `${sprintInfo.pct}%` }} />
            </div>
          )}
        </div>
        {canManage && sprint && sprint.status === 'planned' && (
          <button type="button" disabled={sprintBusy || Boolean(activeSprint)} title={activeSprint ? `Complete "${activeSprint.sprint_name}" before starting another sprint` : 'Start this sprint'} onClick={() => runSprintAction(() => onStartSprint(sprint.sprint_id))} className={BTN_PRIMARY}>
            {sprintBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Start sprint
          </button>
        )}
        {canManage && sprint && sprint.status === 'active' && (
          <button type="button" disabled={sprintBusy} onClick={() => setCompleting(true)} className={BTN_SUBTLE}>Complete sprint</button>
        )}
      </div>

      {/* Sprint switcher */}
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        {[{ id: 'all', name: 'All work' }, ...sprints.map((s) => ({ id: String(s.sprint_id), name: s.sprint_name }))].map((chip) => {
          const on = sprintFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onSprintFilter(chip.id)}
              className={`h-7 shrink-0 cursor-pointer rounded-[3px] px-2.5 text-[13px] font-medium transition ${on ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
            >
              {chip.name}
            </button>
          );
        })}
        {canManage && (
          <button type="button" onClick={onAddSprint} className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[3px] px-2 text-[13px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
            <Plus className="h-3.5 w-3.5" /> Create sprint
          </button>
        )}
      </div>

      {/* Board / Backlog tabs and filters */}
      <div className="flex flex-col gap-3 border-b-2 border-[#DFE1E6] md:flex-row md:items-end md:justify-between">
        <div role="tablist" aria-label="Task view" className={`-mb-0.5 flex ${controlledView ? 'hidden' : ''}`}>
          {([['board', 'Board'], ['list', 'Backlog']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`cursor-pointer border-b-2 px-3 pb-2.5 pt-1 text-[14px] font-medium transition ${view === id ? 'border-[color:var(--ac-main,#0052CC)] text-[color:var(--ac-main,#0052CC)]' : 'border-transparent text-[#42526E] hover:bg-[rgba(9,30,66,0.04)]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6C84]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this board"
              className="h-8 w-40 rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] pl-7 pr-2 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] hover:bg-[#EBECF0] focus:w-52 focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none sm:transition-all"
            />
          </div>

          {/* Jira's avatar quick filter */}
          {canManage && people.length > 0 && (
            <div className="flex items-center" role="group" aria-label="Filter by assignee">
              <div className="flex -space-x-1">
                {people.slice(0, 6).map((p) => {
                  const on = assigneeFilter === String(p.emp_id);
                  return (
                    <button key={p.emp_id} type="button" onClick={() => onAssigneeFilter(on ? 'all' : String(p.emp_id))} aria-pressed={on} title={p.name} className={`cursor-pointer rounded-full transition hover:-translate-y-0.5 ${on ? 'z-10 ring-2 ring-[color:var(--ac-main,#0052CC)]' : ''}`}>
                      <Avatar person={p} size={32} />
                    </button>
                  );
                })}
              </div>
              {people.length > 6 && <span className="ml-1.5 text-[12px] font-medium text-[#5E6C84]">+{people.length - 6}</span>}
            </div>
          )}

          {canManage && currentEmpId && (
            <button
              type="button"
              aria-pressed={assigneeFilter === String(currentEmpId)}
              onClick={() => onAssigneeFilter(assigneeFilter === String(currentEmpId) ? 'all' : String(currentEmpId))}
              className={`h-8 cursor-pointer rounded-[3px] px-2.5 text-[14px] font-medium transition ${assigneeFilter === String(currentEmpId) ? 'bg-[color:var(--ac-main,#0052CC)] text-white' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
            >
              Only my issues
            </button>
          )}
          {hasFilters && (
            <button type="button" onClick={() => { onSprintFilter('all'); onAssigneeFilter('all'); setSearch(''); }} className="h-8 cursor-pointer rounded-[3px] px-2 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
              Clear filters
            </button>
          )}
          {canManage && (
            <button type="button" onClick={() => onAddTask(sprint && sprint.status !== 'completed' ? sprint.sprint_id : undefined)} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Create
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {topLevel.length === 0 && view === 'board' ? (
        <div className="rounded-[3px] bg-[#F4F5F7] px-4 py-14 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-[#97A0AF]" />
          <h4 className={`text-[16px] font-medium ${JIRA.text}`}>{hasFilters ? 'No issues match your filters' : 'No issues yet'}</h4>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-[#5E6C84]">
            {hasFilters ? 'Try a different sprint or clear the filters.' : 'Create an issue to start planning this project.'}
          </p>
          {canManage && !hasFilters && <button type="button" onClick={() => onAddTask()} className={`${BTN_PRIMARY} mt-4`}>Create issue</button>}
        </div>
      ) : view === 'board' ? (
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={(e: DragStartEvent) => setDragId(Number(e.active.id))} onDragCancel={() => setDragId(null)} onDragEnd={handleDragEnd}>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-3 xl:grid xl:grid-cols-5 xl:overflow-visible">
            {COLUMNS.map((col) => {
              const cards = topLevel.filter((t) => (t.stage ?? 'assigned') === col.stage);
              return (
                <BoardColumn key={col.stage} col={col} count={cards.length}>
                  {cards.map((t) => <BoardCard key={t.task_id} task={t} subs={subsOf.get(t.task_id) ?? []} draggable={canDrag(t)} lockedReason={lockReason(t)} onBlocked={flash} onOpen={onOpenTask} />)}
                </BoardColumn>
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {dragged ? <BoardCard task={dragged} subs={subsOf.get(dragged.task_id) ?? []} draggable={false} overlay onOpen={() => undefined} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={(e: DragStartEvent) => setDragId(Number(e.active.id))} onDragCancel={() => setDragId(null)} onDragEnd={handleBacklogDrop}>
        <div className="space-y-3">
          {groups.map((g) => {
            const shut = collapsed.has(g.key);
            return (
              <DropGroup key={g.key} id={g.sprint ? String(g.sprint.sprint_id) : 'backlog'} disabled={!canManage || g.sprint?.status === 'completed'}>
                <div className="flex items-center gap-1.5 px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => setCollapsed((cur) => { const n = new Set(cur); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
                    aria-expanded={!shut}
                  >
                    {shut ? <ChevronRight className="h-4 w-4 shrink-0 text-[#42526E]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#42526E]" />}
                    <span className={`truncate text-[14px] font-semibold ${JIRA.text}`}>{g.name}</span>
                    {g.sprint && <span className="hidden shrink-0 text-[12px] text-[#5E6C84] sm:inline">{fmt(g.sprint.start_date)} – {fmt(g.sprint.end_date)}</span>}
                    <span className="shrink-0 text-[12px] text-[#5E6C84]">({g.tasks.length} issue{g.tasks.length === 1 ? '' : 's'})</span>
                    {g.sprint && g.sprint.status !== 'planned' && (
                      <span className={`ml-1 shrink-0 rounded-[3px] px-1 py-px text-[11px] font-bold uppercase ${g.sprint.status === 'active' ? 'bg-[#DEEBFF] text-[#0747A6]' : 'bg-[#E3FCEF] text-[#006644]'}`}>{SPRINT_STATUS[g.sprint.status]}</span>
                    )}
                  </button>
                  <Counters list={g.tasks} />
                  {canManage && (!g.sprint || g.sprint.status !== 'completed') && (
                    <button type="button" onClick={() => onAddTask(g.sprint ? g.sprint.sprint_id : null)} aria-label={`Create issue in ${g.name}`} title={`Create issue in ${g.name}`} className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {!shut && (
                  <div className="overflow-hidden rounded-[3px] border border-[#DFE1E6] bg-white">
                    {g.tasks.length === 0 ? (
                      <p className="border-dashed px-4 py-5 text-center text-[13px] text-[#5E6C84]">{g.sprint ? 'Drag an issue here, or use "Move to…" on a backlog issue.' : 'Your backlog is empty.'}</p>
                    ) : g.tasks.map((t) => renderRow(t))}
                  </div>
                )}
              </DropGroup>
            );
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragged ? (
            <div className="flex items-center gap-2 rounded-[3px] border border-[color:var(--ac-400,#4C9AFF)] bg-white px-3 py-2 text-[14px] text-[#172B4D] shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
              <IssueType />
              <span className="text-[#5E6C84]">{dragged.task_code}</span>
              <span className="max-w-[260px] truncate">{dragged.title}</span>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}

      <HoldReasonModal
        isOpen={holdTask != null}
        taskTitle={holdTask?.title ?? ''}
        onClose={() => setHoldTaskId(null)}
        onConfirm={(reason) => {
          if (holdTaskId !== null) onMoveStage(holdTaskId, 'hold', undefined, reason);
          setHoldTaskId(null);
        }}
      />
      <StageDecisionDialog
        isOpen={sendBackTask != null}
        title="Send back for rework"
        description={`"${sendBackTask?.title ?? ''}" returns to In Progress. Tell the assignee what needs to change.`}
        confirmLabel="Send back"
        requiresNote
        onClose={() => setSendBackTaskId(null)}
        onConfirm={(note) => {
          if (sendBackTaskId !== null) onMoveStage(sendBackTaskId, 'in_progress', note);
          setSendBackTaskId(null);
        }}
      />
      {completing && sprint && sprintInfo && (
        <CompleteSprintModal
          sprint={sprint}
          done={sprintInfo.done}
          unfinished={sprintInfo.unfinished}
          targets={moveTargets(sprint.sprint_id)}
          onClose={() => setCompleting(false)}
          onConfirm={(moveTo) => onCompleteSprint(sprint.sprint_id, moveTo)}
        />
      )}
    </div>
  );
};
