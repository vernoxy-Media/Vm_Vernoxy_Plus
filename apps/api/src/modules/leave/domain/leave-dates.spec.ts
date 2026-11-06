import {
  addDays,
  diffDays,
  eachDate,
  isHalfStep,
  leaveYearOf,
  leaveYearRange,
  monthStarts,
  monthsLeftInLeaveYear,
  roundDownHalf,
} from './leave-dates';

describe('leave-dates', () => {
  describe('leave year', () => {
    it('January to December', () => {
      expect(leaveYearOf('2026-11-06', 1)).toBe(2026);
      expect(leaveYearRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    });

    it('April to March', () => {
      expect(leaveYearOf('2027-02-10', 4)).toBe(2026);
      expect(leaveYearOf('2026-04-01', 4)).toBe(2026);
      expect(leaveYearOf('2026-03-31', 4)).toBe(2025);
      expect(leaveYearRange(2026, 4)).toEqual({ start: '2026-04-01', end: '2027-03-31' });
    });

    it('months left including the joining month', () => {
      // BFD 4.2: joined 10 July, leave year Jan-Dec -> 6 months (Jul..Dec)
      expect(monthsLeftInLeaveYear('2026-07-10', 1)).toBe(6);
      expect(monthsLeftInLeaveYear('2026-01-01', 1)).toBe(12);
      expect(monthsLeftInLeaveYear('2026-12-31', 1)).toBe(1);
      expect(monthsLeftInLeaveYear('2027-03-05', 4)).toBe(1);
    });
  });

  describe('pro-rata and comp-off rounding (down to the nearest 0.5)', () => {
    it('SL 6 x 6 / 12 = 3.0 (BFD example)', () => {
      expect(roundDownHalf((6 * 6) / 12)).toBe(3);
    });
    it('EL 15 x 5 / 12 = 6.25 -> 6.0', () => {
      expect(roundDownHalf((15 * 5) / 12)).toBe(6);
    });
    it('Comp-off: 6 hours / 8 = 0.75 -> 0.5; 8 hours -> 1.0; 4 hours -> 0.5', () => {
      expect(roundDownHalf(6 / 8)).toBe(0.5);
      expect(roundDownHalf(8 / 8)).toBe(1);
      expect(roundDownHalf(4 / 8)).toBe(0.5);
      expect(roundDownHalf(3 / 8)).toBe(0);
    });
    it('half steps', () => {
      expect(isHalfStep(1.5)).toBe(true);
      expect(isHalfStep(1.25)).toBe(false);
    });
  });

  describe('date helpers', () => {
    it('iterates dates across month ends', () => {
      expect(eachDate('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(diffDays('2026-10-28', '2026-11-06')).toBe(9);
    });
    it('month starts', () => {
      expect(monthStarts('2026-10-15', '2027-01-03')).toEqual(['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01']);
    });
  });
});
