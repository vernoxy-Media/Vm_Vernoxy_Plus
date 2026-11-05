import { CompanyFields, ContactFields } from '../../domain/entities/sales-company';
import { DuplicateMatch } from '../../domain/errors/sales.errors';

export type LeadFilter = 'all' | 'not_a_lead' | 'open' | 'client' | 'lost';

export interface ListSalesCompaniesParams {
  q?: string;
  city?: string[];
  industry_ids?: number[];
  nature_of_business?: string[];
  is_gidc?: boolean;
  website_quality?: string[];
  lead?: LeadFilter;
  state?: string[];
  country?: string[];
  gidc_name?: string[];
  gidc_area_phase?: string[];
  designation?: string[];
  employees_min?: number;
  employees_max?: number;
  turnover_min?: number;
  turnover_max?: number;
  year_min?: number;
  year_max?: number;
  has_website?: boolean;
  has_brochure?: boolean;
  added_by?: number;
  added_from?: Date;
  added_to?: Date;
  sort?: 'created_at' | 'name' | 'city';
  order?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface CompanyLeadRef {
  kind: 'none' | 'lead' | 'client';
  lead_id: number | null;
  lead_code: string | null;
  stage: string | null;
  client_code: string | null;
  /** Set when the company is a client: the target of the "Open client" link. */
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

export interface SalesCompanyList {
  items: SalesCompanyListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  counters: SalesCompanyCounters;
}

export interface SalesContact {
  company_person_id: number;
  person_id: number;
  name: string;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  is_primary: boolean;
  /** false once marked "Left the company". */
  is_active: boolean;
}

export interface SalesCompanyDetail {
  company_id: number;
  company_code: string | null;
  fields: CompanyFields;
  brochure_url: string | null;
  industry: { id: number; name: string } | null;
  contacts: SalesContact[];
  lead: CompanyLeadRef;
  can_convert_to_lead: boolean;
  created_at: Date;
  created_by: { emp_id: number; name: string } | null;
  updated_at: Date | null;
}

export interface CreateSalesCompanyData {
  fields: CompanyFields;
  contact: ContactFields;
  actor_emp_id: number;
  /** Company ids the user confirmed "this is a different company" against. */
  confirmed_duplicates: DuplicateMatch[];
}

export interface UpdateSalesCompanyData {
  company_id: number;
  fields: CompanyFields;
  contact: ContactFields;
  actor_emp_id: number;
  confirmed_duplicates: DuplicateMatch[];
}

export interface DuplicateQuery {
  name?: string | null;
  city?: string | null;
  mobile?: string | null;
  email?: string | null;
  exclude_company_id?: number;
}

export interface DeleteBlockers {
  has_lead: boolean;
  is_client: boolean;
  has_communication: boolean;
}

export interface SalesMasters {
  industries: Array<{ id: number; name: string; parent_id: number | null }>;
  nature_of_business: string[];
  designation: string[];
  gidc_names: string[];
  /** Every area, whichever GIDC it belongs to. */
  gidc_areas: string[];
  /** GIDC name -> the areas that belong to it. */
  gidc_area_map: Record<string, string[]>;
  /** Areas that are not tied to one GIDC; they are offered for every GIDC. */
  gidc_common_areas: string[];
  website_quality: string[];
  lead_source: string[];
  service_fit: string[];
  states: string[];
  countries: string[];
  cities: string[];
}

export interface SalesCompanyRepositoryPort {
  list(params: ListSalesCompaniesParams): Promise<SalesCompanyList>;
  getDetail(companyId: number): Promise<SalesCompanyDetail | null>;
  findDuplicates(query: DuplicateQuery): Promise<DuplicateMatch[]>;
  create(data: CreateSalesCompanyData): Promise<{ company_id: number; company_code: string }>;
  update(data: UpdateSalesCompanyData): Promise<void>;
  getDeleteBlockers(companyId: number): Promise<DeleteBlockers | null>;
  softDelete(companyId: number, actorEmpId: number): Promise<void>;
  getMasters(): Promise<SalesMasters>;
}

export const SALES_COMPANY_REPOSITORY_PORT_TOKEN = Symbol('SalesCompanyRepositoryPort');
