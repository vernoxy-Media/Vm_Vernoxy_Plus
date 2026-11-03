import { LeadStatus } from '../entities/sales-lead';

/**
 * Lead status moves only through these actions (BFD section 2: "the status changes only
 * through the buttons"; nobody picks it from a list).
 *
 *   Qualify Lead        Contacted                      -> Qualified   (checklist must pass)
 *   Put On Hold         Contacted, Qualified           -> On Hold     (a check-back follow-up is needed)
 *   Mark as Lost        New, Contacted, Qualified      -> Lost        (a reason is needed)
 *   Reopen              Lost -> Contacted, On Hold -> the status it had before
 *   First conversation  New                            -> Contacted   (automatic)
 */
export type StatusAction = 'qualify' | 'hold' | 'lost' | 'reopen';

const ALLOWED_FROM: Record<StatusAction, readonly LeadStatus[]> = {
  qualify: ['Contacted'],
  hold: ['Contacted', 'Qualified'],
  lost: ['New', 'Contacted', 'Qualified'],
  reopen: ['Lost', 'On Hold'],
};

export function canApplyAction(action: StatusAction, from: LeadStatus): boolean {
  return ALLOWED_FROM[action].includes(from);
}

export function allowedActions(from: LeadStatus): StatusAction[] {
  return (Object.keys(ALLOWED_FROM) as StatusAction[]).filter((a) => canApplyAction(a, from));
}

/** Target status of a Reopen. `previous` is the status the lead had before it was put On Hold. */
export function reopenTarget(from: LeadStatus, previous: LeadStatus | null): LeadStatus {
  if (from === 'Lost') return 'Contacted';
  return previous && previous !== 'On Hold' && previous !== 'Lost' && previous !== 'Converted' ? previous : 'Contacted';
}

/** The first conversation on a New lead makes it Contacted. */
export function statusAfterConversation(current: LeadStatus): LeadStatus {
  return current === 'New' ? 'Contacted' : current;
}

// ------------------------------------------------------- qualification ----

export interface QualificationFacts {
  service_fit_chosen: boolean;
  conversation_count: number;
  note_types: ReadonlySet<string>;
}

export interface ChecklistItem {
  key: 'service_fit' | 'conversation' | 'requirement' | 'budget' | 'readiness';
  label: string;
  done: boolean;
}

/** BFD section 8/9: Service Fit, a conversation, and Requirement, Budget and Readiness notes. */
export function evaluateQualification(f: QualificationFacts): { items: ChecklistItem[]; complete: boolean } {
  const items: ChecklistItem[] = [
    { key: 'service_fit', label: 'Service Fit is chosen', done: f.service_fit_chosen },
    { key: 'conversation', label: 'At least one conversation is logged', done: f.conversation_count > 0 },
    { key: 'requirement', label: 'A Requirement note is written', done: f.note_types.has('Requirement') },
    { key: 'budget', label: 'A Budget note is written', done: f.note_types.has('Budget') },
    { key: 'readiness', label: 'A Readiness note is written', done: f.note_types.has('Readiness') },
  ];
  return { items, complete: items.every((i) => i.done) };
}

// ------------------------------------------------------------- editing ----

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** "The person who logged it can edit it for 24 hours. After that it is locked. Admin can edit any entry." */
export function canEditEntry(
  entry: { created_by: number | null; created_at: Date },
  actor: { emp_id: number; is_admin: boolean },
  now: Date,
): boolean {
  if (actor.is_admin) return true;
  return entry.created_by === actor.emp_id && now.getTime() - entry.created_at.getTime() <= EDIT_WINDOW_MS;
}

/** Lead By user or Admin may work on a lead (BFD section 1, "Sales User"). */
export function canWorkOnLead(lead: { lead_by_id: number | null }, actor: { emp_id: number; is_admin: boolean }): boolean {
  return actor.is_admin || lead.lead_by_id === actor.emp_id;
}

export const LOST_REASON_OTHER = 'other';
