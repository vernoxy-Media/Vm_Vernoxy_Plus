import React, { useState } from 'react';
import { Info, PieChart } from 'lucide-react';
import { AttendanceStatusCountItem } from './attendance-analytics.types';

interface AttendanceStatusDonutChartProps {
  items: AttendanceStatusCountItem[];
  totalRecords: number;
}

export const AttendanceStatusDonutChart: React.FC<AttendanceStatusDonutChartProps> = ({
  items,
  totalRecords,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<AttendanceStatusCountItem | null>(null);

  // SVG Donut Calculations
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              1. Attendance Status Overview
            </h3>
            <p className="text-[11px] text-slate-500">Distribution across five attendance statuses</p>
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
              <p className="font-semibold text-slate-100 mb-1">Attendance Status Overview</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Donut chart classifying records into Present, Absent, Half Day, On Leave, and Missing Punch. Centre shows total records. Multiple punches are consolidated per date.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Donut Chart Visual & Legend */}
      <div className="my-4 flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          {/* Hover Status Floating Tooltip */}
          {hoveredStatus && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap">
              <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-2.5 py-1 text-white shadow-xl border border-slate-700/60 text-center text-[10px]">
                <span className="font-bold">{hoveredStatus.label}:</span>{' '}
                <span className="text-emerald-300 font-bold">{hoveredStatus.count.toLocaleString()}</span>{' '}
                <span className="text-slate-400">({hoveredStatus.percentage}%)</span>
              </div>
            </div>
          )}
          <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {totalRecords > 0 &&
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
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {hoveredStatus ? hoveredStatus.count.toLocaleString() : totalRecords.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center max-w-[80px]">
              {hoveredStatus ? hoveredStatus.label : 'Total Records'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 text-xs w-full sm:w-auto">
          {items.map((item) => (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredStatus(item)}
              onMouseLeave={() => setHoveredStatus(null)}
              className={`flex items-center gap-2 cursor-pointer p-1 rounded-lg transition-all ${
                hoveredStatus && hoveredStatus.key !== item.key ? 'opacity-40' : 'opacity-100'
              } hover:bg-slate-50`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-slate-600 font-medium truncate max-w-[95px]">
                {item.label}
              </span>
              <span className="text-slate-900 font-bold ml-auto pl-2 text-xs">
                {item.count.toLocaleString()}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  ({item.percentage}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-[11px] text-slate-500">
          Consolidated per employee per date
        </span>
        <span className="text-[11px] font-semibold text-slate-700">
          5 Attendance Statuses
        </span>
      </div>
    </div>
  );
};
