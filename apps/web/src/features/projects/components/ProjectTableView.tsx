import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Pagination } from '@/shared/ui/Pagination';
import type { ProjectItem, ProjectStatus } from '../types';

interface ProjectTableViewProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
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

const TILE_TONES = ['bg-[color:var(--ac-main,#0052CC)]', 'bg-[#6554C0]', 'bg-[#00875A]', 'bg-[#FF8B00]', 'bg-[#DE350B]', 'bg-[#00A3BF]'];
const tone = (id: number) => TILE_TONES[id % TILE_TONES.length];
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isOverdue = (p: ProjectItem) =>
  Boolean(p.deadline) && p.project_status !== 'delivered' && p.project_status !== 'cancelled' && new Date(p.deadline as string).getTime() < Date.now();

const Tile: React.FC<{ project: ProjectItem; size?: number }> = ({ project, size = 32 }) => (
  <span
    aria-hidden
    style={{ width: size, height: size }}
    className={`flex shrink-0 items-center justify-center rounded-[3px] text-[14px] font-bold text-white ${tone(project.project_id)}`}
  >
    {(project.project_name.trim()[0] || 'P').toUpperCase()}
  </span>
);

const Lozenge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const l = LOZENGE[status] ?? LOZENGE.new;
  return <span className={`inline-block rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase tracking-[0.01em] ${l.cls}`}>{l.label}</span>;
};

const Progress: React.FC<{ project: ProjectItem }> = ({ project }) => {
  const pct = Math.min(100, Math.max(0, project.progress_percentage));
  return (
    <div className="w-full min-w-[110px]">
      <div className="mb-1 flex items-center justify-between text-[12px] text-[#5E6C84]">
        <span className="font-medium text-[#172B4D]">{pct}%</span>
        <span>{project.completed_tasks_count}/{project.total_tasks_count}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[#DFE1E6]">
        <div className={`h-full rounded-full ${pct === 100 ? 'bg-[#36B37E]' : 'bg-[color:var(--ac-main,#0052CC)]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const ProjectTableView: React.FC<ProjectTableViewProps> = ({ projects, onSelectProject }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [projects, pageSize]);

  const pageCount = Math.max(1, Math.ceil(projects.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = projects.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (projects.length === 0) {
    return <div className="rounded-[3px] bg-[#F4F5F7] py-12 text-center text-[14px] text-[#5E6C84]">No projects found matching the criteria.</div>;
  }

  return (
    <div className="overflow-hidden rounded-[3px] border border-[#DFE1E6] bg-white">
      {/* Phones: one card per project */}
      <ul className="divide-y divide-[#DFE1E6] md:hidden">
        {rows.map((p) => (
          <li key={p.project_id}>
            <button type="button" onClick={() => onSelectProject(p)} className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition hover:bg-[#F4F5F7]">
              <Tile project={p} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[color:var(--ac-main,#0052CC)]">{p.project_name}</p>
                <p className="text-[12px] text-[#5E6C84]">{p.project_no} · <span className="capitalize">{p.project_type}</span></p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <Lozenge status={p.project_status} />
                  <span className={`text-[12px] ${isOverdue(p) ? 'font-semibold text-[#BF2600]' : 'text-[#5E6C84]'}`}>Due {formatDate(p.deadline)}</span>
                </div>
                <div className="mt-2"><Progress project={p} /></div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Tablets and desktops: Jira's project table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b-2 border-[#DFE1E6] text-[12px] font-semibold uppercase tracking-[0.02em] text-[#5E6C84]">
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Key</th>
              <th className="hidden px-3 py-2.5 lg:table-cell">Type</th>
              <th className="px-3 py-2.5">Lead</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 w-40">Progress</th>
              <th className="hidden px-3 py-2.5 xl:table-cell">Deadline</th>
              <th className="w-10 px-3 py-2.5"><span className="sr-only">Links</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.project_id} onClick={() => onSelectProject(p)} className="cursor-pointer border-b border-[#DFE1E6] transition-colors last:border-b-0 hover:bg-[#F4F5F7]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Tile project={p} />
                    <div className="min-w-0">
                      <p className="max-w-[280px] truncate font-medium text-[color:var(--ac-main,#0052CC)] hover:underline">{p.project_name}</p>
                      <p className="text-[12px] capitalize text-[#5E6C84]">{p.category.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#172B4D]">{p.project_no}</td>
                <td className="hidden whitespace-nowrap px-3 py-2.5 capitalize text-[#42526E] lg:table-cell">{p.project_type}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tone(p.project_manager_id ?? p.project_id)}`}>
                      {initials(p.project_manager_name || '?')}
                    </span>
                    <span className="max-w-[140px] truncate text-[#172B4D]">{p.project_manager_name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5"><Lozenge status={p.project_status} /></td>
                <td className="px-3 py-2.5"><Progress project={p} /></td>
                <td className={`hidden whitespace-nowrap px-3 py-2.5 xl:table-cell ${isOverdue(p) ? 'font-medium text-[#BF2600]' : 'text-[#42526E]'}`}>
                  {formatDate(p.deadline)}
                  {isOverdue(p) && <span className="ml-1.5 rounded-[3px] bg-[#FFEBE6] px-1 py-px text-[11px] font-bold uppercase">Overdue</span>}
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  {p.deployment?.domain_link && (
                    <a href={p.deployment.domain_link} target="_blank" rel="noopener noreferrer" title="Open live site" aria-label="Open live site" className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} pageSize={pageSize} total={projects.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
};
