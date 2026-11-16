import { assertAmount, assertPersonName, MAX_EMERGENCY_CONTACTS, normalizeEmergencyContacts } from './employee-input-rules';

describe('assertPersonName', () => {
  it.each(['Alice Johnson', "Anne-Marie O'Neil", 'Dr. Ravi Kumar', 'Zoë Müller', 'राहुल शर्मा'])('accepts %s', (n) => {
    expect(assertPersonName(n, 'name')).toBe(n);
  });
  it('tidies spaces', () => expect(assertPersonName('  Alice   Johnson ', 'name')).toBe('Alice Johnson'));
  it.each(['', '   ', 'Alice@home', 'Bob#1', 'R2D2', '<script>', '123', '-Alice', 'A'.repeat(101)])('refuses %p', (n) => {
    expect(() => assertPersonName(n, 'name')).toThrow();
  });
});

describe('normalizeEmergencyContacts', () => {
  it('keeps several contacts in order and cleans the number', () => {
    expect(
      normalizeEmergencyContacts([
        { name: 'John Johnson', relation: 'Spouse', number: '+91 98765-43210' },
        { name: 'Mary Ann', relation: '', number: '9123456789' },
      ]),
    ).toEqual([
      { name: 'John Johnson', relation: 'Spouse', number: '+919876543210' },
      { name: 'Mary Ann', relation: null, number: '9123456789' },
    ]);
  });
  it('drops an empty row but not a half filled one', () => {
    expect(normalizeEmergencyContacts([{ name: '', number: '' }])).toEqual([]);
    expect(() => normalizeEmergencyContacts([{ name: 'John', number: '' }])).toThrow(/Phone number/);
    expect(() => normalizeEmergencyContacts([{ name: '', number: '9876543210' }])).toThrow(/name is required/);
  });
  it('refuses a bad number, a bad name and too many contacts', () => {
    expect(() => normalizeEmergencyContacts([{ name: 'John', number: '12ab' }])).toThrow();
    expect(() => normalizeEmergencyContacts([{ name: 'J0hn!', number: '9876543210' }])).toThrow();
    const many = Array.from({ length: MAX_EMERGENCY_CONTACTS + 1 }, (_, i) => ({ name: `Person ${String.fromCharCode(65 + i)}`, number: `98765432${10 + i}` }));
    expect(() => normalizeEmergencyContacts(many)).toThrow(/At most/);
  });
  it('is empty when nothing is sent', () => {
    expect(normalizeEmergencyContacts(undefined)).toEqual([]);
    expect(normalizeEmergencyContacts(null)).toEqual([]);
  });
});

describe('assertAmount', () => {
  it('accepts zero and positive numbers', () => {
    expect(assertAmount(0, 'salary', 'Salary')).toBe(0);
    expect(assertAmount('45000.5', 'salary', 'Salary')).toBe(45000.5);
  });
  it('refuses negative and non-numbers', () => {
    expect(() => assertAmount(-1, 'salary', 'Salary')).toThrow(/negative/);
    expect(() => assertAmount('abc', 'salary', 'Salary')).toThrow();
  });
});
