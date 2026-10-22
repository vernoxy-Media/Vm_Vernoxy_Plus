import React, { useState } from 'react';
import { X, Bug } from 'lucide-react';
import type { CreateProjectBugPayload, ProjectMember, ProjectTaskItem } from '../types';

interface CreateBugModalProps {
  projectId: number;
  projectMembers: ProjectMember[];
  tasks: ProjectTaskItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectBugPayload) => Promise<void>;
}

export const CreateBugModal: React.FC<CreateBugModalProps> = ({
  projectMembers,
  tasks,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bugType, setBugType] = useState<any>('frontend');
  const [otherBugType, setOtherBugType] = useState('');
  const [taskId, setTaskId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>(
    projectMembers.length > 0 ? String(projectMembers[0].employee_id) : ''
  );
  const [priority, setPriority] = useState<any>('low');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Bug title is required');
      return;
    }
    if (!description.trim()) {
      setError('Bug description is required');
      return;
    }
    if (!stepsToReproduce.trim()) {
      setError('Steps to reproduce are required');
      return;
    }
    if (!expectedResult.trim() || !actualResult.trim()) {
      setError('Expected and actual results are required');
      return;
    }
    if (!assignedTo) {
      setError('Please assign the bug to a project team member');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce.trim(),
        expected_result: expectedResult.trim(),
        actual_result: actualResult.trim(),
        assigned_to: Number(assignedTo),
        priority,
        bug_type: bugType,
        other_bug_type: bugType === 'other' ? otherBugType.trim() : undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        task_id: taskId ? Number(taskId) : undefined,
      });

      // reset & close
      setTitle('');
      setDescription('');
      setStepsToReproduce('');
      setExpectedResult('');
      setActualResult('');
      setAttachmentUrl('');
      onClose();
    } catch (err: any) {
      console.error('Error reporting bug:', err);
      setError(err?.detail || err?.message || 'Failed to report bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Report Project Bug</h3>
              <p className="text-xs text-slate-500">Log an issue or defect for the project team</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bug Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Checkout button not responding on Safari"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the bug..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bug Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={bugType}
                onChange={(e) => setBugType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="ui">UI</option>
                <option value="database">Database</option>
                <option value="other">Other</option>
              </select>
            </div>

            {bugType === 'other' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specify Type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={otherBugType}
                  onChange={(e) => setOtherBugType(e.target.value)}
                  placeholder="Specify custom bug type"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="low">Low (Default)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Team Member <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="">Select Member</option>
                {projectMembers.map((m) => (
                  <option key={m.member_id} value={m.employee_id}>
                    {m.name} ({m.role_in_project})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Related Task (Optional)
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="">None / General Project Bug</option>
                {tasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    {t.task_code ? `[${t.task_code}] ` : ''}
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Steps to Reproduce
            </label>
            <textarea
              rows={2}
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Open checkout page&#10;2. Click pay now&#10;3. Observe error"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Result</label>
              <textarea
                rows={2}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="Payment gateway opens cleanly"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Result</label>
              <textarea
                rows={2}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="Nothing happens, console shows 500 error"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Reporting...' : 'Report Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
