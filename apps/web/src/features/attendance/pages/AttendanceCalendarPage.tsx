import React, { useState, Suspense } from 'react';
import { useAttendanceDashboard } from '../hooks/use-attendance';
import { MonthNavigator } from '../components/MonthNavigator';
import { AttendanceCalendar } from '../components/AttendanceCalendar';
import { AttendanceSkeleton } from '../components/AttendanceSkeleton';
import { AttendanceNavTabs } from '../components/AttendanceNavTabs';

const DayDetailPanel = React.lazy(() => import('../components/DayDetailPanel'));

export const AttendanceCalendarPage: React.FC = () => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDetailDate, setSelectedDetailDate] = useState<string | null>(null);

  const { data, isLoading, error } = useAttendanceDashboard(selectedMonth);

  const handlePreviousMonth = () => {
    const [y, m] = selectedMonth.split('-');
    const prevDate = new Date(parseInt(y || '2026', 10), parseInt(m || '10', 10) - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-');
    const nextDate = new Date(parseInt(y || '2026', 10), parseInt(m || '10', 10), 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  if (isLoading && !data) return <AttendanceSkeleton />;

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900">Unable to load attendance calendar</h2>
          <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Network error'}</p>
        </div>
      </div>
    );
  }

  const { records } = data!;

  return (
    <div id="attendance-calendar-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-400 mb-1">
            <span>Dashboard</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span>Attendance</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600 font-bold">Calendar</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Calendar</h1>
        </div>
        <MonthNavigator currentMonth={selectedMonth} onChangeMonth={setSelectedMonth} />
      </div>

      <AttendanceNavTabs activeTab="calendar" />

      <AttendanceCalendar
        currentMonth={selectedMonth}
        records={records}
        onSelectDate={(date) => setSelectedDetailDate(date)}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />

      {selectedDetailDate && (
        <Suspense fallback={null}>
          <DayDetailPanel
            isOpen={Boolean(selectedDetailDate)}
            date={selectedDetailDate}
            onClose={() => setSelectedDetailDate(null)}
            onOpenCorrection={() => {}}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AttendanceCalendarPage;
