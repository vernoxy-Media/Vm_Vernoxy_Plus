import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, TrendingUp, ArrowUpRight } from 'lucide-react';
import { MonthlyMovementItem, EmployeeDashboardFilters } from './dashboard.types';

interface MonthlyMovementComboChartProps {
  movement: MonthlyMovementItem[];
  filters: EmployeeDashboardFilters;
  calendarYear?: number;
}

export const MonthlyMovementComboChart: React.FC<MonthlyMovementComboChartProps> = ({
  movement,
  filters,
  calendarYear = new Date().getFullYear(),
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const handleAllView = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('q', filters.search);
    if (filters.department !== 'All') params.set('dep_id', filters.department);
    if (filters.designation !== 'All') params.set('role_id', filters.designation);
    navigate(`/admin/employees?${params.toString()}`);
  };

  // Determine scale for chart
  const maxJoinedOrLeft = Math.max(1, ...movement.map((m) => Math.max(m.joinedCount, m.leftCount)));
  const minNet = Math.min(0, ...movement.map((m) => m.netChange));
  const maxNet = Math.max(0, ...movement.map((m) => m.netChange));
  const chartMax = Math.max(maxJoinedOrLeft, maxNet, 5);

  const totalJoined = movement.reduce((acc, m) => acc + m.joinedCount, 0);
  const totalLeft = movement.reduce((acc, m) => acc + m.leftCount, 0);
  const totalNet = totalJoined - totalLeft;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              5. Monthly Employee Movement
            </h3>
            <p className="text-[11px] text-slate-500">
              Joined, Left & Net Workforce Change ({calendarYear})
            </p>
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
              <p className="font-semibold text-slate-100 mb-1">Monthly Employee Movement</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Tracks joining count, leaving count, and net workforce change across all 12 months. Joining Count is based on Joining Date; Leaving Count is based on Termination Date.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 py-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span className="text-slate-600 font-medium">Joined ({totalJoined})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-slate-600 font-medium">Left ({totalLeft})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-500" />
          <span className="text-slate-600 font-medium">Net Change ({totalNet >= 0 ? `+${totalNet}` : totalNet})</span>
        </div>
      </div>

      {/* Combo Chart Visualization */}
      <div className="flex-1 flex flex-col justify-end pt-2 pb-1">
        <div className="relative h-44 w-full flex items-end justify-between gap-1 border-b border-slate-200 px-1 pb-1">
          {/* Grid lines */}
          <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-200 pointer-events-none" />
          <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />

          {movement.map((m) => {
            const joinedPct = (m.joinedCount / chartMax) * 85;
            const leftPct = (m.leftCount / chartMax) * 85;
            // Net position relative to 0 line (clamped for visual stability)
            const netPct = Math.max(8, Math.min(95, ((m.netChange - minNet) / (chartMax - minNet || 1)) * 85));
            const isHovered = hoveredMonth === m.monthIndex;

            return (
              <div
                key={m.monthIndex}
                onMouseEnter={() => setHoveredMonth(m.monthIndex)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 pointer-events-none px-2.5 py-1.5 bg-slate-900 text-white text-[10.5px] rounded-lg shadow-xl flex flex-col gap-0.5 whitespace-nowrap">
                    <span className="font-bold text-slate-100">
                      {m.monthName} {calendarYear}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-300">Joined: {m.joinedCount}</span>
                      <span className="text-amber-300">Left: {m.leftCount}</span>
                      <span className={m.netChange >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        Net: {m.netChange >= 0 ? `+${m.netChange}` : m.netChange}
                      </span>
                    </div>
                  </div>
                )}

                {/* Net Change Marker Dot on Line */}
                <div
                  style={{ bottom: `${netPct}%` }}
                  className={`absolute z-10 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs transition-transform ${
                    m.netChange >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                  } ${isHovered ? 'scale-130' : ''}`}
                />

                {/* Columns Container (Joined & Left side by side) */}
                <div className="flex items-end gap-0.5 w-full justify-center h-full">
                  {/* Joined Column */}
                  <div
                    style={{ height: `${Math.max(2, joinedPct)}%` }}
                    className="w-2.5 bg-blue-500 rounded-t-xs transition-all duration-200 group-hover:bg-blue-600"
                    title={`Joined: ${m.joinedCount}`}
                  />

                  {/* Left Column */}
                  <div
                    style={{ height: `${Math.max(2, leftPct)}%` }}
                    className="w-2.5 bg-amber-500 rounded-t-xs transition-all duration-200 group-hover:bg-amber-600"
                    title={`Left: ${m.leftCount}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis Month Labels */}
        <div className="flex justify-between items-center pt-1.5 px-1">
          {movement.map((m) => (
            <span
              key={m.monthIndex}
              className={`flex-1 text-center text-[10px] font-semibold transition-colors ${
                hoveredMonth === m.monthIndex ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              {m.monthName}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer / All View */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-500">
          Net movement: <strong className={totalNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {totalNet >= 0 ? `+${totalNet}` : totalNet} employees
          </strong>
        </span>

        <button
          type="button"
          onClick={handleAllView}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
