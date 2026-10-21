import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  GitBranch,
  Lock,
  PauseCircle,
  Play,
  RotateCcw,
  Send,
  UserCheck,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { TaskBoardCardDto, TaskBoardResultDto, TaskDetailDto, customFetch } from '@vernoxy-pulse/api-client';
import type { TaskPriority, TaskStage } from '../types';
import { AvatarStack } from '../../../components/AvatarStack';
import { Avatar } from '../../../components/Avatar';
import { formatMinutesToHuman } from '../../../components/DurationField';
import { StageDecisionDialog } from './StageDecisionDialog';
import { HoldReasonModal } from './HoldReasonModal';

export interface TaskListViewProps {
  board: TaskBoardResultDto;
  isAdmin: boolean;
  onCardClick: (taskId: number) => void;
  onMoveStage: (taskId: number, targetStage: TaskStage, note?: string, holdReason?: string) => void;
}

const STAGE_LABELS: Record<TaskStage, { label: string; badge: string }> = {
  assigned: { label: 'To Do', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  hold: { label: 'Hold', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  requested: { label: 'Submitted', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed: { label: 'Approved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const TaskListView: React.FC<TaskListViewProps> = ({
  board,
  isAdmin,
  onCardClick,
  onMoveStage,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [subtasksMap, setSubtasksMap] = useState<Record<number, TaskDetailDto[]>>({});
  const [loadingSubtasks, setLoadingSubtasks] = useState<Record<number, boolean>>({});
  const [rejectDialogTarget, setRejectDialogTarget] = useState<{ taskId: number; parentTaskId?: number } | null>(null);
  const [holdModalTarget, setHoldModalTarget] = useState<{ taskId: number; title: string; parentTaskId?: number } | null>(null);

  // Combine all tasks from all columns and sort by created_at desc
  const allTasks: TaskBoardCardDto[] = [
    ...(board.columns.assigned || []),
    ...(board.columns.in_progress || []),
    ...(board.columns.hold || []),
    ...(board.columns.requested || []),
    ...(board.columns.completed || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const refreshSubtasks = async (taskId: number) => {
    try {
      const endpoint = isAdmin ? `/api/v1/admin/tasks/${taskId}/subtasks` : `/api/v1/my-tasks/${taskId}/subtasks`;
      const res = await customFetch<any>(endpoint);
      const list = Array.isArray(res) ? res : res?.data || [];
      setSubtasksMap((prev) => ({ ...prev, [taskId]: list }));
    } catch (err) {
      console.error('Failed to load subtasks', err);
    }
  };

  const toggleExpand = async (taskId: number) => {
    const isCurrentlyExpanded = !!expandedRows[taskId];
    setExpandedRows((prev) => ({ ...prev, [taskId]: !isCurrentlyExpanded }));

    // If expanding and subtasks not loaded yet, fetch them
    if (!isCurrentlyExpanded && !subtasksMap[taskId]) {
      setLoadingSubtasks((prev) => ({ ...prev, [taskId]: true }));
      try {
        await refreshSubtasks(taskId);
      } finally {
        setLoadingSubtasks((prev) => ({ ...prev, [taskId]: false }));
      }
    }
  };

  const handleMoveSubtask = async (
    parentTaskId: number,
    subTaskId: number,
    targetStage: TaskStage,
    note?: string,
    holdReason?: string,
  ) => {
    // Optimistic UI update
    setSubtasksMap((prev) => {
      const list = prev[parentTaskId] || [];
      return {
        ...prev,
        [parentTaskId]: list.map((st) => (st.task_id === subTaskId ? { ...st, stage: targetStage } : st)),
      };
    });

    onMoveStage(subTaskId, targetStage, note, holdReason);

    // Refresh after a slight delay to allow backend to persist and cascade
    setTimeout(() => {
      refreshSubtasks(parentTaskId);
    }, 600);
  };

  const handleHoldPrompt = (taskId: number, title?: string, parentTaskId?: number) => {
    const taskTitle = title || allTasks.find((t) => t.task_id === taskId)?.title || `Task #${taskId}`;
    setHoldModalTarget({ taskId, title: taskTitle, parentTaskId });
  };

  const handleRejectPrompt = (taskId: number, parentTaskId?: number) => {
    setRejectDialogTarget({ taskId, parentTaskId });
  };

  const activeHoldTitle = holdModalTarget?.title || '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center"></th>
              <th className="py-3 px-3">Task ID</th>
              <th className="py-3 px-3 min-w-[200px]">Task Name</th>
              <th className="py-3 px-3 min-w-[150px]">Assigned To</th>
              <th className="py-3 px-3">Task Type</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Allocated Time</th>
              <th className="py-3 px-3">Stage</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {allTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No tasks found matching your filters.
                </td>
              </tr>
            ) : (
              allTasks.map((task) => {
                const stageConfig = STAGE_LABELS[task.stage as TaskStage] || STAGE_LABELS.assigned;
                const isExpanded = !!expandedRows[task.task_id];
                const isCompleted = task.stage === 'completed';

                return (
                  <React.Fragment key={task.task_id}>
                    <tr className="hover:bg-slate-50/60 transition-colors group">
                      {/* Expand / Collapse Chevron */}
                      <td className="py-3 px-2 text-center">
                        {task.has_sub_tasks ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(task.task_id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : null}
                      </td>

                      {/* Task ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onCardClick(task.task_id)}
                          className="hover:text-blue-600 hover:underline cursor-pointer"
                        >
                          {task.task_code}
                        </button>
                      </td>

                      {/* Task Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onCardClick(task.task_id)}
                            className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1 text-left cursor-pointer"
                          >
                            {task.title}
                          </button>
                          {task.has_sub_tasks && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200 whitespace-nowrap">
                              <GitBranch className="w-2.5 h-2.5" />
                              {task.sub_tasks_count || 0}
                            </span>
                          )}
                        </div>
                        {task.stage === 'hold' && task.hold_reason && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[250px]">{task.hold_reason}</span>
                          </div>
                        )}
                      </td>

                      {/* Assigned To (Lead + employee count for tasks with subtasks per BFD Section 2.2) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <AvatarStack assignees={task.assignees} size={22} max={2} />
                          <div className="min-w-0">
                            {task.has_sub_tasks && task.lead_employee_name ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                  <UserCheck className="w-2.5 h-2.5 text-amber-600" />
                                  Lead: {task.lead_employee_name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                  ({task.assignees.length} {task.assignees.length === 1 ? 'employee' : 'employees'})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-700 font-medium truncate text-xs">
                                {task.assignees.map((a) => a.name).join(', ') || 'Unassigned'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Task Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          {task.other_task_type ? `${task.task_type_label}: ${task.other_task_type}` : task.task_type_label || 'General'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            PRIORITY_STYLES[task.priority]
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Allocated Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {task.allocated_minutes ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatMinutesToHuman(task.allocated_minutes)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${stageConfig.badge}`}>
                          {isCompleted && <Lock className="w-2.5 h-2.5" />}
                          {stageConfig.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onCardClick(task.task_id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Action Buttons */}
                          {isAdmin && task.stage === 'requested' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onMoveStage(task.task_id, 'completed')}
                                className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Approve Task"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPrompt(task.task_id)}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Reject Task"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {!isAdmin && task.stage === 'assigned' && (
                            <button
                              type="button"
                              onClick={() => onMoveStage(task.task_id, 'in_progress')}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                            >
                              <Play className="w-2.5 h-2.5" /> Start
                            </button>
                          )}

                          {!isAdmin && task.stage === 'in_progress' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleHoldPrompt(task.task_id)}
                                className="p-1 rounded text-amber-600 hover:bg-amber-50 cursor-pointer"
                                title="Put on Hold"
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onMoveStage(task.task_id, 'requested')}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 cursor-pointer"
                              >
                                <Send className="w-2.5 h-2.5" /> Submit
                              </button>
                            </>
                          )}

                          {task.stage === 'hold' && (
                            <button
                              type="button"
                              onClick={() => onMoveStage(task.task_id, 'in_progress')}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Resume
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Sub-tasks Rows */}
                    {isExpanded && task.has_sub_tasks && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={9} className="py-3 px-6 border-y border-slate-100">
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                                Sub-tasks of {task.task_code}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Allocated time must sum to main task duration
                              </span>
                            </div>

                            {loadingSubtasks[task.task_id] ? (
                              <div className="py-4 text-center text-xs text-slate-400">
                                Loading sub-tasks...
                              </div>
                            ) : subtasksMap[task.task_id] && subtasksMap[task.task_id].length > 0 ? (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100">
                                    <th className="py-1 px-2">Sub-task ID</th>
                                    <th className="py-1 px-2">Title</th>
                                    <th className="py-1 px-2">Assignee</th>
                                    <th className="py-1 px-2">Allocated Time</th>
                                    <th className="py-1 px-2">Stage</th>
                                    <th className="py-1 px-2 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {subtasksMap[task.task_id].map((st) => {
                                    const stStage = STAGE_LABELS[st.stage as TaskStage] || STAGE_LABELS.assigned;
                                    return (
                                      <tr key={st.task_id} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-2 font-mono font-bold text-slate-600">
                                          <button
                                            type="button"
                                            onClick={() => onCardClick(st.task_id)}
                                            className="hover:text-blue-600 hover:underline"
                                          >
                                            {st.task_code}
                                          </button>
                                        </td>
                                        <td className="py-2 px-2 font-medium text-slate-800">{st.title}</td>
                                        <td className="py-2 px-2">
                                          <div className="flex items-center gap-1.5">
                                            {st.assignees[0] && (
                                              <>
                                                <Avatar name={st.assignees[0].name} src={st.assignees[0].avatar_url} size={18} />
                                                <span className="text-[11px] text-slate-600">{st.assignees[0].name}</span>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-2 text-slate-600 font-medium">
                                          {formatMinutesToHuman(st.allocated_minutes) || '-'}
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${stStage.badge}`}>
                                            {stStage.label}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              type="button"
                                              onClick={() => onCardClick(st.task_id)}
                                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                              title="View Details"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Admin Actions for Sub-task */}
                                            {isAdmin && st.stage === 'requested' && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleMoveSubtask(task.task_id, st.task_id, 'completed')}
                                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                                                  title="Approve Sub-task"
                                                >
                                                  <Check className="w-3 h-3 text-emerald-600" /> Approve
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRejectPrompt(st.task_id, task.task_id)}
                                                  className="p-1 rounded text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                                  title="Reject / Request Changes"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            )}

                                            {isAdmin && st.stage === 'hold' && (
                                              <button
                                                type="button"
                                                onClick={() => handleMoveSubtask(task.task_id, st.task_id, 'in_progress')}
                                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                                                title="Resume Sub-task"
                                              >
                                                <RotateCcw className="w-2.5 h-2.5" /> Resume
                                              </button>
                                            )}

                                            {/* Employee Actions (My Tasks) */}
                                            {!isAdmin && st.stage === 'assigned' && (
                                              <button
                                                type="button"
                                                onClick={() => handleMoveSubtask(task.task_id, st.task_id, 'in_progress')}
                                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                              >
                                                <Play className="w-2.5 h-2.5" /> Start
                                              </button>
                                            )}

                                            {!isAdmin && st.stage === 'in_progress' && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleHoldPrompt(st.task_id, st.title, task.task_id)}
                                                  className="p-1 rounded text-amber-600 hover:bg-amber-50 cursor-pointer"
                                                  title="Put Sub-task on Hold"
                                                >
                                                  <PauseCircle className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleMoveSubtask(task.task_id, st.task_id, 'requested')}
                                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 cursor-pointer"
                                                >
                                                  <Send className="w-2.5 h-2.5" /> Submit
                                                </button>
                                              </>
                                            )}

                                            {!isAdmin && st.stage === 'hold' && (
                                              <button
                                                type="button"
                                                onClick={() => handleMoveSubtask(task.task_id, st.task_id, 'in_progress')}
                                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                                              >
                                                <RotateCcw className="w-2.5 h-2.5" /> Resume
                                              </button>
                                            )}

                                            {st.stage === 'completed' && (
                                              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                                                <Check className="w-3 h-3" /> Done
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <div className="py-2 text-center text-xs text-slate-400">
                                No sub-tasks recorded for this task.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reject / Revision Dialog */}
      <StageDecisionDialog
        isOpen={rejectDialogTarget !== null}
        title="Request Changes & Return to Progress"
        description="Provide feedback to the assignees explaining what needs improvement before this task can be approved."
        confirmLabel="Return to Progress"
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
        requiresNote={true}
        onConfirm={(note) => {
          if (rejectDialogTarget !== null) {
            if (rejectDialogTarget.parentTaskId) {
              handleMoveSubtask(rejectDialogTarget.parentTaskId, rejectDialogTarget.taskId, 'in_progress', note);
            } else {
              onMoveStage(rejectDialogTarget.taskId, 'in_progress', note);
            }
            setRejectDialogTarget(null);
          }
        }}
        onClose={() => setRejectDialogTarget(null)}
      />

      {/* Mandatory Hold Reason Modal (BFD Section 3.3) */}
      <HoldReasonModal
        isOpen={holdModalTarget !== null}
        taskTitle={activeHoldTitle}
        onConfirm={(reason) => {
          if (holdModalTarget !== null) {
            if (holdModalTarget.parentTaskId) {
              handleMoveSubtask(holdModalTarget.parentTaskId, holdModalTarget.taskId, 'hold', undefined, reason);
            } else {
              onMoveStage(holdModalTarget.taskId, 'hold', undefined, reason);
            }
            setHoldModalTarget(null);
          }
        }}
        onClose={() => setHoldModalTarget(null)}
      />
    </div>
  );
};
