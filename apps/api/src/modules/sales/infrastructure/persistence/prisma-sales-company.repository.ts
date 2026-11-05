import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CompanyLeadRef,
  CreateSalesCompanyData,
  DeleteBlockers,
  DuplicateQuery,
  ListSalesCompaniesParams,
  SalesCompanyDetail,
  SalesCompanyList,
  SalesCompanyListItem,
  SalesCompanyRepositoryPort,
  SalesMasters,
  UpdateSalesCompanyData,
} from '../../application/ports/sales-company.repository.port';
import { CompanyFields, OPEN_LEAD_STAGES } from '../../domain/entities/sales-company';
import { DuplicateMatch, FieldValidationError } from '../../domain/errors/sales.errors';
import { initialsOf } from '../../domain/services/sales-normalization.service';

type Tx = Prisma.TransactionClient;

const DEFAULT_CUSTOMER_TYPE = 'Prospect';
const DEFAULT_INDUSTRY = 'Unclassified';
const MAX_DUPLICATES = 5;

const OPEN_STAGES = [...OPEN_LEAD_STAGES];

const LATEST_LEAD_SELECT = {
  where: { deleted_at: null },
  orderBy: [{ created_at: 'desc' as const }, { lead_id: 'desc' as const }],
  take: 1,
  select: { lead_id: true, lead_code: true, lead_stage: true },
};

@Injectable()
export class PrismaSalesCompanyRepository implements SalesCompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- list ----

  async list(params: ListSalesCompaniesParams): Promise<SalesCompanyList> {
    const where = this.buildWhere(params);
    // The four counters describe the same search and filters, but never the "lead" tab itself;
    // otherwise clicking a tab would make every other number change or drop to 0.
    const countersWhere = this.buildWhere({ ...params, lead: undefined });
    const skip = (params.page - 1) * params.limit;
    const sort = params.sort ?? 'created_at';
    const order = params.order ?? 'desc';

    const [rows, total, countersTotal, notALead, openLeads, clients] = await Promise.all([
      this.prisma.companies.findMany({
        where,
        orderBy: [{ [sort]: order }, { company_id: 'desc' }],
        skip,
        take: params.limit,
        select: {
          company_id: true,
          company_code: true,
          name: true,
          city: true,
          website_quality: true,
          contact_person: true,
          is_client: true,
          client_code: true,
          clients: { where: { deleted_at: null }, take: 1, select: { client_id: true } },
          industries_companies_industry_idToindustries: { select: { name: true } },
          company_persons: {
            where: { is_primary: true, deleted_at: null },
            take: 1,
            select: { persons: { select: { name: true } } },
          },
          leads: LATEST_LEAD_SELECT,
        },
      }),
      this.prisma.companies.count({ where }),
      this.prisma.companies.count({ where: countersWhere }),
      this.prisma.companies.count({ where: { AND: [countersWhere, this.notALeadClause()] } }),
      this.prisma.companies.count({ where: { AND: [countersWhere, this.openLeadClause()] } }),
      this.prisma.companies.count({ where: { AND: [countersWhere, this.clientClause()] } }),
    ]);

    const items: SalesCompanyListItem[] = rows.map((r) => {
      const lead = this.toLeadRef(r.is_client === true, r.client_code, r.leads[0] ?? null, r.clients[0]?.client_id ?? null);
      return {
        company_id: r.company_id,
        company_code: r.company_code,
        name: r.name,
        initials: initialsOf(r.name),
        city: r.city,
        industry: r.industries_companies_industry_idToindustries?.name ?? null,
        contact_person: r.company_persons[0]?.persons.name ?? r.contact_person ?? null,
        website_quality: r.website_quality,
        lead,
        can_convert_to_lead: !(lead.kind === 'lead' && OPEN_STAGES.includes(lead.stage as never)),
      };
    });

    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      total_pages: Math.max(Math.ceil(total / params.limit), 1),
      counters: { total: countersTotal, not_a_lead: notALead, open_leads: openLeads, converted_to_client: clients },
    };
  }

  private openLeadClause(): Prisma.companiesWhereInput {
    return { leads: { some: { deleted_at: null, lead_stage: { in: OPEN_STAGES } } } };
  }

  private clientClause(): Prisma.companiesWhereInput {
    return { is_client: true };
  }

  /** No open lead and not a client (a company whose last lead was Lost is still "not a lead"). */
  private notALeadClause(): Prisma.companiesWhereInput {
    return { AND: [{ NOT: this.openLeadClause() }, { OR: [{ is_client: false }, { is_client: null }] }] };
  }

  private buildWhere(p: ListSalesCompaniesParams): Prisma.companiesWhereInput {
    const and: Prisma.companiesWhereInput[] = [{ deleted_at: null }];
    const ci = (v: string) => ({ contains: v, mode: 'insensitive' as const });
    const anyOf = (values?: string[]) =>
      values && values.length > 0
        ? { OR: values.map((v) => ({ equals: v, mode: 'insensitive' as const })) }
        : null;

    const q = p.q?.trim();
    if (q) {
      // Only a phone-like search (digits, +, spaces, dashes) looks at mobile numbers, so "COM-1315" never matches a phone containing 1315.
      const digits = /^[+()\d\s-]+$/.test(q) ? q.replace(/\D/g, '') : '';
      const personMatch: Prisma.personsWhereInput[] = [{ name: ci(q) }, { email: ci(q) }];
      if (digits.length >= 3) personMatch.push({ mobile: { contains: digits } });
      and.push({
        OR: [
          { name: ci(q) },
          { company_code: ci(q) },
          { city: ci(q) },
          { contact_person: ci(q) },
          { email: ci(q) },
          ...(digits.length >= 3 ? [{ mobile: { contains: digits } }] : []),
          { company_persons: { some: { deleted_at: null, persons: { OR: personMatch, deleted_at: null } } } },
        ],
      });
    }

    const inCi = (field: 'city' | 'state' | 'country' | 'nature_of_business' | 'gidc_name' | 'gidc_area_phase' | 'website_quality', values?: string[]) => {
      const c = anyOf(values);
      if (c) and.push({ OR: c.OR.map((cond) => ({ [field]: cond })) as Prisma.companiesWhereInput[] });
    };
    inCi('city', p.city);
    inCi('state', p.state);
    inCi('country', p.country);
    inCi('nature_of_business', p.nature_of_business);
    inCi('gidc_name', p.gidc_name);
    inCi('gidc_area_phase', p.gidc_area_phase);
    inCi('website_quality', p.website_quality);

    if (p.industry_ids?.length) {
      and.push({
        OR: [{ industry_id: { in: p.industry_ids } }, { sub_industry_id: { in: p.industry_ids } }],
      });
    }
    if (p.is_gidc !== undefined) and.push(p.is_gidc ? { is_gidc: true } : { OR: [{ is_gidc: false }, { is_gidc: null }] });

    if (p.designation?.length) {
      and.push({
        company_persons: {
          some: {
            deleted_at: null,
            OR: p.designation.map((d) => ({ designation: { equals: d, mode: 'insensitive' as const } })),
          },
        },
      });
    }

    const range = (field: 'estimated_employees' | 'estimated_turnover' | 'year_established', min?: number, max?: number) => {
      if (min === undefined && max === undefined) return;
      and.push({ [field]: { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) } });
    };
    range('estimated_employees', p.employees_min, p.employees_max);
    range('estimated_turnover', p.turnover_min, p.turnover_max);
    range('year_established', p.year_min, p.year_max);

    if (p.has_website !== undefined) {
      and.push(p.has_website ? { website: { not: null } } : { website: null });
    }
    if (p.has_brochure !== undefined) {
      and.push(p.has_brochure ? { brochure_url: { not: null } } : { brochure_url: null });
    }
    if (p.added_by !== undefined) and.push({ created_by: p.added_by });
    if (p.added_from || p.added_to) {
      and.push({ created_at: { ...(p.added_from ? { gte: p.added_from } : {}), ...(p.added_to ? { lte: p.added_to } : {}) } });
    }

    switch (p.lead) {
      case 'not_a_lead':
        and.push(this.notALeadClause());
        break;
      case 'open':
        and.push(this.openLeadClause());
        break;
      case 'client':
        and.push(this.clientClause());
        break;
      case 'lost':
        and.push({ leads: { some: { deleted_at: null, lead_stage: 'Lost' } } }, { NOT: this.openLeadClause() });
        break;
      default:
        break;
    }
    return { AND: and };
  }

  private toLeadRef(
    isClient: boolean,
    clientCode: string | null,
    lead: { lead_id: number; lead_code: string | null; lead_stage: string | null } | null,
    clientId: number | null,
  ): CompanyLeadRef {
    if (isClient) {
      return {
        kind: 'client',
        lead_id: lead?.lead_id ?? null,
        lead_code: lead?.lead_code ?? null,
        stage: lead?.lead_stage ?? null,
        client_code: clientCode,
        client_id: clientId,
      };
    }
    if (lead) {
      return { kind: 'lead', lead_id: lead.lead_id, lead_code: lead.lead_code, stage: lead.lead_stage, client_code: null, client_id: null };
    }
    return { kind: 'none', lead_id: null, lead_code: null, stage: null, client_code: null, client_id: null };
  }

  // -------------------------------------------------------------- detail ----

  async getDetail(companyId: number): Promise<SalesCompanyDetail | null> {
    const c = await this.prisma.companies.findFirst({
      where: { company_id: companyId, deleted_at: null },
      include: {
        industries_companies_industry_idToindustries: { select: { industry_id: true, name: true } },
        employees_companies_created_byToemployees: { select: { emp_id: true, name: true } },
        leads: LATEST_LEAD_SELECT,
        clients: { where: { deleted_at: null }, take: 1, select: { client_id: true } },
        company_persons: {
          where: { deleted_at: null },
          orderBy: [{ is_primary: 'desc' }, { company_person_id: 'asc' }],
          include: { persons: true },
        },
      },
    });
    if (!c) return null;

    const lead = this.toLeadRef(c.is_client === true, c.client_code, c.leads[0] ?? null, c.clients[0]?.client_id ?? null);
    const fields: CompanyFields = {
      name: c.name,
      no_of_branches: c.no_of_branches,
      no_of_plants: c.no_of_plants,
      full_address: c.full_address ?? c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      pin: c.pin,
      google_maps_url: c.google_maps_url,
      is_gidc: c.is_gidc === true,
      gidc_name: c.gidc_name,
      gidc_area_phase: c.gidc_area_phase,
      nature_of_business: c.nature_of_business,
      industry: c.industries_companies_industry_idToindustries?.name ?? null,
      products_services: c.products_services,
      estimated_employees: c.estimated_employees,
      estimated_turnover: c.estimated_turnover === null ? null : Number(c.estimated_turnover),
      year_established: c.year_established,
      existing_major_clients: c.existing_major_clients,
      website: c.website,
      website_quality: c.website_quality,
      developed_by: c.developed_by,
      linkedin_url: c.linkedin_url,
      instagram_url: c.instagram_url,
      facebook_url: c.facebook_url,
      youtube_url: c.youtube_url,
      google_business_profile_url: c.google_business_profile_url,
    };

    return {
      company_id: c.company_id,
      company_code: c.company_code,
      fields,
      brochure_url: c.brochure_url,
      industry: c.industries_companies_industry_idToindustries
        ? { id: c.industries_companies_industry_idToindustries.industry_id, name: c.industries_companies_industry_idToindustries.name }
        : null,
      contacts: c.company_persons.map((cp) => ({
        company_person_id: cp.company_person_id,
        person_id: cp.person_id,
        name: cp.persons.name,
        designation: cp.designation,
        mobile: cp.persons.mobile,
        email: cp.persons.email,
        is_primary: cp.is_primary,
        is_active: cp.is_active,
      })),
      lead,
      can_convert_to_lead: !(lead.kind === 'lead' && OPEN_STAGES.includes(lead.stage as never)),
      created_at: c.created_at,
      created_by: c.employees_companies_created_byToemployees,
      updated_at: c.updated_at,
    };
  }

  // ---------------------------------------------------------- duplicates ----

  async findDuplicates(q: DuplicateQuery): Promise<DuplicateMatch[]> {
    const found = new Map<number, DuplicateMatch>();
    const base: Prisma.companiesWhereInput = {
      deleted_at: null,
      ...(q.exclude_company_id ? { company_id: { not: q.exclude_company_id } } : {}),
    };
    const select = { company_id: true, company_code: true, name: true, city: true } as const;
    const push = (row: { company_id: number; company_code: string | null; name: string; city: string | null }, reason: DuplicateMatch['reason']) => {
      if (!found.has(row.company_id)) {
        found.set(row.company_id, { company_id: row.company_id, company_code: row.company_code, name: row.name, city: row.city, reason });
      }
    };

    if (q.name) {
      const rows = await this.prisma.companies.findMany({
        where: {
          ...base,
          name: { equals: q.name.trim(), mode: 'insensitive' },
          city: q.city ? { equals: q.city.trim(), mode: 'insensitive' } : null,
        },
        select,
        take: MAX_DUPLICATES,
      });
      rows.forEach((r) => push(r, 'SAME_NAME_CITY'));
    }
    if (q.mobile) {
      const rows = await this.prisma.companies.findMany({
        where: {
          ...base,
          OR: [
            { mobile: q.mobile },
            { company_persons: { some: { deleted_at: null, persons: { mobile: q.mobile, deleted_at: null } } } },
          ],
        },
        select,
        take: MAX_DUPLICATES,
      });
      rows.forEach((r) => push(r, 'SAME_MOBILE'));
    }
    if (q.email) {
      const rows = await this.prisma.companies.findMany({
        where: {
          ...base,
          OR: [
            { email: { equals: q.email, mode: 'insensitive' } },
            { company_persons: { some: { deleted_at: null, persons: { email: { equals: q.email, mode: 'insensitive' }, deleted_at: null } } } },
          ],
        },
        select,
        take: MAX_DUPLICATES,
      });
      rows.forEach((r) => push(r, 'SAME_EMAIL'));
    }
    return [...found.values()].slice(0, MAX_DUPLICATES);
  }

  // -------------------------------------------------------------- create ----

  async create(data: CreateSalesCompanyData): Promise<{ company_id: number; company_code: string }> {
    return this.prisma.$transaction(async (tx) => {
      const industryId = await this.resolveIndustryId(tx, data.fields.industry, true);
      const customerTypeId = await this.resolveCustomerTypeId(tx);

      const company = await tx.companies.create({
        data: {
          ...this.toColumns(data.fields),
          ...this.toContactColumns(data.contact),
          customer_type_id: customerTypeId,
          industry_id: industryId as number,
          created_by: data.actor_emp_id,
        },
        select: { company_id: true, company_code: true },
      });

      if (data.contact.name) {
        await this.createPrimaryContact(tx, company.company_id, data.contact, data.actor_emp_id);
      }

      await this.log(tx, company.company_id, 'CREATED', `Company ${company.company_code} created`, data.actor_emp_id, {
        name: data.fields.name,
      });
      await this.logDuplicateConfirmation(tx, company.company_id, data.confirmed_duplicates, data.actor_emp_id);

      return { company_id: company.company_id, company_code: company.company_code as string };
    });
  }

  // -------------------------------------------------------------- update ----

  async update(data: UpdateSalesCompanyData): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.companies.findFirst({
        where: { company_id: data.company_id, deleted_at: null },
      });
      if (!before) return;

      const industryId = data.fields.industry
        ? await this.resolveIndustryId(tx, data.fields.industry, false)
        : undefined;

      const columns = this.toColumns(data.fields);
      await tx.companies.update({
        where: { company_id: data.company_id },
        data: {
          ...columns,
          ...this.toContactColumns(data.contact),
          ...(industryId ? { industry_id: industryId } : {}),
          updated_by: data.actor_emp_id,
        },
      });

      const primary = await tx.company_persons.findFirst({
        where: { company_id: data.company_id, is_primary: true, deleted_at: null },
        select: { company_person_id: true, person_id: true },
      });
      if (primary) {
        if (data.contact.name) {
          await tx.persons.update({
            where: { person_id: primary.person_id },
            data: {
              name: data.contact.name,
              mobile: data.contact.mobile,
              email: data.contact.email,
              updated_by: data.actor_emp_id,
            },
          });
          await tx.company_persons.update({
            where: { company_person_id: primary.company_person_id },
            data: { designation: data.contact.designation, updated_by: data.actor_emp_id },
          });
        }
      } else if (data.contact.name) {
        await this.createPrimaryContact(tx, data.company_id, data.contact, data.actor_emp_id);
      }

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      const prev = before as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(columns)) {
        const old = prev[k] instanceof Prisma.Decimal ? Number(prev[k]) : prev[k];
        if ((old ?? null) !== (v ?? null)) changes[k] = { from: old ?? null, to: v ?? null };
      }
      if (Object.keys(changes).length > 0) {
        await this.log(tx, data.company_id, 'UPDATED', `Company updated (${Object.keys(changes).join(', ')})`, data.actor_emp_id, { changes });
      }
      await this.logDuplicateConfirmation(tx, data.company_id, data.confirmed_duplicates, data.actor_emp_id);
    });
  }

  // -------------------------------------------------------------- delete ----

  async getDeleteBlockers(companyId: number): Promise<DeleteBlockers | null> {
    const c = await this.prisma.companies.findFirst({
      where: { company_id: companyId, deleted_at: null },
      select: { is_client: true },
    });
    if (!c) return null;
    const [leads, comms] = await Promise.all([
      this.prisma.leads.count({ where: { company_id: companyId, deleted_at: null } }),
      this.prisma.crm_communications.count({ where: { company_id: companyId, deleted_at: null } }),
    ]);
    return { has_lead: leads > 0, is_client: c.is_client === true, has_communication: comms > 0 };
  }

  async softDelete(companyId: number, actorEmpId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.companies.update({
        where: { company_id: companyId },
        data: { deleted_at: new Date(), deleted_by: actorEmpId },
      });
      await this.log(tx, companyId, 'DELETED', 'Company deleted', actorEmpId, {});
    });
  }

  // -------------------------------------------------------------- masters ----

  async getMasters(): Promise<SalesMasters> {
    const lookup = async (type: string): Promise<string[]> =>
      (
        await this.prisma.master_lookup.findMany({
          where: { lookup_type: type, deleted_at: null, is_active: true },
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
          select: { label: true },
        })
      ).map((r) => r.label).filter((label, i, all) => all.indexOf(label) === i);

    const distinct = async (field: 'city' | 'state' | 'country'): Promise<string[]> => {
      const rows = (await this.prisma.companies.findMany({
        where: { deleted_at: null, [field]: { not: null } },
        distinct: [field],
        orderBy: { [field]: 'asc' },
        select: { [field]: true },
      } as Prisma.companiesFindManyArgs)) as unknown as Array<Record<string, string | null>>;
      return rows.map((r) => r[field]).filter((v): v is string => !!v);
    };

    /** Admin-kept values first, then anything already typed on a company, each only once. */
    const merged = async (type: string, field: 'city' | 'state' | 'country'): Promise<string[]> => {
      const [fromMaster, fromCompanies] = await Promise.all([lookup(type), distinct(field)]);
      const extras = fromCompanies.filter((v) => !fromMaster.includes(v));
      return [...fromMaster, ...extras];
    };

    const [industries, nature, designation, gidcNames, areaRows, quality, source, fit, states, countries, cities] =
      await Promise.all([
        this.prisma.industries.findMany({
          where: { deleted_at: null, is_active: true },
          orderBy: { name: 'asc' },
          select: { industry_id: true, name: true, parent_id: true },
        }),
        lookup('nature_of_business'),
        lookup('designation'),
        lookup('gidc_name'),
        this.prisma.master_lookup.findMany({
          where: { lookup_type: 'gidc_phase', deleted_at: null, is_active: true },
          orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
          select: { label: true, parent: { select: { label: true } } },
        }),
        lookup('website_quality'),
        lookup('lead_source'),
        lookup('service_fit'),
        merged('state', 'state'),
        merged('country', 'country'),
        merged('city', 'city'),
      ]);

    const gidcAreas = areaRows.map((r) => r.label).filter((label, i, all) => all.indexOf(label) === i);
    const gidcAreaMap: Record<string, string[]> = {};
    const gidcCommonAreas: string[] = [];
    for (const r of areaRows) {
      if (!r.parent) {
        if (!gidcCommonAreas.includes(r.label)) gidcCommonAreas.push(r.label);
        continue;
      }
      (gidcAreaMap[r.parent.label] ??= []).push(r.label);
    }

    return {
      industries: industries.map((i) => ({ id: i.industry_id, name: i.name, parent_id: i.parent_id })),
      nature_of_business: nature,
      designation,
      gidc_names: gidcNames,
      gidc_areas: gidcAreas,
      gidc_area_map: gidcAreaMap,
      gidc_common_areas: gidcCommonAreas,
      website_quality: quality,
      lead_source: source,
      service_fit: fit,
      states,
      countries: countries.includes('India') ? countries : ['India', ...countries],
      cities,
    };
  }

  // --------------------------------------------------------------- helpers ----

  private toColumns(f: CompanyFields) {
    return {
      name: f.name,
      no_of_branches: f.no_of_branches,
      no_of_plants: f.no_of_plants,
      full_address: f.full_address,
      address: f.full_address,
      city: f.city,
      state: f.state,
      country: f.country,
      pin: f.pin,
      google_maps_url: f.google_maps_url,
      is_gidc: f.is_gidc,
      gidc_name: f.gidc_name,
      gidc_area_phase: f.gidc_area_phase,
      nature_of_business: f.nature_of_business,
      products_services: f.products_services,
      estimated_employees: f.estimated_employees,
      estimated_turnover: f.estimated_turnover,
      year_established: f.year_established,
      existing_major_clients: f.existing_major_clients,
      website: f.website,
      website_quality: f.website_quality,
      developed_by: f.developed_by,
      linkedin_url: f.linkedin_url,
      instagram_url: f.instagram_url,
      facebook_url: f.facebook_url,
      youtube_url: f.youtube_url,
      google_business_profile_url: f.google_business_profile_url,
    };
  }

  /** The Sales Fields sheet keeps the first contact on the company row as well. */
  private toContactColumns(c: { name: string | null; designation: string | null; mobile: string | null; email: string | null }) {
    return { contact_person: c.name, designation: c.designation, mobile: c.mobile, email: c.email };
  }

  private async createPrimaryContact(
    tx: Tx,
    companyId: number,
    c: { name: string | null; designation: string | null; mobile: string | null; email: string | null },
    actor: number,
  ): Promise<void> {
    const person = await tx.persons.create({
      data: { name: c.name as string, mobile: c.mobile, email: c.email, created_by: actor },
      select: { person_id: true },
    });
    await tx.company_persons.create({
      data: {
        company_id: companyId,
        person_id: person.person_id,
        designation: c.designation,
        is_primary: true,
        created_by: actor,
      },
    });
  }

  /** industries.name -> id. On create, falls back to "Unclassified" (BFD: only Company Name is required). */
  private async resolveIndustryId(tx: Tx, name: string | null, fallback: boolean): Promise<number | undefined> {
    if (name) {
      const hit = await tx.industries.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, deleted_at: null, is_active: true },
        select: { industry_id: true },
      });
      if (hit) return hit.industry_id;
      throw new FieldValidationError([{ field: 'industry', message: 'Choose an industry from the list.' }]);
    }
    if (!fallback) return undefined;
    const def =
      (await tx.industries.findFirst({
        where: { name: { equals: DEFAULT_INDUSTRY, mode: 'insensitive' }, deleted_at: null },
        select: { industry_id: true },
      })) ??
      (await tx.industries.findFirst({ where: { deleted_at: null, is_active: true }, orderBy: { industry_id: 'asc' }, select: { industry_id: true } }));
    if (!def) throw new Error('No industry exists in the master list; add one in Settings first.');
    return def.industry_id;
  }

  private async resolveCustomerTypeId(tx: Tx): Promise<number> {
    const def =
      (await tx.customer_types.findFirst({
        where: { name: { equals: DEFAULT_CUSTOMER_TYPE, mode: 'insensitive' }, deleted_at: null, is_active: true },
        select: { customer_type_id: true },
      })) ??
      (await tx.customer_types.findFirst({ where: { deleted_at: null, is_active: true }, orderBy: { customer_type_id: 'asc' }, select: { customer_type_id: true } }));
    if (!def) throw new Error('No customer type exists in the master list; add one in Settings first.');
    return def.customer_type_id;
  }

  private async log(tx: Tx, companyId: number, event: string, summary: string, actor: number, details: Record<string, unknown>) {
    await tx.activity_logs.create({
      data: {
        entity_type: 'COMPANY',
        entity_id: companyId,
        event,
        summary,
        details: details as Prisma.InputJsonValue,
        performed_by: actor,
      },
    });
  }

  private async logDuplicateConfirmation(tx: Tx, companyId: number, matches: DuplicateMatch[], actor: number) {
    if (matches.length === 0) return;
    await this.log(tx, companyId, 'DUPLICATE_CONFIRMED', 'User confirmed this is a different company', actor, {
      matches: matches.map((m) => ({ company_id: m.company_id, company_code: m.company_code, reason: m.reason })),
    });
  }
}
