import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, GitBranch, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  CreateTaskDto,
  TaskDetailDto,
  customFetch,
} from '@vernoxy-pulse/api-client';
import type { TaskPriority } from '../types';
import { DurationField, formatMinutesToHuman } from './DurationField';
import {
  MultiEmployeeSelect,
  AssignableEmployee,
} from '@/shared/ui/MultiEmployeeSelect';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto) => Promise<void>;
  employees: AssignableEmployee[];
  taskTypeOptions: { id: number; label: string }[];
  initialData?: TaskDetailDto | null;
  title: string;
}

interface SubTaskDraft {
  id: string;
  title: string;
  allocatedMinutes: number;
  assigneeId?: number;
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [otherTaskType, setOtherTaskType] = useState('');
  const [dueDate, setDueDate] = useState(getTodayDateString);
  const [allocatedMinutes, setAllocatedMinutes] = useState<number | null>(120);
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);

  // Sub tasks configuration
  const [hasSubTasks, setHasSubTasks] = useState(false);
  const [leadEmployeeId, setLeadEmployeeId] = useState<number | undefined>(undefined);
  const [subTasks, setSubTasks] = useState<SubTaskDraft[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTaskTitle(initialData.title);
      setDescription(initialData.description || '');
      setPriority(initialData.priority);
      setTaskTypeId(initialData.task_type_id || undefined);
      setOtherTaskType(initialData.other_task_type || '');
      setDueDate(initialData.due_date ? initialData.due_date.split('T')[0] : getTodayDateString());
      setAllocatedMinutes(initialData.allocated_minutes || null);
      setAssigneeIds(initialData.assignees.map((a) => a.employee_id));
      setHasSubTasks(Boolean(initialData.has_sub_tasks));
      setLeadEmployeeId(initialData.lead_employee_id || undefined);
      setSubTasks([]);
    } else {
      setTaskTitle('');
      setDescription('');
      setPriority('medium');
      setTaskTypeId(taskTypeOptions[0]?.id);
      setOtherTaskType('');
      setDueDate(getTodayDateString());
      setAllocatedMinutes(120);
      setAssigneeIds([]);
      setHasSubTasks(false);
      setLeadEmployeeId(undefined);
      setSubTasks([
        { id: '1', title: 'Phase 1 Implementation', allocatedMinutes: 60, assigneeId: undefined },
        { id: '2', title: 'Phase 2 Testing & Review', allocatedMinutes: 60, assigneeId: undefined },
      ]);
    }
    setError(null);
  }, [initialData, isOpen, taskTypeOptions]);

  // Internal fallback fetch to ensure employees list is never empty
  const [internalEmployees, setInternalEmployees] = useState<AssignableEmployee[]>(employees || []);

  useEffect(() => {
    if (employees && employees.length > 0) {
      setInternalEmployees(employees);
    } else {
      customFetch<any>('/api/v1/admin/tasks/assignable-employees')
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.data || [];
          if (list.length > 0) {
            setInternalEmployees(list);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch assignable employees', err);
        });
    }
  }, [employees, isOpen]);

  const allEmployees = internalEmployees.length > 0 ? internalEmployees : employees;
  const assignedEmployees = allEmployees.filter((emp) => assigneeIds.includes(emp.emp_id));

  if (!isOpen) return null;

  const selectedType = taskTypeOptions.find((t) => t.id === taskTypeId);
  const isOtherType = Boolean(
    selectedType && selectedType.label.trim().toLowerCase().startsWith('other'),
  );

  // Subtasks time calculation
  const totalSubtasksTime = subTasks.reduce((sum, st) => sum + (st.allocatedMinutes || 0), 0);
  const mainTaskTime = allocatedMinutes || 0;
  const isSubtasksTimeMatching = totalSubtasksTime === mainTaskTime;

  const handleAddSubTask = () => {
    const remainingTime = Math.max(0, mainTaskTime - totalSubtasksTime);
    setSubTasks((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        title: '',
        allocatedMinutes: remainingTime > 0 ? remainingTime : 30,
        assigneeId: leadEmployeeId || assignedEmployees[0]?.emp_id,
      },
    ]);
  };

  const handleRemoveSubTask = (id: string) => {
    setSubTasks((prev) => prev.filter((st) => st.id !== id));
  };

  const handleUpdateSubTask = (id: string, updates: Partial<SubTaskDraft>) => {
    setSubTasks((prev) => prev.map((st) => (st.id === id ? { ...st, ...updates } : st)));
  };

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
    if (isOtherType && !otherTaskType.trim()) {
      setError('Please specify the custom task type for "Others".');
      return;
    }

    if (hasSubTasks) {
      if (!leadEmployeeId) {
        setError('Please select a Lead Employee for tasks with sub-tasks');
        return;
      }
      if (!assigneeIds.includes(leadEmployeeId)) {
        setError('Lead employee must be one of the selected task assignees');
        return;
      }
      if (subTasks.length === 0) {
        setError('Please add at least one sub-task or uncheck "Has Sub Tasks"');
        return;
      }
      for (const st of subTasks) {
        if (!st.title.trim()) {
          setError('All sub-tasks must have a title');
          return;
        }
        if (!st.assigneeId) {
          setError(`Please assign employee to sub-task "${st.title || 'Untitled'}"`);
          return;
        }
      }
      if (!isSubtasksTimeMatching) {
        setError(
          `Sub-tasks allocated time sum (${formatMinutesToHuman(totalSubtasksTime)}) must equal main task duration (${formatMinutesToHuman(mainTaskTime)})`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateTaskDto = {
        title: taskTitle.trim(),
        description: description.trim() || undefined,
        priority,
        source: initialData?.source || 'personal',
        task_type_id: taskTypeId,
        other_task_type: isOtherType ? otherTaskType.trim() : undefined,
        due_date: dueDate || undefined,
        allocated_minutes: allocatedMinutes || undefined,
        assignee_ids: assigneeIds,
        has_sub_tasks: hasSubTasks,
        lead_employee_id: hasSubTasks ? leadEmployeeId : undefined,
        sub_tasks: hasSubTasks
          ? subTasks.map((st) => ({
              title: st.title.trim(),
              allocated_minutes: st.allocatedMinutes,
              assignee_ids: st.assigneeId ? [st.assigneeId] : [],
            }))
          : undefined,
      };

      await onSubmit(payload);
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
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
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
                className="w-full rounded-xl border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                {taskTypeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional "Others" Task Type Box */}
          {isOtherType && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Specify Other Task Type <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Database Migration, Security Audit, etc."
                value={otherTaskType}
                onChange={(e) => setOtherTaskType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
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
                className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <DurationField value={allocatedMinutes} onChange={setAllocatedMinutes} />
          </div>

          {/* Assignees select - multi-employee selection */}
          <MultiEmployeeSelect
            employees={allEmployees}
            selectedIds={assigneeIds}
            label="Assigned To"
            onChange={(ids) => {
              setAssigneeIds(ids);
              if (leadEmployeeId && !ids.includes(leadEmployeeId)) {
                setLeadEmployeeId(undefined);
              }
              // Clear sub-task assignees that are no longer in assigned employees
              setSubTasks((prev) =>
                prev.map((st) => (st.assigneeId && !ids.includes(st.assigneeId) ? { ...st, assigneeId: undefined } : st)),
              );
            }}
          />

          {/* Has Sub Tasks Flag & Lead Section (BFD Section 2.3 & 2.4) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSubTasks}
                  onChange={(e) => setHasSubTasks(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  Has Sub Tasks
                </span>
              </label>

              {hasSubTasks && (
                <span className="text-xs text-slate-500">
                  Lead assignment + allocated time sum enforcement
                </span>
              )}
            </div>

            {hasSubTasks && (
              <div className="space-y-4 pt-2 border-t border-slate-200/80">
                {/* Lead Employee Dropdown (only from assigned employees per BFD Section 2.3) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Lead Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leadEmployeeId ? String(leadEmployeeId) : ''}
                    onChange={(e) => {
                      const newLeadId = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      setLeadEmployeeId(newLeadId);
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">
                      {assignedEmployees.length === 0 ? 'Select assignees above first' : 'Select a Lead Employee...'}
                    </option>
                    {assignedEmployees.map((emp) => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} ({emp.email}){emp.role_name ? ` • ${emp.role_name}` : ''}
                      </option>
                    ))}
                  </select>
                  {assignedEmployees.length === 0 ? (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Please select assignees above first to choose a Lead.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lead is selected from the assigned employees of this task.
                    </p>
                  )}
                </div>

                {/* Sub tasks list */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Sub Tasks ({subTasks.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSubTask}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Sub Task
                    </button>
                  </div>

                  {/* Subtask rows */}
                  <div className="space-y-2">
                    {subTasks.map((st, idx) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5"
                      >
                        <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center">
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          required
                          placeholder="Sub task title..."
                          value={st.title}
                          onChange={(e) => handleUpdateSubTask(st.id, { title: e.target.value })}
                          className="flex-1 rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />

                        {/* Assignee for subtask - ONLY assigned employees visible per user and BFD Section 2.4 */}
                        <select
                          value={st.assigneeId ? String(st.assigneeId) : ''}
                          onChange={(e) => {
                            const newAssigneeId = e.target.value ? parseInt(e.target.value, 10) : undefined;
                            handleUpdateSubTask(st.id, { assigneeId: newAssigneeId });
                          }}
                          className="w-40 rounded-lg border border-slate-200 p-1.5 text-xs bg-white focus:outline-none"
                        >
                          <option value="">
                            {assignedEmployees.length === 0 ? 'Select assignees first' : 'Assignee...'}
                          </option>
                          {assignedEmployees.map((emp) => (
                            <option key={emp.emp_id} value={emp.emp_id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>

                        {/* Allocated minutes */}
                        <div className="w-24">
                          <input
                            type="number"
                            min={1}
                            max={14400}
                            placeholder="Mins"
                            value={st.allocatedMinutes || ''}
                            onChange={(e) =>
                              handleUpdateSubTask(st.id, {
                                allocatedMinutes: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-center focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubTask(st.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Subtask time sum status (BFD Section 3.1 & 3.4 rule) */}
                  <div
                    className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold border ${
                      isSubtasksTimeMatching
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isSubtasksTimeMatching ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>
                        Sub-tasks sum: {formatMinutesToHuman(totalSubtasksTime)} / Main task:{' '}
                        {formatMinutesToHuman(mainTaskTime)}
                      </span>
                    </div>
                    <span>{isSubtasksTimeMatching ? 'Time Matches' : 'Must Equal Main Task'}</span>
                  </div>
                </div>
              </div>
            )}
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
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
