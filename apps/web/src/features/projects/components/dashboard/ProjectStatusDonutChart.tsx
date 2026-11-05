import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, PieChart, ArrowUpRight } from 'lucide-react';
import {
  computeProjectStatusOverview,
  ProjectStatusItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface ProjectStatusDonutChartProps {
  projects: EnrichedProjectItem[];
  statusFilter: string;
}

export const ProjectStatusDonutChart: React.FC<ProjectStatusDonutChartProps> = ({
  projects,
  statusFilter,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<ProjectStatusItem | null>(null);

  const { total, items } = computeProjectStatusOverview(projects, statusFilter);

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              1. Project Status Overview
            </h3>
            <p className="text-[11px] text-slate-500">Portfolio distribution by status</p>
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
              <p className="font-semibold text-slate-100 mb-1">Project Status Overview</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Displays the number of projects across all eight statuses (New, Planning, In Progress, Pending, Review, Delivered, On-hold, Cancelled). Centre shows the total project count.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Donut Chart Visual & Legend */}
      <div className="my-3 flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {total > 0 &&
              items.map((item) => {
                if (item.count === 0) return null;
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += item.percentage;

                const isHovered = hoveredStatus?.key === item.key;

                return (
                  <circle
                    key={item.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredStatus(item)}
                    onMouseLeave={() => setHoveredStatus(null)}
                  />
                );
              })}
          </svg>

          {/* Centre Value */}
          <div className="absolute flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {hoveredStatus ? hoveredStatus.count : total}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {hoveredStatus ? hoveredStatus.label : 'Total Projects'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {items.map((item) => (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredStatus(item)}
              onMouseLeave={() => setHoveredStatus(null)}
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
                hoveredStatus && hoveredStatus.key !== item.key ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-slate-600 font-medium truncate max-w-[80px]">
                {item.label}
              </span>
              <span className="text-slate-900 font-bold ml-auto">
                {item.count}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  ({item.percentage}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-[11px] text-slate-500">
          Showing 8 statuses
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
