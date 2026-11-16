import { istDate, parsePunch, requiredPunches, validateRegularization } from './regularization-rules';

// 16 Nov 2026, 12:00 in India
const NOW = new Date('2026-11-16T06:30:00.000Z');
const at = (hhmm: string, date = '2026-11-14') => new Date(`${date}T${hhmm}:00+05:30`);

const base = { workDate: '2026-11-14', requestType: 'Missing Clock Out', currentCheckIn: at('09:40'), currentCheckOut: null, requestedCheckIn: null, requestedCheckOut: at('18:30') };

describe('requiredPunches', () => {
  it('asks for the punch the type names', () => {
    expect(requiredPunches('Missing Clock In')).toEqual({ checkIn: true, checkOut: false });
    expect(requiredPunches('Missing Clock Out')).toEqual({ checkIn: false, checkOut: true });
    expect(requiredPunches('Both Clock In & Out')).toEqual({ checkIn: true, checkOut: true });
    expect(requiredPunches('Full Day Missed')).toEqual({ checkIn: true, checkOut: true });
  });
});

describe('parsePunch', () => {
  it('keeps a full date-time as it is', () => {
    expect(parsePunch('2026-11-14T04:00:00.000Z', '2026-11-14')?.toISOString()).toBe('2026-11-14T04:00:00.000Z');
  });
  it('reads a bare time as Indian time, not UTC', () => {
    expect(parsePunch('09:30', '2026-11-14')?.toISOString()).toBe('2026-11-14T04:00:00.000Z');
    expect(parsePunch('9:30', '2026-11-14')?.toISOString()).toBe('2026-11-14T04:00:00.000Z');
  });
  it('gives null for nothing or nonsense', () => {
    expect(parsePunch('--', '2026-11-14')).toBeNull();
    expect(parsePunch('', '2026-11-14')).toBeNull();
    expect(parsePunch('lunch', '2026-11-14')).toBeNull();
  });
});

describe('istDate', () => {
  it('is already the next day in India late in the UTC evening', () => {
    expect(istDate(new Date('2026-11-15T19:00:00.000Z'))).toBe('2026-11-16');
    expect(istDate(new Date('2026-11-15T17:00:00.000Z'))).toBe('2026-11-15');
  });
});

describe('validateRegularization', () => {
  it('accepts a missing check-out with a later time', () => {
    expect(validateRegularization(base, NOW)).toBeNull();
  });

  it('accepts a forgotten check-in on its own', () => {
    const r = { ...base, requestType: 'Missing Clock In', currentCheckIn: null, currentCheckOut: at('18:00'), requestedCheckIn: at('09:30'), requestedCheckOut: null };
    expect(validateRegularization(r, NOW)).toBeNull();
  });

  it('accepts a day with no punches when both are given', () => {
    const r = { ...base, requestType: 'Both Clock In & Out', currentCheckIn: null, requestedCheckIn: at('09:30'), requestedCheckOut: at('18:30') };
    expect(validateRegularization(r, NOW)).toBeNull();
  });

  it('asks for the punch the type needs', () => {
    expect(validateRegularization({ ...base, requestType: 'Missing Clock In', requestedCheckIn: null }, NOW)?.code).toBe('CHECK_IN_REQUIRED');
    expect(validateRegularization({ ...base, requestedCheckOut: null }, NOW)?.code).toBe('CHECK_OUT_REQUIRED');
    expect(validateRegularization({ ...base, requestType: 'Both Clock In & Out', requestedCheckIn: null }, NOW)?.code).toBe('CHECK_IN_REQUIRED');
  });

  it('refuses a check-out that is not after the check-in, also against the one already recorded', () => {
    expect(validateRegularization({ ...base, requestedCheckOut: at('09:00') }, NOW)?.code).toBe('OUT_BEFORE_IN');
    const forgottenIn = { ...base, requestType: 'Missing Clock In', currentCheckIn: null, currentCheckOut: at('13:00'), requestedCheckIn: at('14:00'), requestedCheckOut: null };
    expect(validateRegularization(forgottenIn, NOW)?.code).toBe('OUT_BEFORE_IN');
  });

  it('refuses a future date and a future time', () => {
    expect(validateRegularization({ ...base, workDate: '2026-11-20' }, NOW)?.code).toBe('FUTURE_DATE');
    const today = { ...base, workDate: '2026-11-16', currentCheckIn: at('09:40', '2026-11-16'), requestedCheckOut: at('23:30', '2026-11-16') };
    expect(validateRegularization(today, NOW)?.code).toBe('FUTURE_TIME');
  });

  it('allows today as the date', () => {
    const today = { ...base, workDate: '2026-11-16', currentCheckIn: at('09:40', '2026-11-16'), requestedCheckOut: at('11:30', '2026-11-16') };
    expect(validateRegularization(today, NOW)).toBeNull();
  });

  it('refuses a check-out alone when the day has no check-in at all', () => {
    expect(validateRegularization({ ...base, currentCheckIn: null }, NOW)?.code).toBe('CHECK_IN_UNKNOWN');
  });

  it('refuses a bad date and a request with no time at all', () => {
    expect(validateRegularization({ ...base, workDate: 'tomorrow' }, NOW)?.code).toBe('INVALID_DATE');
    expect(validateRegularization({ ...base, requestType: 'Custom type', requestedCheckOut: null }, NOW)?.code).toBe('TIME_REQUIRED');
  });
});
