import { LeadStatus } from '../../domain/entities/sales-lead';
import { QualificationFacts } from '../../domain/services/lead-workflow.service';

/** What the use cases need to know about a lead before they act on it. */
export interface LeadWorkContext {
  lead_id: number;
  lead_code: string | null;
  company_id: number;
  company_name: string;
  stage: LeadStatus;
  lead_by_id: number | null;
  service_fit: string | null;
  person_id: number | null;
}

export interface FollowUpInput {
  follow_up_on: Date;
  type: string;
  assigned_to: number;
  purpose: string | null;
}

export interface CreateCommunicationData {
  company_id: number;
  lead_id: number | null;
  contact_id: number;
  type: string;
  communication_date: Date;
  what_discussed: string;
  outcome: string | null;
  /** Calls only. */
  call_status?: string | null;
  not_received_reason?: string | null;
  call_duration_seconds?: number | null;
  /** False for a call nobody picked up: it does not make a New lead Contacted. Default true. */
  counts_as_conversation?: boolean;
  actor_emp_id: number;
  /** Optional "Schedule next follow-up" part of the Log Conversation popup, saved together with it. */
  next_follow_up: FollowUpInput | null;
}

export interface CommunicationRecord {
  communication_id: number;
  company_id: number | null;
  lead_id: number | null;
  contact: { person_id: number; name: string } | null;
  type: string;
  communication_date: Date;
  what_discussed: string;
  outcome: string | null;
  call_status: string | null;
  not_received_reason: string | null;
  call_duration_seconds: number | null;
  logged_by: { emp_id: number; name: string } | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface UpdateCommunicationData {
  type?: string;
  contact_id?: number;
  communication_date?: Date;
  what_discussed?: string;
  outcome?: string | null;
  call_status?: string | null;
  not_received_reason?: string | null;
  call_duration_seconds?: number | null;
}

export interface NoteRecord {
  note_id: number;
  lead_id: number;
  note_type: string;
  note: string;
  is_pinned: boolean;
  created_by: { emp_id: number; name: string } | null;
  created_by_id: number | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface TimelineEntry {
  kind: 'follow_up' | 'conversation' | 'note' | 'status_change' | 'event';
  at: Date;
  title: string;
  body: string | null;
  by: { emp_id: number; name: string } | null;
  pinned: boolean;
  ref_id: number | null;
  meta: Record<string, unknown>;
}

export interface HistoryEntry {
  log_id: number;
  event: string;
  summary: string;
  details: unknown;
  performed_at: Date;
  performed_by: { emp_id: number; name: string } | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TransitionResult {
  from: LeadStatus;
  to: LeadStatus;
}

export interface SalesWorkRepositoryPort {
  // ---- context ----
  getLeadForWork(leadId: number, tx?: unknown): Promise<LeadWorkContext | null>;
  /** Company plus its open lead (if any), used to attach company-level conversations to the lead. */
  getCompanyForLog(companyId: number): Promise<{ company_id: number; name: string; open_lead: LeadWorkContext | null } | null>;
  isActiveContactOfCompany(companyId: number, personId: number): Promise<boolean>;
  getPrimaryContactPersonId(companyId: number): Promise<number | null>;
  isEligibleAssignee(empId: number): Promise<boolean>;

  // `tx` (optional) joins the caller's transaction so several steps can succeed or fail together.
  // ---- conversations ----
  /** Saves the conversation (+ follow-up) and, for a New lead, moves it to Contacted - all or nothing. */
  createCommunication(data: CreateCommunicationData, tx?: unknown): Promise<{ communication_id: number; status_change: TransitionResult | null; follow_up_id: number | null }>;
  getCommunication(id: number): Promise<CommunicationRecord | null>;
  updateCommunication(id: number, patch: UpdateCommunicationData, actorEmpId: number): Promise<void>;
  listCommunications(q: { lead_id?: number; company_id?: number; page: number; limit: number }): Promise<Paged<CommunicationRecord>>;

  // ---- notes ----
  createNote(data: { lead_id: number; company_id: number; note_type: string; note: string; is_pinned: boolean; actor_emp_id: number }): Promise<NoteRecord>;
  getNote(noteId: number): Promise<NoteRecord | null>;
  updateNote(noteId: number, patch: { note_type?: string; note?: string; is_pinned?: boolean }, actorEmpId: number): Promise<NoteRecord>;
  listNotes(leadId: number): Promise<NoteRecord[]>;

  // ---- status actions ----
  getQualificationFacts(leadId: number, tx?: unknown): Promise<QualificationFacts>;
  qualify(data: { lead_id: number; service_fit: string | null; actor_emp_id: number }, tx?: unknown): Promise<TransitionResult>;
  putOnHold(data: { lead_id: number; follow_up: FollowUpInput | null; reason: string | null; contact_id: number | null; actor_emp_id: number }, tx?: unknown): Promise<TransitionResult>;
  markLost(data: { lead_id: number; reason: string; reason_lookup_id: number | null; note: string | null; actor_emp_id: number }, tx?: unknown): Promise<TransitionResult>;
  /** The status the lead had before it was last put On Hold, or null. */
  getStatusBeforeHold(leadId: number): Promise<LeadStatus | null>;
  reopen(data: { lead_id: number; to: LeadStatus; actor_emp_id: number }): Promise<TransitionResult>;
  changeLeadBy(data: { lead_id: number; new_lead_by_id: number; actor_emp_id: number }): Promise<{ previous: number | null }>;
  resolveLostReason(label: string): Promise<{ label: string; lookup_id: number } | null>;
  /** Moves a lead to New or Contacted (Qualified, On Hold and Lost have their own steps). */
  moveStage(data: { lead_id: number; to: LeadStatus; actor_emp_id: number }): Promise<TransitionResult>;
  resolveCallNotReceivedReason(label: string): Promise<{ label: string } | null>;

  // ---- reading ----
  timeline(leadId: number, page: number, limit: number): Promise<Paged<TimelineEntry>>;
  history(entity: 'LEAD' | 'COMPANY', entityId: number, page: number, limit: number): Promise<Paged<HistoryEntry>>;
}

export const SALES_WORK_REPOSITORY_PORT_TOKEN = Symbol('SalesWorkRepositoryPort');
