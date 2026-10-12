import { CrmNormalizationService } from './crm-normalization.service';

describe('CrmNormalizationService', () => {
  describe('normalizeName', () => {
    it('should trim and collapse inner whitespace', () => {
      expect(CrmNormalizationService.normalizeName('  Acme   Corporation   Limited  ')).toBe('Acme Corporation Limited');
      expect(CrmNormalizationService.normalizeName('John   Doe')).toBe('John Doe');
      expect(CrmNormalizationService.normalizeName('')).toBe('');
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim valid emails', () => {
      expect(CrmNormalizationService.normalizeEmail('  Contact@AcmeCorp.COM  ')).toBe('contact@acmecorp.com');
      expect(CrmNormalizationService.normalizeEmail('user.name+tag@sub.domain.org')).toBe('user.name+tag@sub.domain.org');
    });

    it('should throw on invalid email formats', () => {
      expect(() => CrmNormalizationService.normalizeEmail('not-an-email')).toThrow('INVALID_EMAIL_FORMAT');
      expect(() => CrmNormalizationService.normalizeEmail('user@')).toThrow('INVALID_EMAIL_FORMAT');
      expect(() => CrmNormalizationService.normalizeEmail('@domain.com')).toThrow('INVALID_EMAIL_FORMAT');
      expect(() => CrmNormalizationService.normalizeEmail('user@domain')).toThrow('INVALID_EMAIL_FORMAT');
    });
  });

  describe('normalizePhone', () => {
    it('should remove spaces, dashes, brackets and format international numbers', () => {
      expect(CrmNormalizationService.normalizePhone('+91 (987) 654-3210')).toBe('+919876543210');
      expect(CrmNormalizationService.normalizePhone('  [+1] 800-555-0199  ')).toBe('+18005550199');
      expect(CrmNormalizationService.normalizePhone('9876543210')).toBe('9876543210');
    });

    it('should throw on invalid phone numbers', () => {
      expect(() => CrmNormalizationService.normalizePhone('12345')).toThrow('INVALID_PHONE_FORMAT'); // < 7 digits
      expect(() => CrmNormalizationService.normalizePhone('+12345678901234567')).toThrow('INVALID_PHONE_FORMAT'); // > 15 digits
      expect(() => CrmNormalizationService.normalizePhone('abc-phone')).toThrow('INVALID_PHONE_FORMAT');
    });
  });

  describe('normalizeUrl', () => {
    it('should prepend https:// if no scheme is provided', () => {
      expect(CrmNormalizationService.normalizeUrl('example.com')).toBe('https://example.com/');
      expect(CrmNormalizationService.normalizeUrl('sub.domain.co.in/page')).toBe('https://sub.domain.co.in/page');
    });

    it('should keep existing http or https scheme', () => {
      expect(CrmNormalizationService.normalizeUrl('http://insecure.com')).toBe('http://insecure.com/');
      expect(CrmNormalizationService.normalizeUrl('https://secure.com/path?param=1')).toBe('https://secure.com/path?param=1');
    });

    it('should reject javascript:, data:, and file: schemes', () => {
      expect(() => CrmNormalizationService.normalizeUrl('javascript:alert(1)')).toThrow('FORBIDDEN_URL_SCHEME');
      expect(() => CrmNormalizationService.normalizeUrl('data:text/html;base64,...')).toThrow('FORBIDDEN_URL_SCHEME');
      expect(() => CrmNormalizationService.normalizeUrl('file:///etc/passwd')).toThrow('FORBIDDEN_URL_SCHEME');
    });

    it('should reject URLs without valid hostname or host without dots', () => {
      expect(() => CrmNormalizationService.normalizeUrl('not-a-valid-host')).toThrow('INVALID_URL_HOST');
    });

    it('should reject URLs exceeding 300 characters', () => {
      const longPath = 'a'.repeat(310);
      expect(() => CrmNormalizationService.normalizeUrl(`https://example.com/${longPath}`)).toThrow('URL_TOO_LONG');
    });
  });

  describe('normalizeChannelValue', () => {
    it('should delegate based on channel type', () => {
      expect(CrmNormalizationService.normalizeChannelValue('email', 'HELLO@WORLD.COM')).toBe('hello@world.com');
      expect(CrmNormalizationService.normalizeChannelValue('phone', '+1 (555) 000-1111')).toBe('+15550001111');
      expect(CrmNormalizationService.normalizeChannelValue('whatsapp', '+91 999 888 7777')).toBe('+919998887777');
      expect(CrmNormalizationService.normalizeChannelValue('website', 'vernoxy.com')).toBe('https://vernoxy.com/');
      expect(CrmNormalizationService.normalizeChannelValue('linkedin', 'linkedin.com/in/john')).toBe('https://linkedin.com/in/john');
    });
  });
});
