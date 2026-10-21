import React from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import type { ProjectItem, ProjectStatus } from '../types';

interface ProjectTableViewProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
}

const statusConfig: Record<ProjectStatus, { label: string; bg: string; text: string }> = {
  new: { label: 'New', bg: 'bg-slate-100', text: 'text-slate-700' },
  planning: { label: 'Planning', bg: 'bg-purple-100', text: 'text-purple-700' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-700' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  review: { label: 'Review', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  on_hold: { label: 'On Hold', bg: 'bg-orange-100', text: 'text-orange-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-100', text: 'text-rose-700' },
};

export const ProjectTableView: React.FC<ProjectTableViewProps> = ({
  projects,
  onSelectProject,
}) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Project ID</th>
              <th className="py-3 px-4">Project Details</th>
              <th className="py-3 px-4">Project Manager</th>
              <th className="py-3 px-4">Team</th>
              <th className="py-3 px-4">Timeline</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 w-40">Progress</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No projects found matching the criteria.
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const status = statusConfig[project.project_status] || statusConfig.planning;
                return (
                  <tr
                    key={project.project_id}
                    onClick={() => onSelectProject(project)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                      {project.project_no}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">
                        {project.project_name}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {project.project_type} · {project.category.replace(/_/g, ' ')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {project.project_manager_name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-600">
                        {project.members.length} {project.members.length === 1 ? 'member' : 'members'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-600">
                      <div>Start: {formatDate(project.start_date)}</div>
                      <div>End: {formatDate(project.deadline)}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>{project.progress_percentage}%</span>
                        <span className="text-[10px] text-slate-400">
                          {project.completed_tasks_count}/{project.total_tasks_count}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, project.progress_percentage))}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {project.deployment?.domain_link && (
                          <a
                            href={project.deployment.domain_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Visit Live Site"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => onSelectProject(project)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
