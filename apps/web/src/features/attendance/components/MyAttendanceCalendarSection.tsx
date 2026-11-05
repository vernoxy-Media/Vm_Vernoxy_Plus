import React, { useState, useMemo } from 'react';
import { ChevronRight, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAttendanceDashboard } from '../hooks/use-attendance';
import { AttendanceMonthSummaryTiles } from './AttendanceMonthSummaryTiles';
import { AttendanceListView } from './AttendanceListView';
import { AttendanceDetailModal } from './AttendanceDetailModal';
import type { DayRecord } from '../types/attendance.types';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MyAttendanceCalendarSection: React.FC = () => {
  const { user } = useAuth();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => String(new Date().getMonth() + 1).padStart(2, '0'), []);

  // Dropdown states
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Year options: Current year and the 2 years before it (per Section 6 spec)
  const yearOptions = useMemo(() => {
    return [currentYear, currentYear - 1, currentYear - 2];
  }, [currentYear]);

  // Query month key: YYYY-MM
  const monthKey = `${selectedYear}-${selectedMonth}`;
  const { data } = useAttendanceDashboard(monthKey);

  const records: DayRecord[] = data?.records || [];
  const shift = data?.shift;

  // Selected date modal
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    date: string;
    record: DayRecord | null;
  } | null>(null);

  // Month grid calculations
  const yearNum = Number(selectedYear);
  const monthNum = Number(selectedMonth); // 1-indexed (1..12)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const firstDayDow = new Date(yearNum, monthNum - 1, 1).getDay(); // 0 is Sun, 1 is Mon
  const startingOffset = (firstDayDow + 6) % 7; // Mon=0, Sun=6

  // Lookup record by date YYYY-MM-DD
  const recordMap = useMemo(() => {
    const map = new Map<string, DayRecord>();
    records.forEach((r) => map.set(r.date, r));
    return map;
  }, [records]);

  // Helper to check late mark
  const isLateRecord = (record?: DayRecord | null): boolean => {
    if (!record) return false;
    if ((record as any)?.is_late !== undefined) return Boolean((record as any).is_late);
    if (!record.punch_in) return false;
    const m = record.punch_in.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return false;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min > 585; // 09:30 AM + 15m grace = 09:45 AM (585m)
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="text-slate-400">HRMS</span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-400">Attendance</span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-800 font-semibold">My Attendance</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B]">
            My Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View daily and monthly attendance, holidays and weekly offs
          </p>
        </div>
      </div>

      {/* Controls: Month *, Year *, View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Month * */}
          <div className="w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Month <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year * */}
          <div className="w-36">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              View
            </label>
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Month Summary Tiles (6 tiles) */}
      <AttendanceMonthSummaryTiles records={records} />

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="py-2.5 text-xs font-bold text-slate-600 tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {/* Blank offset cells before the 1st */}
            {Array.from({ length: startingOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[96px] bg-slate-50/30 p-2.5" />
            ))}

            {/* Day cells 1..daysInMonth */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${selectedYear}-${selectedMonth}-${String(day).padStart(2, '0')}`;
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              const record = recordMap.get(dateStr);
              const isLate = isLateRecord(record);

              const isCheckedIn = Boolean(isToday && record?.punch_in && !record?.punch_out);
              const isMissingPunch = !isToday && Boolean(
                record?.status === 'incomplete' ||
                (record?.punch_in && !record?.punch_out)
              );

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    if (isFuture) return; // Future dates cannot be opened per spec
                    setDetailModal({
                      isOpen: true,
                      date: dateStr,
                      record: record || null,
                    });
                  }}
                  className={`min-h-[96px] p-2.5 transition-all flex flex-col justify-between ${
                    isFuture
                      ? 'bg-slate-50/20 cursor-default text-slate-300'
                      : 'cursor-pointer hover:bg-blue-50/40 hover:shadow-2xs'
                  } ${isToday ? 'ring-2 ring-indigo-500/50 bg-indigo-50/20' : ''}`}
                >
                  {/* Top: Day number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isFuture
                          ? 'text-slate-300'
                          : isToday
                            ? 'text-indigo-600 font-black'
                            : 'text-slate-800'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Middle / Bottom: Status Badge */}
                  <div className="mt-2 min-h-[36px] flex flex-col justify-end">
                    {!isFuture && (
                      <>
                        {isCheckedIn ? (
                          <div className="inline-block border border-slate-700 rounded-md px-2 py-0.5 text-[10px] font-semibold text-slate-800 bg-slate-50 self-start shadow-2xs">
                            Checked in
                          </div>
                        ) : record?.status === 'holiday' ? (
                          <div className="space-y-0.5">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                              H
                            </span>
                            <span className="text-[10px] font-semibold text-purple-700 block truncate max-w-[110px]" title={record.holiday_name || 'Holiday'}>
                              {record.holiday_name || 'Holiday'}
                            </span>
                          </div>
                        ) : record?.status === 'weekly_off' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-400 text-white font-bold text-[10px] self-start shadow-2xs">
                            WO
                          </span>
                        ) : isMissingPunch ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-500 text-white font-bold text-[10px] self-start shadow-2xs">
                            MP
                          </span>
                        ) : record?.status === 'leave' ? (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                            L
                          </span>
                        ) : record?.status === 'half_day' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] self-start shadow-2xs">
                            HD
                          </span>
                        ) : record?.status === 'absent' ? (
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                            A
                          </span>
                        ) : record?.status === 'present' || record?.punch_in ? (
                          <div className="flex items-center gap-1.5 self-start">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                              P
                            </span>
                            {isLate && (
                              <span className="text-[10px] font-black text-amber-600 tracking-tight">
                                LM
                              </span>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend (Field 6) */}
          <div className="border-t border-slate-200 bg-slate-50/70 p-3.5 px-4 text-xs">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-700 font-semibold text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">
                  P
                </span>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center">
                  A
                </span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[9px]">
                  HD
                </span>
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                  L
                </span>
                <span>On Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded-full bg-slate-400 text-white font-bold text-[9px]">
                  WO
                </span>
                <span>Weekly Off</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">
                  H
                </span>
                <span>Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white font-bold text-[9px]">
                  MP
                </span>
                <span>Missing Punch</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                <span>LM = Late Mark</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
          <AttendanceListView
            records={records}
            shiftName={shift?.shift_name || 'General Shift (09:30 - 18:30)'}
            onSelectDate={(d) => {
              const r = recordMap.get(d) || null;
              setDetailModal({
                isOpen: true,
                date: d,
                record: r,
              });
            }}
          />
        </div>
      )}

      {/* Attendance Detail Modal (Section 5) */}
      {detailModal && (
        <AttendanceDetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal(null)}
          date={detailModal.date}
          record={detailModal.record}
          employeeInfo={{
            empId: user?.emp_id,
            name: user?.name,
            department: (user as any)?.department?.department_name || (user as any)?.dep_name,
          }}
        />
      )}
    </div>
  );
};
