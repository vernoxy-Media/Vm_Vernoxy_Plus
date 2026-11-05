import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  FilterX,
} from 'lucide-react';
import { useAttendanceAnalytics } from '../../hooks/use-attendance-analytics';
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
    statusOverview,
    monthlySummary,
    topLateMarks,
    dailyWorkingHours,
    regularizationStatus,
    weeklyOffAndHolidays,
    regularizedRecords,
    topEarlyExits,
    weeklyHeatmap,
    dailyBreakTrends,
  } = useAttendanceAnalytics();

  // Find selected employee name if filtered
  const selectedEmployeeName =
    filters.employeeId !== 'All'
      ? employeeOptions.find((e) => String(e.id) === String(filters.employeeId))?.name
      : undefined;

  // Extract counts for the 5 top status pills from statusOverview
  const presentItem = statusOverview.items.find((i) => i.key === 'present');
  const absentItem = statusOverview.items.find((i) => i.key === 'absent');
  const halfDayItem = statusOverview.items.find((i) => i.key === 'half_day');
  const onLeaveItem = statusOverview.items.find((i) => i.key === 'on_leave');
  const missingPunchItem = statusOverview.items.find((i) => i.key === 'missing_punch');

  return (
    <div className="space-y-6">
      {/* Top 5 KPI Summary Status Cards matching BRD Page 6 Reference Screen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Present */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Present</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {presentItem?.count.toLocaleString() ?? 0}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {presentItem?.percentage ?? 0}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Full shift completed</p>
        </div>

        {/* Absent */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Absent</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {absentItem?.count.toLocaleString() ?? 0}
            </span>
            <span className="text-xs font-bold text-rose-600">
              {absentItem?.percentage ?? 0}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Unapproved absence</p>
        </div>

        {/* Half Day */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Half Day</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {halfDayItem?.count.toLocaleString() ?? 0}
            </span>
            <span className="text-xs font-bold text-amber-600">
              {halfDayItem?.percentage ?? 0}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Partial shift recorded</p>
        </div>

        {/* On Leave */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">On Leave</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {onLeaveItem?.count.toLocaleString() ?? 0}
            </span>
            <span className="text-xs font-bold text-blue-600">
              {onLeaveItem?.percentage ?? 0}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Approved leave request</p>
        </div>

        {/* Missing Punch */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Missing Punch</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {missingPunchItem?.count.toLocaleString() ?? 0}
            </span>
            <span className="text-xs font-bold text-purple-600">
              {missingPunchItem?.percentage ?? 0}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Incomplete punch in/out</p>
        </div>
      </div>

      {/* Global Filter Bar (US01) */}
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

      {/* Empty State when no records match filters (Per BRD Rule: "No attendance records found for the selected filters.") */}
      {filteredRecordsCount === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-slate-200 bg-white shadow-2xs p-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FilterX className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              No attendance records found for the selected filters.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Try adjusting your date range, department, designation or search keyword to view records.
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs transition cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        /* 3-Column Responsive Grid Layout for all 10 User Stories */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Attendance Status Overview (Donut Chart - US02) */}
          <div className="min-h-[380px]">
            <AttendanceStatusDonutChart
              items={statusOverview.items}
              totalRecords={statusOverview.totalRecords}
            />
          </div>

          {/* 2. Monthly Attendance Summary (Stacked Column Chart - US03) */}
          <div className="min-h-[380px]">
            <MonthlyAttendanceSummaryChart items={monthlySummary} />
          </div>

          {/* 3. Employees with Most Late Marks (Ranked Table - US04) */}
          <div className="min-h-[380px]">
            <EmployeesMostLateMarksTable items={topLateMarks} />
          </div>

          {/* 4. Daily Working Hours Trend (Line Chart - US05) */}
          <div className="min-h-[380px]">
            <DailyWorkingHoursTrendChart
              items={dailyWorkingHours}
              selectedEmployeeName={selectedEmployeeName}
            />
          </div>

          {/* 5. Regularization Request Status (2x2 Grid - US06) */}
          <div className="min-h-[380px]">
            <RegularizationStatusGrid summary={regularizationStatus} />
          </div>

          {/* 6. Employees Working on Weekly Off & Holidays (KPI Count Card - US07) */}
          <div className="min-h-[380px]">
            <WeeklyOffHolidaysKpiCard summary={weeklyOffAndHolidays} />
          </div>

          {/* 7. Regularized Attendance Records (KPI Progress Bar Card - US08) */}
          <div className="min-h-[380px]">
            <RegularizedAttendanceKpiCard summary={regularizedRecords} />
          </div>

          {/* 8. Employees with Most Early Exits (Ranked Table - US09) */}
          <div className="min-h-[380px]">
            <EmployeesMostEarlyExitsTable items={topEarlyExits} />
          </div>

          {/* 10. Daily Break Duration Trends (Line Chart - US11) */}
          <div className="min-h-[380px]">
            <DailyBreakTrendsChart items={dailyBreakTrends} />
          </div>

          {/* 9. Weekly Total Working Hours (Heatmap Calendar - US10, Spans Full 3 Columns) */}
          <WeeklyHoursHeatmapCalendar summary={weeklyHeatmap} />
        </div>
      )}
    </div>
  );
};
