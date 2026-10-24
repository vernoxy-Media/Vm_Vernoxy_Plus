/**
 * Formats a Date object into YYYY-MM-DD using local timezone
 * (avoids UTC offset day-shift bugs caused by .toISOString().slice(0, 10))
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local timezone
 */
export function getLocalToday(): string {
  return formatLocalDate(new Date());
}

export type CalendarDayType =
  | 'holiday'
  | 'complete'
  | 'today'
  | 'upcoming'
  | 'weekoff'
  | 'leave'
  | 'absent';

export interface CalendarDayClassification {
  type: CalendarDayType;
  label: string;
  holidayName?: string;
  leaveType?: string;
  badgeBg: string;
  badgeText: string;
  headerBorder: string;
  columnBg: string;
}

export interface AttendanceDayRecordInfo {
  date: string;
  status?: string;
  status_label?: string;
  holiday_name?: string | null;
  leave_type?: string | null;
  punch_in?: string | null;
  production_seconds?: number;
}

export function classifyCalendarDay(
  date: Date,
  attendanceRecord?: AttendanceDayRecordInfo | null,
  holidaysList: Array<{ date: string; name: string }> = [],
  workingDays: number[] = [1, 2, 3, 4, 5] // 1=Mon, ..., 5=Fri
): CalendarDayClassification {
  const dateStr = formatLocalDate(date);
  const todayStr = getLocalToday();
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // 1. Today Check (Mark BLUE)
  if (dateStr === todayStr) {
    return {
      type: 'today',
      label: 'Today',
      badgeBg: 'bg-blue-600 text-white shadow-xs',
      badgeText: 'text-blue-600',
      headerBorder: 'border-t-4 border-t-blue-600',
      columnBg: 'bg-blue-50/25',
    };
  }

  // 2. Holiday Check (Mark RED)
  const holidayMatch = holidaysList.find((h) => h.date === dateStr);
  if (attendanceRecord?.status === 'holiday' || holidayMatch) {
    const holidayName = attendanceRecord?.holiday_name || holidayMatch?.name || 'Holiday';
    return {
      type: 'holiday',
      label: holidayName,
      holidayName,
      badgeBg: 'bg-rose-500 text-white shadow-xs',
      badgeText: 'text-rose-600',
      headerBorder: 'border-t-4 border-t-rose-500',
      columnBg: 'bg-rose-50/30',
    };
  }

  // 3. Weekoff Check (Sat / Sun or non-working days)
  const isWorkingDay =
    workingDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek) || workingDays.includes(dayOfWeek);
  if (attendanceRecord?.status === 'weekly_off' || !isWorkingDay) {
    return {
      type: 'weekoff',
      label: 'Week Off',
      badgeBg: 'bg-slate-200 text-slate-600',
      badgeText: 'text-slate-500',
      headerBorder: 'border-t-4 border-t-slate-300',
      columnBg: 'bg-slate-50/50',
    };
  }

  // 4. On Leave Check (Mark ORANGE)
  if (attendanceRecord?.status === 'leave') {
    const leaveLabel = attendanceRecord.leave_type || 'On Leave';
    return {
      type: 'leave',
      label: leaveLabel,
      leaveType: attendanceRecord.leave_type || undefined,
      badgeBg: 'bg-orange-500 text-white shadow-xs',
      badgeText: 'text-orange-600',
      headerBorder: 'border-t-4 border-t-orange-500',
      columnBg: 'bg-orange-50/20',
    };
  }

  // 5. Present / Complete Attendance (Mark GREEN)
  const isPresent =
    attendanceRecord?.status === 'present' ||
    attendanceRecord?.status === 'half_day' ||
    attendanceRecord?.status === 'short' ||
    attendanceRecord?.status === 'incomplete' ||
    (Boolean(attendanceRecord?.punch_in) && dateStr < todayStr);

  if (isPresent) {
    return {
      type: 'complete',
      label: 'Done',
      badgeBg: 'bg-emerald-600 text-white shadow-xs',
      badgeText: 'text-emerald-700',
      headerBorder: 'border-t-4 border-t-emerald-500',
      columnBg: 'bg-emerald-50/15',
    };
  }

  // 6. Past Working Day Without Attendance -> Absent (Mark ORANGE)
  if (dateStr < todayStr && isWorkingDay) {
    return {
      type: 'absent',
      label: 'Absent',
      badgeBg: 'bg-orange-500 text-white shadow-xs',
      badgeText: 'text-orange-600',
      headerBorder: 'border-t-4 border-t-orange-500',
      columnBg: 'bg-orange-50/20',
    };
  }

  // 7. Upcoming Working Day (Mark GREY)
  return {
    type: 'upcoming',
    label: 'Upcoming',
    badgeBg: 'bg-slate-200 text-slate-700',
    badgeText: 'text-slate-500',
    headerBorder: 'border-t-4 border-t-slate-300',
    columnBg: 'bg-white',
  };
}

/**
 * Formats a Date or date string to strict DD-MM-YYYY format per BFD GEN-02
 */
export function formatDisplayDate(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}-${m}-${y}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
  }
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Formats duration in minutes to standard BFD representation: "Xh Ym"
 */
export function formatMinutes(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

