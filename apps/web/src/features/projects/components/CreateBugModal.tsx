import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Loader2, Paperclip } from 'lucide-react';
import { J_BTN_DANGER, J_BTN_SUBTLE, J_INPUT, JBanner, JField, JiraModal } from '@/shared/ui/JiraModal';
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
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
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
    setStartDate('');
    setDueDate('');
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
    if (startDate && dueDate && startDate > dueDate) e.dates = 'Start date cannot be after the Due Date.';
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
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
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
    <JiraModal
      title="Report bug"
      size="lg"
      onClose={onClose}
      onSubmit={handleSubmit}
      zIndex={60}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={J_BTN_SUBTLE}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className={J_BTN_DANGER}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create bug
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2 text-[12px] text-[#5E6C84]">
        <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#E5493A] text-white"><Bug className="h-2.5 w-2.5" strokeWidth={3} /></span>
        Issue type: <b className="font-semibold text-[#172B4D]">Bug</b>
        <span className="mx-1">·</span>
        The key is generated and the status starts as New.
      </div>
      <p className="-mt-2 text-[12px] text-[#5E6C84]">Required fields are marked with an asterisk <span className="text-[#DE350B]">*</span></p>
      {formError && <JBanner>{formError}</JBanner>}

      <JField label="Summary" required htmlFor="bug-title" error={errors.title}>
        <input id="bug-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={J_INPUT} placeholder="Short name of the bug" />
      </JField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Assignee" required htmlFor="bug-assignee" error={errors.assignedTo}>
          <select id="bug-assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={J_INPUT}>
            <option value="">Select employee</option>
            {members.map((m) => (
              <option key={m.employee_id} value={m.employee_id}>{m.name}</option>
            ))}
          </select>
        </JField>
        <JField label="Priority" htmlFor="bug-priority">
          <select id="bug-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={J_INPUT}>
            {bugPriorities.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </JField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Bug type" required htmlFor="bug-type" error={errors.bugType}>
          <select id="bug-type" value={bugType} onChange={(e) => setBugType(e.target.value)} className={J_INPUT}>
            <option value="">Select</option>
            {bugTypes.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
        </JField>
        {bugType === 'other' ? (
          <JField label="Other bug type" required htmlFor="bug-other" error={errors.otherBugType}>
            <input id="bug-other" value={otherBugType} onChange={(e) => setOtherBugType(e.target.value)} maxLength={100} className={J_INPUT} />
          </JField>
        ) : (
          <JField label="Linked issue" optional htmlFor="bug-task">
            <select id="bug-task" value={taskId} onChange={(e) => setTaskId(e.target.value)} className={J_INPUT}>
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.task_id} value={t.task_id}>{t.task_code ? `${t.task_code} ` : ''}{t.title}</option>
              ))}
            </select>
          </JField>
        )}
      </div>
      {bugType === 'other' && (
        <JField label="Linked issue" optional htmlFor="bug-task-2">
          <select id="bug-task-2" value={taskId} onChange={(e) => setTaskId(e.target.value)} className={J_INPUT}>
            <option value="">None</option>
            {tasks.map((t) => (
              <option key={t.task_id} value={t.task_id}>{t.task_code ? `${t.task_code} ` : ''}{t.title}</option>
            ))}
          </select>
        </JField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Start date" optional htmlFor="bug-start">
          <input id="bug-start" type="date" value={startDate} max={dueDate || undefined} onChange={(e) => setStartDate(e.target.value)} className={J_INPUT} />
        </JField>
        <JField label="Due date" optional htmlFor="bug-due" error={errors.dates}>
          <input id="bug-due" type="date" value={dueDate} min={startDate || undefined} onChange={(e) => setDueDate(e.target.value)} className={J_INPUT} />
        </JField>
      </div>

      <JField label="Description" required htmlFor="bug-desc" error={errors.description}>
        <textarea id="bug-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${J_INPUT} resize-y`} />
      </JField>
      <JField label="Steps to reproduce" required htmlFor="bug-steps" error={errors.steps}>
        <textarea id="bug-steps" rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} className={`${J_INPUT} resize-y`} placeholder="1. Open … 2. Click …" />
      </JField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Expected result" required htmlFor="bug-expected" error={errors.expected}>
          <textarea id="bug-expected" rows={3} value={expected} onChange={(e) => setExpected(e.target.value)} className={`${J_INPUT} resize-y`} />
        </JField>
        <JField label="Actual result" required htmlFor="bug-actual" error={errors.actual}>
          <textarea id="bug-actual" rows={3} value={actual} onChange={(e) => setActual(e.target.value)} className={`${J_INPUT} resize-y`} />
        </JField>
      </div>

      <JField label="Attachment" optional error={errors.file}>
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border-2 border-dashed border-[#DFE1E6] bg-[#FAFBFC] p-3">
          <button type="button" onClick={() => fileRef.current?.click()} className={J_BTN_SUBTLE + ' bg-[rgba(9,30,66,0.04)]'}>
            <Paperclip className="h-4 w-4" /> {file ? 'Change file' : 'Choose file'}
          </button>
          <span className="min-w-0 flex-1 truncate text-[12px] text-[#5E6C84]">
            {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Screenshot or document, max 5 MB'}
          </span>
          {file && (
            <button type="button" onClick={() => setFile(null)} className="cursor-pointer text-[12px] font-medium text-[color:var(--ac-main,#0052CC)] hover:underline">Remove</button>
          )}
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </JField>
    </JiraModal>
  );
};
