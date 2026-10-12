import { Company } from '../../domain/entities/company.entity';
import { CompanyChannel } from '../../domain/entities/company-channel.entity';
import { CompanyPerson } from '../../domain/entities/company-person.entity';

export interface CompanyListItem {
  company_id: number;
  name: string;
  customer_type: { id: number; name: string };
  industry: { id: number; name: string };
  sub_industry: { id: number; name: string } | null;
  city: string | null;
  state: string | null;
  owner: { emp_id: number; name: string } | null;
  primary_email: string | null;
  primary_phone: string | null;
  contact_count: number;
  is_active: boolean;
}

export interface ListCompaniesParams {
  q?: string;
  customer_type_id?: number;
  industry_id?: number;
  owner_id?: number;
  owner?: 'unassigned';
  is_active?: boolean;
  limit?: number;
  cursor?: string; // base64 encoded or "name:id" matching ix_companies_keyset (lower(name), company_id)
}

export interface CompanyOption {
  id: number;
  name: string;
  city: string | null;
}

export interface CompanyDuplicateMatch {
  company_id: number;
  name: string;
  city: string | null;
  reason: string;
}

export interface CompanyDetailChannel {
  channel_id: number;
  channel_type: string;
  value: string;
  label: string | null;
  is_primary: boolean;
}

export interface CompanyDetailContact {
  company_person_id: number;
  person_id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  linkedin_url: string | null;
  designation: string | null;
  department: { id: number; label: string } | null;
  is_primary: boolean;
  reports_to_company_person_id: number | null;
  linked_company_count: number;
}

export interface CompanyDetail {
  company_id: number;
  name: string;
  customer_type: { id: number; name: string };
  industry: { id: number; name: string };
  sub_industry: { id: number; name: string } | null;
  parent: { id: number; name: string } | null;
  children: Array<{ id: number; name: string }>;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  owner: { emp_id: number; name: string } | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
  channels: CompanyDetailChannel[];
  contacts: CompanyDetailContact[];
}

export interface CompanyRepositoryPort {
  list(params: ListCompaniesParams): Promise<{ items: CompanyListItem[]; next_cursor: string | null }>;
  getOptions(params: { q?: string; exclude_id?: number }): Promise<CompanyOption[]>;
  checkDuplicates(params: { name?: string; email?: string; phone?: string; website?: string }): Promise<CompanyDuplicateMatch[]>;
  getDetail(id: number): Promise<CompanyDetail | null>;
  findById(id: number, tx?: any): Promise<Company | null>;
  hasActiveChildren(id: number, tx?: any): Promise<boolean>;
  hasActiveLeads(id: number, tx?: any): Promise<boolean>;
}

export const COMPANY_REPOSITORY_PORT_TOKEN = Symbol('CompanyRepositoryPort');
