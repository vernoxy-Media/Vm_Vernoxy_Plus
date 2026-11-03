import { SalesActor } from '../ports/sales-access-policy.port';
import { SalesWorkRepositoryPort } from '../ports/sales-work.repository.port';
import { SalesLeadRepositoryPort, LeadDetail } from '../ports/sales-lead.repository.port';
import { SalesFollowUpRepositoryPort } from '../ports/sales-follow-up.repository.port';
import { SalesCalendarPort } from '../ports/sales-calendar.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import {
  ClientDetail,
  ConversionContext,
  SalesClientRepositoryPort,
} from '../ports/sales-client.repository.port';
import { assertCanWork, assertLeadFound } from './lead-guards';
import {
  ConflictSalesError,
  FieldValidationError,
  ForbiddenSalesError,
  InvalidTransitionError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';
import {
  CARRIED_FORWARD,
  COMPANY_FIELD_COUNT,
  dateOnly,
  istDateString,
  validateWon,
} from '../../domain/services/client-conversion.service';
import { cleanText } from '../../domain/services/sales-normalization.service';
import { MSG } from '../../domain/services/company-validator.service';
import { splitServiceFit } from '../../domain/entities/sales-lead';

export interface ClientForm {
  lead: { lead_id: number; lead_code: string | null; status: string; service_fit: string[]; lead_by: { emp_id: number; name: string } | null };
  company: ConversionContext['company'];
  /** Preview only; given when the user clicks Convert. A company that is already a client keeps its Client ID. */
  client_id_preview: string;
  client_exists: boolean;
  /** "Won on": today by default; today or a past date, not before the lead was added. */
  won_on: { default: string; min: string; max: string };
  carried_forward: Array<{ key: string; label: string; summary: string }>;
  result_note: string;
  /** false while the lead cannot be marked as Won (it is not Qualified, or already converted). */
  can_convert: boolean;
  blocked_reason: string | null;
}

const REVERSE_REASON_MAX = 500;

/** Mark as Won and Convert to Client (BFD section 9). */
export class ClientUseCases {
  constructor(
    private readonly repo: SalesClientRepositoryPort,
    private readonly work: SalesWorkRepositoryPort,
    private readonly leads: SalesLeadRepositoryPort,
    private readonly followUps: SalesFollowUpRepositoryPort,
    private readonly calendar: SalesCalendarPort,
    private readonly notifier: SalesNotifierPort,
  ) {}

  /** Everything the "Mark as Won and Convert to Client" pop-up shows. */
  async form(leadId: number, actor: SalesActor, now = new Date()): Promise<ClientForm> {
    const ctx = await this.context(leadId);
    const lead = ctx.lead;
    const blocked = this.blockedReason(lead.stage, lead.converted_client?.client_code ?? null);
    const mine = actor.is_admin || lead.lead_by?.emp_id === actor.emp_id;
    const today = istDateString(now);
    const addedOn = istDateString(lead.created_at);
    const c = ctx.counts;

    return {
      lead: {
        lead_id: lead.lead_id,
        lead_code: lead.lead_code,
        status: lead.stage,
        service_fit: splitServiceFit(lead.service_fit),
        lead_by: lead.lead_by,
      },
      company: ctx.company,
      client_id_preview: ctx.existing_client?.client_code ?? (await this.repo.getNextClientCode()),
      client_exists: ctx.existing_client !== null,
      won_on: { default: today, min: addedOn, max: today },
      carried_forward: [
        { key: CARRIED_FORWARD[0].key, label: CARRIED_FORWARD[0].label, summary: `All ${COMPANY_FIELD_COUNT} company fields, including address, GIDC and brochure` },
        {
          key: CARRIED_FORWARD[1].key,
          label: CARRIED_FORWARD[1].label,
          summary: `${c.contacts} contact${c.contacts === 1 ? '' : 's'}${c.primary_contact ? ` - ${c.primary_contact.name} is the primary contact` : ''}`,
        },
        { key: CARRIED_FORWARD[2].key, label: CARRIED_FORWARD[2].label, summary: `${c.communications} conversation${c.communications === 1 ? '' : 's'}, with dates and outcomes` },
        { key: CARRIED_FORWARD[3].key, label: CARRIED_FORWARD[3].label, summary: `${c.notes} note${c.notes === 1 ? '' : 's'}, including Requirement and Budget` },
        { key: CARRIED_FORWARD[4].key, label: CARRIED_FORWARD[4].label, summary: 'Lead Source, Lead By, Date Added, Service Fit' },
      ],
      result_note: 'The lead status becomes Converted and is locked. The company is marked as a Client.',
      can_convert: blocked === null && mine,
      blocked_reason: blocked ?? (mine ? null : 'Only the Lead By user or the Admin can mark this lead as won.'),
    };
  }

  /**
   * "Mark as Won" and "Convert to Client" are one step: the lead becomes Converted and locked, the client is created,
   * the Win note is saved on the lead, the lead's pending follow-ups are cancelled - all or nothing.
   */
  async convert(
    leadId: number,
    input: { won_on?: string | null; win_note?: string | null },
    actor: SalesActor,
    now = new Date(),
  ): Promise<{ client: ClientDetail; lead: LeadDetail; reused_existing_client: boolean }> {
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId));
    assertCanWork(lead, actor);

    if (lead.stage === 'Converted') {
      const ctx = await this.context(leadId);
      throw new ConflictSalesError(
        `This lead was already converted to ${ctx.lead.converted_client?.client_code ?? 'a client'}.`,
        'ALREADY_CONVERTED',
      );
    }
    if (lead.stage !== 'Qualified') {
      throw new InvalidTransitionError(`Only a Qualified lead can be marked as Won (this lead is ${lead.stage}). Qualify it first.`);
    }

    const fields = { won_on: cleanText(input.won_on), win_note: cleanText(input.win_note) };
    const errors = validateWon(fields, (await this.context(leadId)).lead.created_at, now);
    if (errors.length > 0) throw new FieldValidationError(errors);

    const result = await this.repo.convert({
      lead_id: leadId,
      won_on: dateOnly(fields.won_on as string),
      win_note: fields.win_note as string,
      actor_emp_id: actor.emp_id,
    });

    await this.afterConverted(lead.lead_code, lead.company_name, leadId, lead.lead_by_id, result.client_code, actor);

    const [client, detail] = await Promise.all([this.repo.getClient(result.client_id), this.leads.getDetail(leadId, now)]);
    if (!client || !detail) throw new Error('The client was created but could not be read back');
    return { client, lead: detail, reused_existing_client: result.reused_existing_client };
  }

  async get(clientId: number): Promise<ClientDetail> {
    const client = await this.repo.getClient(clientId);
    if (!client) throw new NotFoundSalesError('Client not found', 'CLIENT_NOT_FOUND', 'id');
    return client;
  }

  /**
   * "The Admin can reverse it only while the client has no project, with a reason."
   * The lead goes back to Qualified; when it was the client's only lead the client is removed too.
   */
  async reverse(leadId: number, input: { reason?: string | null }, actor: SalesActor) {
    if (!actor.is_admin) throw new ForbiddenSalesError('A conversion can only be reversed by the Admin.');
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId));
    if (lead.stage !== 'Converted') {
      throw new InvalidTransitionError(`Only a Converted lead can be reversed (this lead is ${lead.stage}).`);
    }
    const reason = cleanText(input.reason);
    if (!reason) throw new FieldValidationError([{ field: 'reason', message: MSG.required }]);
    if (reason.length > REVERSE_REASON_MAX) {
      throw new FieldValidationError([{ field: 'reason', message: `Please keep it under ${REVERSE_REASON_MAX} characters.` }]);
    }

    const client = await this.repo.getClientOfLead(leadId);
    if (client && (await this.repo.clientHasProject(client.client_id))) {
      throw new ConflictSalesError(
        `${client.client_code} already has a project, so the conversion cannot be reversed.`,
        'CLIENT_HAS_PROJECT',
      );
    }
    const result = await this.repo.reverse({ lead_id: leadId, reason, actor_emp_id: actor.emp_id });
    return { ...result, lead: await this.leads.getDetail(leadId, new Date()) };
  }

  // ------------------------------------------------------------- helpers ----

  private async context(leadId: number): Promise<ConversionContext> {
    const ctx = await this.repo.getConversionContext(leadId);
    if (!ctx) throw new NotFoundSalesError('Lead not found', 'LEAD_NOT_FOUND', 'id');
    return ctx;
  }

  private blockedReason(stage: string, clientCode: string | null): string | null {
    if (stage === 'Converted') return `This lead was already converted to ${clientCode ?? 'a client'}.`;
    if (stage !== 'Qualified') return `Only a Qualified lead can be marked as Won (this lead is ${stage}).`;
    return null;
  }

  /** After the commit: tell the Admin and the Lead By user, and take the cancelled follow-ups off the Calendar. Best effort. */
  private async afterConverted(
    leadCode: string | null,
    companyName: string,
    leadId: number,
    leadById: number | null,
    clientCode: string,
    actor: SalesActor,
  ): Promise<void> {
    try {
      const admins = await this.repo.listAdminIds();
      const recipients = new Set<number>([...admins, ...(leadById !== null ? [leadById] : [])]);
      recipients.delete(actor.emp_id);
      await this.notifier.send(
        [...recipients].map((to) => ({
          recipient_emp_id: to,
          kind: 'client_converted',
          title: `Won: ${companyName}`,
          body: `${leadCode ?? 'The lead'} was won and converted to client ${clientCode}.`,
          entity_type: 'LEAD' as const,
          entity_id: leadId,
          created_by: actor.emp_id,
        })),
      );
    } catch {
      /* best effort */
    }
    try {
      for (const f of await this.followUps.listForLead(leadId)) {
        if (f.status === 'Cancelled' && f.calendar_event_id) {
          await this.calendar.remove(f.calendar_event_id, actor.emp_id);
          await this.followUps.setCalendarEvent(f.follow_up_id, null);
        }
      }
    } catch {
      /* the background job cleans the Calendar up later */
    }
  }
}
