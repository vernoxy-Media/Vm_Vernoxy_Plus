import React, { useState } from 'react';
import { Info, CheckCircle2 } from 'lucide-react';
import { RegularizedAttendanceSummary } from './attendance-analytics.types';

interface RegularizedAttendanceKpiCardProps {
  summary: RegularizedAttendanceSummary;
}

export const RegularizedAttendanceKpiCard: React.FC<RegularizedAttendanceKpiCardProps> = ({
  summary,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              7. Regularized Attendance Records
            </h3>
            <p className="text-[11px] text-slate-500">Approved attendance corrections share</p>
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
              <p className="font-semibold text-slate-100 mb-1">Regularized Attendance Records</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Percentage and count of attendance records that have approved regularization corrections versus uncorrected records.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & Metrics */}
      <div className="my-4 space-y-3 px-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-blue-600 tracking-tight">
            {summary.regularizationPercentage}%
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Regularization Percentage
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${Math.max(summary.regularizationPercentage, summary.regularizedCount > 0 ? 3 : 0)}%` }}
          />
        </div>

        {/* Regularized vs Not Regularized Counts */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-lg font-bold text-slate-800">
              {summary.regularizedCount.toLocaleString()}
            </span>
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
              ● Regularized
            </p>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-lg font-bold text-slate-800">
              {summary.notRegularizedCount.toLocaleString()}
            </span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              ● Not Regularized
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500 font-medium">Total Attendance Records</span>
        <span className="text-sm font-extrabold text-slate-900">
          {summary.totalRecords.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
