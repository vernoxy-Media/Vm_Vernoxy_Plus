import { CompanyPlan } from '../../domain/services/import-history.service';

export interface HistoryCommitData {
  batch_id: number;
  actor_emp_id: number;
  company_id: number;
  /** The lead the company row created (null when the row had no lead data). */
  lead_id: number | null;
  plan: CompanyPlan;
}

export interface HistoryCommitCounts {
  contacts: number;
  interactions: number;
  follow_ups: number;
  notes: number;
  won: boolean;
}

/** Everything an import added besides companies and leads, found again for the undo. */
export interface ImportedHistoryIds {
  communications: number[];
  follow_ups: number[];
  notes: number[];
  clients: number[];
  /** Leads whose status the import set beyond "New" (so they are not "worked on since the import"). */
  leads: number[];
}

/** Saves the extra sheets of the bulk import (contacts, conversations, follow-ups, notes, won) for imported companies. */
export interface SalesImportHistoryRepositoryPort {
  /** One company, all or nothing. Throws on failure; nothing of the company's history is kept then. */
  commitCompany(data: HistoryCommitData): Promise<HistoryCommitCounts>;
  /** Removes a company the import just created when its history could not be saved, so no half-imported company stays. */
  discardCompany(data: { company_id: number; lead_id: number | null; actor_emp_id: number }): Promise<void>;
  listImported(batchId: number): Promise<ImportedHistoryIds>;
  /** The undo of everything `commitCompany` saved for the batch. */
  undo(data: { batch_id: number; company_ids: number[]; actor_emp_id: number }): Promise<{ conversations: number; follow_ups: number; notes: number; clients: number }>;
}

export const SALES_IMPORT_HISTORY_REPOSITORY_PORT_TOKEN = Symbol('SalesImportHistoryRepositoryPort');
