import { followUpFlag, isFollowUpDue, istDayRange, istMonthRange, istWeekRange } from './lead-time.service';

// 2026-10-30 is a Friday. 10:00 UTC = 15:30 IST.
const NOW = new Date('2026-10-30T10:00:00Z');
const at = (iso: string) => new Date(iso);

describe('IST day / week / month ranges', () => {
  it('a day runs from 00:00 IST to the next 00:00 IST', () => {
    const d = istDayRange(NOW);
    expect(d.from.toISOString()).toBe('2026-10-29T18:30:00.000Z');
    expect(d.to.toISOString()).toBe('2026-10-30T18:30:00.000Z');
  });

  it('just after midnight IST still belongs to the new Indian day (UTC date is the day before)', () => {
    const d = istDayRange(at('2026-10-30T19:00:00Z')); // 00:30 IST on 31 Oct
    expect(d.from.toISOString()).toBe('2026-10-30T18:30:00.000Z');
  });

  it('a week starts on Monday', () => {
    const w = istWeekRange(NOW);
    expect(w.from.toISOString()).toBe('2026-10-25T18:30:00.000Z'); // Mon 26 Oct 00:00 IST
    expect(w.to.toISOString()).toBe('2026-11-01T18:30:00.000Z'); // Mon 2 Nov 00:00 IST
    expect(istWeekRange(at('2026-10-25T20:00:00Z')).from.toISOString()).toBe('2026-10-25T18:30:00.000Z'); // Mon 01:30 IST
    expect(istWeekRange(at('2026-10-25T10:00:00Z')).from.toISOString()).toBe('2026-10-18T18:30:00.000Z'); // Sun 15:30 IST -> previous Monday
  });

  it('a month runs from the 1st 00:00 IST', () => {
    const m = istMonthRange(NOW);
    expect(m.from.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(m.to.toISOString()).toBe('2026-10-31T18:30:00.000Z');
  });
});

describe('follow-up flags', () => {
  it('has no flag without a follow-up or for a later day', () => {
    expect(followUpFlag(null, NOW)).toBeNull();
    expect(followUpFlag(at('2026-10-31T10:00:00Z'), NOW)).toBeNull();
  });

  it('is "today" for a later time today and still "today" within the 15 minute grace', () => {
    expect(followUpFlag(at('2026-10-30T12:00:00Z'), NOW)).toBe('today');
    expect(followUpFlag(at('2026-10-30T09:50:00Z'), NOW)).toBe('today');
  });

  it('is "overdue" more than 15 minutes after the due time, even earlier today', () => {
    expect(followUpFlag(at('2026-10-30T09:40:00Z'), NOW)).toBe('overdue');
    expect(followUpFlag(at('2026-10-20T10:00:00Z'), NOW)).toBe('overdue');
  });

  it('Kanban "Follow-up due" is today or earlier', () => {
    expect(isFollowUpDue(at('2026-10-30T17:00:00Z'), NOW)).toBe(true);
    expect(isFollowUpDue(at('2026-10-20T10:00:00Z'), NOW)).toBe(true);
    expect(isFollowUpDue(at('2026-10-31T05:00:00Z'), NOW)).toBe(false);
    expect(isFollowUpDue(null, NOW)).toBe(false);
  });
});
