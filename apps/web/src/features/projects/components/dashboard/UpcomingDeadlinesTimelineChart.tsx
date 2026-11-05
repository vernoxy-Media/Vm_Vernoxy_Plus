import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, CalendarClock, ArrowUpRight } from 'lucide-react';
import {
  computeUpcomingDeadlines,
  DeadlineProjectItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface UpcomingDeadlinesTimelineChartProps {
  projects: EnrichedProjectItem[];
}

export const UpcomingDeadlinesTimelineChart: React.FC<UpcomingDeadlinesTimelineChartProps> = ({
  projects,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [windowDays, setWindowDays] = useState<number>(90);
  const [hoveredItem, setHoveredItem] = useState<DeadlineProjectItem | null>(null);

  const deadlineList = computeUpcomingDeadlines(projects, windowDays);
  const displayed = deadlineList.slice(0, 8);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              4. Upcoming Project Deadlines
            </h3>
            <p className="text-[11px] text-slate-500">Timeline of impending deliveries</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Window Selector */}
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value={30}>Next 30 Days</option>
            <option value={60}>Next 60 Days</option>
            <option value={90}>Next 90 Days</option>
            <option value={180}>Next 6 Months</option>
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
              <p className="font-semibold text-slate-100 mb-1">Upcoming Deadlines</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Projects ordered by delivery date. Overdue or due within 7 days highlighted in red, 8–30 days in amber, and over 30 days in green.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline List */}
      <div className="my-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No deadlines in this period
          </div>
        ) : (
          displayed.map((d) => (
            <div
              key={d.projectId}
              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition relative group cursor-pointer"
              onMouseEnter={() => setHoveredItem(d)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                ></span>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={d.projectName}>
                    {d.projectName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {d.deliveryDateFormatted}
                  </p>
                </div>
              </div>

              {/* Status / Days badge */}
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    d.isOverdue
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : d.daysRemaining <= 7
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : d.daysRemaining <= 30
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {d.isOverdue ? `Overdue ${Math.abs(d.daysRemaining)}d` : `${d.daysRemaining}d left`}
                </span>
              </div>

              {/* Tooltip */}
              {hoveredItem?.projectId === d.projectId && (
                <div className="absolute left-1/2 -top-9 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg pointer-events-none">
                  {d.projectName} &bull; {d.deliveryDateFormatted} ({d.progressPercentage}% progress)
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-[11px] text-slate-500">
          Earliest deadline first
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
