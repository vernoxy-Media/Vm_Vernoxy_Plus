import React, { useState } from 'react';
import { Info, PieChart } from 'lucide-react';
import { US02LeadStatusOverview } from '../../types/sales-dashboard.types';

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6', // blue
  Contacted: '#06b6d4', // cyan
  Qualified: '#a855f7', // purple
  'On Hold': '#f59e0b', // amber
  Converted: '#10b981', // green
  Lost: '#ef4444', // red
};

interface LeadStatusDonutChartProps {
  data?: US02LeadStatusOverview;
}

export const LeadStatusDonutChart: React.FC<LeadStatusDonutChartProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const total = data?.total || 0;
  const statuses = data?.statuses || [];

  // SVG Donut calculation
  const size = 150;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Lead Status Overview</h3>
            <p className="text-[11px] text-slate-500">Pipeline concentration across all statuses</p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-7 z-30 w-64 rounded-xl bg-slate-900 p-2.5 text-[11px] text-white shadow-xl">
              Displays the number of leads in each status (New, Contacted, Qualified, Converted, Lost, On Hold) and the share of the whole pipeline.
            </div>
          )}
        </div>
      </div>

      {/* Donut and Legend */}
      <div className="my-4 flex flex-col sm:flex-row items-center justify-center gap-6">
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
              statuses.map((item) => {
                if (item.count === 0) return null;
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += item.percentage;
                const color = STATUS_COLORS[item.status] || '#94a3b8';
                const isHovered = hoveredStatus === item.status;

                return (
                  <circle
                    key={item.status}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredStatus(item.status)}
                    onMouseLeave={() => setHoveredStatus(null)}
                  />
                );
              })}
          </svg>

          {/* Center value */}
          <div className="absolute flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900">{total}</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Leads</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs w-full sm:w-auto">
          {statuses.map((item) => {
            const color = STATUS_COLORS[item.status] || '#94a3b8';
            return (
              <div
                key={item.status}
                onMouseEnter={() => setHoveredStatus(item.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={`flex items-center gap-1.5 p-1 rounded transition ${
                  item.is_max ? 'bg-blue-50/80 font-bold ring-1 ring-blue-200' : ''
                } ${hoveredStatus && hoveredStatus !== item.status ? 'opacity-40' : 'opacity-100'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-700 truncate max-w-[85px]">{item.status}</span>
                <span className="text-slate-900 font-bold ml-auto">
                  {item.count} <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 text-center">
        Lead Status represents the current state of each lead
      </div>
    </div>
  );
};
