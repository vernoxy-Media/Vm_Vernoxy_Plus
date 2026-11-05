import { CompanyFields, ContactFields } from '../entities/sales-company';
import { cleanText, normalizeEmail, normalizeMobile } from './sales-normalization.service';

type Raw = Record<string, unknown>;

const TEXT_KEYS = [
  'name',
  'full_address',
  'city',
  'state',
  'country',
  'pin',
  'google_maps_url',
  'gidc_name',
  'gidc_area_phase',
  'nature_of_business',
  'industry',
  'products_services',
  'existing_major_clients',
  'website',
  'website_quality',
  'developed_by',
  'linkedin_url',
  'instagram_url',
  'facebook_url',
  'youtube_url',
  'google_business_profile_url',
] as const;

const NUMBER_KEYS = [
  'no_of_branches',
  'no_of_plants',
  'estimated_employees',
  'estimated_turnover',
  'year_established',
] as const;

export function emptyCompanyFields(): CompanyFields {
  return {
    name: '',
    no_of_branches: null,
    no_of_plants: null,
    full_address: null,
    city: null,
    state: null,
    country: null,
    pin: null,
    google_maps_url: null,
    is_gidc: false,
    gidc_name: null,
    gidc_area_phase: null,
    nature_of_business: null,
    industry: null,
    products_services: null,
    estimated_employees: null,
    estimated_turnover: null,
    year_established: null,
    existing_major_clients: null,
    website: null,
    website_quality: null,
    developed_by: null,
    linkedin_url: null,
    instagram_url: null,
    facebook_url: null,
    youtube_url: null,
    google_business_profile_url: null,
  };
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Builds the normalized company fields. Keys that are absent from `raw` keep the
 * value from `base` (PATCH semantics); keys sent as null / "" are cleared.
 */
export function mergeCompanyFields(base: CompanyFields | null, raw: Raw): CompanyFields {
  const next: CompanyFields = { ...(base ?? emptyCompanyFields()) };
  const target = next as unknown as Record<string, unknown>;
  for (const k of TEXT_KEYS) {
    if (raw[k] !== undefined) target[k] = k === 'name' ? (cleanText(raw[k]) ?? '') : cleanText(raw[k]);
  }
  for (const k of NUMBER_KEYS) {
    if (raw[k] !== undefined) target[k] = toNumber(raw[k]);
  }
  if (raw.is_gidc !== undefined) next.is_gidc = raw.is_gidc === true || raw.is_gidc === 'true';
  return next;
}

export function mergeContact(base: ContactFields | null, raw: Raw | undefined): ContactFields {
  const next: ContactFields = { ...(base ?? { name: null, designation: null, mobile: null, email: null }) };
  if (!raw) return next;
  if (raw.name !== undefined) next.name = cleanText(raw.name);
  if (raw.designation !== undefined) next.designation = cleanText(raw.designation);
  if (raw.mobile !== undefined) next.mobile = normalizeMobile(raw.mobile);
  if (raw.email !== undefined) next.email = normalizeEmail(raw.email);
  return next;
}
