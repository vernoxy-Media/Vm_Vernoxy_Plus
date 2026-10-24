import React from 'react';
import { Check, Send, Video } from 'lucide-react';
import type { CalendarMonthTaskItem, CalendarHolidayItem, CalendarEvent } from '../types';

interface TaskMonthGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: CalendarMonthTaskItem[];
  holidays: CalendarHolidayItem[];
  events: CalendarEvent[]; // for meetings, notes & reminders
  currentUserId?: number;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectTask?: (taskId: number) => void;
}

export const TaskMonthGrid: React.FC<TaskMonthGridProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  tasks,
  holidays,
  events,
  currentUserId,
  onSelectEvent,
  onSelectTask,
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
    <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden select-none">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-[11px] font-bold text-slate-500 border-r border-slate-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 6x7 Grid */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-slate-100 min-h-[580px]">
        {cells.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = toLocalYMD(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;

          // Holiday on this day
          const dayHoliday = holidays.find((h) => h.holiday_date === dateStr);

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

          const totalItems = dayMeetings.length + dayTasks.length;

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`p-1.5 sm:p-2 flex flex-col justify-between hover:bg-slate-50/80 cursor-pointer transition-all ${
                !isCurrentMonth ? 'bg-slate-50/40 text-slate-300' : 'bg-white text-slate-800'
              } ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' : ''}`}
            >
              {/* Day Number and Badges */}
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isSelected
                        ? 'bg-blue-100 text-blue-800 font-black'
                        : isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {/* Holiday Purple Badge */}
                  {isCurrentMonth && dayHoliday && (
                    <span
                      title={`${dayHoliday.name} (${dayHoliday.type})`}
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 truncate max-w-[80px]"
                    >
                      {dayHoliday.name}
                    </span>
                  )}
                </div>

                {/* Notes & Reminders Indicator Dots */}
                <div className="flex items-center gap-1">
                  {dayNotes.length > 0 && (
                    <span title={`${dayNotes.length} Note(s)`} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                  {dayReminders.length > 0 && (
                    <span
                      title={`${dayReminders.length} Reminder(s)`}
                      className="w-1.5 h-1.5 rounded-full bg-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Items List (Meetings + Tasks) */}
              <div className="mt-1 space-y-1 overflow-y-hidden flex-1">
                {/* Meetings (Blue) */}
                {dayMeetings.slice(0, 2).map((meeting) => {
                  const mTime = new Date(meeting.start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                  return (
                    <div
                      key={`m-${meeting.event_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(meeting);
                      }}
                      title={`Meeting: ${meeting.title} (${mTime})`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 shadow-2xs border bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Video className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        <span className="text-[9px] font-semibold text-blue-700 mr-1">{mTime}</span>
                        {meeting.title}
                      </span>
                    </div>
                  );
                })}

                {/* Tasks (Submitted: Amber, Approved: Green) */}
                {dayTasks
                  .slice(0, Math.max(1, 3 - Math.min(dayMeetings.length, 2)))
                  .map((task) => {
                    const isSubmitted = task.stage === 'requested';
                    return (
                      <div
                        key={`t-${task.task_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask?.(task.task_id);
                        }}
                        title={`${task.task_code}: ${task.title} (${isSubmitted ? 'Submitted' : 'Approved'})`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 shadow-2xs border transition-colors cursor-pointer ${
                          isSubmitted
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {isSubmitted ? (
                          <Send className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        ) : (
                          <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">
                          <span className="font-mono text-[9px] opacity-75 mr-0.5">{task.task_code}</span>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}

                {totalItems > 3 && (
                  <span className="text-[9px] font-bold text-slate-500 block px-1">
                    +{totalItems - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
