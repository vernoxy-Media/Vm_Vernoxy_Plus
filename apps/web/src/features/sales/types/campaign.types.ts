export const CAMPAIGN_TYPES = ['Calling', 'Meeting', 'Email', 'Calling + Meeting'] as const;
export const CAMPAIGN_STATUSES = ['Draft', 'Active', 'Paused', 'Completed'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type CallingStatus = 'Pending' | 'Connected' | 'Not Received' | 'Interested' | 'Not Interested';

/** The filters of the calling list. The same keys the API accepts. */
export const CALLING_FILTERS: { key: string; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'connected', label: 'Connected' },
  { key: 'not_received', label: 'Not Received' },
  { key: 'interested', label: 'Interested' },
  { key: 'not_interested', label: 'Not Interested' },
  { key: 'follow_up_due', label: 'Follow-up Due' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled' },
];

export const LEAD_STATUS_FILTERS = ['No lead', 'New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost'] as const;

export const CALL_OUTCOMES = ['Interested', 'Not interested', 'Call back later', 'Needs more information', 'No response'] as const;

export interface Campaign {
  campaign_id: number;
  name: string;
  campaign_type: string;
  target_cities: string[];
  target_state: string | null;
  industry_id: number | null;
  industry_name: string | null;
  start_date: string;
  end_date: string;
  objective: string | null;
  description: string | null;
  status: CampaignStatus;
  created_at: string;
  total_companies: number;
  assigned_companies: number;
  called_companies: number;
}

export interface CampaignListResponse {
  items: Campaign[];
  total: number;
  page: number;
  limit: number;
}

export interface CampaignListFilters {
  q?: string;
  type?: string;
  city?: string;
  emp_id?: number;
  start_from?: string;
  end_to?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CampaignFormValues {
  name: string;
  campaign_type: string;
  target_cities: string[];
  target_state: string | null;
  industry_id: number | null;
  start_date: string;
  end_date: string;
  objective: string | null;
  description: string | null;
  status: string;
}

export interface CampaignMasters {
  industries: { industry_id: number; name: string }[];
  customer_types: { customer_type_id: number; name: string }[];
  states: string[];
  cities: string[];
  employees: { emp_id: number; name: string }[];
  not_received_reasons: string[];
  can_manage: boolean;
}

export interface CompanySearchFilters {
  q?: string;
  cities?: string[];
  state?: string;
  industry_ids?: number[];
  customer_type_id?: number;
  lead_status?: string;
  contacted?: 'yes' | 'no';
  hide_added?: boolean;
  campaign_id?: number;
  page?: number;
  limit?: number;
}

export interface CompanySearchRow {
  company_id: number;
  company_code: string | null;
  name: string;
  city: string | null;
  state: string | null;
  industry: string | null;
  category: string | null;
  contact_person: string | null;
  mobile: string | null;
  lead_status: string;
  contacted: boolean;
  in_campaign: boolean;
}

export interface CompanySearchResponse {
  items: CompanySearchRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CampaignCompany {
  campaign_company_id: number;
  campaign_id: number;
  company_id: number;
  company_code: string | null;
  company_name: string;
  city: string | null;
  state: string | null;
  contact_person: string | null;
  mobile: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  call_attempts: number;
  last_call_status: string | null;
  last_outcome: string | null;
  last_called_at: string | null;
  next_follow_up_on: string | null;
  meeting_scheduled: boolean;
  calling_status: CallingStatus;
}

export interface CampaignCompaniesResponse {
  items: CampaignCompany[];
  total: number;
  page: number;
  limit: number;
}

export interface CampaignCompaniesFilters {
  assigned_to?: string;
  calling?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface WorkloadRow {
  emp_id: number;
  name: string;
  assigned: number;
  called: number;
  pending: number;
  call_attempts: number;
  connected: number;
  not_received: number;
  interested: number;
  follow_ups_due: number;
  meetings_scheduled: number;
  meetings_completed: number;
  daily_target: number;
  calls_today: number;
}

export interface CampaignDetailAdmin {
  campaign: Campaign;
  workload: WorkloadRow[];
  unassigned_companies: number;
}

export interface MyCampaignStats {
  campaign_id: number;
  campaign_name: string;
  campaign_status: string;
  emp_id: number;
  assigned: number;
  called: number;
  pending: number;
  call_attempts: number;
  connected: number;
  not_received: number;
  interested: number;
  follow_ups_due: number;
  meetings_scheduled: number;
  meetings_completed: number;
  daily_target: number;
  calls_today: number;
}

export interface CampaignDetailMine {
  campaign: Campaign;
  mine: MyCampaignStats;
}

export type CampaignDetail = CampaignDetailAdmin | CampaignDetailMine;

export interface WorkloadResponse {
  workload: WorkloadRow[];
  unassigned_companies: number;
}

export interface MyDashboard {
  kpis: {
    active_campaigns: number;
    total_assigned: number;
    pending_calls: number;
    calls_attempted: number;
    calls_completed: number;
    connected_calls: number;
    not_received: number;
    interested: number;
    follow_ups_due: number;
    meetings_scheduled: number;
    meetings_completed: number;
    calls_today: number;
    daily_target: number;
  };
  campaigns: {
    campaign_id: number;
    name: string;
    status: string;
    assigned: number;
    called: number;
    pending: number;
    meetings: number;
    daily_target: number;
    calls_today: number;
  }[];
}

export interface AdminOverview {
  kpis: {
    total_campaigns: number;
    active_campaigns: number;
    total_companies: number;
    assigned_companies: number;
    pending_calls: number;
    total_call_attempts: number;
    connected_calls: number;
    meetings_scheduled: number;
    meetings_completed: number;
    interested_companies: number;
  };
  employees: {
    emp_id: number;
    employee: string;
    campaign_id: number;
    campaign: string;
    assigned: number;
    calls: number;
    meetings: number;
    pending: number;
    daily_target: number;
    calls_today: number;
  }[];
}

export interface CampaignCall {
  call_id: number;
  emp_id: number;
  emp_name: string | null;
  call_status: string;
  outcome: string | null;
  called_at: string;
  what_discussed: string | null;
  not_received_reason: string | null;
  call_duration_seconds: number | null;
}

export interface LogCallValues {
  call_status: 'Received' | 'Not received';
  not_received_reason?: string;
  outcome?: string;
  what_discussed?: string;
  call_duration_seconds?: number;
  next_follow_up_on?: string;
}

export interface LogCallResponse {
  company: CampaignCompany | null;
  progress: MyCampaignStats | null;
}

export type AssignBody =
  | { mode: 'manual'; campaign_company_ids: number[]; emp_id: number | null }
  | { mode: 'equal'; emp_ids: number[]; campaign_company_ids?: number[] };
