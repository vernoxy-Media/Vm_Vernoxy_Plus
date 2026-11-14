import { SalesActor } from '../ports/sales-access-policy.port';
import { LeadWorkContext, SalesWorkRepositoryPort, TransitionResult } from '../ports/sales-work.repository.port';
import {
  FollowUpList,
  FollowUpListParams,
  FollowUpRecord,
  SalesFollowUpRepositoryPort,
} from '../ports/sales-follow-up.repository.port';
import { SalesUnitOfWorkPort } from '../ports/sales-unit-of-work.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import { SalesCalendarPort } from '../ports/sales-calendar.port';
import { LeadActivityUseCases } from './lead-activity.use-cases';
import { LeadStatusUseCases } from './lead-status.use-cases';
import { assertCanWork } from './lead-guards';
import {
  ConflictSalesError,
  FieldError,
  FieldValidationError,
  ForbiddenSalesError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';
import {
  FollowUpAction,
  FollowUpStatus,
  FollowUpTab,
  RESCHEDULE_FLAG_COUNT,
  allowedFollowUpActions,
  effectiveStatus,
  isOpen,
  messages,
} from '../../domain/services/follow-up.service';
import {
  NextStepAction,
  OUTCOMES_SUGGESTING_LOST,
  validateCancel,
  validateComplete,
  validateReschedule,
  validateSchedule,
} from '../../domain/services/follow-up-validator.service';
import { cleanText } from '../../domain/services/sales-normalization.service';
import { resolveAssignee } from '../../domain/services/lead-workflow.service';
import { MSG } from '../../domain/services/company-validator.service';

export interface FollowUpView {
  follow_up_id: number;
  status: FollowUpStatus;
  follow_up_on: Date;
  type: string;
  purpose: string | null;
  company: FollowUpRecord['company'];
  /** "Related to": the Lead ID, or the Company ID while the company is not yet a lead. */
  related_to: { kind: 'lead' | 'company'; lead_id: number | null; lead_code: string | null; company_id: number; company_code: string | null };
  lead_status: string | null;
  contact: FollowUpRecord['contact'];
  assigned_to: FollowUpRecord['assigned_to'];
  rescheduled_count: number;
  done_on: Date | null;
  outcome: string | null;
  what_happened: string | null;
  reason: string | null;
  /** The buttons the user may press on this row. */
  actions: FollowUpAction[];
}

export interface FollowUpQuery {
  tab?: FollowUpTab;
  /** "me" (default in the UI), "all", or an employee id. */
  assigned_to?: 'me' | 'all' | number;
  type?: string[];
  city?: string[];
  industry_ids?: number[];
  lead_by?: 'me' | 'all' | number;
  date_from?: Date;
  date_to?: Date;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ScheduleInput {
  lead_id?: number | null;
  company_id?: number | null;
  contact_id?: number | null;
  follow_up_on?: Date | null;
  type?: string | null;
  assigned_to?: number | null;
  purpose?: string | null;
}

export interface NextStepInput {
  action?: NextStepAction | null;
  // schedule next follow-up
  follow_up_on?: Date | null;
  type?: string | null;
  assigned_to?: number | null;
  purpose?: string | null;
  // put on hold
  reason?: string | null;
  // mark as lost
  lost_reason?: string | null;
  note?: string | null;
  // qualify
  service_fit?: unknown;
}

export interface CompleteInput {
  done_on?: Date | null;
  outcome?: string | null;
  what_happened?: string | null;
  /** A call follow-up: how long the call lasted, in seconds. */
  call_duration_seconds?: number | null;
  next_step?: NextStepInput | null;
}

export interface CompleteResult {
  follow_up: FollowUpView;
  conversation: { communication_id: number; status_change: TransitionResult | null };
  next_step: { action: NextStepAction; follow_up: FollowUpView | null; transition: TransitionResult | null };
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_TAB: FollowUpTab = 'today';

/** Follow-ups: plan, list, edit, complete, reschedule, cancel (BFD section 7, Parts 3 to 6). */
export class FollowUpUseCases {
  constructor(
    private readonly repo: SalesFollowUpRepositoryPort,
    private readonly work: SalesWorkRepositoryPort,
    private readonly activity: LeadActivityUseCases,
    private readonly status: LeadStatusUseCases,
    private readonly uow: SalesUnitOfWorkPort,
    private readonly notifier: SalesNotifierPort,
    private readonly calendar: SalesCalendarPort,
  ) {}

  // ---------------------------------------------------------------- read ----

  async list(query: FollowUpQuery, actor: SalesActor, now = new Date()): Promise<Omit<FollowUpList, 'items'> & { tab: FollowUpTab; items: FollowUpView[] }> {
    const resolve = (v: 'me' | 'all' | number | undefined) => (v === 'me' ? actor.emp_id : typeof v === 'number' ? v : undefined);
    const tab = query.tab ?? DEFAULT_TAB;
    const params: FollowUpListParams = {
      tab,
      scope_emp_id: actor.is_admin ? undefined : actor.emp_id,
      assigned_to: resolve(query.assigned_to),
      type: query.type,
      city: query.city,
      industry_ids: query.industry_ids,
      lead_by_id: resolve(query.lead_by),
      date_from: query.date_from,
      date_to: query.date_to,
      q: query.q,
      page: Math.max(query.page ?? 1, 1),
      limit: Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE),
      now,
    };
    const list = await this.repo.list(params);
    return { ...list, tab, items: list.items.map((r) => this.view(r, actor, now)) };
  }

  async forLead(leadId: number, actor: SalesActor, now = new Date()): Promise<FollowUpView[]> {
    if (!(await this.work.getLeadForWork(leadId))) throw new NotFoundSalesError('Lead not found', 'LEAD_NOT_FOUND', 'id');
    return (await this.repo.listForLead(leadId)).map((r) => this.view(r, actor, now));
  }

  async get(id: number, actor: SalesActor, now = new Date()): Promise<FollowUpView & { suggest_lost_on_outcomes: readonly string[] }> {
    const rec = await this.mustGet(id);
    return { ...this.view(rec, actor, now), suggest_lost_on_outcomes: OUTCOMES_SUGGESTING_LOST };
  }

  // ------------------------------------------------------------ schedule ----

  /** "+ Schedule Follow-up": for a lead, or for a company that is not yet a lead. */
  async schedule(input: ScheduleInput, actor: SalesActor, now = new Date()): Promise<FollowUpView> {
    const target = await this.resolveTarget(input, actor);
    const contactId = input.contact_id ?? target.default_contact_id;
    // It starts as the person scheduling; only the Admin can give it to someone else.
    const assignee = resolveAssignee(input.assigned_to, actor);
    const fields = {
      follow_up_on: input.follow_up_on ?? null,
      type: cleanText(input.type),
      contact_id: contactId,
      purpose: cleanText(input.purpose),
    };
    const errors = validateSchedule(fields, now);
    if (contactId !== null && !errors.some((e) => e.field === 'contact_id') && !(await this.work.isActiveContactOfCompany(target.company_id, contactId))) {
      errors.push({ field: 'contact_id', message: 'Choose a contact who works at this company.' });
    }
    if (!(await this.work.isEligibleAssignee(assignee))) errors.push({ field: 'assigned_to', message: 'Choose an active Sales user or Admin.' });
    if (errors.length > 0) throw new FieldValidationError(errors);

    const created = await this.repo.create(
      {
        company_id: target.company_id,
        lead_id: target.lead_id,
        contact_id: contactId as number,
        follow_up_on: fields.follow_up_on as Date,
        type: fields.type as string,
        assigned_to: assignee,
        purpose: fields.purpose,
        actor_emp_id: actor.emp_id,
      },
    );
    const rec = await this.mustGet(created.follow_up_id);
    await this.afterScheduled(rec, actor);
    return this.view(rec, actor, now);
  }

  private async resolveTarget(
    input: ScheduleInput,
    actor: SalesActor,
  ): Promise<{ company_id: number; lead_id: number | null; default_contact_id: number | null; default_assignee: number | null }> {
    if (input.lead_id) {
      const lead = await this.work.getLeadForWork(input.lead_id);
      if (!lead) throw new NotFoundSalesError('Lead not found', 'LEAD_NOT_FOUND', 'lead_id');
      if (input.company_id && input.company_id !== lead.company_id) {
        throw new FieldValidationError([{ field: 'company_id', message: 'This lead belongs to another company.' }]);
      }
      return this.leadTarget(lead, actor);
    }
    if (!input.company_id) throw new FieldValidationError([{ field: 'lead_id', message: 'Pick a lead or a company.' }]);

    const company = await this.work.getCompanyForLog(input.company_id);
    if (!company) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'company_id');
    // A company with an open lead: the follow-up belongs to that lead.
    if (company.open_lead) return this.leadTarget(company.open_lead, actor);
    return {
      company_id: company.company_id,
      lead_id: null,
      default_contact_id: await this.work.getPrimaryContactPersonId(company.company_id),
      default_assignee: actor.emp_id,
    };
  }

  private async leadTarget(lead: LeadWorkContext, actor: SalesActor) {
    assertCanWork(lead, actor);
    if (lead.stage === 'Converted') throw new ConflictSalesError('This lead is converted to a client and is read-only.', 'LEAD_LOCKED');
    if (lead.stage === 'Lost') {
      throw new ConflictSalesError('A lost lead cannot get new follow-ups. Reopen it first.', 'LEAD_CLOSED');
    }
    return {
      company_id: lead.company_id,
      lead_id: lead.lead_id,
      default_contact_id: lead.person_id ?? (await this.work.getPrimaryContactPersonId(lead.company_id)),
      default_assignee: lead.lead_by_id,
    };
  }

  // ---------------------------------------------------------------- edit ----

  /** Purpose, contact and Assigned to can be edited while Pending or Overdue; the date only through Reschedule. */
  async edit(id: number, patch: { purpose?: string | null; contact_id?: number | null; assigned_to?: number | null }, actor: SalesActor, now = new Date()): Promise<FollowUpView> {
    const rec = await this.mustAct(id, 'edit', actor, now);
    const errors: FieldError[] = [];
    const purpose = patch.purpose !== undefined ? cleanText(patch.purpose) : undefined;
    if (purpose && purpose.length > 500) errors.push({ field: 'purpose', message: 'Please keep it under 500 characters.' });
    if (patch.contact_id !== undefined && patch.contact_id !== null && patch.contact_id !== rec.contact?.person_id) {
      if (!(await this.work.isActiveContactOfCompany(rec.company.company_id, patch.contact_id))) {
        errors.push({ field: 'contact_id', message: 'Choose a contact who works at this company.' });
      }
    }
    if (patch.contact_id === null) errors.push({ field: 'contact_id', message: MSG.required });
    const reassigned = patch.assigned_to !== undefined && patch.assigned_to !== null && patch.assigned_to !== rec.assigned_to.emp_id;
    if (reassigned && !(await this.work.isEligibleAssignee(patch.assigned_to as number))) {
      errors.push({ field: 'assigned_to', message: 'Choose an active Sales user or Admin.' });
    }
    if (errors.length > 0) throw new FieldValidationError(errors);

    await this.repo.updateDetails(
      id,
      {
        ...(purpose !== undefined ? { purpose } : {}),
        ...(patch.contact_id ? { contact_id: patch.contact_id } : {}),
        ...(reassigned ? { assigned_to: patch.assigned_to as number } : {}),
      },
      actor.emp_id,
    );
    const updated = await this.mustGet(id);
    if (reassigned) {
      await this.moveCalendarEvent(updated, rec.assigned_to.emp_id, actor);
      await this.notifyAssigned(updated, actor);
    } else {
      await this.syncCalendar(updated, actor);
    }
    return this.view(updated, actor, now);
  }

  // ---------------------------------------------------------- reschedule ----

  /** New date and time plus a reason; the old date stays in History. Rescheduled 3 times is flagged to the Admin. */
  async reschedule(id: number, input: { follow_up_on?: Date | null; reason?: string | null }, actor: SalesActor, now = new Date()): Promise<FollowUpView> {
    await this.mustAct(id, 'reschedule', actor, now);
    const fields = { follow_up_on: input.follow_up_on ?? null, reason: cleanText(input.reason) };
    const errors = validateReschedule(fields, now);
    if (errors.length > 0) throw new FieldValidationError(errors);

    const { count } = await this.repo.reschedule(id, { follow_up_on: fields.follow_up_on as Date, reason: fields.reason as string }, actor.emp_id);
    const updated = await this.mustGet(id);
    await this.syncCalendar(updated, actor);
    if (count === RESCHEDULE_FLAG_COUNT) await this.flagToAdmins(updated, count, actor);
    return this.view(updated, actor, now);
  }

  // -------------------------------------------------------------- cancel ----

  async cancel(id: number, input: { reason?: string | null }, actor: SalesActor, now = new Date()): Promise<FollowUpView> {
    await this.mustAct(id, 'cancel', actor, now);
    const reason = cleanText(input.reason);
    const errors = validateCancel({ reason });
    if (errors.length > 0) throw new FieldValidationError(errors);

    await this.repo.cancel(id, reason as string, actor.emp_id);
    const updated = await this.mustGet(id);
    await this.dropCalendar(updated, actor);
    return this.view(updated, actor, now);
  }

  // ------------------------------------------------------------ complete ----

  /**
   * Records what happened (saved as a conversation), marks the follow-up Completed and runs the next step,
   * all in one transaction: either everything is saved or nothing is.
   */
  async complete(id: number, input: CompleteInput, actor: SalesActor, now = new Date()): Promise<CompleteResult> {
    const rec = await this.mustAct(id, 'complete', actor, now);
    const next = input.next_step ?? {};
    const action = (next.action ?? null) as NextStepAction | null;
    const fields = {
      done_on: input.done_on ?? now,
      outcome: cleanText(input.outcome),
      what_happened: cleanText(input.what_happened),
      next_step: action,
    };
    const errors = validateComplete(fields, rec.created_at, now);
    // A call follow-up records how long the call lasted; other channels have no call length
    const duration = input.call_duration_seconds ?? null;
    if (rec.type === 'Call') {
      if (duration === null) errors.push({ field: 'call_duration_seconds', message: 'Please enter how long the call lasted, for example 3 min 28 sec.' });
      else if (!Number.isInteger(duration) || duration < 1 || duration >= 86400) errors.push({ field: 'call_duration_seconds', message: 'Enter how long the call lasted, for example 3 min 28 sec (up to 23 h 59 min).' });
    } else if (duration !== null) {
      errors.push({ field: 'call_duration_seconds', message: 'The call length is only for a call.' });
    }

    if (rec.lead === null && (action === 'qualify' || action === 'hold' || action === 'lost')) {
      errors.push({ field: 'next_step.action', message: 'This step is only available for a lead. Convert the company to a lead first.' });
    }
    // Conversation contact: the one on the follow-up, else the company's primary contact.
    let contactId = rec.contact?.person_id ?? null;
    if (contactId === null || !(await this.work.isActiveContactOfCompany(rec.company.company_id, contactId))) {
      contactId = await this.work.getPrimaryContactPersonId(rec.company.company_id);
    }
    if (contactId === null) errors.push({ field: 'contact_id', message: 'This company has no contact to record the conversation with. Add one first.' });

    // Schedule-next fields are validated up front so the user sees every problem at once.
    let nextAssignee = 0;
    if (action === 'schedule') {
      nextAssignee = resolveAssignee(next.assigned_to, actor);
      errors.push(
        ...validateSchedule(
          { follow_up_on: next.follow_up_on ?? null, type: cleanText(next.type) ?? rec.type, contact_id: contactId, purpose: cleanText(next.purpose) },
          now,
          'next_step.',
        ),
      );
      if (!(await this.work.isEligibleAssignee(nextAssignee))) errors.push({ field: 'next_step.assigned_to', message: 'Choose an active Sales user or Admin.' });
    }
    if (errors.length > 0) throw new FieldValidationError(errors);

    const outcome = await this.uow.run(async (tx) => {
      const conversation = await this.activity.logForFollowUp(
        {
          company_id: rec.company.company_id,
          lead_id: rec.lead?.lead_id ?? null,
          contact_id: contactId as number,
          type: rec.type,
          communication_date: fields.done_on,
          what_discussed: fields.what_happened as string,
          outcome: fields.outcome as string,
          call_duration_seconds: rec.type === 'Call' ? duration : null,
        },
        actor,
        now,
        tx,
      );
      await this.repo.complete(
        id,
        { done_on: fields.done_on, outcome: fields.outcome as string, what_happened: fields.what_happened as string, communication_id: conversation.communication_id },
        actor.emp_id,
        tx,
      );

      let nextFollowUpId: number | null = null;
      let transition: TransitionResult | null = null;
      if (action === 'schedule') {
        nextFollowUpId = (
          await this.repo.create(
            {
              company_id: rec.company.company_id,
              lead_id: rec.lead?.lead_id ?? null,
              contact_id: contactId as number,
              follow_up_on: next.follow_up_on as Date,
              type: cleanText(next.type) ?? rec.type,
              assigned_to: nextAssignee,
              purpose: cleanText(next.purpose),
              actor_emp_id: actor.emp_id,
            },
            tx,
          )
        ).follow_up_id;
      } else if (action === 'qualify') {
        transition = await this.status.qualify(rec.lead!.lead_id, { service_fit: next.service_fit }, actor, tx);
      } else if (action === 'hold') {
        transition = await this.status.putOnHold(
          rec.lead!.lead_id,
          { follow_up_on: next.follow_up_on, type: next.type, assigned_to: next.assigned_to, purpose: next.purpose, reason: next.reason },
          actor,
          now,
          tx,
        );
      } else if (action === 'lost') {
        transition = await this.status.markLost(rec.lead!.lead_id, { reason: next.lost_reason, note: next.note }, actor, tx);
      }
      return { conversation, nextFollowUpId, transition };
    });

    // After the commit: Calendar and messages (best effort, never undo the work above).
    const completed = await this.mustGet(id);
    await this.dropCalendar(completed, actor);
    let nextView: FollowUpView | null = null;
    if (outcome.nextFollowUpId !== null) {
      const created = await this.mustGet(outcome.nextFollowUpId);
      await this.afterScheduled(created, actor);
      nextView = this.view(created, actor, now);
    }
    return {
      follow_up: this.view(completed, actor, now),
      conversation: outcome.conversation,
      next_step: { action: action as NextStepAction, follow_up: nextView, transition: outcome.transition },
    };
  }

  // ------------------------------------------------------------- helpers ----

  private async mustGet(id: number): Promise<FollowUpRecord> {
    const rec = await this.repo.get(id);
    if (!rec) throw new NotFoundSalesError('Follow-up not found', 'FOLLOW_UP_NOT_FOUND', 'id');
    return rec;
  }

  /** Loads the follow-up and checks the actor may press this button on it. */
  private async mustAct(id: number, action: FollowUpAction, actor: SalesActor, now: Date): Promise<FollowUpRecord> {
    const rec = await this.mustGet(id);
    const status = effectiveStatus(rec.status, rec.follow_up_on, now);
    if (!isOpen(status)) {
      throw new ConflictSalesError(`This follow-up is ${status}; it cannot be changed any more.`, 'FOLLOW_UP_CLOSED');
    }
    if (!this.actionsFor(rec, status, actor).includes(action)) {
      throw new ForbiddenSalesError('Only the person it is assigned to, the Lead By user or the Admin can do this.');
    }
    return rec;
  }

  private actionsFor(rec: FollowUpRecord, status: FollowUpStatus, actor: SalesActor): FollowUpAction[] {
    const locked = rec.lead?.stage === 'Converted';
    const actions = allowedFollowUpActions(
      { status, assigned_to: rec.assigned_to.emp_id, created_by: rec.created_by, lead_by_id: rec.lead?.lead_by_id ?? null },
      actor,
    );
    return locked ? ['view'] : actions;
  }

  private view(rec: FollowUpRecord, actor: SalesActor, now: Date): FollowUpView {
    const status = effectiveStatus(rec.status, rec.follow_up_on, now);
    return {
      follow_up_id: rec.follow_up_id,
      status,
      follow_up_on: rec.follow_up_on,
      type: rec.type,
      purpose: rec.purpose,
      company: rec.company,
      related_to: {
        kind: rec.lead ? 'lead' : 'company',
        lead_id: rec.lead?.lead_id ?? null,
        lead_code: rec.lead?.lead_code ?? null,
        company_id: rec.company.company_id,
        company_code: rec.company.company_code,
      },
      lead_status: rec.lead?.stage ?? null,
      contact: rec.contact,
      assigned_to: rec.assigned_to,
      rescheduled_count: rec.rescheduled_count,
      done_on: rec.done_on,
      outcome: rec.outcome,
      what_happened: rec.what_happened,
      reason: rec.reason,
      actions: this.actionsFor(rec, status, actor),
    };
  }

  private facts(rec: FollowUpRecord) {
    return { company_name: rec.company.name, type: rec.type, at: rec.follow_up_on, contact_name: rec.contact?.name ?? null };
  }

  private async afterScheduled(rec: FollowUpRecord, actor: SalesActor): Promise<void> {
    await this.syncCalendar(rec, actor);
    await this.notifyAssigned(rec, actor);
  }

  /** "Follow-up assigned to someone else": the Assigned to user gets a message. */
  private async notifyAssigned(rec: FollowUpRecord, actor: SalesActor): Promise<void> {
    if (rec.assigned_to.emp_id === actor.emp_id) return;
    try {
      const m = messages.assigned(await this.repo.employeeName(actor.emp_id), this.facts(rec));
      await this.notifier.send([
        { recipient_emp_id: rec.assigned_to.emp_id, kind: 'follow_up_assigned', title: m.title, body: m.body, entity_type: 'FOLLOW_UP', entity_id: rec.follow_up_id, created_by: actor.emp_id },
      ]);
    } catch {
      /* best effort */
    }
  }

  private async flagToAdmins(rec: FollowUpRecord, count: number, actor: SalesActor): Promise<void> {
    try {
      const admins = await this.repo.listAdminIds();
      const m = messages.rescheduledThrice(rec.company.name, count);
      await this.notifier.send(
        admins.map((a) => ({ recipient_emp_id: a, kind: 'follow_up_rescheduled', title: m.title, body: m.body, entity_type: 'FOLLOW_UP' as const, entity_id: rec.follow_up_id, created_by: actor.emp_id })),
      );
    } catch {
      /* best effort */
    }
  }

  // The Calendar mirrors Pending follow-ups. Failures are repaired by the background job.

  private calendarEvent(rec: FollowUpRecord) {
    return {
      title: `Follow-up: ${rec.type} - ${rec.company.name}`,
      description: [rec.contact ? `With ${rec.contact.name}` : null, rec.purpose].filter(Boolean).join('. ') || null,
      start: rec.follow_up_on,
      organizer_emp_id: rec.assigned_to.emp_id,
    };
  }

  private async syncCalendar(rec: FollowUpRecord, actor: SalesActor): Promise<void> {
    try {
      if (rec.calendar_event_id) await this.calendar.update(rec.calendar_event_id, this.calendarEvent(rec), actor.emp_id);
      else await this.repo.setCalendarEvent(rec.follow_up_id, await this.calendar.create(this.calendarEvent(rec)));
    } catch {
      /* the job creates it later */
    }
  }

  private async moveCalendarEvent(rec: FollowUpRecord, previousAssignee: number, actor: SalesActor): Promise<void> {
    try {
      // The event belongs to the Assigned to user's Calendar, so it is replaced rather than edited.
      if (rec.calendar_event_id && previousAssignee !== rec.assigned_to.emp_id) {
        await this.calendar.remove(rec.calendar_event_id, actor.emp_id);
        await this.repo.setCalendarEvent(rec.follow_up_id, null); // if the next step fails, the job creates the new event
        await this.repo.setCalendarEvent(rec.follow_up_id, await this.calendar.create(this.calendarEvent(rec)));
      } else {
        await this.syncCalendar(rec, actor);
      }
    } catch {
      /* the job repairs it */
    }
  }

  private async dropCalendar(rec: FollowUpRecord, actor: SalesActor): Promise<void> {
    try {
      if (!rec.calendar_event_id) return;
      await this.calendar.remove(rec.calendar_event_id, actor.emp_id);
      await this.repo.setCalendarEvent(rec.follow_up_id, null);
    } catch {
      /* the job cleans up later */
    }
  }
}
