import React from 'react';
import { Video, CheckSquare, Check } from 'lucide-react';
import type { CalendarEvent } from '../types';
import { formatLocalDate, classifyCalendarDay, AttendanceDayRecordInfo } from '../date-utils';

interface MonthGridProps {
  currentMonth: Date;
  events: CalendarEvent[];
  attendanceRecords?: Record<string, AttendanceDayRecordInfo>;
  holidays?: Array<{ date: string; name: string }>;
  workingDays?: number[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onDayClick?: (date: Date) => void;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  currentMonth,
  events,
  attendanceRecords = {},
  holidays = [],
  workingDays = [1, 2, 3, 4, 5],
  onSelectEvent,
  onSlotClick,
  onDayClick,
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // First day of month & days in month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday start
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

  return (
    <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden select-none">
      {/* Week Day Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div key={day} className="py-2.5 text-center text-[11px] font-bold text-slate-500 border-r border-slate-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* 6x7 Month Grid */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-slate-100">
        {cells.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = formatLocalDate(date);
          const record = attendanceRecords[dateStr];
          const classification = classifyCalendarDay(date, record, holidays, workingDays);

          const dayEvents = events.filter((ev) => {
            return formatLocalDate(new Date(ev.start_time)) === dateStr;
          });

          return (
            <div
              key={idx}
              onClick={() => onSlotClick(dateStr, '09:00')}
              className={`min-h-[105px] p-2 flex flex-col justify-between hover:bg-slate-50/80 cursor-pointer transition-colors ${
                !isCurrentMonth ? 'opacity-40 bg-slate-50/50' : classification.columnBg
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    onClick={(e) => {
                      if (onDayClick) {
                        e.stopPropagation();
                        onDayClick(date);
                      }
                    }}
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                      onDayClick ? 'hover:ring-2 hover:ring-blue-400 cursor-pointer' : ''
                    } ${isCurrentMonth ? classification.badgeBg : 'text-slate-400'}`}
                    title={onDayClick ? `Open Day view for ${date.toLocaleDateString()}` : undefined}
                  >
                    {date.getDate()}
                  </span>
                  {/* Status chip */}
                  {isCurrentMonth && (
                    <>
                      {classification.type === 'holiday' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 max-w-[70px] truncate shadow-2xs" title={classification.holidayName || 'Holiday'}>
                          {classification.holidayName || 'Holiday'}
                        </span>
                      )}
                      {classification.type === 'complete' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5" /> Done
                        </span>
                      )}
                      {classification.type === 'leave' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 max-w-[70px] truncate shadow-2xs" title={classification.label}>
                          {classification.label}
                        </span>
                      )}
                      {classification.type === 'absent' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 shadow-2xs">
                          Absent
                        </span>
                      )}
                      {classification.type === 'today' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 shadow-2xs">
                          Today
                        </span>
                      )}
                      {classification.type === 'weekoff' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
                          Off
                        </span>
                      )}
                    </>
                  )}
                </div>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 px-1 py-0.5 rounded bg-slate-100">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-1 mt-1 overflow-y-auto max-h-[65px]">
                {dayEvents.slice(0, 3).map((ev) => {
                  const isTask = ev.event_type === 'task_block';
                  return (
                    <div
                      key={ev.event_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 shadow-2xs hover:opacity-90 transition-opacity ${
                        isTask
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isTask ? (
                        <CheckSquare className="w-2.5 h-2.5 shrink-0 text-purple-600" />
                      ) : (
                        <Video className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                      )}
                      <span className="truncate">{ev.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] font-semibold text-slate-400 block px-1">
                    +{dayEvents.length - 3} more
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
