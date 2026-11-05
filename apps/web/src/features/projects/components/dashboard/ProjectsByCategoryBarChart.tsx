import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, FolderKanban, ArrowUpRight } from 'lucide-react';
import {
  computeProjectsByCategory,
  ProjectsByCategoryItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface ProjectsByCategoryBarChartProps {
  projects: EnrichedProjectItem[];
}

export const ProjectsByCategoryBarChart: React.FC<ProjectsByCategoryBarChartProps> = ({
  projects,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<ProjectsByCategoryItem | null>(null);

  const categories = computeProjectsByCategory(projects);
  // Show top categories or all 8
  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              3. Projects by Category
            </h3>
            <p className="text-[11px] text-slate-500">Distribution across categories</p>
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
              <p className="font-semibold text-slate-100 mb-1">Projects by Category</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Displays the number of projects under each category (E-com, CRM, ERP, SEO, Portfolio, Social Media, Brochure, Other) sorted from highest project count to lowest.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vertical Bar Chart */}
      <div className="my-3 flex items-end justify-between gap-2 h-44 pt-6 px-1 border-b border-slate-200">
        {categories.slice(0, 6).map((cat) => {
          const heightPercent = (cat.count / maxCount) * 100;
          const isHovered = hoveredCategory?.key === cat.key;

          return (
            <div
              key={cat.key}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoveredCategory(cat)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-7 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white shadow-md pointer-events-none">
                  {cat.label}: {cat.count} ({cat.percentage}%)
                </div>
              )}

              {/* Data Label Above Bar */}
              <div className="text-center text-[10px] font-bold text-slate-700">
                {cat.count}{' '}
                <span className="text-[9px] text-slate-400 font-normal">
                  ({cat.percentage}%)
                </span>
              </div>

              {/* The Vertical Bar */}
              <div
                className="w-full max-w-[36px] rounded-t-lg transition-all duration-300"
                style={{
                  height: `${Math.max(heightPercent, 4)}%`,
                  backgroundColor: cat.color,
                  opacity: isHovered ? 1 : 0.88,
                }}
              ></div>

              {/* Category Name Label */}
              <span className="text-[10px] font-medium text-slate-500 truncate max-w-[48px] text-center mt-1">
                {cat.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-[11px] text-slate-500">
          Sorted by volume
        </span>
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
