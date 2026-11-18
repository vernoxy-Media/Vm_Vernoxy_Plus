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
  // Manager whose bar is expanded to list the direct reports
  const [openManagerId, setOpenManagerId] = useState<number | null>(null);

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
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Reporting Manager Span of Control
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

      {/* Horizontal Bar Chart */}
      <div className="flex-1 flex flex-col justify-center py-2">
        {managers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No employees found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Horizontal bars, one per manager */}
            <ul className="max-h-80 space-y-3 overflow-y-auto py-1 pr-1" aria-label="Active direct reports per manager">
              {managers.map((mgr) => {
                const widthPct = (mgr.directReportsCount / maxReports) * 100;
                const isHovered = hoveredManagerId === mgr.managerId;
                const isDimmed = hoveredManagerId !== null && !isHovered;

                return (
                  <li
                    key={mgr.managerId}
                    onMouseEnter={() => setHoveredManagerId(mgr.managerId)}
                    onMouseLeave={() => setHoveredManagerId(null)}
                    className={`transition-opacity duration-150 ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <button
                      type="button"
                      aria-expanded={openManagerId === mgr.managerId}
                      onClick={() => setOpenManagerId(openManagerId === mgr.managerId ? null : mgr.managerId)}
                      title={`${mgr.managerName}: ${mgr.directReportsCount} active direct reports${mgr.isInactive ? ' (inactive manager)' : ''}. Click to see who.`}
                      className="block w-full cursor-pointer text-left"
                    >
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-slate-700">
                        {mgr.managerName}
                        {mgr.isInactive && (
                          <span className="ml-1.5 text-[10px] font-normal text-amber-600">Inactive</span>
                        )}
                      </span>
                      <strong className="text-slate-900">{mgr.directReportsCount}</strong>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          mgr.isInactive ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${widthPct}%`, minWidth: mgr.directReportsCount > 0 ? '6px' : 0 }}
                      />
                    </div>
                    </button>

                    {openManagerId === mgr.managerId && (
                      <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                        <ul className="max-h-40 space-y-1 overflow-y-auto">
                          {mgr.reports.map((r) => (
                            <li key={r.empId} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800">
                              {r.name}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => handleAllView(mgr.managerId)}
                          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Open in employee list <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-center text-[10.5px] text-slate-400">
              Each bar shows the number of Active employees directly reporting to that manager.
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
