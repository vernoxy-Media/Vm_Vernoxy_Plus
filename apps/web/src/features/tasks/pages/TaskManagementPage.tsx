import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useTasksControllerGetBoard,
  useTasksControllerGetSummary,
  useTasksControllerGetAssignableEmployees,
  useTasksControllerCreateTask,
  useTasksControllerUpdateTask,
  useTasksControllerMoveStage,
  useTasksControllerTrackWorkSession,
  useTasksControllerGetTaskDetail,
  customFetch,
  type CreateTaskDto,
} from '@vernoxy-pulse/api-client';
import type {
  TaskBoardQueryDto,
  TaskStage,
  TaskBoardResultDto,
  TaskSummaryDto,
  TaskDetailDto,
} from '../types';
import type { AssignableEmployee } from '@/shared/ui/MultiEmployeeSelect';
import { EmployeeFilter } from '@/features/projects/components/EmployeeFilter';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { TaskFiltersBar } from '../components/TaskFiltersBar';
import { TaskBoard } from '../components/TaskBoard';
import { TaskListView } from '../components/TaskListView';
import { TaskIssuePanel } from '../components/TaskIssuePanel';
import { PRIMARY_BUTTON, TaskPageHeader, TaskStatStrip, ViewSwitch } from '../components/TaskPageChrome';
import { TaskFormModal } from '../components/TaskFormModal';
import { useSocket } from '@/shared/socket/SocketContext';

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

  /** Change or clear the start or due date from the task's Details panel. */
  const handleChangeDate = async (taskId: number, field: 'start_date' | 'due_date', date: string | null) => {
    await customFetch(`/api/v1/admin/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: date }),
    });
    handleRefresh();
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

  const statItems = [
    { label: 'Total', value: summary?.total ?? 0, dot: 'bg-[#42526E]' },
    { label: 'To Do / In Progress', value: todoOrInProgress, dot: 'bg-[color:var(--ac-main,#0052CC)]' },
    { label: 'On Hold', value: onHoldCount, dot: 'bg-[#FF991F]' },
    { label: 'In Review', value: submittedCount, dot: 'bg-[#6554C0]' },
    { label: 'Done', value: approvedCount, dot: 'bg-[#36B37E]' },
  ];

  return (
    <div className="space-y-6">
      <TaskPageHeader crumbs={['Tasks', 'Task management']} title="Task management">
        <ViewSwitch value={viewMode} onChange={setViewMode} />
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsFormOpen(true);
          }}
          className={PRIMARY_BUTTON}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Create
        </button>
      </TaskPageHeader>

      <TaskStatStrip items={statItems} />

      {/* One employee's tasks, sub-tasks and work, or everyone's */}
      {employees.length > 0 && (
        <EmployeeFilter
          people={employees.map((e) => ({ id: e.emp_id, name: e.name, avatar: e.avatar_url }))}
          value={filters.assignee_id ? String(filters.assignee_id) : 'all'}
          onChange={(v) => setFilters({ ...filters, assignee_id: v === 'all' ? undefined : Number(v) })}
        />
      )}

      {/* Filter Bar */}
      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
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

      {/* The task, as a Jira issue */}
      <TaskIssuePanel
        task={detailData || null}
        isOpen={selectedTaskId !== null}
        isAdmin={true}
        heading="Task management"
        onClose={() => setSelectedTaskId(null)}
        onMoveStage={handleMoveStage}
        onTrackWorkSession={handleTrackWorkSession}
        onChangeDate={handleChangeDate}
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
