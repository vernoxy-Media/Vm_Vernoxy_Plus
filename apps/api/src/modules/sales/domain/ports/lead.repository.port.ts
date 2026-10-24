export interface LeadRecord {
  lead_id: number;
  company_id: number | null;
  company_name: string | null;
  title: string | null;
  no_of_branches: number | null;
  no_of_plants: number | null;
  full_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin: string | null;
  google_maps_url: string | null;
  is_gidc: boolean | null;
  gidc_name: string | null;
  gidc_area_phase: string | null;
  contact_person: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  nature_of_business: string | null;
  industry: string | null;
  industry_id: number | null;
  products_services: string | null;
  estimated_employees: number | null;
  estimated_turnover: any;
  year_established: number | null;
  existing_major_clients: string | null;
  website: string | null;
  website_quality: string | null;
  developed_by: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  google_business_profile_url: string | null;
  brochure_url: string | null;
  lead_source: string | null;
  lead_by_id: number | null;
  service_fit: string | null;
  lead_stage: string | null;
  pipeline_stage_id: number;
  expected_value: any;
  actual_value: any;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  owner_id: number;
  employees_leads_owner_idToemployees?: {
    emp_id: number;
    name: string;
    email: string;
    mob?: string | null;
    profile_picture?: string | null;
  } | null;
  pipeline_stages?: {
    pipeline_stage_id: number;
    name: string;
    sort_order: number;
  } | null;
  companies?: {
    company_id: number;
    name: string;
  } | null;
}

export interface CreateLeadParams {
  company_name: string;
  no_of_branches?: number;
  no_of_plants?: number;
  full_address?: string;
  city?: string;
  state?: string;
  country?: string;
  pin?: string;
  google_maps_url?: string;
  is_gidc?: boolean;
  gidc_name?: string;
  gidc_area_phase?: string;
  contact_person?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  nature_of_business?: string;
  industry?: string;
  industry_id?: number;
  products_services?: string;
  estimated_employees?: number;
  estimated_turnover?: number;
  year_established?: number;
  existing_major_clients?: string;
  website?: string;
  website_quality?: string;
  developed_by?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  google_business_profile_url?: string;
  brochure_url?: string;
  lead_source: string;
  lead_by_id?: number;
  service_fit: string;
  status?: string;
}

export interface UpdateLeadParams extends CreateLeadParams {}

export interface UpdateLeadStageParams {
  status: string;
  lost_reason?: string;
  actual_value?: number;
}

export interface ListLeadsParams {
  search?: string;
  status?: string;
  is_gidc?: boolean;
  gidc_name?: string;
  lead_source?: string;
  lead_by_id?: number;
  service_fit?: string;
}

export interface StageMetrics {
  totalLeadsCount: number;
  totalPipelineValue: number;
  stageMetrics: Record<string, { count: number; totalValue: number }>;
}

export interface LeadMastersResult {
  lead_sources: { code: string; label: string }[];
  service_fits: { code: string; label: string }[];
  nature_of_business: { code: string; label: string }[];
  gidc_names: { code: string; label: string }[];
  gidc_phases: { code: string; label: string }[];
  designations: { code: string; label: string }[];
  website_qualities: { code: string; label: string }[];
  lost_reasons: { code: string; label: string }[];
  industries: { industry_id: number; name: string }[];
  sales_users: { emp_id: number; name: string; email: string }[];
  stages: { id: number; name: string; sort_order: number }[];
}

export const LEAD_REPOSITORY_TOKEN = 'LEAD_REPOSITORY_TOKEN';

export interface LeadRepositoryPort {
  list(params: ListLeadsParams): Promise<{ leads: LeadRecord[]; metrics: StageMetrics }>;
  getById(id: number): Promise<LeadRecord | null>;
  create(params: CreateLeadParams, currentEmpId: number): Promise<LeadRecord>;
  update(id: number, params: UpdateLeadParams, currentEmpId: number): Promise<LeadRecord>;
  updateStage(id: number, params: UpdateLeadStageParams, currentEmpId: number): Promise<LeadRecord>;
  convertToCompany(id: number, currentEmpId: number): Promise<{ message: string; company_id: number; company_name: string; lead: LeadRecord }>;
  delete(id: number, currentEmpId: number): Promise<void>;
  getMasters(): Promise<LeadMastersResult>;
}
