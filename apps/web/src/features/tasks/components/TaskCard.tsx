import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Clock,
  Equal,
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
import { useAuth } from '@/features/auth/context/AuthContext';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import type { TaskPriority, TaskStage } from '../types';
import { formatMinutesToHuman } from './DurationField';
import { formatDisplayDate } from '@/shared/utils/date.utils';

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

const PRIORITY: Record<TaskPriority, { label: string; icon: React.ElementType; color: string }> = {
  critical: { label: 'Highest', icon: ChevronsUp, color: 'text-[#CD1317]' },
  high: { label: 'High', icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { label: 'Medium', icon: Equal, color: 'text-[#E97F33]' },
  low: { label: 'Low', icon: ChevronDown, color: 'text-[#2D8738]' },
};

const CARD_SHADOW = 'shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]';
const ACTION = 'inline-flex h-6 cursor-pointer items-center gap-1 rounded-[3px] px-2 text-[12px] font-medium transition-colors';

/**
 * A card on the task board, in Jira's style: the summary first, then the small facts about the work,
 * and the issue type, key, priority and assignee along the bottom. The rules for who may move or act on it
 * are the same as before.
 */
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
  const { user } = useAuth();
  const stage = (task.stage as TaskStage) || 'assigned';
  const isCompleted = stage === 'completed';
  const isAssignee = task.assignees?.some((a) => a.employee_id === user?.emp_id);
  const isApproverMove = isAdmin && stage === 'requested';
  const canDrag = isCompleted ? false : isApproverMove || Boolean(isAssignee);
  const pr = PRIORITY[task.priority as TaskPriority] ?? PRIORITY.medium;
  const PriorityIcon = pr.icon;
  const lockReason = !canDrag && !isCompleted ? `Only ${task.assignees?.map((a) => a.name).join(', ') || 'the assignee'} can move this task` : undefined;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.task_id.toString(),
    data: { type: 'Task', task, stage: task.stage },
    disabled: isOverlay || !canDrag, // Done is locked, and only the assignee moves a task
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? undefined,
  };

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} style={style} className="min-h-[88px] rounded-[3px] border-2 border-dashed border-[#B3BAC5] bg-white/50 opacity-60" />;
  }

  const hasActions =
    (isAdmin && stage === 'requested') ||
    (isAssignee && stage === 'assigned' && onStart) ||
    (isAssignee && stage === 'in_progress' && (onHold || onRequestReview)) ||
    (isAssignee && stage === 'hold' && onResume);

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay || isCompleted ? {} : attributes)}
      {...(isOverlay || isCompleted ? {} : listeners)}
      onClick={() => onCardClick?.(task.task_id)}
      className={`group select-none touch-none rounded-[3px] bg-white p-2.5 transition ${CARD_SHADOW} ${
        isOverlay
          ? 'rotate-2 cursor-grabbing shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]'
          : isCompleted
            ? 'cursor-pointer hover:bg-[#F4F5F7]'
            : canDrag
              ? 'cursor-grab hover:bg-[#F4F5F7] active:cursor-grabbing'
              : 'cursor-pointer hover:bg-[#F4F5F7]'
      }`}
    >
      {/* Where the work belongs: its project, or a quick task of your own */}
      {(task.project_name || task.source === 'quick') && (
        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#5E6C84]">
          {task.project_name ? (
            <span className="truncate" title={task.project_name}>{task.project_no ? `${task.project_no} · ` : ''}{task.project_name}</span>
          ) : (
            <span className="rounded-[3px] bg-[#FFF0B3] px-1 py-px text-[#172B4D]">Quick task</span>
          )}
        </p>
      )}
      <p className={`line-clamp-3 text-[14px] leading-5 ${isCompleted ? 'text-[#42526E]' : 'text-[#172B4D]'}`}>{task.title}</p>

      {/* Small facts about the work */}
      {(task.parent_task_id || task.has_sub_tasks || task.lead_employee_name || (stage === 'hold' && task.hold_reason) || task.is_overdue || task.is_timer_running || (task.actual_minutes ?? 0) > 0 || task.allocated_minutes || task.due_date || task.task_type_label) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-[#5E6C84]">
          {task.task_type_label && (
            <span title={task.other_task_type || task.task_type_label} className="max-w-[120px] truncate rounded-[3px] bg-[rgba(9,30,66,0.08)] px-1 py-px font-medium text-[#42526E]">
              {task.other_task_type ? `${task.task_type_label}: ${task.other_task_type}` : task.task_type_label}
            </span>
          )}
          {task.parent_task_id && (
            <span className="inline-flex items-center gap-1 rounded-[3px] bg-[#DEEBFF] px-1 py-px font-medium text-[#0747A6]">
              <GitBranch className="h-3 w-3" /> {task.parent_task_code || 'Parent'}
            </span>
          )}
          {task.has_sub_tasks && (
            <span className="inline-flex items-center gap-1 font-medium">
              <GitBranch className="h-3.5 w-3.5" /> {task.sub_tasks_count || 0} sub-tasks
            </span>
          )}
          {task.lead_employee_name && (
            <span className="inline-flex items-center gap-1" title="Lead">
              <UserCheck className="h-3.5 w-3.5" /> {task.lead_employee_name}
            </span>
          )}
          {task.is_overdue && <span className="rounded-[3px] bg-[#FFEBE6] px-1 py-px font-semibold text-[#BF2600]">Overdue</span>}
          {task.is_timer_running ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[#006644]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#36B37E]" /> Timer running</span>
          ) : (task.actual_minutes ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1" title="Time spent"><Clock className="h-3.5 w-3.5" /> {formatMinutesToHuman(task.actual_minutes)} spent</span>
          ) : null}
          {task.allocated_minutes && (
            <span className="inline-flex items-center gap-1" title="Estimate"><Clock className="h-3.5 w-3.5 opacity-60" /> {formatMinutesToHuman(task.allocated_minutes)}</span>
          )}
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 rounded-[3px] px-1 py-px font-medium ${task.is_overdue ? 'bg-[#FFEBE6] text-[#BF2600]' : 'bg-[rgba(9,30,66,0.08)] text-[#42526E]'}`} title="Due date">
              <Calendar className="h-3 w-3" /> {formatDisplayDate(task.due_date)}
            </span>
          )}
        </div>
      )}

      {stage === 'hold' && task.hold_reason && (
        <p className="mt-2 flex items-start gap-1.5 rounded-[3px] bg-[#FFFAE6] px-2 py-1.5 text-[12px] text-[#172B4D] shadow-[inset_3px_0_0_#FF991F]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF991F]" />
          <span className="line-clamp-2">{task.hold_reason}</span>
        </p>
      )}

      {/* Issue type, key, priority and assignee */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#4BADE8] text-white">
            {task.parent_task_id ? <GitBranch className="h-2.5 w-2.5" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3.5} />}
          </span>
          <span className={`truncate text-[12px] font-medium text-[#5E6C84] ${isCompleted ? 'line-through' : ''}`}>{task.task_code}</span>
          {isCompleted && <Lock className="h-3 w-3 shrink-0 text-[#36B37E]" aria-label="Done, locked" />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lockReason && (
            <span title={lockReason} aria-label={lockReason} className="flex text-[#97A0AF]">
              <Lock className="h-3.5 w-3.5" />
            </span>
          )}
          <span title={`Priority: ${pr.label}`} className="flex"><PriorityIcon className={`h-4 w-4 ${pr.color}`} strokeWidth={3} aria-label={`Priority ${pr.label}`} /></span>
          <div className="flex -space-x-1.5" title={task.assignees?.map((a) => a.name).join(', ')}>
            {(task.assignees ?? []).slice(0, 2).map((a) => <JiraAvatar key={a.employee_id} name={a.name} id={a.employee_id} src={a.avatar_url} size={24} ring />)}
            {(task.assignees ?? []).length > 2 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DFE1E6] text-[10px] font-semibold text-[#42526E] ring-2 ring-white">+{task.assignees.length - 2}</span>}
            {(task.assignees ?? []).length === 0 && <span title="Unassigned" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DFE1E6] text-[10px] text-[#5E6C84]">?</span>}
          </div>
        </div>
      </div>

      {/* Quick moves, for whoever may make them */}
      {hasActions && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[#DFE1E6] pt-2" onClick={(e) => e.stopPropagation()}>
          {isAdmin && stage === 'requested' && (
            <>
              <button type="button" onClick={() => onApprove?.(task.task_id)} title="Approve and mark Done" className={`${ACTION} bg-[#E3FCEF] text-[#006644] hover:bg-[#ABF5D1]`}>
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button type="button" onClick={() => onReject?.(task.task_id)} title="Send back with a note" className={`${ACTION} bg-[#FFEBE6] text-[#BF2600] hover:bg-[#FFBDAD]`}>
                <X className="h-3.5 w-3.5" /> Send back
              </button>
            </>
          )}
          {isAssignee && stage === 'assigned' && onStart && (
            <button type="button" onClick={() => onStart(task.task_id)} className={`${ACTION} bg-[#DEEBFF] text-[#0747A6] hover:bg-[#B3D4FF]`}>
              <Play className="h-3 w-3" /> Start
            </button>
          )}
          {isAssignee && stage === 'in_progress' && (
            <>
              {onHold && (
                <button type="button" onClick={() => onHold(task.task_id)} title="Put on hold" className={`${ACTION} bg-[#FFF0B3] text-[#172B4D] hover:bg-[#FFE380]`}>
                  <PauseCircle className="h-3.5 w-3.5" /> Hold
                </button>
              )}
              {onRequestReview && (
                <button type="button" onClick={() => onRequestReview(task.task_id)} className={`${ACTION} bg-[#EAE6FF] text-[#403294] hover:bg-[color:var(--ac-200,#C0B6F2)]`}>
                  <Send className="h-3 w-3" /> Submit
                </button>
              )}
            </>
          )}
          {isAssignee && stage === 'hold' && onResume && (
            <button type="button" onClick={() => onResume(task.task_id)} className={`${ACTION} bg-[#DEEBFF] text-[#0747A6] hover:bg-[#B3D4FF]`}>
              <RotateCcw className="h-3 w-3" /> Resume
            </button>
          )}
        </div>
      )}
    </div>
  );
};
