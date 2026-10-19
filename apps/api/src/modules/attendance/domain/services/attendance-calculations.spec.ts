import {
  calculateCompletedDayMinutes,
  calculateOpenDayMinutes,
  determineDayStatus,
  calculateDailyTargetMinutes,
  getWeekBoundaries,
  getWorkDateInTimezone,
  calculateMonthSummary,
} from './attendance-calculations';

describe('AttendanceCalculations', () => {
  describe('calculateCompletedDayMinutes', () => {
    it('calculates work minutes with seconds floored (round down to completed minute)', () => {
      const checkIn = new Date('2026-10-16T09:00:00Z');
      const checkOut = new Date('2026-10-16T17:30:45Z');
      const res = calculateCompletedDayMinutes(checkIn, checkOut, []);
      expect(res.productionMinutes).toBe(510);
      expect(res.breakMinutes).toBe(0);
    });

    it('deducts completed break intervals properly', () => {
      const checkIn = new Date('2026-10-16T09:00:00Z');
      const checkOut = new Date('2026-10-16T17:30:00Z');
      const breaks = [
        { startedAt: new Date('2026-10-16T11:00:00Z'), endedAt: new Date('2026-10-16T11:15:00Z') },
        { startedAt: new Date('2026-10-16T13:00:00Z'), endedAt: new Date('2026-10-16T13:45:00Z') },
      ];
      const res = calculateCompletedDayMinutes(checkIn, checkOut, breaks);
      expect(res.breakMinutes).toBe(60);
      expect(res.productionMinutes).toBe(450);
    });

    it('ensures production minutes cannot be negative', () => {
      const checkIn = new Date('2026-10-16T09:00:00Z');
      const checkOut = new Date('2026-10-16T09:30:00Z');
      const breaks = [
        { startedAt: new Date('2026-10-16T09:00:00Z'), endedAt: new Date('2026-10-16T09:40:00Z') },
      ];
      const res = calculateCompletedDayMinutes(checkIn, checkOut, breaks);
      expect(res.productionMinutes).toBe(0);
    });
  });

  describe('calculateOpenDayMinutes', () => {
    it('calculates open day production and active break accurately', () => {
      const checkIn = new Date('2026-10-16T09:00:00Z');
      const now = new Date('2026-10-16T12:00:00Z');
      const breaks = [
        { startedAt: new Date('2026-10-16T10:00:00Z'), endedAt: new Date('2026-10-16T10:20:00Z') },
        { startedAt: new Date('2026-10-16T11:30:00Z'), endedAt: null },
      ];
      const res = calculateOpenDayMinutes(checkIn, now, breaks);
      expect(res.breakMinutesSoFar).toBe(50);
      expect(res.workedMinutesSoFar).toBe(130);
      expect(res.workedSeconds).toBe(130 * 60);
      expect(res.breakSeconds).toBe(50 * 60);
    });
  });

  describe('determineDayStatus', () => {
    it('returns incomplete when checkOutAt is null', () => {
      const status = determineDayStatus(null, 300, 480, 240);
      expect(status).toBe('incomplete');
    });

    it('returns present when productionMinutes >= fullDayMinutes', () => {
      const status = determineDayStatus(new Date(), 480, 480, 240);
      expect(status).toBe('present');
    });

    it('returns half_day when productionMinutes >= halfDayMinutes and < fullDayMinutes', () => {
      const status = determineDayStatus(new Date(), 300, 480, 240);
      expect(status).toBe('half_day');
    });

    it('returns short when productionMinutes < halfDayMinutes', () => {
      const status = determineDayStatus(new Date(), 200, 480, 240);
      expect(status).toBe('short');
    });
  });

  describe('calculateDailyTargetMinutes', () => {
    it('returns 0 for full day leave, holiday, or weekly off', () => {
      expect(calculateDailyTargetMinutes({ isWeeklyOff: true, isHoliday: false })).toBe(0);
      expect(calculateDailyTargetMinutes({ isWeeklyOff: false, isHoliday: true })).toBe(0);
      expect(calculateDailyTargetMinutes({ isWeeklyOff: false, isHoliday: false, leaveType: 'full' })).toBe(0);
    });

    it('returns half target for half-day leave', () => {
      expect(calculateDailyTargetMinutes({ isWeeklyOff: false, isHoliday: false, leaveType: 'half', fullDayMinutes: 480, halfDayMinutes: 240 })).toBe(240);
    });

    it('returns standard target for regular working day', () => {
      expect(calculateDailyTargetMinutes({ isWeeklyOff: false, isHoliday: false, fullDayMinutes: 480, halfDayMinutes: 240 })).toBe(480);
    });
  });

  describe('getWeekBoundaries', () => {
    const testDate = new Date(Date.UTC(2026, 9, 16));

    it('calculates Monday-Sunday week when week_start_day is 1 (Monday)', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(testDate, 1);
      expect(weekStart.toISOString().slice(0, 10)).toBe('2026-10-12');
      expect(weekEnd.toISOString().slice(0, 10)).toBe('2026-10-18');
    });

    it('calculates Sunday-Saturday week when week_start_day is 0 (Sunday)', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(testDate, 0);
      expect(weekStart.toISOString().slice(0, 10)).toBe('2026-10-11');
      expect(weekEnd.toISOString().slice(0, 10)).toBe('2026-10-17');
    });

    it('calculates Saturday-Friday week when week_start_day is 6 (Saturday)', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(testDate, 6);
      expect(weekStart.toISOString().slice(0, 10)).toBe('2026-10-10');
      expect(weekEnd.toISOString().slice(0, 10)).toBe('2026-10-16');
    });
  });

  describe('getWorkDateInTimezone', () => {
    it('correctly handles timezone boundaries (e.g. 23:30 IST is 18:00 UTC)', () => {
      const date = new Date('2026-10-16T18:00:00Z');
      const workDate = getWorkDateInTimezone(date, 'Asia/Kolkata');
      expect(workDate).toBe('2026-10-16');

      const nextDate = new Date('2026-10-16T18:31:00Z');
      const nextWorkDate = getWorkDateInTimezone(nextDate, 'Asia/Kolkata');
      expect(nextWorkDate).toBe('2026-10-17');
    });
  });

  describe('calculateMonthSummary', () => {
    it('aggregates scheduled, present, leave, absent days, and total minutes correctly', () => {
      const days = [
        {
          date: '2026-10-01',
          isWeeklyOff: false,
          isHoliday: false,
          isPast: true,
          isToday: false,
          leaveType: null,
          attendance: {
            checkInAt: new Date('2026-10-01T09:00:00Z'),
            checkOutAt: new Date('2026-10-01T18:00:00Z'),
            productionMinutes: 480,
            breakMinutes: 60,
            dayStatus: 'present' as const,
          },
        },
        {
          date: '2026-10-02',
          isWeeklyOff: false,
          isHoliday: false,
          isPast: true,
          isToday: false,
          leaveType: null,
          attendance: {
            checkInAt: new Date('2026-10-02T09:00:00Z'),
            checkOutAt: new Date('2026-10-02T18:00:00Z'),
            productionMinutes: 500,
            breakMinutes: 45,
            dayStatus: 'present' as const,
          },
        },
        {
          date: '2026-10-03',
          isWeeklyOff: false,
          isHoliday: false,
          isPast: true,
          isToday: false,
          leaveType: null,
          attendance: {
            checkInAt: new Date('2026-10-03T09:00:00Z'),
            checkOutAt: new Date('2026-10-03T13:30:00Z'),
            productionMinutes: 240,
            breakMinutes: 30,
            dayStatus: 'half_day' as const,
          },
        },
        {
          date: '2026-10-04',
          isWeeklyOff: true,
          isHoliday: false,
          isPast: true,
          isToday: false,
          leaveType: null,
          attendance: null,
        },
        {
          date: '2026-10-05',
          isWeeklyOff: false,
          isHoliday: true,
          isPast: true,
          isToday: false,
          holidayName: 'Gandhi Jayanti',
          leaveType: null,
          attendance: null,
        },
        {
          date: '2026-10-06',
          isWeeklyOff: false,
          isHoliday: false,
          isPast: true,
          isToday: false,
          leaveType: 'full' as const,
          attendance: null,
        },
        {
          date: '2026-10-07',
          isWeeklyOff: false,
          isHoliday: false,
          isPast: true,
          isToday: false,
          leaveType: null,
          attendance: null,
        },
      ];

      const summary = calculateMonthSummary(days, 480, 240);
      expect(summary.scheduled_working_days).toBe(5);
      expect(summary.days_present).toBe(3);
      expect(summary.days_full).toBe(2);
      expect(summary.days_half).toBe(1);
      expect(summary.days_absent).toBe(1);
      expect(summary.leave_days).toBe(1);
      expect(summary.holidays).toBe(1);
      expect(summary.weekly_offs).toBe(1);
      expect(summary.total_production_minutes).toBe(480 + 500 + 240);
      expect(summary.total_break_minutes).toBe(60 + 45 + 30);
    });
  });
});
