import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, TrendingUp, ArrowUpRight } from 'lucide-react';
import {
  computeProjectProfitability,
  ProjectProfitabilityItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface ProjectProfitabilityDivergingChartProps {
  projects: EnrichedProjectItem[];
}

export const ProjectProfitabilityDivergingChart: React.FC<ProjectProfitabilityDivergingChartProps> = ({
  projects,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<ProjectProfitabilityItem | null>(null);

  const items = computeProjectProfitability(projects);
  const displayed = items.slice(0, 7);

  const maxVal = Math.max(
    ...displayed.map((i) => Math.abs(i.profitOrLoss)),
    100000
  );

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              9. Project Profitability
            </h3>
            <p className="text-[11px] text-slate-500">Revenue minus actual expenses</p>
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
              <p className="font-semibold text-slate-100 mb-1">Project Profitability</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Diverging bar chart with zero line in the centre. Shows profit in green extending to the right and loss in red extending to the left for each project.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Diverging Bar Chart Visual */}
      <div className="my-3 space-y-2.5 overflow-visible">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No projects with revenue recorded
          </div>
        ) : (
          displayed.map((p, idx) => {
            const barWidthPercent = (Math.abs(p.profitOrLoss) / maxVal) * 45;
            const isHovered = hoveredProject?.projectId === p.projectId;

            return (
              <div
                key={p.projectId}
                className="space-y-1 relative group cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50/80 transition-colors"
                onMouseEnter={() => setHoveredProject(p)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={p.projectName}>
                    {p.projectName}
                  </span>
                  <span
                    className={`font-bold text-xs ${
                      p.isProfit ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {p.profitOrLossLakh}
                  </span>
                </div>

                {/* Diverging Bar with Zero Line */}
                <div className="relative h-2.5 w-full bg-slate-100 rounded-full flex items-center overflow-hidden">
                  {/* Zero Center Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 z-10"></div>

                  {/* Left (Loss) or Right (Profit) Bar */}
                  {p.isProfit ? (
                    <div
                      className="absolute left-1/2 h-full bg-emerald-500 rounded-r-full transition-all duration-300"
                      style={{ width: `${Math.max(barWidthPercent, 2)}%` }}
                    ></div>
                  ) : (
                    <div
                      className="absolute right-1/2 h-full bg-rose-500 rounded-l-full transition-all duration-300"
                      style={{ width: `${Math.max(barWidthPercent, 2)}%` }}
                    ></div>
                  )}
                </div>

                {/* Floating Tooltip - Positioned smart to avoid clipping */}
                {isHovered && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-150 ${
                      idx <= 1 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                    }`}
                  >
                    <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-2 text-white shadow-2xl border border-slate-700/60 text-left min-w-[210px]">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate max-w-[130px]">
                          {p.projectName}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            p.isProfit
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.profitOrLossLakh}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Project Revenue:</span>
                          <strong className="text-white font-semibold">
                            ₹{p.revenue.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Actual Expenses:</span>
                          <strong className="text-white font-semibold">
                            ₹{p.actualExpenses.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-slate-400">
                          <span>Profit Margin:</span>
                          <strong
                            className={`font-bold ${
                              p.isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {p.profitMarginPercentage}%
                          </strong>
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
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Profit (+)
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Loss (-)
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
