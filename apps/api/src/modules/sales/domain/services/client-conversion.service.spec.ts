import { dateOnly, istDateString, validateWon } from './client-conversion.service';

const NOW = new Date('2026-10-30T10:00:00Z'); // 30 Oct 15:30 IST
const ADDED = new Date('2026-10-20T08:00:00Z');

describe('Won on / Win note (BFD section 9)', () => {
  const ok = { won_on: '2026-10-28', win_note: 'PO received for CRM with Tally, 15 users.' };

  it('accepts a past date and today', () => {
    expect(validateWon(ok, ADDED, NOW)).toEqual([]);
    expect(validateWon({ ...ok, won_on: '2026-10-30' }, ADDED, NOW)).toEqual([]);
  });

  it('both fields are required', () => {
    expect(validateWon({ won_on: null, win_note: null }, ADDED, NOW)).toEqual([
      { field: 'won_on', message: 'Please fill this field.' },
      { field: 'win_note', message: 'Please fill this field.' },
    ]);
  });

  it('is never in the future (judged in Indian time)', () => {
    expect(validateWon({ ...ok, won_on: '2026-10-31' }, ADDED, NOW)[0]).toMatchObject({ field: 'won_on', message: 'Won on must be today or a past date.' });
    // 19:00 UTC on the 30th is already the 31st in India.
    expect(validateWon({ ...ok, won_on: '2026-10-31' }, ADDED, new Date('2026-10-30T19:00:00Z'))).toEqual([]);
  });

  it('is not before the lead was added', () => {
    expect(validateWon({ ...ok, won_on: '2026-10-19' }, ADDED, NOW)[0]).toMatchObject({ field: 'won_on', message: 'Won on cannot be before the lead was added.' });
    expect(validateWon({ ...ok, won_on: '2026-10-20' }, ADDED, NOW)).toEqual([]);
  });

  it('rejects things that are not dates', () => {
    for (const bad of ['yesterday', '30-10-2026', '2026-02-30', '2026-13-01']) {
      expect(validateWon({ ...ok, won_on: bad }, ADDED, NOW)[0]).toMatchObject({ field: 'won_on', message: 'Please enter a valid date (YYYY-MM-DD).' });
    }
  });

  it('turns a date string into a date-only value and back', () => {
    expect(dateOnly('2026-10-28').toISOString()).toBe('2026-10-28T00:00:00.000Z');
    expect(istDateString(new Date('2026-10-30T19:00:00Z'))).toBe('2026-10-31');
  });
});
