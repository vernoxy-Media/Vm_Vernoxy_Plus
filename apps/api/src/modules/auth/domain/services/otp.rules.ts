import * as crypto from 'crypto';

export const OTP_EXPIRY_SECONDS = 600; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 seconds
export const OTP_HOURLY_CAP = 5;

export function generate6DigitOtp(): string {
  // Generates 100000..999999
  const n = crypto.randomInt(100000, 1000000);
  return n.toString();
}

export function computeOtpHash(secret: string, otpId: string, purpose: string, code: string): string {
  const payload = `${otpId}:${purpose}:${code.trim()}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyOtpHash(secret: string, otpId: string, purpose: string, code: string, storedHash: string): boolean {
  if (!storedHash || storedHash.length !== 64 || !code || code.trim().length !== 6) {
    return false;
  }
  const computed = computeOtpHash(secret, otpId, purpose, code);
  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function maskEmail(email: string): string {
  const parts = email.trim().split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function isOtpExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isOtpInCooldown(createdAt: Date, now: Date = new Date()): boolean {
  const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;
  return diffSeconds < OTP_RESEND_COOLDOWN_SECONDS;
}

export function secondsUntilCooldownExpires(createdAt: Date, now: Date = new Date()): number {
  const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;
  const remaining = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - diffSeconds);
  return remaining > 0 ? remaining : 0;
}
