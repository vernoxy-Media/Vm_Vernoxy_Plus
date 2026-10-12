import {
  isAccountLocked,
  calculateLockoutUntil,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from './lockout.rules';

describe('lockout.rules', () => {
  it('detects if account is locked based on timestamp', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const future = new Date('2026-10-10T12:10:00Z');
    const past = new Date('2026-10-10T11:50:00Z');

    expect(isAccountLocked(future, now)).toBe(true);
    expect(isAccountLocked(past, now)).toBe(false);
    expect(isAccountLocked(null, now)).toBe(false);
  });

  it('calculates lockout until date when attempts reach limit', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const lock = calculateLockoutUntil(5, now);
    expect(lock).not.toBeNull();
    expect(lock?.getTime()).toBe(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);

    const noLock = calculateLockoutUntil(4, now);
    expect(noLock).toBeNull();
  });
});
