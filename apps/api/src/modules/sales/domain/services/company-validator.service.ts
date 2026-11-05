import { FieldError } from '../errors/sales.errors';
import { CompanyFields, ContactFields, WEBSITE_QUALITIES } from '../entities/sales-company';

/** "good" -> "Good", "no website" -> "No Website": the file may use any capitals. */
export const WEBSITE_QUALITY_ALIASES: ReadonlyMap<string, string> = new Map(WEBSITE_QUALITIES.map((q) => [q.toLowerCase(), q]));

/** Messages are exactly the ones in BFD section 4, Part 5. */
export const MSG = {
  required: 'Please fill this field.',
  mobile: 'The mobile number must be 10 digits.',
  email: 'Please enter a valid email.',
  pin: 'Please enter a valid PIN code.',
  wholeNumber: 'Please enter a whole number, 0 or more.',
  zeroOrMore: 'Please enter 0 or more.',
  year: 'Please enter a valid year (YYYY).',
  link: 'Please enter a valid link.',
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isWholeNumber(n: number | null): boolean {
  return n === null || (Number.isInteger(n) && n >= 0);
}

export function isValidLink(value: string | null): boolean {
  if (value === null) return true;
  try {
    // "www.example.in" is accepted: assume https when no scheme is typed.
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withScheme);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      /^[^\s.]+(\.[^\s.]+)+$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

const LINK_FIELDS: Array<keyof CompanyFields> = [
  'website',
  'google_maps_url',
  'linkedin_url',
  'instagram_url',
  'facebook_url',
  'youtube_url',
  'google_business_profile_url',
];

/**
 * Validates a company (and optional first contact) with the same rules for the
 * Add Company form, Edit and Import. `fields` and `contact` must already be
 * normalized (see sales-normalization.service).
 */
export function validateCompany(
  fields: CompanyFields,
  contact: ContactFields,
  now: Date = new Date(),
): FieldError[] {
  const errors: FieldError[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });

  if (!fields.name || fields.name.trim() === '') add('name', MSG.required);

  if (fields.is_gidc) {
    if (!fields.gidc_name) add('gidc_name', MSG.required);
    if (!fields.gidc_area_phase) add('gidc_area_phase', MSG.required);
  }

  const isIndia = !fields.country || fields.country.trim().toLowerCase() === 'india';
  if (fields.pin !== null && isIndia && !/^\d{6}$/.test(fields.pin)) add('pin', MSG.pin);

  for (const f of ['no_of_branches', 'no_of_plants', 'estimated_employees'] as const) {
    if (!isWholeNumber(fields[f])) add(f, MSG.wholeNumber);
  }
  if (fields.estimated_turnover !== null && !(fields.estimated_turnover >= 0)) {
    add('estimated_turnover', MSG.zeroOrMore);
  }
  if (
    fields.year_established !== null &&
    !(Number.isInteger(fields.year_established) &&
      fields.year_established >= 1900 &&
      fields.year_established <= now.getFullYear())
  ) {
    add('year_established', MSG.year);
  }

  for (const f of LINK_FIELDS) {
    if (!isValidLink(fields[f] as string | null)) add(f, MSG.link);
  }

  if (
    fields.website_quality !== null &&
    !(WEBSITE_QUALITIES as readonly string[]).includes(fields.website_quality)
  ) {
    add('website_quality', `Choose one of: ${WEBSITE_QUALITIES.join(', ')}.`);
  }

  const hasContactDetail = contact.mobile !== null || contact.email !== null || contact.designation !== null;
  if (hasContactDetail && contact.name === null) add('contact.name', MSG.required);

  if (contact.mobile !== null && !/^\d{10}$/.test(contact.mobile)) add('contact.mobile', MSG.mobile);
  if (contact.email !== null && !EMAIL_RE.test(contact.email)) add('contact.email', MSG.email);

  return errors;
}

/**
 * Applies the derived-field rules of the form: no website means "No Website",
 * and the GIDC fields are cleared when Is GIDC is not ticked.
 */
export function applyCompanyDefaults(fields: CompanyFields): CompanyFields {
  const next = { ...fields };
  if (!next.is_gidc) {
    next.gidc_name = null;
    next.gidc_area_phase = null;
  }
  if (next.website === null) next.website_quality = 'No Website';
  if (next.country === null) next.country = 'India';
  return next;
}
