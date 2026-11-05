import { IMPORT_FIELDS } from '../entities/import-fields';
import { pickValues, suggestMapping, toMapping, validateMapping } from './import-mapping.service';
import { convertRow, hasAnyLeadData, hasLeadData, identityKeys, parseBool, parseNumber, splitList } from './import-row.service';

describe('the 36 import fields', () => {
  it('are 31 company fields and 5 lead fields, in the order of the Sales Fields sheet', () => {
    expect(IMPORT_FIELDS).toHaveLength(36);
    expect(IMPORT_FIELDS.filter((f) => f.group === 'company')).toHaveLength(31);
    expect(IMPORT_FIELDS.filter((f) => f.group === 'lead').map((f) => f.header)).toEqual(['Lead Source', 'Lead By', 'Date Added', 'Service Fit', 'Status']);
    expect(IMPORT_FIELDS[0].header).toBe('Company Name');
    expect(IMPORT_FIELDS.find((f) => f.key === 'mobile')!.header).toBe('Mobile');
    expect(new Set(IMPORT_FIELDS.map((f) => f.key)).size).toBe(36);
  });
});

describe('column matching', () => {
  const cols = (...headers: string[]) => headers.map((h) => ({ header: h, key: h.toLowerCase().replace(/[\s-]+/g, '_') }));

  it('matches columns with the same name automatically, ignoring case, spaces and punctuation', () => {
    const m = suggestMapping(cols('company name', 'GIDC Area/Phase', 'Products / Services', 'No. of Branches', 'E-mail'));
    expect(m.map((c) => c.field)).toEqual(['name', 'gidc_area_phase', 'products_services', 'no_of_branches', 'email']);
    expect(m.every((c) => c.how === 'name')).toBe(true);
  });

  it('knows common other names, leaves the rest for the user, and never maps the brochure', () => {
    const m = suggestMapping(cols('Phone', 'Pincode', 'Remarks', 'Brochure'));
    expect(m.map((c) => [c.field, c.how])).toEqual([['mobile', 'name'], ['pin', 'name'], [null, 'none'], [null, 'not_importable']]);
  });

  it('gives a field to one column only (the first)', () => {
    const m = suggestMapping(cols('Mobile', 'Phone'));
    expect(m.map((c) => c.field)).toEqual(['mobile', null]);
  });

  it('checks the mapping the user confirms', () => {
    const columns = cols('Company', 'Phone', 'Other');
    expect(validateMapping({ company: 'name', phone: 'mobile', other: null }, columns)).toEqual([]);
    expect(validateMapping({ company: 'name', phone: 'mobile', other: 'mobile' }, columns)[0].message).toMatch(/already matched/);
    expect(validateMapping({ company: 'name', phone: 'nope' }, columns)[0].message).toMatch(/not a field/);
    expect(validateMapping({ phone: 'mobile' }, columns).map((e) => e.field)).toEqual(['mapping']);
    expect(validateMapping({ company: 'name', ghost: 'city' }, columns)[0].message).toBe('This column is not in the file.');
  });

  it('picks the mapped values of a row and drops empty cells and "Do not import" columns', () => {
    const mapping = toMapping(suggestMapping(cols('Company Name', 'City', 'Notes')));
    expect(pickValues({ company_name: ' Acme ', city: '', notes: 'ignore me' }, mapping)).toEqual({ name: 'Acme' });
  });
});

describe('value parsing', () => {
  it('Yes / No', () => {
    expect(['Yes', 'y', 'TRUE', '1'].map(parseBool)).toEqual([true, true, true, true]);
    expect(['No', 'n', 'false', '0'].map(parseBool)).toEqual([false, false, false, false]);
    expect(parseBool('maybe')).toBeNull();
  });
  it('rupee amounts', () => {
    expect(parseNumber('45,00,000')).toBe(4500000);
    expect(parseNumber('₹ 45,00,000')).toBe(4500000);
    expect(parseNumber('Rs. 1500')).toBe(1500);
    expect(parseNumber('lots')).toBeNaN();
  });
  it('Service Fit with several values', () => {
    expect(splitList('Website Development, Mobile App; CRM / ERP Software | ')).toEqual(['Website Development', 'Mobile App', 'CRM / ERP Software']);
  });
});

describe('a row is checked with the same rules as the Add Company form', () => {
  it('accepts a company that has only a name', () => {
    const r = convertRow(2, { name: 'Acme' });
    expect(r.errors).toEqual([]);
    expect(r.company).toMatchObject({ name: 'Acme', website_quality: 'No Website', country: 'India', is_gidc: false });
  });

  it('reports every problem against the column name the user knows', () => {
    const r = convertRow(7, {
      pin: '12', mobile: '123', email: 'x', year_established: '1850', no_of_branches: '-2',
      estimated_turnover: 'lots', website: 'not a link', is_gidc: 'maybe', website_quality: 'Superb',
    });
    const byField = Object.fromEntries(r.errors.map((e) => [e.field, e.message]));
    expect(byField).toMatchObject({
      'Company Name': 'Please fill this field.',
      PIN: 'Please enter a valid PIN code.',
      Mobile: 'The mobile number must be 10 digits.',
      Email: 'Please enter a valid email.',
      'Year Established': 'Please enter a valid year (YYYY).',
      'No. of Branches': 'Please enter a whole number, 0 or more.',
      'Estimated Turnover': 'Please enter 0 or more.',
      Website: 'Please enter a valid link.',
      'Is GIDC': 'Please enter Yes or No.',
    });
    expect(byField['Website Quality']).toMatch(/Choose one of/);
    expect(byField['Contact Person']).toBe('Please fill this field.'); // mobile / email without a contact name
  });

  it('GIDC Name and Area are needed only when Is GIDC is Yes', () => {
    const r = convertRow(3, { name: 'Acme', is_gidc: 'Yes' });
    expect(r.errors.map((e) => e.field)).toEqual(['GIDC Name', 'GIDC Area/Phase']);
    expect(convertRow(3, { name: 'Acme', is_gidc: 'Yes', gidc_name: 'Vatva', gidc_area_phase: 'Phase II' }).errors).toEqual([]);
    expect(convertRow(3, { name: 'Acme', is_gidc: 'No', gidc_name: 'Vatva' }).company.gidc_name).toBeNull();
  });

  it('normalizes a phone, an email, capitals of Website Quality and rupee amounts', () => {
    const r = convertRow(4, { name: 'Acme', contact_name: 'Rakesh', mobile: '+91 98250 41236', email: 'Rakesh@ACME.in', website: 'www.acme.in', website_quality: 'good', estimated_turnover: '₹ 45,00,000' });
    expect(r.errors).toEqual([]);
    expect(r.contact).toMatchObject({ mobile: '9825041236', email: 'rakesh@acme.in' });
    expect(r.company).toMatchObject({ website_quality: 'Good', estimated_turnover: 4500000 });
  });

  it('says Date Added and Status are ignored', () => {
    expect(convertRow(2, { name: 'Acme', date_added: '01-01-2020', status: 'Converted' }).warnings).toEqual([
      'Date Added is set by the system and is ignored.',
      'Status is set by the system and is ignored.',
    ]);
  });
});

describe('lead part of a row and identity', () => {
  it('only a row with Lead Source, Lead By and Service Fit gets a lead', () => {
    expect(hasLeadData({ lead_source: 'Cold calling', lead_by: 'Kishan', service_fit: ['Website Development'] })).toBe(true);
    expect(hasLeadData({ lead_source: 'Cold calling', lead_by: null, service_fit: ['Website Development'] })).toBe(false);
    expect(hasAnyLeadData({ lead_source: null, lead_by: null, service_fit: [] })).toBe(false);
    expect(hasAnyLeadData({ lead_source: 'x', lead_by: null, service_fit: [] })).toBe(true);
  });

  it('a row is identified by name + city, mobile and email, like the Add Company form', () => {
    const r = convertRow(2, { name: '  Shree  GANESH ', city: 'Surat', contact_name: 'R', mobile: '9825041236', email: 'A@B.in' });
    expect(identityKeys(r.company, r.contact)).toEqual({ name_city: 'shree ganesh|surat', mobile: '9825041236', email: 'a@b.in' });
  });
});
