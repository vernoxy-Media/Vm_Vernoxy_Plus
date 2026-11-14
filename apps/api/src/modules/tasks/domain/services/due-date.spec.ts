import { parseDueDate, validateDateRange } from './task-rules';

describe('parseDueDate', () => {
  it('accepts a real calendar date, with or without a time after it', () => {
    expect(parseDueDate('2026-11-20')).toBe('2026-11-20');
    expect(parseDueDate(' 2026-11-20T09:30:00.000Z ')).toBe('2026-11-20');
    expect(parseDueDate('2028-02-29')).toBe('2028-02-29');
  });

  it('treats empty, null and undefined as "no due date"', () => {
    expect(parseDueDate('')).toBeNull();
    expect(parseDueDate(null)).toBeNull();
    expect(parseDueDate(undefined)).toBeNull();
  });

  it('rejects anything that is not a real date', () => {
    expect(parseDueDate('2026-02-30')).toBeUndefined();
    expect(parseDueDate('2027-02-29')).toBeUndefined();
    expect(parseDueDate('2026-13-01')).toBeUndefined();
    expect(parseDueDate('20-11-2026')).toBeUndefined();
    expect(parseDueDate('tomorrow')).toBeUndefined();
    expect(parseDueDate(20261120)).toBeUndefined();
  });
});

describe('validateDateRange', () => {
  it('allows the same day, an earlier start, and a missing date', () => {
    expect(validateDateRange('2026-11-10', '2026-11-10')).toBeNull();
    expect(validateDateRange('2026-11-09', '2026-11-10')).toBeNull();
    expect(validateDateRange(null, '2026-11-10')).toBeNull();
    expect(validateDateRange('2026-11-10', undefined)).toBeNull();
  });

  it('refuses a start date after the due date', () => {
    expect(validateDateRange('2026-11-11', '2026-11-10')).toBe('Start date cannot be after the Due Date.');
  });
});
