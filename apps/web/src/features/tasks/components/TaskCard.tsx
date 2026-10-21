import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  GitBranch,
  Lock,
  PauseCircle,
  Play,
  RotateCcw,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import { TaskBoardCardDto } from '@vernoxy-pulse/api-client';
import type { TaskPriority, TaskStage } from '../types';
import { AvatarStack } from '../../../components/AvatarStack';
import { formatMinutesToHuman } from '../../../components/DurationField';

export interface TaskCardProps {
  task: TaskBoardCardDto;
  isAdmin: boolean;
  onCardClick?: (taskId: number) => void;
  onApprove?: (taskId: number) => void;
  onReject?: (taskId: number) => void;
  onStart?: (taskId: number) => void;
  onRequestReview?: (taskId: number) => void;
  onHold?: (taskId: number) => void;
  onResume?: (taskId: number) => void;
  isOverlay?: boolean;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

// Stage-specific border, hover, and overlay styling
const STAGE_BORDER_STYLES: Record<
  TaskStage,
  {
    border: string;
    hoverBorder: string;
    bg: string;
    overlayBorder: string;
    overlayRing: string;
    accentLeft: string;
  }
> = {
  assigned: {
    border: 'border-slate-300',
    hoverBorder: 'hover:border-slate-400',
    bg: 'bg-white',
    overlayBorder: 'border-slate-400',
    overlayRing: 'ring-slate-400/25',
    accentLeft: 'border-l-slate-400',
  },
  in_progress: {
    border: 'border-blue-400',
    hoverBorder: 'hover:border-blue-500',
    bg: 'bg-gradient-to-br from-blue-50/20 via-white to-white',
    overlayBorder: 'border-blue-500',
    overlayRing: 'ring-blue-500/25',
    accentLeft: 'border-l-blue-500',
  },
  hold: {
    border: 'border-amber-400',
    hoverBorder: 'hover:border-amber-500',
    bg: 'bg-gradient-to-br from-amber-50/30 via-white to-white',
    overlayBorder: 'border-amber-500',
    overlayRing: 'ring-amber-500/25',
    accentLeft: 'border-l-amber-500',
  },
  requested: {
    border: 'border-purple-400',
    hoverBorder: 'hover:border-purple-500',
    bg: 'bg-gradient-to-br from-purple-50/25 via-white to-white',
    overlayBorder: 'border-purple-500',
    overlayRing: 'ring-purple-500/25',
    accentLeft: 'border-l-purple-500',
  },
  completed: {
    border: 'border-emerald-500',
    hoverBorder: 'hover:border-emerald-600',
    bg: 'bg-gradient-to-br from-emerald-50/30 via-white to-white',
    overlayBorder: 'border-emerald-500',
    overlayRing: 'ring-emerald-500/25',
    accentLeft: 'border-l-emerald-500',
  },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isAdmin,
  onCardClick,
  onApprove,
  onReject,
  onStart,
  onRequestReview,
  onHold,
  onResume,
  isOverlay = false,
}) => {
  const stage = (task.stage as TaskStage) || 'assigned';
  const stageStyles = STAGE_BORDER_STYLES[stage] || STAGE_BORDER_STYLES.assigned;
  const isCompleted = stage === 'completed';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.task_id.toString(),
    data: { type: 'Task', task, stage: task.stage },
    disabled: isOverlay || isCompleted, // BFD Section 3.3: Completed tasks cannot be dragged or modified
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? undefined,
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-xl border-2 border-dashed ${stageStyles.border} bg-slate-50/50 p-4 min-h-[118px] opacity-40 transition-all duration-150`}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay || isCompleted ? {} : attributes)}
      {...(isOverlay || isCompleted ? {} : listeners)}
      onClick={() => onCardClick?.(task.task_id)}
      className={`group relative rounded-xl border border-l-4 ${stageStyles.border} ${stageStyles.accentLeft} ${stageStyles.bg} p-3.5 transition-all select-none touch-none ${
        isOverlay
          ? `${stageStyles.overlayBorder} shadow-2xl ring-4 ${stageStyles.overlayRing} rotate-1 scale-[1.02] cursor-grabbing`
          : isCompleted
          ? `${stageStyles.hoverBorder} shadow-xs hover:shadow-md cursor-pointer opacity-95`
          : `${stageStyles.hoverBorder} shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing duration-150`
      }`}
    >
      {/* Top row: Code + Source + Type + Priority */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
            {task.task_code}
          </span>
          {task.task_type_label && (
            <span
              title={task.other_task_type || task.task_type_label}
              className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md truncate max-w-[110px]"
            >
              {task.other_task_type ? `${task.task_type_label}: ${task.other_task_type}` : task.task_type_label}
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <Lock className="w-2.5 h-2.5" /> Approved
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
            PRIORITY_STYLES[task.priority]
          }`}
        >
          {task.priority}
        </span>
      </div>

      {/* Title */}
      <h3
        className={`text-sm font-semibold line-clamp-2 mb-2 transition-colors ${
          isCompleted
            ? 'text-slate-700 group-hover:text-emerald-700'
            : 'text-slate-800 group-hover:text-blue-600'
        }`}
      >
        {task.title}
      </h3>

      {/* Sub-task indicator if this card is a sub-task */}
      {task.parent_task_id && (
        <div className="flex items-center gap-1 mb-2 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md font-medium w-fit">
          <GitBranch className="w-3 h-3 text-sky-600" />
          <span>Sub-task of {task.parent_task_code || 'Main Task'}</span>
        </div>
      )}

      {/* Subtasks and Lead badge if configured */}
      {(task.has_sub_tasks || task.lead_employee_name) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[11px]">
          {task.has_sub_tasks && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-medium">
              <GitBranch className="w-3 h-3 text-sky-600" />
              {task.sub_tasks_count || 0} Subtasks
            </span>
          )}
          {task.lead_employee_name && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              <UserCheck className="w-3 h-3 text-amber-600" />
              Lead: {task.lead_employee_name}
            </span>
          )}
        </div>
      )}

      {/* Hold Reason alert box if currently on Hold */}
      {stage === 'hold' && task.hold_reason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2 mb-2.5 text-xs text-amber-900 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="line-clamp-2">
            <span className="font-bold">Hold: </span>
            {task.hold_reason}
          </div>
        </div>
      )}

      {/* Meta: Overdue, Timer Running, Spent, Allocated, Due Date */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
        {task.is_overdue && (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        )}
        {task.is_timer_running ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Active
          </span>
        ) : task.actual_minutes && task.actual_minutes > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/60 px-1.5 py-0.5 rounded border border-emerald-100">
            <Clock className="w-3 h-3 text-emerald-600" />
            {formatMinutesToHuman(task.actual_minutes)} spent
          </span>
        ) : null}
        {task.allocated_minutes && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatMinutesToHuman(task.allocated_minutes)}
          </span>
        )}
        {task.due_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {task.due_date}
          </span>
        )}
      </div>

      {/* Bottom row: Assignees + Inline quick actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <AvatarStack assignees={task.assignees} size={24} max={3} />

        {/* Quick stage transition triggers */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isAdmin && task.stage === 'requested' && (
            <>
              <button
                type="button"
                onClick={() => onApprove?.(task.task_id)}
                title="Approve & Complete"
                className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onReject?.(task.task_id)}
                title="Reject with Note"
                className="p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {!isAdmin && task.stage === 'assigned' && onStart && (
            <button
              type="button"
              onClick={() => onStart(task.task_id)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <Play className="w-2.5 h-2.5" /> Start
            </button>
          )}

          {!isAdmin && task.stage === 'in_progress' && (
            <div className="flex items-center gap-1">
              {onHold && (
                <button
                  type="button"
                  onClick={() => onHold(task.task_id)}
                  title="Put on Hold"
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  <PauseCircle className="w-3 h-3" /> Hold
                </button>
              )}
              {onRequestReview && (
                <button
                  type="button"
                  onClick={() => onRequestReview(task.task_id)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  <Send className="w-2.5 h-2.5" /> Submit
                </button>
              )}
            </div>
          )}

          {task.stage === 'hold' && onResume && (
            <button
              type="button"
              onClick={() => onResume(task.task_id)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
