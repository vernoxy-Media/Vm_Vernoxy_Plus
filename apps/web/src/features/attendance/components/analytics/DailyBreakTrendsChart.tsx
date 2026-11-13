import React, { useState } from 'react';
import { Info, Coffee } from 'lucide-react';
import { DailyBreakTrendItem } from './attendance-analytics.types';

interface DailyBreakTrendsChartProps {
  items: DailyBreakTrendItem[];
}

export const DailyBreakTrendsChart: React.FC<DailyBreakTrendsChartProps> = ({
  items,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<DailyBreakTrendItem | null>(null);

  // SVG dimensions
  const chartWidth = 340;
  const chartHeight = 150;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 22;
  const paddingBottom = 26;

  const maxVal = Math.max(
    ...items.map((i) => Math.max(i.averageBreakMinutes, i.assignedLimitMinutes)),
    75
  );

  const baselineY = chartHeight - paddingBottom;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => {
    if (items.length <= 1) return (chartWidth - paddingLeft - paddingRight) / 2 + paddingLeft;
    return paddingLeft + (idx / (items.length - 1)) * (chartWidth - paddingLeft - paddingRight);
  };

  const getY = (val: number) => {
    return baselineY - (val / maxVal) * usableHeight;
  };

  const linePath = items
    .map((item, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(item.averageBreakMinutes)}`)
    .join(' ');

  const assignedLimitMinutes = items[0]?.assignedLimitMinutes || 60;
  const limitY = getY(assignedLimitMinutes);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Coffee className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              10. Daily Break Duration Trends
            </h3>
            <p className="text-[11px] text-slate-500">Average break vs assigned limit policy</p>
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
              <p className="font-semibold text-slate-100 mb-1">Daily Break Duration Trends</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Line chart comparing daily average break duration against the assigned limit. Exceeded days are highlighted in red.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chart Visual */}
      <div className="my-3 flex flex-col items-center justify-center relative">
        {items.length === 0 ? (
          <div className="py-12 text-xs text-slate-400">No break records found for this period</div>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
            {/* Y-Axis Reference Guidelines */}
            <text x="26" y={getY(maxVal) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium">
              {Math.round(maxVal)}m
            </text>
            <line
              x1={paddingLeft}
              y1={getY(maxVal)}
              x2={chartWidth - paddingRight}
              y2={getY(maxVal)}
              stroke="#f8fafc"
              strokeDasharray="3 3"
            />

            {/* Assigned Limit Reference Line (Red Dashed) */}
            <line
              x1={paddingLeft}
              y1={limitY}
              x2={chartWidth - paddingRight}
              y2={limitY}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <text
              x={chartWidth - paddingRight}
              y={limitY - 4}
              textAnchor="end"
              className="text-[9px] fill-rose-500 font-bold"
            >
              Limit: {assignedLimitMinutes}m
            </text>

            {/* Baseline */}
            <text x="26" y={baselineY + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-medium">
              0m
            </text>
            <line
              x1={paddingLeft}
              y1={baselineY}
              x2={chartWidth - paddingRight}
              y2={baselineY}
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />

            {/* Break Trend Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points and X-Axis Labels */}
            {items.map((item, idx) => {
              const x = getX(idx);
              const y = getY(item.averageBreakMinutes);
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
                    className="text-[9px] fill-slate-500 font-semibold group-hover:fill-amber-600 transition-colors"
                  >
                    {item.dateLabel}
                  </text>

                  {/* Marker Dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 3.5}
                    fill={item.isExceeded ? '#ef4444' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform"
                  />

                  {/* Data Label Above Marker */}
                  <text
                    x={x}
                    y={y - 6}
                    textAnchor="middle"
                    className={`text-[9px] font-bold ${
                      item.isExceeded ? 'fill-rose-600' : 'fill-slate-700'
                    }`}
                  >
                    {item.averageBreakMinutes}m
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
              <p className="text-[11px] font-bold text-slate-100">{hoveredPoint.dateLabel}</p>
              <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px] text-amber-300 font-semibold">
                <span>Avg Break: {hoveredPoint.averageBreakFormatted} ({hoveredPoint.averageBreakMinutes} min)</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {hoveredPoint.totalEmployeesWithBreaks} employees &bull; Limit: {hoveredPoint.assignedLimitMinutes} min
              </p>
              {hoveredPoint.isExceeded && (
                <p className="text-[9px] font-bold text-rose-400 mt-0.5">
                  ⚠️ Exceeded limit by {hoveredPoint.averageBreakMinutes - hoveredPoint.assignedLimitMinutes} mins
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-[11px]">Daily average break duration across employees</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-2.5 h-0.5 bg-amber-500"></span> Avg Break
          </span>
          <span className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold">
            <span className="w-2.5 h-0.5 bg-rose-500"></span> Limit ({assignedLimitMinutes}m)
          </span>
        </div>
      </div>
    </div>
  );
};
