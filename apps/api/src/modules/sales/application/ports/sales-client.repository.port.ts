import { LeadStatus } from '../../domain/entities/sales-lead';

export interface ConversionContext {
  lead: {
    lead_id: number;
    lead_code: string | null;
    stage: LeadStatus;
    created_at: Date;
    lead_by: { emp_id: number; name: string } | null;
    lead_source: string | null;
    service_fit: string | null;
    /** Set once the lead is Converted: "Converted to CLI-0019". */
    converted_client: { client_id: number; client_code: string } | null;
  };
  company: { company_id: number; company_code: string | null; name: string };
  /** A company that is already a client keeps its Client ID when it wins more work. */
  existing_client: { client_id: number; client_code: string } | null;
  counts: {
    contacts: number;
    primary_contact: { person_id: number; name: string } | null;
    communications: number;
    notes: number;
  };
}

export interface ConvertToClientData {
  lead_id: number;
  /** Date-only value (00:00 UTC). */
  won_on: Date;
  win_note: string;
  actor_emp_id: number;
}

export interface ConvertToClientResult {
  client_id: number;
  client_code: string;
  /** true when the company already was a client and the lead was linked to that client. */
  reused_existing_client: boolean;
  cancelled_follow_ups: number;
}

export interface ClientDetail {
  client_id: number;
  client_code: string;
  won_on: Date;
  win_note: string;
  /** "The Lead By user is shown as the client owner." */
  owner: { emp_id: number; name: string } | null;
  created_at: Date;
  company: { company_id: number; company_code: string | null; name: string; city: string | null; state: string | null; industry: string | null };
  /** "The client shows Converted from LEAD-0057." */
  converted_from_lead: { lead_id: number; lead_code: string | null } | null;
  /** Every lead that was converted to this client. */
  leads: Array<{ lead_id: number; lead_code: string | null; won_on: Date | null }>;
  contacts: Array<{ person_id: number; name: string; designation: string | null; mobile: string | null; email: string | null; is_primary: boolean }>;
  carried_forward: { contacts: number; communications: number; notes: number };
}

export interface ClientListQuery {
  q?: string;
  sort: 'won_on' | 'name' | 'created_at';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface ClientListItem {
  client_id: number;
  client_code: string;
  won_on: Date;
  win_note: string;
  owner: { emp_id: number; name: string } | null;
  company: { company_id: number; company_code: string | null; name: string; city: string | null; state: string | null; industry: string | null; website: string | null };
  /** The primary contact of the company. */
  contact: { name: string; designation: string | null; mobile: string | null; email: string | null } | null;
  /** Leads that were converted to this client. */
  leads_count: number;
}

export interface ClientListResult {
  items: ClientListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  counters: { total: number; this_month: number; this_year: number };
}

/** A project of this company (matched on the company name or its Client ID, as the projects only carry the client name). */
export interface CompanyProjectItem {
  project_id: number;
  project_no: string;
  project_name: string;
  project_status: string;
  category: string;
  start_date: Date;
  deadline: Date;
  manager: { emp_id: number; name: string } | null;
  members_count: number;
}

export interface ReversalResult {
  lead_id: number;
  client_code: string;
  /** false when the client keeps other converted leads. */
  client_removed: boolean;
}

export interface SalesClientRepositoryPort {
  getConversionContext(leadId: number): Promise<ConversionContext | null>;
  getNextClientCode(): Promise<string>;
  convert(data: ConvertToClientData): Promise<ConvertToClientResult>;
  getClient(clientId: number): Promise<ClientDetail | null>;
  listClients(query: ClientListQuery, now: Date): Promise<ClientListResult>;
  /** The Admin sees every project of the company; anyone else only those they manage or are a member of. */
  listCompanyProjects(companyId: number, actor: { emp_id: number; is_admin: boolean }): Promise<CompanyProjectItem[]>;
  /** The lead's client, to check "no project yet" before a reversal. */
  getClientOfLead(leadId: number): Promise<{ client_id: number; client_code: string; company_name: string } | null>;
  /** Projects only carry the client name for now, so this matches on the company name and the Client ID. */
  clientHasProject(clientId: number): Promise<boolean>;
  reverse(data: { lead_id: number; reason: string; actor_emp_id: number }): Promise<ReversalResult>;
  listAdminIds(): Promise<number[]>;
}

export const SALES_CLIENT_REPOSITORY_PORT_TOKEN = Symbol('SalesClientRepositoryPort');
