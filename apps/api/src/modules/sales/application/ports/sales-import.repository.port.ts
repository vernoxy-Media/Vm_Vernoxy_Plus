import { CompanyFields, ContactFields } from '../../domain/entities/sales-company';

/** Master values, loaded once per import so every row is checked without a query of its own. */
export interface ImportLookups {
  /** lower-case value -> canonical value (and id where the database needs it). */
  industries: Map<string, { id: number; name: string }>;
  nature_of_business: Map<string, string>;
  designation: Map<string, string>;
  gidc_names: Map<string, string>;
  gidc_areas: Map<string, string>;
  lead_sources: Map<string, { id: number; label: string }>;
  service_fits: Map<string, string>;
  /** Active Sales users and Admins, the only people a lead can be given to. */
  users: Array<{ emp_id: number; name: string; email: string | null }>;
  default_industry_id: number;
  default_customer_type_id: number;
  new_stage_id: number;
}

export interface ExistingCompany {
  company_id: number;
  company_code: string | null;
  name: string;
  matched_by: 'name_city' | 'mobile' | 'email';
}

export interface ExistingIndex {
  by_name_city: Map<string, ExistingCompany>;
  by_mobile: Map<string, ExistingCompany>;
  by_email: Map<string, ExistingCompany>;
}

export interface ImportCommitRow {
  row_number: number;
  company: CompanyFields;
  contact: ContactFields;
  industry_id: number | null;
  lead: { lead_source: string; lead_source_id: number | null; lead_by_id: number; service_fit: string[] } | null;
}

export interface CommittedRow {
  row_number: number;
  company_id: number;
  company_code: string | null;
  lead_id: number | null;
  lead_code: string | null;
}

export interface UpdateEmptyRow {
  row_number: number;
  company_id: number;
  company: CompanyFields;
  contact: ContactFields;
}

export interface UpdatedRow {
  row_number: number;
  company_id: number;
  filled: string[];
}

export interface ImportBatch {
  batch_id: number;
  job_id: string | null;
  file_name: string;
  imported_by: number;
  imported_at: Date;
  can_undo_until: Date;
  is_undone: boolean;
  undone_at: Date | null;
  companies_created: number[];
  leads_created: number[];
  companies_updated: number[];
}

export interface UndoBlocker {
  company_id: number;
  company_code: string | null;
  name: string;
  reason: string;
}

export interface SalesImportRepositoryPort {
  loadLookups(): Promise<ImportLookups>;
  findExisting(keys: { name_city: string[]; mobiles: string[]; emails: string[] }): Promise<ExistingIndex>;

  createBatch(data: { job_id: string; file_name: string; actor_emp_id: number; can_undo_until: Date }): Promise<number>;
  /** One chunk, all or nothing: the companies, their primary contacts, their leads, History and the batch ids. */
  commitChunk(data: { batch_id: number; rows: ImportCommitRow[]; default_industry_id: number; default_customer_type_id: number; new_stage_id: number; actor_emp_id: number }): Promise<CommittedRow[]>;
  /** Fills only the fields that are empty in the database; nothing filled is ever overwritten. */
  updateEmptyFields(data: { batch_id: number; rows: UpdateEmptyRow[]; actor_emp_id: number }): Promise<UpdatedRow[]>;

  getBatchByJob(jobId: string): Promise<ImportBatch | null>;
  /** Companies of the batch that got a lead, conversation, note or follow-up of their own since the import. */
  findUndoBlockers(batch: ImportBatch): Promise<UndoBlocker[]>;
  undo(data: { batch: ImportBatch; actor_emp_id: number }): Promise<{ companies_removed: number; leads_removed: number }>;

  employeeNames(ids: number[]): Promise<Map<number, string>>;
  listAdminIds(): Promise<number[]>;
}

export const SALES_IMPORT_REPOSITORY_PORT_TOKEN = Symbol('SalesImportRepositoryPort');
