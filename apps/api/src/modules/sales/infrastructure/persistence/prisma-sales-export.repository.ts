import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ExportRow, SalesExportRepositoryPort } from '../../application/ports/sales-export.repository.port';

const inOrder = <T>(ids: number[], rows: T[], idOf: (r: T) => number): T[] => {
  const by = new Map(rows.map((r) => [idOf(r), r]));
  return ids.map((id) => by.get(id)).filter((r): r is T => r !== undefined);
};
const yesNo = (v: boolean | null | undefined) => (v === true ? 'Yes' : 'No');

@Injectable()
export class PrismaSalesExportRepository implements SalesExportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async companies(ids: number[]): Promise<ExportRow[]> {
    const rows = await this.prisma.companies.findMany({
      where: { company_id: { in: ids }, deleted_at: null },
      include: {
        industries_companies_industry_idToindustries: { select: { name: true } },
        employees_companies_created_byToemployees: { select: { name: true } },
        company_persons: { where: { is_primary: true, deleted_at: null }, take: 1, select: { designation: true, persons: { select: { name: true, mobile: true, email: true } } } },
        leads: {
          where: { deleted_at: null },
          orderBy: [{ created_at: 'desc' }, { lead_id: 'desc' }],
          take: 1,
          select: {
            lead_code: true, lead_source: true, service_fit: true, lead_stage: true, created_at: true, next_follow_up_at: true,
            employees_leads_lead_by_idToemployees: { select: { name: true } },
          },
        },
      },
    });
    return inOrder(ids, rows, (r) => r.company_id).map((c) => {
      const p = c.company_persons[0];
      const lead = c.leads[0];
      return {
        __company_id: c.company_id,
        name: c.name, no_of_branches: c.no_of_branches, no_of_plants: c.no_of_plants, full_address: c.full_address ?? c.address,
        city: c.city, state: c.state, country: c.country, pin: c.pin, google_maps_url: c.google_maps_url,
        is_gidc: yesNo(c.is_gidc), gidc_name: c.gidc_name, gidc_area_phase: c.gidc_area_phase,
        contact_name: p?.persons.name ?? c.contact_person, designation: p?.designation ?? c.designation,
        mobile: p?.persons.mobile ?? c.mobile, email: p?.persons.email ?? c.email,
        nature_of_business: c.nature_of_business, industry: c.industries_companies_industry_idToindustries?.name ?? null,
        products_services: c.products_services, estimated_employees: c.estimated_employees,
        estimated_turnover: c.estimated_turnover === null ? null : Number(c.estimated_turnover),
        year_established: c.year_established, existing_major_clients: c.existing_major_clients,
        website: c.website, website_quality: c.website_quality, developed_by: c.developed_by,
        linkedin_url: c.linkedin_url, instagram_url: c.instagram_url, facebook_url: c.facebook_url, youtube_url: c.youtube_url,
        google_business_profile_url: c.google_business_profile_url,
        lead_source: lead?.lead_source ?? null, lead_by: lead?.employees_leads_lead_by_idToemployees?.name ?? null,
        date_added: lead?.created_at ?? null, service_fit: lead?.service_fit ?? null, status: lead?.lead_stage ?? null,
        company_code: c.company_code, lead_code: lead?.lead_code ?? null, client_code: c.client_code,
        brochure: c.brochure_url, created_on: c.created_at, created_by: c.employees_companies_created_byToemployees?.name ?? null,
        next_follow_up: lead?.next_follow_up_at ?? null,
      };
    });
  }

  async leads(ids: number[], scopeEmpId?: number): Promise<ExportRow[]> {
    const rows = await this.prisma.leads.findMany({
      where: { lead_id: { in: ids }, deleted_at: null, ...(scopeEmpId ? { lead_by_id: scopeEmpId } : {}) },
      include: {
        companies: { select: { company_code: true, name: true, city: true } },
        persons: { select: { name: true, mobile: true, email: true } },
        employees_leads_lead_by_idToemployees: { select: { name: true } },
      },
    });
    const counts = await this.prisma.crm_communications.groupBy({
      by: ['lead_id'], where: { lead_id: { in: rows.map((r) => r.lead_id) }, deleted_at: null }, _count: { _all: true },
    });
    const n = new Map(counts.map((c) => [c.lead_id, c._count._all]));
    return inOrder(ids, rows, (r) => r.lead_id).map((l) => ({
      __company_id: l.company_id,
      lead_code: l.lead_code, company_code: l.companies?.company_code ?? null, company_name: l.companies?.name ?? null, city: l.companies?.city ?? null,
      contact_name: l.persons?.name ?? null, mobile: l.persons?.mobile ?? null, email: l.persons?.email ?? null,
      status: l.lead_stage, lead_source: l.lead_source, lead_by: l.employees_leads_lead_by_idToemployees?.name ?? null,
      service_fit: l.service_fit, date_added: l.created_at, next_follow_up: l.next_follow_up_at,
      conversations: n.get(l.lead_id) ?? 0, won_on: l.won_on, lost_reason: l.lost_reason,
    }));
  }

  async followUps(ids: number[], scopeEmpId?: number): Promise<ExportRow[]> {
    const rows = await this.prisma.crm_follow_ups.findMany({ where: { follow_up_id: { in: ids }, deleted_at: null } });
    const leadIds = [...new Set(rows.map((r) => r.lead_id).filter((x): x is number => x !== null))];
    const leads = await this.prisma.leads.findMany({ where: { lead_id: { in: leadIds } }, select: { lead_id: true, lead_code: true, lead_by_id: true, company_id: true } });
    const leadBy = new Map(leads.map((l) => [l.lead_id, l]));
    const visible = rows.filter((r) => !scopeEmpId || r.assigned_to === scopeEmpId || (r.lead_id !== null && leadBy.get(r.lead_id)?.lead_by_id === scopeEmpId));

    const companyIds = [...new Set(visible.map((r) => r.company_id ?? (r.lead_id !== null ? leadBy.get(r.lead_id)?.company_id ?? null : null)).filter((x): x is number => x !== null))];
    const [companies, emps, people] = await Promise.all([
      this.prisma.companies.findMany({ where: { company_id: { in: companyIds } }, select: { company_id: true, company_code: true, name: true, city: true } }),
      this.prisma.employees.findMany({ where: { emp_id: { in: [...new Set(visible.map((r) => r.assigned_to))] } }, select: { emp_id: true, name: true } }),
      this.prisma.persons.findMany({ where: { person_id: { in: visible.map((r) => r.contact_id).filter((x): x is number => x !== null) } }, select: { person_id: true, name: true } }),
    ]);
    const co = new Map(companies.map((c) => [c.company_id, c]));
    const em = new Map(emps.map((e) => [e.emp_id, e.name]));
    const pe = new Map(people.map((p) => [p.person_id, p.name]));
    return inOrder(ids, visible, (r) => r.follow_up_id).map((f) => {
      const lead = f.lead_id !== null ? leadBy.get(f.lead_id) : undefined;
      const companyId = f.company_id ?? lead?.company_id ?? null;
      const c = companyId !== null ? co.get(companyId) : undefined;
      return {
        __company_id: companyId,
        lead_code: lead?.lead_code ?? null, company_code: c?.company_code ?? null, company_name: c?.name ?? null, city: c?.city ?? null,
        contact_name: (f.contact_id !== null ? pe.get(f.contact_id) : undefined) ?? f.contact_person_name ?? null,
        type: f.type, follow_up_on: f.follow_up_on, status: f.status, purpose: f.purpose, assigned_to: em.get(f.assigned_to) ?? null,
        rescheduled_count: f.rescheduled_count, done_on: f.done_on, outcome: f.outcome, what_happened: f.what_happened,
      };
    });
  }

  async contacts(companyIds: number[]): Promise<ExportRow[]> {
    const rows = await this.prisma.company_persons.findMany({
      where: { company_id: { in: companyIds }, deleted_at: null, companies: { deleted_at: null } },
      orderBy: [{ company_id: 'asc' }, { is_primary: 'desc' }, { company_person_id: 'asc' }],
      select: {
        designation: true, is_primary: true,
        companies: { select: { company_code: true, name: true } },
        persons: { select: { name: true, mobile: true, email: true } },
      },
    });
    return rows.map((r) => ({
      company_code: r.companies.company_code, company_name: r.companies.name, name: r.persons.name,
      designation: r.designation, mobile: r.persons.mobile, email: r.persons.email, is_primary: yesNo(r.is_primary),
    }));
  }

  async conversations(companyIds: number[], leadScopeEmpId?: number): Promise<ExportRow[]> {
    const leads = await this.prisma.leads.findMany({
      where: { company_id: { in: companyIds }, deleted_at: null, ...(leadScopeEmpId ? { lead_by_id: leadScopeEmpId } : {}) },
      select: { lead_id: true, lead_code: true, company_id: true },
    });
    if (leads.length === 0) return [];
    const leadIds = leads.map((l) => l.lead_id);
    const [comms, notes, companies] = await Promise.all([
      this.prisma.crm_communications.findMany({ where: { lead_id: { in: leadIds }, deleted_at: null }, orderBy: { communication_date: 'asc' } }),
      this.prisma.crm_lead_notes.findMany({ where: { lead_id: { in: leadIds }, deleted_at: null }, orderBy: { created_at: 'asc' } }),
      this.prisma.companies.findMany({ where: { company_id: { in: companyIds } }, select: { company_id: true, company_code: true, name: true } }),
    ]);
    const emps = await this.prisma.employees.findMany({
      where: { emp_id: { in: [...comms.map((c) => c.created_by), ...notes.map((n) => n.created_by)].filter((x): x is number => x !== null) } },
      select: { emp_id: true, name: true },
    });
    const em = new Map(emps.map((e) => [e.emp_id, e.name]));
    const lead = new Map(leads.map((l) => [l.lead_id, l]));
    const co = new Map(companies.map((c) => [c.company_id, c]));
    const base = (leadId: number | null) => {
      const l = leadId !== null ? lead.get(leadId) : undefined;
      const c = l?.company_id != null ? co.get(l.company_id) : undefined;
      return { lead_code: l?.lead_code ?? null, company_code: c?.company_code ?? null, company_name: c?.name ?? null };
    };
    const out: Array<ExportRow & { at: Date }> = [
      ...comms.map((c) => ({ ...base(c.lead_id), kind: 'Conversation', type: c.type, at: c.communication_date, text: c.what_discussed, outcome: c.outcome, by: c.created_by !== null ? em.get(c.created_by) ?? null : null })),
      ...notes.map((n) => ({ ...base(n.lead_id), kind: 'Note', type: n.note_type, at: n.created_at, text: n.note, outcome: null, by: n.created_by !== null ? em.get(n.created_by) ?? null : null })),
    ];
    return out.sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  async companyIdsOfLeads(leadIds: number[]): Promise<number[]> {
    const rows = await this.prisma.leads.findMany({ where: { lead_id: { in: leadIds }, deleted_at: null, company_id: { not: null } }, select: { company_id: true }, distinct: ['company_id'] });
    return rows.map((r) => r.company_id as number);
  }
}
