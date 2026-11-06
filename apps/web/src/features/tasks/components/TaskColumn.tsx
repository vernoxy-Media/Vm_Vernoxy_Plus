import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check } from 'lucide-react';
import { TaskBoardCardDto } from '@vernoxy-pulse/api-client';
import type { TaskStage } from '../types';
import { TaskCard } from './TaskCard';

export interface TaskColumnProps {
  stage: TaskStage;
  title: string;
  count: number;
  tasks: TaskBoardCardDto[];
  /** Kept for callers; a Jira column has no coloured dot. */
  colorClass?: string;
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

/** One column of the board: a grey lane with an uppercase heading and its count, like Jira. */
export const TaskColumn: React.FC<TaskColumnProps> = ({
  stage,
  title,
  count,
  tasks,
  isAdmin,
  onCardClick,
  onApprove,
  onReject,
  onStart,
  onRequestReview,
  onHold,
  onResume,
}) => {
  const isCompletedColumn = stage === 'completed';
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: 'Column', stage },
    // Only an admin approves, so only an admin can drop into Done
    disabled: !isAdmin && isCompletedColumn,
  });

  const taskIds = tasks.map((t) => t.task_id.toString());

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={`flex min-h-[320px] w-[78vw] shrink-0 snap-start flex-col rounded-[3px] p-1.5 transition-colors sm:w-[272px] xl:w-auto ${isOver ? 'bg-[color:var(--ac-50,#DEEBFF)]' : 'bg-[#F4F5F7]'}`}
    >
      <header className="flex items-center gap-1.5 px-1.5 pb-2 pt-1.5">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.02em] text-[#5E6C84]">
          {title}
          <span className="ml-1.5 font-medium">{count}</span>
        </h2>
        {isCompletedColumn && <Check className="h-3.5 w-3.5 text-[#36B37E]" strokeWidth={3} />}
      </header>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-1.5">
          {tasks.length === 0 ? (
            <p className={`rounded-[3px] border border-dashed py-6 text-center text-[12px] font-medium transition-colors ${isOver ? 'border-[color:var(--ac-400,#4C9AFF)] text-[color:var(--ac-main,#0052CC)]' : 'border-[#C1C7D0] text-[#7A869A]'}`}>
              {isOver ? 'Drop here' : 'No tasks'}
            </p>
          ) : (
            tasks.map((task) => (
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
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
};
