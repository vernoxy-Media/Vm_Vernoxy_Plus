import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, GitBranch, AlertCircle, CheckCircle2 } from 'lucide-react';
import { J_BTN_PRIMARY, J_BTN_SUBTLE, J_INPUT, J_LABEL, JBanner, JiraModal } from '@/shared/ui/JiraModal';
import { CreateTaskDto, TaskDetailDto } from '@vernoxy-pulse/api-client';
import type { TaskPriority } from '../types';
import { DurationField, formatMinutesToHuman } from './DurationField';
import { MultiEmployeeSelect, AssignableEmployee } from '@/shared/ui/MultiEmployeeSelect';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';

/**
 * Create / Edit Task (Task BFD 2.3, 2.4, 3.5; Project BFD 2.7).
 *  - mode 'admin'   : Admin "Add Task" (Personal Task).
 *  - mode 'quick'   : employee's own task — Assigned To is not shown.
 *  - mode 'project' : Project Task — adds Sprint; Assigned To lists project employees only.
 */
export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto) => Promise<void>;
  employees?: AssignableEmployee[];
  taskTypeOptions: { id: number; label: string }[];
  initialData?: TaskDetailDto | null;
  title: string;
  mode?: 'admin' | 'quick' | 'project';
  sprintOptions?: Array<{ id: number; label: string }>;
  defaultSprintId?: number | null;
  /** Deadline of the project, shown beside the due date so nobody plans past it. */
  projectDeadline?: string | null;
}

interface SubTaskDraft {
  key: string;
  title: string;
  description: string;
  allocatedMinutes: number | null;
  startDate: string;
  dueDate: string;
  assigneeIds: number[];
  priority: TaskPriority;
  taskTypeId?: number;
  otherTaskType: string;
}

const LABEL = J_LABEL;
const INPUT = J_INPUT;
const Req = () => <span className="ml-0.5 text-[#DE350B]" aria-hidden>*</span>;
/** "Project ends 30 Nov 2026", or a warning when the chosen due date falls after it. */
const DueHint: React.FC<{ due: string; projectDeadline?: string | null }> = ({ due, projectDeadline }) => {
  const end = projectDeadline ? projectDeadline.slice(0, 10) : '';
  if (!end) return null;
  const shown = new Date(`${end}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return due && due > end ? (
    <p className="mt-1 text-[12px] font-medium text-[#974F0C]">After the project deadline ({shown})</p>
  ) : (
    <p className="mt-1 text-[12px] text-[#5E6C84]">Project ends {shown}</p>
  );
};

const Err: React.FC<{ text?: string }> = ({ text }) => (text ? <p role="alert" className="mt-1 text-[12px] text-[#BF2600]">{text}</p> : null);

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employees = [],
  taskTypeOptions,
  initialData,
  title,
  mode = 'admin',
  sprintOptions = [],
  defaultSprintId,
  projectDeadline,
}) => {
  const { data: priorityLookups = [] } = useLookupsQuery('task_priority');
  const { data: typeLookups = [] } = useLookupsQuery('task_type');
  const typeOptions = useMemo(
    () =>
      typeLookups.length
        ? typeLookups.map((l) => ({ id: l.id, label: l.label, code: l.code }))
        : taskTypeOptions.map((t) => ({ ...t, code: t.label.trim().toLowerCase().startsWith('other') ? 'other' : '' })),
    [typeLookups, taskTypeOptions],
  );
  const isOther = (id?: number) => typeOptions.find((t) => t.id === id)?.code === 'other';

  const isEdit = Boolean(initialData);
  const isQuick = mode === 'quick';

  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allocatedMinutes, setAllocatedMinutes] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sprintId, setSprintId] = useState<number | undefined>(undefined);
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [hasSubTasks, setHasSubTasks] = useState(false);
  const [leadId, setLeadId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskTypeId, setTaskTypeId] = useState<number | undefined>(undefined);
  const [otherTaskType, setOtherTaskType] = useState('');
  const [subTasks, setSubTasks] = useState<SubTaskDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const resetFields = (d: any, keepSprint?: number) => {
    setTaskTitle(d?.title || '');
    setDescription(d?.description || '');
    setAllocatedMinutes(d?.allocated_minutes || null);
    setStartDate(d?.start_date ? String(d.start_date).slice(0, 10) : '');
    setDueDate(d?.due_date ? String(d.due_date).slice(0, 10) : '');
    setSprintId(d?.sprint_id || keepSprint || defaultSprintId || undefined);
    setAssigneeIds(d?.assignees?.map((a: any) => a.employee_id) || []);
    setHasSubTasks(Boolean(d?.has_sub_tasks));
    setLeadId(d?.lead_employee_id || undefined);
    setPriority((d?.priority as TaskPriority) || 'medium');
    setTaskTypeId(d?.task_type_id || undefined);
    setOtherTaskType(d?.other_task_type || '');
    setSubTasks([]);
    setErrors({});
    setFormError(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetFields(initialData);
    setCreated(null);
    setCreateAnother(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, defaultSprintId]);

  const mainEmployees = useMemo(() => employees.filter((e) => assigneeIds.includes(e.emp_id)), [employees, assigneeIds]);
  const subTotal = subTasks.reduce((s, st) => s + (st.allocatedMinutes || 0), 0);
  const timesMatch = !hasSubTasks || subTasks.length === 0 || subTotal === (allocatedMinutes || 0);

  if (!isOpen) return null;

  const patchSub = (key: string, p: Partial<SubTaskDraft>) => setSubTasks((l) => l.map((s) => (s.key === key ? { ...s, ...p } : s)));
  const addSub = () =>
    setSubTasks((l) => [
      ...l,
      {
        key: `st_${Date.now()}_${l.length}`,
        title: '',
        description: '',
        allocatedMinutes: null,
        startDate,
        dueDate,
        assigneeIds: [],
        priority,
        taskTypeId,
        otherTaskType: '',
      },
    ]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!taskTitle.trim()) e.title = 'Please enter the Task Name.';
    else if (taskTitle.trim().length > 150) e.title = 'Task Name cannot be longer than 150 characters.';
    if (!allocatedMinutes || allocatedMinutes <= 0) e.allocated = 'Allocated Time is mandatory and must be greater than zero.';
    if (startDate && dueDate && startDate > dueDate) e.dates = 'Start date cannot be after the Due Date.';
    if (!isQuick) {
      if (assigneeIds.length === 0) e.assignees = 'Please select the employee in Assigned To.';
      else if (!hasSubTasks && assigneeIds.length !== 1) e.assignees = 'Only one employee can be selected. Tick "Has Sub Tasks" to share the task.';
      if (hasSubTasks && !leadId) e.lead = 'Please select the Lead.';
      else if (hasSubTasks && leadId && !assigneeIds.includes(leadId)) e.lead = 'The Lead must be one of the employees in Assigned To.';
    }
    if (!priority) e.priority = 'Please select the Priority.';
    if (!taskTypeId) e.taskType = 'Please select the Task Type.';
    if (isOther(taskTypeId)) {
      if (!otherTaskType.trim()) e.other = 'Please enter the Other Task Type.';
      else if (otherTaskType.trim().length > 100) e.other = 'Other Task Type cannot be longer than 100 characters.';
    }
    if (hasSubTasks && !isEdit) {
      if (subTasks.length === 0) e.subTasks = 'Please add at least one sub task, or untick "Has Sub Tasks".';
      subTasks.forEach((st, i) => {
        if (!st.title.trim()) e.subTasks = `Please enter the name of sub task ${i + 1}.`;
        else if (!isQuick && st.assigneeIds.length === 0) e.subTasks = `Please select the employee(s) for sub task ${i + 1}.`;
        else if (!st.allocatedMinutes || st.allocatedMinutes <= 0) e.subTasks = `Please enter the time of sub task ${i + 1}.`;
        else if (allocatedMinutes && st.allocatedMinutes > allocatedMinutes) e.subTasks = `Sub task ${i + 1} cannot be longer than the main task.`;
        else if (isOther(st.taskTypeId) && !st.otherTaskType.trim()) e.subTasks = `Please enter the Other Task Type of sub task ${i + 1}.`;
      });
      subTasks.forEach((st, i) => {
        if (!e.subTasks && st.startDate && st.dueDate && st.startDate > st.dueDate) e.subTasks = `Sub task ${i + 1}: start date cannot be after its due date.`;
      });
      if (!e.subTasks && !timesMatch) {
        e.subTasks = `The total time of all sub tasks (${formatMinutesToHuman(subTotal)}) must be equal to the Allocated Time (${formatMinutesToHuman(allocatedMinutes)}).`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    setCreated(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        title: taskTitle.trim(),
        description: description.trim() || undefined,
        allocated_minutes: allocatedMinutes || undefined,
        // Editing may clear the date, so an empty field is sent as null there
        start_date: startDate || (isEdit ? null : undefined),
        due_date: dueDate || (isEdit ? null : undefined),
        priority,
        task_type_id: taskTypeId,
        other_task_type: isOther(taskTypeId) ? otherTaskType.trim() : undefined,
      };
      if (!isQuick) payload.assignee_ids = assigneeIds;
      if (mode === 'project') payload.sprint_id = sprintId || undefined;
      if (!isEdit) {
        payload.has_sub_tasks = hasSubTasks;
        if (hasSubTasks) {
          if (!isQuick) payload.lead_employee_id = leadId;
          payload.sub_tasks = subTasks.map((st) => ({
            title: st.title.trim(),
            description: st.description.trim() || undefined,
            allocated_minutes: st.allocatedMinutes || undefined,
            start_date: st.startDate || undefined,
            due_date: st.dueDate || undefined,
            assignee_ids: isQuick ? [] : st.assigneeIds,
            priority: st.priority,
            task_type_id: st.taskTypeId,
            other_task_type: isOther(st.taskTypeId) ? st.otherTaskType.trim() : undefined,
          }));
        }
      }
      await onSubmit(payload as CreateTaskDto);
      if (createAnother && !isEdit) {
        // Jira's "Create another": keep the dialog, clear the form, stay in the same sprint
        const name = taskTitle.trim();
        resetFields(null, sprintId);
        setCreated(name);
      } else {
        onClose();
      }
    } catch (err: any) {
      setFormError(err?.detail || err?.message || 'Could not save the task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeSelect = (value: number | undefined, onChange: (id?: number) => void) => (
    <select value={value ? String(value) : ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} className={INPUT}>
      <option value="">Select</option>
      {typeOptions.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
  const prioritySelect = (value: TaskPriority, onChange: (p: TaskPriority) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value as TaskPriority)} className={INPUT}>
      {priorityLookups.map((p) => (
        <option key={p.code} value={p.code}>
          {p.label}
        </option>
      ))}
    </select>
  );

  return (
    <JiraModal
      title={title}
      size="lg"
      onClose={onClose}
      onSubmit={handleSubmit}
      zIndex={60}
      footerStart={
        !isEdit ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[14px]">
            <input type="checkbox" checked={createAnother} onChange={(e) => setCreateAnother(e.target.checked)} className="h-4 w-4 accent-[color:var(--ac-main,#0052CC)]" />
            Create another
          </label>
        ) : undefined
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={J_BTN_SUBTLE}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className={J_BTN_PRIMARY}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {isEdit ? 'Save' : 'Create'}
          </button>
        </>
      }
    >
      <p className="text-[12px] text-[#5E6C84]">Required fields are marked with an asterisk <span className="text-[#DE350B]">*</span></p>
      {created && <JBanner tone="success"><b className="font-semibold">{created}</b> was created. Add another below.</JBanner>}
      {formError && <JBanner>{formError}</JBanner>}

      {isEdit && (
        <div>
          <label className={LABEL}>Task ID</label>
          <input value={(initialData as any)?.task_code || ''} disabled className={INPUT} />
        </div>
      )}

      <div>
        <label className={LABEL}>
          Task Name <Req />
        </label>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} maxLength={150} className={INPUT} placeholder="e.g. Website Update" />
        <Err text={errors.title} />
      </div>

      <div>
        <label className={LABEL}>Task Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={INPUT} placeholder="Details of the work to be done" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DurationField label="Allocated Time *" value={allocatedMinutes} onChange={setAllocatedMinutes} error={errors.allocated} />
        <div>
          <label className={LABEL} htmlFor="task-start">Start date</label>
          <input id="task-start" type="date" value={startDate} max={dueDate || undefined} onChange={(e) => setStartDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="task-due">Due date</label>
          <input id="task-due" type="date" value={dueDate} min={startDate || undefined} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
          <DueHint due={dueDate} projectDeadline={projectDeadline} />
        </div>
      </div>
      <Err text={errors.dates} />

      {mode === 'project' && (
        <div>
          <label className={LABEL}>Sprint</label>
          <select value={sprintId ? String(sprintId) : ''} onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : undefined)} className={INPUT}>
            <option value="">No sprint</option>
            {sprintOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isQuick && (
        <div>
          {hasSubTasks ? (
            <MultiEmployeeSelect
              employees={employees}
              selectedIds={assigneeIds}
              label="Assigned To *"
              error={errors.assignees}
              onChange={(ids) => {
                setAssigneeIds(ids);
                if (leadId && !ids.includes(leadId)) setLeadId(undefined);
                setSubTasks((l) => l.map((st) => ({ ...st, assigneeIds: st.assigneeIds.filter((id) => ids.includes(id)) })));
              }}
            />
          ) : (
            <>
              <label className={LABEL}>
                Assigned To <Req />
              </label>
              <select
                value={assigneeIds[0] ? String(assigneeIds[0]) : ''}
                onChange={(e) => setAssigneeIds(e.target.value ? [Number(e.target.value)] : [])}
                className={INPUT}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <Err text={errors.assignees} />
            </>
          )}
        </div>
      )}

      {!isEdit && (
        <div className="space-y-3 rounded-[3px] bg-[#F4F5F7] p-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSubTasks}
              onChange={(e) => {
                setHasSubTasks(e.target.checked);
                if (!e.target.checked) {
                  setSubTasks([]);
                  setLeadId(undefined);
                  setAssigneeIds((ids) => ids.slice(0, 1));
                }
              }}
            />
            <span className="flex items-center gap-1.5 text-[14px] font-medium text-[#172B4D]">
              <GitBranch className="h-4 w-4 text-[color:var(--ac-main,#0052CC)]" /> Has Sub Tasks
            </span>
          </label>

          {hasSubTasks && !isQuick && (
            <div>
              <label className={LABEL}>
                Lead <Req />
              </label>
              <select value={leadId ? String(leadId) : ''} onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : undefined)} className={INPUT}>
                <option value="">{mainEmployees.length ? 'Select the Lead' : 'Select employees in Assigned To first'}</option>
                {mainEmployees.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <Err text={errors.lead} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>
            Priority <Req />
          </label>
          {prioritySelect(priority, setPriority)}
          <Err text={errors.priority} />
        </div>
        <div>
          <label className={LABEL}>
            Task Type <Req />
          </label>
          {typeSelect(taskTypeId, setTaskTypeId)}
          <Err text={errors.taskType} />
        </div>
      </div>

      {isOther(taskTypeId) && (
        <div>
          <label className={LABEL}>
            Other Task Type <Req />
          </label>
          <input value={otherTaskType} onChange={(e) => setOtherTaskType(e.target.value)} maxLength={100} className={INPUT} />
          <Err text={errors.other} />
        </div>
      )}

      {hasSubTasks && !isEdit && (
        <div className="space-y-3 rounded-[3px] bg-[#F4F5F7] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#172B4D]">Sub-tasks</span>
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${timesMatch ? 'text-emerald-700' : 'text-amber-700'}`}>
              {timesMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {formatMinutesToHuman(subTotal) || '0m'} of {formatMinutesToHuman(allocatedMinutes) || '0m'}
            </span>
          </div>
          {subTasks.map((st, i) => (
            <div key={st.key} className="space-y-2 rounded-[3px] bg-white p-3 shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Sub task {i + 1}</span>
                <button type="button" onClick={() => setSubTasks((l) => l.filter((x) => x.key !== st.key))} className="text-rose-500 hover:text-rose-700" aria-label="Remove sub task">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input value={st.title} onChange={(e) => patchSub(st.key, { title: e.target.value })} maxLength={150} placeholder="Task Name *" className={INPUT} />
              <textarea value={st.description} onChange={(e) => patchSub(st.key, { description: e.target.value })} rows={2} placeholder="Task Description" className={INPUT} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DurationField label="Allocated Time *" value={st.allocatedMinutes} onChange={(m) => patchSub(st.key, { allocatedMinutes: m })} />
                <div>
                  <label className={LABEL}>Start date</label>
                  <input type="date" value={st.startDate} max={st.dueDate || undefined} onChange={(e) => patchSub(st.key, { startDate: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Due date</label>
                  <input type="date" value={st.dueDate} onChange={(e) => patchSub(st.key, { dueDate: e.target.value })} className={INPUT} />
                  <DueHint due={st.dueDate} projectDeadline={projectDeadline} />
                </div>
              </div>
              {!isQuick && (
                <MultiEmployeeSelect
                  employees={mainEmployees}
                  selectedIds={st.assigneeIds}
                  label="Assigned To *"
                  onChange={(ids) => patchSub(st.key, { assigneeIds: ids })}
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prioritySelect(st.priority, (p) => patchSub(st.key, { priority: p }))}
                {typeSelect(st.taskTypeId, (id) => patchSub(st.key, { taskTypeId: id }))}
              </div>
              {isOther(st.taskTypeId) && (
                <input value={st.otherTaskType} onChange={(e) => patchSub(st.key, { otherTaskType: e.target.value })} maxLength={100} placeholder="Other Task Type *" className={INPUT} />
              )}
            </div>
          ))}
          <button type="button" onClick={addSub} className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-medium text-[color:var(--ac-main,#0052CC)] hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add sub task
          </button>
          <Err text={errors.subTasks} />
        </div>
      )}
    </JiraModal>
  );
};
