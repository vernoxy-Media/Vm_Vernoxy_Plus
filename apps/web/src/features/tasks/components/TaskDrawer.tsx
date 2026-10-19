import React from 'react';
import { X, Calendar, Clock, Edit2, AlertCircle } from 'lucide-react';
import { TaskDetailDto } from '@vernoxy-pulse/api-client';
import { Avatar } from '../../../components/Avatar';
import { formatMinutesToHuman } from '../../../components/DurationField';
import { TaskHistoryTimeline } from './TaskHistoryTimeline';

export interface TaskDrawerProps {
  task: TaskDetailDto | null;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (task: TaskDetailDto) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  isOpen,
  isAdmin,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
                {task.task_code}
              </span>
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {task.stage.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && task.stage !== 'completed' && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
                  title="Edit Task"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{task.title}</h2>
              {task.description ? (
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="mt-2 text-xs italic text-slate-400">No description provided</p>
              )}
            </div>

            {/* Rejection / Review note alert if present */}
            {task.review_note && task.stage === 'in_progress' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Review Feedback / Requested Changes:</span>
                  <p className="mt-0.5">{task.review_note}</p>
                </div>
              </div>
            )}

            {/* Meta attributes */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Priority</span>
                <span className="font-semibold text-slate-800 capitalize">{task.priority}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Task Type</span>
                <span className="font-semibold text-slate-800">{task.task_type_label || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Allocated Duration</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatMinutesToHuman(task.allocated_minutes) || 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Due Date</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {task.due_date || 'None'}
                </span>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Assignees ({task.assignees.length})
              </span>
              <div className="space-y-2">
                {task.assignees.map((a) => (
                  <div key={a.employee_id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-2">
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
