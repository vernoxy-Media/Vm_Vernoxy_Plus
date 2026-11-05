import { FollowUpStatus, FollowUpTab } from '../../domain/services/follow-up.service';

export interface FollowUpRecord {
  follow_up_id: number;
  /** Raw status as stored; use effectiveStatus() for what the user sees. */
  status: string;
  company: { company_id: number; company_code: string | null; name: string; city: string | null };
  lead: { lead_id: number; lead_code: string | null; stage: string; lead_by_id: number | null } | null;
  contact: { person_id: number; name: string } | null;
  follow_up_on: Date;
  type: string;
  purpose: string | null;
  assigned_to: { emp_id: number; name: string };
  created_by: number | null;
  created_at: Date;
  rescheduled_count: number;
  done_on: Date | null;
  outcome: string | null;
  what_happened: string | null;
  reason: string | null;
  completed_communication_id: number | null;
  calendar_event_id: number | null;
}

export interface FollowUpListParams {
  tab: FollowUpTab;
  /** A Sales user sees follow-ups assigned to them or on leads they own; the Admin sees all. */
  scope_emp_id?: number;
  assigned_to?: number;
  type?: string[];
  city?: string[];
  industry_ids?: number[];
  lead_by_id?: number;
  date_from?: Date;
  date_to?: Date;
  q?: string;
  page: number;
  limit: number;
  now: Date;
}

export type FollowUpTabCounts = Record<FollowUpTab, number>;

export interface FollowUpList {
  items: FollowUpRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  tab_counts: FollowUpTabCounts;
}

export interface CreateFollowUpData {
  company_id: number;
  lead_id: number | null;
  contact_id: number;
  follow_up_on: Date;
  type: string;
  assigned_to: number;
  purpose: string | null;
  actor_emp_id: number;
}

/** What the background job needs to know about a follow-up it just claimed. */
export interface ClaimedFollowUp {
  follow_up_id: number;
  assigned_to: number;
  follow_up_on: Date;
  type: string;
  company_name: string;
  contact_name: string | null;
  lead_id: number | null;
}

export interface SummaryRecipient {
  emp_id: number;
  name: string;
}

export interface CalendarCandidate {
  follow_up_id: number;
  status: string;
  calendar_event_id: number | null;
  assigned_to: number;
  follow_up_on: Date;
  type: string;
  purpose: string | null;
  company_name: string;
  contact_name: string | null;
}

export interface SalesFollowUpRepositoryPort {
  get(id: number): Promise<FollowUpRecord | null>;
  list(params: FollowUpListParams): Promise<FollowUpList>;
  /** Every follow-up of a lead, open ones first (the Follow-ups tab of Lead Details). */
  listForLead(leadId: number): Promise<FollowUpRecord[]>;
  create(data: CreateFollowUpData, tx?: unknown): Promise<{ follow_up_id: number }>;
  updateDetails(id: number, patch: { purpose?: string | null; contact_id?: number; assigned_to?: number }, actorEmpId: number, tx?: unknown): Promise<void>;
  /** Back to Pending with a new date; the old date goes to History. Throws InvalidTransitionError if it is no longer open. */
  reschedule(id: number, data: { follow_up_on: Date; reason: string }, actorEmpId: number, tx?: unknown): Promise<{ previous_on: Date; count: number }>;
  cancel(id: number, reason: string, actorEmpId: number, tx?: unknown): Promise<void>;
  complete(
    id: number,
    data: { done_on: Date; outcome: string; what_happened: string; communication_id: number },
    actorEmpId: number,
    tx?: unknown,
  ): Promise<void>;

  // ---- background job: each claim is atomic, so two servers never send the same message twice ----
  claimNewlyOverdue(now: Date): Promise<ClaimedFollowUp[]>;
  claimDueReminders(now: Date): Promise<ClaimedFollowUp[]>;
  listSummaryRecipients(): Promise<SummaryRecipient[]>;
  countForSummary(empId: number, now: Date): Promise<{ today: number; overdue: number }>;
  listAdminIds(): Promise<number[]>;
  employeeName(empId: number): Promise<string>;
  listNeedingCalendarEvent(limit: number): Promise<CalendarCandidate[]>;
  listCalendarCleanup(limit: number): Promise<CalendarCandidate[]>;
  setCalendarEvent(id: number, eventId: number | null): Promise<void>;
}

export const SALES_FOLLOW_UP_REPOSITORY_PORT_TOKEN = Symbol('SalesFollowUpRepositoryPort');

export type { FollowUpStatus };
