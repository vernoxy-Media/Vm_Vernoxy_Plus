import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import type { CreateSprintPayload, SprintStatus } from '../types';

interface CreateSprintModalProps {
  projectId: number;
  projectStartDate?: string;
  projectDeadline?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSprintPayload) => Promise<void>;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
  projectStartDate,
  projectDeadline,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState(
    projectStartDate ? projectStartDate.substring(0, 10) : ''
  );
  const [endDate, setEndDate] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [status, setStatus] = useState<SprintStatus>('planned');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sprintName.trim()) {
      setError('Sprint name is required');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        sprint_name: sprintName.trim(),
        start_date: startDate,
        end_date: endDate,
        sprint_goal: sprintGoal.trim() ? sprintGoal.trim() : undefined,
        status,
      });
      // reset
      setSprintName('');
      setSprintGoal('');
      setStatus('planned');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create sprint';
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
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Sprint</h3>
              <p className="text-xs text-slate-500">Plan a milestone sprint cycle for this project</p>
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
              Sprint Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="e.g. Sprint 1 - Foundation & Design"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
              {projectStartDate && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Project starts: {projectStartDate.substring(0, 10)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
              {projectDeadline && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Deadline: {projectDeadline.substring(0, 10)}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SprintStatus)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            >
              <option value="planned">Planned (Upcoming)</option>
              <option value="in_progress">In Progress (Active)</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Sprint Goal</span>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </label>
            <textarea
              rows={3}
              value={sprintGoal}
              onChange={(e) => setSprintGoal(e.target.value)}
              placeholder="What should this sprint deliver or achieve?"
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
              {isSubmitting ? 'Creating...' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
