/**
 * Pure calculation helpers for Attendance Detail Modal matching HRMS specification.
 */

/**
 * Calculates late minutes based on General Shift (starts at 09:30 AM = 570 mins)
 * Grace period is 10 minutes (up to 09:40 AM = 580 mins).
 * Shown only when check-in is after the grace period, else 0 min.
 * Example from spec: Check-in 09:48 AM -> 18 min
 */
export function calculateLateByMinutes(checkInTimeStr?: string | null): number {
  if (!checkInTimeStr || checkInTimeStr === '--') return 0;
  const timeMatch = checkInTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return 0;
  let hr = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase();
  if (ampm === 'PM' && hr < 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  const totalMin = hr * 60 + min;
  // Shift start 09:30 AM (570 min). Grace 10 min -> 580 min (09:40 AM)
  return totalMin > 580 ? totalMin - 570 : 0;
}

/**
 * Calculates early exit minutes based on General Shift (ends at 18:30 / 06:30 PM = 1110 mins).
 * 0 min when not early.
 * Example from spec: Check-out 07:05 PM -> 0 min
 */
export function calculateEarlyExitMinutes(checkOutTimeStr?: string | null): number {
  if (!checkOutTimeStr || checkOutTimeStr === '--') return 0;
  const timeMatch = checkOutTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return 0;
  let hr = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase();
  if (ampm === 'PM' && hr < 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  const totalMin = hr * 60 + min;
  // Shift end 18:30 (1110 min)
  return totalMin < 1110 ? 1110 - totalMin : 0;
}
