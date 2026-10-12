import { validatePasswordPolicy } from './password-policy';

describe('validatePasswordPolicy', () => {
  it('rejects passwords shorter than 6 characters', () => {
    const res = validatePasswordPolicy('Ab1!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password must be at least 6 characters long.');
  });

  it('rejects passwords equal to email', () => {
    const res = validatePasswordPolicy('user@vernoxy.com', { email: 'user@vernoxy.com' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password cannot be equal to email.');
  });

  it('rejects passwords equal to name', () => {
    const res = validatePasswordPolicy('AliceJohnson', { name: 'AliceJohnson' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password cannot be equal to name.');
  });

  it('rejects common passwords from the blacklist', () => {
    const res = validatePasswordPolicy('qwerty12345');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password is too common and easily guessable.');
  });

  it('accepts valid, sufficiently complex passwords', () => {
    const res = validatePasswordPolicy('SecureP@ssw0rd!2026', {
      email: 'user@example.com',
      name: 'John Doe',
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});
