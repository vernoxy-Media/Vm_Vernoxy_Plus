import {
  CandidateValidationError,
  candidateSource,
  duplicateMessage,
  emailAddress,
  experience,
  futureDate,
  isPlainStage,
  keySkills,
  mobileNumber,
  optionalCtc,
  optionalLocation,
  personName,
} from './candidate-input-rules';

const fieldOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    if (e instanceof CandidateValidationError) return e.field;
    throw e;
  }
  return undefined;
};

describe('candidate input rules', () => {
  it('accepts a real name and refuses digits, symbols and one letter', () => {
    expect(personName('  Rohan   Mehta ')).toBe('Rohan Mehta');
    expect(personName("D'Souza-Pai")).toBe("D'Souza-Pai");
    expect(fieldOf(() => personName('Rohan123'))).toBe('name');
    expect(fieldOf(() => personName('@@@'))).toBe('name');
    expect(fieldOf(() => personName('R'))).toBe('name');
    expect(fieldOf(() => personName(''))).toBe('name');
  });

  it('keeps a 10-digit phone, drops a country code, and refuses the rest', () => {
    expect(mobileNumber('98250 11223')).toBe('9825011223');
    expect(mobileNumber('+919825011223')).toBe('9825011223');
    expect(fieldOf(() => mobileNumber('98250'))).toBe('phone');
    expect(fieldOf(() => mobileNumber('98250abcde'))).toBe('phone');
    expect(fieldOf(() => mobileNumber('0000000000'))).toBe('phone');
  });

  it('checks the email', () => {
    expect(emailAddress(' Rohan@Mail.COM ')).toBe('rohan@mail.com');
    expect(fieldOf(() => emailAddress('rohan@mail'))).toBe('email');
    expect(fieldOf(() => emailAddress('rohan mail.com'))).toBe('email');
  });

  it('never accepts a negative or absurd salary', () => {
    expect(optionalCtc('', 'current_ctc', 'Current CTC')).toBeNull();
    expect(optionalCtc('480000', 'current_ctc', 'Current CTC')).toBe(480000);
    expect(optionalCtc(0, 'current_ctc', 'Current CTC')).toBe(0);
    expect(fieldOf(() => optionalCtc(-1, 'current_ctc', 'Current CTC'))).toBe('current_ctc');
    expect(fieldOf(() => optionalCtc('-50000', 'expected_ctc', 'Expected CTC'))).toBe('expected_ctc');
    expect(fieldOf(() => optionalCtc('abc', 'current_ctc', 'Current CTC'))).toBe('current_ctc');
    expect(fieldOf(() => optionalCtc(5_000_000_000, 'current_ctc', 'Current CTC'))).toBe('current_ctc');
  });

  it('wants some experience from an experienced candidate and none from a fresher', () => {
    expect(experience('fresher', 5, 3)).toEqual({ experienceType: 'fresher', expYears: 0, expMonths: 0 });
    expect(experience('experienced', 3, 4)).toEqual({ experienceType: 'experienced', expYears: 3, expMonths: 4 });
    expect(fieldOf(() => experience('experienced', 0, 0))).toBe('exp_years');
    expect(fieldOf(() => experience('experienced', -1, 0))).toBe('exp_years');
    expect(fieldOf(() => experience('experienced', 2, 12))).toBe('exp_months');
    expect(fieldOf(() => experience('expert', 2, 0))).toBe('experience_type');
  });

  it('cleans key skills and drops repeats', () => {
    expect(keySkills([' SQL ', 'sql', 'Node.js', '', 'C++'])).toEqual(['SQL', 'Node.js', 'C++']);
    expect(keySkills(undefined)).toEqual([]);
    expect(fieldOf(() => keySkills('SQL'))).toBe('key_skills');
    expect(fieldOf(() => keySkills(['x'.repeat(51)]))).toBe('key_skills');
  });

  it('accepts a city and state, not digits', () => {
    expect(optionalLocation('Ahmedabad, Gujarat')).toBe('Ahmedabad, Gujarat');
    expect(optionalLocation('')).toBeNull();
    expect(fieldOf(() => optionalLocation('12345'))).toBe('current_location');
  });

  it('keeps only the detail of the chosen source', () => {
    expect(candidateSource({ source: 'employee_referral', referred_by_emp_id: '7', source_portal: 'naukri' })).toEqual({
      source: 'employee_referral',
      sourcePortal: null,
      referredByEmpId: 7,
      consultancyName: null,
      collegeName: null,
      sourceDetails: null,
    });
    expect(fieldOf(() => candidateSource({ source: 'employee_referral' }))).toBe('referred_by_emp_id');
    expect(fieldOf(() => candidateSource({ source: 'job_portal' }))).toBe('source_portal');
    expect(fieldOf(() => candidateSource({ source: 'consultancy', consultancy_name: ' ' }))).toBe('consultancy_name');
    expect(fieldOf(() => candidateSource({}))).toBe('source');
  });

  it('refuses a last working day in the past', () => {
    expect(futureDate('2026-12-01', 'serving_notice_lwd', 'Last working day', '2026-11-20').toISOString().slice(0, 10)).toBe('2026-12-01');
    expect(fieldOf(() => futureDate('2026-11-01', 'serving_notice_lwd', 'Last working day', '2026-11-20'))).toBe('serving_notice_lwd');
  });

  it('keeps decision and closing stages behind their forms', () => {
    expect(isPlainStage('new')).toBe(true);
    expect(isPlainStage('technical_round')).toBe(true);
    for (const s of ['open', 'selected', 'on_hold', 'rejected', 'onboarding', 'joined', 'did_not_join']) expect(isPlainStage(s)).toBe(false);
  });

  it('says the same thing about a duplicate everywhere', () => {
    expect(duplicateMessage({ type: 'employee', matchedOn: 'email', code: 'EMP-0012', name: 'Asha' })).toBe(
      'This email address belongs to the employee Asha (EMP-0012). An existing employee cannot be added as a candidate.',
    );
    expect(duplicateMessage({ type: 'candidate', matchedOn: 'phone', code: 'CAN-0003', name: 'Ravi' })).toBe(
      'A candidate with this phone number already exists: Ravi (CAN-0003).',
    );
  });
});
