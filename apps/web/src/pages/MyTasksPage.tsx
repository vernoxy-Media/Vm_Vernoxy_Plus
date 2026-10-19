import React, { useState } from 'react';
import { CheckSquare, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useMyTasksControllerGetBoard,
  useMyTasksControllerGetSummary,
  useMyTasksControllerGetTaskDetail,
  useMyTasksControllerMoveStage,
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
import { TaskDrawer } from '../features/tasks/components/TaskDrawer';

export const MyTasksPage: React.FC = () => {
  const [filters, setFilters] = useState<TaskBoardQueryDto>({});
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

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

  const summaryItems = [
    {
      id: 'total',
      label: 'My Total Tasks',
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
      label: 'Awaiting Review',
      count: summary?.requested ?? 0,
      icon: AlertCircle,
      colorClass: 'bg-amber-50 text-amber-700',
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tasks assigned to you. Drag tasks to update your work status.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards items={summaryItems} />

      {/* Filter Bar */}
      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        taskTypeOptions={taskTypeLookups.map((l) => ({ id: l.id, label: l.label }))}
      />

      {/* Kanban Board */}
      {isBoardLoading || !board ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white border border-slate-200/80">
          <div className="text-sm font-medium text-slate-400">Loading your tasks...</div>
        </div>
      ) : (
        <TaskBoard
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
      />
    </div>
  );
};
