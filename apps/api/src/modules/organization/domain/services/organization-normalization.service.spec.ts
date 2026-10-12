import { OrganizationNormalizationService } from './organization-normalization.service';
import { ValidationDomainError, UnprocessableDomainError } from '../errors/organization.errors';

describe('OrganizationNormalizationService', () => {
  describe('normalizeEmail', () => {
    it('normalizes valid emails by trimming and converting to lowercase', () => {
      expect(OrganizationNormalizationService.normalizeEmail('  Admin@Vernoxy.COM  ')).toBe(
        'admin@vernoxy.com',
      );
    });

    it('throws ValidationDomainError for invalid email syntax', () => {
      expect(() => OrganizationNormalizationService.normalizeEmail('invalid-email')).toThrow(
        ValidationDomainError,
      );
      expect(() => OrganizationNormalizationService.normalizeEmail('')).toThrow(
        ValidationDomainError,
      );
    });
  });

  describe('normalizeMobile', () => {
    it('strips dashes, spaces, and brackets from phone numbers', () => {
      expect(OrganizationNormalizationService.normalizeMobile('+91 (987) 654-3210')).toBe(
        '+919876543210',
      );
      expect(OrganizationNormalizationService.normalizeMobile('  9876543210  ')).toBe(
        '9876543210',
      );
    });

    it('rejects numbers that are too short or too long', () => {
      expect(() => OrganizationNormalizationService.normalizeMobile('12345')).toThrow(
        ValidationDomainError,
      );
      expect(() =>
        OrganizationNormalizationService.normalizeMobile('12345678901234567890'),
      ).toThrow(ValidationDomainError);
    });
  });

  describe('validatePassword', () => {
    it('accepts strong complex password (min 12 chars, upper, lower, digit, symbol)', () => {
      expect(() =>
        OrganizationNormalizationService.validatePassword('SuperStr0ng!P@ss', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).not.toThrow();
    });

    it('rejects passwords shorter than 6 characters', () => {
      expect(() =>
        OrganizationNormalizationService.validatePassword('Sh1!', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).toThrow(UnprocessableDomainError);
    });

    it('rejects passwords missing uppercase, lowercase, numbers, or symbols', () => {
      // missing symbol
      expect(() =>
        OrganizationNormalizationService.validatePassword('SuperStrongPassword12', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).toThrow(UnprocessableDomainError);

      // missing digit
      expect(() =>
        OrganizationNormalizationService.validatePassword('SuperStrongPassword!', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).toThrow(UnprocessableDomainError);
    });

    it('rejects common dictionary passwords', () => {
      expect(() =>
        OrganizationNormalizationService.validatePassword('password123!', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).toThrow(UnprocessableDomainError);
    });

    it('rejects passwords containing the employee name or email', () => {
      expect(() =>
        OrganizationNormalizationService.validatePassword('JaneDoe123456!@#', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).toThrow(UnprocessableDomainError);

      expect(() =>
        OrganizationNormalizationService.validatePassword('jane.vernoxy123!@#', {
          name: 'Jane Doe',
          email: 'jane@vernoxy.com',
        }),
      ).toThrow(UnprocessableDomainError);
    });
  });
});
