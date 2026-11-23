import { randomInt } from 'crypto';
import { ValidationDomainError } from '../errors/organization.errors';

/**
 * Pure rules for the employee import sheet: which columns exist, how a cell is read, and how a temporary password
 * is made. No database here, so everything can be tested on its own.
 */

/** key -> the header text in the template. Headers are matched after the same normalising the reader applies. */
export const EMPLOYEE_IMPORT_COLUMNS = {
  full_name: 'Full Name',
  gender: 'Gender',
  phone: 'Phone Number',
  emergency_name: 'Emergency Contacts Name',
  emergency_relation: 'Emergency Contacts Relationship',
  emergency_phone: 'Emergency Contacts Phone number',
  personal_email: 'Personal Email',
  office_email: 'Office Email',
  birth_date: 'Birth Date',
  blood_group: 'Blood Group',
  address: 'Residential Address',
  departments: 'Departments',
  designation: 'Designation',
  reporting_manager: 'Reporting Manager',
  employment_type: 'Employment Type',
  shift: 'Assigned Shift',
  joining_date: 'Joining Date',
  leave_policy: 'Leave Policy',
  probation_period: 'Probation Period',
  notice_period: 'Notice Period',
  salary: 'Salary (Monthly ₹)',
  pf: 'PF (Monthly ₹)',
  uan: 'UAN',
  ot_rate_calculation: 'OT Rate Calculation',
  ot_multiplier: 'OT Multiplier',
  min_ot_minutes: 'Daily Minimum OT Threshold (Mins)',
  payment_mode: 'Disbursement Method',
  bank_name: 'Bank Name',
  account_number: 'Account Number',
  ifsc_code: 'IFSC Code',
  status: 'Status',
} as const;

export type EmployeeImportColumnKey = keyof typeof EMPLOYEE_IMPORT_COLUMNS;

/** The columns an employee cannot be created without (the BRD's required fields). */
export const EMPLOYEE_IMPORT_REQUIRED: EmployeeImportColumnKey[] = [
  'full_name',
  'gender',
  'phone',
  'personal_email',
  'office_email',
  'birth_date',
  'departments',
  'designation',
  'employment_type',
  'joining_date',
];

/** Same normalising as the spreadsheet reader: trimmed, lower case, spaces and hyphens become underscores. */
export function normalizeHeaderKey(header: string): string {
  return (header || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Reads one cell of a parsed row by our column key. */
export function readCell(cells: Record<string, string>, key: EmployeeImportColumnKey): string {
  return (cells[normalizeHeaderKey(EMPLOYEE_IMPORT_COLUMNS[key])] ?? '').trim();
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function buildUtcDate(year: number, month: number, day: number): Date | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Rejects 31-Feb and the like (JavaScript would roll them into the next month)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/**
 * Reads a date typed in the sheet. Accepted: 20-Nov-2026, 20-11-2026, 20/11/2026, 2026-11-20.
 * A number date is always day first (Indian format), so 05-06-2026 is 5 June. Returns null when it is not a real date.
 */
export function parseImportDate(raw: string): Date | null {
  const v = (raw ?? '').trim();
  if (!v) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) return buildUtcDate(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/. ,]+(\d{4})$/.exec(v);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    return month ? buildUtcDate(Number(m[3]), month, Number(m[1])) : null;
  }

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(v);
  if (m) return buildUtcDate(Number(m[3]), Number(m[2]), Number(m[1]));

  return null;
}

/** A money / number cell: 25,000 and ₹25000.50 are fine. Returns null when blank, NaN when not a number. */
export function parseAmountCell(raw: string): number | null {
  const v = (raw ?? '').replace(/[₹,\s]/g, '');
  if (!v) return null;
  if (!/^\d+(\.\d+)?$/.test(v)) return Number.NaN;
  return Number(v);
}

export type ImportStatus = 'active' | 'other' | 'blank';

/** Only "Active" is imported. A blank status is treated as Active, since an empty cell means nothing special. */
export function classifyStatus(raw: string): ImportStatus {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return 'blank';
  return v === 'active' ? 'active' : 'other';
}

export type OtRateType = 'FIXED' | 'MULTIPLIER';

/** Template wording -> stored value. Returns undefined when the wording is not known. */
export function mapOtRateType(raw: string): OtRateType | null | undefined {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'multiplier' || v === 'multiple') return 'MULTIPLIER';
  if (v === 'fixed' || v === 'fixed rate') return 'FIXED';
  return undefined;
}

export type PaymentMode = 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';

export function mapPaymentMode(raw: string): PaymentMode | null | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (!v) return null;
  if (v === 'bank transfer' || v === 'bank' || v === 'neft' || v === 'imps' || v === 'rtgs') return 'BANK_TRANSFER';
  if (v === 'cheque' || v === 'check') return 'CHEQUE';
  if (v === 'cash') return 'CASH';
  return undefined;
}

/** Reports and previews never print a whole account number: only the last 4 digits. */
export function maskAccountNumber(value: string | null | undefined): string {
  const v = (value ?? '').replace(/\s/g, '');
  if (!v) return '';
  return v.length <= 4 ? '****' : `${'*'.repeat(v.length - 4)}${v.slice(-4)}`;
}

/**
 * A one-time password for a new employee: 14 characters, with an upper case letter, a lower case letter, a digit and
 * a symbol. The employee must change it at the first sign in. It is never written to a report or a log.
 */
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!?';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[randomInt(set.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 14) chars.push(pick(all));
  // Fisher-Yates shuffle, so the first four characters are not always in the same pattern
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * The Add Employee form accepts a phone number of exactly 10 digits, with or without +91 in front. The server alone
 * is more open (7 to 15 digits), so the import applies the form's rule to give the same answer for the same number.
 * `normalized` is the number after the server's own clean-up (no spaces, dashes or brackets).
 */
export function assertFormPhoneNumber(normalized: string): void {
  if (!/^[0-9]{10}$/.test(normalized.replace(/^\+91/, ''))) {
    throw new ValidationDomainError('The phone number must be 10 digits.', 'mob');
  }
}

/** "IT; HR" / "IT, HR" / "IT|HR" -> ['IT', 'HR'] */
export function splitList(raw: string): string[] {
  return (raw ?? '')
    .split(/[;,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
