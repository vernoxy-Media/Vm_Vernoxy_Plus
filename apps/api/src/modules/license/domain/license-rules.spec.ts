import {
  BillingCycle,
  billingCycleProblem,
  hasTwoDecimalsAtMost,
  mustBeFree,
  needsExpiry,
  seatsCounted,
  suggestedTermMonths,
  termCycleMismatch,
  termMonths,
  yearlyCost,
} from './license-rules';

const MONTHLY: BillingCycle = { name: 'Monthly', kind: 'FIXED', months: 1 };
const QUARTERLY: BillingCycle = { name: 'Quarterly', kind: 'FIXED', months: 3 };
const YEARLY: BillingCycle = { name: 'Yearly', kind: 'FIXED', months: 12 };
const EIGHT_MONTHS: BillingCycle = { name: '8 Months', kind: 'FIXED', months: 8 };
const MULTI_YEAR: BillingCycle = { name: 'Multi-year', kind: 'TERM', months: null };
const ONE_TIME: BillingCycle = { name: 'One-time', kind: 'ONE_TIME', months: null };

describe('license rules (BFD 4)', () => {
  it('counts seats only for Per User and Trial', () => {
    expect(seatsCounted('Subscription · Per User')).toBe(true);
    expect(seatsCounted('Trial')).toBe(true);
    expect(seatsCounted('Perpetual · Organisation')).toBe(false);
    expect(seatsCounted('Free / Open Source')).toBe(false);
  });

  it('needs an Expiry Date only for Subscription and Trial; Free and Trial cost 0', () => {
    expect(needsExpiry('Subscription · Organisation')).toBe(true);
    expect(needsExpiry('Perpetual · Per User')).toBe(false);
    expect(mustBeFree('Trial')).toBe(true);
    expect(mustBeFree('Subscription · Per User')).toBe(false);
  });

  it('works out the term length in months (worked example: 10 Nov 2025 to 09 Nov 2026)', () => {
    expect(termMonths('2025-11-10', '2026-11-09')).toBe(12);
    expect(termMonths('2026-01-01', '2026-03-31')).toBe(3);
  });

  it('asks for confirmation when the term does not match the Billing Cycle', () => {
    expect(termCycleMismatch(YEARLY, '2025-11-10', '2026-11-09')).toBeNull();
    expect(termCycleMismatch(YEARLY, '2026-01-01', '2026-03-31')).toBe('The term is 3 months but the Billing Cycle is Yearly. Save anyway?');
    expect(termCycleMismatch(MULTI_YEAR, '2026-01-01', '2028-12-31')).toBeNull();
    expect(termCycleMismatch(MULTI_YEAR, '2026-01-01', '2026-08-31')).toBe('The term is 8 months but the Billing Cycle is Multi-year. Save anyway?');
    expect(termCycleMismatch(ONE_TIME, '2026-01-01', '2026-03-31')).toBeNull();
  });

  it('works for a cycle the Admin added (8 Months)', () => {
    expect(termCycleMismatch(EIGHT_MONTHS, '2026-01-01', '2026-08-31')).toBeNull();
    expect(termCycleMismatch(EIGHT_MONTHS, '2026-01-01', '2026-06-30')).toBe('The term is 6 months but the Billing Cycle is 8 Months. Save anyway?');
    expect(suggestedTermMonths(EIGHT_MONTHS)).toBe(8);
    expect(suggestedTermMonths(MULTI_YEAR)).toBe(24);
    expect(suggestedTermMonths(ONE_TIME)).toBeNull();
  });

  it('checks a cycle before it is saved', () => {
    expect(billingCycleProblem('FIXED', 8)).toBeNull();
    expect(billingCycleProblem('FIXED', 0)).toMatch(/whole months/);
    expect(billingCycleProblem('FIXED', 2.5)).toMatch(/whole months/);
    expect(billingCycleProblem('TERM', null)).toBeNull();
    expect(billingCycleProblem('WEEKLY', null)).toMatch(/how long/);
  });

  it('allows up to 2 decimals in the cost', () => {
    expect(hasTwoDecimalsAtMost(198000)).toBe(true);
    expect(hasTwoDecimalsAtMost(1982.5)).toBe(true);
    expect(hasTwoDecimalsAtMost(0.1 + 0.2)).toBe(true);
    expect(hasTwoDecimalsAtMost(10.123)).toBe(false);
  });
});

describe('yearly cost (BFD 12 Part 3)', () => {
  it('follows the cycle', () => {
    expect(yearlyCost(MONTHLY, 1000)).toBe(12000);
    expect(yearlyCost(QUARTERLY, 1000)).toBe(4000);
    expect(yearlyCost(YEARLY, 198000)).toBe(198000);
    expect(yearlyCost(EIGHT_MONTHS, 40000)).toBe(60000);
    expect(yearlyCost(MULTI_YEAR, 300000, '2026-01-01', '2028-12-31')).toBe(100000);
    expect(yearlyCost(ONE_TIME, 50000)).toBe(0);
    expect(yearlyCost(null, 50000)).toBe(0);
  });
});
