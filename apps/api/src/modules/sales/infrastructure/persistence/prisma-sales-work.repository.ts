import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CommunicationRecord,
  CreateCommunicationData,
  FollowUpInput,
  HistoryEntry,
  LeadWorkContext,
  NoteRecord,
  Paged,
  SalesWorkRepositoryPort,
  TimelineEntry,
  TransitionResult,
  UpdateCommunicationData,
} from '../../application/ports/sales-work.repository.port';
import { LEAD_STATUSES, LeadStatus, OPEN_STATUSES } from '../../domain/entities/sales-lead';
import { InvalidTransitionError, OpenLeadExistsError } from '../../domain/errors/sales.errors';
import { QualificationFacts, statusAfterConversation } from '../../domain/services/lead-workflow.service';

type Tx = Prisma.TransactionClient;

const OPEN = [...OPEN_STATUSES];
const OPEN_FOLLOW_UPS = ['Pending', 'Overdue'];
const MAX_FETCH = 500;

const asStatus = (s: string | null): LeadStatus => ((LEAD_STATUSES as readonly string[]).includes(s ?? '') ? (s as LeadStatus) : 'New');
const paged = <T>(items: T[], total: number, page: number, limit: number): Paged<T> => ({
  items,
  total,
  page,
  limit,
  total_pages: Math.max(Math.ceil(total / limit), 1),
});
const person = (e: { emp_id: number; name: string } | null | undefined) => (e ? { emp_id: e.emp_id, name: e.name } : null);

const COMM_INCLUDE = {
  persons: { select: { person_id: true, name: true } },
  employees: { select: { emp_id: true, name: true } },
} satisfies Prisma.crm_communicationsInclude;

type CommRow = Prisma.crm_communicationsGetPayload<{ include: typeof COMM_INCLUDE }>;

const NOTE_INCLUDE = { employees: { select: { emp_id: true, name: true } } } satisfies Prisma.crm_lead_notesInclude;
type NoteRow = Prisma.crm_lead_notesGetPayload<{ include: typeof NOTE_INCLUDE }>;

@Injectable()
export class PrismaSalesWorkRepository implements SalesWorkRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Runs inside the caller's transaction when there is one (Complete Follow-up), otherwise opens its own. */
  private inTx<T>(outer: unknown, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return outer ? fn(outer as Tx) : this.prisma.$transaction(fn);
  }

  // ------------------------------------------------------------ context ----

  async getLeadForWork(leadId: number, outer?: unknown): Promise<LeadWorkContext | null> {
    const db = (outer as Tx | undefined) ?? this.prisma;
    const l = await db.leads.findFirst({
      where: { lead_id: leadId, deleted_at: null },
      select: {
        lead_id: true, lead_code: true, company_id: true, lead_stage: true, lead_by_id: true, service_fit: true, person_id: true,
        companies: { select: { name: true } },
      },
    });
    if (!l || l.company_id === null) return null;
    return {
      lead_id: l.lead_id,
      lead_code: l.lead_code,
      company_id: l.company_id,
      company_name: l.companies?.name ?? '',
      stage: asStatus(l.lead_stage),
      lead_by_id: l.lead_by_id,
      service_fit: l.service_fit,
      person_id: l.person_id,
    };
  }

  async getCompanyForLog(companyId: number) {
    const c = await this.prisma.companies.findFirst({ where: { company_id: companyId, deleted_at: null }, select: { company_id: true, name: true } });
    if (!c) return null;
    const open = await this.prisma.leads.findFirst({
      where: { company_id: companyId, deleted_at: null, lead_stage: { in: OPEN } },
      select: { lead_id: true },
    });
    return { company_id: c.company_id, name: c.name, open_lead: open ? await this.getLeadForWork(open.lead_id) : null };
  }

  async isActiveContactOfCompany(companyId: number, personId: number): Promise<boolean> {
    return (await this.prisma.company_persons.count({ where: { company_id: companyId, person_id: personId, is_active: true, deleted_at: null } })) > 0;
  }

  async getPrimaryContactPersonId(companyId: number): Promise<number | null> {
    const cp = await this.prisma.company_persons.findFirst({
      where: { company_id: companyId, is_primary: true, is_active: true, deleted_at: null },
      select: { person_id: true },
    });
    return cp?.person_id ?? null;
  }

  async isEligibleAssignee(empId: number): Promise<boolean> {
    if (!Number.isInteger(empId) || empId <= 0) return false;
    return (
      (await this.prisma.employees.count({
        where: {
          emp_id: empId,
          deleted_at: null,
          status: 'Active',
          OR: [
            { roles_employees_role_idToroles: { is_admin: true } },
            { departments_employees_dep_idTodepartments: { name: { startsWith: 'Sales', mode: 'insensitive' } } },
          ],
        },
      })) > 0
    );
  }

  // ------------------------------------------------------ conversations ----

  async createCommunication(d: CreateCommunicationData, outer?: unknown) {
    return this.inTx(outer, async (tx) => {
      const contact = await tx.persons.findUnique({ where: { person_id: d.contact_id }, select: { name: true } });
      const comm = await tx.crm_communications.create({
        data: {
          company_id: d.company_id,
          lead_id: d.lead_id,
          contact_id: d.contact_id,
          contact_person_name: contact?.name ?? null,
          type: d.type,
          communication_date: d.communication_date,
          what_discussed: d.what_discussed,
          outcome: d.outcome,
          created_by: d.actor_emp_id,
        },
        select: { communication_id: true },
      });

      let statusChange: TransitionResult | null = null;
      if (d.lead_id !== null) {
        // "First conversation: status moves from New to Contacted automatically."
        const lead = await tx.leads.findUnique({ where: { lead_id: d.lead_id }, select: { lead_stage: true } });
        const from = asStatus(lead?.lead_stage ?? null);
        const to = statusAfterConversation(from);
        if (to !== from) {
          const moved = await tx.leads.updateMany({ where: { lead_id: d.lead_id, lead_stage: from }, data: { lead_stage: to, updated_by: d.actor_emp_id } });
          if (moved.count === 1) {
            statusChange = { from, to };
            await this.log(tx, 'LEAD', d.lead_id, 'STATUS_CHANGED', `Status changed ${from} -> ${to}`, d.actor_emp_id, {
              from, to, action: 'first_conversation', communication_id: comm.communication_id,
            });
          }
        }
      }

      await this.log(
        tx,
        d.lead_id !== null ? 'LEAD' : 'COMPANY',
        d.lead_id ?? d.company_id,
        'CONVERSATION_LOGGED',
        `${d.type} logged${contact ? ` with ${contact.name}` : ''}`,
        d.actor_emp_id,
        { communication_id: comm.communication_id, type: d.type, outcome: d.outcome },
      );

      let followUpId: number | null = null;
      if (d.next_follow_up) {
        followUpId = await this.insertFollowUp(tx, {
          company_id: d.company_id, lead_id: d.lead_id, contact_id: d.contact_id, contact_name: contact?.name ?? null,
          fu: d.next_follow_up, actor: d.actor_emp_id,
        });
      }
      return { communication_id: comm.communication_id, status_change: statusChange, follow_up_id: followUpId };
    });
  }

  private async insertFollowUp(
    tx: Tx,
    a: { company_id: number; lead_id: number | null; contact_id: number | null; contact_name: string | null; fu: FollowUpInput; actor: number },
  ): Promise<number> {
    const row = await tx.crm_follow_ups.create({
      data: {
        company_id: a.company_id,
        lead_id: a.lead_id,
        contact_id: a.contact_id,
        contact_person_name: a.contact_name,
        follow_up_on: a.fu.follow_up_on,
        type: a.fu.type,
        assigned_to: a.fu.assigned_to,
        purpose: a.fu.purpose,
        status: 'Pending',
        created_by: a.actor,
      },
      select: { follow_up_id: true },
    });
    await this.log(tx, a.lead_id !== null ? 'LEAD' : 'COMPANY', a.lead_id ?? a.company_id, 'FOLLOW_UP_SCHEDULED',
      `${a.fu.type} follow-up scheduled`, a.actor, { follow_up_id: row.follow_up_id, follow_up_on: a.fu.follow_up_on.toISOString(), assigned_to: a.fu.assigned_to });
    return row.follow_up_id;
  }

  private toComm(r: CommRow): CommunicationRecord {
    return {
      communication_id: r.communication_id,
      company_id: r.company_id,
      lead_id: r.lead_id,
      contact: r.persons ? { person_id: r.persons.person_id, name: r.persons.name } : r.contact_id ? { person_id: r.contact_id, name: r.contact_person_name ?? '' } : null,
      type: r.type,
      communication_date: r.communication_date,
      what_discussed: r.what_discussed,
      outcome: r.outcome,
      logged_by: person(r.employees),
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async getCommunication(id: number): Promise<CommunicationRecord | null> {
    const r = await this.prisma.crm_communications.findFirst({ where: { communication_id: id, deleted_at: null }, include: COMM_INCLUDE });
    return r ? this.toComm(r) : null;
  }

  async updateCommunication(id: number, patch: UpdateCommunicationData, actorEmpId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.crm_communications.findFirst({ where: { communication_id: id, deleted_at: null } });
      if (!before) return;
      const contact = patch.contact_id !== undefined ? await tx.persons.findUnique({ where: { person_id: patch.contact_id }, select: { name: true } }) : null;
      const data: Prisma.crm_communicationsUncheckedUpdateInput = {
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.contact_id !== undefined ? { contact_id: patch.contact_id, contact_person_name: contact?.name ?? before.contact_person_name } : {}),
        ...(patch.communication_date !== undefined ? { communication_date: patch.communication_date } : {}),
        ...(patch.what_discussed !== undefined ? { what_discussed: patch.what_discussed } : {}),
        ...(patch.outcome !== undefined ? { outcome: patch.outcome } : {}),
        updated_at: new Date(),
      };
      await tx.crm_communications.update({ where: { communication_id: id }, data });

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      const prev = before as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(patch)) {
        const old = prev[k] instanceof Date ? (prev[k] as Date).toISOString() : prev[k];
        const nv = v instanceof Date ? v.toISOString() : v;
        if ((old ?? null) !== (nv ?? null)) changes[k] = { from: old ?? null, to: nv ?? null };
      }
      if (Object.keys(changes).length > 0) {
        await this.log(tx, before.lead_id !== null ? 'LEAD' : 'COMPANY', before.lead_id ?? (before.company_id as number), 'CONVERSATION_EDITED',
          `${before.type} conversation edited (${Object.keys(changes).join(', ')})`, actorEmpId, { communication_id: id, changes });
      }
    });
  }

  async listCommunications(q: { lead_id?: number; company_id?: number; page: number; limit: number }): Promise<Paged<CommunicationRecord>> {
    const where: Prisma.crm_communicationsWhereInput = {
      deleted_at: null,
      ...(q.lead_id !== undefined ? { lead_id: q.lead_id } : {}),
      ...(q.company_id !== undefined ? { company_id: q.company_id } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.crm_communications.findMany({
        where, include: COMM_INCLUDE,
        orderBy: [{ communication_date: 'desc' }, { communication_id: 'desc' }],
        skip: (q.page - 1) * q.limit, take: q.limit,
      }),
      this.prisma.crm_communications.count({ where }),
    ]);
    return paged(rows.map((r) => this.toComm(r)), total, q.page, q.limit);
  }

  // -------------------------------------------------------------- notes ----

  private toNote(r: NoteRow): NoteRecord {
    return {
      note_id: r.note_id, lead_id: r.lead_id, note_type: r.note_type, note: r.note, is_pinned: r.is_pinned,
      created_by: person(r.employees), created_by_id: r.created_by, created_at: r.created_at, updated_at: r.updated_at,
    };
  }

  async createNote(d: { lead_id: number; company_id: number; note_type: string; note: string; is_pinned: boolean; actor_emp_id: number }): Promise<NoteRecord> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.crm_lead_notes.create({
        data: { lead_id: d.lead_id, company_id: d.company_id, note_type: d.note_type, note: d.note, is_pinned: d.is_pinned, created_by: d.actor_emp_id },
        include: NOTE_INCLUDE,
      });
      await this.log(tx, 'LEAD', d.lead_id, 'NOTE_ADDED', `${d.note_type} note added`, d.actor_emp_id, { note_id: row.note_id, note_type: d.note_type });
      return this.toNote(row);
    });
  }

  async getNote(noteId: number): Promise<NoteRecord | null> {
    const r = await this.prisma.crm_lead_notes.findFirst({ where: { note_id: noteId, deleted_at: null }, include: NOTE_INCLUDE });
    return r ? this.toNote(r) : null;
  }

  async updateNote(noteId: number, patch: { note_type?: string; note?: string; is_pinned?: boolean }, actorEmpId: number): Promise<NoteRecord> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.crm_lead_notes.findFirstOrThrow({ where: { note_id: noteId, deleted_at: null } });
      const row = await tx.crm_lead_notes.update({ where: { note_id: noteId }, data: { ...patch, updated_at: new Date() }, include: NOTE_INCLUDE });
      const pinOnly = patch.is_pinned !== undefined && patch.note === undefined && patch.note_type === undefined;
      await this.log(tx, 'LEAD', before.lead_id, pinOnly ? (patch.is_pinned ? 'NOTE_PINNED' : 'NOTE_UNPINNED') : 'NOTE_EDITED',
        pinOnly ? `Note ${patch.is_pinned ? 'pinned' : 'unpinned'}` : `${before.note_type} note edited`, actorEmpId,
        { note_id: noteId, ...(pinOnly ? {} : { changes: { note: { from: before.note, to: row.note }, note_type: { from: before.note_type, to: row.note_type } } }) });
      return this.toNote(row);
    });
  }

  async listNotes(leadId: number): Promise<NoteRecord[]> {
    const rows = await this.prisma.crm_lead_notes.findMany({
      where: { lead_id: leadId, deleted_at: null }, include: NOTE_INCLUDE,
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }, { note_id: 'desc' }],
    });
    return rows.map((r) => this.toNote(r));
  }

  // ----------------------------------------------------- status actions ----

  async getQualificationFacts(leadId: number, outer?: unknown): Promise<QualificationFacts> {
    const db = (outer as Tx | undefined) ?? this.prisma;
    const [lead, conversations, notes] = await Promise.all([
      db.leads.findUnique({ where: { lead_id: leadId }, select: { service_fit: true } }),
      db.crm_communications.count({ where: { lead_id: leadId, deleted_at: null } }),
      db.crm_lead_notes.findMany({ where: { lead_id: leadId, deleted_at: null }, distinct: ['note_type'], select: { note_type: true } }),
    ]);
    return {
      service_fit_chosen: !!lead?.service_fit && lead.service_fit.trim() !== '',
      conversation_count: conversations,
      note_types: new Set(notes.map((n) => n.note_type)),
    };
  }

  /** Moves a lead only if it is still in one of the expected statuses (guards against two people acting at once). */
  private async move(
    tx: Tx,
    leadId: number,
    expected: LeadStatus[],
    to: LeadStatus,
    extra: Prisma.leadsUncheckedUpdateManyInput,
    actor: number,
    action: string,
    details: Record<string, unknown> = {},
  ): Promise<TransitionResult> {
    const current = await tx.leads.findUnique({ where: { lead_id: leadId }, select: { lead_stage: true } });
    const from = asStatus(current?.lead_stage ?? null);
    const res = await tx.leads.updateMany({ where: { lead_id: leadId, lead_stage: { in: expected } }, data: { ...extra, lead_stage: to, updated_by: actor } });
    if (res.count !== 1) throw new InvalidTransitionError(`This lead is ${from} now; the action no longer applies.`);
    await this.log(tx, 'LEAD', leadId, 'STATUS_CHANGED', `Status changed ${from} -> ${to}`, actor, { from, to, action, ...details });
    return { from, to };
  }

  async qualify(d: { lead_id: number; service_fit: string | null; actor_emp_id: number }, outer?: unknown): Promise<TransitionResult> {
    return this.inTx(outer, (tx) =>
      this.move(tx, d.lead_id, ['Contacted'], 'Qualified', d.service_fit !== null ? { service_fit: d.service_fit } : {}, d.actor_emp_id, 'qualify'),
    );
  }

  async putOnHold(
    d: { lead_id: number; follow_up: FollowUpInput; reason: string | null; contact_id: number | null; actor_emp_id: number },
    outer?: unknown,
  ): Promise<TransitionResult> {
    return this.inTx(outer, async (tx) => {
      const lead = await tx.leads.findUniqueOrThrow({ where: { lead_id: d.lead_id }, select: { company_id: true } });
      const result = await this.move(tx, d.lead_id, ['Contacted', 'Qualified'], 'On Hold',
        { on_hold_reason: d.reason, on_hold_follow_up_date: d.follow_up.follow_up_on }, d.actor_emp_id, 'hold',
        { follow_up_on: d.follow_up.follow_up_on.toISOString(), reason: d.reason });
      const contact = d.contact_id ? await tx.persons.findUnique({ where: { person_id: d.contact_id }, select: { name: true } }) : null;
      await this.insertFollowUp(tx, { company_id: lead.company_id as number, lead_id: d.lead_id, contact_id: d.contact_id, contact_name: contact?.name ?? null, fu: d.follow_up, actor: d.actor_emp_id });
      return result;
    });
  }

  async resolveLostReason(label: string) {
    const hit = await this.prisma.master_lookup.findFirst({
      where: { lookup_type: 'lost_reason', deleted_at: null, is_active: true, label: { equals: label, mode: 'insensitive' } },
      select: { lookup_id: true, label: true },
    });
    return hit ? { label: hit.label, lookup_id: hit.lookup_id } : null;
  }

  async markLost(
    d: { lead_id: number; reason: string; reason_lookup_id: number | null; note: string | null; actor_emp_id: number },
    outer?: unknown,
  ): Promise<TransitionResult> {
    return this.inTx(outer, async (tx) => {
      const lead = await tx.leads.findUniqueOrThrow({ where: { lead_id: d.lead_id }, select: { company_id: true } });
      const now = new Date();
      const result = await this.move(tx, d.lead_id, ['New', 'Contacted', 'Qualified'], 'Lost',
        { lost_reason: d.reason, lost_reason_id: d.reason_lookup_id, lost_note: d.note, closed_at: now }, d.actor_emp_id, 'lost',
        { reason: d.reason, note: d.note });
      // The Lost note is made by the system and used in reports.
      await tx.crm_lead_notes.create({
        data: { lead_id: d.lead_id, company_id: lead.company_id, note_type: 'Lost', note: d.note ? `${d.reason}: ${d.note}` : d.reason, created_by: d.actor_emp_id },
      });
      // "When a lead becomes Lost, its pending follow-ups are cancelled with that reason."
      await tx.crm_follow_ups.updateMany({
        where: { lead_id: d.lead_id, deleted_at: null, status: { in: OPEN_FOLLOW_UPS } },
        data: { status: 'Cancelled', reason: 'Lead marked as Lost', updated_at: now },
      });
      return result;
    });
  }

  async getStatusBeforeHold(leadId: number): Promise<LeadStatus | null> {
    const row = await this.prisma.activity_logs.findFirst({
      where: { entity_type: 'LEAD', entity_id: leadId, event: 'STATUS_CHANGED', details: { path: ['to'], equals: 'On Hold' } },
      orderBy: { log_id: 'desc' },
      select: { details: true },
    });
    const from = (row?.details as { from?: string } | null)?.from ?? null;
    return from ? asStatus(from) : null;
  }

  async reopen(d: { lead_id: number; to: LeadStatus; actor_emp_id: number }): Promise<TransitionResult> {
    try {
      return await this.prisma.$transaction((tx) =>
        this.move(tx, d.lead_id, ['Lost', 'On Hold'], d.to,
          { lost_reason: null, lost_reason_id: null, lost_note: null, on_hold_reason: null, on_hold_follow_up_date: null, closed_at: null },
          d.actor_emp_id, 'reopen'),
      );
    } catch (err) {
      // The company got a newer open lead while this one was Lost: only one open lead is allowed.
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

  async changeLeadBy(d: { lead_id: number; new_lead_by_id: number; actor_emp_id: number }): Promise<{ previous: number | null }> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.leads.findUniqueOrThrow({ where: { lead_id: d.lead_id }, select: { lead_by_id: true } });
      // The database keeps owner_id in step with lead_by_id.
      await tx.leads.update({ where: { lead_id: d.lead_id }, data: { lead_by_id: d.new_lead_by_id, updated_by: d.actor_emp_id } });
      await this.log(tx, 'LEAD', d.lead_id, 'LEAD_BY_CHANGED', 'Lead By changed', d.actor_emp_id, { from: before.lead_by_id, to: d.new_lead_by_id });
      return { previous: before.lead_by_id };
    });
  }

  // ------------------------------------------------------------ reading ----

  async timeline(leadId: number, page: number, limit: number): Promise<Paged<TimelineEntry>> {
    const take = Math.min(page * limit, MAX_FETCH);
    const [followUps, comms, notes, logs, commTotal, noteTotal, logTotal] = await Promise.all([
      this.prisma.crm_follow_ups.findMany({
        where: { lead_id: leadId, deleted_at: null, status: { in: OPEN_FOLLOW_UPS } },
        orderBy: { follow_up_on: 'asc' },
        include: { employees_crm_follow_ups_assigned_toToemployees: { select: { emp_id: true, name: true } } },
      }),
      this.prisma.crm_communications.findMany({ where: { lead_id: leadId, deleted_at: null }, include: COMM_INCLUDE, orderBy: [{ communication_date: 'desc' }, { communication_id: 'desc' }], take }),
      this.prisma.crm_lead_notes.findMany({ where: { lead_id: leadId, deleted_at: null }, include: NOTE_INCLUDE, orderBy: [{ created_at: 'desc' }, { note_id: 'desc' }], take }),
      this.prisma.activity_logs.findMany({
        where: { entity_type: 'LEAD', entity_id: leadId, event: { in: ['STATUS_CHANGED', 'LEAD_BY_CHANGED', 'CREATED'] } },
        include: { employees: { select: { emp_id: true, name: true } } },
        orderBy: { log_id: 'desc' }, take,
      }),
      this.prisma.crm_communications.count({ where: { lead_id: leadId, deleted_at: null } }),
      this.prisma.crm_lead_notes.count({ where: { lead_id: leadId, deleted_at: null } }),
      this.prisma.activity_logs.count({ where: { entity_type: 'LEAD', entity_id: leadId, event: { in: ['STATUS_CHANGED', 'LEAD_BY_CHANGED', 'CREATED'] } } }),
    ]);

    const pending: TimelineEntry[] = followUps.map((f) => ({
      kind: 'follow_up', at: f.follow_up_on, title: `${f.type} follow-up${f.contact_person_name ? ` with ${f.contact_person_name}` : ''}`,
      body: f.purpose, by: person(f.employees_crm_follow_ups_assigned_toToemployees), pinned: false, ref_id: f.follow_up_id, meta: { status: f.status },
    }));
    const pinned: TimelineEntry[] = [];
    const rest: TimelineEntry[] = [];
    for (const c of comms) {
      const r = this.toComm(c);
      rest.push({ kind: 'conversation', at: r.communication_date, title: `${r.type}${r.contact ? ` with ${r.contact.name}` : ''}`, body: r.what_discussed, by: r.logged_by, pinned: false, ref_id: r.communication_id, meta: { outcome: r.outcome } });
    }
    for (const n of notes) {
      const r = this.toNote(n);
      (r.is_pinned ? pinned : rest).push({ kind: 'note', at: r.created_at, title: `Note - ${r.note_type}`, body: r.note, by: r.created_by, pinned: r.is_pinned, ref_id: r.note_id, meta: { note_type: r.note_type } });
    }
    for (const l of logs) {
      rest.push({
        kind: l.event === 'STATUS_CHANGED' ? 'status_change' : 'event', at: l.performed_at, title: l.summary, body: null,
        by: person(l.employees), pinned: false, ref_id: Number(l.log_id), meta: (l.details as Record<string, unknown>) ?? {},
      });
    }
    const byNewest = (a: TimelineEntry, b: TimelineEntry) => b.at.getTime() - a.at.getTime();
    pinned.sort(byNewest);
    rest.sort(byNewest);

    // Pending follow-ups first, pinned notes next, then everything else, newest first.
    const all = [...pending, ...pinned, ...rest];
    const total = pending.length + noteTotal + commTotal + logTotal;
    const start = (page - 1) * limit;
    return paged(all.slice(start, start + limit), total, page, limit);
  }

  async history(entity: 'LEAD' | 'COMPANY', entityId: number, page: number, limit: number): Promise<Paged<HistoryEntry>> {
    const where: Prisma.activity_logsWhereInput = { entity_type: entity, entity_id: entityId };
    const [rows, total] = await Promise.all([
      this.prisma.activity_logs.findMany({
        where, include: { employees: { select: { emp_id: true, name: true } } },
        orderBy: [{ performed_at: 'desc' }, { log_id: 'desc' }], skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.activity_logs.count({ where }),
    ]);
    return paged(rows.map((r) => ({
      log_id: Number(r.log_id), event: r.event, summary: r.summary, details: r.details, performed_at: r.performed_at, performed_by: person(r.employees),
    })), total, page, limit);
  }

  private async log(tx: Tx, entity: 'LEAD' | 'COMPANY', id: number, event: string, summary: string, actor: number, details: Record<string, unknown>) {
    await tx.activity_logs.create({
      data: { entity_type: entity, entity_id: id, event, summary, details: details as Prisma.InputJsonValue, performed_by: actor },
    });
  }
}
