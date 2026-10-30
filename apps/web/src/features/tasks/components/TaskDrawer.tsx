import React from 'react';
import {
  X,
  Calendar,
  Clock,
  Edit2,
  AlertCircle,
  AlertTriangle,
  GitBranch,
  Lock,
  Check,
  Play,
  Pause,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Activity,
  Timer,
  FileText,
} from 'lucide-react';
import { TaskDetailDto } from '@vernoxy-pulse/api-client';
import type { TaskStage, TaskPriority } from '../types';
import { Avatar } from '@/shared/ui/Avatar';
import { TaskHistoryTimeline } from './TaskHistoryTimeline';
import { useAuth } from '@/features/auth/context/AuthContext';

export interface TaskDrawerProps {
  task: TaskDetailDto | null;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (task: TaskDetailDto) => void;
  onMoveStage?: (taskId: number, targetStage: TaskStage, note?: string) => void;
  onTrackWorkSession?: (taskId: number, action: 'start' | 'pause' | 'finish', note?: string) => void | Promise<void>;
}

const STAGE_LABELS: Record<TaskStage, { label: string; badge: string }> = {
  assigned: { label: 'Assigned', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  hold: { label: 'Hold', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  requested: { label: 'Submitted', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  completed: { label: 'Approved', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const PRIORITY_DOTS: Record<TaskPriority, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-rose-600',
};

function computeSeconds(
  actualMinutes: number = 0,
  isRunning: boolean = false,
  timerStartedAt?: string | Date | null,
  currentNow: number = Date.now(),
  workLogs?: any[],
): number {
  let sec = (actualMinutes || 0) * 60;
  if (Array.isArray(workLogs) && workLogs.length > 0) {
    const loggedSeconds = workLogs.reduce(
      (acc, l) => acc + (typeof l.duration_seconds === 'number' ? l.duration_seconds : 0),
      0,
    );
    if (loggedSeconds > 0) {
      sec = loggedSeconds;
    }
  }
  if (isRunning && timerStartedAt) {
    const start = new Date(timerStartedAt).getTime();
    if (!isNaN(start) && currentNow > start) {
      sec += Math.floor((currentNow - start) / 1000);
    }
  }
  return Math.max(0, sec);
}

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatDateDisplay(d: string | Date | null | undefined): string {
  if (!d) return 'None';
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

function formatDateTimeDisplay(d: string | Date | null | undefined): string {
  if (!d) return 'None';
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  isOpen,
  isAdmin,
  onClose,
  onEdit,
  onMoveStage,
  onTrackWorkSession,
}) => {
  const { user } = useAuth();
  const [nowMs, setNowMs] = React.useState<number>(Date.now());
  const [expandedLogs, setExpandedLogs] = React.useState<boolean>(false);
  const [expandedSubTaskLogs, setExpandedSubTaskLogs] = React.useState<Record<number, boolean>>({});
  const [submittingAction, setSubmittingAction] = React.useState<string | null>(null);

  const subTasks = task?.sub_tasks || [];
  // If task has sub-tasks, check if the current user is assigned to one of them
  const mySubTask =
    (task?.has_sub_tasks || subTasks.length > 0)
      ? subTasks.find((st) => st.assignees.some((a) => a.employee_id === user?.emp_id))
      : null;

  // The active task whose session this user is performing:
  // - If the task has sub-tasks and the user is assigned to one: mySubTask
  // - If the task has NO sub-tasks: task itself
  // - If the task has sub-tasks and user is not assigned: null (supervisor view)
  const activeTask = mySubTask || (!task?.has_sub_tasks && subTasks.length === 0 ? task : null);

  // Live ticking timer every 1000ms if active task or any subtask has is_timer_running === true
  React.useEffect(() => {
    const hasRunning =
      activeTask?.is_timer_running ||
      task?.is_timer_running ||
      subTasks.some((st) => st.is_timer_running);

    if (!hasRunning) return;

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask?.is_timer_running, task?.is_timer_running, subTasks]);

  if (!isOpen || !task) return null;

  const stage = (task.stage as TaskStage) || 'assigned';
  const stageConfig = STAGE_LABELS[stage] || STAGE_LABELS.assigned;
  const isOverdue =
    stage !== 'completed' &&
    Boolean(task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0));

  // Time calculations for TIME PRECISION ENGINE
  // 1. Total Allocated: task.allocated_minutes or sum of subtasks' allocated_minutes
  const totalAllocatedMinutes =
    task.allocated_minutes ||
    (subTasks.length > 0 ? subTasks.reduce((sum, st) => sum + (st.allocated_minutes || 0), 0) : 0);
  const totalAllocatedHoursStr =
    totalAllocatedMinutes > 0 ? `${(totalAllocatedMinutes / 60).toFixed(1)} hrs` : '0.0 hrs';

  const mySubTaskAllocatedStr =
    mySubTask && mySubTask.allocated_minutes
      ? `${(mySubTask.allocated_minutes / 60).toFixed(1)} hrs`
      : null;

  // 2. Total working time of all sub-tasks (combinedTotalSec) - strictly 1x real-time speed
  let combinedTotalSec = 0;
  if (subTasks.length > 0) {
    const baseSubSec = subTasks.reduce((sum, st) => {
      let sec = (st.actual_minutes || 0) * 60;
      if (Array.isArray(st.work_logs) && st.work_logs.length > 0) {
        const logged = st.work_logs.reduce(
          (acc, l) => acc + (typeof l.duration_seconds === 'number' ? l.duration_seconds : 0),
          0,
        );
        if (logged > 0) sec = logged;
      }
      return sum + sec;
    }, 0);

    const runningSts = subTasks.filter((st) => st.is_timer_running && st.timer_started_at);
    let liveElapsed = 0;
    if (runningSts.length > 0) {
      const earliest = Math.min(...runningSts.map((st) => new Date(st.timer_started_at!).getTime()));
      if (!isNaN(earliest) && nowMs > earliest) {
        liveElapsed = Math.floor((nowMs - earliest) / 1000);
      }
    }
    combinedTotalSec = baseSubSec + liveElapsed;
  } else {
    combinedTotalSec = computeSeconds(
      task.actual_minutes,
      task.is_timer_running,
      task.timer_started_at,
      nowMs,
      task.work_logs,
    );
  }

  // 3. User's sub-task working time (if assigned)
  const mySubTaskSec = mySubTask
    ? computeSeconds(
        mySubTask.actual_minutes,
        mySubTask.is_timer_running,
        mySubTask.timer_started_at,
        nowMs,
        mySubTask.work_logs,
      )
    : null;

  // 4. Any timer active indicator
  const isAnyTimerRunning =
    Boolean(task.is_timer_running) ||
    subTasks.some((st) => st.is_timer_running);

  // 5. Projected efficiency based on total working time of all sub-tasks
  let efficiencyPct = 0;
  if (totalAllocatedMinutes > 0 && combinedTotalSec > 0) {
    efficiencyPct = Math.round(((totalAllocatedMinutes * 60) / combinedTotalSec) * 100);
  } else if (totalAllocatedMinutes > 0 && combinedTotalSec === 0) {
    efficiencyPct = 100;
  }

  let allSubTasksFinished = subTasks.length > 0;
  let latestFinishDate: Date | null = null;

  if (subTasks.length > 0) {
    for (const st of subTasks) {
      if (st.stage !== 'completed') {
        allSubTasksFinished = false;
      }
      if (st.completed_at) {
        const cDate = new Date(st.completed_at);
        if (!latestFinishDate || cDate > latestFinishDate) {
          latestFinishDate = cDate;
        }
      }
    }
  }

  // Unified work logs collected from main task + subtasks
  interface UnifiedLog {
    log_id: string;
    task_code: string;
    task_title: string;
    employee_name: string;
    action: string;
    timestamp: string;
    duration_seconds?: number | null;
    note?: string | null;
  }

  const allLogs: UnifiedLog[] = [];
  if (Array.isArray(task.work_logs)) {
    for (const l of task.work_logs) {
      allLogs.push({
        ...l,
        task_code: task.task_code,
        task_title: task.title,
      });
    }
  }
  for (const st of subTasks) {
    if (Array.isArray(st.work_logs)) {
      for (const sl of st.work_logs) {
        allLogs.push({
          ...sl,
          task_code: st.task_code,
          task_title: st.title,
        });
      }
    }
  }
  // Sort logs descending by timestamp
  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleAction = async (taskId: number, action: 'start' | 'pause' | 'finish', note?: string) => {
    if (!onTrackWorkSession) return;
    try {
      setSubmittingAction(`${taskId}_${action}`);
      await onTrackWorkSession(taskId, action, note);
    } finally {
      setSubmittingAction(null);
    }
  };

  const toggleSubTaskLogs = (subTaskId: number) => {
    setExpandedSubTaskLogs((prev) => ({
      ...prev,
      [subTaskId]: !prev[subTaskId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-sm text-slate-800 tracking-tight">
                {task.task_code}
              </span>
              <span className="text-slate-300 font-light">/</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                TASK DETAILS
              </span>
              {isOverdue && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  OVERDUE
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isAdmin && task.stage !== 'completed' && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Edit Task"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Task Title */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">
                {task.title}
              </h2>
            </div>

            {/* 3 Status Cards Row: STATUS | PRIORITY | TEAM & LEAD */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* STATUS CARD */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  STATUS
                </span>
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${stageConfig.badge}`}
                  >
                    {stage === 'completed' && <Lock className="inline w-3 h-3 mr-1" />}
                    {stageConfig.label}
                  </span>
                </div>
              </div>

              {/* PRIORITY CARD */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  PRIORITY
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`text-base font-black leading-none ${
                      PRIORITY_DOTS[task.priority as TaskPriority] || 'text-slate-400'
                    }`}
                  >
                    ●
                  </span>
                  <span className="text-xs font-semibold text-slate-800 capitalize">
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* TEAM & LEAD CARD */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  TEAM & LEAD
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {task.lead_employee_name ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <span className="text-amber-500 text-xs">★</span>
                      {task.lead_employee_name} (Lead)
                    </span>
                  ) : task.assignees[0] ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded truncate">
                      {task.assignees[0].name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* TIME PRECISION ENGINE CARD */}
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100/70">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 tracking-wider uppercase">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500/20" />
                  TIME PRECISION ENGINE
                  {subTasks.length > 0 && (
                    <span className="ml-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">
                      All Sub-tasks Combined
                    </span>
                  )}
                </div>
                {isAnyTimerRunning && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full animate-pulse border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    LIVE TICKING
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                {/* Allocated */}
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
                    ALLOCATED
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5 tracking-tight">
                    {totalAllocatedHoursStr}
                  </div>
                  {mySubTask && mySubTaskAllocatedStr && (
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Your sub-task: <span className="font-semibold text-slate-700">{mySubTaskAllocatedStr}</span>
                    </div>
                  )}
                </div>

                {/* Actual Spent */}
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
                    ACTUAL SPENT
                  </span>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5 font-mono tracking-tight">
                    {formatHMS(combinedTotalSec)}
                  </div>
                  {mySubTask && mySubTaskSec !== null && (
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <span>Your sub-task:</span>
                      <span className="font-semibold text-emerald-700 font-mono">
                        {formatHMS(mySubTaskSec)}
                      </span>
                      {mySubTask.is_timer_running && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Projected Efficiency */}
              <div className="mt-3.5 pt-3 border-t border-emerald-100/70 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                  PROJECTED EFFICIENCY
                </span>
                <span
                  className={`text-sm font-bold ${
                    efficiencyPct >= 100
                      ? 'text-emerald-600'
                      : efficiencyPct >= 70
                      ? 'text-blue-600'
                      : 'text-amber-600'
                  }`}
                >
                  {efficiencyPct}%
                </span>
              </div>
            </div>

            {/* START DATE & DUE DATE CARDS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    START DATE
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5">
                    {formatDateDisplay(task.started_at || task.created_at)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg bg-white border shrink-0 ${
                    isOverdue
                      ? 'border-rose-300 text-rose-600'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <Calendar
                    className={`w-4 h-4 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    DUE DATE
                  </span>
                  <span
                    className={`text-xs font-semibold truncate block mt-0.5 ${
                      isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'
                    }`}
                  >
                    {formatDateDisplay(task.due_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                DESCRIPTION
              </div>
              {task.description ? (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-xs italic text-slate-400">No description provided</p>
              )}
            </div>

            {/* Hold Reason Alert if present */}
            {task.hold_reason && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Hold Reason:</span>
                  <p className="mt-0.5">{task.hold_reason}</p>
                </div>
              </div>
            )}

            {/* Review feedback if present */}
            {task.review_note && task.stage === 'in_progress' && (
              <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Review Feedback / Changes Needed:</span>
                  <p className="mt-0.5">{task.review_note}</p>
                </div>
              </div>
            )}

            {/* TOTAL TIME SPENT CARD */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    TOTAL TIME SPENT
                  </span>
                  <div className="text-base font-bold text-slate-900 font-mono tracking-tight">
                    {formatHMS(combinedTotalSec)}
                  </div>
                </div>
              </div>
              {subTasks.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  Combined Task + Subtasks
                </span>
              )}
            </div>

            {/* WORKFLOW ACTIONS SECTION */}
            {activeTask ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    WORKFLOW ACTIONS
                  </span>
                  <div className="flex items-center gap-1.5">
                    {mySubTask && (
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200">
                        Your Sub-task: {mySubTask.task_code}
                      </span>
                    )}
                    {((activeTask.stage as TaskStage) || 'assigned') === 'in_progress' && (
                      <span className="text-[11px] font-medium text-slate-500">
                        {activeTask.is_timer_running ? 'Session Active' : 'Session Paused'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons based on stage & timer */}
                {((activeTask.stage as TaskStage) || 'assigned') === 'assigned' && (
                  <button
                    type="button"
                    disabled={submittingAction !== null}
                    onClick={() => handleAction(activeTask.task_id, 'start')}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Work
                  </button>
                )}

                {((activeTask.stage as TaskStage) || 'assigned') === 'in_progress' && (
                  <div className="flex items-center gap-2.5">
                    {activeTask.is_timer_running ? (
                      <button
                        type="button"
                        disabled={submittingAction !== null}
                        onClick={() => handleAction(activeTask.task_id, 'pause')}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                        title="Pause session (stays In Progress)"
                      >
                        <Pause className="w-4 h-4 fill-white" />
                        Pause Work
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submittingAction !== null}
                        onClick={() => handleAction(activeTask.task_id, 'start')}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Resume Work
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={submittingAction !== null}
                      onClick={() => handleAction(activeTask.task_id, 'finish')}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                      title="Finish work and submit for approval"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Finish Work
                    </button>
                  </div>
                )}

                {activeTask.stage === 'hold' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <span className="font-bold block">Task is on Hold</span>
                    <p className="mt-0.5 text-amber-800">
                      Drag card to In Progress on board or resume to continue tracking.
                    </p>
                  </div>
                )}

                {activeTask.stage === 'requested' && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-purple-900 block">
                        Submitted for Approval
                      </span>
                      <span className="text-[11px] text-purple-700">
                        Work has been submitted and awaits review.
                      </span>
                    </div>
                    {isAdmin && onMoveStage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onMoveStage(activeTask.task_id, 'completed');
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onMoveStage(activeTask.task_id, 'in_progress', 'Needs revisions');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTask.stage === 'completed' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">
                        {mySubTask ? 'Sub-task Approved & Completed' : 'Task Approved & Completed'}
                      </span>
                      {activeTask.completed_at && (
                        <span className="block text-[11px] text-emerald-700 mt-0.5">
                          Finished on {formatDateTimeDisplay(activeTask.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    WORKFLOW ACTIONS
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Supervisor View
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This task is delegated into {subTasks.length} sub-tasks. Work sessions and timers are tracked by assigned team members on each individual sub-task below.
                </p>
                {stage === 'requested' && isAdmin && onMoveStage && (
                  <div className="pt-2 flex items-center gap-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        onMoveStage(task.task_id, 'completed');
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Full Task
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMoveStage(task.task_id, 'in_progress', 'Needs revisions');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TASK DELEGATION SECTION */}
            {(task.has_sub_tasks || subTasks.length > 0) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                    <GitBranch className="w-4 h-4 text-sky-600" />
                    SUB-TASK DELEGATION ({subTasks.length})
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {subTasks.filter((s) => s.stage === 'completed').length} /{' '}
                    {subTasks.length} Completed
                  </span>
                </div>

                {subTasks.length > 0 ? (
                  <div className="space-y-3">
                    {subTasks.map((st) => {
                      const stStage = STAGE_LABELS[st.stage as TaskStage] || STAGE_LABELS.assigned;
                      const assignee = st.assignees[0];
                      const stSec = computeSeconds(
                        st.actual_minutes,
                        st.is_timer_running,
                        st.timer_started_at,
                        nowMs,
                        st.work_logs,
                      );
                      const isStLogsOpen = expandedSubTaskLogs[st.task_id] ?? false;

                      return (
                        <div
                          key={st.task_id}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          {/* Subtask Header & Stage */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono font-bold text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {st.task_code}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stStage.badge}`}
                                >
                                  {st.stage === 'completed' && (
                                    <Lock className="inline w-2.5 h-2.5 mr-0.5" />
                                  )}
                                  {stStage.label}
                                </span>
                                {st.is_timer_running && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900">{st.title}</h4>
                            </div>

                            {/* Duration & Spent */}
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-emerald-600">
                                {formatHMS(stSec)}
                              </div>
                              {st.allocated_minutes && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Alloc: {(st.allocated_minutes / 60).toFixed(1)}h
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Assignee & Control Row */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {assignee ? (
                                <>
                                  <Avatar
                                    name={assignee.name}
                                    src={assignee.avatar_url}
                                    size={20}
                                  />
                                  <span className="text-xs font-medium text-slate-700 truncate">
                                    {assignee.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Unassigned</span>
                              )}
                            </div>

                            {/* Subtask Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              {st.stage === 'assigned' && onTrackWorkSession && (
                                <button
                                  type="button"
                                  disabled={submittingAction !== null}
                                  onClick={() => handleAction(st.task_id, 'start')}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-emerald-700" /> Start
                                </button>
                              )}

                              {st.stage === 'in_progress' && onTrackWorkSession && (
                                <>
                                  {st.is_timer_running ? (
                                    <button
                                      type="button"
                                      disabled={submittingAction !== null}
                                      onClick={() => handleAction(st.task_id, 'pause')}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Pause className="w-2.5 h-2.5 fill-amber-700" /> Pause
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={submittingAction !== null}
                                      onClick={() => handleAction(st.task_id, 'start')}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-emerald-700" /> Resume
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={submittingAction !== null}
                                    onClick={() => handleAction(st.task_id, 'finish')}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Finish
                                  </button>
                                </>
                              )}

                              {isAdmin && st.stage === 'requested' && onMoveStage && (
                                <button
                                  type="button"
                                  onClick={() => onMoveStage(st.task_id, 'completed')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold cursor-pointer shadow-xs transition-colors"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                              )}

                              {st.stage === 'completed' && (
                                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                                  <Check className="w-3.5 h-3.5" /> Approved
                                </span>
                              )}

                              {/* Toggle logs */}
                              {Array.isArray(st.work_logs) && st.work_logs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleSubTaskLogs(st.task_id)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                  title="View subtask logs"
                                >
                                  {isStLogsOpen ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subtask Work Logs dropdown */}
                          {isStLogsOpen && Array.isArray(st.work_logs) && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                                Sub-task Work Session Logs
                              </span>
                              {st.work_logs.map((log: any, idx: number) => (
                                <div
                                  key={log.log_id || idx}
                                  className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100 text-slate-700"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`capitalize font-bold text-[10px] px-1.5 py-0.5 rounded ${
                                        log.action === 'finish'
                                          ? 'bg-purple-100 text-purple-700'
                                          : log.action === 'pause'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {log.action}
                                    </span>
                                    <span className="font-medium text-slate-800">
                                      {log.employee_name}
                                    </span>
                                  </div>
                                  <div className="text-right text-[10px] text-slate-400">
                                    {log.duration_seconds ? `${Math.floor(log.duration_seconds / 60)}m ${log.duration_seconds % 60}s • ` : ''}
                                    {formatDateTimeDisplay(log.timestamp)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    No sub-tasks attached to this task
                  </div>
                )}
              </div>
            )}

            {/* COMBINED SUB-TASK SUMMARY & COMBINED FINISH TIME */}
            {subTasks.length > 0 && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-sky-600" />
                    COMBINED PERFORMANCE SUMMARY
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-700">
                    Total: {formatHMS(combinedTotalSec)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 font-medium block">Finish Status</span>
                    <span className="font-semibold text-slate-800">
                      {allSubTasksFinished
                        ? 'All sub-tasks finished'
                        : `${subTasks.filter((s) => s.stage === 'completed' || s.stage === 'requested').length} of ${subTasks.length} finished`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Combined Finish Time</span>
                    <span className="font-semibold text-slate-800">
                      {latestFinishDate
                        ? formatDateTimeDisplay(latestFinishDate)
                        : allSubTasksFinished
                        ? 'Finished'
                        : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* UNIFIED WORK SESSION LOGS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedLogs((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4 text-emerald-600" />
                  WORK SESSION LOGS ({allLogs.length})
                  {expandedLogs ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <span className="text-[11px] text-slate-400">
                  {allLogs.length} logged sessions
                </span>
              </div>

              {expandedLogs && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {allLogs.length > 0 ? (
                    allLogs.map((log) => (
                      <div
                        key={log.log_id}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                log.action === 'finish'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : log.action === 'pause'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="font-semibold text-slate-800">{log.employee_name}</span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-200/60 px-1 rounded">
                              {log.task_code}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTimeDisplay(log.timestamp)}
                          </span>
                        </div>
                        {Boolean(log.duration_seconds && log.duration_seconds > 0) && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Session duration:{' '}
                            <span className="font-bold font-mono">
                              {formatHMS(log.duration_seconds!)}
                            </span>
                          </div>
                        )}
                        {log.note && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">"{log.note}"</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3 text-xs text-slate-400 italic">
                      No work sessions logged yet. Click Start Work to begin tracking.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Assignees ({task.assignees.length})
              </span>
              <div className="space-y-2">
                {task.assignees.map((a) => (
                  <div
                    key={a.employee_id}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-2"
                  >
                    <Avatar name={a.name} src={a.avatar_url} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 truncate">{a.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{a.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="pt-2 border-t border-slate-100">
              <TaskHistoryTimeline history={task.history} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
