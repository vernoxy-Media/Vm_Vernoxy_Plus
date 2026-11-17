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

/**
 * A Billing Cycle (kept in the database, managed by the Admin). The rules below only use its kind
 * and length, never its name, so any cycle the Admin adds (8 Months, Half-yearly ...) just works.
 *   FIXED     one term lasts `months`
 *   TERM      the term's own dates give the length, in whole years of 2 or more (Multi-year)
 *   ONE_TIME  no renewal, not part of the yearly cost
 */
export const BILLING_CYCLE_KINDS = ['FIXED', 'TERM', 'ONE_TIME'] as const;
export type BillingCycleKind = (typeof BILLING_CYCLE_KINDS)[number];
export interface BillingCycle {
  name: string;
  kind: BillingCycleKind;
  months: number | null;
}
export const MAX_CYCLE_MONTHS = 120;

/** Why a cycle's kind / length is not valid, or null. */
export function billingCycleProblem(kind: string, months: number | null | undefined): string | null {
  if (!(BILLING_CYCLE_KINDS as readonly string[]).includes(kind)) return 'Choose how long one term of this cycle lasts.';
  if (kind !== 'FIXED') return null;
  if (!Number.isInteger(months) || (months as number) < 1 || (months as number) > MAX_CYCLE_MONTHS) {
    return `Enter the length in whole months, from 1 to ${MAX_CYCLE_MONTHS}.`;
  }
  return null;
}

/** Months a new term of this cycle is expected to last (to suggest the expiry date); null = no expiry. */
export function suggestedTermMonths(cycle: BillingCycle | null | undefined): number | null {
  if (!cycle || cycle.kind === 'ONE_TIME') return null;
  return cycle.kind === 'FIXED' ? cycle.months : 24;
}

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
export function termCycleMismatch(cycle: BillingCycle | null | undefined, start: string, expiry: string | null): string | null {
  if (!cycle || !expiry || cycle.kind === 'ONE_TIME') return null;
  const months = termMonths(start, expiry);
  const ok = cycle.kind === 'FIXED' ? months === cycle.months : months >= 24 && months % 12 === 0;
  if (ok) return null;
  const len = months >= 12 && months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'}`;
  return `The term is ${len} but the Billing Cycle is ${cycle.name}. Save anyway?`;
}

/** Up to 2 decimals. */
export function hasTwoDecimalsAtMost(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

/**
 * Yearly cost of one term (BFD 12 Part 3): a fixed cycle of N months costs cost x 12 / N a year
 * (Monthly x 12, Quarterly x 4, Yearly x 1); Multi-year is the cost / number of years of its dates.
 * One-time purchases are not part of the yearly cost.
 */
export function yearlyCost(cycle: BillingCycle | null | undefined, cost: number, start?: string | null, expiry?: string | null): number {
  const c = Number(cost) || 0;
  if (!cycle) return 0;
  if (cycle.kind === 'FIXED') return cycle.months ? (c * 12) / cycle.months : 0;
  if (cycle.kind === 'TERM') {
    const years = start && expiry ? Math.max(1, Math.round(termMonths(start, expiry) / 12)) : 2;
    return c / years;
  }
  return 0;
}

/** Cost per seat of one cycle. */
export function costPerSeat(cost: number, seats: number | null | undefined): number | null {
  return seats && seats > 0 ? Math.round((Number(cost) / seats) * 100) / 100 : null;
}
