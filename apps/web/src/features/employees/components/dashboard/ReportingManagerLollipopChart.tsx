import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, UserCheck, ArrowUpRight } from 'lucide-react';
import { ManagerSpanItem, EmployeeDashboardFilters } from './dashboard.types';

interface ReportingManagerLollipopChartProps {
  managers: ManagerSpanItem[];
  filters: EmployeeDashboardFilters;
}

export const ReportingManagerLollipopChart: React.FC<ReportingManagerLollipopChartProps> = ({
  managers,
  filters,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredManagerId, setHoveredManagerId] = useState<number | null>(null);

  const maxReports = Math.max(1, ...managers.map((m) => m.directReportsCount));

  const handleAllView = (managerId?: number) => {
    const params = new URLSearchParams();
    params.set('status', 'Active');
    if (managerId) params.set('reporting_manager', String(managerId));
    else if (filters.reportingManager !== 'All') params.set('reporting_manager', filters.reportingManager);
    if (filters.search) params.set('q', filters.search);
    navigate(`/admin/employees?${params.toString()}`);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              4. Reporting Manager Span of Control
            </h3>
            <p className="text-[11px] text-slate-500">Active direct reports per manager</p>
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
              <p className="font-semibold text-slate-100 mb-1">Manager Span of Control</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Shows the number of active employees directly assigned to each reporting manager. Managers with 0 active direct reports are excluded. Sorted descending by direct report count.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Lollipop Chart */}
      <div className="flex-1 flex flex-col justify-end py-2">
        {managers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No employees found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Chart Canvas */}
            <div className="relative h-44 w-full flex items-end justify-around gap-2 px-2 pb-2 border-b border-slate-200">
              {/* Horizontal Reference Grid lines */}
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-200 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />

              {managers.map((mgr) => {
                const heightPct = maxReports > 0 ? (mgr.directReportsCount / maxReports) * 80 : 0;
                const isHovered = hoveredManagerId === mgr.managerId;

                return (
                  <div
                    key={mgr.managerId}
                    onMouseEnter={() => setHoveredManagerId(mgr.managerId)}
                    onMouseLeave={() => setHoveredManagerId(null)}
                    onClick={() => handleAllView(mgr.managerId)}
                    className="relative flex flex-col items-center group cursor-pointer h-full justify-end"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-10 z-30 pointer-events-none px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-semibold">{mgr.managerName}:</span>
                        <span className="font-bold text-sky-400">{mgr.directReportsCount} reports</span>
                        {mgr.isInactive && (
                          <span className="text-rose-300 text-[10px]">(Inactive Mgr)</span>
                        )}
                      </div>
                    )}

                    {/* Value Badge above lollipop circle */}
                    <span
                      style={{ bottom: `calc(${Math.max(12, heightPct)}% + 14px)` }}
                      className="absolute text-[11px] font-bold text-slate-700 group-hover:text-sky-600 transition-colors"
                    >
                      {mgr.directReportsCount}
                    </span>

                    {/* Lollipop Circle Marker */}
                    <div
                      style={{ bottom: `${Math.max(12, heightPct)}%` }}
                      className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-sm transition-all duration-200 ${
                        mgr.isInactive
                          ? 'bg-amber-500 group-hover:bg-amber-600'
                          : 'bg-sky-500 group-hover:bg-sky-600'
                      } ${isHovered ? 'scale-130 ring-2 ring-sky-300' : ''}`}
                    />

                    {/* Lollipop Vertical Stem */}
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-0.5 bg-slate-300 group-hover:bg-sky-500 transition-colors"
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels (Manager Names) */}
            <div className="flex justify-around items-start pt-2 px-2">
              {managers.map((mgr) => (
                <div
                  key={mgr.managerId}
                  onClick={() => handleAllView(mgr.managerId)}
                  title={mgr.managerName}
                  className="w-16 text-center text-[11px] font-semibold text-slate-600 truncate hover:text-sky-600 transition-colors cursor-pointer"
                >
                  {mgr.managerName.split(' ')[0]}
                  {mgr.isInactive && (
                    <span className="block text-[9px] text-amber-600 font-normal">Inactive</span>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-2 text-center text-[10.5px] text-slate-400">
              Each dot represents the number of Active employees directly reporting to that manager.
            </p>
          </div>
        )}
      </div>

      {/* Card Footer / All View */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-500">
          Managers with active reports: <strong className="text-slate-700">{managers.length}</strong>
        </span>

        <button
          type="button"
          onClick={() => handleAllView()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
