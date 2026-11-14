/**
 * Pure rules of the Software License BFD (Section 4 Parts 2-4, Section 7).
 * Kept free of Nest/Prisma so they can be unit-tested.
 */

export const LICENSE_TYPES = [
  'Subscription · Per User',
  'Subscription · Organisation',
  'Perpetual · Per User',
  'Perpetual · Organisation',
  'Free / Open Source',
  'Trial',
] as const;

export const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Yearly', 'Multi-year', 'One-time'] as const;

export const MAX_SEATS = 10_000;
export const MAX_COST = 1_00_00_000;
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

/** Per User and Trial types count seats (BFD 4 Part 2). */
export function seatsCounted(type: string): boolean {
  return type.endsWith('Per User') || type === 'Trial';
}

/** Subscription and Trial expire; Perpetual and Free never do. */
export function needsExpiry(type: string): boolean {
  return type.startsWith('Subscription') || type === 'Trial';
}

/** Billing Cycle is asked for Subscription and Perpetual; hidden for Free and Trial. */
export function needsBillingCycle(type: string): boolean {
  return type.startsWith('Subscription') || type.startsWith('Perpetual');
}

/** Free and Trial always cost 0. */
export function mustBeFree(type: string): boolean {
  return type === 'Free / Open Source' || type === 'Trial';
}

export function todayStr(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60_000);
  return ist.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function fmtDate(d: string): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${String(day).padStart(2, '0')} ${mon} ${y}`;
}

/** Number of whole months in a term from Start to Expiry (Expiry is the last valid day). */
export function termMonths(start: string, expiry: string): number {
  const days = daysBetween(start, expiry) + 1;
  return Math.round(days / 30.4375);
}

/**
 * "Term and cycle" confirmation (BFD 4 Part 4): returns a message when the term length
 * does not match the Billing Cycle, else null.
 */
export function termCycleMismatch(cycle: string | null, start: string, expiry: string | null): string | null {
  if (!cycle || !expiry || cycle === 'One-time') return null;
  const months = termMonths(start, expiry);
  const expected: Record<string, (m: number) => boolean> = {
    Monthly: (m) => m === 1,
    Quarterly: (m) => m === 3,
    Yearly: (m) => m === 12,
    'Multi-year': (m) => m >= 24 && m % 12 === 0,
  };
  const ok = expected[cycle];
  if (!ok || ok(months)) return null;
  const len = months >= 12 && months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'}`;
  return `The term is ${len} but the Billing Cycle is ${cycle}. Save anyway?`;
}

/** Up to 2 decimals. */
export function hasTwoDecimalsAtMost(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

/**
 * Yearly cost of one term (BFD 12 Part 3): Monthly x 12, Quarterly x 4, Yearly x 1,
 * Multi-year / number of years. One-time purchases are not part of the yearly cost.
 */
export function yearlyCost(cycle: string | null | undefined, cost: number, start?: string | null, expiry?: string | null): number {
  const c = Number(cost) || 0;
  switch (cycle) {
    case 'Monthly':
      return c * 12;
    case 'Quarterly':
      return c * 4;
    case 'Yearly':
      return c;
    case 'Multi-year': {
      const years = start && expiry ? Math.max(1, Math.round(termMonths(start, expiry) / 12)) : 2;
      return c / years;
    }
    default:
      return 0;
  }
}

/** Cost per seat of one cycle. */
export function costPerSeat(cost: number, seats: number | null | undefined): number | null {
  return seats && seats > 0 ? Math.round((Number(cost) / seats) * 100) / 100 : null;
}
