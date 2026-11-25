import { Prisma } from '@prisma/client';
import { PlannedFollowUp, PlannedLead, PlannedWon } from '../../domain/services/import-history.service';

/**
 * Writing helpers shared by the bulk imports (companies with extra sheets, Lead Pipeline, Follow-ups). They write
 * the same tables and History entries as the Log Conversation, Schedule Follow-up, On Hold, Mark as Lost and Win
 * actions of the screens. Every record is tagged in History (event IMPORTED + batch id) so an undo can find it again
 * without a schema change.
 */
export type Tx = Prisma.TransactionClient;

export interface WriteCtx {
  tx: Tx;
  actor: number;
  batchId: number;
  companyId: number;
}

const OPEN_FOLLOW_UPS = ['Pending', 'Overdue'];
const json = (v: Record<string, unknown>) => v as Prisma.InputJsonValue;

export async function tagImported(c: WriteCtx, type: string, id: number, summary: string, extra: Record<string, unknown> = {}, at?: Date): Promise<void> {
  await c.tx.activity_logs.create({
    data: { entity_type: type, entity_id: id, event: 'IMPORTED', summary, details: json({ batch_id: c.batchId, company_id: c.companyId, ...extra }), performed_by: c.actor, ...(at ? { performed_at: at } : {}) },
  });
}

export async function logFor(c: WriteCtx, entity: 'LEAD' | 'COMPANY', id: number, event: string, summary: string, details: Record<string, unknown>, at?: Date): Promise<void> {
  await c.tx.activity_logs.create({
    data: { entity_type: entity, entity_id: id, event, summary, details: json({ ...details, batch_id: c.batchId }), performed_by: c.actor, ...(at ? { performed_at: at } : {}) },
  });
}

export interface CommunicationData {
  type: string;
  at: Date;
  contact_id: number;
  contact_name: string;
  what: string;
  outcome: string | null;
  call_status: string | null;
  reason: string | null;
  seconds: number | null;
  by: number;
}

export async function insertCommunication(c: WriteCtx, leadId: number | null, d: CommunicationData): Promise<number> {
  const row = await c.tx.crm_communications.create({
    data: {
      company_id: c.companyId, lead_id: leadId, contact_id: d.contact_id, contact_person_name: d.contact_name,
      type: d.type, communication_date: d.at, what_discussed: d.what, outcome: d.outcome,
      call_status: d.call_status, not_received_reason: d.reason, call_duration_seconds: d.seconds, created_by: d.by, created_at: d.at,
    },
    select: { communication_id: true },
  });
  await tagImported(c, 'COMMUNICATION', row.communication_id, `${d.type} imported`, {}, d.at);
  return row.communication_id;
}

/**
 * One follow-up with the History the screens write. A completed follow-up also gets the conversation that completing
 * it logs. No reminder or calendar work is started for finished history; a follow-up that is already overdue is
 * marked as notified so nobody is messaged about it.
 */
export async function insertFollowUp(
  c: WriteCtx,
  leadId: number | null,
  contact: { person_id: number; name: string },
  f: Omit<PlannedFollowUp, 'row' | 'contact_name'>,
): Promise<{ follow_up_id: number; communication_id: number | null }> {
  const now = new Date();
  const where: 'LEAD' | 'COMPANY' = leadId !== null ? 'LEAD' : 'COMPANY';
  const whereId = leadId ?? c.companyId;
  let communicationId: number | null = null;
  if (f.status === 'Completed') {
    communicationId = await insertCommunication(c, leadId, {
      type: f.type, at: f.done_on as Date, contact_id: contact.person_id, contact_name: contact.name, what: f.what_happened as string,
      outcome: f.outcome, call_status: f.type === 'Call' ? 'Received' : null, reason: null, seconds: null, by: f.assigned_to_id,
    });
  }
  const row = await c.tx.crm_follow_ups.create({
    data: {
      company_id: c.companyId, lead_id: leadId, contact_id: contact.person_id, contact_person_name: contact.name,
      follow_up_on: f.follow_up_on, type: f.type, assigned_to: f.assigned_to_id, purpose: f.purpose, status: f.status,
      done_on: f.status === 'Completed' ? f.done_on : null, outcome: f.status === 'Completed' ? f.outcome : null,
      what_happened: f.status === 'Completed' ? f.what_happened : null, reason: f.status === 'Cancelled' ? f.reason : null,
      completed_communication_id: communicationId, created_by: c.actor,
      ...(f.status === 'Overdue' ? { overdue_notified_at: now, reminder_sent_at: now } : {}),
      ...(f.status === 'Cancelled' ? { updated_at: now } : {}),
    },
    select: { follow_up_id: true },
  });
  await tagImported(c, 'FOLLOW_UP', row.follow_up_id, `${f.type} follow-up imported`, { status: f.status });
  await logFor(c, where, whereId, 'FOLLOW_UP_SCHEDULED', `${f.type} follow-up scheduled`, { follow_up_id: row.follow_up_id, follow_up_on: f.follow_up_on.toISOString(), assigned_to: f.assigned_to_id, imported: true });
  if (f.status === 'Completed') {
    await logFor(c, where, whereId, 'FOLLOW_UP_COMPLETED', `${f.type} follow-up completed`, { follow_up_id: row.follow_up_id, outcome: f.outcome, communication_id: communicationId, imported: true }, f.done_on as Date);
  }
  return { follow_up_id: row.follow_up_id, communication_id: communicationId };
}

export async function insertNote(c: WriteCtx, leadId: number, n: { note_type: string; note: string; is_pinned: boolean; created_by: number; created_on: Date | null }): Promise<number> {
  const row = await c.tx.crm_lead_notes.create({
    data: { lead_id: leadId, company_id: c.companyId, note_type: n.note_type, note: n.note, is_pinned: n.is_pinned, created_by: n.created_by, ...(n.created_on ? { created_at: n.created_on } : {}) },
    select: { note_id: true },
  });
  await tagImported(c, 'NOTE', row.note_id, `${n.note_type} note imported`);
  await logFor(c, 'LEAD', leadId, 'NOTE_ADDED', `${n.note_type} note added`, { note_id: row.note_id, note_type: n.note_type, imported: true });
  return row.note_id;
}

/**
 * Sets the status the file asks for on a lead that was just created as New, the way the screens do: On Hold keeps its
 * reason and date, Lost keeps its reason, note and the system Lost note, Converted creates the client with its Win note.
 * Returns true when a client was created.
 */
export async function applyLeadOutcome(c: WriteCtx, leadId: number, lead: PlannedLead, won: PlannedWon | null): Promise<boolean> {
  const { tx, actor } = c;
  const now = new Date();
  if (lead.date_added) await tx.leads.update({ where: { lead_id: leadId }, data: { created_at: lead.date_added } });
  // The stage the import gave the lead is kept in History, so an undo can tell later changes from the import's own.
  await tagImported(c, 'LEAD', leadId, `Lead imported as ${lead.stage}`, { stage: lead.stage });
  if (lead.stage === 'New') return false;

  const from = 'New';
  const data: Prisma.leadsUncheckedUpdateInput = { lead_stage: lead.stage, updated_by: actor };
  if (lead.stage === 'On Hold') Object.assign(data, { on_hold_reason: lead.on_hold_reason, on_hold_follow_up_date: lead.on_hold_date });
  if (lead.stage === 'Lost') {
    const reason = await tx.master_lookup.findFirst({ where: { lookup_type: 'lost_reason', deleted_at: null, is_active: true, label: { equals: lead.lost_reason as string, mode: 'insensitive' } }, select: { lookup_id: true, label: true } });
    Object.assign(data, { lost_reason: reason?.label ?? lead.lost_reason, lost_reason_id: reason?.lookup_id ?? null, lost_note: lead.lost_note, closed_at: now });
  }
  if (lead.stage === 'Converted' && won) Object.assign(data, { won_on: won.won_on, win_note: won.win_note, closed_at: won.won_on, on_hold_reason: null, on_hold_follow_up_date: null });
  await tx.leads.update({ where: { lead_id: leadId }, data });
  await logFor(c, 'LEAD', leadId, 'STATUS_CHANGED', `Status changed ${from} -> ${lead.stage}`, { from, to: lead.stage, action: 'import', imported: true });

  if (lead.stage === 'Lost') {
    await tx.crm_lead_notes.create({ data: { lead_id: leadId, company_id: c.companyId, note_type: 'Lost', note: lead.lost_note ? `${lead.lost_reason}: ${lead.lost_note}` : (lead.lost_reason as string), created_by: actor } });
  }
  let clientCreated = false;
  if (lead.stage === 'Converted' && won) {
    const lb = await tx.leads.findUniqueOrThrow({ where: { lead_id: leadId }, select: { lead_code: true, lead_by_id: true } });
    const client = await tx.clients.create({
      data: { company_id: c.companyId, converted_from_lead_id: leadId, won_on: won.won_on, win_note: won.win_note, project_revenue: won.project_revenue, owner_id: won.owner_id ?? lb.lead_by_id, created_by: actor },
      select: { client_id: true, client_code: true },
    });
    const code = client.client_code as string;
    await tx.leads.update({ where: { lead_id: leadId }, data: { converted_client_id: client.client_id } });
    await tx.companies.update({ where: { company_id: c.companyId }, data: { is_client: true, client_code: code, updated_by: actor } });
    await tx.crm_lead_notes.create({ data: { lead_id: leadId, company_id: c.companyId, note_type: 'Win', note: won.win_note, created_by: actor } });
    const info = { client_id: client.client_id, client_code: code, lead_code: lb.lead_code, won_on: won.won_on.toISOString().slice(0, 10), reused_existing_client: false, batch_id: c.batchId };
    await tx.activity_logs.createMany({
      data: [
        { entity_type: 'LEAD', entity_id: leadId, event: 'CONVERTED_TO_CLIENT', summary: `Won and converted to ${code}`, details: json(info), performed_by: actor },
        { entity_type: 'COMPANY', entity_id: c.companyId, event: 'CLIENT_CREATED', summary: `Became client ${code} (from ${lb.lead_code})`, details: json(info), performed_by: actor },
        { entity_type: 'CLIENT', entity_id: client.client_id, event: 'CREATED', summary: `Client ${code} created from ${lb.lead_code}`, details: json(info), performed_by: actor },
      ],
    });
    await tagImported(c, 'CLIENT', client.client_id, `Client ${code} imported`);
    clientCreated = true;
  }
  if (lead.stage === 'Lost' || lead.stage === 'Converted') {
    // A lead that ends Lost or Converted has no open follow-ups, as on the screens.
    await tx.crm_follow_ups.updateMany({ where: { lead_id: leadId, deleted_at: null, status: { in: OPEN_FOLLOW_UPS } }, data: { status: 'Cancelled', reason: lead.stage === 'Lost' ? 'Lead marked as Lost' : 'Lead converted to client', updated_at: now } });
  }
  return clientCreated;
}
