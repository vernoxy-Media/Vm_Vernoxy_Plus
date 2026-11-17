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

const DOT: Record<string, string> = {
  assigned: 'bg-[#97A0AF]',
  in_progress: 'bg-[color:var(--ac-main,#0052CC)]',
  in_qa: 'bg-[#FF8B00]',
  hold: 'bg-[#FF991F]',
  requested: 'bg-[#6554C0]',
  completed: 'bg-[#36B37E]',
};

/** One column of the board: a lane with a dot, an uppercase heading and its count, like Jira. */
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
      className={`flex max-h-[calc(100vh-17rem)] min-h-[320px] w-[78vw] shrink-0 snap-start flex-col rounded-xl border transition-colors sm:w-[272px] xl:min-w-[210px] xl:w-auto xl:flex-1 xl:basis-0 ${isOver ? 'border-[color:var(--ac-400,#4C9AFF)] bg-[color:var(--ac-50,#DEEBFF)]' : 'border-slate-200 bg-slate-50'}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-200/70 px-3 py-2.5">
        <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[stage] ?? DOT.assigned}`} />
        <h2 className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-wide text-slate-600">{title}</h2>
        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 text-[12px] font-semibold text-slate-600 shadow-[inset_0_0_0_1px_rgb(226,232,240)]">{count}</span>
        {isCompletedColumn && <Check className="h-3.5 w-3.5 text-[#36B37E]" strokeWidth={3} />}
      </header>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {tasks.length === 0 ? (
            <p className={`flex h-24 items-center justify-center rounded-lg border border-dashed px-3 text-center text-[12px] font-medium transition-colors ${isOver ? 'border-[color:var(--ac-400,#4C9AFF)] text-[color:var(--ac-main,#0052CC)]' : 'border-slate-300/80 text-slate-400'}`}>
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
