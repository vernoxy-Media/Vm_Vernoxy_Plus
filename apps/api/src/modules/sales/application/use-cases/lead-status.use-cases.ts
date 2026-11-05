import { SalesActor } from '../ports/sales-access-policy.port';
import { SalesWorkRepositoryPort, TransitionResult, FollowUpInput } from '../ports/sales-work.repository.port';
import { SalesLeadRepositoryPort } from '../ports/sales-lead.repository.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import { assertCanWork, assertLeadFound, assertNotLocked } from './lead-guards';
import {
  FieldError,
  FieldValidationError,
  ForbiddenSalesError,
  InvalidTransitionError,
} from '../../domain/errors/sales.errors';
import {
  LOST_REASON_OTHER,
  allowedActions,
  canApplyAction,
  canMoveTo,
  evaluateQualification,
  MOVABLE_STAGES,
  resolveAssignee,
  reopenTarget,
  StatusAction,
} from '../../domain/services/lead-workflow.service';
import { normalizeServiceFit } from '../../domain/services/lead-validator.service';
import { joinServiceFit, LeadStatus, splitServiceFit } from '../../domain/entities/sales-lead';
import { CONVERSATION_TYPES } from '../../domain/services/activity-validator.service';
import { cleanText } from '../../domain/services/sales-normalization.service';
import { MSG } from '../../domain/services/company-validator.service';

const SLACK_MS = 2 * 60 * 1000;
const NOTE_MAX = 5000;

const VERBS: Record<StatusAction, string> = {
  qualify: 'qualified',
  hold: 'put on hold',
  lost: 'marked as lost',
  reopen: 'reopened',
};

/** Qualify Lead, Put On Hold, Mark as Lost, Reopen and Change Lead By (BFD sections 2, 7, 8 and 9). */
export class LeadStatusUseCases {
  constructor(
    private readonly work: SalesWorkRepositoryPort,
    private readonly leads: SalesLeadRepositoryPort,
    private readonly notifier: SalesNotifierPort,
  ) {}

  /** The checklist of the Qualify popup: what is done, what is missing, and which actions the status allows. */
  async qualification(leadId: number, actor: SalesActor) {
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId));
    const facts = await this.work.getQualificationFacts(leadId);
    const checklist = evaluateQualification(facts);
    const locked = lead.stage === 'Converted';
    const mine = actor.is_admin || lead.lead_by_id === actor.emp_id;
    return {
      status: lead.stage,
      items: checklist.items,
      complete: checklist.complete,
      // The checklist is a guide: nothing has to be done before a lead is moved to Qualified.
      can_qualify: !locked && mine && canApplyAction('qualify', lead.stage),
      allowed_actions: locked || !mine ? [] : allowedActions(lead.stage),
    };
  }

  async qualify(leadId: number, input: { service_fit?: unknown }, actor: SalesActor, tx?: unknown): Promise<TransitionResult> {
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId, tx));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    this.assertAllowed('qualify', lead.stage, 'This lead is already qualified');

    // The Qualify popup may correct the Service Fit.
    let serviceFit: string | null = lead.service_fit;
    if (input.service_fit !== undefined) {
      const wanted = normalizeServiceFit(input.service_fit);
      if (wanted.length > 0) {
        const { labels, unknown } = await this.leads.resolveServiceFit(wanted);
        if (unknown.length > 0) {
          throw new FieldValidationError([{ field: 'service_fit', message: `Choose Service Fit from the list (not found: ${unknown.join(', ')}).` }]);
        }
        serviceFit = joinServiceFit(labels);
      }
    }

    return this.work.qualify({ lead_id: leadId, service_fit: serviceFit === lead.service_fit ? null : serviceFit, actor_emp_id: actor.emp_id }, tx);
  }

  /** Puts a lead On Hold. A check-back follow-up can be planned, but it is not required. */
  async putOnHold(
    leadId: number,
    input: { follow_up_on?: Date | null; type?: string | null; assigned_to?: number | null; purpose?: string | null; reason?: string | null },
    actor: SalesActor,
    now = new Date(),
    tx?: unknown,
  ): Promise<TransitionResult> {
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId, tx));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    this.assertAllowed('hold', lead.stage, 'This lead is already on hold');

    const errors: FieldError[] = [];
    const reason = cleanText(input.reason);
    if (reason && reason.length > NOTE_MAX) errors.push({ field: 'reason', message: `Please keep it under ${NOTE_MAX} characters.` });

    let followUp: FollowUpInput | null = null;
    const at = input.follow_up_on ?? null;
    if (at) {
      if (Number.isNaN(at.getTime())) errors.push({ field: 'follow_up_on', message: MSG.required });
      else if (at.getTime() < now.getTime() - SLACK_MS) errors.push({ field: 'follow_up_on', message: 'The check-back date must be today or later.' });
      const type = cleanText(input.type) ?? 'Call';
      if (!(CONVERSATION_TYPES as readonly string[]).includes(type)) {
        errors.push({ field: 'type', message: `Choose one of: ${CONVERSATION_TYPES.join(', ')}.` });
      }
      const assignee = resolveAssignee(input.assigned_to, actor);
      if (!(await this.work.isEligibleAssignee(assignee))) errors.push({ field: 'assigned_to', message: 'Choose an active Sales user or Admin.' });
      if (errors.length === 0) {
        followUp = { follow_up_on: at, type, assigned_to: assignee, purpose: cleanText(input.purpose) ?? 'Check back (lead on hold)' };
      }
    }
    if (errors.length > 0) throw new FieldValidationError(errors);

    return this.work.putOnHold(
      {
        lead_id: leadId,
        follow_up: followUp,
        reason,
        contact_id: lead.person_id ?? (await this.work.getPrimaryContactPersonId(lead.company_id)),
        actor_emp_id: actor.emp_id,
      },
      tx,
    );
  }

  /** "Mark as Lost" needs a reason; "Other" needs a note. Pending follow-ups are cancelled. */
  async markLost(leadId: number, input: { reason?: string | null; note?: string | null }, actor: SalesActor, tx?: unknown): Promise<TransitionResult> {
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId, tx));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    this.assertAllowed('lost', lead.stage, 'This lead is already lost');

    const errors: FieldError[] = [];
    const wanted = cleanText(input.reason);
    const note = cleanText(input.note);
    let resolved: { label: string; lookup_id: number } | null = null;
    if (!wanted) errors.push({ field: 'reason', message: MSG.required });
    else {
      resolved = await this.work.resolveLostReason(wanted);
      if (!resolved) errors.push({ field: 'reason', message: 'Choose a reason from the list.' });
      else if (resolved.label.trim().toLowerCase() === LOST_REASON_OTHER && !note) {
        errors.push({ field: 'note', message: 'Please write a note when the reason is "Other".' });
      }
    }
    if (note && note.length > NOTE_MAX) errors.push({ field: 'note', message: `Please keep it under ${NOTE_MAX} characters.` });
    if (errors.length > 0) throw new FieldValidationError(errors);

    return this.work.markLost(
      {
        lead_id: leadId,
        reason: (resolved as { label: string }).label,
        reason_lookup_id: (resolved as { lookup_id: number }).lookup_id,
        note,
        actor_emp_id: actor.emp_id,
      },
      tx,
    );
  }

  /** Lost goes back to Contacted; On Hold goes back to the status it had before. */
  async reopen(leadId: number, actor: SalesActor): Promise<TransitionResult> {
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    this.assertAllowed('reopen', lead.stage, 'Only a Lost or On Hold lead can be reopened');
    const previous = lead.stage === 'On Hold' ? await this.work.getStatusBeforeHold(leadId) : null;
    return this.work.reopen({ lead_id: leadId, to: reopenTarget(lead.stage, previous), actor_emp_id: actor.emp_id });
  }

  /**
   * Moves a lead to any stage, from any stage, with nothing to fill in first. The one rule: Lost asks for a
   * reason (and a note when the reason is "Other"). Converted is not reachable here; it needs Mark as Won.
   */
  async moveToStage(leadId: number, input: { to?: string | null; reason?: string | null; note?: string | null }, actor: SalesActor): Promise<TransitionResult> {
    const to = cleanText(input.to);
    if (!to || !(MOVABLE_STAGES as readonly string[]).includes(to)) {
      throw new FieldValidationError([{ field: 'to', message: `Choose one of: ${MOVABLE_STAGES.join(', ')}.` }]);
    }
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    if (!canMoveTo(lead.stage, to)) throw new InvalidTransitionError(`This lead is already ${lead.stage}.`);

    switch (to) {
      case 'Lost':
        return this.markLost(leadId, { reason: input.reason, note: input.note }, actor);
      case 'Qualified':
        return this.qualify(leadId, {}, actor);
      case 'On Hold':
        return this.putOnHold(leadId, {}, actor);
      default:
        return this.work.moveStage({ lead_id: leadId, to: to as LeadStatus, actor_emp_id: actor.emp_id });
    }
  }

  /** Admin only. The new Lead By user is told. */
  async changeLeadBy(leadId: number, input: { lead_by_id?: number | null }, actor: SalesActor): Promise<{ lead_by_id: number; previous: number | null }> {
    if (!actor.is_admin) throw new ForbiddenSalesError('Only the Admin can change the Lead By user.');
    const lead = assertLeadFound(await this.work.getLeadForWork(leadId));
    assertNotLocked(lead);
    const next = input.lead_by_id ?? null;
    if (next === null) throw new FieldValidationError([{ field: 'lead_by_id', message: MSG.required }]);
    if (!(await this.leads.isEligibleLeadBy(next))) {
      throw new FieldValidationError([{ field: 'lead_by_id', message: 'Choose an active Sales user or Admin.' }]);
    }
    if (next === lead.lead_by_id) return { lead_by_id: next, previous: lead.lead_by_id };

    const { previous } = await this.work.changeLeadBy({ lead_id: leadId, new_lead_by_id: next, actor_emp_id: actor.emp_id });
    if (next !== actor.emp_id) {
      try {
        await this.notifier.leadAssigned({
          recipient_emp_id: next,
          lead_id: leadId,
          lead_code: lead.lead_code ?? `LEAD-${leadId}`,
          company_name: lead.company_name,
          assigned_by_emp_id: actor.emp_id,
        });
      } catch {
        /* best effort */
      }
    }
    return { lead_by_id: next, previous };
  }

  private assertAllowed(action: StatusAction, stage: Parameters<typeof canApplyAction>[1], prefix: string): void {
    if (!canApplyAction(action, stage)) {
      throw new InvalidTransitionError(`${prefix} (this lead is ${stage}). It cannot be ${VERBS[action]}.`);
    }
  }
}
