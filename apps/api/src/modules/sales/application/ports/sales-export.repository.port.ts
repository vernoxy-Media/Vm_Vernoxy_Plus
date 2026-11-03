export type ExportValue = string | number | boolean | Date | null;
export type ExportRow = Record<string, ExportValue>;

export interface SalesExportRepositoryPort {
  /** Rows keyed by the column keys of EXPORT_COLUMNS, in the order of the ids. Unknown / deleted ids are left out. */
  companies(ids: number[]): Promise<ExportRow[]>;
  /** A Sales user passes their emp_id as `scope_emp_id` and gets only the leads where they are Lead By. */
  leads(ids: number[], scopeEmpId?: number): Promise<ExportRow[]>;
  followUps(ids: number[], scopeEmpId?: number): Promise<ExportRow[]>;
  contacts(companyIds: number[]): Promise<ExportRow[]>;
  /** Conversations and notes of the companies (`leadScope` limits them to the leads of that Lead By user). */
  conversations(companyIds: number[], leadScopeEmpId?: number): Promise<ExportRow[]>;
  companyIdsOfLeads(leadIds: number[]): Promise<number[]>;
}

export const SALES_EXPORT_REPOSITORY_PORT_TOKEN = Symbol('SalesExportRepositoryPort');
