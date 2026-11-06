import React from 'react';
import { CalendarDays, ExternalLink } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import type { ProjectItem, ProjectStatus } from '../types';

interface ProjectCardProps {
  project: ProjectItem;
  onClick: (project: ProjectItem) => void;
  onStatusChange?: (project: ProjectItem, newStatus: ProjectStatus) => void;
}

/** Status lozenges in Jira's style: small, bold, uppercase. */
const LOZENGE: Record<ProjectStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-[#DFE1E6] text-[#42526E]' },
  planning: { label: 'Planning', cls: 'bg-[#EAE6FF] text-[#403294]' },
  in_progress: { label: 'In Progress', cls: 'bg-[#DEEBFF] text-[#0747A6]' },
  pending: { label: 'Pending', cls: 'bg-[#FFF0B3] text-[#172B4D]' },
  review: { label: 'Review', cls: 'bg-[#EAE6FF] text-[#403294]' },
  delivered: { label: 'Delivered', cls: 'bg-[#E3FCEF] text-[#006644]' },
  on_hold: { label: 'On Hold', cls: 'bg-[#FFEBE6] text-[#BF2600]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#DFE1E6] text-[#5E6C84]' },
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

const TONES = ['bg-[color:var(--ac-main,#0052CC)]', 'bg-[#6554C0]', 'bg-[#00875A]', 'bg-[#FF8B00]', 'bg-[#DE350B]', 'bg-[#00A3BF]'];
const toneOf = (id: number) => TONES[Math.abs(id) % TONES.length];
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

const formatDate = (dateStr?: string | null, withYear = true) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const status = LOZENGE[project.project_status] ?? LOZENGE.new;
  const category = categoryLabels[project.category] || project.other_category || 'General';
  const pct = Math.min(100, Math.max(0, project.progress_percentage));
  const total = project.total_tasks_count || 0;
  const overdue = Boolean(
    project.deadline && project.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10) && !['delivered', 'cancelled'].includes(project.project_status),
  );
  const team = Array.from(new Map((project.members ?? []).map((m) => [m.employee_id, m])).values());

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(project)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(project); } }}
      className="group flex cursor-pointer flex-col justify-between gap-4 rounded-[3px] border border-[#DFE1E6] bg-white p-4 outline-none transition hover:border-[#B3BAC5] hover:shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] focus-visible:ring-2 focus-visible:ring-[color:var(--ac-400,#4C9AFF)]"
    >
      <div className="space-y-3.5">
        {/* Name, key and status */}
        <div className="flex items-start gap-3">
          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] text-[18px] font-bold text-white ${toneOf(project.project_id)}`}>
            {(project.project_name.trim()[0] || 'P').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-medium leading-6 text-[color:var(--ac-main,#0052CC)] group-hover:underline" title={project.project_name}>
              {project.project_name}
            </h3>
            <p className="truncate text-[12px] text-[#5E6C84]">
              {project.project_no} · {category}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {project.deployment?.domain_link && (
              <a
                href={project.deployment.domain_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open live site"
                aria-label="Open live site"
                className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <span className={`rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase tracking-[0.01em] ${status.cls}`}>{status.label}</span>
          </div>
        </div>

        {/* Lead and dates */}
        <dl className="space-y-2 text-[13px]">
          <div className="flex items-center gap-2">
            <dt className="w-10 shrink-0 text-[12px] text-[#5E6C84]">Lead</dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-[#172B4D]">
              <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${toneOf(project.project_manager_id ?? project.project_id)}`}>
                {initialsOf(project.project_manager_name || '?')}
              </span>
              <span className="truncate">{project.project_manager_name}</span>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="w-10 shrink-0 text-[12px] text-[#5E6C84]">Dates</dt>
            <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[#42526E]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-[#5E6C84]" />
                {formatDate(project.start_date, false)} – {formatDate(project.deadline)}
              </span>
              {overdue && <span className="rounded-[3px] bg-[#FFEBE6] px-1 py-px text-[11px] font-bold uppercase text-[#BF2600]">Overdue</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        {/* Progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-[#5E6C84]">
              {total === 0 ? 'No tasks yet' : `${project.completed_tasks_count} of ${total} tasks done`}
            </span>
            <span className="font-semibold text-[#172B4D]">{pct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#DFE1E6]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-[#36B37E]' : 'bg-[color:var(--ac-main,#0052CC)]'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Team */}
        <div className="flex items-center justify-between border-t border-[#DFE1E6] pt-3">
          {team.length > 0 ? (
            <div className="flex -space-x-1.5" title={team.map((m) => m.name).join(', ')}>
              {team.slice(0, 4).map((m) => (
                <JiraAvatar key={m.employee_id} name={m.name} id={m.employee_id} src={m.profile_picture} size={24} ring />
              ))}
              {team.length > 4 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DFE1E6] text-[10px] font-semibold text-[#42526E] ring-2 ring-white">+{team.length - 4}</span>}
            </div>
          ) : (
            <span className="text-[12px] text-[#5E6C84]">No team members</span>
          )}
          <span className="text-[12px] text-[#5E6C84]">{team.length} {team.length === 1 ? 'member' : 'members'}</span>
        </div>
      </div>
    </div>
  );
};
