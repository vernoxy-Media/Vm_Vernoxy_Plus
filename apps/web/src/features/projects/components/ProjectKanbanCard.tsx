import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  ExternalLink,
  GripVertical,
  Users,
  AlertCircle,
} from 'lucide-react';
import type { ProjectItem, ProjectStatus } from '../types';

export interface ProjectKanbanCardProps {
  project: ProjectItem;
  onSelectProject?: (project: ProjectItem) => void;
  isOverlay?: boolean;
}

const categoryLabels: Record<string, string> = {
  ecom_website: 'E-com',
  portfolio_website: 'Portfolio',
  seo: 'SEO',
  social_media: 'Social',
  crm: 'CRM',
  erp: 'ERP',
  brochure: 'Brochure',
  other: 'Custom',
};

const STAGE_ACCENT_COLORS: Record<ProjectStatus, { border: string; accent: string }> = {
  new: { border: 'border-slate-300', accent: 'border-l-slate-400' },
  planning: { border: 'border-purple-300', accent: 'border-l-purple-500' },
  in_progress: { border: 'border-blue-300', accent: 'border-l-blue-500' },
  review: { border: 'border-indigo-300', accent: 'border-l-indigo-500' },
  pending: { border: 'border-cyan-300', accent: 'border-l-cyan-500' },
  on_hold: { border: 'border-amber-300', accent: 'border-l-amber-500' },
  delivered: { border: 'border-emerald-300', accent: 'border-l-emerald-500' },
  cancelled: { border: 'border-rose-300', accent: 'border-l-rose-500' },
};

export const ProjectKanbanCard: React.FC<ProjectKanbanCardProps> = ({
  project,
  onSelectProject,
  isOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.project_id.toString(),
    data: {
      type: 'Project',
      project,
      status: project.project_status,
    },
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? undefined,
  };

  const accent = STAGE_ACCENT_COLORS[project.project_status] || STAGE_ACCENT_COLORS.new;
  const categoryTitle =
    categoryLabels[project.category] || project.other_category || 'General';

  // Format deadline date and check if overdue
  const isOverdue = React.useMemo(() => {
    if (!project.deadline || project.project_status === 'delivered' || project.project_status === 'cancelled') {
      return false;
    }
    const deadlineTime = new Date(project.deadline).getTime();
    return deadlineTime < Date.now();
  }, [project.deadline, project.project_status]);

  const formattedDeadline = React.useMemo(() => {
    if (!project.deadline) return null;
    try {
      const d = new Date(project.deadline);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return null;
    }
  }, [project.deadline]);

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40 p-4 min-h-[140px] opacity-40 transition-all duration-150"
      />
    );
  }

  return (
    <div
      data-draggable="true"
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={() => onSelectProject?.(project)}
      className={`group relative bg-white rounded-2xl p-4 border border-l-4 ${accent.border} ${accent.accent} transition-all select-none touch-none ${
        isOverlay
          ? 'shadow-2xl ring-4 ring-blue-500/25 rotate-2 scale-[1.03] cursor-grabbing z-50'
          : 'shadow-xs hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Top Row: Project Code + Category + Live Link */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wide shrink-0">
            {project.project_no}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[90px]">
            {categoryTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {project.deployment?.domain_link && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(project.deployment?.domain_link || '#', '_blank');
              }}
              title="Open Live Website"
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      {/* Project Title */}
      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-2.5 group-hover:text-blue-600 transition-colors leading-snug">
        {project.project_name}
      </h4>

      {/* Status Reason Note if on hold or cancelled */}
      {project.status_change_reason && (project.project_status === 'on_hold' || project.project_status === 'cancelled') && (
        <div className="mb-2.5 px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[10px] text-amber-800 line-clamp-2">
          <span className="font-semibold">Reason:</span> {project.status_change_reason}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1">
          <span>Progress</span>
          <span className="font-bold text-slate-700">
            {project.progress_percentage}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              project.progress_percentage === 100
                ? 'bg-emerald-500'
                : project.project_status === 'on_hold'
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, project.progress_percentage))}%`,
            }}
          />
        </div>
      </div>

      {/* Footer Info: PM & Deadline */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
        {/* Project Manager */}
        <div className="flex items-center gap-1.5 min-w-0" title={`Project Manager: ${project.project_manager_name}`}>
          {project.project_manager_avatar ? (
            <img
              src={project.project_manager_avatar}
              alt={project.project_manager_name}
              className="w-5 h-5 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0">
              {project.project_manager_name ? project.project_manager_name.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
          <span className="text-slate-700 font-semibold truncate max-w-[110px] text-[10px]">
            {project.project_manager_name}
          </span>
        </div>

        {/* Deadline Badge or Members count */}
        <div className="flex items-center gap-2 shrink-0">
          {formattedDeadline ? (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                isOverdue
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/70'
              }`}
              title={isOverdue ? 'Overdue deadline' : `Deadline: ${formattedDeadline}`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              )}
              <span>{formattedDeadline}</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{project.members.length}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
