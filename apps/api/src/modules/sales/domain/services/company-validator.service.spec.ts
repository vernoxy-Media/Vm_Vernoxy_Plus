import { validateCompany, applyCompanyDefaults, isValidLink, MSG } from './company-validator.service';
import { emptyCompanyFields, mergeCompanyFields, mergeContact } from './company-input.service';
import { normalizeMobile, normalizeEmail, initialsOf } from './sales-normalization.service';

const NOW = new Date('2026-10-30T10:00:00Z');
const base = (over: Record<string, unknown> = {}) => mergeCompanyFields(null, { name: 'Shree Ganesh Polymers', ...over });
const check = (over: Record<string, unknown> = {}, contact: Record<string, unknown> = {}) =>
  validateCompany(base(over), mergeContact(null, contact), NOW);
const fieldsOf = (errs: { field: string }[]) => errs.map((e) => e.field);

describe('validateCompany (BFD section 4, Part 5)', () => {
  it('accepts a company that has only a name', () => {
    expect(check()).toEqual([]);
  });

  it('requires the company name', () => {
    expect(validateCompany(emptyCompanyFields(), mergeContact(null, {}), NOW)).toEqual([
      { field: 'name', message: MSG.required },
    ]);
  });

  it('requires GIDC name and area only when Is GIDC is ticked', () => {
    expect(check({ is_gidc: true }).map((e) => e.field)).toEqual(['gidc_name', 'gidc_area_phase']);
    expect(check({ is_gidc: true, gidc_name: 'Vatva', gidc_area_phase: 'Phase II' })).toEqual([]);
    expect(check({ is_gidc: false })).toEqual([]);
  });

  it('checks the 6 digit PIN for India only', () => {
    expect(fieldsOf(check({ pin: '39300' }))).toEqual(['pin']);
    expect(check({ pin: '393002' })).toEqual([]);
    expect(check({ pin: 'SW1A 1AA', country: 'United Kingdom' })).toEqual([]);
  });

  it('accepts whole numbers 0 or more only', () => {
    expect(fieldsOf(check({ no_of_branches: -1, no_of_plants: 1.5, estimated_employees: 'abc' }))).toEqual([
      'no_of_branches',
      'no_of_plants',
      'estimated_employees',
    ]);
    expect(check({ no_of_branches: 0, no_of_plants: '3', estimated_employees: 160 })).toEqual([]);
  });

  it('checks turnover and year established', () => {
    expect(check({ estimated_turnover: -5 })[0]).toEqual({ field: 'estimated_turnover', message: MSG.zeroOrMore });
    expect(check({ estimated_turnover: 45000000 })).toEqual([]);
    expect(fieldsOf(check({ year_established: 1899 }))).toEqual(['year_established']);
    expect(fieldsOf(check({ year_established: 2027 }))).toEqual(['year_established']);
    expect(check({ year_established: 2004 })).toEqual([]);
  });

  it('validates links but accepts addresses typed without a scheme', () => {
    expect(isValidLink('www.shreeganeshpoly.in')).toBe(true);
    expect(isValidLink('https://maps.app.goo.gl/x7Lk2')).toBe(true);
    expect(isValidLink('not a link')).toBe(false);
    expect(isValidLink('ftp://files.example.com')).toBe(false);
    expect(fieldsOf(check({ website: 'hello world', linkedin_url: 'nope' }))).toEqual(['website', 'linkedin_url']);
  });

  it('checks contact mobile and email', () => {
    expect(check({}, { name: 'Rakesh', mobile: '12345' })[0]).toEqual({ field: 'contact.mobile', message: MSG.mobile });
    expect(check({}, { name: 'Rakesh', email: 'rakesh@' })[0]).toEqual({ field: 'contact.email', message: MSG.email });
    expect(check({}, { name: 'Rakesh', mobile: '+91 98250 41236', email: 'Rakesh@ShreeGaneshPoly.in' })).toEqual([]);
  });

  it('needs a contact name when any other contact detail is given', () => {
    expect(check({}, { mobile: '9825041236' })[0]).toEqual({ field: 'contact.name', message: MSG.required });
    expect(check({}, {})).toEqual([]);
  });

  it('rejects an unknown website quality', () => {
    expect(fieldsOf(check({ website_quality: 'Great' }))).toEqual(['website_quality']);
    expect(check({ website_quality: 'Average' })).toEqual([]);
  });
});

describe('applyCompanyDefaults', () => {
  it('sets Website Quality to "No Website" when there is no website', () => {
    expect(applyCompanyDefaults(base()).website_quality).toBe('No Website');
    expect(applyCompanyDefaults(base({ website: 'a.in', website_quality: 'Good' })).website_quality).toBe('Good');
  });

  it('clears the GIDC fields when Is GIDC is not ticked, and defaults the country to India', () => {
    const out = applyCompanyDefaults(base({ is_gidc: false, gidc_name: 'Vatva', gidc_area_phase: 'Phase I' }));
    expect(out.gidc_name).toBeNull();
    expect(out.gidc_area_phase).toBeNull();
    expect(out.country).toBe('India');
  });
});

describe('normalization', () => {
  it('turns +91 numbers into 10 digits', () => {
    expect(normalizeMobile('+91 98250 41236')).toBe('9825041236');
    expect(normalizeMobile('09825041236')).toBe('9825041236');
    expect(normalizeMobile('9825041236')).toBe('9825041236');
    expect(normalizeMobile('12345')).toBe('12345');
    expect(normalizeMobile('  ')).toBeNull();
  });

  it('lower-cases email and builds initials', () => {
    expect(normalizeEmail(' A@B.in ')).toBe('a@b.in');
    expect(initialsOf('Shree Ganesh Polymers Pvt. Ltd.')).toBe('SG');
    expect(initialsOf('Kaveri')).toBe('KA');
  });

  it('PATCH keeps untouched keys and clears keys sent as empty', () => {
    const current = base({ city: 'Surat', website: 'a.in' });
    const next = mergeCompanyFields(current, { city: '', pin: '395007' });
    expect(next.city).toBeNull();
    expect(next.pin).toBe('395007');
    expect(next.website).toBe('a.in');
    expect(next.name).toBe('Shree Ganesh Polymers');
  });
});
