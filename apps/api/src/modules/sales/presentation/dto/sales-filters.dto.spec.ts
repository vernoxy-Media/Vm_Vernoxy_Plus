import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListSalesCompaniesQueryDto } from './sales-company.dto';
import { ListLeadsQueryDto } from './sales-lead.dto';
import { ListFollowUpsQueryDto } from './sales-follow-up.dto';

/** The filter screens send query strings; these tests pin down how each filter is read on the server. */
const parse = <T extends object>(cls: new () => T, query: Record<string, unknown>) => {
  const dto = plainToInstance(cls, query, { enableImplicitConversion: false });
  return { dto, errors: validateSync(dto as object, { whitelist: true }) };
};

describe('Companies list filters', () => {
  it('reads comma separated and repeated values as lists', () => {
    const { dto, errors } = parse(ListSalesCompaniesQueryDto, {
      city: 'Surat, Ahmedabad ,',
      state: ['Gujarat', 'Goa'],
      nature_of_business: 'Manufacturer',
      website_quality: 'Good,No Website',
      gidc_name: 'Vatva',
      gidc_area_phase: 'Phase 4,Phase 1',
    });
    expect(errors).toHaveLength(0);
    expect(dto.city).toEqual(['Surat', 'Ahmedabad']);
    expect(dto.state).toEqual(['Gujarat', 'Goa']);
    expect(dto.nature_of_business).toEqual(['Manufacturer']);
    expect(dto.website_quality).toEqual(['Good', 'No Website']);
    expect(dto.gidc_area_phase).toEqual(['Phase 4', 'Phase 1']);
  });

  it('reads industries as numbers', () => {
    expect(parse(ListSalesCompaniesQueryDto, { industry_ids: '3,12' }).dto.industry_ids).toEqual([3, 12]);
  });

  it('leaves out a filter that is empty', () => {
    const { dto } = parse(ListSalesCompaniesQueryDto, { city: '', industry_ids: '' });
    expect(dto.city).toBeUndefined();
    expect(dto.industry_ids).toBeUndefined();
  });

  it('reads the yes / no filters from text', () => {
    const yes = parse(ListSalesCompaniesQueryDto, { is_gidc: 'true', has_website: 'true', has_brochure: 'false' }).dto;
    expect([yes.is_gidc, yes.has_website, yes.has_brochure]).toEqual([true, true, false]);
  });

  it('accepts every lead status the drawer offers and refuses anything else', () => {
    for (const lead of ['all', 'not_a_lead', 'open', 'client', 'lost']) {
      expect(parse(ListSalesCompaniesQueryDto, { lead }).errors).toHaveLength(0);
    }
    expect(parse(ListSalesCompaniesQueryDto, { lead: 'won' }).errors).not.toHaveLength(0);
  });

  it('reads the employee range as whole numbers and refuses a negative one', () => {
    const ok = parse(ListSalesCompaniesQueryDto, { employees_min: '10', employees_max: '500' });
    expect(ok.errors).toHaveLength(0);
    expect([ok.dto.employees_min, ok.dto.employees_max]).toEqual([10, 500]);
    expect(parse(ListSalesCompaniesQueryDto, { employees_min: '-1' }).errors).not.toHaveLength(0);
  });
});

describe('Leads list filters', () => {
  it('reads city, source, service fit and industry', () => {
    const { dto, errors } = parse(ListLeadsQueryDto, { city: 'Surat,Rajkot', lead_source: 'Reference', service_fit: 'Mobile App,CRM', industry_ids: '4' });
    expect(errors).toHaveLength(0);
    expect(dto.city).toEqual(['Surat', 'Rajkot']);
    expect(dto.lead_source).toEqual(['Reference']);
    expect(dto.service_fit).toEqual(['Mobile App', 'CRM']);
    expect(dto.industry_ids).toEqual([4]);
  });

  it('accepts me, all or an employee id for Lead By, and nothing else', () => {
    for (const lead_by of ['me', 'all', '12']) expect(parse(ListLeadsQueryDto, { lead_by }).errors).toHaveLength(0);
    expect(parse(ListLeadsQueryDto, { lead_by: 'bob' }).errors).not.toHaveLength(0);
  });

  it('accepts only the follow-up buckets the drawer offers', () => {
    for (const follow_up of ['today', 'overdue', 'this_week', 'none']) expect(parse(ListLeadsQueryDto, { follow_up }).errors).toHaveLength(0);
    expect(parse(ListLeadsQueryDto, { follow_up: 'someday' }).errors).not.toHaveLength(0);
  });

  it('reads the added-on dates', () => {
    const { dto, errors } = parse(ListLeadsQueryDto, { added_from: '2026-11-01', added_to: '2026-11-30' });
    expect(errors).toHaveLength(0);
    expect(dto.added_from).toBeInstanceOf(Date);
  });
});

describe('Follow-ups list filters', () => {
  it('reads assignee, channel, city and industry', () => {
    const { dto, errors } = parse(ListFollowUpsQueryDto, { assigned_to: 'me', type: 'Call,Meeting', city: 'Surat', industry_ids: '2,9' });
    expect(errors).toHaveLength(0);
    expect(dto.type).toEqual(['Call', 'Meeting']);
    expect(dto.city).toEqual(['Surat']);
    expect(dto.industry_ids).toEqual([2, 9]);
  });

  it('refuses an assignee that is not me, all or an id', () => {
    expect(parse(ListFollowUpsQueryDto, { assigned_to: 'x' }).errors).not.toHaveLength(0);
  });
});
