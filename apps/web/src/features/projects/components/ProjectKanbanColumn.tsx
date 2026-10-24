import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ProjectItem, ProjectStatus } from '../types';
import { ProjectKanbanCard } from './ProjectKanbanCard';

export interface ProjectKanbanColumnProps {
  status: ProjectStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
  isDraggingAny?: boolean;
}

export const ProjectKanbanColumn: React.FC<ProjectKanbanColumnProps> = ({
  status,
  title,
  icon: Icon,
  iconBg,
  iconColor,
  projects,
  onSelectProject,
  isDraggingAny = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'Column', status },
  });

  const projectIds = projects.map((p) => p.project_id.toString());

  return (
    <div
      id={`kanban-col-${status}`}
      ref={setNodeRef}
      className={`w-[270px] min-w-[270px] shrink-0 flex flex-col rounded-2xl p-3 border transition-all duration-150 h-full select-none ${
        isOver
          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
          : isDraggingAny
          ? 'bg-[#f4f6fa]/90 border-slate-200/90'
          : 'bg-[#f4f6fa] border-slate-200/80'
      }`}
    >
      {/* Column Header matching Image 3 (Fixed at top of column) */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
          <span className="font-bold text-xs text-slate-800 tracking-tight">{title}</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-full bg-slate-200/60">
          {projects.length}
        </span>
      </div>

      {/* Cards Scrollable Container - scrolls cards vertically inside column if there are many */}
      <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1 select-none [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
          {/* Empty State / Drop Area matching Image 3 */}
          {projects.length === 0 ? (
            <div
              className={`h-16 rounded-xl border border-dashed flex items-center justify-center text-xs font-medium transition-colors select-none ${
                isOver
                  ? 'border-blue-400 bg-blue-100/40 text-blue-600 font-semibold shadow-2xs'
                  : 'border-slate-300/80 bg-white/40 text-slate-400'
              }`}
            >
              Drop here
            </div>
          ) : (
            <>
              {isOver && (
                <div className="h-14 rounded-xl border-2 border-dashed border-blue-400 bg-blue-100/30 text-blue-600 flex items-center justify-center text-xs font-semibold">
                  Drop here
                </div>
              )}
              {projects.map((project) => (
                <ProjectKanbanCard
                  key={project.project_id}
                  project={project}
                  onSelectProject={onSelectProject}
                />
              ))}
            </>
          )}
        </div>
      </SortableContext>
    </div>
  );
};
