import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  useTasksControllerGetBoard,
  useTasksControllerGetSummary,
  useTasksControllerGetAssignableEmployees,
  useTasksControllerCreateTask,
  useTasksControllerUpdateTask,
  useTasksControllerMoveStage,
  useTasksControllerTrackWorkSession,
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
import { TaskListView } from '../../features/tasks/components/TaskListView';
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer';
import { TaskFormModal } from '../../features/tasks/components/TaskFormModal';
import { useSocket } from '../../core/socket/SocketContext';

export const TaskManagementPage: React.FC = () => {
  const [filters, setFilters] = useState<TaskBoardQueryDto>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDetailDto | null>(null);
  const { socket } = useSocket();


  const { data: rawBoard, refetch: refetchBoard, isLoading: isBoardLoading } = useTasksControllerGetBoard(filters);
  const board: TaskBoardResultDto | undefined =
    (rawBoard?.data as TaskBoardResultDto | undefined) ?? (rawBoard as unknown as TaskBoardResultDto | undefined);

  const { data: rawSummary, refetch: refetchSummary } = useTasksControllerGetSummary();
  const summary: TaskSummaryDto | undefined =
    (rawSummary?.data as TaskSummaryDto | undefined) ?? (rawSummary as unknown as TaskSummaryDto | undefined);

  const { data: rawEmployees } = useTasksControllerGetAssignableEmployees();
  const employees: AssignableEmployee[] = Array.isArray(rawEmployees)
    ? (rawEmployees as unknown as AssignableEmployee[])
    : Array.isArray((rawEmployees as any)?.data)
    ? ((rawEmployees as any).data as AssignableEmployee[])
    : [];

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
  const trackSessionMutation = useTasksControllerTrackWorkSession();

  const handleRefresh = () => {
    refetchBoard();
    refetchSummary();
    if (selectedTaskId !== null) refetchDetail();
  };

  React.useEffect(() => {
    if (!socket) return;
    const handleTaskEvent = () => {
      refetchBoard();
      refetchSummary();
      if (selectedTaskId !== null) refetchDetail();
    };

    socket.on('task:created', handleTaskEvent);
    socket.on('task:stage_changed', handleTaskEvent);
    socket.on('task:updated', handleTaskEvent);

    return () => {
      socket.off('task:created', handleTaskEvent);
      socket.off('task:stage_changed', handleTaskEvent);
      socket.off('task:updated', handleTaskEvent);
    };
  }, [socket, selectedTaskId, refetchBoard, refetchSummary, refetchDetail]);

  const handleMoveStage = async (taskId: number, targetStage: TaskStage, note?: string, holdReason?: string) => {
    try {
      await moveMutation.mutateAsync({
        id: taskId,
        data: {
          target_stage: targetStage,
          note,
          hold_reason: holdReason,
        },
      });
      handleRefresh();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Failed to move task stage');
    }
  };

  const handleTrackWorkSession = async (
    taskId: number,
    action: 'start' | 'pause' | 'finish',
    note?: string,
  ) => {
    try {
      await trackSessionMutation.mutateAsync({
        id: taskId,
        data: {
          action,
          note,
        },
      });
      handleRefresh();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || `Failed to ${action} work session`);
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

  // 5 KPI Cards aligned with BFD Section 3.1
  const todoOrInProgress =
    summary?.todo_or_in_progress ?? ((summary?.assigned ?? 0) + (summary?.in_progress ?? 0));
  const onHoldCount = summary?.on_hold ?? 0;
  const submittedCount = summary?.submitted ?? (summary?.requested ?? 0);
  const approvedCount = summary?.approved ?? 0;

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
      label: 'To Do / In Progress',
      count: todoOrInProgress,
      icon: Clock,
      colorClass: 'bg-blue-50 text-blue-700',
    },
    {
      id: 'hold',
      label: 'On Hold',
      count: onHoldCount,
      icon: AlertTriangle,
      colorClass: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'submitted',
      label: 'Submitted',
      count: submittedCount,
      icon: Send,
      colorClass: 'bg-purple-50 text-purple-700',
      badge: submittedCount > 0 ? `${submittedCount} pending` : undefined,
    },
    {
      id: 'approved',
      label: 'Approved',
      count: approvedCount,
      icon: CheckCircle2,
      colorClass: 'bg-emerald-50 text-emerald-700',
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

        <div className="flex items-center gap-3">
          {/* Dual View Toggle (Kanban / List) */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* 5 Summary KPI Cards */}
      <SummaryCards items={summaryItems} />

      {/* Filter Bar */}
      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
        assigneeOptions={employees}
      />

      {/* Main View: Kanban or List */}
      {isBoardLoading || !board ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white border border-slate-200/80">
          <div className="text-sm font-medium text-slate-400">Loading tasks board...</div>
        </div>
      ) : viewMode === 'kanban' ? (
        <TaskBoard
          board={board}
          isAdmin={true}
          onCardClick={(id) => setSelectedTaskId(id)}
          onMoveStage={handleMoveStage}
        />
      ) : (
        <TaskListView
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
        onMoveStage={handleMoveStage}
        onTrackWorkSession={handleTrackWorkSession}
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
