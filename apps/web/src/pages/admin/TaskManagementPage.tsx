import React, { useState } from 'react';
import { Plus, CheckSquare, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useTasksControllerGetBoard,
  useTasksControllerGetSummary,
  useTasksControllerGetAssignableEmployees,
  useTasksControllerCreateTask,
  useTasksControllerUpdateTask,
  useTasksControllerMoveStage,
  useTasksControllerGetTaskDetail,
  type CreateTaskDto,
} from '@vernoxy-pulse/api-client';
import type {
  TaskBoardQueryDto,
  TaskStage,
  TaskBoardResultDto,
  TaskSummaryDto,
  TaskDetailDto,
} from '../../features/tasks/types';
import type { AssignableEmployee } from '../../components/MultiEmployeeSelect';
import { useLookupsQuery } from '../../hooks/use-master-data';
import { SummaryCards } from '../../components/SummaryCards';
import { TaskFiltersBar } from '../../features/tasks/components/TaskFiltersBar';
import { TaskBoard } from '../../features/tasks/components/TaskBoard';
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer';
import { TaskFormModal } from '../../features/tasks/components/TaskFormModal';

export const TaskManagementPage: React.FC = () => {
  const [filters, setFilters] = useState<TaskBoardQueryDto>({});
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDetailDto | null>(null);

  const { data: rawBoard, refetch: refetchBoard, isLoading: isBoardLoading } = useTasksControllerGetBoard(filters);
  const board: TaskBoardResultDto | undefined =
    (rawBoard?.data as TaskBoardResultDto | undefined) ?? (rawBoard as unknown as TaskBoardResultDto | undefined);

  const { data: rawSummary, refetch: refetchSummary } = useTasksControllerGetSummary();
  const summary: TaskSummaryDto | undefined =
    (rawSummary?.data as TaskSummaryDto | undefined) ?? (rawSummary as unknown as TaskSummaryDto | undefined);

  const { data: rawEmployees } = useTasksControllerGetAssignableEmployees();
  const employees: AssignableEmployee[] =
    (rawEmployees?.data as AssignableEmployee[] | undefined) ??
    (Array.isArray(rawEmployees) ? (rawEmployees as unknown as AssignableEmployee[]) : []);

  const { data: taskTypeLookups = [] } = useLookupsQuery('task_type');

  const { data: rawDetail, refetch: refetchDetail } = useTasksControllerGetTaskDetail(
    selectedTaskId!,
    { query: { enabled: selectedTaskId !== null } },
  );
  const detailData: TaskDetailDto | null =
    (rawDetail?.data as TaskDetailDto | undefined) ?? (rawDetail as unknown as TaskDetailDto | undefined) ?? null;

  const createMutation = useTasksControllerCreateTask();
  const updateMutation = useTasksControllerUpdateTask();
  const moveMutation = useTasksControllerMoveStage();

  const handleRefresh = () => {
    refetchBoard();
    refetchSummary();
    if (selectedTaskId !== null) refetchDetail();
  };

  const handleMoveStage = async (taskId: number, targetStage: TaskStage, note?: string) => {
    try {
      await moveMutation.mutateAsync({
        id: taskId,
        data: { target_stage: targetStage, note },
      });
      handleRefresh();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Failed to move task stage');
    }
  };

  const handleFormSubmit = async (formData: CreateTaskDto) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask.task_id, data: formData });
    } else {
      await createMutation.mutateAsync({ data: formData });
    }
    handleRefresh();
  };

  const summaryItems = [
    {
      id: 'total',
      label: 'Total Tasks',
      count: summary?.total ?? 0,
      icon: CheckSquare,
      colorClass: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: summary?.in_progress ?? 0,
      icon: Clock,
      colorClass: 'bg-blue-50 text-blue-700',
    },
    {
      id: 'requested',
      label: 'In Review',
      count: summary?.requested ?? 0,
      icon: AlertCircle,
      colorClass: 'bg-amber-50 text-amber-700',
      badge: summary?.requested ? `${summary.requested} pending` : undefined,
    },
    {
      id: 'completed_today',
      label: 'Completed Today',
      count: summary?.completed_today ?? 0,
      icon: CheckCircle2,
      colorClass: 'bg-emerald-50 text-emerald-700',
      subtitle: `${summary?.completed_this_month ?? 0} this month`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Organize, assign, and track team tasks across workflow stages.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards items={summaryItems} />

      {/* Filter Bar */}
      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
        assigneeOptions={employees}
      />

      {/* Kanban Board */}
      {isBoardLoading || !board ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white border border-slate-200/80">
          <div className="text-sm font-medium text-slate-400">Loading tasks board...</div>
        </div>
      ) : (
        <TaskBoard
          board={board}
          isAdmin={true}
          onCardClick={(id) => setSelectedTaskId(id)}
          onMoveStage={handleMoveStage}
        />
      )}

      {/* Task Detail Drawer */}
      <TaskDrawer
        task={detailData || null}
        isOpen={selectedTaskId !== null}
        isAdmin={true}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => {
          setEditingTask(task);
          setIsFormOpen(true);
        }}
      />

      {/* Create / Edit Form Modal */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        employees={employees}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
        initialData={editingTask}
        title={editingTask ? `Edit Task: ${editingTask.task_code}` : 'Create New Task'}
      />
    </div>
  );
};
