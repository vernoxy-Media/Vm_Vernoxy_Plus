import React, { useState } from 'react';
import { Bug, CheckSquare, LayoutGrid, Zap } from 'lucide-react';
import {
  useMyTasksControllerGetBoard,
  useMyTasksControllerGetSummary,
  useMyTasksControllerGetTaskDetail,
  useTasksControllerGetAssignableEmployees,
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
} from '../types';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { TaskFiltersBar } from '../components/TaskFiltersBar';
import { TaskBoard } from '../components/TaskBoard';
import { TaskListView } from '../components/TaskListView';
import { TaskIssuePanel } from '../components/TaskIssuePanel';
import { PRIMARY_BUTTON, TaskPageHeader, TaskStatStrip, UnderlineTabs, ViewSwitch } from '../components/TaskPageChrome';
import { QuickTaskModal } from '../components/QuickTaskModal';
import { MyBugsView } from '../components/MyBugsView';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/shared/socket/SocketContext';
import { TaskManagementPage } from './TaskManagementPage';

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

  const statItems = [
    { label: 'Total', value: summary?.total ?? 0, dot: 'bg-[#42526E]' },
    { label: 'To Do / In Progress', value: todoOrInProgress, dot: 'bg-[color:var(--ac-main,#0052CC)]' },
    { label: 'On Hold', value: onHoldCount, dot: 'bg-[#FF991F]' },
    { label: 'In Review', value: submittedCount, dot: 'bg-[#6554C0]' },
    { label: 'Done', value: approvedCount, dot: 'bg-[#36B37E]' },
  ];

  return (
    <div className="space-y-6">
      <TaskPageHeader crumbs={['Tasks']} title="My tasks">
        <ViewSwitch value={viewMode} onChange={setViewMode} />
        <button type="button" onClick={() => setIsQuickTaskOpen(true)} className={PRIMARY_BUTTON}>
          <Zap className="h-4 w-4" /> Create quick task
        </button>
      </TaskPageHeader>

      <TaskStatStrip items={statItems} />

      {/* Filter Bar */}
      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
        showSource
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

      {/* The task, as a Jira issue */}
      <TaskIssuePanel
        task={detailData || null}
        isOpen={selectedTaskId !== null}
        isAdmin={false}
        heading="My tasks"
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
  // Admin = role marked is_admin (same rule as the API).
  const isAdmin = Boolean(user?.access?.can_manage_organization);

  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rawEmployees } = useTasksControllerGetAssignableEmployees({ query: { enabled: isAdmin } });
  const people = (Array.isArray(rawEmployees) ? rawEmployees : Array.isArray((rawEmployees as any)?.data) ? (rawEmployees as any).data : []).map((e: any) => ({ id: e.emp_id as number, name: e.name as string, avatar: e.avatar_url as string | null }));
  const currentTab = searchParams.get('tab');
  const activeTab = currentTab === 'bugs' ? 'bugs' : isAdmin && currentTab === 'management' ? 'management' : 'my-tasks';

  const handleTabChange = (tab: 'my-tasks' | 'bugs' | 'management') => {
    if (tab === 'my-tasks') setSearchParams({});
    else setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <UnderlineTabs
        tabs={[
          { id: 'my-tasks', label: 'My tasks', icon: CheckSquare },
          { id: 'bugs', label: 'My bugs', icon: Bug },
          ...(isAdmin ? [{ id: 'management', label: 'Task management', icon: LayoutGrid }] : []),
        ]}
        value={activeTab}
        onChange={(id) => handleTabChange(id as 'my-tasks' | 'bugs' | 'management')}
      />

      {/* Tab Content */}
      {activeTab === 'management' && isAdmin ? (
        <TaskManagementPage />
      ) : activeTab === 'bugs' ? (
        <MyBugsView isAdmin={isAdmin} people={people} />
      ) : (
        <MyTasksView />
      )}
    </div>
  );
};

