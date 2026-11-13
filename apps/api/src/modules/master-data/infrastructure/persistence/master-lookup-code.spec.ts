import { codeFromLabel } from './prisma-master-lookup.repository';

describe('codeFromLabel', () => {
  it('keeps the sign of a blood group, so A+ and A- are different codes', () => {
    expect(codeFromLabel('A+')).toBe('a_plus');
    expect(codeFromLabel('A-')).toBe('a_minus');
    expect(codeFromLabel('AB+')).toBe('ab_plus');
    expect(codeFromLabel('AB-')).toBe('ab_minus');
    expect(codeFromLabel('O+')).toBe('o_plus');
    expect(codeFromLabel('O-')).toBe('o_minus');
    const codes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(codeFromLabel);
    expect(new Set(codes).size).toBe(8);
  });

  it('still makes the usual snake_case code', () => {
    expect(codeFromLabel('Bug Fix')).toBe('bug_fix');
    expect(codeFromLabel('  Meeting ')).toBe('meeting');
    expect(codeFromLabel('Full-Time')).toBe('fulltime');
    expect(codeFromLabel('R & D')).toBe('r_d');
  });

  it('gives an empty code when nothing usable is left', () => {
    expect(codeFromLabel('***')).toBe('');
  });
});
