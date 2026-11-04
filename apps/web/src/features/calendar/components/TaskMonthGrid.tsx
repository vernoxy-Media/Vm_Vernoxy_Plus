import type { Layers } from './CalendarRail';
import React from 'react';
import { CalendarHeart, Check, Flag, PhoneCall, Plus, Send, StickyNote, Target, Video, Users, X } from 'lucide-react';
import { followUpLabel, isFollowUp } from '../follow-up';
import type { CalendarMonthTaskItem, CalendarHolidayItem, CalendarEvent, CalendarDueItem } from '../types';
import type { LeaveCalendarItem } from '@/features/leave/hooks/use-leave';
import type { DayRecord } from '../../attendance/types/attendance.types';
import { CalendarStatusLegend } from './CalendarStatusLegend';
import { WEEKDAY_LABELS, weekdayIndex } from '../date-utils';

interface TaskMonthGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** Clicking an empty part of a day (tablet and up) starts a new event on that day. */
  onCreateOnDate?: (date: Date) => void;
  tasks: CalendarMonthTaskItem[];
  holidays: CalendarHolidayItem[];
  events: CalendarEvent[]; // for meetings, notes & reminders
  leaves?: LeaveCalendarItem[];
  attendanceRecords?: Record<string, DayRecord>;
  currentUserId?: number;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectTask?: (taskId: number) => void;
  displayMode?: 'attendance' | 'tasks' | 'leaves';
  /** Tasks due and project deadlines, shown on their day when the Due dates layer is on. */
  dueItems?: CalendarDueItem[];
  onSelectProject?: (projectId: number) => void;
  /** When given, each layer is shown or hidden on its own instead of following displayMode. */
  layers?: Layers;
}

export const TaskMonthGrid: React.FC<TaskMonthGridProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  onCreateOnDate,
  tasks,
  holidays,
  events,
  leaves = [],
  attendanceRecords = {},
  currentUserId,
  onSelectEvent,
  onSelectTask,
  displayMode = 'attendance',
  layers,
  dueItems = [],
  onSelectProject,
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = weekdayIndex(firstDayOfMonth);
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
  const [openDay, setOpenDay] = React.useState<string | null>(null);

  /** Everything on one day, for the "+N more" list. Follows the same calendar checkboxes as the cells. */
  const agendaFor = (dateStr: string) => {
    const meetings = layers ? layers.meetings : displayMode === 'tasks';
    const followUps = layers ? layers.followups : displayMode === 'tasks';
    const taskItems = layers ? layers.tasks : displayMode === 'tasks';
    const due = layers ? layers.deadlines : false;
    const sameDay = (iso: string) => toLocalYMD(new Date(iso)) === dateStr;
    const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const rows: Array<{ key: string; when: string; sort: string; icon: React.ReactNode; tone: string; title: string; sub?: string; open?: () => void }> = [];

    const holiday = holidays.find((h) => h.holiday_date === dateStr);
    if (holiday) rows.push({ key: 'h', when: 'All day', sort: '0', icon: <CalendarHeart className="h-4 w-4" />, tone: 'bg-green-700 text-white', title: holiday.name, sub: holiday.type });
    if (due) {
      for (const d of dueItems.filter((x) => x.due_date === dateStr)) {
        rows.push({
          key: `d-${d.kind}-${d.id}`,
          when: 'Due',
          sort: d.kind === 'project' ? '0a' : '0b',
          icon: d.kind === 'project' ? <Target className="h-4 w-4" /> : <Flag className="h-4 w-4" />,
          tone: d.kind === 'project' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700',
          title: d.kind === 'project' ? `Deadline: ${d.title}` : d.title,
          sub: d.kind === 'project' ? d.code : [d.code, d.project_name, d.priority].filter(Boolean).join(' · '),
          open: () => (d.kind === 'project' ? onSelectProject?.(d.id) : onSelectTask?.(d.id)),
        });
      }
    }
    for (const e of events.filter((x) => sameDay(x.start_time))) {
      const own = !currentUserId || e.organizer_id === currentUserId;
      if (isFollowUp(e)) {
        if (followUps) rows.push({ key: `e-${e.event_id}`, when: clock(e.start_time), sort: `1${e.start_time}`, icon: <PhoneCall className="h-4 w-4" />, tone: 'bg-rose-100 text-rose-700', title: followUpLabel(e.title), sub: 'Sales follow-up', open: () => onSelectEvent?.(e) });
      } else if (e.event_type === 'meeting') {
        if (meetings) rows.push({ key: `e-${e.event_id}`, when: e.is_all_day ? 'All day' : clock(e.start_time), sort: e.is_all_day ? '0c' : `1${e.start_time}`, icon: <Video className="h-4 w-4" />, tone: 'bg-blue-100 text-blue-700', title: e.title, sub: e.attendees.length ? `${e.attendees.length} guest${e.attendees.length > 1 ? 's' : ''}` : undefined, open: () => onSelectEvent?.(e) });
      } else if (meetings && own && (e.event_type === 'appointment' || e.event_type === 'reminder' || (e.event_type === 'task_block' && !e.task_id))) {
        rows.push({ key: `e-${e.event_id}`, when: clock(e.start_time), sort: `1${e.start_time}`, icon: <StickyNote className="h-4 w-4" />, tone: 'bg-amber-100 text-amber-700', title: e.title, sub: e.event_type === 'reminder' ? 'Reminder' : 'Note', open: () => onSelectEvent?.(e) });
      }
    }
    if (taskItems) {
      for (const t of tasks.filter((x) => x.submission_date === dateStr)) {
        const submitted = t.stage === 'requested';
        rows.push({ key: `t-${t.task_id}`, when: submitted ? 'Submitted' : 'Approved', sort: '2', icon: submitted ? <Send className="h-4 w-4" /> : <Check className="h-4 w-4" />, tone: submitted ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700', title: t.title, sub: [t.task_code, t.project_name].filter(Boolean).join(' · '), open: () => onSelectTask?.(t.task_id) });
      }
    }
    return rows.sort((a, b) => a.sort.localeCompare(b.sort));
  };
  const selectedStr = toLocalYMD(selectedDate);

  return (
    <div className="flex flex-1 select-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white py-2">
        {WEEKDAY_LABELS.map((day) => (
          <div key={day} className={`text-center text-[10px] font-bold tracking-wider sm:text-[11px] text-slate-500`}>
            <span className="sm:hidden">{day[0]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid flex-1 auto-rows-fr grid-cols-7 gap-px bg-slate-200">
        {cells.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = toLocalYMD(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;

          // Holiday on this day
          const dayHoliday = holidays.find((h) => h.holiday_date === dateStr);
          const showAttendance = layers ? layers.attendance : displayMode === 'attendance';
          const showMeetings = layers ? layers.meetings : displayMode === 'tasks';
          const showTaskItems = layers ? layers.tasks : displayMode === 'tasks';
          const showDue = layers ? layers.deadlines : false;
          const showFollowUps = layers ? layers.followups : displayMode === 'tasks';
          const showLeaves = layers ? layers.leaves : displayMode === 'leaves';
          const dayLeaves = leaves.filter((l) => {
            const fromStr = l.from_date.slice(0, 10);
            const toStr = l.to_date.slice(0, 10);
            return dateStr >= fromStr && dateStr <= toStr;
          });

          // Meetings scheduled or attended on this day
          const dayMeetings = events.filter(
            (e) => e.event_type === 'meeting' && toLocalYMD(new Date(e.start_time)) === dateStr
          );

          // Tasks due and project deadlines on this day
          const dayDue = showDue ? dueItems.filter((d) => d.due_date === dateStr) : [];

          // Sales follow-ups booked for this day
          const dayFollowUps = events
            .filter((e) => isFollowUp(e) && toLocalYMD(new Date(e.start_time)) === dateStr)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          // Tasks submitted or approved on this day
          const dayTasks = tasks.filter((t) => t.submission_date === dateStr);

          // Notes and reminders (private: only user's own notes/reminders)
          const dayNotes = events.filter(
            (e) =>
              !isFollowUp(e) &&
              (e.event_type === 'appointment' || (e.event_type === 'task_block' && !e.task_id)) &&
              toLocalYMD(new Date(e.start_time)) === dateStr &&
              (!currentUserId || e.organizer_id === currentUserId)
          );
          const dayReminders = events.filter(
            (e) =>
              e.event_type === 'reminder' &&
              toLocalYMD(new Date(e.start_time)) === dateStr &&
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

          const shownTasks = showTaskItems ? Math.min(dayTasks.length, Math.max(1, 3 - Math.min(dayMeetings.length, 2))) : 0;
          const shownItems =
            (showMeetings ? Math.min(2, dayMeetings.length) : 0) + (showFollowUps ? Math.min(2, dayFollowUps.length) : 0) + Math.min(2, dayDue.length) + shownTasks;
          const totalItems = (showMeetings ? dayMeetings.length : 0) + (showFollowUps ? dayFollowUps.length : 0) + dayDue.length + (showTaskItems ? dayTasks.length : 0);

          const showLate = badge?.code === 'P' && isLate;

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => (onCreateOnDate && window.innerWidth >= 640 ? onCreateOnDate(date) : onSelectDate(date))}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectDate(date)}
              aria-label={date.toDateString()}
              className={`group relative flex min-h-[64px] cursor-pointer flex-col p-1 transition-colors duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:min-h-[110px] sm:p-1.5 ${
                !isCurrentMonth
                  ? 'bg-slate-50 text-slate-300'
                  : isSelected
                    ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-300'
                    : 'bg-white hover:bg-slate-50'
              }`}
            >
              {/* Day number, holiday name and attendance status */}
              <div className="relative flex items-start justify-center">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(date);
                    }}
                    title="Open this day"
                    className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium transition-all hover:ring-4 hover:ring-slate-200 sm:h-7 sm:min-w-7 sm:text-[13px] ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isSelected
                          ? 'bg-blue-100 font-extrabold text-blue-800'
                          : isCurrentMonth
                            ? isWeekend
                              ? 'text-slate-500'
                              : 'text-slate-800'
                            : 'text-slate-300'
                    }`}
                  >
                    {date.getDate() === 1 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : date.getDate()}
                  </span>

                  {showAttendance && !layers && isCurrentMonth && dayHoliday && (
                    <span
                      title={`${dayHoliday.name} (${dayHoliday.type})`}
                      className="hidden max-w-[88px] truncate rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 xl:inline"
                    >
                      {dayHoliday.name}
                    </span>
                  )}

                  {/* Team Leaves Count Badge in Header */}
                  {isCurrentMonth && dayLeaves.length > 0 && (
                    <span
                      title={`${dayLeaves.length} on leave: ${dayLeaves.map((l) => l.employee_name).join(', ')}`}
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5 shadow-2xs ${
                        showLeaves
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Users className="w-2.5 h-2.5" />
                      {dayLeaves.length}
                    </span>
                  )}
                </div>

                <div className="absolute right-0 top-0 flex items-center gap-1">
                  {showMeetings && dayNotes.length > 0 && <span title={`${dayNotes.length} Note(s)`} className="hidden h-2 w-2 rounded-full bg-amber-400 sm:block" />}
                  {showMeetings && dayReminders.length > 0 && <span title={`${dayReminders.length} Reminder(s)`} className="hidden h-2 w-2 rounded-full bg-blue-500 sm:block" />}
                </div>
              </div>

              {/* Meetings and tasks as chips (tablets and up) */}
              <div className="mt-1.5 hidden flex-1 space-y-1 overflow-hidden sm:block">
                {badge && (
                  <div title={badge.title} className="flex items-center gap-1.5 truncate text-[11px] text-slate-600">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${badge.chip}`} aria-hidden />
                    <span className="truncate">
                      <span className="font-semibold">{badge.code}</span>
                      <span className="hidden lg:inline"> · {badge.label}</span>
                      {showLate && <span className="text-orange-600"> · Late</span>}
                    </span>
                  </div>
                )}
                {layers && isCurrentMonth && dayHoliday && (
                  <div title={`${dayHoliday.name} (${dayHoliday.type})`} className="truncate rounded-md bg-green-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {dayHoliday.name}
                  </div>
                )}
                {/* Team leaves on this day */}
                {showLeaves &&
                  dayLeaves.slice(0, 3).map((l, lIdx) => (
                    <div
                      key={`leave-${l.request_id}-${lIdx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(date);
                      }}
                      title={`${l.employee_name} (${l.department_name || 'General'}) - ${l.leave_type_name} (${l.duration.replace('_', ' ')})`}
                      className={`flex cursor-pointer items-center justify-between gap-1 truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        l.is_paid ? 'border-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100' : 'border-rose-500 bg-rose-50 text-rose-900 hover:bg-rose-100'
                      }`}
                    >
                      <span className="truncate">{l.employee_name}</span>
                      <span className="ml-1 shrink-0 text-[9px] font-semibold opacity-80">{l.leave_type_name.split(' ')[0]}</span>
                    </div>
                  ))}
                {showLeaves && dayLeaves.length > 3 && <span className="block px-1 text-[9px] font-bold text-slate-500">+{dayLeaves.length - 3} more</span>}
                {showMeetings &&
                  dayMeetings.slice(0, 2).map((meeting) => {
                    const mTime = meeting.is_all_day ? '' : new Date(meeting.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

                {dayDue
                  .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'project' ? -1 : 1))
                  .slice(0, 2)
                  .map((d) => (
                    <div
                      key={`due-${d.kind}-${d.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (d.kind === 'task') onSelectTask?.(d.id);
                        else onSelectProject?.(d.id);
                      }}
                      title={d.kind === 'project' ? `Project deadline: ${d.title} (${d.code})` : `Due: ${d.code} ${d.title}${d.project_name ? ` · ${d.project_name}` : ''} (${d.priority})`}
                      className={`flex cursor-pointer items-center gap-1 truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        d.kind === 'project' ? 'border-violet-700 bg-violet-600 text-white hover:bg-violet-700' : 'border-violet-500 bg-violet-50 text-violet-900 hover:bg-violet-100'
                      }`}
                    >
                      {d.kind === 'project' ? <Target className="h-2.5 w-2.5 shrink-0" /> : <Flag className="h-2.5 w-2.5 shrink-0 text-violet-600" />}
                      <span className="truncate">
                        {d.kind === 'project' ? 'Deadline: ' : <span className="mr-0.5 font-mono text-[9px] opacity-70">{d.code}</span>}
                        {d.title}
                      </span>
                    </div>
                  ))}
                {showFollowUps &&
                  dayFollowUps.slice(0, 2).map((f) => {
                    const t = new Date(f.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    return (
                      <div
                        key={`f-${f.event_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent?.(f);
                        }}
                        title={`Follow-up: ${followUpLabel(f.title)} (${t})`}
                        className="flex cursor-pointer items-center gap-1 truncate rounded-md border-l-[3px] border-rose-500 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-900 transition-colors hover:bg-rose-100"
                      >
                        <PhoneCall className="h-2.5 w-2.5 shrink-0 text-rose-600" />
                        <span className="truncate">
                          <span className="mr-1 text-[9px] font-medium text-rose-700">{t}</span>
                          {followUpLabel(f.title)}
                        </span>
                      </div>
                    );
                  })}
                {showTaskItems &&
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

                {totalItems > shownItems && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDay(dateStr);
                    }}
                    className="block rounded px-1 text-left text-[10px] font-bold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  >
                    +{totalItems - shownItems} more
                  </button>
                )}
              </div>

              {/* On phones the same things are small coloured dots */}
              <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-1 sm:hidden">
                {badge && <span className={`h-1.5 w-1.5 rounded-full ${badge.chip}`} />}
                {dayDue.slice(0, 3).map((d) => <span key={`dd-${d.kind}-${d.id}`} className="h-1.5 w-1.5 rounded-full bg-violet-600" />)}
                {layers && isCurrentMonth && dayHoliday && <span className="h-1.5 w-1.5 rounded-full bg-green-700" />}
                {showMeetings && dayMeetings.slice(0, 3).map((m) => <span key={`dm-${m.event_id}`} className="h-1.5 w-1.5 rounded-full bg-blue-500" />)}
                {showFollowUps && dayFollowUps.slice(0, 3).map((f) => <span key={`df-${f.event_id}`} className="h-1.5 w-1.5 rounded-full bg-rose-500" />)}
                {showTaskItems && dayTasks.slice(0, 3).map((t) => <span key={`dt-${t.task_id}`} className={`h-1.5 w-1.5 rounded-full ${t.stage === 'requested' ? 'bg-amber-500' : 'bg-emerald-500'}`} />)}
                {showMeetings && dayNotes.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />}
                {showMeetings && dayReminders.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Attendance & Operational Legend */}
      <div className="border-t border-slate-100 bg-slate-50/60 p-2 sm:p-3">
        <CalendarStatusLegend mode={displayMode} />
      </div>

      {openDay && (() => {
        const day = new Date(`${openDay}T00:00:00`);
        const rows = agendaFor(openDay);
        return (
          <div className="msg-fade fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setOpenDay(null)}>
            <div role="dialog" aria-modal="true" aria-label={day.toDateString()} className="msg-modal flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:max-w-sm sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{day.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                  <p className="text-2xl font-normal text-slate-900">{day.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</p>
                </div>
                <button type="button" aria-label="Close" onClick={() => setOpenDay(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-2">
                {rows.length === 0 && <li className="px-2 py-6 text-center text-sm text-slate-500">Nothing on this day.</li>}
                {rows.map((r) => (
                  <li key={r.key}>
                    <button
                      type="button"
                      disabled={!r.open}
                      onClick={() => {
                        setOpenDay(null);
                        r.open?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${r.tone}`}>{r.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
                        {r.sub && <span className="block truncate text-xs text-slate-500">{r.sub}</span>}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-slate-500">{r.when}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {onCreateOnDate && (
                <div className="border-t border-slate-100 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      const d = day;
                      setOpenDay(null);
                      onCreateOnDate(d);
                    }}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4 text-blue-600" /> Create event on this day
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
