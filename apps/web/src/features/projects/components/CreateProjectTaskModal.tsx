import React, { useState } from 'react';
import { X, CheckSquare } from 'lucide-react';
import type { CreateProjectTaskPayload, ProjectMember, SprintItem } from '../types';

interface CreateProjectTaskModalProps {
  projectId: number;
  projectMembers: ProjectMember[];
  sprints: SprintItem[];
  defaultSprintId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectTaskPayload) => Promise<void>;
}

export const CreateProjectTaskModal: React.FC<CreateProjectTaskModalProps> = ({
  projectMembers,
  sprints,
  defaultSprintId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState<number | undefined>(
    defaultSprintId || (sprints.length > 0 ? sprints[0].sprint_id : undefined)
  );
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleAssignee = (empId: number) => {
    if (selectedAssigneeIds.includes(empId)) {
      setSelectedAssigneeIds(selectedAssigneeIds.filter((id) => id !== empId));
    } else {
      setSelectedAssigneeIds([...selectedAssigneeIds, empId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    if (title.trim().length > 150) {
      setError('Task title cannot exceed 150 characters');
      return;
    }
    if (selectedAssigneeIds.length === 0) {
      setError('Please assign at least one project team member (BFD rule)');
      return;
    }

    const hours = parseFloat(allocatedHours) || 0;
    const allocated_minutes = Math.max(0, Math.round(hours * 60));

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        sprint_id: selectedSprintId,
        assignee_ids: selectedAssigneeIds,
        priority,
        due_date: dueDate ? dueDate : undefined,
        allocated_minutes,
      });

      // reset
      setTitle('');
      setDescription('');
      setSelectedAssigneeIds([]);
      setDueDate('');
      setAllocatedHours('4');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project task';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Project Task</h3>
              <p className="text-xs text-slate-500">
                Directly syncs to assigned team members' My Tasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication endpoints"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block text-right">
              {title.length}/150 characters
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sprint
              </label>
              <select
                value={selectedSprintId || ''}
                onChange={(e) =>
                  setSelectedSprintId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              >
                <option value="">No Sprint (Backlog)</option>
                {sprints.map((s) => (
                  <option key={s.sprint_id} value={s.sprint_id}>
                    {s.sprint_name} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignees (Restricted strictly to Project Members per BFD Section 2.7 & 2.8) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>
                Assign To Project Members <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium">
                {selectedAssigneeIds.length} selected
              </span>
            </label>
            <div className="border border-slate-200 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50/50">
              {projectMembers.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-2 text-center">
                  No members added to this project yet
                </p>
              ) : (
                projectMembers.map((m) => {
                  const isChecked = selectedAssigneeIds.includes(m.employee_id);
                  return (
                    <label
                      key={m.member_id}
                      onClick={() => toggleAssignee(m.employee_id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                        isChecked
                          ? 'bg-blue-50/80 border border-blue-200 text-blue-900'
                          : 'bg-white hover:bg-slate-100 border border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{m.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {m.role_in_project.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Allocated Time (Hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={allocatedHours}
                onChange={(e) => setAllocatedHours(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Task Description</span>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria or links..."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
