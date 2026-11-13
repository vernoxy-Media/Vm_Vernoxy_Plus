import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, BarChart2, ArrowUpRight } from 'lucide-react';
import {
  computeProjectProgress,
  ProjectProgressItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface ProjectProgressBarChartProps {
  projects: EnrichedProjectItem[];
  statusFilter: string;
}

export const ProjectProgressBarChart: React.FC<ProjectProgressBarChartProps> = ({
  projects,
  statusFilter,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<ProjectProgressItem | null>(null);

  const progressList = computeProjectProgress(projects, statusFilter);
  const displayedProjects = progressList.slice(0, 10);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              2. Project Progress by Project
            </h3>
            <p className="text-[11px] text-slate-500">Task completion percentage</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Project Progress</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Calculates task completion percentage (Completed tasks ÷ Total tasks). Sorted with lowest progress first to identify projects needing follow-up.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bars List */}
      <div className="my-3 space-y-2.5 overflow-visible">
        {displayedProjects.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No projects available
          </div>
        ) : (
          displayedProjects.map((p, idx) => {
            const isHovered = hoveredProject?.projectId === p.projectId;

            return (
              <div
                key={p.projectId}
                className="space-y-1 relative group cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50/80 transition-colors"
                onMouseEnter={() => setHoveredProject(p)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={p.projectName}>
                    {p.projectName}
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {p.progressPercentage}%
                  </span>
                </div>

                {/* Progress Track */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(p.progressPercentage, 2)}%`,
                      backgroundColor: p.color,
                    }}
                  ></div>
                </div>

                {/* Floating Tooltip - Smart Positioned */}
                {isHovered && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-150 ${
                      idx <= 1 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                    }`}
                  >
                    <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-2 text-white shadow-2xl border border-slate-700/60 text-left min-w-[200px]">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate max-w-[130px]">
                          {p.projectName}
                        </span>
                        <span
                          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.progressPercentage}%
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Completed Tasks:</span>
                          <strong className="text-white font-semibold">
                            {p.completedTasks} / {p.totalTasks}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-slate-400">
                          <span>Status:</span>
                          <span className="text-slate-300 font-medium">
                            {p.totalTasks === 0 ? 'No tasks added' : `${p.progressPercentage}% completed`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> &lt;40%
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 40-69%
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> &ge;70%
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
