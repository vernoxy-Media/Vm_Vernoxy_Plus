/**
 * Pure calculation helpers for Attendance Detail Modal matching HRMS specification.
 */

/**
 * Calculates late minutes based on Shift start time and late grace period.
 * Default: Shift start 09:30 AM (570 mins), Grace period 15 mins (up to 09:45 AM = 585 mins).
 * Shown only when check-in is after the grace period cutoff, else 0 min.
 * Example: Check-in 09:11 AM -> 0 min (on time)
 * Example: Check-in 09:40 AM -> 0 min (within 15m grace)
 * Example: Check-in 09:48 AM -> 18 min
 */
export function calculateLateByMinutes(
  checkInTimeStr?: string | null,
  shiftStartMinutes = 570, // 09:30 AM
  lateGraceMinutes = 15,   // 15 min grace
): number {
  if (!checkInTimeStr || checkInTimeStr === '--') return 0;
  const timeMatch = checkInTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return 0;
  let hr = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase();
  if (ampm === 'PM' && hr < 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  const totalMin = hr * 60 + min;
  const cutoff = shiftStartMinutes + lateGraceMinutes;
  return totalMin > cutoff ? totalMin - shiftStartMinutes : 0;
}

/**
 * Calculates early exit minutes based on Shift end time and early exit grace period.
 * Default: Shift end 18:30 / 06:30 PM (1110 mins), Early exit grace period 15 mins (cutoff 18:15 = 1095 mins).
 * 0 min when check-out is on/after cutoff.
 * Example: Check-out 06:36 PM -> 0 min
 * Example: Check-out 06:20 PM -> 0 min (within 15m grace)
 * Example: Check-out 05:30 PM -> 60 min early exit
 */
export function calculateEarlyExitMinutes(
  checkOutTimeStr?: string | null,
  shiftEndMinutes = 1110, // 18:30 / 06:30 PM
  earlyGraceMinutes = 15,  // 15 min grace
): number {
  if (!checkOutTimeStr || checkOutTimeStr === '--') return 0;
  const timeMatch = checkOutTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return 0;
  let hr = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase();
  if (ampm === 'PM' && hr < 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  const totalMin = hr * 60 + min;
  const cutoff = shiftEndMinutes - earlyGraceMinutes;
  return totalMin < cutoff ? shiftEndMinutes - totalMin : 0;
}
