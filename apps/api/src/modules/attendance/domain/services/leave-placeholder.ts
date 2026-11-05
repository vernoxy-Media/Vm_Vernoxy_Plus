import { AttendanceDayEntity } from '../entities/attendance-day.entity';

/**
 * Approving a leave stores a placeholder attendance row for each leave day, with a check-in of exactly
 * 09:00:00.000 UTC and no check-out. Anything else on a leave day is a real punch by the employee.
 */
export function isLeavePlaceholderPunch(
  day: Pick<AttendanceDayEntity, 'dayStatus' | 'checkInAt' | 'checkOutAt'> | null | undefined,
): boolean {
  if (!day || day.dayStatus !== 'leave' || day.checkOutAt || !day.checkInAt) return false;
  const t = new Date(day.checkInAt);
  return t.getUTCHours() === 9 && t.getUTCMinutes() === 0 && t.getUTCSeconds() === 0 && t.getUTCMilliseconds() === 0;
}
