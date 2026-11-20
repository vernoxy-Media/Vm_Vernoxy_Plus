import {
  EMPLOYEE_IMPORT_COLUMNS,
  classifyStatus,
  generateTemporaryPassword,
  mapOtRateType,
  mapPaymentMode,
  maskAccountNumber,
  normalizeHeaderKey,
  parseAmountCell,
  parseImportDate,
  readCell,
  splitList,
} from './employee-import-rules';
import { OrganizationNormalizationService } from './organization-normalization.service';

describe('employee import rules', () => {
  describe('parseImportDate', () => {
    it.each([
      ['20-Nov-2026', '2026-11-20'],
      ['20 Nov 2026', '2026-11-20'],
      ['20-11-2026', '2026-11-20'],
      ['20/11/2026', '2026-11-20'],
      ['2026-11-20', '2026-11-20'],
      ['5-Jun-2026', '2026-06-05'],
    ])('reads %s', (input, iso) => {
      expect(parseImportDate(input)?.toISOString().slice(0, 10)).toBe(iso);
    });

    it('reads a number date day first, so 05-06-2026 is 5 June', () => {
      expect(parseImportDate('05-06-2026')?.toISOString().slice(0, 10)).toBe('2026-06-05');
    });

    it.each(['', 'abc', '31-02-2026', '32-01-2026', '2026-13-01', '20-Foo-2026'])('rejects %p', (input) => {
      expect(parseImportDate(input)).toBeNull();
    });
  });

  describe('parseAmountCell', () => {
    it('reads plain numbers, commas and the rupee sign', () => {
      expect(parseAmountCell('25000')).toBe(25000);
      expect(parseAmountCell('₹25,000.50')).toBe(25000.5);
    });
    it('returns null for blank and NaN for text', () => {
      expect(parseAmountCell('')).toBeNull();
      expect(Number.isNaN(parseAmountCell('abc'))).toBe(true);
      expect(Number.isNaN(parseAmountCell('-5'))).toBe(true);
    });
  });

  describe('classifyStatus', () => {
    it('imports Active (any case) and treats blank as Active', () => {
      expect(classifyStatus('Active')).toBe('active');
      expect(classifyStatus(' ACTIVE ')).toBe('active');
      expect(classifyStatus('')).toBe('blank');
    });
    it('does not import anything else', () => {
      expect(classifyStatus('Inactive')).toBe('other');
      expect(classifyStatus('Resigned')).toBe('other');
    });
  });

  describe('mappers', () => {
    it('maps OT rate wording', () => {
      expect(mapOtRateType('Multiplier')).toBe('MULTIPLIER');
      expect(mapOtRateType('Fixed')).toBe('FIXED');
      expect(mapOtRateType('')).toBeNull();
      expect(mapOtRateType('weird')).toBeUndefined();
    });
    it('maps payment mode wording', () => {
      expect(mapPaymentMode('Bank Transfer')).toBe('BANK_TRANSFER');
      expect(mapPaymentMode('cash')).toBe('CASH');
      expect(mapPaymentMode('Cheque')).toBe('CHEQUE');
      expect(mapPaymentMode('')).toBeNull();
      expect(mapPaymentMode('bitcoin')).toBeUndefined();
    });
  });

  describe('maskAccountNumber', () => {
    it('keeps only the last 4 digits', () => {
      expect(maskAccountNumber('123456789012')).toBe('********9012');
      expect(maskAccountNumber('1234')).toBe('****');
      expect(maskAccountNumber('')).toBe('');
      expect(maskAccountNumber(null)).toBe('');
    });
  });

  describe('generateTemporaryPassword', () => {
    it('always passes the system password policy', () => {
      for (let i = 0; i < 200; i++) {
        const pwd = generateTemporaryPassword();
        expect(pwd).toHaveLength(14);
        expect(() =>
          OrganizationNormalizationService.validatePassword(pwd, { name: 'Zzz Yyy', email: 'qqq@example.com' }),
        ).not.toThrow();
      }
    });
    it('is different every time', () => {
      expect(new Set(Array.from({ length: 50 }, () => generateTemporaryPassword())).size).toBe(50);
    });
  });

  describe('columns', () => {
    it('reads a cell by the normalised header of the template', () => {
      const cells = { [normalizeHeaderKey('Full Name')]: ' Asha Rao ', [normalizeHeaderKey('Salary (Monthly ₹)')]: '30000' };
      expect(readCell(cells, 'full_name')).toBe('Asha Rao');
      expect(readCell(cells, 'salary')).toBe('30000');
      expect(readCell(cells, 'gender')).toBe('');
    });
    it('has a distinct header for every key', () => {
      const headers = Object.values(EMPLOYEE_IMPORT_COLUMNS).map(normalizeHeaderKey);
      expect(new Set(headers).size).toBe(headers.length);
    });
  });

  describe('splitList', () => {
    it('splits departments typed with ; , or |', () => {
      expect(splitList('IT; HR')).toEqual(['IT', 'HR']);
      expect(splitList('IT,HR|Sales')).toEqual(['IT', 'HR', 'Sales']);
      expect(splitList('')).toEqual([]);
    });
  });
});
