import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CommittedRow,
  ExistingCompany,
  ExistingIndex,
  ImportBatch,
  ImportCommitRow,
  ImportLookups,
  SalesImportRepositoryPort,
  UndoBlocker,
  UpdateEmptyRow,
  UpdatedRow,
} from '../../application/ports/sales-import.repository.port';
import { CompanyFields } from '../../domain/entities/sales-company';
import { joinServiceFit } from '../../domain/entities/sales-lead';

type Tx = Prisma.TransactionClient;

const MAX_TITLE = 200;
const TX = { timeout: 60_000, maxWait: 10_000 };

/** Columns that "update empty fields" may fill (never booleans or fields that have a default). */
const FILLABLE: Array<keyof CompanyFields> = [
  'no_of_branches', 'no_of_plants', 'full_address', 'city', 'state', 'pin', 'google_maps_url', 'gidc_name', 'gidc_area_phase',
  'nature_of_business', 'products_services', 'estimated_employees', 'estimated_turnover', 'year_established', 'existing_major_clients',
  'website', 'developed_by', 'linkedin_url', 'instagram_url', 'facebook_url', 'youtube_url', 'google_business_profile_url',
];

const asIds = (v: Prisma.JsonValue | null): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []);

interface UpdatedEntry {
  company_id: number;
  set: Record<string, unknown>;
}
const asUpdated = (v: Prisma.JsonValue | null): UpdatedEntry[] =>
  Array.isArray(v) ? (v as unknown as UpdatedEntry[]).filter((e) => e && typeof e.company_id === 'number') : [];

@Injectable()
export class PrismaSalesImportRepository implements SalesImportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------- lookups ----

  async loadLookups(): Promise<ImportLookups> {
    const lookup = (type: string) =>
      this.prisma.master_lookup.findMany({
        where: { lookup_type: type, deleted_at: null, is_active: true },
        select: { lookup_id: true, label: true },
      });
    const [industries, nature, designation, gidcNames, gidcAreas, sources, fits, users, stage, customerType] = await Promise.all([
      this.prisma.industries.findMany({ where: { deleted_at: null, is_active: true }, select: { industry_id: true, name: true } }),
      lookup('nature_of_business'),
      lookup('designation'),
      lookup('gidc_name'),
      lookup('gidc_phase'),
      lookup('lead_source'),
      lookup('service_fit'),
      this.prisma.employees.findMany({
        where: {
          deleted_at: null,
          status: 'Active',
          OR: [
            { roles_employees_role_idToroles: { is_admin: true } },
            { departments_employees_dep_idTodepartments: { name: { startsWith: 'Sales', mode: 'insensitive' } } },
          ],
        },
        select: { emp_id: true, name: true, email: true },
      }),
      this.prisma.pipeline_stages.findFirst({ where: { name: { equals: 'New', mode: 'insensitive' }, deleted_at: null }, select: { pipeline_stage_id: true } }),
      this.prisma.customer_types.findFirst({
        where: { name: { equals: 'Prospect', mode: 'insensitive' }, deleted_at: null, is_active: true },
        select: { customer_type_id: true },
      }),
    ]);

    const labelMap = (rows: Array<{ label: string }>) => new Map(rows.map((r) => [r.label.toLowerCase(), r.label]));
    const defIndustry =
      industries.find((i) => i.name.toLowerCase() === 'unclassified') ??
      [...industries].sort((a, b) => a.industry_id - b.industry_id)[0];
    const defCustomerType =
      customerType ??
      (await this.prisma.customer_types.findFirst({ where: { deleted_at: null, is_active: true }, orderBy: { customer_type_id: 'asc' }, select: { customer_type_id: true } }));
    if (!defIndustry) throw new Error('No industry exists in the master list; add one in Settings first.');
    if (!defCustomerType) throw new Error('No customer type exists in the master list; add one in Settings first.');
    if (!stage) throw new Error('Pipeline stage "New" is missing; run the lead module migration.');

    return {
      industries: new Map(industries.map((i) => [i.name.toLowerCase(), { id: i.industry_id, name: i.name }])),
      nature_of_business: labelMap(nature),
      designation: labelMap(designation),
      gidc_names: labelMap(gidcNames),
      gidc_areas: labelMap(gidcAreas),
      lead_sources: new Map(sources.map((s) => [s.label.toLowerCase(), { id: s.lookup_id, label: s.label }])),
      service_fits: labelMap(fits),
      users,
      default_industry_id: defIndustry.industry_id,
      default_customer_type_id: defCustomerType.customer_type_id,
      new_stage_id: stage.pipeline_stage_id,
    };
  }

  async findExisting(keys: { name_city: string[]; mobiles: string[]; emails: string[] }): Promise<ExistingIndex> {
    const index: ExistingIndex = { by_name_city: new Map(), by_mobile: new Map(), by_email: new Map() };
    const select = { company_id: true, company_code: true, name: true, city: true, mobile: true, email: true } as const;
    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const make = (r: { company_id: number; company_code: string | null; name: string }, by: ExistingCompany['matched_by']): ExistingCompany => ({
      company_id: r.company_id, company_code: r.company_code, name: r.name, matched_by: by,
    });

    // name + city: narrow by name in the database, then compare name and city in the same way the importer does.
    const names = [...new Set(keys.name_city.map((k) => k.split('|')[0]))];
    for (let i = 0; i < names.length; i += 500) {
      const rows = await this.prisma.companies.findMany({
        where: { deleted_at: null, OR: names.slice(i, i + 500).map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })) },
        select,
      });
      for (const r of rows) {
        const k = `${norm(r.name)}|${norm(r.city ?? '')}`;
        if (!index.by_name_city.has(k)) index.by_name_city.set(k, make(r, 'name_city'));
      }
    }

    const mobiles = [...new Set(keys.mobiles)];
    for (let i = 0; i < mobiles.length; i += 500) {
      const part = mobiles.slice(i, i + 500);
      const [direct, viaPerson] = await Promise.all([
        this.prisma.companies.findMany({ where: { deleted_at: null, mobile: { in: part } }, select }),
        this.prisma.company_persons.findMany({
          where: { deleted_at: null, companies: { deleted_at: null }, persons: { deleted_at: null, mobile: { in: part } } },
          select: { companies: { select }, persons: { select: { mobile: true } } },
        }),
      ]);
      direct.forEach((r) => r.mobile && !index.by_mobile.has(r.mobile) && index.by_mobile.set(r.mobile, make(r, 'mobile')));
      viaPerson.forEach((r) => r.persons.mobile && !index.by_mobile.has(r.persons.mobile) && index.by_mobile.set(r.persons.mobile, make(r.companies, 'mobile')));
    }

    const emails = [...new Set(keys.emails)];
    for (let i = 0; i < emails.length; i += 500) {
      const part = emails.slice(i, i + 500);
      const [direct, viaPerson] = await Promise.all([
        this.prisma.companies.findMany({ where: { deleted_at: null, OR: part.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })) }, select }),
        this.prisma.company_persons.findMany({
          where: {
            deleted_at: null,
            companies: { deleted_at: null },
            persons: { deleted_at: null, OR: part.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })) },
          },
          select: { companies: { select }, persons: { select: { email: true } } },
        }),
      ]);
      direct.forEach((r) => r.email && !index.by_email.has(r.email.toLowerCase()) && index.by_email.set(r.email.toLowerCase(), make(r, 'email')));
      viaPerson.forEach((r) => r.persons.email && !index.by_email.has(r.persons.email.toLowerCase()) && index.by_email.set(r.persons.email.toLowerCase(), make(r.companies, 'email')));
    }
    return index;
  }

  // --------------------------------------------------------------- commit ----

  async createBatch(data: { job_id: string; file_name: string; actor_emp_id: number; can_undo_until: Date }): Promise<number> {
    const b = await this.prisma.crm_import_batches.create({
      data: { job_id: data.job_id, file_name: data.file_name.slice(0, 255), imported_by: data.actor_emp_id, can_undo_until: data.can_undo_until },
      select: { batch_id: true },
    });
    return b.batch_id;
  }

  async commitChunk(data: {
    batch_id: number; rows: ImportCommitRow[]; default_industry_id: number; default_customer_type_id: number; new_stage_id: number; actor_emp_id: number;
  }): Promise<CommittedRow[]> {
    if (data.rows.length === 0) return [];
    return this.prisma.$transaction(async (tx) => {
      const actor = data.actor_emp_id;
      const columns = (f: CompanyFields, c: ImportCommitRow['contact']) => ({
        name: f.name, no_of_branches: f.no_of_branches, no_of_plants: f.no_of_plants, full_address: f.full_address, address: f.full_address,
        city: f.city, state: f.state, country: f.country, pin: f.pin, google_maps_url: f.google_maps_url, is_gidc: f.is_gidc,
        gidc_name: f.gidc_name, gidc_area_phase: f.gidc_area_phase, nature_of_business: f.nature_of_business,
        products_services: f.products_services, estimated_employees: f.estimated_employees, estimated_turnover: f.estimated_turnover,
        year_established: f.year_established, existing_major_clients: f.existing_major_clients, website: f.website,
        website_quality: f.website_quality, developed_by: f.developed_by, linkedin_url: f.linkedin_url, instagram_url: f.instagram_url,
        facebook_url: f.facebook_url, youtube_url: f.youtube_url, google_business_profile_url: f.google_business_profile_url,
        contact_person: c.name, designation: c.designation, mobile: c.mobile, email: c.email,
      });

      const companies = await tx.companies.createManyAndReturn({
        data: data.rows.map((r) => ({
          ...columns(r.company, r.contact),
          customer_type_id: data.default_customer_type_id,
          industry_id: r.industry_id ?? data.default_industry_id,
          created_by: actor,
        })),
        select: { company_id: true, company_code: true, name: true },
      });
      if (companies.length !== data.rows.length || companies.some((c, i) => c.name !== data.rows[i].company.name)) {
        throw new Error('The saved companies did not match the rows (unexpected order).');
      }

      const withContact = data.rows.map((r, i) => ({ r, i })).filter(({ r }) => !!r.contact.name);
      const persons = withContact.length
        ? await tx.persons.createManyAndReturn({
            data: withContact.map(({ r }) => ({ name: r.contact.name as string, mobile: r.contact.mobile, email: r.contact.email, created_by: actor })),
            select: { person_id: true },
          })
        : [];
      const personOfRow = new Map<number, number>(withContact.map(({ i }, k) => [i, persons[k].person_id]));
      if (withContact.length) {
        await tx.company_persons.createMany({
          data: withContact.map(({ r, i }) => ({
            company_id: companies[i].company_id, person_id: personOfRow.get(i) as number,
            designation: r.contact.designation, is_primary: true, created_by: actor,
          })),
        });
      }

      const withLead = data.rows.map((r, i) => ({ r, i })).filter(({ r }) => !!r.lead);
      const leads = withLead.length
        ? await tx.leads.createManyAndReturn({
            data: withLead.map(({ r, i }) => ({
              company_id: companies[i].company_id,
              person_id: personOfRow.get(i) ?? null,
              title: r.company.name.slice(0, MAX_TITLE),
              pipeline_stage_id: data.new_stage_id,
              owner_id: r.lead!.lead_by_id,
              lead_by_id: r.lead!.lead_by_id,
              lead_stage: 'New',
              lead_source: r.lead!.lead_source,
              source_id: r.lead!.lead_source_id,
              service_fit: joinServiceFit(r.lead!.service_fit),
              created_by: actor,
            })),
            select: { lead_id: true, lead_code: true },
          })
        : [];
      const leadOfRow = new Map<number, { lead_id: number; lead_code: string | null }>(withLead.map(({ i }, k) => [i, leads[k]]));

      await tx.activity_logs.createMany({
        data: [
          ...companies.map((c, i) => ({
            entity_type: 'COMPANY', entity_id: c.company_id, event: 'CREATED',
            summary: `Company ${c.company_code} created by import`,
            details: { name: c.name, batch_id: data.batch_id, row: data.rows[i].row_number } as Prisma.InputJsonValue,
            performed_by: actor,
          })),
          ...withLead.map(({ r, i }) => ({
            entity_type: 'LEAD', entity_id: leadOfRow.get(i)!.lead_id, event: 'CREATED',
            summary: `Lead ${leadOfRow.get(i)!.lead_code} created by import (New)`,
            details: { company_id: companies[i].company_id, lead_source: r.lead!.lead_source, batch_id: data.batch_id } as Prisma.InputJsonValue,
            performed_by: actor,
          })),
        ],
      });

      const batch = await tx.crm_import_batches.findUniqueOrThrow({ where: { batch_id: data.batch_id }, select: { companies_created: true, leads_created: true } });
      await tx.crm_import_batches.update({
        where: { batch_id: data.batch_id },
        data: {
          companies_created: [...asIds(batch.companies_created), ...companies.map((c) => c.company_id)],
          leads_created: [...asIds(batch.leads_created), ...leads.map((l) => l.lead_id)],
        },
      });

      return data.rows.map((r, i): CommittedRow => ({
        row_number: r.row_number,
        company_id: companies[i].company_id,
        company_code: companies[i].company_code,
        lead_id: leadOfRow.get(i)?.lead_id ?? null,
        lead_code: leadOfRow.get(i)?.lead_code ?? null,
      }));
    }, TX);
  }

  async updateEmptyFields(data: { batch_id: number; rows: UpdateEmptyRow[]; actor_emp_id: number }): Promise<UpdatedRow[]> {
    return this.prisma.$transaction(async (tx) => {
      const out: UpdatedRow[] = [];
      const entries: UpdatedEntry[] = [];
      for (const row of data.rows) {
        const current = await tx.companies.findFirst({ where: { company_id: row.company_id, deleted_at: null } });
        if (!current) {
          out.push({ row_number: row.row_number, company_id: row.company_id, filled: [] });
          continue;
        }
        const cur = current as unknown as Record<string, unknown>;
        const set: Record<string, unknown> = {};
        for (const key of FILLABLE) {
          const incoming = row.company[key];
          const have = cur[key];
          if (incoming === null || incoming === undefined || incoming === '') continue;
          if (have === null || have === undefined || have === '') set[key] = incoming;
        }
        if (set.full_address !== undefined) set.address = set.full_address;
        const filled = Object.keys(set).filter((k) => k !== 'address');

        // The primary contact: filled the same way.
        const contact = row.contact;
        if (contact?.name) {
          const primary = await tx.company_persons.findFirst({
            where: { company_id: row.company_id, is_primary: true, deleted_at: null },
            select: { company_person_id: true, designation: true, persons: { select: { person_id: true, mobile: true, email: true } } },
          });
          if (!primary) {
            const p = await tx.persons.create({ data: { name: contact.name, mobile: contact.mobile, email: contact.email, created_by: data.actor_emp_id }, select: { person_id: true } });
            await tx.company_persons.create({ data: { company_id: row.company_id, person_id: p.person_id, designation: contact.designation, is_primary: true, created_by: data.actor_emp_id } });
            filled.push('Contact Person');
          } else {
            const pSet: Prisma.personsUncheckedUpdateInput = {};
            if (!primary.persons.mobile && contact.mobile) pSet.mobile = contact.mobile;
            if (!primary.persons.email && contact.email) pSet.email = contact.email;
            if (Object.keys(pSet).length > 0) {
              await tx.persons.update({ where: { person_id: primary.persons.person_id }, data: { ...pSet, updated_by: data.actor_emp_id } });
              filled.push(...Object.keys(pSet).map((k) => (k === 'mobile' ? 'Mobile' : 'Email')));
            }
            if (!primary.designation && contact.designation) {
              await tx.company_persons.update({ where: { company_person_id: primary.company_person_id }, data: { designation: contact.designation, updated_by: data.actor_emp_id } });
              filled.push('Designation');
            }
          }
        }

        if (Object.keys(set).length > 0) {
          await tx.companies.update({ where: { company_id: row.company_id }, data: { ...(set as Prisma.companiesUncheckedUpdateInput), updated_by: data.actor_emp_id } });
          entries.push({ company_id: row.company_id, set: Object.fromEntries(Object.entries(set).filter(([k]) => k !== 'address')) });
        }
        if (filled.length > 0) {
          await tx.activity_logs.create({
            data: {
              entity_type: 'COMPANY', entity_id: row.company_id, event: 'UPDATED',
              summary: `Empty fields filled by import (${filled.join(', ')})`,
              details: { batch_id: data.batch_id, filled } as Prisma.InputJsonValue, performed_by: data.actor_emp_id,
            },
          });
        }
        out.push({ row_number: row.row_number, company_id: row.company_id, filled });
      }
      if (entries.length > 0) {
        const batch = await tx.crm_import_batches.findUniqueOrThrow({ where: { batch_id: data.batch_id }, select: { companies_updated: true } });
        await tx.crm_import_batches.update({
          where: { batch_id: data.batch_id },
          data: { companies_updated: [...asUpdated(batch.companies_updated), ...entries] as unknown as Prisma.InputJsonValue },
        });
      }
      return out;
    }, TX);
  }

  // ----------------------------------------------------------------- undo ----

  async getBatchByJob(jobId: string): Promise<ImportBatch | null> {
    const b = await this.prisma.crm_import_batches.findFirst({ where: { job_id: jobId } });
    if (!b) return null;
    return {
      batch_id: b.batch_id,
      job_id: b.job_id,
      file_name: b.file_name,
      imported_by: b.imported_by,
      imported_at: b.imported_at,
      can_undo_until: b.can_undo_until,
      is_undone: b.is_undone,
      undone_at: b.undone_at,
      companies_created: asIds(b.companies_created),
      leads_created: asIds(b.leads_created),
      companies_updated: asUpdated(b.companies_updated).map((e) => e.company_id),
    };
  }

  async findUndoBlockers(batch: ImportBatch): Promise<UndoBlocker[]> {
    const ids = batch.companies_created;
    if (ids.length === 0) return [];
    const importedLeads = batch.leads_created;
    const reasons = new Map<number, Set<string>>();
    const add = (companyId: number | null, reason: string) => {
      if (companyId === null) return;
      if (!reasons.has(companyId)) reasons.set(companyId, new Set());
      reasons.get(companyId)!.add(reason);
    };

    const [otherLeads, comms, notes, followUps, clients] = await Promise.all([
      this.prisma.leads.findMany({ where: { company_id: { in: ids }, deleted_at: null, lead_id: { notIn: importedLeads } }, select: { company_id: true } }),
      this.prisma.crm_communications.findMany({ where: { company_id: { in: ids }, deleted_at: null }, select: { company_id: true } }),
      this.prisma.crm_lead_notes.findMany({ where: { company_id: { in: ids }, deleted_at: null }, select: { company_id: true } }),
      this.prisma.crm_follow_ups.findMany({ where: { deleted_at: null, OR: [{ company_id: { in: ids } }, { lead_id: { in: importedLeads } }] }, select: { company_id: true, lead_id: true } }),
      this.prisma.companies.findMany({ where: { company_id: { in: ids }, is_client: true, deleted_at: null }, select: { company_id: true } }),
    ]);
    otherLeads.forEach((r) => add(r.company_id, 'a lead was added'));
    comms.forEach((r) => add(r.company_id, 'a conversation was logged'));
    notes.forEach((r) => add(r.company_id, 'a note was added'));
    clients.forEach((r) => add(r.company_id, 'it became a client'));
    const leadOwner = followUps.some((f) => f.company_id === null && f.lead_id !== null)
      ? new Map((await this.prisma.leads.findMany({ where: { lead_id: { in: followUps.map((f) => f.lead_id).filter((x): x is number => x !== null) } }, select: { lead_id: true, company_id: true } })).map((l) => [l.lead_id, l.company_id]))
      : new Map<number, number | null>();
    followUps.forEach((f) => add(f.company_id ?? (f.lead_id !== null ? leadOwner.get(f.lead_id) ?? null : null), 'a follow-up was scheduled'));
    // A lead of the import that moved on from "New" has been worked on.
    const moved = await this.prisma.leads.findMany({ where: { lead_id: { in: importedLeads }, deleted_at: null, lead_stage: { not: 'New' } }, select: { company_id: true } });
    moved.forEach((r) => add(r.company_id, 'its lead was moved on from New'));

    if (reasons.size === 0) return [];
    const companies = await this.prisma.companies.findMany({ where: { company_id: { in: [...reasons.keys()] } }, select: { company_id: true, company_code: true, name: true } });
    return companies.map((c) => ({ company_id: c.company_id, company_code: c.company_code, name: c.name, reason: [...(reasons.get(c.company_id) ?? [])].join(', ') }));
  }

  async undo(data: { batch: ImportBatch; actor_emp_id: number }): Promise<{ companies_removed: number; leads_removed: number }> {
    const { batch } = data;
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const by = data.actor_emp_id;
      const leads = await tx.leads.updateMany({ where: { lead_id: { in: batch.leads_created }, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      const links = await tx.company_persons.findMany({ where: { company_id: { in: batch.companies_created }, deleted_at: null }, select: { person_id: true } });
      await tx.company_persons.updateMany({ where: { company_id: { in: batch.companies_created }, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      const personIds = links.map((l) => l.person_id);
      if (personIds.length > 0) {
        const stillLinked = await tx.company_persons.findMany({ where: { person_id: { in: personIds }, deleted_at: null }, select: { person_id: true } });
        const keep = new Set(stillLinked.map((l) => l.person_id));
        await tx.persons.updateMany({ where: { person_id: { in: personIds.filter((p) => !keep.has(p)) }, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      }
      const companies = await tx.companies.updateMany({ where: { company_id: { in: batch.companies_created }, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });

      // Put back the fields the import filled, but only where nobody has changed them since.
      const stored = await tx.crm_import_batches.findUniqueOrThrow({ where: { batch_id: batch.batch_id }, select: { companies_updated: true } });
      for (const e of asUpdated(stored.companies_updated)) {
        const cur = (await tx.companies.findUnique({ where: { company_id: e.company_id } })) as unknown as Record<string, unknown> | null;
        if (!cur) continue;
        const revert: Record<string, null> = {};
        for (const [k, v] of Object.entries(e.set)) {
          const have = cur[k] instanceof Prisma.Decimal ? Number(cur[k]) : cur[k];
          if (have === v) revert[k] = null;
        }
        if (Object.keys(revert).length > 0) {
          await tx.companies.update({ where: { company_id: e.company_id }, data: { ...revert, ...(revert.full_address === null ? { address: null } : {}), updated_by: by } });
        }
      }

      await tx.crm_import_batches.update({ where: { batch_id: batch.batch_id }, data: { is_undone: true, undone_at: now, undone_by: by } });
      await tx.activity_logs.createMany({
        data: batch.companies_created.map((id) => ({
          entity_type: 'COMPANY', entity_id: id, event: 'DELETED', summary: 'Company removed by undoing an import',
          details: { batch_id: batch.batch_id } as Prisma.InputJsonValue, performed_by: by,
        })),
      });
      return { companies_removed: companies.count, leads_removed: leads.count };
    }, TX);
  }

  // -------------------------------------------------------------- helpers ----

  async employeeNames(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.employees.findMany({ where: { emp_id: { in: ids } }, select: { emp_id: true, name: true } });
    return new Map(rows.map((r) => [r.emp_id, r.name]));
  }

  async listAdminIds(): Promise<number[]> {
    const rows = await this.prisma.employees.findMany({
      where: { deleted_at: null, status: 'Active', roles_employees_role_idToroles: { is_admin: true } },
      select: { emp_id: true },
    });
    return rows.map((r) => r.emp_id);
  }
}
