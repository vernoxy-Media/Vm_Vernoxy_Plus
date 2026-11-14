import { hasTwoDecimalsAtMost, mustBeFree, needsExpiry, seatsCounted, termCycleMismatch, termMonths } from './license-rules';

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
    expect(termCycleMismatch('Yearly', '2025-11-10', '2026-11-09')).toBeNull();
    expect(termCycleMismatch('Yearly', '2026-01-01', '2026-03-31')).toBe('The term is 3 months but the Billing Cycle is Yearly. Save anyway?');
    expect(termCycleMismatch('Multi-year', '2026-01-01', '2028-12-31')).toBeNull();
    expect(termCycleMismatch('One-time', '2026-01-01', '2026-03-31')).toBeNull();
  });

  it('allows up to 2 decimals in the cost', () => {
    expect(hasTwoDecimalsAtMost(198000)).toBe(true);
    expect(hasTwoDecimalsAtMost(1982.5)).toBe(true);
    expect(hasTwoDecimalsAtMost(0.1 + 0.2)).toBe(true);
    expect(hasTwoDecimalsAtMost(10.123)).toBe(false);
  });
});

describe('yearly cost (BFD 12 Part 3)', () => {
  const { yearlyCost } = require('./license-rules');
  it('follows the cycle', () => {
    expect(yearlyCost('Monthly', 1000)).toBe(12000);
    expect(yearlyCost('Quarterly', 1000)).toBe(4000);
    expect(yearlyCost('Yearly', 198000)).toBe(198000);
    expect(yearlyCost('Multi-year', 300000, '2026-01-01', '2028-12-31')).toBe(100000);
    expect(yearlyCost('One-time', 50000)).toBe(0);
  });
});
