import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  CollisionDetection,
  defaultDropAnimationSideEffects,
  DropAnimation,
  Over,
} from '@dnd-kit/core';
import { TaskBoardCardDto, TaskBoardResultDto } from '@vernoxy-pulse/api-client';
import type { TaskStage } from '../types';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { StageDecisionDialog } from './StageDecisionDialog';

export interface TaskBoardProps {
  board: TaskBoardResultDto;
  isAdmin: boolean;
  onCardClick: (taskId: number) => void;
  onMoveStage: (taskId: number, targetStage: TaskStage, note?: string) => void;
}

const STAGE_CONFIGS: { stage: TaskStage; title: string; color: string }[] = [
  { stage: 'assigned', title: 'Assigned', color: 'bg-slate-400' },
  { stage: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { stage: 'requested', title: 'In Review', color: 'bg-amber-500' },
  { stage: 'completed', title: 'Completed', color: 'bg-emerald-500' },
];

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
  duration: 220,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

export const TaskBoard: React.FC<TaskBoardProps> = ({
  board,
  isAdmin,
  onCardClick,
  onMoveStage,
}) => {
  // Optimistic local state for instantaneous, zero-latency drag-and-drop feedback
  const [localBoard, setLocalBoard] = useState<TaskBoardResultDto>(board);
  const [activeTask, setActiveTask] = useState<TaskBoardCardDto | null>(null);
  const [rejectDialogTask, setRejectDialogTask] = useState<number | null>(null);

  useEffect(() => {
    setLocalBoard(board);
  }, [board]);

  // Pointer sensor with 8px threshold: prevents clicks on cards from triggering an accidental drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const findTaskById = (taskId: number): TaskBoardCardDto | undefined => {
    const stages: TaskStage[] = ['assigned', 'in_progress', 'requested', 'completed'];
    for (const stage of stages) {
      const found = localBoard.columns[stage]?.find((t: TaskBoardCardDto) => t.task_id === taskId);
      if (found) return found;
    }
    return undefined;
  };

  /**
   * Resolves the target stage whether dropped onto a column droppable or directly onto another card
   */
  const getStageFromDroppable = (over: Over | null): TaskStage | null => {
    if (!over) return null;
    const stages: TaskStage[] = ['assigned', 'in_progress', 'requested', 'completed'];
    const overIdStr = over.id.toString();

    // 1. Direct column drop
    if (stages.includes(overIdStr as TaskStage)) {
      return overIdStr as TaskStage;
    }

    // 2. Column data payload
    const dataStage = over.data.current?.stage;
    if (dataStage && stages.includes(dataStage as TaskStage)) {
      return dataStage as TaskStage;
    }

    // 3. Card drop: resolve from card's stage
    const taskData = over.data.current?.task;
    if (taskData?.stage && stages.includes(taskData.stage as TaskStage)) {
      return taskData.stage as TaskStage;
    }

    // 4. Fallback search by over task ID in columns
    const overTaskId = parseInt(overIdStr, 10);
    if (!isNaN(overTaskId)) {
      for (const stage of stages) {
        if (localBoard.columns[stage]?.some((t) => t.task_id === overTaskId)) {
          return stage;
        }
      }
    }

    return null;
  };

  /**
   * Custom collision detection: checks pointer position first, falling back to closest corners
   */
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseInt(event.active.id.toString(), 10);
    const task = findTaskById(taskId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = parseInt(active.id.toString(), 10);
    const targetStage = getStageFromDroppable(over);
    if (!targetStage) return;

    const task = findTaskById(taskId);
    if (!task || task.stage === targetStage) return;

    // If moving from requested to in_progress (rejection / revision), prompt for note
    if (task.stage === 'requested' && targetStage === 'in_progress' && isAdmin) {
      setRejectDialogTask(taskId);
      return;
    }

    // Optimistically update local board immediately for buttery-smooth visual response
    setLocalBoard((prev) => {
      const currentStage = task.stage as TaskStage;
      const sourceList = (prev.columns[currentStage] || []).filter((t) => t.task_id !== taskId);
      const updatedTask = { ...task, stage: targetStage };
      const targetList = [updatedTask, ...(prev.columns[targetStage] || [])];

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [currentStage]: sourceList,
          [targetStage]: targetList,
        },
        counts: {
          ...prev.counts,
          [currentStage]: Math.max(0, (prev.counts[currentStage] ?? 1) - 1),
          [targetStage]: (prev.counts[targetStage] ?? 0) + 1,
        },
      };
    });

    onMoveStage(taskId, targetStage);
  };

  const handleApprove = (taskId: number) => {
    onMoveStage(taskId, 'completed');
  };

  const handleRejectPrompt = (taskId: number) => {
    setRejectDialogTask(taskId);
  };

  const handleStart = (taskId: number) => {
    onMoveStage(taskId, 'in_progress');
  };

  const handleRequestReview = (taskId: number) => {
    onMoveStage(taskId, 'requested');
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGE_CONFIGS.map((col) => (
            <TaskColumn
              key={col.stage}
              stage={col.stage}
              title={col.title}
              count={localBoard.counts[col.stage] ?? 0}
              tasks={localBoard.columns[col.stage] ?? []}
              colorClass={col.color}
              isAdmin={isAdmin}
              onCardClick={onCardClick}
              onApprove={handleApprove}
              onReject={handleRejectPrompt}
              onStart={handleStart}
              onRequestReview={handleRequestReview}
              isDraggingAny={activeTask !== null}
            />
          ))}
        </div>

        {/* Silky-smooth elevated floating overlay while dragging */}
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              isAdmin={isAdmin}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <StageDecisionDialog
        isOpen={rejectDialogTask !== null}
        title="Request Changes & Return to Progress"
        description="Provide feedback to the assignees explaining what needs improvement before this task can be approved."
        confirmLabel="Return to Progress"
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
        requiresNote={true}
        onConfirm={(note) => {
          if (rejectDialogTask !== null) {
            onMoveStage(rejectDialogTask, 'in_progress', note);
            setRejectDialogTask(null);
          }
        }}
        onClose={() => setRejectDialogTask(null)}
      />
    </>
  );
};
