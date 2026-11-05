import { FieldError } from '../errors/sales.errors';
import { CompanyFields, ContactFields } from '../entities/sales-company';
import { IMPORT_FIELDS } from '../entities/import-fields';
import { applyCompanyDefaults, validateCompany, WEBSITE_QUALITY_ALIASES } from './company-validator.service';
import { mergeCompanyFields, mergeContact } from './company-input.service';
import { nameKey } from './sales-normalization.service';

export interface ImportLeadPart {
  lead_source: string | null;
  /** Name or email of a sales user, resolved against the employees later. */
  lead_by: string | null;
  service_fit: string[];
}

export interface ConvertedRow {
  row_number: number;
  company: CompanyFields;
  contact: ContactFields;
  lead: ImportLeadPart;
  errors: FieldError[];
  warnings: string[];
}

const HEADER_OF = new Map(IMPORT_FIELDS.map((f) => [f.key, f.header]));
/** The column name the user knows, for error messages ("Mobile", not "contact.mobile"). */
export const headerOf = (key: string): string => HEADER_OF.get(key) ?? key;

const CONTACT_KEY: Record<string, string> = {
  'contact.name': 'contact_name',
  'contact.mobile': 'mobile',
  'contact.email': 'email',
  'contact.designation': 'designation',
};
const columnFor = (field: string): string => HEADER_OF.get(CONTACT_KEY[field] ?? field) ?? field;

const YES = new Set(['yes', 'y', 'true', '1', 'x', 'checked']);
const NO = new Set(['no', 'n', 'false', '0']);

/** Yes / No / true / false / 1 / 0. Anything else is null (an error for the caller). */
export function parseBool(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return null;
}

/** "45,00,000", "₹ 45,00,000" and "4500000" all become 4500000; text that is not a number becomes NaN. */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** Service Fit can hold several values: "Website Development, Mobile App". */
export function splitList(value: string): string[] {
  return value.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Turns the values of one file row into the same shape as the Add Company form and applies the
 * same rules (BFD section 3, Part 2: "every row is checked with the same rules as the Add Company
 * form"). Master values (Industry, Lead Source, ...) are checked later against the database.
 */
export function convertRow(rowNumber: number, v: Record<string, string>, now = new Date()): ConvertedRow {
  const errors: FieldError[] = [];
  const warnings: string[] = [];
  const err = (field: string, message: string) => errors.push({ field, message });

  const text = (k: string): string | undefined => (v[k] !== undefined ? v[k] : undefined);
  const raw: Record<string, unknown> = {};
  for (const k of [
    'name', 'full_address', 'city', 'state', 'country', 'pin', 'google_maps_url', 'gidc_name', 'gidc_area_phase',
    'nature_of_business', 'industry', 'products_services', 'existing_major_clients', 'website', 'website_quality',
    'developed_by', 'linkedin_url', 'instagram_url', 'facebook_url', 'youtube_url', 'google_business_profile_url',
  ]) {
    const t = text(k);
    if (t !== undefined) raw[k] = t;
  }
  for (const k of ['no_of_branches', 'no_of_plants', 'estimated_employees', 'estimated_turnover', 'year_established']) {
    const t = text(k);
    if (t !== undefined) raw[k] = parseNumber(t);
  }
  if (text('is_gidc') !== undefined) {
    const b = parseBool(v.is_gidc);
    if (b === null) err('Is GIDC', 'Please enter Yes or No.');
    else raw.is_gidc = b;
  }
  if (typeof raw.website_quality === 'string') {
    const canonical = WEBSITE_QUALITY_ALIASES.get((raw.website_quality as string).toLowerCase());
    if (canonical) raw.website_quality = canonical;
  }

  const company = applyCompanyDefaults(mergeCompanyFields(null, raw));
  const contact = mergeContact(null, { name: v.contact_name, designation: v.designation, mobile: v.mobile, email: v.email });

  for (const e of validateCompany(company, contact, now)) err(columnFor(e.field), e.message);

  for (const k of ['date_added', 'status']) {
    if (v[k] !== undefined) warnings.push(`${HEADER_OF.get(k)} is set by the system and is ignored.`);
  }
  return {
    row_number: rowNumber,
    company,
    contact,
    lead: {
      lead_source: v.lead_source ?? null,
      lead_by: v.lead_by ?? null,
      service_fit: v.service_fit ? splitList(v.service_fit) : [],
    },
    errors,
    warnings,
  };
}

/** A row gets a lead only when it has all three of Lead Source, Lead By and Service Fit. */
export function hasLeadData(l: ImportLeadPart): boolean {
  return !!l.lead_source && !!l.lead_by && l.service_fit.length > 0;
}

export function hasAnyLeadData(l: ImportLeadPart): boolean {
  return !!l.lead_source || !!l.lead_by || l.service_fit.length > 0;
}

/** The identity of a row, compared with the database and with the other rows of the file (BFD section 4, Part 5). */
export function identityKeys(company: CompanyFields, contact: ContactFields): { name_city: string; mobile: string | null; email: string | null } {
  return {
    name_city: `${nameKey(company.name)}|${nameKey(company.city)}`,
    mobile: contact.mobile,
    email: contact.email,
  };
}
