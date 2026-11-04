import { SalesActor } from '../ports/sales-access-policy.port';
import {
  CommunicationRecord,
  FollowUpInput,
  LeadWorkContext,
  NoteRecord,
  Paged,
  SalesWorkRepositoryPort,
  TimelineEntry,
  HistoryEntry,
  TransitionResult,
} from '../ports/sales-work.repository.port';
import { assertCanWork, assertLeadFound, assertNotLocked } from './lead-guards';
import {
  FieldError,
  FieldValidationError,
  ForbiddenSalesError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';
import {
  CONVERSATION_TYPES,
  isNotReceivedCall,
  validateConversation,
  validateNote,
} from '../../domain/services/activity-validator.service';
import { canEditEntry, resolveAssignee } from '../../domain/services/lead-workflow.service';
import { cleanText } from '../../domain/services/sales-normalization.service';
import { MSG } from '../../domain/services/company-validator.service';

export type WithEditable<T> = T & { editable: boolean };

export interface ConversationInput {
  type?: string | null;
  contact_id?: number | null;
  /** Defaults to now. */
  communication_date?: Date | null;
  what_discussed?: string | null;
  outcome?: string | null;
  /** Calls only: Received or Not received. */
  call_status?: string | null;
  /** Calls that were not received: the reason, from the Admin's list. */
  not_received_reason?: string | null;
  /** The "Schedule next follow-up" part of the popup; saved together with the conversation. */
  next_follow_up?: { follow_up_on?: Date | null; type?: string | null; assigned_to?: number | null; purpose?: string | null } | null;
}

export interface LogResult {
  conversation: WithEditable<CommunicationRecord>;
  status_change: TransitionResult | null;
  follow_up_id: number | null;
}

const SLACK_MS = 2 * 60 * 1000;

/** Conversations, notes, the Lead Details timeline and History (BFD sections 5, 7 and 8). */
export class LeadActivityUseCases {
  constructor(private readonly repo: SalesWorkRepositoryPort) {}

  // ------------------------------------------------------ conversations ----

  /** "Log Conversation" on Lead Details. */
  async logOnLead(leadId: number, input: ConversationInput, actor: SalesActor, now = new Date()): Promise<LogResult> {
    const lead = assertLeadFound(await this.repo.getLeadForWork(leadId));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    return this.log(lead.company_id, lead.lead_id, input, actor, now, { requireOutcome: true });
  }

  /**
   * "+ Log Communication" on Company Details. Before a lead exists the entry belongs to the company;
   * once there is an open lead, new entries belong to that lead (and still show on the company).
   */
  async logOnCompany(companyId: number, input: ConversationInput, actor: SalesActor, now = new Date()): Promise<LogResult> {
    const company = await this.repo.getCompanyForLog(companyId);
    if (!company) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    return this.log(company.company_id, company.open_lead?.lead_id ?? null, input, actor, now, { requireOutcome: true });
  }

  /** Quick log on Lead Details: a conversation with the primary contact, outcome left empty. */
  async quickLog(leadId: number, input: { type: string; text?: string; call_status?: string | null; not_received_reason?: string | null }, actor: SalesActor, now = new Date()): Promise<{ kind: 'conversation'; result: LogResult } | { kind: 'note'; note: WithEditable<NoteRecord> }> {
    const lead = assertLeadFound(await this.repo.getLeadForWork(leadId));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    const text = cleanText(input.text);
    if (input.type === 'Note') {
      return { kind: 'note', note: await this.addNoteTo(lead, { note_type: 'General', note: text }, actor, now) };
    }
    const contactId = lead.person_id ?? (await this.repo.getPrimaryContactPersonId(lead.company_id));
    if (contactId === null) {
      throw new FieldValidationError([{ field: 'contact_id', message: 'Add a contact to this company first.' }]);
    }
    const result = await this.log(
      lead.company_id,
      lead.lead_id,
      { type: input.type, contact_id: contactId, what_discussed: text, communication_date: now, call_status: input.call_status, not_received_reason: input.not_received_reason },
      actor,
      now,
      { requireOutcome: false },
    );
    return { kind: 'conversation', result };
  }

  /**
   * The conversation saved by "Complete Follow-up". Permission is the follow-up's (assignee, Lead By, Admin),
   * not the lead's, and the write joins the caller's transaction so nothing is half saved.
   */
  async logForFollowUp(
    a: { company_id: number; lead_id: number | null; contact_id: number; type: string; communication_date: Date; what_discussed: string; outcome: string },
    actor: SalesActor,
    now: Date,
    tx: unknown,
  ): Promise<{ communication_id: number; status_change: TransitionResult | null }> {
    const errors = validateConversation(a, now, { requireOutcome: true });
    if (errors.length === 0 && !(await this.repo.isActiveContactOfCompany(a.company_id, a.contact_id))) {
      errors.push({ field: 'contact_id', message: 'Choose a contact who works at this company.' });
    }
    if (errors.length > 0) throw new FieldValidationError(errors);
    const created = await this.repo.createCommunication({ ...a, actor_emp_id: actor.emp_id, next_follow_up: null }, tx);
    return { communication_id: created.communication_id, status_change: created.status_change };
  }

  private async log(
    companyId: number,
    leadId: number | null,
    input: ConversationInput,
    actor: SalesActor,
    now: Date,
    opts: { requireOutcome: boolean },
  ): Promise<LogResult> {
    const fields = {
      type: cleanText(input.type),
      contact_id: input.contact_id ?? null,
      communication_date: input.communication_date ?? now,
      what_discussed: cleanText(input.what_discussed),
      outcome: cleanText(input.outcome),
      call_status: cleanText(input.call_status),
      not_received_reason: cleanText(input.not_received_reason),
    };
    const errors: FieldError[] = validateConversation(fields, now, opts);

    // A call nobody picked up: the reason must be on the Admin's list. It is saved as the text of the entry.
    const notReceived = isNotReceivedCall(fields);
    let reasonLabel: string | null = null;
    if (notReceived && fields.not_received_reason && !errors.some((e) => e.field === 'not_received_reason')) {
      const hit = await this.repo.resolveCallNotReceivedReason(fields.not_received_reason);
      if (!hit) errors.push({ field: 'not_received_reason', message: 'Choose a reason from the list.' });
      else reasonLabel = hit.label;
    }

    if (fields.contact_id !== null && !errors.some((e) => e.field === 'contact_id')) {
      if (!(await this.repo.isActiveContactOfCompany(companyId, fields.contact_id))) {
        errors.push({ field: 'contact_id', message: 'Choose a contact who works at this company.' });
      }
    }

    const followUp = await this.checkFollowUp(input.next_follow_up, actor, now, errors);
    if (errors.length > 0) throw new FieldValidationError(errors);

    const created = await this.repo.createCommunication({
      company_id: companyId,
      lead_id: leadId,
      contact_id: fields.contact_id as number,
      type: fields.type as string,
      communication_date: fields.communication_date,
      what_discussed: notReceived
        ? `Call not received: ${reasonLabel}${fields.what_discussed ? `. ${fields.what_discussed}` : ''}`
        : (fields.what_discussed as string),
      outcome: notReceived ? 'No response' : fields.outcome,
      call_status: fields.type === 'Call' ? (notReceived ? 'Not received' : 'Received') : null,
      not_received_reason: notReceived ? reasonLabel : null,
      counts_as_conversation: !notReceived,
      actor_emp_id: actor.emp_id,
      next_follow_up: followUp,
    });
    const record = await this.repo.getCommunication(created.communication_id);
    if (!record) throw new Error('Conversation was saved but could not be read back');
    return {
      conversation: { ...record, editable: canEditEntry(record, actor, now) },
      status_change: created.status_change,
      follow_up_id: created.follow_up_id,
    };
  }

  private async checkFollowUp(
    fu: ConversationInput['next_follow_up'],
    actor: SalesActor,
    now: Date,
    errors: FieldError[],
  ): Promise<FollowUpInput | null> {
    if (!fu) return null;
    const before = errors.length;
    const at = fu.follow_up_on ?? null;
    const type = cleanText(fu.type);
    const assignee = resolveAssignee(fu.assigned_to, actor);
    if (!at || Number.isNaN(at.getTime())) errors.push({ field: 'next_follow_up.follow_up_on', message: MSG.required });
    else if (at.getTime() < now.getTime() - SLACK_MS) errors.push({ field: 'next_follow_up.follow_up_on', message: 'The follow-up must be today or later.' });
    if (!type) errors.push({ field: 'next_follow_up.type', message: MSG.required });
    else if (!(CONVERSATION_TYPES as readonly string[]).includes(type)) {
      errors.push({ field: 'next_follow_up.type', message: `Choose one of: ${CONVERSATION_TYPES.join(', ')}.` });
    }
    if (!(await this.repo.isEligibleAssignee(assignee))) {
      errors.push({ field: 'next_follow_up.assigned_to', message: 'Choose an active Sales user or Admin.' });
    }
    const purpose = cleanText(fu.purpose);
    if (purpose && purpose.length > 500) errors.push({ field: 'next_follow_up.purpose', message: 'Please keep it under 500 characters.' });
    if (errors.length > before) return null;
    return { follow_up_on: at as Date, type: type as string, assigned_to: assignee, purpose };
  }

  async editConversation(id: number, patch: ConversationInput, actor: SalesActor, now = new Date()): Promise<WithEditable<CommunicationRecord>> {
    const current = await this.repo.getCommunication(id);
    if (!current) throw new NotFoundSalesError('Conversation not found', 'CONVERSATION_NOT_FOUND', 'id');
    if (current.lead_id !== null) assertNotLocked(assertLeadFound(await this.repo.getLeadForWork(current.lead_id)));
    if (!canEditEntry(current, actor, now)) {
      throw new ForbiddenSalesError('This entry is locked. It can be edited for 24 hours by the person who logged it, or by the Admin.');
    }

    const merged = {
      type: patch.type !== undefined ? cleanText(patch.type) : current.type,
      contact_id: patch.contact_id !== undefined ? patch.contact_id : (current.contact?.person_id ?? null),
      communication_date: patch.communication_date ?? current.communication_date,
      what_discussed: patch.what_discussed !== undefined ? cleanText(patch.what_discussed) : current.what_discussed,
      outcome: patch.outcome !== undefined ? cleanText(patch.outcome) : current.outcome,
      call_status: patch.call_status !== undefined ? cleanText(patch.call_status) : current.call_status,
      not_received_reason: patch.not_received_reason !== undefined ? cleanText(patch.not_received_reason) : current.not_received_reason,
    };
    const errors = validateConversation(merged, now, { requireOutcome: false });
    const editedNotReceived = isNotReceivedCall(merged);
    let editedReasonLabel: string | null = null;
    if (editedNotReceived && merged.not_received_reason && !errors.some((e) => e.field === 'not_received_reason')) {
      const hit = await this.repo.resolveCallNotReceivedReason(merged.not_received_reason);
      if (!hit) errors.push({ field: 'not_received_reason', message: 'Choose a reason from the list.' });
      else editedReasonLabel = hit.label;
    }
    if (
      merged.contact_id !== null &&
      merged.contact_id !== (current.contact?.person_id ?? null) &&
      current.company_id !== null &&
      !(await this.repo.isActiveContactOfCompany(current.company_id, merged.contact_id))
    ) {
      errors.push({ field: 'contact_id', message: 'Choose a contact who works at this company.' });
    }
    if (errors.length > 0) throw new FieldValidationError(errors);

    await this.repo.updateCommunication(
      id,
      {
        type: merged.type as string,
        contact_id: merged.contact_id as number,
        communication_date: merged.communication_date,
        what_discussed: editedNotReceived ? `Call not received: ${editedReasonLabel}` : (merged.what_discussed as string),
        outcome: editedNotReceived ? 'No response' : merged.outcome,
        call_status: merged.type === 'Call' ? (editedNotReceived ? 'Not received' : 'Received') : null,
        not_received_reason: editedNotReceived ? editedReasonLabel : null,
      },
      actor.emp_id,
    );
    const updated = await this.repo.getCommunication(id);
    return { ...(updated as CommunicationRecord), editable: canEditEntry(updated as CommunicationRecord, actor, now) };
  }

  async listLeadConversations(leadId: number, page: number, limit: number, actor: SalesActor, now = new Date()) {
    assertLeadFound(await this.repo.getLeadForWork(leadId));
    return this.withEditable(await this.repo.listCommunications({ lead_id: leadId, page, limit }), actor, now);
  }

  async listCompanyCommunications(companyId: number, page: number, limit: number, actor: SalesActor, now = new Date()) {
    if (!(await this.repo.getCompanyForLog(companyId))) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    return this.withEditable(await this.repo.listCommunications({ company_id: companyId, page, limit }), actor, now);
  }

  private withEditable(p: Paged<CommunicationRecord>, actor: SalesActor, now: Date): Paged<WithEditable<CommunicationRecord>> {
    return { ...p, items: p.items.map((c) => ({ ...c, editable: canEditEntry(c, actor, now) })) };
  }

  // -------------------------------------------------------------- notes ----

  async addNote(leadId: number, input: { note_type?: string | null; note?: string | null; is_pinned?: boolean }, actor: SalesActor, now = new Date()) {
    const lead = assertLeadFound(await this.repo.getLeadForWork(leadId));
    assertCanWork(lead, actor);
    assertNotLocked(lead);
    return this.addNoteTo(lead, input, actor, now);
  }

  private async addNoteTo(
    lead: LeadWorkContext,
    input: { note_type?: string | null; note?: string | null; is_pinned?: boolean },
    actor: SalesActor,
    now: Date,
  ): Promise<WithEditable<NoteRecord>> {
    const fields = { note_type: cleanText(input.note_type), note: cleanText(input.note) };
    const errors = validateNote(fields);
    if (errors.length > 0) throw new FieldValidationError(errors);
    const note = await this.repo.createNote({
      lead_id: lead.lead_id,
      company_id: lead.company_id,
      note_type: fields.note_type as string,
      note: fields.note as string,
      is_pinned: input.is_pinned === true,
      actor_emp_id: actor.emp_id,
    });
    return { ...note, editable: canEditEntry({ created_by: note.created_by_id, created_at: note.created_at }, actor, now) };
  }

  async editNote(noteId: number, patch: { note_type?: string | null; note?: string | null; is_pinned?: boolean }, actor: SalesActor, now = new Date()) {
    const current = await this.repo.getNote(noteId);
    if (!current) throw new NotFoundSalesError('Note not found', 'NOTE_NOT_FOUND', 'id');
    const lead = assertLeadFound(await this.repo.getLeadForWork(current.lead_id));
    assertNotLocked(lead);

    const textChange = patch.note !== undefined || patch.note_type !== undefined;
    if (textChange) {
      if (current.note_type === 'Win' || current.note_type === 'Lost') {
        throw new ForbiddenSalesError('Win and Lost notes are made by the system and cannot be edited.');
      }
      if (!canEditEntry({ created_by: current.created_by_id, created_at: current.created_at }, actor, now)) {
        throw new ForbiddenSalesError('This note is locked. It can be edited for 24 hours by its author, or by the Admin.');
      }
      const errors = validateNote({
        note_type: patch.note_type !== undefined ? cleanText(patch.note_type) : current.note_type,
        note: patch.note !== undefined ? cleanText(patch.note) : current.note,
      });
      if (errors.length > 0) throw new FieldValidationError(errors);
    }
    if (patch.is_pinned !== undefined) assertCanWork(lead, actor);

    const updated = await this.repo.updateNote(
      noteId,
      {
        ...(patch.note_type !== undefined ? { note_type: cleanText(patch.note_type) as string } : {}),
        ...(patch.note !== undefined ? { note: cleanText(patch.note) as string } : {}),
        ...(patch.is_pinned !== undefined ? { is_pinned: patch.is_pinned } : {}),
      },
      actor.emp_id,
    );
    return { ...updated, editable: canEditEntry({ created_by: updated.created_by_id, created_at: updated.created_at }, actor, now) };
  }

  async listNotes(leadId: number, actor: SalesActor, now = new Date()) {
    assertLeadFound(await this.repo.getLeadForWork(leadId));
    const notes = await this.repo.listNotes(leadId);
    return notes.map((n) => ({ ...n, editable: canEditEntry({ created_by: n.created_by_id, created_at: n.created_at }, actor, now) }));
  }

  // ----------------------------------------------------- timeline / history ----

  async timeline(leadId: number, page: number, limit: number): Promise<Paged<TimelineEntry>> {
    assertLeadFound(await this.repo.getLeadForWork(leadId));
    return this.repo.timeline(leadId, page, limit);
  }

  async leadHistory(leadId: number, page: number, limit: number): Promise<Paged<HistoryEntry>> {
    assertLeadFound(await this.repo.getLeadForWork(leadId));
    return this.repo.history('LEAD', leadId, page, limit);
  }

  async companyHistory(companyId: number, page: number, limit: number): Promise<Paged<HistoryEntry>> {
    if (!(await this.repo.getCompanyForLog(companyId))) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    return this.repo.history('COMPANY', companyId, page, limit);
  }
}
