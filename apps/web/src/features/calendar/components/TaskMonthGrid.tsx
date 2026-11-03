import React from 'react';
import { Check, Send, Video } from 'lucide-react';
import type { CalendarMonthTaskItem, CalendarHolidayItem, CalendarEvent } from '../types';
import type { DayRecord } from '../../attendance/types/attendance.types';
import { CalendarStatusLegend } from './CalendarStatusLegend';

interface TaskMonthGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: CalendarMonthTaskItem[];
  holidays: CalendarHolidayItem[];
  events: CalendarEvent[]; // for meetings, notes & reminders
  attendanceRecords?: Record<string, DayRecord>;
  currentUserId?: number;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectTask?: (taskId: number) => void;
  displayMode?: 'attendance' | 'tasks';
}

export const TaskMonthGrid: React.FC<TaskMonthGridProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  tasks,
  holidays,
  events,
  attendanceRecords = {},
  currentUserId,
  onSelectEvent,
  onSelectTask,
  displayMode = 'attendance',
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday start
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const cells = [];

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, month - 1, d);
    cells.push({ date: dateObj, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    cells.push({ date: dateObj, isCurrentMonth: true });
  }

  // Next month leading days to complete grid (42 cells: 6 rows * 7 cols)
  const remainingCells = 42 - cells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const dateObj = new Date(year, month + 1, d);
    cells.push({ date: dateObj, isCurrentMonth: false });
  }

  // Local-date helper: formats a Date as YYYY-MM-DD using local timezone (avoids UTC off-by-one)
  const toLocalYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const todayStr = toLocalYMD(new Date());
  const selectedStr = toLocalYMD(selectedDate);

  return (
    <div className="flex flex-1 select-none flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm sm:rounded-3xl">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-1.5 py-2 sm:gap-1.5 sm:px-3 sm:py-3">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
          <div key={day} className={`text-center text-[10px] font-bold tracking-wider sm:text-[11px] ${i >= 5 ? 'text-rose-400' : 'text-slate-500'}`}>
            <span className="sm:hidden">{day[0]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid flex-1 auto-rows-fr grid-cols-7 gap-1 p-1.5 sm:gap-1.5 sm:p-3">
        {cells.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = toLocalYMD(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;

          // Holiday on this day
          const dayHoliday = holidays.find((h) => h.holiday_date === dateStr);
          const showAttendance = displayMode === 'attendance';
          const showOperations = displayMode === 'tasks';

          // Meetings scheduled or attended on this day
          const dayMeetings = events.filter(
            (e) => e.event_type === 'meeting' && e.start_time.slice(0, 10) === dateStr
          );

          // Tasks submitted or approved on this day
          const dayTasks = tasks.filter((t) => t.submission_date === dateStr);

          // Notes and reminders (private: only user's own notes/reminders)
          const dayNotes = events.filter(
            (e) =>
              (e.event_type === 'appointment' || (e.event_type === 'task_block' && !e.task_id)) &&
              e.start_time.slice(0, 10) === dateStr &&
              (!currentUserId || e.organizer_id === currentUserId)
          );
          const dayReminders = events.filter(
            (e) =>
              e.event_type === 'reminder' &&
              e.start_time.slice(0, 10) === dateStr &&
              (!currentUserId || e.organizer_id === currentUserId)
          );

          // Attendance info for this day per HRMS spec
          const attendanceRecord = attendanceRecords[dateStr];
          const isPastOrToday = dateStr <= todayStr;
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          const isLate = Boolean(
            (attendanceRecord as any)?.is_late ||
            (attendanceRecord?.punch_in && (() => {
              const m = attendanceRecord.punch_in.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
              if (!m) return false;
              let h = parseInt(m[1], 10);
              const min = parseInt(m[2], 10);
              const ampm = m[3]?.toUpperCase();
              if (ampm === 'PM' && h < 12) h += 12;
              if (ampm === 'AM' && h === 12) h = 0;
              return h * 60 + min > 580; // After 09:40 AM
            })())
          );

          const isMissingPunch = !isToday && Boolean(
            attendanceRecord?.status === 'incomplete' ||
            (attendanceRecord?.punch_in && !attendanceRecord?.punch_out)
          );

          // Same rules as before; only the way each status is drawn changed.
          interface Badge { code: string; label: string; chip: string; tint: string; title: string }
          let badge: Badge | null = null;
          if (showAttendance && isCurrentMonth && isPastOrToday) {
            if (isToday && attendanceRecord?.punch_in && !attendanceRecord?.punch_out) {
              badge = { code: 'IN', label: 'Checked in', chip: 'bg-teal-500', tint: 'bg-teal-50/70', title: 'Checked in' };
            } else if (dayHoliday || attendanceRecord?.status === 'holiday') {
              badge = { code: 'H', label: 'Holiday', chip: 'bg-purple-500', tint: 'bg-purple-50/80', title: dayHoliday?.name || 'Holiday' };
            } else if (attendanceRecord?.status === 'weekly_off' || (isWeekend && !attendanceRecord?.punch_in)) {
              badge = { code: 'WO', label: 'Weekly off', chip: 'bg-slate-400', tint: 'bg-slate-50', title: 'Weekly Off' };
            } else if (attendanceRecord?.status === 'leave' || attendanceRecord?.leave_type) {
              badge = { code: 'L', label: 'On leave', chip: 'bg-sky-500', tint: 'bg-sky-50/70', title: `On Leave: ${attendanceRecord?.leave_type || ''}` };
            } else if (isMissingPunch) {
              badge = { code: 'MP', label: 'Missing punch', chip: 'bg-orange-500', tint: 'bg-orange-50/70', title: 'Missing Punch' };
            } else if (attendanceRecord?.status === 'half_day') {
              badge = { code: 'HD', label: 'Half day', chip: 'bg-amber-500', tint: 'bg-amber-50/70', title: 'Half Day' };
            } else if (attendanceRecord?.status === 'absent' || (!attendanceRecord?.punch_in && !isWeekend && isPastOrToday && !isToday)) {
              badge = { code: 'A', label: 'Absent', chip: 'bg-rose-500', tint: 'bg-rose-50/70', title: 'Absent' };
            } else if (attendanceRecord?.status === 'present' || attendanceRecord?.punch_in) {
              badge = { code: 'P', label: 'Present', chip: 'bg-emerald-500', tint: 'bg-emerald-50/60', title: isLate ? 'Present (Late Mark)' : 'Present' };
            }
          }

          const totalItems = dayMeetings.length + dayTasks.length;

          const showLate = badge?.code === 'P' && isLate;

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(date)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectDate(date)}
              aria-label={date.toDateString()}
              className={`group relative flex min-h-[64px] cursor-pointer flex-col rounded-lg border p-1 transition-all duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-[104px] sm:rounded-xl sm:p-2 ${
                !isCurrentMonth
                  ? 'border-transparent bg-slate-50/40 text-slate-300'
                  : isSelected
                    ? 'border-blue-400 bg-blue-50/60 shadow-md ring-2 ring-blue-500/25'
                    : `${badge?.tint ?? (isWeekend ? 'bg-slate-50/70' : 'bg-white')} border-slate-200/70 hover:-translate-y-px hover:border-slate-300 hover:shadow-md`
              }`}
            >
              {/* Day number, holiday name and attendance status */}
              <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all sm:h-7 sm:w-7 sm:text-[13px] ${
                      isToday
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/40'
                        : isSelected
                          ? 'bg-blue-100 font-extrabold text-blue-800'
                          : isCurrentMonth
                            ? isWeekend
                              ? 'text-slate-500'
                              : 'text-slate-800'
                            : 'text-slate-300'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {showAttendance && isCurrentMonth && dayHoliday && (
                    <span
                      title={`${dayHoliday.name} (${dayHoliday.type})`}
                      className="hidden max-w-[88px] truncate rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 xl:inline"
                    >
                      {dayHoliday.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {badge && (
                    <span
                      title={badge.title}
                      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center gap-1 rounded-full px-1 text-[9px] font-bold text-white shadow-sm sm:h-5 sm:px-2 sm:text-[10px] ${badge.chip}`}
                    >
                      {badge.code}
                      <span className="hidden font-semibold 2xl:inline">{badge.label}</span>
                    </span>
                  )}
                  {showLate && (
                    <span title="Late mark" className="hidden rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700 sm:inline">
                      LM
                    </span>
                  )}
                  {showOperations && dayNotes.length > 0 && <span title={`${dayNotes.length} Note(s)`} className="hidden h-2 w-2 rounded-full bg-amber-400 sm:block" />}
                  {showOperations && dayReminders.length > 0 && <span title={`${dayReminders.length} Reminder(s)`} className="hidden h-2 w-2 rounded-full bg-blue-500 sm:block" />}
                </div>
              </div>

              {/* Meetings and tasks as chips (tablets and up) */}
              <div className="mt-1.5 hidden flex-1 space-y-1 overflow-hidden sm:block">
                {showOperations &&
                  dayMeetings.slice(0, 2).map((meeting) => {
                    const mTime = new Date(meeting.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    return (
                      <div
                        key={`m-${meeting.event_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent?.(meeting);
                        }}
                        title={`Meeting: ${meeting.title} (${mTime})`}
                        className="flex cursor-pointer items-center gap-1 truncate rounded-md border-l-[3px] border-blue-500 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-900 transition-colors hover:bg-blue-100"
                      >
                        <Video className="h-2.5 w-2.5 shrink-0 text-blue-600" />
                        <span className="truncate">
                          <span className="mr-1 text-[9px] font-medium text-blue-700">{mTime}</span>
                          {meeting.title}
                        </span>
                      </div>
                    );
                  })}

                {showOperations &&
                  dayTasks.slice(0, Math.max(1, 3 - Math.min(dayMeetings.length, 2))).map((task) => {
                    const isSubmitted = task.stage === 'requested';
                    return (
                      <div
                        key={`t-${task.task_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask?.(task.task_id);
                        }}
                        title={`${task.task_code}: ${task.title} (${isSubmitted ? 'Submitted' : 'Approved'})`}
                        className={`flex cursor-pointer items-center gap-1 truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                          isSubmitted ? 'border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100' : 'border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                        }`}
                      >
                        {isSubmitted ? <Send className="h-2.5 w-2.5 shrink-0 text-amber-600" /> : <Check className="h-2.5 w-2.5 shrink-0 text-emerald-600" />}
                        <span className="truncate">
                          <span className="mr-0.5 font-mono text-[9px] opacity-70">{task.task_code}</span>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}

                {showOperations && totalItems > 3 && <span className="block px-1 text-[10px] font-bold text-slate-500">+{totalItems - 3} more</span>}
              </div>

              {/* On phones the same things are small coloured dots */}
              {showOperations && (
                <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-1 sm:hidden">
                  {dayMeetings.slice(0, 3).map((m) => (
                    <span key={`dm-${m.event_id}`} className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  ))}
                  {dayTasks.slice(0, 3).map((t) => (
                    <span key={`dt-${t.task_id}`} className={`h-1.5 w-1.5 rounded-full ${t.stage === 'requested' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  ))}
                  {dayNotes.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />}
                  {dayReminders.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unified Attendance & Operational Legend */}
      <div className="border-t border-slate-100 bg-slate-50/60 p-2 sm:p-3">
        <CalendarStatusLegend mode={displayMode} />
      </div>
    </div>
  );
};
