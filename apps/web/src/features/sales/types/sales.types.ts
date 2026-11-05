import type {
  CreateSalesCompanyBodyDto,
  UpdateSalesCompanyBodyDto,
  ContactBodyDto,
  ConvertToLeadBodyDto,
  ConvertToClientBodyDto,
  ReverseConversionBodyDto,
  ChangeLeadByBodyDto,
  QualifyBodyDto,
  HoldBodyDto,
  LostBodyDto,
  QuickLogBodyDto,
  ConversationBodyDto,
  NoteBodyDto,
  ScheduleFollowUpBodyDto,
  ScheduleOnLeadBodyDto,
  EditFollowUpBodyDto,
  CompleteFollowUpBodyDto,
  CancelBodyDto,
  CheckImportBodyDto,
  ExportBodyDto,
  SetRightsBodyDto,
  SalesCompanyControllerListParams,
  SalesLeadControllerListParams,
  SalesLeadControllerBoardParams,
  SalesFollowUpControllerListParams,
  SalesImportExportControllerHistoryParams,
  SalesImportExportControllerTemplateParams,
  SalesImportExportControllerErrorRowsParams,
  SalesActivityControllerLeadConversationsParams,
  SalesActivityControllerTimelineParams,
  SalesActivityControllerHistoryParams,
  SalesActivityControllerCompanyCommunicationsParams,
  SalesActivityControllerCompanyHistoryParams,
} from '@vernoxy-pulse/api-client';

// Re-export generated DTOs for convenience
export type {
  CreateSalesCompanyBodyDto,
  UpdateSalesCompanyBodyDto,
  ContactBodyDto,
  ConvertToLeadBodyDto,
  ConvertToClientBodyDto,
  ReverseConversionBodyDto,
  ChangeLeadByBodyDto,
  QualifyBodyDto,
  HoldBodyDto,
  LostBodyDto,
  QuickLogBodyDto,
  ConversationBodyDto,
  NoteBodyDto,
  ScheduleFollowUpBodyDto,
  ScheduleOnLeadBodyDto,
  EditFollowUpBodyDto,
  CompleteFollowUpBodyDto,
  CancelBodyDto,
  CheckImportBodyDto,
  ExportBodyDto,
  SetRightsBodyDto,
  SalesCompanyControllerListParams,
  SalesLeadControllerListParams,
  SalesLeadControllerBoardParams,
  SalesFollowUpControllerListParams,
  SalesImportExportControllerHistoryParams,
  SalesImportExportControllerTemplateParams,
  SalesImportExportControllerErrorRowsParams,
  SalesActivityControllerLeadConversationsParams,
  SalesActivityControllerTimelineParams,
  SalesActivityControllerHistoryParams,
  SalesActivityControllerCompanyCommunicationsParams,
  SalesActivityControllerCompanyHistoryParams,
};

// ------------------------------------------------------------- Company Types ----

export interface CompanyLeadRef {
  kind: 'none' | 'lead' | 'client';
  lead_id: number | null;
  lead_code: string | null;
  stage: string | null;
  client_code: string | null;
  client_id: number | null;
}

export interface SalesCompanyListItem {
  company_id: number;
  company_code: string | null;
  name: string;
  initials: string;
  city: string | null;
  industry: string | null;
  contact_person: string | null;
  website_quality: string | null;
  lead: CompanyLeadRef;
  can_convert_to_lead: boolean;
}

export interface SalesCompanyCounters {
  total: number;
  not_a_lead: number;
  open_leads: number;
  converted_to_client: number;
}

export interface SalesCompanyListResponse {
  items: SalesCompanyListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  counters: SalesCompanyCounters;
}

export interface SalesContactItem {
  company_person_id: number;
  person_id: number;
  name: string;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  is_primary: boolean;
  is_active: boolean;
}

export interface SalesCompanyFields {
  name: string;
  no_of_branches?: number | null;
  no_of_plants?: number | null;
  full_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pin?: string | null;
  google_maps_url?: string | null;
  is_gidc?: boolean;
  gidc_name?: string | null;
  gidc_area_phase?: string | null;
  nature_of_business?: string | null;
  industry?: string | null;
  products_services?: string | null;
  estimated_employees?: number | null;
  estimated_turnover?: number | null;
  year_established?: number | null;
  existing_major_clients?: string | null;
  website?: string | null;
  website_quality?: string | null;
  developed_by?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  google_business_profile_url?: string | null;
}

export interface SalesCompanyDetailResponse {
  company_id: number;
  company_code: string | null;
  fields: SalesCompanyFields;
  brochure_url: string | null;
  industry: { id: number; name: string } | null;
  contacts: SalesContactItem[];
  lead: CompanyLeadRef;
  can_convert_to_lead: boolean;
  created_at: string;
  created_by: { emp_id: number; name: string } | null;
  updated_at: string | null;
}

export interface SalesMastersResponse {
  industries: Array<{ id: number; name: string; parent_id: number | null }>;
  nature_of_business: string[];
  designation: string[];
  gidc_names: string[];
  gidc_areas: string[];
  /** GIDC name -> the areas that belong to it. */
  gidc_area_map?: Record<string, string[]>;
  /** Areas not tied to one GIDC; offered for every GIDC. */
  gidc_common_areas?: string[];
  website_quality: string[];
  lead_source: string[];
  service_fit: string[];
  states: string[];
  countries: string[];
  cities: string[];
}

export interface DuplicateMatchItem {
  company_id: number;
  company_code: string | null;
  name: string;
  city: string | null;
  reason: 'SAME_NAME_CITY' | 'SAME_MOBILE' | 'SAME_EMAIL';
}

export interface DeleteBlockers {
  has_lead: boolean;
  is_client: boolean;
  has_communication: boolean;
}

// ------------------------------------------------------------- Lead Types ----

export type LeadStatusType = 'New' | 'Contacted' | 'Qualified' | 'On Hold' | 'Converted' | 'Lost';
export type FollowUpFlag = 'overdue' | 'today' | 'upcoming';

export interface LeadListItem {
  lead_id: number;
  lead_code: string | null;
  status: LeadStatusType;
  company: {
    company_id: number;
    company_code: string | null;
    name: string;
    initials: string;
    city: string | null;
  };
  contact_person: string | null;
  lead_by: { emp_id: number; name: string } | null;
  service_fit: string[];
  lead_source: string | null;
  date_added: string;
  next_follow_up: { at: string; flag: FollowUpFlag } | null;
  no_follow_up: boolean;
}

export interface LeadCounters {
  by_status: Record<LeadStatusType, number>;
  follow_ups_due_today: number;
}

export interface LeadListResponse {
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
  status: LeadStatusType;
  count: number;
  cards: BoardCard[];
}

export interface LeadBoardResponse {
  columns: BoardColumn[];
  per_column: number;
  counters: LeadCounters;
}

export interface LeadDetailResponse {
  lead_id: number;
  lead_code: string | null;
  status: LeadStatusType;
  date_added: string;
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
  primary_contact: {
    person_id: number;
    name: string;
    designation: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
  counts: {
    conversations: number;
    open_follow_ups: number;
    notes: number;
  };
  next_follow_up: { at: string; flag: FollowUpFlag } | null;
  won_on: string | null;
  win_note: string | null;
  lost_reason: string | null;
  lost_note: string | null;
  on_hold_reason: string | null;
  client_code: string | null;
  client_id: number | null;
}

export interface LeadMastersResponse {
  statuses: LeadStatusType[];
  lead_sources: string[];
  default_lead_source: string;
  existing_client_lead_source: string;
  service_fits: string[];
  lost_reasons: string[];
  lead_by_users: Array<{ emp_id: number; name: string; is_admin: boolean }>;
}

export interface ConvertToLeadFormResponse {
  company: { company_id: number; company_code: string | null; name: string; is_client: boolean };
  primary_contact: {
    person_id: number;
    name: string;
    designation: string | null;
    mobile: string | null;
  } | null;
  communication_count: number;
  open_lead: { lead_id: number; lead_code: string | null; stage: string } | null;
  /** Preview of the Lead ID; the real one is given when the lead is created. */
  next_lead_code: string;
  defaults: { lead_source: string; lead_by: { emp_id: number; name: string; is_admin: boolean } | null; status: 'New' };
  lead_sources: string[];
  service_fits: string[];
  lead_by_users: Array<{ emp_id: number; name: string; is_admin: boolean }>;
}

export interface QualificationResponse {
  status: LeadStatusType;
  items: Array<{ key: string; label: string; done: boolean; detail?: string }>;
  complete: boolean;
  can_qualify: boolean;
  allowed_actions: string[];
}

// ------------------------------------------------------------- Follow-up Types ----

export type FollowUpTabType = 'today' | 'upcoming' | 'overdue' | 'completed' | 'cancelled';

export type FollowUpAction = 'view' | 'edit' | 'complete' | 'reschedule' | 'cancel';

/** One follow-up as the API returns it (status is already Overdue when 15 minutes late). */
export interface FollowUpItem {
  follow_up_id: number;
  status: string;
  follow_up_on: string;
  type: string;
  purpose: string | null;
  company: { company_id: number; company_code: string | null; name: string; city: string | null };
  /** "Related to": the Lead ID, or the Company ID while the company is not yet a lead. */
  related_to: { kind: 'lead' | 'company'; lead_id: number | null; lead_code: string | null; company_id: number; company_code: string | null };
  lead_status: string | null;
  contact: { person_id: number; name: string } | null;
  assigned_to: { emp_id: number; name: string };
  rescheduled_count: number;
  done_on: string | null;
  outcome: string | null;
  what_happened: string | null;
  reason: string | null;
  /** The buttons this user may press on this row. */
  actions: FollowUpAction[];
}

export interface FollowUpListResponse {
  items: FollowUpItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  tab_counts: Record<FollowUpTabType, number>;
}

// ------------------------------------------------------------- Activity & Notes ----

export interface ConversationItem {
  communication_id: number;
  company_id: number | null;
  lead_id: number | null;
  contact: { person_id: number; name: string } | null;
  type: string;
  communication_date: string;
  what_discussed: string;
  outcome: string | null;
  /** Calls only. */
  call_status?: 'Received' | 'Not received' | null;
  not_received_reason?: string | null;
  logged_by: { emp_id: number; name: string } | null;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface NoteItem {
  note_id: number;
  lead_id: number;
  note_type: string;
  note: string;
  is_pinned: boolean;
  created_by: { emp_id: number; name: string } | null;
  created_by_id: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface TimelineEntry {
  kind: 'follow_up' | 'conversation' | 'note' | 'status_change' | 'event';
  at: string;
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
  performed_at: string;
  performed_by: { emp_id: number; name: string } | null;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ------------------------------------------------------------- Client Conversion ----

export interface ClientFormResponse {
  lead: {
    lead_id: number;
    lead_code: string | null;
    status: string;
    service_fit: string[];
    lead_by: { emp_id: number; name: string } | null;
  };
  company: { company_id: number; company_code: string | null; name: string };
  client_id_preview: string;
  client_exists: boolean;
  won_on: { default: string; min: string; max: string };
  carried_forward: Array<{ key: string; label: string; summary: string }>;
  result_note: string;
  can_convert: boolean;
  blocked_reason: string | null;
}

export interface ClientDetailResponse {
  client_id: number;
  client_code: string;
  won_on: string;
  win_note: string;
  owner: { emp_id: number; name: string } | null;
  created_at: string;
  company: {
    company_id: number;
    company_code: string | null;
    name: string;
    city: string | null;
    state: string | null;
    industry: string | null;
  };
  converted_from_lead: { lead_id: number; lead_code: string | null } | null;
  leads: Array<{ lead_id: number; lead_code: string | null; won_on: string | null }>;
  contacts: Array<{
    person_id: number;
    name: string;
    designation: string | null;
    mobile: string | null;
    email: string | null;
    is_primary: boolean;
  }>;
  carried_forward: { contacts: number; communications: number; notes: number };
}

// ------------------------------------------------------------- Import & Export ----

export interface ColumnMatchItem {
  file_column: string;
  field_key: string | null;
  status: 'matched' | 'unmatched' | 'not_importable';
}

export interface ImportCheckResponse {
  job_id: string;
  summary: { total: number; ready: number; already_in_database: number; with_errors: number };
  will_create: { companies: number; leads: number };
  will_fill: number;
  errors: Array<{ row: number; company: string | null; field: string; problem: string }>;
  errors_truncated: boolean;
  existing: Array<{
    row: number;
    company: string;
    matched_company_id: number;
    matched_company_code: string | null;
    matched_by: string;
  }>;
  warnings: Array<{ row: number; message: string }>;
  mapping: Record<string, string>;
  options: { create_leads: boolean; existing_rows: 'skip' | 'update_empty' };
  can_import: boolean;
}

export interface ImportUploadResponse extends ImportCheckResponse {
  file: { name: string | null; rows: number; format: 'xlsx' | 'csv' };
  columns: ColumnMatchItem[];
  fields: Array<{ key: string; header: string; group: 'company' | 'lead'; required: boolean; system: boolean }>;
}

export interface ImportConfirmResponse {
  job_id: string;
  status: 'completed' | 'completed_with_errors' | 'failed';
  companies_created: number;
  companies_updated: number;
  leads_created: number;
  skipped_existing: number;
  rows_with_errors: number;
  rows_failed: number;
  batch: { batch_id: number; can_undo_until: string };
  row_results: Array<{
    row: number;
    company: string;
    status: 'created' | 'updated' | 'skipped' | 'error' | 'failed';
    company_code?: string | null;
    lead_code?: string | null;
    message?: string;
  }>;
}

export interface ImportJobResponse {
  job_id: string;
  status: string;
  file_name: string | null;
  rows: number;
  counts: { ready: number; errors: number; created: number; skipped: number; failed: number };
  options: { create_leads: boolean; existing_rows: 'skip' | 'update_empty' };
  result: Record<string, number> | null;
  row_results: Array<{
    row: number;
    company: string;
    status: 'created' | 'updated' | 'skipped' | 'error' | 'failed';
    company_code?: string | null;
    lead_code?: string | null;
    message?: string;
  }>;
  batch: { batch_id: number; can_undo_until: string; undone: boolean } | null;
  created_at: string;
}

export interface HistoryItem {
  job_id: string;
  kind: 'import' | 'export';
  entity: string;
  status: string;
  by: { emp_id: number; name: string } | null;
  at: string;
  file_name: string | null;
  format: string;
  rows: number;
  counts: { created: number; skipped: number; failed: number; errors: number };
  result: Record<string, number> | null;
  list: string | null;
  filters: Record<string, unknown> | null;
  undo: { can_undo: boolean; until: string; undone: boolean } | null;
}

// ------------------------------------------------------------- Rights ----

export interface SalesMyRightsResponse {
  can_import: boolean;
  can_export: boolean;
}

export interface SalesUserRightsItem {
  emp_id: number;
  name: string;
  is_admin: boolean;
  can_import: boolean;
  can_export: boolean;
}

// ------------------------------------------------------------- Error structure ----

export interface ApiFieldError {
  field: string;
  code?: string;
  message: string;
  matches?: DuplicateMatchItem[];
  lead?: { lead_id: number; lead_code: string | null; stage: string };
  blockers?: Array<{ company_id: number; company_code: string | null; name: string; reason: string }>;
}

export interface ApiProblemResponse {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  message?: string;
  errors?: ApiFieldError[];
}

// ------------------------------------------------------------- Aliases used by the screens ----

export type SalesLeadMastersResponse = LeadMastersResponse;
export type LeadQualificationResponse = QualificationResponse;
export type SalesFollowUpType = 'Call' | 'Email' | 'WhatsApp' | 'Meeting' | 'Site Visit';
export type NextStepAction = 'schedule' | 'qualify' | 'hold' | 'lost' | 'none';
export type NoteType = 'General' | 'Requirement' | 'Budget' | 'Readiness';
export type ActivityItem = HistoryEntry;
export type SalesCompanyLeadFilter = 'all' | 'not_a_lead' | 'open' | 'client' | 'lost';

/** Flat view of a follow-up used by the action modals (Complete / Reschedule / Cancel). */
export interface SalesFollowUpItem {
  id: number;
  lead_id: number | null;
  company_name?: string;
  contact_name?: string;
  type: SalesFollowUpType;
  due_date: string;
  status: string;
  purpose: string | null;
  assigned_to_name?: string;
  rescheduled_count: number;
}

/** Used while the masters are still loading. */
export const EMPTY_LEAD_MASTERS: LeadMastersResponse = {
  statuses: [],
  lead_sources: [],
  default_lead_source: '',
  existing_client_lead_source: '',
  service_fits: [],
  lost_reasons: [],
  lead_by_users: [],
};

// ---- Sales Reports ----

export interface SalesReportCountRow {
  name: string;
  total: number;
  converted: number;
  lost: number;
  conversion_rate: number;
}

export interface SalesReportResponse {
  period: { from: string | null; to: string | null };
  totals: {
    companies: number;
    companies_in_period: number;
    leads: number;
    open: number;
    converted: number;
    lost: number;
    on_hold: number;
    conversion_rate: number;
    avg_days_to_convert: number | null;
    overdue_follow_ups: number;
  };
  by_stage: Array<{ stage: string; count: number }>;
  by_source: SalesReportCountRow[];
  by_user: Array<SalesReportCountRow & { emp_id: number | null; open: number }>;
  by_service_fit: SalesReportCountRow[];
  lost_reasons: Array<{ reason: string; count: number; percent: number }>;
  trend: Array<{ month: string; label: string; created: number; converted: number }>;
}
