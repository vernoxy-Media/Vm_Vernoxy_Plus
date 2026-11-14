import { generateTemporaryPassword, hashResetCode, normalizeEmail, passwordProblem, progressPercent, sameHash } from './client-rules';

describe('generateTemporaryPassword', () => {
  it('is long enough, has every kind of character and is different each time', () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).toHaveLength(12);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/\d/);
    expect(a).toMatch(/[@#$%&*]/);
    expect(a).not.toBe(b);
    expect(passwordProblem(a)).toBeNull();
  });
});

describe('passwordProblem', () => {
  it('asks for 8+ characters with letters and a number', () => {
    expect(passwordProblem('abc1')).toMatch(/8/);
    expect(passwordProblem('abcdefgh')).toMatch(/number/);
    expect(passwordProblem('12345678')).toMatch(/number/);
    expect(passwordProblem('abcdefg1')).toBeNull();
  });
});

describe('progressPercent', () => {
  it('is the share of finished tasks, 0 without tasks', () => {
    expect(progressPercent({ total: 0, done: 0 })).toBe(0);
    expect(progressPercent({ total: 8, done: 2 })).toBe(25);
    expect(progressPercent({ total: 3, done: 3 })).toBe(100);
    expect(progressPercent({ total: 3, done: 5 })).toBe(100);
  });
});

describe('reset code hash', () => {
  it('matches only the same user, code and secret', () => {
    const h = hashResetCode('s'.repeat(32), 4, '123456');
    expect(sameHash(h, hashResetCode('s'.repeat(32), 4, '123456'))).toBe(true);
    expect(sameHash(h, hashResetCode('s'.repeat(32), 5, '123456'))).toBe(false);
    expect(sameHash(h, hashResetCode('s'.repeat(32), 4, '654321'))).toBe(false);
  });
  it('emails are compared in lower case without spaces', () => {
    expect(normalizeEmail('  Client@Acme.COM ')).toBe('client@acme.com');
  });
});
