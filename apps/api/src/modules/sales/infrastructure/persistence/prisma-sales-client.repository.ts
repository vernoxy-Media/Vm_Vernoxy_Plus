import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ClientDetail,
  ConversionContext,
  ConvertToClientData,
  ConvertToClientResult,
  ReversalResult,
  SalesClientRepositoryPort,
} from '../../application/ports/sales-client.repository.port';
import { LEAD_STATUSES, LeadStatus } from '../../domain/entities/sales-lead';
import { InvalidTransitionError, OpenLeadExistsError } from '../../domain/errors/sales.errors';

type Tx = Prisma.TransactionClient;

const OPEN = ['New', 'Contacted', 'Qualified', 'On Hold'];
const OPEN_FOLLOW_UPS = ['Pending', 'Overdue'];
const asStatus = (s: string | null): LeadStatus => ((LEAD_STATUSES as readonly string[]).includes(s ?? '') ? (s as LeadStatus) : 'New');

@Injectable()
export class PrismaSalesClientRepository implements SalesClientRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getConversionContext(leadId: number): Promise<ConversionContext | null> {
    const l = await this.prisma.leads.findFirst({
      where: { lead_id: leadId, deleted_at: null },
      select: {
        lead_id: true, lead_code: true, lead_stage: true, created_at: true, lead_source: true, service_fit: true, company_id: true,
        employees_leads_lead_by_idToemployees: { select: { emp_id: true, name: true } },
        clients_leads_converted_client_idToclients: { select: { client_id: true, client_code: true } },
        companies: { select: { company_id: true, company_code: true, name: true } },
      },
    });
    if (!l || !l.companies) return null;
    const companyId = l.companies.company_id;

    const [existing, contacts, primary, communications, notes] = await Promise.all([
      this.prisma.clients.findFirst({ where: { company_id: companyId, deleted_at: null }, select: { client_id: true, client_code: true } }),
      this.prisma.company_persons.count({ where: { company_id: companyId, is_active: true, deleted_at: null } }),
      this.prisma.company_persons.findFirst({
        where: { company_id: companyId, is_primary: true, is_active: true, deleted_at: null },
        select: { persons: { select: { person_id: true, name: true } } },
      }),
      this.prisma.crm_communications.count({ where: { company_id: companyId, deleted_at: null } }),
      this.prisma.crm_lead_notes.count({ where: { lead_id: leadId, deleted_at: null } }),
    ]);

    const conv = l.clients_leads_converted_client_idToclients;
    return {
      lead: {
        lead_id: l.lead_id,
        lead_code: l.lead_code,
        stage: asStatus(l.lead_stage),
        created_at: l.created_at,
        lead_by: l.employees_leads_lead_by_idToemployees,
        lead_source: l.lead_source,
        service_fit: l.service_fit,
        converted_client: conv && conv.client_code ? { client_id: conv.client_id, client_code: conv.client_code } : null,
      },
      company: l.companies,
      existing_client: existing && existing.client_code ? { client_id: existing.client_id, client_code: existing.client_code } : null,
      counts: {
        contacts,
        primary_contact: primary ? { person_id: primary.persons.person_id, name: primary.persons.name } : null,
        communications,
        notes,
      },
    };
  }

  async getNextClientCode(): Promise<string> {
    const row = await this.prisma.entity_counters.findFirst({ where: { entity_type: 'CLIENT', counter_key: 'GLOBAL' } });
    return `CLI-${String((row?.last_number ?? 0) + 1).padStart(4, '0')}`;
  }

  async convert(d: ConvertToClientData): Promise<ConvertToClientResult> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const lead = await tx.leads.findFirstOrThrow({
        where: { lead_id: d.lead_id, deleted_at: null },
        select: { lead_code: true, company_id: true, lead_by_id: true },
      });
      const companyId = lead.company_id as number;

      // Only one person wins: the status guard makes a second, simultaneous click fail cleanly.
      const moved = await tx.leads.updateMany({
        where: { lead_id: d.lead_id, lead_stage: 'Qualified', deleted_at: null },
        data: { lead_stage: 'Converted', won_on: d.won_on, win_note: d.win_note, closed_at: now, updated_by: d.actor_emp_id },
      });
      if (moved.count !== 1) throw new InvalidTransitionError('This lead is no longer Qualified, so it cannot be marked as won.');

      // A company that is already a client keeps its Client ID (one active client per company).
      let client = await tx.clients.findFirst({ where: { company_id: companyId, deleted_at: null }, select: { client_id: true, client_code: true } });
      const reused = client !== null;
      if (!client) {
        client = await tx.clients.create({
          data: {
            company_id: companyId,
            converted_from_lead_id: d.lead_id,
            won_on: d.won_on,
            win_note: d.win_note,
            owner_id: lead.lead_by_id,
            created_by: d.actor_emp_id,
          },
          select: { client_id: true, client_code: true },
        });
      }
      const clientCode = client.client_code as string;

      await tx.leads.update({ where: { lead_id: d.lead_id }, data: { converted_client_id: client.client_id } });
      await tx.companies.update({ where: { company_id: companyId }, data: { is_client: true, client_code: clientCode, updated_by: d.actor_emp_id } });

      // The Win note is kept on the lead (and on the client row).
      await tx.crm_lead_notes.create({
        data: { lead_id: d.lead_id, company_id: companyId, note_type: 'Win', note: d.win_note, created_by: d.actor_emp_id },
      });

      // "When a lead becomes Lost or Converted, its pending follow-ups are cancelled with that reason."
      const cancelled = await tx.crm_follow_ups.updateMany({
        where: { lead_id: d.lead_id, deleted_at: null, status: { in: OPEN_FOLLOW_UPS } },
        data: { status: 'Cancelled', reason: 'Lead converted to client', updated_at: now },
      });

      const details = { client_id: client.client_id, client_code: clientCode, lead_code: lead.lead_code, won_on: d.won_on.toISOString().slice(0, 10), reused_existing_client: reused };
      await tx.activity_logs.createMany({
        data: [
          { entity_type: 'LEAD', entity_id: d.lead_id, event: 'STATUS_CHANGED', summary: 'Status changed Qualified -> Converted', details: { from: 'Qualified', to: 'Converted', action: 'won', ...details }, performed_by: d.actor_emp_id },
          { entity_type: 'LEAD', entity_id: d.lead_id, event: 'CONVERTED_TO_CLIENT', summary: `Won and converted to ${clientCode}`, details, performed_by: d.actor_emp_id },
          { entity_type: 'COMPANY', entity_id: companyId, event: reused ? 'LEAD_WON' : 'CLIENT_CREATED', summary: reused ? `${lead.lead_code} won for existing client ${clientCode}` : `Became client ${clientCode} (from ${lead.lead_code})`, details, performed_by: d.actor_emp_id },
          ...(reused ? [] : [{ entity_type: 'CLIENT', entity_id: client.client_id, event: 'CREATED', summary: `Client ${clientCode} created from ${lead.lead_code}`, details, performed_by: d.actor_emp_id }]),
        ] as Prisma.activity_logsCreateManyInput[],
      });

      return { client_id: client.client_id, client_code: clientCode, reused_existing_client: reused, cancelled_follow_ups: cancelled.count };
    });
  }

  async getClient(clientId: number): Promise<ClientDetail | null> {
    const c = await this.prisma.clients.findFirst({
      where: { client_id: clientId, deleted_at: null },
      include: {
        employees_clients_owner_idToemployees: { select: { emp_id: true, name: true } },
        leads_clients_converted_from_lead_idToleads: { select: { lead_id: true, lead_code: true } },
        companies: {
          select: {
            company_id: true, company_code: true, name: true, city: true, state: true,
            industries_companies_industry_idToindustries: { select: { name: true } },
          },
        },
      },
    });
    if (!c) return null;

    const [leads, contacts, communications, notes] = await Promise.all([
      this.prisma.leads.findMany({
        where: { converted_client_id: clientId, deleted_at: null },
        orderBy: { lead_id: 'asc' },
        select: { lead_id: true, lead_code: true, won_on: true },
      }),
      this.prisma.company_persons.findMany({
        where: { company_id: c.company_id, is_active: true, deleted_at: null },
        orderBy: [{ is_primary: 'desc' }, { company_person_id: 'asc' }],
        select: { designation: true, is_primary: true, persons: { select: { person_id: true, name: true, mobile: true, email: true } } },
      }),
      this.prisma.crm_communications.count({ where: { company_id: c.company_id, deleted_at: null } }),
      this.prisma.crm_lead_notes.count({ where: { company_id: c.company_id, deleted_at: null } }),
    ]);

    return {
      client_id: c.client_id,
      client_code: c.client_code as string,
      won_on: c.won_on,
      win_note: c.win_note,
      owner: c.employees_clients_owner_idToemployees,
      created_at: c.created_at,
      company: {
        company_id: c.companies.company_id,
        company_code: c.companies.company_code,
        name: c.companies.name,
        city: c.companies.city,
        state: c.companies.state,
        industry: c.companies.industries_companies_industry_idToindustries?.name ?? null,
      },
      converted_from_lead: c.leads_clients_converted_from_lead_idToleads,
      leads,
      contacts: contacts.map((p) => ({
        person_id: p.persons.person_id, name: p.persons.name, designation: p.designation,
        mobile: p.persons.mobile, email: p.persons.email, is_primary: p.is_primary,
      })),
      carried_forward: { contacts: contacts.length, communications, notes },
    };
  }

  async getClientOfLead(leadId: number) {
    const l = await this.prisma.leads.findFirst({
      where: { lead_id: leadId, deleted_at: null },
      select: { clients_leads_converted_client_idToclients: { select: { client_id: true, client_code: true, companies: { select: { name: true } } } } },
    });
    const c = l?.clients_leads_converted_client_idToclients;
    return c && c.client_code ? { client_id: c.client_id, client_code: c.client_code, company_name: c.companies.name } : null;
  }

  async clientHasProject(clientId: number): Promise<boolean> {
    const c = await this.prisma.clients.findUnique({ where: { client_id: clientId }, select: { client_code: true, companies: { select: { name: true } } } });
    if (!c) return false;
    const names = [c.companies.name, c.client_code].filter((v): v is string => !!v);
    return (
      (await this.prisma.projects.count({
        where: { deleted_at: null, OR: names.map((n) => ({ client_name: { equals: n, mode: 'insensitive' as const } })) },
      })) > 0
    );
  }

  async reverse(d: { lead_id: number; reason: string; actor_emp_id: number }): Promise<ReversalResult> {
    try {
      return await this.prisma.$transaction((tx) => this.reverseIn(tx, d));
    } catch (err) {
      // Reopening the lead as Qualified would give the company a second open lead.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const lead = await this.prisma.leads.findUnique({ where: { lead_id: d.lead_id }, select: { company_id: true } });
        const open = lead?.company_id
          ? await this.prisma.leads.findFirst({ where: { company_id: lead.company_id, deleted_at: null, lead_stage: { in: OPEN } }, select: { lead_id: true, lead_code: true, lead_stage: true } })
          : null;
        if (open) throw new OpenLeadExistsError({ lead_id: open.lead_id, lead_code: open.lead_code, stage: open.lead_stage ?? 'New' });
      }
      throw err;
    }
  }

  private async reverseIn(tx: Tx, d: { lead_id: number; reason: string; actor_emp_id: number }): Promise<ReversalResult> {
    const lead = await tx.leads.findFirstOrThrow({
      where: { lead_id: d.lead_id, deleted_at: null },
      select: { lead_code: true, company_id: true, converted_client_id: true },
    });
    const clientId = lead.converted_client_id;
    if (!clientId) throw new InvalidTransitionError('This lead is not linked to a client.');
    const client = await tx.clients.findUniqueOrThrow({ where: { client_id: clientId }, select: { client_code: true } });
    const clientCode = client.client_code as string;

    const moved = await tx.leads.updateMany({
      where: { lead_id: d.lead_id, lead_stage: 'Converted', deleted_at: null },
      data: { lead_stage: 'Qualified', won_on: null, win_note: null, closed_at: null, converted_client_id: null, updated_by: d.actor_emp_id },
    });
    if (moved.count !== 1) throw new InvalidTransitionError('This lead is no longer Converted.');

    // The client goes away only when this was its last converted lead.
    const stillConverted = await tx.leads.count({ where: { converted_client_id: clientId, deleted_at: null } });
    const removeClient = stillConverted === 0;
    if (removeClient) {
      await tx.clients.update({ where: { client_id: clientId }, data: { deleted_at: new Date(), deleted_by: d.actor_emp_id, reversed_reason: d.reason } });
      await tx.companies.update({ where: { company_id: lead.company_id as number }, data: { is_client: false, client_code: null, updated_by: d.actor_emp_id } });
    }

    const details = { client_code: clientCode, reason: d.reason, client_removed: removeClient };
    await tx.activity_logs.createMany({
      data: [
        { entity_type: 'LEAD', entity_id: d.lead_id, event: 'STATUS_CHANGED', summary: 'Status changed Converted -> Qualified', details: { from: 'Converted', to: 'Qualified', action: 'reverse_conversion', ...details }, performed_by: d.actor_emp_id },
        { entity_type: 'LEAD', entity_id: d.lead_id, event: 'CONVERSION_REVERSED', summary: `Conversion to ${clientCode} reversed`, details, performed_by: d.actor_emp_id },
        { entity_type: 'COMPANY', entity_id: lead.company_id as number, event: 'CONVERSION_REVERSED', summary: `${lead.lead_code}: conversion to ${clientCode} reversed`, details, performed_by: d.actor_emp_id },
      ] as Prisma.activity_logsCreateManyInput[],
    });
    return { lead_id: d.lead_id, client_code: clientCode, client_removed: removeClient };
  }

  async listAdminIds(): Promise<number[]> {
    const rows = await this.prisma.employees.findMany({
      where: { deleted_at: null, status: 'Active', roles_employees_role_idToroles: { is_admin: true } },
      select: { emp_id: true },
    });
    return rows.map((r) => r.emp_id);
  }
}
