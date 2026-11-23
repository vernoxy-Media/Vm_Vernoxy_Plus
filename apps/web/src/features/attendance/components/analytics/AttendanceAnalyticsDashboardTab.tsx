import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  FilterX,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useAttendanceAnalytics } from '../../hooks/use-attendance-analytics';
import type { AttendanceStatusKey } from './attendance-analytics.types';
import { AttendanceAnalyticsFilterBar } from './AttendanceAnalyticsFilterBar';
import { AttendanceStatusDonutChart } from './AttendanceStatusDonutChart';
import { MonthlyAttendanceSummaryChart } from './MonthlyAttendanceSummaryChart';
import { EmployeesMostLateMarksTable } from './EmployeesMostLateMarksTable';
import { DailyWorkingHoursTrendChart } from './DailyWorkingHoursTrendChart';
import { RegularizationStatusGrid } from './RegularizationStatusGrid';
import { WeeklyOffHolidaysKpiCard } from './WeeklyOffHolidaysKpiCard';
import { RegularizedAttendanceKpiCard } from './RegularizedAttendanceKpiCard';
import { EmployeesMostEarlyExitsTable } from './EmployeesMostEarlyExitsTable';
import { WeeklyHoursHeatmapCalendar } from './WeeklyHoursHeatmapCalendar';
import { DailyBreakTrendsChart } from './DailyBreakTrendsChart';

/**
 * The five numbers at the top. Every class is written out in full so Tailwind can see it.
 * Blue and purple follow the colour theme of the app; green, red and amber keep their meaning.
 */
const KPI_CARDS: Array<{
  key: AttendanceStatusKey;
  label: string;
  hint: string;
  icon: React.ElementType;
  accent: string;
  chip: string;
  text: string;
  bar: string;
}> = [
  { key: 'present', label: 'Present', hint: 'Full shift completed', icon: CheckCircle2, accent: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  { key: 'absent', label: 'Absent', hint: 'Working day, no punch, no leave', icon: XCircle, accent: 'bg-rose-500', chip: 'bg-rose-50 text-rose-600', text: 'text-rose-600', bar: 'bg-rose-500' },
  { key: 'half_day', label: 'Half day', hint: 'Partial shift recorded', icon: Clock, accent: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600', text: 'text-amber-600', bar: 'bg-amber-500' },
  { key: 'on_leave', label: 'On leave', hint: 'Approved leave', icon: Calendar, accent: 'bg-blue-500', chip: 'bg-blue-50 text-blue-600', text: 'text-blue-600', bar: 'bg-blue-500' },
  { key: 'missing_punch', label: 'Missing punch', hint: 'Punched in, never punched out', icon: AlertCircle, accent: 'bg-purple-500', chip: 'bg-purple-50 text-purple-600', text: 'text-purple-600', bar: 'bg-purple-500' },
];

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Skeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading attendance analytics">
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className={`h-[118px] rounded-2xl border border-slate-200/80 bg-white p-4 ${n === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="mt-4 h-7 w-1/3 rounded bg-slate-200" />
          <div className="mt-4 h-1.5 w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
    <div className="h-[170px] rounded-2xl border border-slate-200/80 bg-white" />
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 min-[1600px]:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="h-[380px] rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="mt-8 h-52 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  </div>
);

export const AttendanceAnalyticsDashboardTab: React.FC = () => {
  const {
    filters,
    setFilters,
    clearFilters,
    departments,
    availableDesignations,
    employeeOptions,
    totalRecordsCount,
    filteredRecordsCount,
    isLoading,
    error,
    refetch,
    filteredRecords,
    statusOverview,
    topLateMarks,
    dailyWorkingHours,
    regularizationStatus,
    weeklyOffAndHolidays,
    regularizedRecords,
    topEarlyExits,
    weeklyHeatmap,
    dailyBreakTrends,
  } = useAttendanceAnalytics();

  const selectedEmployeeName =
    filters.employeeId !== 'All'
      ? employeeOptions.find((e) => String(e.id) === String(filters.employeeId))?.name
      : undefined;

  const firstLoad = isLoading && totalRecordsCount === 0 && !error;
  if (firstLoad) return <Skeleton />;

  const refreshing = isLoading && !firstLoad;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Title, period and refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Attendance analytics</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {shortDate(filters.startDate)} – {shortDate(filters.endDate)}
            <span aria-hidden> · </span>
            {employeeOptions.length} employees
            <span aria-hidden> · </span>
            {filteredRecordsCount.toLocaleString()} records
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* The server could not be read */}
      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 shadow-2xs">
              <WifiOff className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-900">The attendance data could not be loaded</p>
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      )}

      {/* The numbers at the top */}
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
        {KPI_CARDS.map((card, i) => {
          const item = statusOverview.items.find((x) => x.key === card.key);
          const pct = item?.percentage ?? 0;
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${card.accent}`} />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${card.chip}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums sm:text-[28px]">{(item?.count ?? 0).toLocaleString()}</span>
                <span className={`text-xs font-bold ${card.text}`}>{pct}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${card.label} share`}>
                <div className={`h-full rounded-full ${card.bar} transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className="mt-2 truncate text-[11px] text-slate-400" title={card.hint}>{card.hint}</p>
            </div>
          );
        })}
      </div>

      <AttendanceAnalyticsFilterBar
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={clearFilters}
        departments={departments}
        availableDesignations={availableDesignations}
        employees={employeeOptions}
        totalFilteredCount={filteredRecordsCount}
        totalUnfilteredCount={totalRecordsCount}
      />

      {filteredRecordsCount === 0 && !error ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-2xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FilterX className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No attendance records found for the selected filters.</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Try another date range, department, designation or search word. Days with no punch are counted only for working days that have already passed.
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        filteredRecordsCount > 0 && (
          <div className={`grid grid-cols-1 gap-4 transition-opacity sm:gap-5 md:grid-cols-2 min-[1600px]:grid-cols-3 ${refreshing ? 'opacity-60' : ''}`}>
            <div className="min-h-[380px] min-w-0">
              <AttendanceStatusDonutChart items={statusOverview.items} totalRecords={statusOverview.totalRecords} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <MonthlyAttendanceSummaryChart records={filteredRecords} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <EmployeesMostLateMarksTable items={topLateMarks} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <DailyWorkingHoursTrendChart items={dailyWorkingHours} selectedEmployeeName={selectedEmployeeName} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <RegularizationStatusGrid summary={regularizationStatus} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <WeeklyOffHolidaysKpiCard summary={weeklyOffAndHolidays} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <RegularizedAttendanceKpiCard summary={regularizedRecords} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <EmployeesMostEarlyExitsTable items={topEarlyExits} />
            </div>
            <div className="min-h-[380px] min-w-0">
              <DailyBreakTrendsChart items={dailyBreakTrends} />
            </div>
            {/* The weekly heatmap takes the whole row */}
            <div className="min-w-0 md:col-span-2 min-[1600px]:col-span-3">
              <WeeklyHoursHeatmapCalendar summary={weeklyHeatmap} />
            </div>
          </div>
        )
      )}
    </div>
  );
};
