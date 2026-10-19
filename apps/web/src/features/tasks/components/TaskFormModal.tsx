import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  CreateTaskDto,
  TaskDetailDto,
} from '@vernoxy-pulse/api-client';
import type { TaskPriority } from '../types';
import { DurationField } from '../../../components/DurationField';
import {
  MultiEmployeeSelect,
  AssignableEmployee,
} from '../../../components/MultiEmployeeSelect';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto) => Promise<void>;
  employees: AssignableEmployee[];
  taskTypeOptions: { id: number; label: string }[];
  initialData?: TaskDetailDto | null;
  title: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employees,
  taskTypeOptions,
  initialData,
  title,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskTypeId, setTaskTypeId] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [allocatedMinutes, setAllocatedMinutes] = useState<number | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTaskTitle(initialData.title);
      setDescription(initialData.description || '');
      setPriority(initialData.priority);
      setTaskTypeId(initialData.task_type_id || undefined);
      setDueDate(initialData.due_date || '');
      setAllocatedMinutes(initialData.allocated_minutes || null);
      setAssigneeIds(initialData.assignees.map((a) => a.employee_id));
    } else {
      setTaskTitle('');
      setDescription('');
      setPriority('medium');
      setTaskTypeId(taskTypeOptions[0]?.id);
      setDueDate('');
      setAllocatedMinutes(120);
      setAssigneeIds([]);
    }
    setError(null);
  }, [initialData, isOpen, taskTypeOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError('Task title is required');
      return;
    }
    if (assigneeIds.length === 0) {
      setError('Please select at least one assignee');
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
        assignee_ids: assigneeIds,
      });
      onClose();
    } catch (err: unknown) {
      const eObj = err as { detail?: string; message?: string };
      setError(eObj.detail || eObj.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="e.g. Implement user management portal"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              maxLength={10000}
              placeholder="Task details and scope of work..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
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
                className="w-full rounded-xl border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Task Type
              </label>
              <select
                value={taskTypeId ? String(taskTypeId) : ''}
                onChange={(e) => setTaskTypeId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">None</option>
                {taskTypeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <DurationField value={allocatedMinutes} onChange={setAllocatedMinutes} />
          </div>

          <MultiEmployeeSelect
            employees={employees}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
          />

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
