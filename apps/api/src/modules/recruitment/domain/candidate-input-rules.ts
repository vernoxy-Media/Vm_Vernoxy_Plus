/**
 * Rules for what is typed into a candidate. Pure, so they can be tested without a database, and the same for adding
 * and editing a candidate.
 */

/** A rule was broken. `field` is the form field it belongs to, so the form can mark it. */
export class CandidateValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'CandidateValidationError';
  }
}

/** The candidate is not there, or the signed-in employee may not see it. */
export class CandidateNotFoundError extends Error {
  constructor(candidateId: number) {
    super(`Candidate #${candidateId} was not found.`);
    this.name = 'CandidateNotFoundError';
  }
}

/** The signed-in employee may not do this to the candidate. */
export class CandidateAccessDeniedError extends Error {
  constructor(message = 'You do not have access to this candidate.') {
    super(message);
    this.name = 'CandidateAccessDeniedError';
  }
}

/** Stages that need the decision form (offer details, a reason, a note) or the conversion, so never a plain move. */
export const DECISION_STAGES = ['selected', 'on_hold', 'rejected'] as const;
export const CLOSED_STAGES = ['onboarding', 'joined', 'did_not_join'] as const;

/** A stage a candidate can be added with or moved to straight away, without a form. */
export function isPlainStage(code: string): boolean {
  const c = code.trim().toLowerCase();
  return c !== 'open' && !(DECISION_STAGES as readonly string[]).includes(c) && !(CLOSED_STAGES as readonly string[]).includes(c);
}

export const MAX_CTC = 1_000_000_000; // ₹100 crore a year: anything above is a typing mistake
export const MAX_SKILLS = 30;
export const MAX_SKILL_LENGTH = 50;

const NAME_RE = /^[\p{L}][\p{L}\p{M} .'’-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOCATION_RE = /^[\p{L}][\p{L}\p{M} .,'’()-]*$/u;
const TEXT_RE = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'’()/+#@-]*$/u;

const clean = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim().replace(/\s+/g, ' '));

export function personName(value: unknown, field = 'name', label = 'Full name'): string {
  const v = clean(value);
  if (!v) throw new CandidateValidationError(`${label} is required.`, field);
  if (v.length < 2) throw new CandidateValidationError(`${label} must be at least 2 characters.`, field);
  if (v.length > 100) throw new CandidateValidationError(`${label} must be at most 100 characters.`, field);
  if (!NAME_RE.test(v)) {
    throw new CandidateValidationError(`${label} can contain only letters, spaces and . ' - (no numbers or special characters).`, field);
  }
  return v;
}

/** A 10-digit mobile number. A country code written in front (+91) is dropped; the form sends it separately. */
export function mobileNumber(value: unknown, field = 'phone'): string {
  const raw = clean(value).replace(/[\s()-]/g, '');
  if (!raw) throw new CandidateValidationError('Phone number is required.', field);
  if (!/^\+?\d+$/.test(raw)) throw new CandidateValidationError('Phone number can contain only digits.', field);
  const digits = raw.replace(/^\+/, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10 || digits.length > 14) throw new CandidateValidationError('Phone number must be 10 digits.', field);
  if (/^(\d)\1{9}$/.test(local)) throw new CandidateValidationError('Please enter a real phone number.', field);
  return local;
}

export function emailAddress(value: unknown, field = 'email'): string {
  const v = clean(value).toLowerCase();
  if (!v) throw new CandidateValidationError('Email address is required.', field);
  if (v.length > 255 || !EMAIL_RE.test(v)) throw new CandidateValidationError('Please enter a valid email address.', field);
  return v;
}

/** Free text such as a company or college name: optional, letters and digits first, no stray symbols. */
export function optionalText(value: unknown, field: string, label: string, max = 255): string | null {
  const v = clean(value);
  if (!v) return null;
  if (v.length > max) throw new CandidateValidationError(`${label} must be at most ${max} characters.`, field);
  if (!TEXT_RE.test(v)) throw new CandidateValidationError(`${label} contains characters that are not allowed.`, field);
  return v;
}

export function requiredText(value: unknown, field: string, label: string, max = 255): string {
  const v = optionalText(value, field, label, max);
  if (!v) throw new CandidateValidationError(`${label} is required.`, field);
  return v;
}

export function optionalLocation(value: unknown, field = 'current_location'): string | null {
  const v = clean(value);
  if (!v) return null;
  if (v.length > 255) throw new CandidateValidationError('Location must be at most 255 characters.', field);
  if (!LOCATION_RE.test(v)) throw new CandidateValidationError('Location can contain only letters, spaces and commas.', field);
  return v;
}

/** A yearly salary: optional, a whole-rupee-or-paise number, never negative. */
export function optionalCtc(value: unknown, field: string, label: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new CandidateValidationError(`${label} must be a number.`, field);
  if (n < 0) throw new CandidateValidationError(`${label} cannot be negative.`, field);
  if (n > MAX_CTC) throw new CandidateValidationError(`${label} looks too large. Please check the amount.`, field);
  return Math.round(n * 100) / 100;
}

export interface Experience {
  experienceType: 'fresher' | 'experienced';
  expYears: number;
  expMonths: number;
}

export function experience(type: unknown, years: unknown, months: unknown): Experience {
  const t = clean(type).toLowerCase();
  if (t !== 'fresher' && t !== 'experienced') {
    throw new CandidateValidationError('Experience type must be Fresher or Experienced.', 'experience_type');
  }
  if (t === 'fresher') return { experienceType: 'fresher', expYears: 0, expMonths: 0 };
  const y = years === undefined || years === null || years === '' ? 0 : Number(years);
  const m = months === undefined || months === null || months === '' ? 0 : Number(months);
  if (!Number.isInteger(y) || y < 0 || y > 50) throw new CandidateValidationError('Years of experience must be between 0 and 50.', 'exp_years');
  if (!Number.isInteger(m) || m < 0 || m > 11) throw new CandidateValidationError('Months of experience must be between 0 and 11.', 'exp_months');
  if (y === 0 && m === 0) throw new CandidateValidationError('Please enter the total experience, or choose Fresher.', 'exp_years');
  return { experienceType: 'experienced', expYears: y, expMonths: m };
}

/** Key skills: trimmed, without repeats (ignoring case), each short, and not too many. */
export function keySkills(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new CandidateValidationError('Key skills must be a list.', 'key_skills');
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const s = clean(raw);
    if (!s) continue;
    if (s.length > MAX_SKILL_LENGTH) {
      throw new CandidateValidationError(`The skill "${s.slice(0, 20)}…" is too long (at most ${MAX_SKILL_LENGTH} characters).`, 'key_skills');
    }
    if (!TEXT_RE.test(s)) throw new CandidateValidationError(`The skill "${s}" contains characters that are not allowed.`, 'key_skills');
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  if (out.length > MAX_SKILLS) throw new CandidateValidationError(`At most ${MAX_SKILLS} key skills can be added.`, 'key_skills');
  return out;
}

/** A YYYY-MM-DD date that is today or later (`today` is passed in so the rule stays testable). */
export function futureDate(value: unknown, field: string, label: string, today: string): Date {
  const v = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) throw new CandidateValidationError(`${label} is required.`, field);
  const day = v.slice(0, 10);
  const d = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new CandidateValidationError(`${label} is not a valid date.`, field);
  if (day < today) throw new CandidateValidationError(`${label} cannot be in the past.`, field);
  return d;
}

export interface SourceInput {
  source?: unknown;
  source_portal?: unknown;
  referred_by_emp_id?: unknown;
  consultancy_name?: unknown;
  college_name?: unknown;
  source_details?: unknown;
}

export interface CandidateSource {
  source: string;
  sourcePortal: string | null;
  referredByEmpId: number | null;
  consultancyName: string | null;
  collegeName: string | null;
  sourceDetails: string | null;
}

/** Where the candidate came from, with only the detail that belongs to that source kept. */
export function candidateSource(input: SourceInput): CandidateSource {
  const source = clean(input.source).toLowerCase();
  if (!source) throw new CandidateValidationError('Please select a candidate source.', 'source');
  const out: CandidateSource = { source, sourcePortal: null, referredByEmpId: null, consultancyName: null, collegeName: null, sourceDetails: null };
  if (source === 'job_portal') {
    out.sourcePortal = clean(input.source_portal) || null;
    if (!out.sourcePortal) throw new CandidateValidationError('Please select a job portal.', 'source_portal');
  } else if (source === 'employee_referral') {
    const id = Number(input.referred_by_emp_id);
    if (!Number.isInteger(id) || id <= 0) throw new CandidateValidationError('Please select the referring employee.', 'referred_by_emp_id');
    out.referredByEmpId = id;
  } else if (source === 'consultancy') {
    out.consultancyName = requiredText(input.consultancy_name, 'consultancy_name', 'Consultancy name');
  } else if (source === 'campus') {
    out.collegeName = requiredText(input.college_name, 'college_name', 'College name');
  } else if (source === 'other') {
    const d = clean(input.source_details);
    if (!d) throw new CandidateValidationError('Please describe how the candidate was sourced.', 'source_details');
    if (d.length > 500) throw new CandidateValidationError('Source details must be at most 500 characters.', 'source_details');
    out.sourceDetails = d;
  }
  return out;
}

export function optionalNotes(value: unknown, field = 'notes', max = 2000): string | null {
  const v = value === undefined || value === null ? '' : String(value).trim();
  if (!v) return null;
  if (v.length > max) throw new CandidateValidationError(`Notes must be at most ${max} characters.`, field);
  return v;
}

/** The candidate fields as the form sends them (snake_case). */
export interface CandidateInput extends SourceInput {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  gender_id?: unknown;
  current_location?: unknown;
  resume_url?: unknown;
  resume_filename?: unknown;
  resume_size?: unknown;
  resume_mime?: unknown;
  role_id?: unknown;
  dep_id?: unknown;
  experience_type?: unknown;
  exp_years?: unknown;
  exp_months?: unknown;
  current_company?: unknown;
  current_designation?: unknown;
  current_ctc?: unknown;
  expected_ctc?: unknown;
  notice_period?: unknown;
  serving_notice_lwd?: unknown;
  key_skills?: unknown;
  notes?: unknown;
  stage?: unknown;
  assigned_to_emp_id?: unknown;
}

/** A candidate after every rule above: what is saved. */
export interface CleanCandidate extends Experience, CandidateSource {
  name: string;
  phone: string;
  email: string;
  genderId: number | null;
  currentLocation: string | null;
  resumeUrl: string | null;
  resumeFilename: string | null;
  resumeSize: number | null;
  resumeMime: string | null;
  roleId: number;
  depId: number;
  currentCompany: string | null;
  currentDesignation: string | null;
  currentCtc: number | null;
  expectedCtc: number | null;
  noticePeriod: string | null;
  servingNoticeLwd: Date | null;
  keySkills: string[];
  notes: string | null;
  stage: string;
  assignedToEmpId: number | null;
}

const optionalId = (value: unknown, field: string, label: string): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new CandidateValidationError(`Please select a valid ${label}.`, field);
  return n;
};

const requiredId = (value: unknown, field: string, label: string): number => {
  const n = optionalId(value, field, label);
  if (n === null) throw new CandidateValidationError(`Please select a ${label}.`, field);
  return n;
};

/**
 * Every rule for one candidate, in form order so the first mistake reported is the first one on the screen.
 * `today` is YYYY-MM-DD. The checks that need the database (duplicates, the role's department, an active referrer or
 * assignee, a known stage) are done by the caller.
 */
export function normalizeCandidateInput(input: CandidateInput, today: string): CleanCandidate {
  const name = personName(input.name);
  const phone = mobileNumber(input.phone);
  const email = emailAddress(input.email);
  const currentLocation = optionalLocation(input.current_location);
  const depId = requiredId(input.dep_id, 'dep_id', 'department');
  const roleId = requiredId(input.role_id, 'role_id', 'position');
  const exp = experience(input.experience_type ?? 'experienced', input.exp_years, input.exp_months);
  const experienced = exp.experienceType === 'experienced';
  const noticePeriod = experienced ? clean(input.notice_period) || null : null;
  const servingNoticeLwd =
    experienced && noticePeriod === 'serving_notice'
      ? futureDate(input.serving_notice_lwd, 'serving_notice_lwd', 'Last working day', today)
      : null;
  const resumeSize = input.resume_size === undefined || input.resume_size === null || input.resume_size === '' ? null : Number(input.resume_size);

  return {
    name,
    phone,
    email,
    genderId: optionalId(input.gender_id, 'gender_id', 'gender'),
    currentLocation,
    resumeUrl: clean(input.resume_url) || null,
    resumeFilename: clean(input.resume_filename) || null,
    resumeSize: Number.isFinite(resumeSize) ? resumeSize : null,
    resumeMime: clean(input.resume_mime) || null,
    roleId,
    depId,
    ...exp,
    currentCompany: experienced ? optionalText(input.current_company, 'current_company', 'Current company') : null,
    currentDesignation: experienced ? optionalText(input.current_designation, 'current_designation', 'Current designation') : null,
    currentCtc: experienced ? optionalCtc(input.current_ctc, 'current_ctc', 'Current CTC') : null,
    expectedCtc: optionalCtc(input.expected_ctc, 'expected_ctc', 'Expected CTC'),
    noticePeriod,
    servingNoticeLwd,
    keySkills: keySkills(input.key_skills),
    ...candidateSource(input),
    notes: optionalNotes(input.notes),
    stage: clean(input.stage).toLowerCase() || 'new',
    assignedToEmpId: optionalId(input.assigned_to_emp_id, 'assigned_to_emp_id', 'employee to assign'),
  };
}

/** What a duplicate looks like to the person adding the candidate: the same words on the form and from the server. */
export interface DuplicateHit {
  type: 'candidate' | 'employee';
  matchedOn: 'email' | 'phone';
  code: string;
  name: string;
  stage?: string | null;
}

export function duplicateMessage(hit: DuplicateHit): string {
  const what = hit.matchedOn === 'email' ? 'email address' : 'phone number';
  return hit.type === 'employee'
    ? `This ${what} belongs to the employee ${hit.name} (${hit.code}). An existing employee cannot be added as a candidate.`
    : `A candidate with this ${what} already exists: ${hit.name} (${hit.code}).`;
}
