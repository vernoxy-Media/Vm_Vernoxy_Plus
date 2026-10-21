import React from 'react';
import type { ProjectItem, ProjectStatus } from '../types';

interface ProjectKanbanViewProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  statuses: ProjectStatus[];
  headerColor: string;
}

const columns: KanbanColumn[] = [
  {
    id: 'planning',
    title: 'Planning / New',
    statuses: ['new', 'planning'],
    headerColor: 'border-purple-500 text-purple-700 bg-purple-50/60',
  },
  {
    id: 'in_progress',
    title: 'In Progress & Review',
    statuses: ['in_progress', 'review'],
    headerColor: 'border-blue-500 text-blue-700 bg-blue-50/60',
  },
  {
    id: 'on_hold',
    title: 'On Hold & Pending',
    statuses: ['on_hold', 'pending'],
    headerColor: 'border-amber-500 text-amber-700 bg-amber-50/60',
  },
  {
    id: 'delivered',
    title: 'Delivered',
    statuses: ['delivered'],
    headerColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/60',
  },
];

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  projects,
  onSelectProject,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
      {columns.map((col) => {
        const colProjects = projects.filter((p) => col.statuses.includes(p.project_status));

        return (
          <div
            key={col.id}
            className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl border-l-4 mb-3 ${col.headerColor}`}
            >
              <span className="font-bold text-xs">{col.title}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-xs">
                {colProjects.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {colProjects.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No projects
                </div>
              ) : (
                colProjects.map((p) => (
                  <div
                    key={p.project_id}
                    onClick={() => onSelectProject(p)}
                    className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {p.project_no}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {p.project_type}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-2 hover:text-blue-600 transition">
                      {p.project_name}
                    </h4>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1">
                        <span>Progress</span>
                        <span className="font-bold text-slate-700">
                          {p.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, p.progress_percentage))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer: PM & Team count */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-700 font-semibold truncate max-w-[120px]">
                        {p.project_manager_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {p.members.length} {p.members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
