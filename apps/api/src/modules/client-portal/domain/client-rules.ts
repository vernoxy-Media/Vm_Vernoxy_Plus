import * as crypto from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '@#$%&*';

/** A temporary password the Admin hands over: easy to read out (no 0/O, 1/l/I), always with all four kinds of character. */
export function generateTemporaryPassword(length = 12): string {
  const pick = (set: string) => set[crypto.randomInt(set.length)]!;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

/** Rule for a password the client chooses. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'Use at most 128 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letters and at least one number.';
  return null;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export interface TaskCounts {
  total: number;
  done: number;
}

/** Share of the work that is finished, as a whole percent. A project without tasks has not started (0). */
export function progressPercent(c: TaskCounts): number {
  if (c.total <= 0) return 0;
  return Math.min(100, Math.round((c.done / c.total) * 100));
}

/** A reset code is stored only as a keyed hash. */
export function hashResetCode(secret: string, clientUserId: number, code: string): string {
  return crypto.createHmac('sha256', secret).update(`${clientUserId}:${code}`).digest('hex');
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const RESET_CODE_MINUTES = 15;
export const MAX_RESET_ATTEMPTS = 5;
