import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Clock, ArrowUpRight } from 'lucide-react';
import {
  computeEstimatedVsActualHours,
  ProjectHoursComparisonItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface EstimatedVsActualHoursChartProps {
  projects: EnrichedProjectItem[];
}

export const EstimatedVsActualHoursChart: React.FC<EstimatedVsActualHoursChartProps> = ({
  projects,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ProjectHoursComparisonItem | null>(null);

  const comparisons = computeEstimatedVsActualHours(projects);
  const displayed = comparisons.slice(0, 6);

  const maxHours = Math.max(
    ...displayed.flatMap((d) => [d.estimatedHours, d.actualHours]),
    100
  );

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              5. Estimated vs Actual Hours
            </h3>
            <p className="text-[11px] text-slate-500">Project effort comparison</p>
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
              <p className="font-semibold text-slate-100 mb-1">Estimated vs Actual Hours</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Compares estimated hours (sum of task estimates) against actual hours logged. The actual column turns red if effort exceeds estimate and green if within budget.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clustered Column Chart */}
      <div className="my-3 flex items-end justify-between gap-3 h-44 pt-6 px-1 border-b border-slate-200">
        {displayed.length === 0 ? (
          <div className="w-full flex items-center justify-center text-xs text-slate-400">
            No project hours available
          </div>
        ) : (
          displayed.map((d) => {
            const estHeight = (d.estimatedHours / maxHours) * 100;
            const actHeight = (d.actualHours / maxHours) * 100;
            const isHovered = hoveredItem?.projectId === d.projectId;

            return (
              <div
                key={d.projectId}
                className="flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer"
                onMouseEnter={() => setHoveredItem(d)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-14 z-40 whitespace-nowrap pointer-events-none">
                    <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 text-white shadow-2xl border border-slate-700/60 text-center min-w-[150px]">
                      <p className="text-[11px] font-bold text-slate-100 truncate max-w-[140px] mx-auto">
                        {d.projectName}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-0.5 text-[9px] text-slate-300">
                        <span>Est: <strong className="text-white">{d.estimatedHours}h</strong></span>
                        <span>•</span>
                        <span>Act: <strong className="text-white">{d.actualHours}h</strong></span>
                      </div>
                      <p className={`text-[9px] font-bold mt-0.5 ${d.varianceHours > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {d.variancePercentage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Paired Columns */}
                <div className="flex items-end gap-1 w-full justify-center">
                  {/* Estimated Column (Blue) */}
                  <div
                    className="w-3.5 sm:w-4 rounded-t-sm bg-blue-300/80 transition-all duration-300 relative group"
                    style={{ height: `${Math.max(estHeight, 4)}%` }}
                    title={`Estimated: ${d.estimatedHours}h`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600">
                      {d.estimatedHours}
                    </span>
                  </div>

                  {/* Actual Column (Red/Green) */}
                  <div
                    className="w-3.5 sm:w-4 rounded-t-sm transition-all duration-300 relative group"
                    style={{
                      height: `${Math.max(actHeight, 4)}%`,
                      backgroundColor: d.actualColor,
                    }}
                    title={`Actual: ${d.actualHours}h`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600">
                      {d.actualHours}
                    </span>
                  </div>
                </div>

                {/* Project Name Label */}
                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[42px] text-center mt-1">
                  {d.projectName}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-300"></span> Estimated
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Within
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Over
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
