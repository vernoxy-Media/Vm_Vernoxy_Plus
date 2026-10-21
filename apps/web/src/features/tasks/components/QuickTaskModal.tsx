import React, { useState, useEffect } from 'react';
import { X, Loader2, Zap } from 'lucide-react';
import { CreateTaskDto } from '@vernoxy-pulse/api-client';
import type { TaskPriority } from '../types';
import { DurationField } from '../../../components/DurationField';

export interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto) => Promise<void>;
  taskTypeOptions: { id: number; label: string }[];
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskTypeOptions,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskTypeId, setTaskTypeId] = useState<number | undefined>(taskTypeOptions[0]?.id);
  const [dueDate, setDueDate] = useState(getTodayDateString);
  const [allocatedMinutes, setAllocatedMinutes] = useState<number | null>(60);
  const [otherTaskType, setOtherTaskType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTaskTitle('');
      setDescription('');
      setPriority('medium');
      setTaskTypeId(taskTypeOptions[0]?.id);
      setOtherTaskType('');
      setDueDate(getTodayDateString());
      setAllocatedMinutes(60);
      setError(null);
    }
  }, [isOpen, taskTypeOptions]);

  if (!isOpen) return null;

  const selectedType = taskTypeOptions.find((t) => t.id === taskTypeId);
  const isOtherType = Boolean(
    selectedType && selectedType.label.trim().toLowerCase().startsWith('other'),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError('Task title is required.');
      return;
    }
    if (isOtherType && !otherTaskType.trim()) {
      setError('Please specify the task type name for "Others".');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: taskTitle.trim(),
        description: description.trim() || undefined,
        priority,
        task_type_id: taskTypeId,
        due_date: dueDate || undefined,
        allocated_minutes: allocatedMinutes || undefined,
        other_task_type: isOtherType ? otherTaskType.trim() : undefined,
        source: 'quick',
        assignee_ids: [],
      });
      onClose();
    } catch (err: unknown) {
      const eObj = err as { detail?: string; message?: string };
      setError(eObj.detail || eObj.message || 'Failed to create quick task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Quick Task</h2>
              <p className="text-xs text-slate-500">Self-created task assigned directly to you</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="e.g. Update client meeting notes & design deck"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              maxLength={5000}
              placeholder="Brief details of your task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-purple-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Task Type
              </label>
              <select
                value={taskTypeId ? String(taskTypeId) : ''}
                onChange={(e) => setTaskTypeId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-purple-500"
              >
                {taskTypeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Other Task Type box */}
          {isOtherType && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Specify Other Task Type <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Research, Maintenance, etc."
                value={otherTaskType}
                onChange={(e) => setOtherTaskType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <DurationField value={allocatedMinutes} onChange={setAllocatedMinutes} />
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-2.5 text-xs text-purple-700">
            <strong>Quick Task:</strong> Visible only to you and Admins. It will immediately show on your personal Kanban board.
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Quick Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
