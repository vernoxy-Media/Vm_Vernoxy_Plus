import React, { useState } from 'react';
import { Info, BarChart2 } from 'lucide-react';
import { MonthlyAttendanceSummaryItem } from './attendance-analytics.types';

interface MonthlyAttendanceSummaryChartProps {
  items: MonthlyAttendanceSummaryItem[];
}

export const MonthlyAttendanceSummaryChart: React.FC<MonthlyAttendanceSummaryChartProps> = ({
  items,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyAttendanceSummaryItem | null>(null);

  // Maximum column total for height scaling
  const maxTotal = Math.max(
    ...items.map((i) => i.presentCount + i.absentCount + i.halfDayCount + i.onLeaveCount),
    100
  );

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
              2. Monthly Attendance Summary
            </h3>
            <p className="text-[11px] text-slate-500">
              Stacked status counts with independent late marks
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
              <p className="font-semibold text-slate-100 mb-1">Monthly Attendance Summary</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Stacked columns comparing monthly Present, Absent, Half Day, and On Leave counts. Late Mark is tracked independently and not added to the status total.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stacked Columns Visual */}
      <div className="my-3 flex items-end justify-between gap-2 h-44 pt-8 px-2 border-b border-slate-200 relative">
        {items.length === 0 ? (
          <div className="w-full flex items-center justify-center text-xs text-slate-400 py-10">
            No attendance records found for this period
          </div>
        ) : (
          items.map((m) => {
            const statusTotal = m.presentCount + m.absentCount + m.halfDayCount + m.onLeaveCount;
            const columnHeightPercent = (statusTotal / maxTotal) * 100;
            const isHovered = hoveredMonth?.monthKey === m.monthKey;

            const presentPct = statusTotal > 0 ? (m.presentCount / statusTotal) * 100 : 0;
            const absentPct = statusTotal > 0 ? (m.absentCount / statusTotal) * 100 : 0;
            const halfDayPct = statusTotal > 0 ? (m.halfDayCount / statusTotal) * 100 : 0;
            const onLeavePct = statusTotal > 0 ? (m.onLeaveCount / statusTotal) * 100 : 0;

            return (
              <div
                key={m.monthKey}
                className="flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer group"
                onMouseEnter={() => setHoveredMonth(m)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap pointer-events-none">
                    <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-2 text-white shadow-2xl border border-slate-700/60 text-left min-w-[170px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5 text-xs font-bold text-slate-100">
                        <span>{m.monthLabel}</span>
                        <span className="text-[10px] text-indigo-300">{statusTotal} records</span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Present:</span>
                          <strong className="text-white">{m.presentCount}</strong>
                        </div>
                        <div className="flex items-center justify-between text-rose-400">
                          <span>Absent:</span>
                          <strong className="text-white">{m.absentCount}</strong>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Half Day:</span>
                          <strong className="text-white">{m.halfDayCount}</strong>
                        </div>
                        <div className="flex items-center justify-between text-blue-400">
                          <span>On Leave:</span>
                          <strong className="text-white">{m.onLeaveCount}</strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-purple-300 font-bold">
                          <span>Late Marks:</span>
                          <strong className="text-purple-300">{m.lateMarkCount}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Late Mark Badge Pin above Column */}
                {m.lateMarkCount > 0 && (
                  <span className="mb-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-200/70">
                    {m.lateMarkCount}L
                  </span>
                )}

                {/* Stacked Bar Column */}
                <div
                  className="w-full max-w-[32px] sm:max-w-[40px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-300 shadow-2xs group-hover:scale-105"
                  style={{ height: `${Math.max(columnHeightPercent, 6)}%` }}
                >
                  {/* Present (Bottom) */}
                  <div
                    style={{ height: `${presentPct}%` }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors"
                  />
                  {/* Absent */}
                  <div
                    style={{ height: `${absentPct}%` }}
                    className="w-full bg-rose-500 hover:bg-rose-600 transition-colors"
                  />
                  {/* Half Day */}
                  <div
                    style={{ height: `${halfDayPct}%` }}
                    className="w-full bg-amber-500 hover:bg-amber-600 transition-colors"
                  />
                  {/* On Leave (Top) */}
                  <div
                    style={{ height: `${onLeavePct}%` }}
                    className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                  />
                </div>

                {/* X-Axis Month Label */}
                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[44px] text-center mt-1.5 group-hover:text-blue-600">
                  {m.monthLabel.slice(0, 3)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-500"></span> Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-rose-500"></span> Absent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-500"></span> Half Day
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-blue-500"></span> On Leave
          </span>
        </div>
        <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/50">
          ● Late Mark (Separate)
        </span>
      </div>
    </div>
  );
};
