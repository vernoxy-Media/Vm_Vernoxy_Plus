/**
 * The 36 fields of the Sales Fields sheet, in the order and with the names of the import template
 * (BFD section 3, Part 2): 31 company fields (the brochure cannot be imported) and 5 lead fields.
 */
export type FieldKind = 'text' | 'int' | 'number' | 'bool' | 'list';

export interface ImportField {
  key: string;
  /** The exact column name in the template and in an "All fields" export. */
  header: string;
  group: 'company' | 'lead';
  kind: FieldKind;
  /** Other names people use for the same column (compared without spaces, case or punctuation). */
  aliases?: string[];
  /** Date Added and Status are set by the system: whatever the file says is ignored. */
  system?: boolean;
  required?: boolean;
}

export const IMPORT_FIELDS: readonly ImportField[] = [
  { key: 'name', header: 'Company Name', group: 'company', kind: 'text', required: true, aliases: ['company', 'name', 'firm name', 'business name'] },
  { key: 'no_of_branches', header: 'No. of Branches', group: 'company', kind: 'int', aliases: ['branches', 'number of branches'] },
  { key: 'no_of_plants', header: 'No. of Plants', group: 'company', kind: 'int', aliases: ['plants', 'number of plants'] },
  { key: 'full_address', header: 'Full Address', group: 'company', kind: 'text', aliases: ['address'] },
  { key: 'city', header: 'City', group: 'company', kind: 'text' },
  { key: 'state', header: 'State', group: 'company', kind: 'text' },
  { key: 'country', header: 'Country', group: 'company', kind: 'text' },
  { key: 'pin', header: 'PIN', group: 'company', kind: 'text', aliases: ['pincode', 'pin code', 'zip', 'postal code'] },
  { key: 'google_maps_url', header: 'Google Maps', group: 'company', kind: 'text', aliases: ['maps', 'google map', 'map link', 'location'] },
  { key: 'is_gidc', header: 'Is GIDC', group: 'company', kind: 'bool', aliases: ['gidc'] },
  { key: 'gidc_name', header: 'GIDC Name', group: 'company', kind: 'text', aliases: ['gidc estate'] },
  { key: 'gidc_area_phase', header: 'GIDC Area/Phase', group: 'company', kind: 'text', aliases: ['gidc area', 'gidc phase', 'area phase', 'phase'] },
  { key: 'contact_name', header: 'Contact Person', group: 'company', kind: 'text', aliases: ['contact', 'contact name', 'person'] },
  { key: 'designation', header: 'Designation', group: 'company', kind: 'text' },
  { key: 'mobile', header: 'Mobile', group: 'company', kind: 'text', aliases: ['mobile no', 'mobile number', 'phone', 'contact number'] },
  { key: 'email', header: 'Email', group: 'company', kind: 'text', aliases: ['e-mail', 'email id', 'mail'] },
  { key: 'nature_of_business', header: 'Nature of Business', group: 'company', kind: 'text', aliases: ['business nature'] },
  { key: 'industry', header: 'Industry', group: 'company', kind: 'text' },
  { key: 'products_services', header: 'Products / Services', group: 'company', kind: 'text', aliases: ['products', 'services', 'product'] },
  { key: 'estimated_employees', header: 'Estimated Employees', group: 'company', kind: 'int', aliases: ['employees', 'no of employees'] },
  { key: 'estimated_turnover', header: 'Estimated Turnover', group: 'company', kind: 'number', aliases: ['turnover', 'annual turnover'] },
  { key: 'year_established', header: 'Year Established', group: 'company', kind: 'int', aliases: ['established', 'year of establishment', 'since'] },
  { key: 'existing_major_clients', header: 'Existing Major Clients', group: 'company', kind: 'text', aliases: ['major clients', 'clients'] },
  { key: 'website', header: 'Website', group: 'company', kind: 'text', aliases: ['website url', 'web', 'site', 'url'] },
  { key: 'website_quality', header: 'Website Quality', group: 'company', kind: 'text' },
  { key: 'developed_by', header: 'Developed By', group: 'company', kind: 'text', aliases: ['website developed by', 'developer'] },
  { key: 'linkedin_url', header: 'LinkedIn', group: 'company', kind: 'text', aliases: ['linkedin url'] },
  { key: 'instagram_url', header: 'Instagram', group: 'company', kind: 'text', aliases: ['instagram url'] },
  { key: 'facebook_url', header: 'Facebook', group: 'company', kind: 'text', aliases: ['facebook url'] },
  { key: 'youtube_url', header: 'YouTube', group: 'company', kind: 'text', aliases: ['youtube url'] },
  { key: 'google_business_profile_url', header: 'Google Business Profile', group: 'company', kind: 'text', aliases: ['google business', 'gbp'] },
  { key: 'lead_source', header: 'Lead Source', group: 'lead', kind: 'text', aliases: ['source'] },
  { key: 'lead_by', header: 'Lead By', group: 'lead', kind: 'text', aliases: ['owner', 'sales person', 'assigned to'] },
  { key: 'date_added', header: 'Date Added', group: 'lead', kind: 'text', system: true, aliases: ['added on'] },
  { key: 'service_fit', header: 'Service Fit', group: 'lead', kind: 'list', aliases: ['service', 'services fit'] },
  { key: 'status', header: 'Status', group: 'lead', kind: 'text', system: true, aliases: ['lead status'] },
] as const;

export const IMPORT_FIELD_KEYS: ReadonlySet<string> = new Set(IMPORT_FIELDS.map((f) => f.key));
export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A column we know the meaning of but that can never be imported. */
export const NOT_IMPORTABLE_HEADERS: readonly string[] = ['brochure'];

/** Lookup keys: a header or alias with spaces, case and punctuation removed. */
export const matchKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
