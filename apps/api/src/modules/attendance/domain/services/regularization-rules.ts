/**
 * Rules for a regularization (missing or wrong punch) request, kept apart from HTTP and the database so they can be tested.
 * Times are real instants (ISO), the way every other punch is stored.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Which punch each request type asks the employee to give. */
export function requiredPunches(requestType: string): { checkIn: boolean; checkOut: boolean } {
  switch (requestType) {
    case 'Missing Clock In':
      return { checkIn: true, checkOut: false };
    case 'Missing Clock Out':
      return { checkIn: false, checkOut: true };
    case 'Both Clock In & Out':
    case 'Incorrect Time':
    case 'Full Day Missed':
    case 'On Duty / Field Work':
      return { checkIn: true, checkOut: true };
    default:
      // A type the Admin added in Master Data: ask for at least one punch
      return { checkIn: false, checkOut: false };
  }
}

/** "2026-11-16" for the Indian day of `now` (the company works in IST). */
export function istDate(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * A time that arrives as "HH:mm" is read as Indian time. A full date-time is taken as it is.
 * Returns null for anything that is not a time.
 */
export function parsePunch(value: string | null | undefined, workDate: string): Date | null {
  if (!value || value === '--') return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) return direct;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const hh = m[1].padStart(2, '0');
  const combined = new Date(`${workDate}T${hh}:${m[2]}:${m[3] ?? '00'}+05:30`);
  return Number.isNaN(combined.getTime()) ? null : combined;
}

export interface RegularizationCheck {
  workDate: string;
  requestType: string;
  currentCheckIn: Date | null;
  currentCheckOut: Date | null;
  requestedCheckIn: Date | null;
  requestedCheckOut: Date | null;
}

/** Returns the first thing wrong with the request, or null when it can be raised. */
export function validateRegularization(i: RegularizationCheck, now: Date = new Date()): { code: string; message: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.workDate)) return { code: 'INVALID_DATE', message: 'Please choose a valid attendance date.' };
  if (i.workDate > istDate(now)) return { code: 'FUTURE_DATE', message: 'A regularization cannot be raised for a future date.' };

  const need = requiredPunches(i.requestType);
  if (need.checkIn && !i.requestedCheckIn) return { code: 'CHECK_IN_REQUIRED', message: 'Please enter the correct check-in time.' };
  if (need.checkOut && !i.requestedCheckOut) return { code: 'CHECK_OUT_REQUIRED', message: 'Please enter the correct check-out time.' };
  if (!i.requestedCheckIn && !i.requestedCheckOut) return { code: 'TIME_REQUIRED', message: 'Please enter the check-in or the check-out time to correct.' };

  // The in and out that will be on the day once approved: the corrected one, else the one already recorded
  const inAt = i.requestedCheckIn ?? i.currentCheckIn;
  const outAt = i.requestedCheckOut ?? i.currentCheckOut;
  // A day always starts with a check-in: a check-out alone cannot be the whole record
  if (!inAt) return { code: 'CHECK_IN_UNKNOWN', message: 'There is no check-in on this day. Choose "Both Clock In & Out" and give both times.' };
  if (inAt && outAt && outAt.getTime() <= inAt.getTime()) {
    return { code: 'OUT_BEFORE_IN', message: 'The check-out must be later than the check-in.' };
  }
  const limit = now.getTime() + 2 * 60 * 1000;
  if ((i.requestedCheckIn && i.requestedCheckIn.getTime() > limit) || (i.requestedCheckOut && i.requestedCheckOut.getTime() > limit)) {
    return { code: 'FUTURE_TIME', message: 'A punch cannot be in the future.' };
  }
  return null;
}
