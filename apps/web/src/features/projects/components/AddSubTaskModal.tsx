import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import type { TaskDetailDto } from '@vernoxy-pulse/api-client';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { DurationField, formatMinutesToHuman } from '@/features/tasks/components/DurationField';
import { MultiEmployeeSelect } from '@/shared/ui/MultiEmployeeSelect';
import { J_BTN_PRIMARY, J_BTN_SUBTLE, J_INPUT, JBanner, JField, JiraModal } from '@/shared/ui/JiraModal';
import type { AddSubTaskPayload } from '../api/projects.api';
import type { ProjectMember } from '../types';

interface AddSubTaskModalProps {
  parent: TaskDetailDto | null;
  members: ProjectMember[];
  projectDeadline?: string | null;
  onClose: () => void;
  onSubmit: (payload: AddSubTaskPayload) => Promise<void>;
}

/** Create a child issue (sub-task) under a task that already exists. */
export const AddSubTaskModal: React.FC<AddSubTaskModalProps> = ({ parent, members, projectDeadline, onClose, onSubmit }) => {
  const { data: priorityLookups = [] } = useLookupsQuery('task_priority');
  const { data: typeLookups = [] } = useLookupsQuery('task_type');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState<number[]>([]);
  const [priority, setPriority] = useState('medium');
  const [typeId, setTypeId] = useState('');
  const [otherType, setOtherType] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [another, setAnother] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const employees = useMemo(
    () =>
      Array.from(new Map(members.map((m) => [m.employee_id, m])).values()).map((m) => ({
        emp_id: m.employee_id,
        name: m.name,
        email: m.email,
        avatar_url: m.profile_picture ?? null,
        role_name: m.role_in_project,
      })),
    [members],
  );
  const isOther = typeLookups.find((t) => String(t.id) === typeId)?.code === 'other';

  const reset = (priorityDefault = parent?.priority as string | undefined) => {
    setTitle('');
    setDescription('');
    setMinutes(null);
    // A child issue is due with its parent unless it is given its own date
    setStartDate((parent as { start_date?: string | null } | null)?.start_date?.slice(0, 10) ?? '');
    setDueDate(parent?.due_date ? String(parent.due_date).slice(0, 10) : '');
    setAssignees([]);
    setPriority(priorityDefault || 'medium');
    setTypeId('');
    setOtherType('');
    setErrors({});
    setFormError(null);
  };

  useEffect(() => {
    if (!parent) return;
    reset();
    setCreated(null);
    setAnother(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent?.task_id]);

  if (!parent) return null;

  /** What the parent's estimate becomes: the total of all its sub-tasks, this one included. */
  const existing = (parent.sub_tasks ?? []).reduce((n, s) => n + (s.allocated_minutes || 0), 0);
  const before = parent.allocated_minutes || existing;
  const after = existing + (minutes || 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Please enter the Task Name.';
    else if (title.trim().length > 150) e.title = 'Task Name cannot be longer than 150 characters.';
    if (!minutes || minutes <= 0) e.minutes = 'Allocated Time is mandatory and must be greater than zero.';
    if (assignees.length === 0) e.assignees = 'Please select the employee in Assigned To.';
    if (isOther && !otherType.trim()) e.other = 'Please enter the Other Task Type.';
    if (startDate && dueDate && startDate > dueDate) e.dates = 'Start date cannot be after the Due Date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    setCreated(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority as AddSubTaskPayload['priority'],
        allocated_minutes: minutes!,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        assignee_ids: assignees,
        task_type_id: typeId ? Number(typeId) : undefined,
        other_task_type: isOther ? otherType.trim() : undefined,
      });
      if (another) {
        setCreated(title.trim());
        reset(priority);
      } else {
        onClose();
      }
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      setFormError(e?.detail || e?.message || 'Could not add the sub-task. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <JiraModal
      title="Create child issue"
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      zIndex={65}
      footerStart={
        <label className="inline-flex cursor-pointer items-center gap-2 text-[14px]">
          <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} className="h-4 w-4 accent-[color:var(--ac-main,#0052CC)]" />
          Create another
        </label>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={J_BTN_SUBTLE}>Cancel</button>
          <button type="submit" disabled={busy} className={J_BTN_PRIMARY}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2 text-[13px] text-[#5E6C84]">
        <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#4BADE8] text-white"><GitBranch className="h-2.5 w-2.5" strokeWidth={3} /></span>
        Sub-task of <b className="font-semibold text-[#172B4D]">{parent.task_code}</b>
        <span className="truncate">{parent.title}</span>
      </div>
      <p className="-mt-2 text-[12px] text-[#5E6C84]">Required fields are marked with an asterisk <span className="text-[#DE350B]">*</span></p>
      {created && <JBanner tone="success"><b className="font-semibold">{created}</b> was added. Add another below.</JBanner>}
      {formError && <JBanner>{formError}</JBanner>}

      <JField label="Task name" required htmlFor="sub-title" error={errors.title}>
        <input id="sub-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className={J_INPUT} placeholder="e.g. Build the login form" />
      </JField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DurationField label="Allocated time *" value={minutes} onChange={setMinutes} error={errors.minutes} />
        <JField label="Start date" optional htmlFor="sub-start">
          <input id="sub-start" type="date" value={startDate} max={dueDate || undefined} onChange={(e) => setStartDate(e.target.value)} className={J_INPUT} />
        </JField>
        <JField label="Due date" optional htmlFor="sub-due" error={errors.dates}>
          <input id="sub-due" type="date" value={dueDate} min={startDate || undefined} onChange={(e) => setDueDate(e.target.value)} className={J_INPUT} />
          {projectDeadline && (
            <p className={`mt-1 text-[12px] ${dueDate && dueDate > projectDeadline.slice(0, 10) ? 'font-medium text-[#974F0C]' : 'text-[#5E6C84]'}`}>
              {dueDate && dueDate > projectDeadline.slice(0, 10) ? 'After the project deadline' : 'Project ends'} ({new Date(`${projectDeadline.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
            </p>
          )}
        </JField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Priority" htmlFor="sub-priority">
          <select id="sub-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={J_INPUT}>
            {priorityLookups.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </JField>
      </div>

      <MultiEmployeeSelect employees={employees} selectedIds={assignees} label="Assigned to *" error={errors.assignees} onChange={setAssignees} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <JField label="Task type" optional htmlFor="sub-type" hint={!typeId ? 'Same as the parent task' : undefined}>
          <select id="sub-type" value={typeId} onChange={(e) => setTypeId(e.target.value)} className={J_INPUT}>
            <option value="">Same as parent</option>
            {typeLookups.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </JField>
        {isOther && (
          <JField label="Other task type" required htmlFor="sub-other" error={errors.other}>
            <input id="sub-other" value={otherType} onChange={(e) => setOtherType(e.target.value)} maxLength={100} className={J_INPUT} />
          </JField>
        )}
      </div>

      <JField label="Description" optional htmlFor="sub-desc">
        <textarea id="sub-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${J_INPUT} resize-y`} placeholder="Details of the work to be done" />
      </JField>

      <JBanner tone="info">
        The estimate of <b className="font-semibold">{parent.task_code}</b> is the total of its sub-tasks:{' '}
        <b className="font-semibold">{formatMinutesToHuman(before) || '0m'}</b> becomes{' '}
        <b className="font-semibold">{formatMinutesToHuman(after) || '0m'}</b>.
        {!(parent.sub_tasks?.length) && ' This is its first sub-task, so the parent task will now be a container for its sub-tasks.'}
      </JBanner>
    </JiraModal>
  );
};
