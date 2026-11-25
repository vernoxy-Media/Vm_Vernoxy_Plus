import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  HistoryCommitCounts,
  HistoryCommitData,
  ImportedHistoryIds,
  SalesImportHistoryRepositoryPort,
} from '../../application/ports/sales-import-history.repository.port';
import { nameKey } from '../../domain/services/sales-normalization.service';
import { WriteCtx, applyLeadOutcome, insertCommunication, insertFollowUp, insertNote, logFor } from './prisma-import-writers';

type Tx = Prisma.TransactionClient;

const TX = { timeout: 60_000, maxWait: 10_000 };
const OPEN_FOLLOW_UPS = ['Pending', 'Overdue'];
const json = (v: Record<string, unknown>) => v as Prisma.InputJsonValue;

/**
 * Writes what the extra sheets of the bulk import describe, in the same tables and with the same History entries
 * as the Log Conversation, Schedule Follow-up, Add Note, Mark as Lost, On Hold and Win (convert to client) actions.
 * Notifications and reminder jobs are not triggered for finished history. Every record is tagged in History
 * (event IMPORTED + batch id) so the undo can find it again without a schema change.
 */
@Injectable()
export class PrismaSalesImportHistoryRepository implements SalesImportHistoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async commitCompany(d: HistoryCommitData): Promise<HistoryCommitCounts> {
    return this.prisma.$transaction(async (tx) => {
      const { plan, actor_emp_id: actor, company_id: companyId, lead_id: leadId, batch_id: batchId } = d;
      const c: WriteCtx = { tx, actor, batchId, companyId };
      const counts: HistoryCommitCounts = { contacts: 0, interactions: 0, follow_ups: 0, notes: 0, won: false };

      // ---- contacts: the primary one was saved with the company; the others are added now.
      const links = await tx.company_persons.findMany({ where: { company_id: companyId, deleted_at: null }, select: { person_id: true, persons: { select: { name: true } } } });
      const personOf = new Map<string, number>(links.map((l) => [nameKey(l.persons.name), l.person_id]));
      for (const ct of plan.contacts) {
        if (personOf.has(nameKey(ct.name))) continue;
        const p = await tx.persons.create({ data: { name: ct.name, mobile: ct.mobile, email: ct.email, created_by: actor }, select: { person_id: true } });
        await tx.company_persons.create({ data: { company_id: companyId, person_id: p.person_id, designation: ct.designation, is_primary: false, created_by: actor } });
        personOf.set(nameKey(ct.name), p.person_id);
        counts.contacts++;
      }
      const personId = (name: string): number => {
        const id = personOf.get(nameKey(name));
        if (id === undefined) throw new Error(`The contact "${name}" was not found for this company.`);
        return id;
      };
      const where: 'LEAD' | 'COMPANY' = leadId !== null ? 'LEAD' : 'COMPANY';
      const whereId = leadId ?? companyId;

      // ---- interactions
      for (const i of plan.interactions) {
        const notReceived = i.type === 'Call' && i.call_status === 'Not received';
        const what = notReceived ? `Call not received: ${i.not_received_reason ?? ''}${i.what_discussed ? `. ${i.what_discussed}` : ''}` : (i.what_discussed as string);
        const id = await insertCommunication(c, leadId, {
          type: i.type, at: i.at, contact_id: personId(i.contact_name), contact_name: i.contact_name, what, outcome: notReceived ? null : i.outcome,
          call_status: i.call_status, reason: i.not_received_reason, seconds: i.call_duration_seconds, by: i.done_by_id ?? actor,
        });
        await logFor(c, where, whereId, 'CONVERSATION_LOGGED', notReceived ? `Call not received (${i.contact_name})` : `${i.type} logged with ${i.contact_name}`,
          { communication_id: id, type: i.type, outcome: i.outcome, call_status: i.call_status, imported: true }, i.at);
        counts.interactions++;
      }

      // ---- follow-ups
      for (const f of plan.follow_ups) {
        await insertFollowUp(c, leadId, { person_id: personId(f.contact_name), name: f.contact_name }, f);
        counts.follow_ups++;
      }

      // ---- notes (they belong to the lead)
      if (leadId !== null) {
        for (const n of plan.notes) {
          await insertNote(c, leadId, { note_type: n.note_type, note: n.note, is_pinned: n.is_pinned, created_by: n.created_by_id ?? actor, created_on: n.created_on });
          counts.notes++;
        }
      }

      // ---- the lead: Date Added and the final status, last, as the screens do (a status change closes open work)
      if (leadId !== null && plan.lead) counts.won = await applyLeadOutcome(c, leadId, plan.lead, plan.won);
      return counts;
    }, TX);
  }

  async discardCompany(d: { company_id: number; lead_id: number | null; actor_emp_id: number }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const by = d.actor_emp_id;
      if (d.lead_id !== null) await tx.leads.updateMany({ where: { lead_id: d.lead_id, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      const links = await tx.company_persons.findMany({ where: { company_id: d.company_id, deleted_at: null }, select: { person_id: true } });
      await tx.company_persons.updateMany({ where: { company_id: d.company_id, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      if (links.length > 0) await tx.persons.updateMany({ where: { person_id: { in: links.map((l) => l.person_id) }, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      await tx.companies.updateMany({ where: { company_id: d.company_id, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
    }, TX);
  }

  async listImported(batchId: number): Promise<ImportedHistoryIds> {
    const rows = await this.prisma.activity_logs.findMany({
      where: { event: 'IMPORTED', entity_type: { in: ['COMMUNICATION', 'FOLLOW_UP', 'NOTE', 'CLIENT', 'LEAD'] }, details: { path: ['batch_id'], equals: batchId } },
      select: { entity_type: true, entity_id: true },
    });
    const ids = (t: string) => rows.filter((r) => r.entity_type === t).map((r) => r.entity_id);
    return { communications: ids('COMMUNICATION'), follow_ups: ids('FOLLOW_UP'), notes: ids('NOTE'), clients: ids('CLIENT'), leads: ids('LEAD') };
  }

  async undo(d: { batch_id: number; company_ids: number[]; actor_emp_id: number }): Promise<{ conversations: number; follow_ups: number; notes: number; clients: number }> {
    const ids = await this.listImported(d.batch_id);
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const by = d.actor_emp_id;
      const del = { deleted_at: now };
      const followUps = await tx.crm_follow_ups.updateMany({ where: { deleted_at: null, OR: [{ follow_up_id: { in: ids.follow_ups } }, { company_id: { in: d.company_ids } }] }, data: del });
      const comms = await tx.crm_communications.updateMany({ where: { deleted_at: null, OR: [{ communication_id: { in: ids.communications } }, { company_id: { in: d.company_ids } }] }, data: del });
      // Notes include the system Lost / Win notes written for the imported leads.
      const notes = await tx.crm_lead_notes.updateMany({ where: { deleted_at: null, company_id: { in: d.company_ids } }, data: del });
      const clients = await tx.clients.updateMany({ where: { client_id: { in: ids.clients }, deleted_at: null }, data: { deleted_at: now, deleted_by: by } });
      if (ids.clients.length > 0) await tx.companies.updateMany({ where: { company_id: { in: d.company_ids }, is_client: true }, data: { is_client: false, client_code: null, updated_by: by } });
      return { conversations: comms.count, follow_ups: followUps.count, notes: notes.count, clients: clients.count };
    }, TX);
  }
}
