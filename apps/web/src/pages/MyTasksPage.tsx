import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  LayoutGrid,
  List,
  Zap,
} from 'lucide-react';
import {
  useMyTasksControllerGetBoard,
  useMyTasksControllerGetSummary,
  useMyTasksControllerGetTaskDetail,
  useMyTasksControllerMoveStage,
  useMyTasksControllerTrackWorkSession,
  customFetch,
  type CreateTaskDto,
} from '@vernoxy-pulse/api-client';
import type {
  TaskBoardQueryDto,
  TaskStage,
  TaskBoardResultDto,
  TaskSummaryDto,
  TaskDetailDto,
} from '../features/tasks/types';
import { useLookupsQuery } from '../hooks/use-master-data';
import { SummaryCards } from '../components/SummaryCards';
import { TaskFiltersBar } from '../features/tasks/components/TaskFiltersBar';
import { TaskBoard } from '../features/tasks/components/TaskBoard';
import { TaskListView } from '../features/tasks/components/TaskListView';
import { TaskDrawer } from '../features/tasks/components/TaskDrawer';
import { QuickTaskModal } from '../features/tasks/components/QuickTaskModal';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../core/socket/SocketContext';
import { TaskManagementPage } from './admin/TaskManagementPage';

export const MyTasksView: React.FC = () => {
  const [filters, setFilters] = useState<TaskBoardQueryDto>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const { socket } = useSocket();


  const { data: rawBoard, refetch: refetchBoard, isLoading: isBoardLoading } = useMyTasksControllerGetBoard(filters);
  const board: TaskBoardResultDto | undefined =
    (rawBoard?.data as TaskBoardResultDto | undefined) ?? (rawBoard as unknown as TaskBoardResultDto | undefined);

  const { data: rawSummary, refetch: refetchSummary } = useMyTasksControllerGetSummary();
  const summary: TaskSummaryDto | undefined =
    (rawSummary?.data as TaskSummaryDto | undefined) ?? (rawSummary as unknown as TaskSummaryDto | undefined);

  const { data: taskTypeLookups = [] } = useLookupsQuery('task_type');

  const { data: rawDetail, refetch: refetchDetail } = useMyTasksControllerGetTaskDetail(
    selectedTaskId!,
    { query: { enabled: selectedTaskId !== null } },
  );
  const detailData: TaskDetailDto | null =
    (rawDetail?.data as TaskDetailDto | undefined) ?? (rawDetail as unknown as TaskDetailDto | undefined) ?? null;

  const moveMutation = useMyTasksControllerMoveStage();
  const trackSessionMutation = useMyTasksControllerTrackWorkSession();

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
    socket.on('task:assigned', handleTaskEvent);

    return () => {
      socket.off('task:created', handleTaskEvent);
      socket.off('task:stage_changed', handleTaskEvent);
      socket.off('task:updated', handleTaskEvent);
      socket.off('task:assigned', handleTaskEvent);
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

  const handleCreateQuickTask = async (data: CreateTaskDto) => {
    try {
      await customFetch('/api/v1/my-tasks/quick-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      handleRefresh();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      throw new Error(e.detail || e.message || 'Failed to create quick task');
    }
  };

  // 5 KPI Cards aligned with BFD Section 2.1
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
      {/* Top Header with Quick Task & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Tasks</h1>
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

          {/* Add Quick Task Button (BFD Section 2.3 & 3.5) */}
          <button
            type="button"
            onClick={() => setIsQuickTaskOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Add Quick Task
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
      />

      {/* Main View: Kanban or List */}
      {isBoardLoading || !board ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white border border-slate-200/80">
          <div className="text-sm font-medium text-slate-400">Loading your tasks...</div>
        </div>
      ) : viewMode === 'kanban' ? (
        <TaskBoard
          board={board}
          isAdmin={false}
          onCardClick={(id) => setSelectedTaskId(id)}
          onMoveStage={handleMoveStage}
        />
      ) : (
        <TaskListView
          board={board}
          isAdmin={false}
          onCardClick={(id) => setSelectedTaskId(id)}
          onMoveStage={handleMoveStage}
        />
      )}

      {/* Task Detail Drawer */}
      <TaskDrawer
        task={detailData || null}
        isOpen={selectedTaskId !== null}
        isAdmin={false}
        onClose={() => setSelectedTaskId(null)}
        onMoveStage={handleMoveStage}
        onTrackWorkSession={handleTrackWorkSession}
      />

      {/* Quick Task Modal */}
      <QuickTaskModal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        onSubmit={handleCreateQuickTask}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
      />
    </div>
  );
};

export const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.access?.can_manage_organization ||
    user?.role?.role_name?.toLowerCase().includes('admin') ||
    user?.role?.role_name?.toLowerCase().includes('manager')
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const activeTab = isAdmin && currentTab === 'management' ? 'management' : 'my-tasks';

  const handleTabChange = (tab: 'my-tasks' | 'management') => {
    if (tab === 'management') {
      setSearchParams({ tab: 'management' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      {/* 2 Navigation Tabs: My Tasks & Task Management (Task Management is only visible to Admin) */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            id="tab-my-tasks"
            onClick={() => handleTabChange('my-tasks')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'my-tasks'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-blue-500" />
            <span>My Tasks</span>
          </button>

          <button
            type="button"
            id="tab-task-management"
            onClick={() => handleTabChange('management')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'management'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-purple-500" />
            <span>Task Management</span>
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'management' && isAdmin ? (
        <TaskManagementPage />
      ) : (
        <MyTasksView />
      )}
    </div>
  );
};

