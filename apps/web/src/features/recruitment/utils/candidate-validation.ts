/**
 * The candidate form's checks. The same rules and the same words as the server
 * (apps/api/src/modules/recruitment/domain/candidate-input-rules.ts), so a mistake is caught before saving and reads
 * the same either way.
 */

export const MAX_CTC = 1_000_000_000;
export const MAX_SKILLS = 30;
export const MAX_SKILL_LENGTH = 50;

const NAME_RE = /^[\p{L}][\p{L}\p{M} .'’-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOCATION_RE = /^[\p{L}][\p{L}\p{M} .,'’()-]*$/u;
const TEXT_RE = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'’()/+#@-]*$/u;

const squash = (v: string) => v.trim().replace(/\s+/g, ' ');

/** Each function returns the problem, or '' when the value is fine. */
export function nameError(value: string): string {
  const v = squash(value);
  if (!v) return 'Full name is required.';
  if (v.length < 2) return 'Full name must be at least 2 characters.';
  if (v.length > 100) return 'Full name must be at most 100 characters.';
  if (!NAME_RE.test(v)) return "Full name can contain only letters, spaces and . ' - (no numbers or special characters).";
  return '';
}

export function phoneError(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'Phone number is required.';
  if (digits.length !== 10) return 'Phone number must be 10 digits.';
  if (/^(\d)\1{9}$/.test(digits)) return 'Please enter a real phone number.';
  return '';
}

export function emailError(value: string): string {
  const v = value.trim();
  if (!v) return 'Email address is required.';
  if (v.length > 255 || !EMAIL_RE.test(v)) return 'Please enter a valid email address.';
  return '';
}

export function locationError(value: string, label = 'Location'): string {
  const v = squash(value);
  if (!v) return '';
  if (v.length > 120) return `${label} must be at most 120 characters.`;
  if (!LOCATION_RE.test(v)) return `${label} can contain only letters and spaces.`;
  return '';
}

export function textError(value: string, label: string, max = 255): string {
  const v = squash(value);
  if (!v) return '';
  if (v.length > max) return `${label} must be at most ${max} characters.`;
  if (!TEXT_RE.test(v)) return `${label} contains characters that are not allowed.`;
  return '';
}

/** A yearly salary typed in the form ('' means not given). */
export function ctcError(value: string, label: string): string {
  const v = value.trim();
  if (!v) return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (n > MAX_CTC) return `${label} looks too large. Please check the amount.`;
  return '';
}

export function experienceError(years: number, months: number): string {
  if (!Number.isInteger(years) || years < 0 || years > 50) return 'Years of experience must be between 0 and 50.';
  if (!Number.isInteger(months) || months < 0 || months > 11) return 'Months of experience must be between 0 and 11.';
  if (years === 0 && months === 0) return 'Please enter the total experience, or choose Fresher.';
  return '';
}

export function skillError(value: string, existing: string[]): string {
  const v = squash(value);
  if (!v) return '';
  if (v.length > MAX_SKILL_LENGTH) return `A skill can be at most ${MAX_SKILL_LENGTH} characters.`;
  if (!TEXT_RE.test(v)) return `The skill "${v}" contains characters that are not allowed.`;
  if (existing.some((s) => s.toLowerCase() === v.toLowerCase())) return `"${v}" is already added.`;
  if (existing.length >= MAX_SKILLS) return `At most ${MAX_SKILLS} key skills can be added.`;
  return '';
}

/** YYYY-MM-DD for today in the browser's time zone */
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function futureDateError(value: string, label: string, today = todayIso()): string {
  if (!value) return `${label} is required.`;
  if (value.slice(0, 10) < today) return `${label} cannot be in the past.`;
  return '';
}

/** Lets only digits into an amount box, so "-", "e" and "+" can never be typed */
export function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, '').slice(0, 10);
}

/** Server field names -> the form tab they are on, so a server error opens the right tab */
export const FIELD_TAB: Record<string, 'info' | 'experience' | 'source'> = {
  name: 'info',
  phone: 'info',
  email: 'info',
  gender_id: 'info',
  current_location: 'info',
  resume: 'info',
  dep_id: 'experience',
  role_id: 'experience',
  experience_type: 'experience',
  exp_years: 'experience',
  exp_months: 'experience',
  current_company: 'experience',
  current_designation: 'experience',
  current_ctc: 'experience',
  expected_ctc: 'experience',
  notice_period: 'experience',
  serving_notice_lwd: 'experience',
  key_skills: 'experience',
  source: 'source',
  source_portal: 'source',
  referred_by_emp_id: 'source',
  consultancy_name: 'source',
  college_name: 'source',
  source_details: 'source',
  stage: 'source',
  notes: 'source',
  assigned_to_emp_id: 'source',
};
