import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Bug, ArrowUpRight } from 'lucide-react';
import {
  computeBugResolutionTime,
  MonthlyBugResolutionItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface BugResolutionTimeLineChartProps {
  projects: EnrichedProjectItem[];
}

export const BugResolutionTimeLineChart: React.FC<BugResolutionTimeLineChartProps> = ({
  projects,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [periodMonths, setPeriodMonths] = useState<number>(6);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyBugResolutionItem | null>(null);

  const data = computeBugResolutionTime(projects, periodMonths);

  // SVG Line Chart Dimensions
  const chartWidth = 320;
  const chartHeight = 130;
  const paddingX = 24;
  const paddingY = 16;

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.avgDevHours, d.avgQaHours]),
    20
  );

  const getX = (idx: number) => {
    if (data.length <= 1) return chartWidth / 2;
    return paddingX + (idx / (data.length - 1)) * (chartWidth - paddingX * 2);
  };

  const getY = (val: number) => {
    return chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
  };

  const devPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.avgDevHours)}`)
    .join(' ');

  const qaPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.avgQaHours)}`)
    .join(' ');

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Bug className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              7. Bug Resolution Time: Dev vs QA
            </h3>
            <p className="text-[11px] text-slate-500">Average resolution effort (hours)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={periodMonths}
            onChange={(e) => setPeriodMonths(Number(e.target.value))}
            className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>

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
              <p className="font-semibold text-slate-100 mb-1">Bug Resolution Time</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Compares average hours spent in Dev in Progress (fixing) vs QA in Progress (testing) per completed bug over time. Done bugs only; waiting time excluded.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Line Chart Visual */}
      <div className="my-3 flex flex-col items-center justify-center relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-36 overflow-visible"
        >
          {/* Subtle Gridlines */}
          <line
            x1={paddingX}
            y1={getY(maxVal / 2)}
            x2={chartWidth - paddingX}
            y2={getY(maxVal / 2)}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#e2e8f0"
          />

          {/* Dev Line */}
          <path
            d={devPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* QA Line */}
          <path
            d={qaPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Data Labels */}
          {data.map((d, i) => {
            const x = getX(i);
            const yDev = getY(d.avgDevHours);
            const yQa = getY(d.avgQaHours);

            return (
              <g
                key={d.monthKey}
                onMouseEnter={() => setHoveredMonth(d)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="cursor-pointer"
              >
                {/* Dev Dot */}
                <circle cx={x} cy={yDev} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <text
                  x={x}
                  y={yDev - 6}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-700 font-bold"
                >
                  {d.avgDevHours}h
                </text>

                {/* QA Dot */}
                <circle cx={x} cy={yQa} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                <text
                  x={x}
                  y={yQa + 12}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-700 font-bold"
                >
                  {d.avgQaHours}h
                </text>

                {/* Month Label */}
                <text
                  x={x}
                  y={chartHeight}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 font-medium"
                >
                  {d.monthLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredMonth && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg pointer-events-none">
            {hoveredMonth.monthLabel}: Dev {hoveredMonth.avgDevHours}h | QA {hoveredMonth.avgQaHours}h &bull; {hoveredMonth.completedBugsCount} bugs done
          </div>
        )}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-0.5 bg-blue-600"></span> Development (fixing)
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-0.5 bg-amber-500"></span> QA (testing)
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
