import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CalendarHeart,
  Video,
  Clock,
  ExternalLink,
  Users,
  Send,
  Check,
  SlidersHorizontal,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List as ListIcon,
  UserCheck,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import {
  useMyTasksControllerGetTaskDetail,
  useMyTasksControllerMoveStage,
  useMyTasksControllerTrackWorkSession,
  customFetch,
} from '@vernoxy-pulse/api-client';
import type { CalendarFilters } from '../components/CalendarFilterBar';
import { CalendarFilterBar } from '../components/CalendarFilterBar';
import { CalendarKpiCards } from '../components/CalendarKpiCards';
import { TaskMonthGrid } from '../components/TaskMonthGrid';
import { DateDetailSidebar } from '../components/DateDetailSidebar';
import { DailyTimeGrid } from '../components/DailyTimeGrid';
import { WeeklyTimeGrid } from '../components/WeeklyTimeGrid';
import { EventModal } from '../components/EventModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { TaskDrawer } from '../../tasks/components/TaskDrawer';
import { QuickTaskModal } from '../../tasks/components/QuickTaskModal';
import { TaskFormModal } from '../../tasks/components/TaskFormModal';
import { AddHolidayModal } from '../components/AddHolidayModal';
import { useAttendanceDashboard } from '../../attendance/hooks/use-attendance';
import { AttendanceMonthSummaryTiles } from '../../attendance/components/AttendanceMonthSummaryTiles';
import { AttendanceListView } from '../../attendance/components/AttendanceListView';
import type { CalendarEvent, CreateCalendarEventPayload } from '../types';
import {
  fetchCalendarEvents,
  fetchCalendarHolidays,
  fetchCalendarMonthTasks,
  fetchCalendarSummary,
  fetchAssignableEmployees,
  fetchUnscheduledTasks,
  createCalendarEvent,
  deleteCalendarEvent,
  respondCalendarRsvp,
} from '../api/calendar.api';

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role?.role_name?.toLowerCase().includes('admin') ?? false;

  // View Mode: Month | Week | Day | List (HRMS Attendance Spec)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [kpiMode, setKpiMode] = useState<'attendance' | 'tasks'>('attendance');

  // Current viewing date (determines month, week, or day)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Selected date for the detail sidebar (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Local-date helper: formats a Date as YYYY-MM-DD using local timezone (avoids UTC off-by-one)
  const toLocalYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Modals state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);

  // Meeting / Event modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [slotDate, setSlotDate] = useState<string | undefined>();
  const [slotTime, setSlotTime] = useState<string | undefined>();
  const [preselectedTaskId, setPreselectedTaskId] = useState<number | null>(null);

  // Filter state for tasks
  const [filters, setFilters] = useState<CalendarFilters>({
    datePreset: 'all',
    stage: 'all',
    projectId: 'all',
    taskTypeId: 'all',
    priority: 'all',
    selectedEmployeeIds: [],
  });

  // Calculate start & end range depending on viewMode
  const { queryStart, queryEnd, titleRange, monthStr } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);

      const label = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        queryStart: start.toISOString(),
        queryEnd: end.toISOString(),
        titleRange: label,
        monthStr: monthString,
      };
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      const label =
        startMonth === endMonth
          ? `${startMonth} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
          : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;

      return {
        queryStart: start.toISOString(),
        queryEnd: end.toISOString(),
        titleRange: label,
        monthStr: monthString,
      };
    } else {
      // Month view
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const start = new Date(firstDay);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);

      const end = new Date(lastDay);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);

      return {
        queryStart: start.toISOString(),
        queryEnd: end.toISOString(),
        titleRange: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        monthStr: monthString,
      };
    }
  }, [currentDate, viewMode]);

  // Master Data Lookups for Task Types
  const { data: rawTaskTypes = [] } = useLookupsQuery('task_type');
  const taskTypeOptions = useMemo(() => {
    return rawTaskTypes.map((t) => ({ id: t.id, label: t.label }));
  }, [rawTaskTypes]);

  // Assignable employees
  const { data: employees = [] } = useQuery({
    queryKey: ['calendar-assignable-employees'],
    queryFn: fetchAssignableEmployees,
    enabled: isAdmin,
  });

  // Unscheduled tasks for meeting/time-blocking modal
  const { data: unscheduledTasks = [] } = useQuery({
    queryKey: ['calendar-unscheduled-tasks'],
    queryFn: fetchUnscheduledTasks,
  });

  // KPI Summary for Month View
  const {
    data: summary = { tasks_done: 0, tasks_submitted: 0, tasks_approved: 0, total_allocated_minutes: 0 },
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: ['calendar-summary', monthStr, filters.selectedEmployeeIds, filters.projectId],
    queryFn: () =>
      fetchCalendarSummary({
        month: monthStr,
        employee_ids: filters.selectedEmployeeIds,
        project_id: filters.projectId === 'all' ? undefined : filters.projectId,
      }),
  });

  // Month Tasks for Month View (and dynamic week/day KPI calculations)
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: [
      'calendar-month-tasks',
      queryStart,
      queryEnd,
      filters.selectedEmployeeIds,
      filters.projectId,
      filters.stage,
      filters.taskTypeId,
      filters.priority,
    ],
    queryFn: () =>
      fetchCalendarMonthTasks({
        start: queryStart,
        end: queryEnd,
        employee_ids: filters.selectedEmployeeIds,
        project_id: filters.projectId === 'all' ? undefined : filters.projectId,
        stage: filters.stage,
        task_type_id: filters.taskTypeId === 'all' ? undefined : filters.taskTypeId,
        priority: filters.priority === 'all' ? undefined : filters.priority,
      }),
  });

  // Holidays from company_holidays table
  const { data: holidays = [] } = useQuery({
    queryKey: ['calendar-holidays', queryStart, queryEnd],
    queryFn: () => fetchCalendarHolidays(queryStart, queryEnd),
  });

  // Calendar Events (Meetings, Reminders, Notes)
  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', queryStart, queryEnd, filters.selectedEmployeeIds],
    queryFn: () => fetchCalendarEvents(queryStart, queryEnd, filters.selectedEmployeeIds),
  });

  // Formatted holidays for Daily/Weekly grid
  const formattedHolidays = useMemo(() => {
    return holidays.map((h) => ({ date: h.holiday_date, name: h.name }));
  }, [holidays]);

  // Task Detail for Drawer
  const { data: rawDetail, refetch: refetchDetail } = useMyTasksControllerGetTaskDetail(
    selectedTaskId!,
    { query: { enabled: selectedTaskId !== null } },
  );
  const detailData = (rawDetail?.data as any) ?? (rawDetail as any) ?? null;

  // Attendance Dashboard for current viewing month
  const { data: attendanceDashboard } = useAttendanceDashboard(monthStr);

  const attendanceRecordsMap = useMemo(() => {
    const map: Record<string, any> = {};
    (attendanceDashboard?.records || []).forEach((r) => {
      map[r.date] = r;
    });
    return map;
  }, [attendanceDashboard?.records]);

  const moveMutation = useMyTasksControllerMoveStage();
  const trackSessionMutation = useMyTasksControllerTrackWorkSession();

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setIsSidebarOpen(true);
  };

  // Slot click handler for week/day grid
  const handleSlotClick = (dateString: string, timeString: string) => {
    setSlotDate(dateString);
    setSlotTime(timeString);
    setPreselectedTaskId(null);
    setIsCreateModalOpen(true);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      datePreset: 'all',
      stage: 'all',
      projectId: 'all',
      taskTypeId: 'all',
      priority: 'all',
      selectedEmployeeIds: [],
    });
  };

  // Active panel date for right sidebar & slide-out
  const activePanelDate = viewMode === 'day' ? currentDate : selectedDate;
  const activeDateYMD = toLocalYMD(activePanelDate);
  const selectedDayHoliday = holidays.find((h) => h.holiday_date === activeDateYMD);

  // Merge tasks that don't have a calendar_events record into events for Week/Day grid
  const mergedEvents = useMemo(() => {
    const existingTaskIds = new Set(events.filter((e) => e.task_id != null).map((e) => e.task_id));
    const syntheticEvents: CalendarEvent[] = [];

    for (const t of tasks) {
      if (existingTaskIds.has(t.task_id)) continue;
      const subDate = t.submission_date;
      const durationMins = t.allocated_minutes && t.allocated_minutes > 0 ? t.allocated_minutes : 60;
      const startTime = new Date(`${subDate}T14:00:00`);
      const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);

      syntheticEvents.push({
        event_id: -t.task_id,
        event_type: 'task_block',
        title: `[${t.task_code}] ${t.title}`,
        description: null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_all_day: false,
        location: null,
        meeting_link: null,
        status: t.stage === 'completed' ? 'completed' : 'scheduled',
        task_id: t.task_id,
        task_code: t.task_code,
        task_stage: t.stage,
        organizer_id: t.assignees[0]?.emp_id ?? 0,
        organizer_name: t.assignees[0]?.name ?? 'Assigned',
        attendees: [],
        created_at: new Date().toISOString(),
        row_version: 1,
      });
    }

    return [...events, ...syntheticEvents];
  }, [events, tasks]);

  // Day's scheduled meetings and approved/submitted tasks for week/day views
  const scheduledItemsForActiveDay = useMemo(() => {
    if (kpiMode !== 'tasks') return [];
    return mergedEvents.filter((e) => {
      const eDate = toLocalYMD(new Date(e.start_time));
      if (eDate !== activeDateYMD) return false;
      if (e.event_type === 'task_block') {
        return e.task_stage === 'requested' || e.task_stage === 'completed';
      }
      return true;
    });
  }, [mergedEvents, activeDateYMD, kpiMode]);

  // Meeting creation & RSVP handlers
  const handleCreateMeeting = async (payload: CreateCalendarEventPayload) => {
    await createCalendarEvent(payload);
    setIsCreateModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const handleDeleteMeeting = async (eventId: number) => {
    await deleteCalendarEvent(eventId);
    setSelectedEvent(null);
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const handleRsvp = async (eventId: number, status: 'accepted' | 'declined' | 'tentative') => {
    await respondCalendarRsvp(eventId, status);
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  // Notes and reminders handlers
  const handleCreateNote = async (note: string, title?: string) => {
    const d = new Date(selectedDate);
    const start = new Date(d.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(d.setHours(23, 59, 59, 999)).toISOString();

    await createCalendarEvent({
      event_type: 'appointment',
      title: title?.trim() || 'Note',
      description: note.trim(),
      start_time: start,
      end_time: end,
      is_all_day: true,
    });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const handleDeleteNote = async (eventId: number) => {
    await deleteCalendarEvent(eventId);
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const handleCreateReminder = async (title: string, time: string, description?: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    await createCalendarEvent({
      event_type: 'reminder',
      title,
      description: description || undefined,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_all_day: false,
    });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const handleDeleteReminder = async (eventId: number) => {
    await deleteCalendarEvent(eventId);
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  // Task creation handlers
  const handleQuickTaskSubmit = async (data: any) => {
    await customFetch('/api/v1/my-tasks/quick-task', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setIsQuickTaskOpen(false);
    queryClient.invalidateQueries({ queryKey: ['calendar-month-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
  };

  const handleAdminTaskSubmit = async (data: any) => {
    await customFetch('/api/v1/admin/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setIsTaskFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['calendar-month-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
  };

  // Dynamic KPI summary:
  // For month view, uses backend summary API
  // For week and day views, calculates from tasks returned for that exact time window & filters
  const activeSummary = useMemo(() => {
    if (viewMode === 'month') {
      return summary;
    }
    let tasks_submitted = 0;
    let tasks_approved = 0;
    let total_allocated_minutes = 0;

    for (const t of tasks) {
      if (t.stage === 'requested') tasks_submitted++;
      if (t.stage === 'completed') tasks_approved++;
      total_allocated_minutes += t.allocated_minutes || 0;
    }

    return {
      tasks_done: tasks_approved,
      tasks_submitted,
      tasks_approved,
      total_allocated_minutes,
    };
  }, [viewMode, summary, tasks]);

  const isKpiLoading = viewMode === 'month' ? isSummaryLoading : isTasksLoading;

  // Compute KPI context label based on view mode and employee selection
  const kpiContextLabel = useMemo(() => {
    const parts: string[] = [];
    if (viewMode === 'month') {
      parts.push('This month');
    } else if (viewMode === 'week') {
      parts.push('This week');
    } else {
      parts.push('Selected day');
    }
    if (isAdmin && filters.selectedEmployeeIds.length > 0 && filters.selectedEmployeeIds.length < employees.length) {
      parts.push(`· ${filters.selectedEmployeeIds.length} employee(s)`);
    } else if (isAdmin && (filters.selectedEmployeeIds.length === employees.length || filters.selectedEmployeeIds.length === 0)) {
      parts.push('· All employees');
    }
    return parts.join(' ');
  }, [viewMode, filters.selectedEmployeeIds, employees.length, isAdmin]);

  // Active filter count for badge
  const activeFilterCount = [
    filters.datePreset !== 'all',
    filters.stage !== 'all',
    filters.priority !== 'all',
    filters.taskTypeId !== 'all',
    isAdmin && filters.selectedEmployeeIds.length > 0 && filters.selectedEmployeeIds.length < employees.length,
  ].filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col space-y-3 bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/30 p-3 sm:space-y-4 sm:p-6">
      {/* Header: title, month navigator and the main actions */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm sm:rounded-3xl">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500" aria-hidden="true" />

        <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/30">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold leading-tight tracking-tight text-slate-900 sm:text-xl">Calendar</h1>
                <p className="truncate text-xs font-medium text-slate-500">{titleRange}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setSlotDate(toLocalYMD(selectedDate));
                    setIsAddHolidayOpen(true);
                  }}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition hover:brightness-110 active:scale-[0.98] sm:px-4"
                  aria-label="Add holiday"
                >
                  <CalendarHeart className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Holiday</span>
                </button>
              )}
              <button
                onClick={() => (isAdmin ? setIsTaskFormOpen(true) : setIsQuickTaskOpen(true))}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:brightness-110 active:scale-[0.98] sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span>{isAdmin ? 'Add Task' : 'Quick Task'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            {/* Month | Week | Day | List */}
            <div role="tablist" aria-label="Calendar view" className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1 lg:inline-grid lg:w-auto">
              {([
                ['month', 'Month', LayoutGrid],
                ['week', 'Week', CalendarRange],
                ['day', 'Day', CalendarDays],
                ['list', 'List', ListIcon],
              ] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  title={mode === 'list' ? 'Attendance List View' : label}
                  className={`flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                    viewMode === mode ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-slate-100 p-1 lg:flex-none">
                <button onClick={handlePrev} title="Previous" aria-label="Previous" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:shadow-sm">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1 select-none truncate px-3 text-center text-sm font-bold text-slate-800 lg:min-w-[10.5rem] lg:flex-none">{titleRange}</span>
                <button onClick={handleNext} title="Next" aria-label="Next" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:shadow-sm">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button onClick={handleToday} className="h-11 shrink-0 cursor-pointer rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                Today
              </button>

              {kpiMode === 'tasks' && (
                <button
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  aria-label="Filters"
                  className={`relative flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold transition ${
                    isFiltersOpen ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{activeFilterCount}</span>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance | Operations switch and the summary cards */}
      <div className="space-y-3">
        <div role="tablist" aria-label="Calendar data" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:inline-grid sm:w-auto">
          <button
            role="tab"
            aria-selected={kpiMode === 'attendance'}
            onClick={() => setKpiMode('attendance')}
            className={`flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all ${
              kpiMode === 'attendance' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/25' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Attendance
          </button>
          <button
            role="tab"
            aria-selected={kpiMode === 'tasks'}
            onClick={() => setKpiMode('tasks')}
            className={`flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all ${
              kpiMode === 'tasks' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListChecks className="h-4 w-4" />
            Operations &amp; Tasks
          </button>
        </div>

        {kpiMode === 'attendance' ? (
          <AttendanceMonthSummaryTiles records={attendanceDashboard?.records || []} />
        ) : (
          <CalendarKpiCards summary={activeSummary} isLoading={isKpiLoading} contextLabel={kpiContextLabel} />
        )}
      </div>

      {kpiMode === 'tasks' && (
        <CalendarFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
          isAdmin={isAdmin}
          employees={employees}
          taskTypes={taskTypeOptions}
          isOpen={isFiltersOpen}
          onToggle={() => setIsFiltersOpen(false)}
        />
      )}

      {/* MONTH VIEW: Calendar Grid */}
      {viewMode === 'month' && (
        <div className="flex-1 flex flex-col">
          <TaskMonthGrid
            currentMonth={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            tasks={tasks}
            holidays={holidays}
            events={events}
            attendanceRecords={attendanceRecordsMap}
            currentUserId={user?.emp_id}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
            onSelectTask={(taskId) => setSelectedTaskId(taskId)}
            displayMode={kpiMode}
          />
        </div>
      )}

      {/* LIST VIEW: Daily Attendance Rows per BFD */}
      {viewMode === 'list' && (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          {kpiMode === 'attendance' ? (
            <AttendanceListView
              records={attendanceDashboard?.records || []}
              onSelectDate={(d) => {
                const [y, m, day] = d.split('-').map(Number);
                const target = new Date(y, m - 1, day);
                setSelectedDate(target);
                setIsSidebarOpen(true);
              }}
            />
          ) : (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-400 font-medium">
                  No submitted or approved tasks in this period.
                </p>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.task_id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.task_id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        <span className="font-mono text-slate-500 mr-1">{task.task_code}</span>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{task.submission_date}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.stage === 'requested'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {task.stage === 'requested' ? 'Submitted' : 'Approved'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* WEEK & DAY TIME-GRID VIEWS (Meeting & Time-blocking Grid) */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="flex-1 flex gap-4 min-h-[600px] overflow-hidden">
          {/* Left: Time Grid */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            {viewMode === 'week' ? (
              <WeeklyTimeGrid
                currentDate={currentDate}
                events={kpiMode === 'tasks' ? mergedEvents : []}
                holidays={kpiMode === 'attendance' ? formattedHolidays : []}
                attendanceRecords={kpiMode === 'attendance' ? attendanceRecordsMap : {}}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onSlotClick={handleSlotClick}
                onDayClick={(d) => {
                  setCurrentDate(d);
                  setSelectedDate(d);
                  setViewMode('day');
                }}
              />
            ) : (
              <DailyTimeGrid
                currentDate={currentDate}
                events={kpiMode === 'tasks' ? mergedEvents : []}
                holidays={kpiMode === 'attendance' ? formattedHolidays : []}
                attendanceRecords={kpiMode === 'attendance' ? attendanceRecordsMap : {}}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onSlotClick={handleSlotClick}
              />
            )}
          </div>

          {kpiMode === 'tasks' && (
          <div className="w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Scheduled</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activePanelDate.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <CalendarIcon className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {scheduledItemsForActiveDay.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-medium">No events scheduled for this day.</p>
                  <button
                    onClick={() => {
                      setSlotDate(activeDateYMD);
                      setSlotTime('09:00');
                      setIsCreateModalOpen(true);
                    }}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + Schedule meeting
                  </button>
                </div>
              ) : (
                scheduledItemsForActiveDay.map((ev) => {
                  const isTask = ev.event_type === 'task_block';
                  const isSubmitted = isTask && ev.task_stage === 'requested';
                  const isApproved = isTask && (ev.task_stage === 'completed' || ev.status === 'completed');
                  const isMeeting = ev.event_type === 'meeting';
                  const isPast = new Date(ev.end_time) < new Date();

                  const startTime = new Date(ev.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const endTime = new Date(ev.end_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  let cardBg = 'bg-blue-50/60 border-blue-200 hover:border-blue-300';
                  if (isSubmitted) {
                    cardBg = 'bg-amber-50/70 border-amber-200 hover:border-amber-300';
                  } else if (isApproved) {
                    cardBg = 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300';
                  }

                  return (
                    <div
                      key={ev.event_id}
                      onClick={() => {
                        if (ev.task_id) {
                          setSelectedTaskId(ev.task_id);
                        } else {
                          setSelectedEvent(ev);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${cardBg}`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isTask ? (
                            isSubmitted ? (
                              <Send className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            ) : (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            )
                          ) : (
                            <Video className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          )}
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{ev.title}</h4>
                        </div>

                        {isMeeting && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isPast ? 'bg-slate-200/80 text-slate-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isPast ? 'Attended' : 'Scheduled'}
                          </span>
                        )}
                        {isTask && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isSubmitted ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSubmitted ? 'Submitted' : 'Approved'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {startTime} – {endTime}
                        </span>
                      </div>

                      {ev.meeting_link && (
                        <a
                          href={ev.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline pt-0.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Join Meeting
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      {ev.attendees.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <Users className="w-3 h-3" />
                          <span>{ev.attendees.length} attendee(s)</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Slide-out Date Detail Sidebar (Available for any clicked date in Month view) */}
      <DateDetailSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedDate={selectedDate}
        holiday={selectedDayHoliday}
        tasks={tasks}
        events={events}
        displayMode={kpiMode}
        currentUserId={user?.emp_id}
        isAdmin={isAdmin}
        onSelectTask={(taskId) => setSelectedTaskId(taskId)}
        onAddTask={() => setIsTaskFormOpen(true)}
        onAddQuickTask={() => setIsQuickTaskOpen(true)}
        onAddHoliday={() => setIsAddHolidayOpen(true)}
        onScheduleMeeting={() => {
          setSlotDate(toLocalYMD(selectedDate));
          setSlotTime('09:00');
          setPreselectedTaskId(null);
          setIsCreateModalOpen(true);
        }}
        onSelectEvent={(ev) => setSelectedEvent(ev)}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onCreateReminder={handleCreateReminder}
        onDeleteReminder={handleDeleteReminder}
      />

      {/* Meeting Creation Modal */}
      {isCreateModalOpen && (
        <EventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateMeeting}
          defaultDate={slotDate}
          defaultStartTime={slotTime}
          unscheduledTasks={unscheduledTasks}
          preselectedTaskId={preselectedTaskId}
        />
      )}

      {/* Meeting Details Modal (Join Meet, RSVP, Edit, Delete) */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteMeeting}
          onRsvp={handleRsvp}
        />
      )}

      {/* Task Drawer */}
      {selectedTaskId !== null && detailData && (
        <TaskDrawer
          task={detailData}
          isOpen={selectedTaskId !== null}
          isAdmin={isAdmin}
          onClose={() => setSelectedTaskId(null)}
          onEdit={() => {}}
          onMoveStage={async (taskId, stage, reason) => {
            await moveMutation.mutateAsync({
              id: taskId,
              data: { target_stage: stage as any, hold_reason: reason },
            });
            refetchDetail();
            queryClient.invalidateQueries({ queryKey: ['calendar-month-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
          }}
          onTrackWorkSession={async (taskId, action) => {
            await trackSessionMutation.mutateAsync({
              id: taskId,
              data: { action: action as any },
            });
            refetchDetail();
            queryClient.invalidateQueries({ queryKey: ['calendar-month-tasks'] });
          }}
        />
      )}

      {/* Employee Quick Task Modal */}
      {isQuickTaskOpen && (
        <QuickTaskModal
          isOpen={isQuickTaskOpen}
          onClose={() => setIsQuickTaskOpen(false)}
          onSubmit={handleQuickTaskSubmit}
          taskTypeOptions={taskTypeOptions}
        />
      )}

      {/* Admin Full Task Modal */}
      {isTaskFormOpen && (
        <TaskFormModal
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAdminTaskSubmit}
          employees={employees}
          taskTypeOptions={taskTypeOptions}
          title="Create New Task"
        />
      )}

      {/* Admin Add Holiday Modal */}
      {isAddHolidayOpen && (
        <AddHolidayModal
          isOpen={isAddHolidayOpen}
          onClose={() => setIsAddHolidayOpen(false)}
          defaultDate={toLocalYMD(selectedDate)}
        />
      )}
    </div>
  );
};

export default CalendarPage;
