import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Coffee,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useEmployeeAttendanceDashboard } from '@/features/attendance/hooks/use-attendance';
import { RecentAttendanceRecordsCard } from '@/features/attendance/components/RecentAttendanceRecordsCard';

interface EmployeeAttendanceTabProps {
  employeeId: number;
  employeeName: string;
}

export const EmployeeAttendanceTab: React.FC<EmployeeAttendanceTabProps> = ({
  employeeId,
  employeeName,
}) => {
  // Current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useEmployeeAttendanceDashboard(employeeId, selectedMonth);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 2, 1));
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(year, month, 1));
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const formatMonthTitle = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  const monthSummary = dashboardData?.month_summary;
  const records = dashboardData?.records || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Attendance Tab Subheader: Month Selector & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Attendance & Activity Records</h2>
            <p className="text-xs text-slate-500">
              Timesheets, daily punch logs, and activity timeline for <span className="font-semibold text-slate-700">{employeeName}</span>
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-slate-600 hover:text-slate-900 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 font-semibold text-xs text-slate-800 min-w-[130px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{formatMonthTitle(selectedMonth)}</span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-slate-600 hover:text-slate-900 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Refresh Attendance Data"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Month Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Present Days */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Present Days</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {isLoading ? '-' : monthSummary?.present_days ?? 0}
            <span className="text-xs font-medium text-slate-400 ml-1">
              / {monthSummary?.scheduled_days ?? 0} scheduled
            </span>
          </div>
        </div>

        {/* Effective Production Hours */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Effective Hours</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {isLoading
              ? '-'
              : (Math.round(((monthSummary?.total_working_seconds ?? 0) / 3600) * 10) / 10).toFixed(1)}
            <span className="text-xs font-medium text-slate-400 ml-1">hrs</span>
          </div>
        </div>

        {/* Break Hours */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Total Breaks</span>
            <Coffee className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {isLoading
              ? '-'
              : (Math.round(((monthSummary?.total_break_seconds ?? 0) / 3600) * 10) / 10).toFixed(1)}
            <span className="text-xs font-medium text-slate-400 ml-1">hrs</span>
          </div>
        </div>

        {/* Leaves & Absences */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Leaves / Absences</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {isLoading ? '-' : (monthSummary?.leave_days ?? 0) + (monthSummary?.absent_days ?? 0)}
            <span className="text-xs font-medium text-slate-400 ml-1">
              ({monthSummary?.leave_days ?? 0}L, {monthSummary?.absent_days ?? 0}A)
            </span>
          </div>
        </div>
      </div>

      {/* Main Activity Logs Card */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-600">Loading attendance activity logs...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-sm font-semibold text-rose-900">Failed to load attendance logs</p>
          <p className="text-xs text-rose-600">{(error as any)?.message || 'Please try again later'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-medium hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <RecentAttendanceRecordsCard
          records={records}
          selectedDate={selectedMonth === new Date().toISOString().slice(0, 7) ? new Date().toISOString().slice(0, 10) : `${selectedMonth}-01`}
          hideActionButtons={true}
        />
      )}
    </div>
  );
};

