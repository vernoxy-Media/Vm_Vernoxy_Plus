import React, { useState } from 'react';
import { Info, TrendingUp } from 'lucide-react';
import { DailyWorkingHoursItem } from './attendance-analytics.types';

interface DailyWorkingHoursTrendChartProps {
  items: DailyWorkingHoursItem[];
  selectedEmployeeName?: string;
}

export const DailyWorkingHoursTrendChart: React.FC<DailyWorkingHoursTrendChartProps> = ({
  items,
  selectedEmployeeName,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<DailyWorkingHoursItem | null>(null);

  // SVG dimensions
  const chartWidth = 340;
  const chartHeight = 150;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 22;
  const paddingBottom = 26;

  const maxHours = Math.max(...items.map((i) => i.totalWorkingHours), 20);
  const baselineY = chartHeight - paddingBottom;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => {
    if (items.length <= 1) return (chartWidth - paddingLeft - paddingRight) / 2 + paddingLeft;
    return paddingLeft + (idx / (items.length - 1)) * (chartWidth - paddingLeft - paddingRight);
  };

  const getY = (val: number) => {
    return baselineY - (val / maxHours) * usableHeight;
  };

  const linePath = items
    .map((item, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(item.totalWorkingHours)}`)
    .join(' ');

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              4. Daily Working Hours Trend
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedEmployeeName ? `Work trend for ${selectedEmployeeName}` : 'Total daily hours across employees'}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showInfo && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Daily Working Hours Trend</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Line chart plotting total net working hours per date. Deducts unpaid breaks. Incomplete records are excluded. Dates without records appear as gaps.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Line Chart Visual */}
      <div className="my-3 flex flex-col items-center justify-center relative">
        {items.length === 0 ? (
          <div className="py-12 text-xs text-slate-400">No working hours recorded for this period</div>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
            {/* Y-Axis Reference Guidelines */}
            <text x="26" y={getY(maxHours) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium">
              {Math.round(maxHours)}h
            </text>
            <line
              x1={paddingLeft}
              y1={getY(maxHours)}
              x2={chartWidth - paddingRight}
              y2={getY(maxHours)}
              stroke="#f8fafc"
              strokeDasharray="3 3"
            />

            <text x="26" y={getY(maxHours / 2) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium">
              {Math.round(maxHours / 2)}h
            </text>
            <line
              x1={paddingLeft}
              y1={getY(maxHours / 2)}
              x2={chartWidth - paddingRight}
              y2={getY(maxHours / 2)}
              stroke="#f1f5f9"
              strokeDasharray="3 3"
            />

            {/* Baseline */}
            <text x="26" y={baselineY + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium">
              0h
            </text>
            <line
              x1={paddingLeft}
              y1={baselineY}
              x2={chartWidth - paddingRight}
              y2={baselineY}
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />

            {/* Trend Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points and X-Axis Labels */}
            {items.map((item, idx) => {
              const x = getX(idx);
              const y = getY(item.totalWorkingHours);
              const isHovered = hoveredPoint?.date === item.date;

              return (
                <g
                  key={item.date}
                  onMouseEnter={() => setHoveredPoint(item)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer group"
                >
                  {/* Baseline Tick */}
                  <line
                    x1={x}
                    y1={baselineY}
                    x2={x}
                    y2={baselineY + 4}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />

                  {/* X-Axis Date Label */}
                  <text
                    x={x}
                    y={baselineY + 16}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-500 font-semibold group-hover:fill-cyan-600 transition-colors"
                  >
                    {item.dateLabel}
                  </text>

                  {/* Data Point Dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 3.5}
                    fill="#06b6d4"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform"
                  />

                  {/* Data Label Above Dot */}
                  <text
                    x={x}
                    y={y - 6}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-700 font-bold"
                  >
                    {item.totalWorkingHours}h
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap pointer-events-none">
            <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-1.5 text-white shadow-2xl border border-slate-700/60 text-center">
              <p className="text-[11px] font-bold text-slate-100">
                {hoveredPoint.dayOfWeek}, {hoveredPoint.dateLabel}
              </p>
              <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px] text-cyan-300 font-semibold">
                <span>Total: {hoveredPoint.totalWorkingHours} hrs</span>
                <span>•</span>
                <span>{hoveredPoint.employeeCount} active workers</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">
                Avg: {hoveredPoint.averageWorkingHours} hrs/employee
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-[11px]">
          Chronological daily net working hours
        </span>
        <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200/50">
          ● Total Hours
        </span>
      </div>
    </div>
  );
};
