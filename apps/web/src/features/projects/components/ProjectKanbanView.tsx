import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Over,
} from '@dnd-kit/core';
import {
  Sparkles,
  FolderKanban,
  Clock,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { ProjectItem, ProjectStatus } from '../types';
import { ProjectKanbanColumn } from './ProjectKanbanColumn';
import { ProjectKanbanCard } from './ProjectKanbanCard';
import { ProjectStatusReasonModal } from './ProjectStatusReasonModal';

export interface ProjectKanbanViewProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
  onStatusChange?: (projectId: number, newStatus: ProjectStatus, reason?: string) => Promise<any>;
  activeStatus?: string;
}

export interface ProjectStageConfig {
  status: ProjectStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

export const PROJECT_STAGES: ProjectStageConfig[] = [
  {
    status: 'new',
    title: 'New',
    icon: Sparkles,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    status: 'planning',
    title: 'Planning',
    icon: FolderKanban,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    status: 'pending',
    title: 'Pending',
    icon: Clock,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    icon: RotateCw,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    status: 'review',
    title: 'Review',
    icon: Search,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
  },
  {
    status: 'delivered',
    title: 'Delivered',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    status: 'on_hold',
    title: 'On Hold',
    icon: AlertCircle,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  {
    status: 'cancelled',
    title: 'Cancelled',
    icon: XCircle,
    iconBg: 'bg-slate-200',
    iconColor: 'text-slate-600',
  },
];

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  projects,
  onSelectProject,
  onStatusChange,
  activeStatus,
}) => {
  const [localProjects, setLocalProjects] = useState<ProjectItem[]>(projects);
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);

  // Scroll & Canvas Pan State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slidebarTrackRef = useRef<HTMLDivElement>(null);
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollLeft: 0,
    scrollWidth: 1,
    clientWidth: 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [isThumbDragging, setIsThumbDragging] = useState(false);

  // Refs for smooth canvas mouse pan
  const isCanvasMouseDownRef = useRef(false);
  const isCanvasDraggingRef = useRef(false);
  const canvasStartXRef = useRef(0);
  const canvasStartYRef = useRef(0);
  const canvasStartScrollLeftRef = useRef(0);

  // Refs for bottom slidebar thumb dragging
  const isThumbMouseDownRef = useRef(false);
  const thumbStartXRef = useRef(0);
  const thumbStartScrollLeftRef = useRef(0);

  // Mandatory Reason Modal state for on_hold or cancelled
  const [pendingReasonMove, setPendingReasonMove] = useState<{
    project: ProjectItem;
    targetStatus: ProjectStatus;
  } | null>(null);

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  // Keep scroll metrics updated
  const updateScrollMetrics = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setScrollMetrics({
        scrollLeft,
        scrollWidth: Math.max(1, scrollWidth),
        clientWidth: Math.max(1, clientWidth),
      });
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateScrollMetrics, { passive: true });
    updateScrollMetrics();
    window.addEventListener('resize', updateScrollMetrics);

    // ResizeObserver ensures accurate metrics as soon as columns render
    const ro = new ResizeObserver(() => {
      updateScrollMetrics();
    });
    ro.observe(container);
    Array.from(container.children).forEach((child) => ro.observe(child));

    return () => {
      container.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
      ro.disconnect();
    };
  }, [updateScrollMetrics, localProjects]);

  // Smoothly scroll to active stage column when user clicks stage pill
  useEffect(() => {
    if (!activeStatus || activeStatus === 'all') {
      scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(`kanban-col-${activeStatus}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeStatus]);

  // Calculate slidebar thumb size and position
  const { scrollLeft, scrollWidth, clientWidth } = scrollMetrics;
  const maxScroll = Math.max(1, scrollWidth - clientWidth);
  const rawThumbWidthPct = (clientWidth / scrollWidth) * 100;
  // Thumb width is between 12% and 80%
  const thumbWidthPct = Math.min(80, Math.max(12, rawThumbWidthPct));
  const availableTrackPct = 100 - thumbWidthPct;
  const scrollRatio = Math.min(1, Math.max(0, scrollLeft / maxScroll));
  const thumbLeftPct = scrollRatio * availableTrackPct;

  // ----------------------------------------------------
  // Mouse Click & Slide on Empty Space (Canvas Panning)
  // User can click on ANY empty space and drag mouse to slide
  // ----------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse click

    const target = e.target as HTMLElement;
    // Don't pan canvas if clicked on a draggable card or interactive element
    if (
      target.closest('[data-draggable="true"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea')
    ) {
      return;
    }

    // Crucial: prevent browser native text selection so mousemove is not interrupted
    e.preventDefault();

    isCanvasMouseDownRef.current = true;
    isCanvasDraggingRef.current = false;
    canvasStartXRef.current = e.clientX;
    canvasStartYRef.current = e.clientY;
    canvasStartScrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Handle canvas panning (strictly horizontal drag)
      if (isCanvasMouseDownRef.current && scrollContainerRef.current) {
        const dx = e.clientX - canvasStartXRef.current;
        const dy = e.clientY - canvasStartYRef.current;

        // Only pan if movement is predominantly horizontal, ignoring up/down movement
        if (Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (!isCanvasDraggingRef.current) {
            isCanvasDraggingRef.current = true;
            setIsPanning(true);
          }
          const maxScrollDist = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
          scrollContainerRef.current.scrollLeft = Math.max(0, Math.min(maxScrollDist, canvasStartScrollLeftRef.current - dx));
          updateScrollMetrics();
        }
      }

      // 2. Handle bottom slidebar thumb dragging
      if (isThumbMouseDownRef.current && scrollContainerRef.current && slidebarTrackRef.current) {
        const dx = e.clientX - thumbStartXRef.current;
        const trackWidth = slidebarTrackRef.current.clientWidth;
        const maxScrollDist = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
        const maxThumbTravelPx = trackWidth * (availableTrackPct / 100);

        if (maxThumbTravelPx > 0 && maxScrollDist > 0) {
          const scrollDelta = (dx / maxThumbTravelPx) * maxScrollDist;
          scrollContainerRef.current.scrollLeft = Math.max(0, Math.min(maxScrollDist, thumbStartScrollLeftRef.current + scrollDelta));
          updateScrollMetrics();
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isCanvasMouseDownRef.current) {
        isCanvasMouseDownRef.current = false;
        isCanvasDraggingRef.current = false;
        setIsPanning(false);
      }
      if (isThumbMouseDownRef.current) {
        isThumbMouseDownRef.current = false;
        setIsThumbDragging(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [availableTrackPct, updateScrollMetrics]);

  // ----------------------------------------------------
  // Bottom Slidebar Track Click & Thumb Drag
  // ----------------------------------------------------
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isThumbMouseDownRef.current = true;
    setIsThumbDragging(true);
    thumbStartXRef.current = e.clientX;
    thumbStartScrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
  };

  const handleTrackMouseDown = (e: React.MouseEvent) => {
    if (!slidebarTrackRef.current || !scrollContainerRef.current) return;
    const rect = slidebarTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, clickX / rect.width));
    const maxScrollDist = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
    if (maxScrollDist > 0) {
      scrollContainerRef.current.scrollLeft = ratio * maxScrollDist;
      updateScrollMetrics();
    }
  };

  // ----------------------------------------------------
  // DnD Kit Setup
  // ----------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires 8px movement before starting card drag
      },
    })
  );

  const findProjectById = (projectId: number): ProjectItem | undefined => {
    return localProjects.find((p) => p.project_id === projectId);
  };

  const getStatusFromDroppable = (over: Over | null): ProjectStatus | null => {
    if (!over) return null;
    const allStatuses = PROJECT_STAGES.map((s) => s.status);
    const overIdStr = over.id.toString();

    // 1. Dropped directly onto a column
    if (allStatuses.includes(overIdStr as ProjectStatus)) {
      return overIdStr as ProjectStatus;
    }

    // 2. Column data payload
    const dataStatus = over.data.current?.status;
    if (dataStatus && allStatuses.includes(dataStatus as ProjectStatus)) {
      return dataStatus as ProjectStatus;
    }

    // 3. Dropped onto another project card
    const targetProject = over.data.current?.project as ProjectItem | undefined;
    if (targetProject && allStatuses.includes(targetProject.project_status)) {
      return targetProject.project_status;
    }

    // 4. Fallback search by over project ID
    const overProjectId = parseInt(overIdStr, 10);
    if (!isNaN(overProjectId)) {
      const match = localProjects.find((p) => p.project_id === overProjectId);
      if (match) return match.project_status;
    }

    return null;
  };

  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = parseInt(event.active.id.toString(), 10);
    const proj = findProjectById(projectId);
    if (proj) {
      setActiveProject(proj);
    }
  };

  const handleDragCancel = () => {
    setActiveProject(null);
  };

  const executeStatusChange = async (
    project: ProjectItem,
    targetStatus: ProjectStatus,
    reason?: string
  ) => {
    const previousProjects = [...localProjects];
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.project_id === project.project_id
          ? {
              ...p,
              project_status: targetStatus,
              status_change_reason: reason || p.status_change_reason,
            }
          : p
      )
    );

    if (onStatusChange) {
      try {
        await onStatusChange(project.project_id, targetStatus, reason);
      } catch (err: any) {
        console.error('Failed to change project status:', err);
        setLocalProjects(previousProjects);
        alert(err?.message || 'Failed to update project status. Please try again.');
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = parseInt(active.id.toString(), 10);
    const project = findProjectById(projectId);
    if (!project) return;

    const targetStatus = getStatusFromDroppable(over);
    if (!targetStatus || targetStatus === project.project_status) {
      return;
    }

    // If target is On Hold or Cancelled, reason is mandatory
    if (targetStatus === 'on_hold' || targetStatus === 'cancelled') {
      setPendingReasonMove({ project, targetStatus });
      return;
    }

    executeStatusChange(project, targetStatus);
  };

  const handleConfirmReason = async (reason: string) => {
    if (!pendingReasonMove) return;
    const { project, targetStatus } = pendingReasonMove;
    setPendingReasonMove(null);
    await executeStatusChange(project, targetStatus, reason);
  };

  const handleCancelReason = () => {
    setPendingReasonMove(null);
  };

  return (
    <div className="space-y-3 w-full min-w-0 max-w-full">
      {/* Main Board Container with Empty Space Drag Panning */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={scrollContainerRef}
          onMouseDown={handleCanvasMouseDown}
          className={`flex gap-3 overflow-x-auto pb-1.5 pt-0.5 items-stretch h-[calc(100vh-335px)] min-h-[380px] w-full max-w-full select-none rounded-2xl scrollbar-none touch-pan-x ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          title="Click empty space and drag left/right to slide view"
        >
          {PROJECT_STAGES.map((stage) => {
            const stageProjects = localProjects.filter(
              (p) => p.project_status === stage.status
            );

            return (
              <ProjectKanbanColumn
                key={stage.status}
                status={stage.status}
                title={stage.title}
                icon={stage.icon}
                iconBg={stage.iconBg}
                iconColor={stage.iconColor}
                projects={stageProjects}
                onSelectProject={onSelectProject}
                isDraggingAny={activeProject !== null}
              />
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeProject ? (
            <div className="w-[270px]">
              <ProjectKanbanCard project={activeProject} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Sleek Horizontal Slidebar matching Images 2 & 3 */}
      <div className="pt-1.5 pb-1 px-0.5 w-full">
        <div
          ref={slidebarTrackRef}
          onMouseDown={handleTrackMouseDown}
          className="h-3 w-full bg-[#e8ecf4] hover:bg-[#dfe4ee] rounded-full relative cursor-pointer select-none transition-colors"
          title="Drag slidebar or click anywhere to slide across stages"
        >
          <div
            onMouseDown={handleThumbMouseDown}
            className={`absolute top-0 bottom-0 bg-[#b8c2d6] hover:bg-[#9fadcb] active:bg-[#8898bb] rounded-full transition-colors cursor-grab active:cursor-grabbing ${
              isThumbDragging ? 'cursor-grabbing bg-[#8898bb]' : ''
            }`}
            style={{
              width: `${thumbWidthPct}%`,
              left: `${thumbLeftPct}%`,
            }}
          />
        </div>
      </div>

      {/* Mandatory Reason Modal for on_hold and cancelled */}
      {pendingReasonMove && (
        <ProjectStatusReasonModal
          isOpen={Boolean(pendingReasonMove)}
          projectName={pendingReasonMove.project.project_name}
          targetStatus={pendingReasonMove.targetStatus}
          onConfirm={handleConfirmReason}
          onClose={handleCancelReason}
        />
      )}
    </div>
  );
};
