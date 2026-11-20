import { longDate, regularizationMessages } from './regularization-messages';

const facts = { requestId: 'REG-0003', employeeName: 'Priyanshi Patel', workDate: '2026-11-14', requestType: 'Missing Clock Out' };

describe('regularization messages', () => {
  it('writes the date out in full', () => {
    expect(longDate('2026-11-14')).toBe('14 Nov 2026');
    expect(longDate('2026-01-03T00:00:00.000Z')).toBe('3 Jan 2026');
  });

  it('tells the administrators who asked, for which day and why they are being told', () => {
    const m = regularizationMessages.requested(facts);
    expect(m.title).toBe('Regularization request: Priyanshi Patel');
    expect(m.body).toContain('14 Nov 2026');
    expect(m.body).toContain('Missing Clock Out');
    expect(m.body).toContain('Please review it');
  });

  it('tells the employee an approval and a rejection with the reason', () => {
    expect(regularizationMessages.approved('Admin', facts).body).toContain('REG-0003');
    const r = regularizationMessages.rejected('Admin', facts, 'No proof attached');
    expect(r.title).toBe('Regularization rejected');
    expect(r.body).toContain('Reason: No proof attached');
  });

  it('tells an employee when an administrator raised one for them', () => {
    expect(regularizationMessages.raisedForYou('Admin', facts).body).toContain('on your behalf');
  });
});
