import type {
  AttendanceDashboardResponse,
  DayDetailResponse,
  TodayAttendanceData,
  DayRecord,
  TimelineEvent,
  DayAttendanceStatus,
} from '../types/attendance.types';

const STORAGE_KEY_TODAY = 'vernoxy_attendance_today_v1';

export function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTimeAmPm(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getDefaultTodayData(): TodayAttendanceData {
  const now = new Date();
  // Matching the mockup: punched in at 10:00 AM, working for ~3.45 hrs (12420s), break 1.21 hrs (4356s)
  const punchInTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const break1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
  const break1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
  const break2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0);
  const break2End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 21, 0);

  const timeline: TimelineEvent[] = [
    {
      id: 'evt-1',
      type: 'punch_in',
      timestamp: punchInTime.toISOString(),
      display_time: '10:00 AM',
      label: 'Punch In at 10:00 AM',
    },
    {
      id: 'evt-2',
      type: 'break_start',
      timestamp: break1Start.toISOString(),
      display_time: '11:00 AM',
      label: 'Punch Out at 11:00 AM',
    },
    {
      id: 'evt-3',
      type: 'break_end',
      timestamp: break1End.toISOString(),
      display_time: '11:30 AM',
      label: 'Punch In at 11:30 AM',
    },
    {
      id: 'evt-4',
      type: 'break_start',
      timestamp: break2Start.toISOString(),
      display_time: '01:30 PM',
      label: 'Punch Out at 01:30 PM',
    },
    {
      id: 'evt-5',
      type: 'break_end',
      timestamp: break2End.toISOString(),
      display_time: '02:21 PM',
      label: 'Punch In at 02:21 PM',
    },
  ];

  return {
    date: getTodayDateStr(),
    company_timezone: 'Asia/Kolkata',
    state: 'working',
    special_status: null,
    special_status_reason: null,
    punched_in_at: punchInTime.toISOString(),
    punched_out_at: null,
    worked_seconds: 12420, // 3h 27m ~ 3.45 hrs
    break_seconds: 4356, // 1h 12m ~ 1.21 hrs
    target_seconds: 28800, // 8h
    active_break_start: null,
    server_now: new Date().toISOString(),
    timeline,
  };
}

export function getStoredTodayData(): TodayAttendanceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TODAY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure date matches today
      if (parsed.date === getTodayDateStr()) {
        parsed.server_now = new Date().toISOString();
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  const def = getDefaultTodayData();
  saveStoredTodayData(def);
  return def;
}

export function saveStoredTodayData(data: TodayAttendanceData): void {
  try {
    localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function updateMockPunchAction(
  action: 'punch_in' | 'punch_out' | 'break_start' | 'break_end',
  breakType?: string,
  reason?: string
): { success: boolean; today: TodayAttendanceData; message?: string } {
  const current = getStoredTodayData();
  const now = new Date();
  const nowIso = now.toISOString();
  const nowFormatted = formatTimeAmPm(now);

  if (action === 'punch_in') {
    if (current.state === 'working') {
      const err: any = new Error(`Already punched in at ${formatTimeAmPm(new Date(current.punched_in_at || nowIso))}`);
      err.status = 409;
      err.today = current;
      throw err;
    }
    current.state = 'working';
    current.punched_in_at = current.punched_in_at || nowIso;
    current.timeline.push({
      id: `evt-${Date.now()}`,
      type: 'punch_in',
      timestamp: nowIso,
      display_time: nowFormatted,
      label: `Punch In at ${nowFormatted}`,
    });
  } else if (action === 'punch_out') {
    current.state = 'done';
    current.punched_out_at = nowIso;
    current.active_break_start = null;
    current.active_break_type = null;
    current.active_break_reason = null;
    current.timeline.push({
      id: `evt-${Date.now()}`,
      type: 'punch_out',
      timestamp: nowIso,
      display_time: nowFormatted,
      label: `Punch Out at ${nowFormatted}`,
    });
  } else if (action === 'break_start') {
    current.state = 'on_break';
    current.active_break_start = nowIso;
    current.active_break_type = breakType || 'Break';
    current.active_break_reason = reason || null;
    current.timeline.push({
      id: `evt-${Date.now()}`,
      type: 'break_start',
      timestamp: nowIso,
      display_time: nowFormatted,
      label: `${breakType || 'Break'} started at ${nowFormatted}${reason ? ` (${reason})` : ''}`,
      break_type: breakType || null,
      reason: reason || null,
    });
  } else if (action === 'break_end') {
    current.state = 'working';
    if (current.active_break_start) {
      const diffSec = Math.round((now.getTime() - new Date(current.active_break_start).getTime()) / 1000);
      current.break_seconds += Math.max(0, diffSec);
      current.active_break_start = null;
    }
    current.active_break_type = null;
    current.active_break_reason = null;
    current.timeline.push({
      id: `evt-${Date.now()}`,
      type: 'break_end',
      timestamp: nowIso,
      display_time: nowFormatted,
      label: `Break ended at ${nowFormatted}`,
    });
  }

  current.server_now = nowIso;
  saveStoredTodayData(current);
  return { success: true, today: current };
}

export function generateMockDashboard(selectedMonth: string): AttendanceDashboardResponse {
  // selectedMonth format: "YYYY-MM"
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr || '2026', 10);
  const month = parseInt(monthStr || '10', 10); // 1-indexed

  const todayStr = getTodayDateStr();
  const todayData = getStoredTodayData();

  // Number of days in selected month
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const currentMonthDate = new Date();
  const isCurrentMonth =
    currentMonthDate.getFullYear() === year && currentMonthDate.getMonth() + 1 === month;
  const maxDay = isCurrentMonth ? currentMonthDate.getDate() : totalDaysInMonth;

  const records: DayRecord[] = [];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let scheduledDays = 0;
  let presentDays = 0;
  let leaveDays = 0;
  let absentDays = 0;
  let totalWorkingSec = 0;
  let totalBreakSec = 0;

  for (let d = 1; d <= maxDay; d++) {
    const dayDate = new Date(year, month - 1, d);
    const dayOfWeekIdx = dayDate.getDay();
    const dayOfWeek = weekdays[dayOfWeekIdx] || 'Mon';
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;

    const isWeekend = dayOfWeekIdx === 0 || dayOfWeekIdx === 6;

    let status: DayAttendanceStatus = 'present';
    let statusLabel = 'Present';
    let punchIn: string | null = '10:00 AM';
    let punchOut: string | null = '07:00 PM';
    let prodSec = 9 * 3600; // 9 hrs
    let breakSec = 1 * 3600; // 1 hr
    let holidayName: string | null = null;
    let leaveType: string | null = null;
    let canCorrection = false;

    if (isToday) {
      status = 'present';
      statusLabel = 'Working';
      punchIn = '10:00 AM';
      punchOut = todayData.state === 'done' ? '07:00 PM' : null;
      prodSec = todayData.worked_seconds;
      breakSec = todayData.break_seconds;
      presentDays++;
      scheduledDays++;
      totalWorkingSec += prodSec;
      totalBreakSec += breakSec;
    } else if (isWeekend) {
      status = 'weekly_off';
      statusLabel = 'Weekly Off';
      punchIn = null;
      punchOut = null;
      prodSec = 0;
      breakSec = 0;
    } else if (d === 2 || d === 15) {
      // Holiday
      status = 'holiday';
      statusLabel = 'Holiday';
      holidayName = d === 2 ? 'Gandhi Jayanti' : 'Company Festival Day';
      punchIn = null;
      punchOut = null;
      prodSec = 0;
      breakSec = 0;
    } else if (d === 5) {
      // Leave
      status = 'leave';
      statusLabel = 'Leave';
      leaveType = 'Casual Leave';
      punchIn = null;
      punchOut = null;
      prodSec = 0;
      breakSec = 0;
      leaveDays += 1;
      scheduledDays++;
    } else if (d === 8) {
      // Half day
      status = 'half_day';
      statusLabel = 'Half Day';
      punchIn = '10:00 AM';
      punchOut = '02:30 PM';
      prodSec = 4.5 * 3600;
      breakSec = 0.5 * 3600;
      presentDays += 0.5;
      leaveDays += 0.5;
      scheduledDays++;
      totalWorkingSec += prodSec;
      totalBreakSec += breakSec;
    } else if (d === 11) {
      // Incomplete day
      status = 'incomplete';
      statusLabel = 'Incomplete';
      punchIn = '10:15 AM';
      punchOut = null;
      prodSec = 3 * 3600;
      breakSec = 45 * 60;
      canCorrection = true;
      scheduledDays++;
      totalWorkingSec += prodSec;
      totalBreakSec += breakSec;
    } else if (d === 12) {
      // Absent
      status = 'absent';
      statusLabel = 'Absent';
      punchIn = null;
      punchOut = null;
      prodSec = 0;
      breakSec = 0;
      absentDays++;
      scheduledDays++;
      canCorrection = true;
    } else {
      // Regular present day
      status = 'present';
      statusLabel = 'Present';
      punchIn = '10:00 AM';
      punchOut = '07:00 PM';
      prodSec = 9 * 3600;
      breakSec = 1 * 3600;
      presentDays++;
      scheduledDays++;
      totalWorkingSec += prodSec;
      totalBreakSec += breakSec;
    }

    records.push({
      date: dateStr,
      day_of_week: dayOfWeek,
      punch_in: punchIn,
      punch_out: punchOut,
      production_seconds: prodSec,
      break_seconds: breakSec,
      status,
      status_label: statusLabel,
      holiday_name: holidayName,
      leave_type: leaveType,
      can_request_correction: canCorrection,
      is_today: isToday,
    });
  }

  // Reverse so newest date is first, or keep chronologically ordered 1 to N?
  // In the mockup table: S.No 1 is 19 Feb, S.No 2 is 20 Feb... chronologically ordered!
  // And Totals row at the bottom.

  const remainingDays = Math.max(0, 22 - (presentDays + leaveDays + absentDays));

  return {
    today: todayData,
    statistics: {
      today: {
        worked_hours: 3.45,
        target_hours: 8,
      },
      this_week: {
        worked_hours: 28,
        target_hours: 40,
      },
      this_month: {
        worked_hours: 90,
        target_hours: 160,
      },
      remaining: {
        worked_hours: 70,
        target_hours: 160,
      },
      overtime_hours: 5,
    },
    month_summary: {
      scheduled_days: scheduledDays || 22,
      present_days: Math.round(presentDays * 10) / 10,
      total_working_seconds: totalWorkingSec,
      total_break_seconds: totalBreakSec,
      leave_days: leaveDays,
      absent_days: absentDays,
      remaining_days: remainingDays,
    },
    records,
  };
}

export function getMockDayDetail(dateStr: string): DayDetailResponse {
  const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

  if (isWeekend) {
    return {
      date: dateStr,
      status: 'weekly_off',
      status_label: 'Weekly Off',
      punched_in_at: null,
      punched_out_at: null,
      production_seconds: 0,
      break_seconds: 0,
      timeline: [],
      breaks: [],
      leave_holiday_info: 'Scheduled Weekend / Weekly Off',
      can_request_correction: false,
    };
  }

  return {
    date: dateStr,
    status: 'present',
    status_label: 'Present',
    punched_in_at: `${dateStr}T10:00:00.000Z`,
    punched_out_at: `${dateStr}T19:00:00.000Z`,
    production_seconds: 8 * 3600,
    break_seconds: 1 * 3600,
    timeline: [
      {
        id: 't-1',
        type: 'punch_in',
        timestamp: `${dateStr}T10:00:00.000Z`,
        display_time: '10:00 AM',
        label: 'Punched in at 10:00 AM',
      },
      {
        id: 't-2',
        type: 'break_start',
        timestamp: `${dateStr}T13:00:00.000Z`,
        display_time: '01:00 PM',
        label: 'Break started at 01:00 PM',
      },
      {
        id: 't-3',
        type: 'break_end',
        timestamp: `${dateStr}T14:00:00.000Z`,
        display_time: '02:00 PM',
        label: 'Break ended at 02:00 PM (1h 00m)',
      },
      {
        id: 't-4',
        type: 'punch_out',
        timestamp: `${dateStr}T19:00:00.000Z`,
        display_time: '07:00 PM',
        label: 'Punched out at 07:00 PM',
      },
    ],
    breaks: [
      {
        start: '01:00 PM',
        end: '02:00 PM',
        duration_seconds: 3600,
      },
    ],
    leave_holiday_info: null,
    can_request_correction: true,
  };
}
