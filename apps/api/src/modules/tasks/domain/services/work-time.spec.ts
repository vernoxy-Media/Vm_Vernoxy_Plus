import { loggedSeconds, minutesAfter, stoppedNote, timeByEmployee, timerRunner } from './work-time';

const log = (action: string, employee_id: number, duration_seconds?: number, employee_name = `E${employee_id}`) => ({ action, employee_id, employee_name, duration_seconds });

describe('work-time', () => {
  describe('minutesAfter', () => {
    it('does not round every short session up to a minute', () => {
      // 30 sessions of 10 seconds is 5 minutes, not 30
      const logs = Array.from({ length: 29 }, () => log('pause', 1, 10));
      expect(minutesAfter(logs, 29, 10)).toBe(5);
    });

    it('rounds only the total to the nearest minute', () => {
      expect(minutesAfter([], 0, 89)).toBe(1);
      expect(minutesAfter([], 0, 91)).toBe(2);
      expect(minutesAfter([], 0, 0)).toBe(0);
    });

    it('starts from the stored minutes for older tasks that have no log', () => {
      expect(minutesAfter([], 40, 120)).toBe(42);
    });

    it('prefers the exact log over stored minutes that were rounded up', () => {
      expect(minutesAfter([log('pause', 1, 60)], 25, 60)).toBe(2);
    });

    it('ignores a negative session', () => {
      expect(minutesAfter([], 0, -50)).toBe(0);
    });
  });

  describe('loggedSeconds', () => {
    it('adds only entries that carry a duration, and survives bad input', () => {
      expect(loggedSeconds([log('start', 1), log('pause', 1, 30), log('finish', 1, 90)])).toBe(120);
      expect(loggedSeconds(null)).toBe(0);
      expect(loggedSeconds('nope')).toBe(0);
    });
  });

  describe('timerRunner', () => {
    it('is the person who last started or resumed', () => {
      const logs = [log('start', 1), log('pause', 1, 10), log('resume', 2)];
      expect(timerRunner(logs)).toEqual({ id: 2, name: 'E2' });
    });
    it('is nobody when the timer was never started', () => {
      expect(timerRunner([])).toBeNull();
    });
  });

  describe('stoppedNote', () => {
    const actor = { id: 2, name: 'Asha' };
    it('names the person who stopped it when it was not the runner', () => {
      expect(stoppedNote('done for today', { id: 1, name: 'Ravi' }, actor)).toBe('Stopped by Asha — done for today');
      expect(stoppedNote(null, { id: 1, name: 'Ravi' }, actor)).toBe('Stopped by Asha');
    });
    it('keeps the plain note when the runner stopped it', () => {
      expect(stoppedNote('lunch', { id: 2, name: 'Asha' }, actor)).toBe('lunch');
      expect(stoppedNote('  ', null, actor)).toBeNull();
    });
  });

  describe('timeByEmployee', () => {
    it('adds each person\'s sessions separately', () => {
      const logs = [log('start', 1), log('pause', 1, 600), log('resume', 2), log('pause', 2, 300), log('resume', 1), log('finish', 1, 60)];
      const rows = timeByEmployee(logs).sort((a, b) => a.employee_id - b.employee_id);
      expect(rows).toEqual([
        { employee_id: 1, employee_name: 'E1', seconds: 660 },
        { employee_id: 2, employee_name: 'E2', seconds: 300 },
      ]);
    });
    it('ignores entries with no time', () => {
      expect(timeByEmployee([log('start', 1), log('pause', 1, 0)])).toEqual([]);
    });
  });
});
