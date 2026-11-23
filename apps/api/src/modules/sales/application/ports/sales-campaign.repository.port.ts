import { CallingFilter, CallingStatusLabel } from '../../domain/services/campaign.service';

export interface CampaignSummary {
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
  status: string;
  created_at: Date;
  total_companies: number;
  assigned_companies: number;
  /** Companies with at least one call attempt */
  called_companies: number;
}

export interface CampaignListFilter {
  q?: string;
  type?: string;
  city?: string;
  emp_id?: number;
  start_from?: string;
  end_to?: string;
  status?: string;
}

export interface CampaignWrite {
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

export interface CompanySearchFilter {
  q?: string;
  cities?: string[];
  state?: string;
  industry_ids?: number[];
  customer_type_id?: number;
  lead_status?: string;
  contacted?: 'yes' | 'no';
  hide_added?: boolean;
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

export interface CampaignCompanyFilter {
  assigned_to?: number | 'unassigned';
  calling?: CallingFilter;
  q?: string;
}

export interface CampaignCompanyRow {
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
  last_called_at: Date | null;
  next_follow_up_on: Date | null;
  meeting_scheduled: boolean;
  calling_status: CallingStatusLabel;
}

/** One employee's numbers in one campaign. */
export interface EmployeeCampaignStats {
  campaign_id: number;
  campaign_name: string;
  campaign_status: string;
  emp_id: number;
  emp_name: string;
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

export interface CampaignEmployee {
  emp_id: number;
  name: string;
}

export interface CampaignMasters {
  industries: { industry_id: number; name: string }[];
  customer_types: { customer_type_id: number; name: string }[];
  states: string[];
  cities: string[];
  employees: CampaignEmployee[];
  not_received_reasons: string[];
}

export interface CampaignCompanyContext {
  campaign_company_id: number;
  campaign_id: number;
  campaign_name: string;
  campaign_status: string;
  company_id: number;
  assigned_to: number | null;
  contact_person: string | null;
}

export interface LogCampaignCallData {
  campaign_company_id: number;
  campaign_id: number;
  company_id: number;
  campaign_name: string;
  contact_person: string | null;
  actor_emp_id: number;
  call_status: string;
  not_received_reason: string | null;
  outcome: string | null;
  what_discussed: string | null;
  call_duration_seconds: number | null;
  next_follow_up_on: Date | null;
}

export interface CampaignCallRow {
  call_id: number;
  emp_id: number;
  emp_name: string | null;
  call_status: string;
  outcome: string | null;
  called_at: Date;
  what_discussed: string | null;
  not_received_reason: string | null;
  call_duration_seconds: number | null;
}

export interface AdminOverviewKpis {
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
}

/** Date range (YYYY-MM-DD, India time, both days included) and an optional employee. All parts are optional. */
export interface UserPerformanceScope {
  from?: string;
  to?: string;
  emp_id?: number;
  /** Hide campaigns still in Draft (used for a Sales user's own view). */
  exclude_draft?: boolean;
}

export interface UserPerformanceRow {
  emp_id: number;
  emp_name: string;
  calls_allotted: number;
  calls_done: number;
  calls_received: number;
  positive_responses: number;
  pending_calls: number;
}

export interface PositiveLeadRow {
  campaign_company_id: number;
  campaign_id: number;
  company_id: number;
  company_name: string;
  contact_person: string | null;
  contact_number: string | null;
  campaign_name: string;
  call_date: Date;
  lead_status: string;
  assigned_user: string | null;
}

export interface UserCallRow {
  call_id: number;
  campaign_company_id: number;
  campaign_id: number;
  company_name: string;
  contact_person: string | null;
  contact_number: string | null;
  campaign_name: string;
  call_date: Date;
  call_status: string;
  outcome: string | null;
  what_discussed: string | null;
  not_received_reason: string | null;
  called_by: string | null;
}

export interface SalesCampaignRepositoryPort {
  listCampaigns(filter: CampaignListFilter, page: number, limit: number, scopeEmpId: number | null): Promise<{ items: CampaignSummary[]; total: number }>;
  getCampaign(id: number): Promise<CampaignSummary | null>;
  createCampaign(data: CampaignWrite, actorEmpId: number): Promise<number>;
  updateCampaign(id: number, data: Partial<CampaignWrite>, actorEmpId: number): Promise<void>;
  getMasters(): Promise<CampaignMasters>;

  searchCompanies(filter: CompanySearchFilter, campaignId: number | null, page: number, limit: number): Promise<{ items: CompanySearchRow[]; total: number }>;
  /** Adds the given companies, or every company that matches the filter. Companies already in the campaign are skipped. */
  addCompanies(campaignId: number, by: { company_ids: number[] } | { filter: CompanySearchFilter }, actorEmpId: number): Promise<{ added: number; skipped: number }>;
  /** Removes companies that nobody has called yet. Returns how many were removed and how many were kept because a call was already made. */
  removeCompanies(campaignId: number, campaignCompanyIds: number[], actorEmpId: number): Promise<{ removed: number; kept: number }>;

  listCampaignCompanies(campaignId: number, filter: CampaignCompanyFilter, page: number, limit: number): Promise<{ items: CampaignCompanyRow[]; total: number }>;
  unassignedIds(campaignId: number): Promise<number[]>;
  /** emp_id null puts the companies back to "not assigned". Returns how many rows changed. */
  assign(campaignId: number, plan: { emp_id: number | null; campaign_company_ids: number[] }[], actorEmpId: number): Promise<number>;
  setTargets(campaignId: number, targets: { emp_id: number; daily_target: number }[], actorEmpId: number): Promise<void>;
  listTargets(campaignId: number): Promise<{ emp_id: number; daily_target: number }[]>;

  /** Per employee and campaign numbers. Narrow with a campaign, an employee, or leave both out for everything. */
  employeeStats(scope: { campaign_id?: number; emp_id?: number; exclude_draft?: boolean }): Promise<EmployeeCampaignStats[]>;
  unassignedCount(campaignId: number): Promise<number>;
  adminOverview(): Promise<AdminOverviewKpis>;
  /** User-wise calling summary for the date range. */
  userPerformance(scope: UserPerformanceScope): Promise<UserPerformanceRow[]>;
  /** Every call one user made in the range, newest first, with the result and what was discussed. */
  userCalls(scope: UserPerformanceScope & { emp_id: number }): Promise<UserCallRow[]>;
  /** Companies that gave a positive (Interested) answer in the range, with the lead status they now have. */
  positiveLeads(scope: UserPerformanceScope & { emp_id: number }): Promise<PositiveLeadRow[]>;

  getCampaignCompany(campaignId: number, campaignCompanyId: number): Promise<CampaignCompanyContext | null>;
  logCall(data: LogCampaignCallData): Promise<{ campaign_company_id: number }>;
  listCalls(campaignCompanyId: number): Promise<CampaignCallRow[]>;
  getCampaignCompanyRow(campaignId: number, campaignCompanyId: number): Promise<CampaignCompanyRow | null>;
  isEligibleEmployee(empId: number): Promise<boolean>;
}

export const SALES_CAMPAIGN_REPOSITORY_PORT_TOKEN = Symbol('SalesCampaignRepositoryPort');
