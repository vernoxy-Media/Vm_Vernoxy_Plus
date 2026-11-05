import React, { useState } from 'react';
import { Info, Users, CalendarCheck } from 'lucide-react';
import { WeeklyOffHolidayWorkingSummary } from './attendance-analytics.types';

interface WeeklyOffHolidaysKpiCardProps {
  summary: WeeklyOffHolidayWorkingSummary;
}

export const WeeklyOffHolidaysKpiCard: React.FC<WeeklyOffHolidaysKpiCardProps> = ({
  summary,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              6. Working on Weekly Off & Holidays
            </h3>
            <p className="text-[11px] text-slate-500">Non-working days attendance activity</p>
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
              <p className="font-semibold text-slate-100 mb-1">Weekly Off & Holidays Working</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Distinct count of employees who recorded valid working hours on scheduled Weekly Offs (WO) or Holidays (H). Each employee is counted only once.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Display */}
      <div className="my-6 flex items-center gap-5 px-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-2xs">
          <Users className="h-7 w-7 stroke-[1.75]" />
        </div>

        <div>
          <div className="text-4xl font-black text-slate-900 tracking-tight">
            {summary.distinctEmployeeCount.toLocaleString()}
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            Employees
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-[11px]">
          {summary.totalDaysWorked} total non-working day shifts
        </span>
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/50">
          Distinct Employees
        </span>
      </div>
    </div>
  );
};
