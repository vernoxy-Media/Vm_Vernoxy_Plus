import {
  evaluateTodayState,
  validatePunchIn,
  validateStartBreak,
  validateEndBreak,
  validatePunchOut,
  DayContext,
} from './attendance-state-machine';
import {
  NotWorkingError,
  AlreadyOnBreakError,
  NotOnBreakError,
  AlreadyPunchedInError,
  AlreadyPunchedOutError,
  FullDayLeaveBlockedError,
} from '../errors/attendance.errors';

describe('AttendanceStateMachine', () => {
  const baseCtx: DayContext = {
    checkInAt: null,
    checkOutAt: null,
    activeBreakStartedAt: null,
    isFullDayLeave: false,
    isHalfDayLeave: false,
    isHoliday: false,
    isWeeklyOff: false,
  };

  describe('evaluateTodayState', () => {
    it('returns on_leave when full-day leave is present and not punched in', () => {
      const state = evaluateTodayState({ ...baseCtx, isFullDayLeave: true });
      expect(state).toBe('on_leave');
    });

    it('returns holiday when today is a holiday and not punched in', () => {
      const state = evaluateTodayState({ ...baseCtx, isHoliday: true });
      expect(state).toBe('holiday');
    });

    it('returns weekly_off when isWeeklyOff is true and not punched in', () => {
      const state = evaluateTodayState({ ...baseCtx, isWeeklyOff: true });
      expect(state).toBe('weekly_off');
    });

    it('returns not_started when no attendance record exists', () => {
      const state = evaluateTodayState(baseCtx);
      expect(state).toBe('not_started');
    });

    it('returns done when checkOutAt is present', () => {
      const state = evaluateTodayState({
        ...baseCtx,
        checkInAt: new Date('2026-10-16T09:00:00Z'),
        checkOutAt: new Date('2026-10-16T18:00:00Z'),
      });
      expect(state).toBe('done');
    });

    it('returns on_break when an open break exists', () => {
      const state = evaluateTodayState({
        ...baseCtx,
        checkInAt: new Date('2026-10-16T09:00:00Z'),
        activeBreakStartedAt: new Date('2026-10-16T13:00:00Z'),
      });
      expect(state).toBe('on_break');
    });

    it('returns working when punched in with no active break and no check_out', () => {
      const state = evaluateTodayState({
        ...baseCtx,
        checkInAt: new Date('2026-10-16T09:00:00Z'),
      });
      expect(state).toBe('working');
    });
  });

  describe('validatePunchIn', () => {
    it('throws FullDayLeaveBlockedError when on approved full-day leave', () => {
      expect(() => {
        validatePunchIn({ ...baseCtx, isFullDayLeave: true });
      }).toThrow(FullDayLeaveBlockedError);
    });

    it('allows punch in on half-day leave', () => {
      expect(() => {
        validatePunchIn({ ...baseCtx, isHalfDayLeave: true });
      }).not.toThrow();
    });

    it('throws AlreadyPunchedInError when checkInAt is already set and not checked out', () => {
      expect(() => {
        validatePunchIn({ ...baseCtx, checkInAt: new Date() });
      }).toThrow(AlreadyPunchedInError);
    });

    it('throws AlreadyPunchedOutError when already checked out today', () => {
      expect(() => {
        validatePunchIn({ ...baseCtx, checkInAt: new Date(), checkOutAt: new Date() });
      }).toThrow(AlreadyPunchedOutError);
    });
  });

  describe('validateStartBreak', () => {
    it('throws NotWorkingError when not punched in', () => {
      expect(() => {
        validateStartBreak(baseCtx);
      }).toThrow(NotWorkingError);
    });

    it('throws NotWorkingError when already punched out', () => {
      expect(() => {
        validateStartBreak({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
          checkOutAt: new Date('2026-10-16T18:00:00Z'),
        });
      }).toThrow(NotWorkingError);
    });

    it('throws AlreadyOnBreakError when an open break already exists', () => {
      expect(() => {
        validateStartBreak({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
          activeBreakStartedAt: new Date('2026-10-16T13:00:00Z'),
        });
      }).toThrow(AlreadyOnBreakError);
    });

    it('allows starting a break when working', () => {
      expect(() => {
        validateStartBreak({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
        });
      }).not.toThrow();
    });
  });

  describe('validateEndBreak', () => {
    it('throws NotOnBreakError when not punched in', () => {
      expect(() => {
        validateEndBreak(baseCtx);
      }).toThrow(NotOnBreakError);
    });

    it('throws NotOnBreakError when no open break exists', () => {
      expect(() => {
        validateEndBreak({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
        });
      }).toThrow(NotOnBreakError);
    });

    it('does not throw when an open break exists', () => {
      expect(() => {
        validateEndBreak({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
          activeBreakStartedAt: new Date('2026-10-16T13:00:00Z'),
        });
      }).not.toThrow();
    });
  });

  describe('validatePunchOut', () => {
    it('throws NotWorkingError when not punched in', () => {
      expect(() => {
        validatePunchOut(baseCtx);
      }).toThrow(NotWorkingError);
    });

    it('throws AlreadyPunchedOutError when already checked out', () => {
      expect(() => {
        validatePunchOut({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
          checkOutAt: new Date('2026-10-16T18:00:00Z'),
        });
      }).toThrow(AlreadyPunchedOutError);
    });

    it('allows punch out when working', () => {
      expect(() => {
        validatePunchOut({
          ...baseCtx,
          checkInAt: new Date('2026-10-16T09:00:00Z'),
        });
      }).not.toThrow();
    });
  });
});
