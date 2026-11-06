import React from 'react';
import { CalendarDays, ExternalLink } from 'lucide-react';
import type { ProjectItem, ProjectStatus } from '../types';

interface ProjectCardProps {
  project: ProjectItem;
  onClick: (project: ProjectItem) => void;
  onStatusChange?: (project: ProjectItem, newStatus: ProjectStatus) => void;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; bg: string; text: string; dot: string; bar: string; accent: string }
> = {
  new: {
    label: 'New',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    bar: 'from-slate-400 to-slate-500',
    accent: 'bg-slate-400',
  },
  planning: {
    label: 'Planning',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    bar: 'from-purple-500 to-indigo-500',
    accent: 'bg-purple-500',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    bar: 'from-blue-500 to-cyan-500',
    accent: 'bg-blue-500',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    bar: 'from-amber-400 to-yellow-500',
    accent: 'bg-amber-500',
  },
  review: {
    label: 'Review',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    bar: 'from-indigo-400 to-violet-500',
    accent: 'bg-indigo-500',
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    bar: 'from-emerald-400 to-teal-500',
    accent: 'bg-emerald-500',
  },
  on_hold: {
    label: 'On Hold',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    bar: 'from-orange-400 to-red-500',
    accent: 'bg-orange-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    bar: 'from-rose-400 to-red-600',
    accent: 'bg-rose-500',
  },
};

const categoryLabels: Record<string, string> = {
  ecom_website: 'E-com Website',
  portfolio_website: 'Portfolio Website',
  seo: 'SEO Project',
  social_media: 'Social Media',
  crm: 'CRM',
  erp: 'ERP',
  brochure: 'Brochure',
  other: 'Custom Project',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const status = statusConfig[project.project_status] || statusConfig.planning;
  const categoryTitle =
    categoryLabels[project.category] || project.other_category || 'General';

  const initials = (project.project_manager_name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = Boolean(
    project.deadline &&
      project.deadline.slice(0, 10) < today &&
      !['delivered', 'cancelled'].includes(project.project_status),
  );

  const dmy = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('-') : '—'); // DD-MM-YYYY

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={() => onClick(project)}
      className="group relative overflow-hidden bg-white rounded-2xl p-5 pt-6 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${status.accent}`} aria-hidden />
      <div>
        {/* Top Header: Title & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wide">
                {project.project_no}
              </span>
              <span className="text-xs font-medium text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium truncate">
                {categoryTitle}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
              {project.project_name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {project.deployment?.domain_link && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(project.deployment?.domain_link || '#', '_blank');
                }}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                title="Open Live Site"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>

        {/* Project Manager & Dates */}
        <div className="space-y-2 py-2 border-y border-slate-100/80 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <span className="text-slate-400">Project Manager</span>
            <span className="font-semibold text-slate-800 truncate">{project.project_manager_name}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>
              <strong className="text-slate-700">Type</strong>{' '}
              <span className="capitalize">{(project.project_type || '—').replace(/_/g, ' ')}</span>
            </span>
            <span>
              <strong className="text-slate-700">Created</strong> {dmy(project.created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-700">Start</strong> {formatDate(project.start_date)}
            </span>
            <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-semibold' : ''}`}>
              <strong className={isOverdue ? 'text-rose-700' : 'text-slate-700'}>End</strong> {formatDate(project.deadline)}
              {isOverdue && <span className="ml-1 rounded-full bg-rose-50 border border-rose-200 px-1.5 text-[10px]">Overdue</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="pt-4 mt-2">
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="text-slate-500">
            Progress ({project.completed_tasks_count}/{project.total_tasks_count || 0} tasks)
          </span>
          <span className={`font-bold ${status.text}`}>{project.progress_percentage}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${status.bar} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, project.progress_percentage))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
