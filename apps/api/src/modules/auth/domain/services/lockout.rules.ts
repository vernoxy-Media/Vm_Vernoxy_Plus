export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const GENERIC_AUTH_ERROR_MESSAGE = 'Invalid email or password';

// Precomputed valid Argon2id hash for timing equalization on unknown/inactive accounts
export const DUMMY_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQxMjM0NTY3OA$qSg4j6R7sH8tU9vW0xY1zA2bC3dE4fG5hI6jK7lM8nO';

export function isAccountLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > now.getTime();
}

export function calculateLockoutUntil(failedAttempts: number, now: Date = new Date()): Date | null {
  if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }
  return null;
}
