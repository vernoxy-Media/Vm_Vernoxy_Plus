import React from 'react';
import { CheckSquare, CalendarPlus, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import type { UnscheduledTask } from '../types';

interface UnscheduledTasksTrayProps {
  tasks: UnscheduledTask[];
  isOpen: boolean;
  onToggle: () => void;
  onScheduleTask: (task: UnscheduledTask) => void;
}

export const UnscheduledTasksTray: React.FC<UnscheduledTasksTrayProps> = ({
  tasks,
  isOpen,
  onToggle,
  onScheduleTask,
}) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <aside
      className={`border-l border-slate-200 bg-white flex flex-col transition-all duration-200 shrink-0 ${
        isOpen ? 'w-80' : 'w-12'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 truncate">Tasks to Schedule</h3>
              <p className="text-[10px] text-slate-500">{tasks.length} unscheduled</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={isOpen ? 'Collapse task tray' : 'Expand task tray'}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mx-auto"
        >
          {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Task List */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold">No unscheduled tasks</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All assigned tasks have been time-blocked</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.task_id}
                className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all bg-white group flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {task.task_code}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${getPriorityBadge(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 line-clamp-2">
                  {task.title}
                </h4>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  {task.due_date ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span>No due date</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onScheduleTask(task)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Schedule</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};
