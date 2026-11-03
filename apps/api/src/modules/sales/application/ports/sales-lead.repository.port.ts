import { FollowUpFlag, LeadStatus } from '../../domain/entities/sales-lead';
import { OpenLeadRef } from '../../domain/errors/sales.errors';

// ------------------------------------------------------------- convert ----

export interface ConvertContext {
  company: { company_id: number; company_code: string | null; name: string; is_client: boolean };
  primary_contact: {
    person_id: number;
    name: string;
    designation: string | null;
    mobile: string | null;
  } | null;
  communication_count: number;
  open_lead: OpenLeadRef | null;
}

export interface LeadByUser {
  emp_id: number;
  name: string;
  is_admin: boolean;
}

export interface LeadMasters {
  statuses: LeadStatus[];
  /** Lead Source master labels. */
  lead_sources: string[];
  /** The "Cold calling" entry of the master: what the popup starts with. */
  default_lead_source: string;
  /** Used automatically when the company is already a client ("Existing client"). */
  existing_client_lead_source: string;
  service_fits: string[];
  lost_reasons: string[];
  lead_by_users: LeadByUser[];
}

export interface CreateLeadData {
  company_id: number;
  person_id: number | null;
  company_name: string;
  lead_source: string;
  lead_by_id: number;
  service_fit: string[];
  first_note: string | null;
  actor_emp_id: number;
}

// ---------------------------------------------------------------- list ----

export type StatusFilter = 'open' | 'all' | LeadStatus;
export type FollowUpFilter = 'today' | 'overdue' | 'this_week' | 'none';
export type DateAddedFilter = 'today' | 'this_week' | 'this_month';
export type LeadSort = 'next_follow_up' | 'company' | 'city' | 'date_added' | 'status';

export interface LeadFilters {
  q?: string;
  status?: StatusFilter;
  /** emp_id. Already resolved by the use case ("me" -> actor, Sales users forced to themselves). */
  lead_by_id?: number;
  city?: string[];
  industry_ids?: number[];
  lead_source?: string[];
  service_fit?: string[];
  follow_up?: FollowUpFilter;
  date_added?: DateAddedFilter;
  added_from?: Date;
  added_to?: Date;
  nature_of_business?: string[];
  is_gidc?: boolean;
  gidc_name?: string[];
  website_quality?: string[];
  state?: string[];
  no_conversation_days?: 7 | 15 | 30;
  lost_reason?: string;
}

export interface ListLeadsParams extends LeadFilters {
  sort?: LeadSort;
  order?: 'asc' | 'desc';
  page: number;
  limit: number;
  now: Date;
}

export interface LeadListItem {
  lead_id: number;
  lead_code: string | null;
  status: LeadStatus;
  company: { company_id: number; company_code: string | null; name: string; initials: string; city: string | null };
  contact_person: string | null;
  lead_by: { emp_id: number; name: string } | null;
  service_fit: string[];
  lead_source: string | null;
  date_added: Date;
  next_follow_up: { at: Date; flag: FollowUpFlag } | null;
  /** "No follow-up" tag: an open lead with no pending follow-up for 7 days. */
  no_follow_up: boolean;
}

export interface LeadCounters {
  by_status: Record<LeadStatus, number>;
  follow_ups_due_today: number;
}

export interface LeadList {
  items: LeadListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  counters: LeadCounters;
}

export interface BoardCard extends LeadListItem {
  follow_up_due: boolean;
  lost_reason: string | null;
  client_code: string | null;
}

export interface BoardColumn {
  status: LeadStatus;
  count: number;
  cards: BoardCard[];
}

export interface LeadBoard {
  columns: BoardColumn[];
  per_column: number;
  counters: LeadCounters;
}

// -------------------------------------------------------------- detail ----

export interface LeadDetail {
  lead_id: number;
  lead_code: string | null;
  status: LeadStatus;
  date_added: Date;
  lead_source: string | null;
  service_fit: string[];
  lead_by: { emp_id: number; name: string } | null;
  created_by: { emp_id: number; name: string } | null;
  company: {
    company_id: number;
    company_code: string | null;
    name: string;
    city: string | null;
    state: string | null;
    is_gidc: boolean;
    gidc_name: string | null;
  };
  primary_contact: { person_id: number; name: string; designation: string | null; mobile: string | null; email: string | null } | null;
  counts: { conversations: number; open_follow_ups: number; notes: number };
  next_follow_up: { at: Date; flag: FollowUpFlag } | null;
  won_on: Date | null;
  win_note: string | null;
  lost_reason: string | null;
  lost_note: string | null;
  on_hold_reason: string | null;
  client_code: string | null;
  /** "Converted to CLI-0019": the client this lead was converted to. */
  client_id: number | null;
}

export interface SalesLeadRepositoryPort {
  getConvertContext(companyId: number): Promise<ConvertContext | null>;
  getMasters(): Promise<LeadMasters>;
  /** Canonical label of a Lead Source master value (case-insensitive), or null when it is not in the master. */
  resolveLeadSource(label: string): Promise<string | null>;
  /** Canonical labels for the given Service Fit values, or the list of values that are not in the master. */
  resolveServiceFit(values: string[]): Promise<{ labels: string[]; unknown: string[] }>;
  isEligibleLeadBy(empId: number): Promise<boolean>;
  getNextLeadCode(): Promise<string>;
  /** Creates the lead (and first note, history) atomically. Throws OpenLeadExistsError on a race. */
  createLead(data: CreateLeadData): Promise<{ lead_id: number; lead_code: string }>;

  list(params: ListLeadsParams): Promise<LeadList>;
  board(params: Omit<ListLeadsParams, 'page' | 'limit'> & { per_column: number }): Promise<LeadBoard>;
  getDetail(leadId: number, now: Date): Promise<LeadDetail | null>;
}

export const SALES_LEAD_REPOSITORY_PORT_TOKEN = Symbol('SalesLeadRepositoryPort');
