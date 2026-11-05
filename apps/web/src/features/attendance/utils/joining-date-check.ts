import type { AttendanceSettingsResponse } from '../types/attendance.types';

export interface JoiningDateCheckResult {
  isWeeklyOff: boolean;
  weeklyOffDayName?: string;
  isHoliday: boolean;
  holidayName?: string;
  message: string;
  severity: 'warning' | 'ok';
}

export function checkJoiningDateConflict(
  dateStr?: string | null,
  settings?: AttendanceSettingsResponse | null,
  shiftId?: string | number | null
): JoiningDateCheckResult | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Check Weekly Off days
  let weeklyOffDays: number[] = [0]; // default Sunday
  if (shiftId && shiftId !== 'default' && settings?.shifts) {
    const s = settings.shifts.find((sh) => String(sh.shift_id) === String(shiftId));
    if (s?.weekly_off_days && s.weekly_off_days.length > 0) {
      weeklyOffDays = s.weekly_off_days;
    }
  } else if (settings?.default_shift?.weekly_off_days && settings.default_shift.weekly_off_days.length > 0) {
    weeklyOffDays = settings.default_shift.weekly_off_days;
  } else if (settings?.working_days && settings.working_days.length > 0) {
    weeklyOffDays = [0, 1, 2, 3, 4, 5, 6].filter((day) => !settings.working_days.includes(day));
  }

  const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);
  const weeklyOffDayName = dayNames[dayOfWeek];

  // Check Company Holiday
  const formattedYMD = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const holiday = settings?.holidays?.find((h) => {
    const hDate = h.date?.includes('T') ? h.date.split('T')[0] : h.date;
    return hDate === formattedYMD;
  });
  const isHoliday = Boolean(holiday);
  const holidayName = holiday?.name;

  if (isWeeklyOff && isHoliday) {
    return {
      isWeeklyOff: true,
      weeklyOffDayName,
      isHoliday: true,
      holidayName,
      message: `Selected date is both a Weekly Off (${weeklyOffDayName}) and a Company Holiday (${holidayName}).`,
      severity: 'warning',
    };
  }

  if (isWeeklyOff) {
    return {
      isWeeklyOff: true,
      weeklyOffDayName,
      isHoliday: false,
      message: `Selected date is a Weekly Off (${weeklyOffDayName}).`,
      severity: 'warning',
    };
  }

  if (isHoliday) {
    return {
      isWeeklyOff: false,
      isHoliday: true,
      holidayName,
      message: `Selected date is a Company Holiday (${holidayName}).`,
      severity: 'warning',
    };
  }

  // Normal working day: do not return message (show notice only for conflicts)
  return null;
}

