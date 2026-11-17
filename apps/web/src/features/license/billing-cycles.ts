/**
 * Billing Cycles come from Settings -> License Settings (the API's list), never from the code.
 * A cycle says how long one term lasts:
 *   FIXED     `months` per term (Monthly 1, Quarterly 3, 8 Months 8, Yearly 12 ...)
 *   TERM      the term's own dates give the length, in whole years (Multi-year)
 *   ONE_TIME  no renewal and no expiry
 */
export type BillingCycleKind = 'FIXED' | 'TERM' | 'ONE_TIME';

export interface BillingCycle {
  cycle_id: number;
  name: string;
  kind: BillingCycleKind;
  months: number | null;
  display_order: number;
  is_active: boolean;
  /** Terms that use it: its length is locked and it can only be deactivated. */
  in_use: number;
  /** Software licenses that use it on any term. */
  licenses: number;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Months one new term is expected to last (Multi-year suggests 2 years); null = no expiry. */
export function termMonthsOf(cycle: Pick<BillingCycle, 'kind' | 'months'> | null | undefined): number | null {
  if (!cycle || cycle.kind === 'ONE_TIME') return null;
  return cycle.kind === 'FIXED' ? cycle.months : 24;
}

/** Expiry suggested from the cycle: the day before the same date one cycle later ('' when none). */
export function suggestExpiry(start: string, cycle: Pick<BillingCycle, 'kind' | 'months'> | null | undefined): string {
  const months = termMonthsOf(cycle);
  if (!start || !months) return '';
  const [y, m, d] = start.split('-').map(Number);
  const end = new Date(y, m - 1 + months, d);
  end.setDate(end.getDate() - 1);
  return iso(end);
}

/** "8 months", "From the term dates", "No renewal". */
export function cycleLengthLabel(cycle: Pick<BillingCycle, 'kind' | 'months'>): string {
  if (cycle.kind === 'ONE_TIME') return 'No renewal';
  if (cycle.kind === 'TERM') return 'From the term dates (whole years)';
  return `${cycle.months} month${cycle.months === 1 ? '' : 's'}`;
}

/** Active cycles for a form, plus the cycle a term already has even if it was deactivated since. */
export function cycleOptions(cycles: BillingCycle[], keep?: string | null): BillingCycle[] {
  return cycles.filter((c) => c.is_active || c.name === keep);
}
