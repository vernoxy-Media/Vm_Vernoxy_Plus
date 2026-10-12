import {
  generate6DigitOtp,
  computeOtpHash,
  verifyOtpHash,
  maskEmail,
  isOtpExpired,
  isOtpInCooldown,
  secondsUntilCooldownExpires,
} from './otp.rules';

describe('otp.rules', () => {
  const secret = 'a'.repeat(32);
  const otpId = '11111111-1111-1111-1111-111111111111';
  const purpose = 'login_2fa';

  it('generates 6 digit string between 100000 and 999999', () => {
    for (let i = 0; i < 20; i++) {
      const code = generate6DigitOtp();
      expect(code).toMatch(/^[1-9][0-9]{5}$/);
      expect(code.length).toBe(6);
    }
  });

  it('computes consistent HMAC-SHA256 hex hash', () => {
    const hash1 = computeOtpHash(secret, otpId, purpose, '123456');
    const hash2 = computeOtpHash(secret, otpId, purpose, '123456');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('verifies code matches hash and rejects invalid code', () => {
    const hash = computeOtpHash(secret, otpId, purpose, '654321');
    expect(verifyOtpHash(secret, otpId, purpose, '654321', hash)).toBe(true);
    expect(verifyOtpHash(secret, otpId, purpose, '000000', hash)).toBe(false);
    expect(verifyOtpHash(secret, otpId, purpose, '12345', hash)).toBe(false);
  });

  it('masks emails properly', () => {
    expect(maskEmail('alice@vernoxy.com')).toBe('a***e@vernoxy.com');
    expect(maskEmail('bo@vernoxy.com')).toBe('b***@vernoxy.com');
    expect(maskEmail('administrator@domain.org')).toBe('a***r@domain.org');
  });

  it('detects expiry and cooldown accurately', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const past = new Date('2026-10-10T11:59:00Z');
    const future = new Date('2026-10-10T12:05:00Z');

    expect(isOtpExpired(past, now)).toBe(true);
    expect(isOtpExpired(future, now)).toBe(false);

    const created30sAgo = new Date('2026-10-10T11:59:30Z');
    expect(isOtpInCooldown(created30sAgo, now)).toBe(true);
    expect(secondsUntilCooldownExpires(created30sAgo, now)).toBe(30);

    const created70sAgo = new Date('2026-10-10T11:58:50Z');
    expect(isOtpInCooldown(created70sAgo, now)).toBe(false);
    expect(secondsUntilCooldownExpires(created70sAgo, now)).toBe(0);
  });
});
