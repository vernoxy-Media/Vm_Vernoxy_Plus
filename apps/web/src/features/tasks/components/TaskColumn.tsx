import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskBoardCardDto } from '@vernoxy-pulse/api-client';
import type { TaskStage } from '../types';
import { TaskCard } from './TaskCard';

export interface TaskColumnProps {
  stage: TaskStage;
  title: string;
  count: number;
  tasks: TaskBoardCardDto[];
  colorClass: string;
  isAdmin: boolean;
  onCardClick: (taskId: number) => void;
  onApprove?: (taskId: number) => void;
  onReject?: (taskId: number) => void;
  onStart?: (taskId: number) => void;
  onRequestReview?: (taskId: number) => void;
  onHold?: (taskId: number) => void;
  onResume?: (taskId: number) => void;
  isDraggingAny?: boolean;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  stage,
  title,
  count,
  tasks,
  colorClass,
  isAdmin,
  onCardClick,
  onApprove,
  onReject,
  onStart,
  onRequestReview,
  onHold,
  onResume,
  isDraggingAny = false,
}) => {
  const isCompletedColumn = stage === 'completed';
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: 'Column', stage },
    // If not admin, completed column is not a valid droppable target directly
    disabled: !isAdmin && isCompletedColumn,
  });

  const taskIds = tasks.map((t) => t.task_id.toString());

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl bg-slate-100/70 p-3 transition-all duration-200 min-h-[500px] ${
        isOver
          ? 'ring-2 ring-blue-500/60 bg-blue-50/50 shadow-md'
          : isDraggingAny
          ? 'ring-1 ring-slate-200/80 bg-slate-100/50'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
          {count}
        </span>
      </div>

      {/* Column Cards */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
          {tasks.length === 0 ? (
            <div
              className={`flex h-32 items-center justify-center rounded-xl border border-dashed transition-colors duration-150 text-xs ${
                isOver
                  ? 'border-blue-400 bg-blue-100/40 text-blue-600 font-semibold'
                  : 'border-slate-200 text-slate-400'
              }`}
            >
              {isOver ? 'Drop task here' : 'No tasks'}
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  isAdmin={isAdmin}
                  onCardClick={onCardClick}
                  onApprove={onApprove}
                  onReject={onReject}
                  onStart={onStart}
                  onRequestReview={onRequestReview}
                  onHold={onHold}
                  onResume={onResume}
                />
              ))}
              {isOver && (
                <div className="h-2 rounded-lg bg-blue-400/40 animate-pulse transition-all" />
              )}
            </>
          )}
        </div>
      </SortableContext>
    </div>
  );
};
