import { ValidationDomainError, UnprocessableDomainError } from '../errors/organization.errors';

const COMMON_PASSWORDS = new Set([
  'password123!',
  'admin123456!',
  'qwerty123456!',
  'welcome12345!',
  '123456789012',
  'letmein12345!',
  'password@123',
  'changeme1234!',
]);

export class OrganizationNormalizationService {
  static normalizeEmail(rawEmail: string): string {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new ValidationDomainError('Email is required', 'email');
    }
    const trimmed = rawEmail.trim().toLowerCase();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      throw new ValidationDomainError('Invalid email format', 'email');
    }
    return trimmed;
  }

  static normalizeMobile(rawMob: string): string {
    if (!rawMob || typeof rawMob !== 'string') {
      throw new ValidationDomainError('Mobile number is required', 'mob');
    }
    // Remove spaces, dashes, brackets
    const cleaned = rawMob.replace(/[\s\-\(\)]/g, '');
    const mobRegex = /^\+?[0-9]{7,15}$/;
    if (!mobRegex.test(cleaned)) {
      throw new ValidationDomainError(
        'Mobile number must contain between 7 and 15 digits and may start with +',
        'mob',
      );
    }
    return cleaned;
  }

  static validatePassword(password: string, context?: { name?: string; email?: string }): void {
    if (!password || password.length < 6) {
      throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password must be at least 6 characters long', 'password');
    }

    if (!/[A-Z]/.test(password)) {
      throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password must contain at least one uppercase letter', 'password');
    }

    if (!/[a-z]/.test(password)) {
      throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password must contain at least one lowercase letter', 'password');
    }

    if (!/[0-9]/.test(password)) {
      throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password must contain at least one number', 'password');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password must contain at least one special character', 'password');
    }

    const lowerPass = password.toLowerCase();

    if (context?.email) {
      const emailLocal = context.email.split('@')[0]?.toLowerCase();
      if (emailLocal && emailLocal.length >= 3 && lowerPass.includes(emailLocal)) {
        throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password cannot contain parts of your email address', 'password');
      }
    }

    if (context?.name) {
      const nameParts = context.name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
      for (const part of nameParts) {
        if (lowerPass.includes(part)) {
          throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password cannot contain your name', 'password');
        }
      }
    }

    if (COMMON_PASSWORDS.has(lowerPass)) {
      throw new UnprocessableDomainError('WEAK_PASSWORD', 'Password is too common and easily guessable', 'password');
    }
  }
}
