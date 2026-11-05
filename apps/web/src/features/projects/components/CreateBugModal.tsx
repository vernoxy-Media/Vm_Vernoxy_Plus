import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Bug, Paperclip } from 'lucide-react';
import type { CreateProjectBugPayload, ProjectMember, ProjectTaskItem } from '../types';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { BUG_ATTACHMENT_MAX_BYTES } from '../api/projects.api';

interface CreateBugModalProps {
  projectId: number;
  projectMembers: ProjectMember[];
  tasks: ProjectTaskItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectBugPayload) => Promise<void>;
}

const LABEL = 'block text-xs font-semibold text-slate-700 mb-1';
const INPUT =
  'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500';
const Req = () => <span className="text-rose-500">*</span>;
const Err: React.FC<{ text?: string }> = ({ text }) => (text ? <p className="text-[11px] text-rose-600 mt-1">{text}</p> : null);

/** Create Bug (Project BFD 3.5). Fields in BFD order; Status is set by the system (New). */
export const CreateBugModal: React.FC<CreateBugModalProps> = ({ projectMembers, tasks, isOpen, onClose, onSubmit }) => {
  const { data: bugTypes = [] } = useLookupsQuery('bug_type');
  const { data: bugPriorities = [] } = useLookupsQuery('bug_priority');
  const members = useMemo(
    () => Array.from(new Map(projectMembers.map((m) => [m.employee_id, m])).values()),
    [projectMembers],
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('low');
  const [bugType, setBugType] = useState('');
  const [otherBugType, setOtherBugType] = useState('');
  const [taskId, setTaskId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setSteps('');
    setExpected('');
    setActual('');
    setAssignedTo('');
    setPriority('low');
    setBugType('');
    setOtherBugType('');
    setTaskId('');
    setFile(null);
    setErrors({});
    setFormError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Please enter the Title.';
    if (!description.trim()) e.description = 'Please enter the Description.';
    if (!steps.trim()) e.steps = 'Please enter the Steps to Reproduce.';
    if (!expected.trim()) e.expected = 'Please enter the Expected Result.';
    if (!actual.trim()) e.actual = 'Please enter the Actual Result.';
    if (!assignedTo) e.assignedTo = 'Please select the employee in Assigned To.';
    if (!bugType) e.bugType = 'Please select the Bug Type.';
    if (bugType === 'other' && !otherBugType.trim()) e.otherBugType = 'Please enter the Other Bug Type.';
    if (file && file.size > BUG_ATTACHMENT_MAX_BYTES) e.file = 'The attachment cannot be larger than 5 MB.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: steps.trim(),
        expected_result: expected.trim(),
        actual_result: actual.trim(),
        assigned_to: Number(assignedTo),
        priority: priority as any,
        bug_type: bugType as any,
        other_bug_type: bugType === 'other' ? otherBugType.trim() : undefined,
        task_id: taskId ? Number(taskId) : undefined,
        attachment_file: file,
      });
      onClose();
    } catch (err: any) {
      setFormError(err?.detail || err?.message || 'Could not save the bug. Please try again.');
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
              <h3 className="text-base font-bold text-slate-900">Create Bug</h3>
              <p className="text-xs text-slate-500">The Bug ID is generated and the status starts as New.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div>
            <label className={LABEL}>
              Title <Req />
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={INPUT} placeholder="Short name of the bug" />
            <Err text={errors.title} />
          </div>
          <div>
            <label className={LABEL}>
              Description <Req />
            </label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
            <Err text={errors.description} />
          </div>
          <div>
            <label className={LABEL}>
              Steps to Reproduce <Req />
            </label>
            <textarea rows={2} value={steps} onChange={(e) => setSteps(e.target.value)} className={INPUT} placeholder="Navigation to reach the bug" />
            <Err text={errors.steps} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                Expected Result <Req />
              </label>
              <textarea rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} className={INPUT} />
              <Err text={errors.expected} />
            </div>
            <div>
              <label className={LABEL}>
                Actual Result <Req />
              </label>
              <textarea rows={2} value={actual} onChange={(e) => setActual(e.target.value)} className={INPUT} />
              <Err text={errors.actual} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                Assigned To <Req />
              </label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={INPUT}>
                <option value="">Select employee</option>
                {members.map((m) => (
                  <option key={m.employee_id} value={m.employee_id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <Err text={errors.assignedTo} />
            </div>
            <div>
              <label className={LABEL}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={INPUT}>
                {bugPriorities.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                Bug Type <Req />
              </label>
              <select value={bugType} onChange={(e) => setBugType(e.target.value)} className={INPUT}>
                <option value="">Select</option>
                {bugTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Err text={errors.bugType} />
            </div>
            {bugType === 'other' && (
              <div>
                <label className={LABEL}>
                  Other Bug Type <Req />
                </label>
                <input value={otherBugType} onChange={(e) => setOtherBugType(e.target.value)} maxLength={100} className={INPUT} />
                <Err text={errors.otherBugType} />
              </div>
            )}
          </div>
          <div>
            <label className={LABEL}>Related Task</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={INPUT}>
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.task_id} value={t.task_id}>
                  {t.task_code ? `[${t.task_code}] ` : ''}
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Attachment</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Paperclip className="w-3.5 h-3.5" /> {file ? 'Change file' : 'Choose file'}
              </button>
              <span className="text-[11px] text-slate-500 truncate">{file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Screenshot or document, max 5 MB'}</span>
              {file && (
                <button type="button" onClick={() => setFile(null)} className="text-[11px] text-rose-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Err text={errors.file} />
          </div>

          {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{formError}</div>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50">
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
