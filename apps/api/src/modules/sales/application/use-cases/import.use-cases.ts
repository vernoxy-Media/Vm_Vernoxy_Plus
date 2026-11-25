import * as crypto from 'crypto';
import * as path from 'path';
import { PassThrough } from 'stream';
import {
  DataTransferJob,
  FileInspectionService,
  JobIssue,
  SpreadsheetReaderPort,
  SpreadsheetWriterPort,
  TransferJobRepository,
} from '../../../data-transfer/public-api';
import { FileStoragePort, StorageValidator } from '../../../storage/public-api';
import { SalesActor } from '../ports/sales-access-policy.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import {
  CommittedRow,
  ExistingCompany,
  ImportBatch,
  ImportCommitRow,
  ImportLookups,
  SalesImportRepositoryPort,
  UpdateEmptyRow,
  UpdatedRow,
} from '../ports/sales-import.repository.port';
import { SalesImportTemplatePort } from '../ports/sales-import-template.port';
import { SalesImportHistoryRepositoryPort } from '../ports/sales-import-history.repository.port';
import {
  CompanyPlan,
  HISTORY_SHEETS,
  HistoryIssue,
  HistorySheet,
  RawSheets,
  SHEET_TITLE,
  buildHistory,
  cellReader,
} from '../../domain/services/import-history.service';
import {
  FieldError,
  FieldValidationError,
  FileProblemError,
  ForbiddenSalesError,
  ImportNotUndoableError,
  NotFoundSalesError,
  ConflictSalesError,
} from '../../domain/errors/sales.errors';
import {
  IMPORT_FIELDS,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_UNDO_WINDOW_MS,
} from '../../domain/entities/import-fields';
import {
  ColumnMapping,
  ColumnMatch,
  FileColumn,
  pickValues,
  suggestMapping,
  toMapping,
  validateMapping,
} from '../../domain/services/import-mapping.service';
import {
  ConvertedRow,
  convertRow,
  hasAnyLeadData,
  hasLeadData,
  headerOf,
  identityKeys,
} from '../../domain/services/import-row.service';

export type ExistingRowsPolicy = 'skip' | 'update_empty';
export interface ImportOptions {
  /** "Also create leads for rows that have Lead Source, Lead By and Service Fit". */
  create_leads: boolean;
  existing_rows: ExistingRowsPolicy;
}
const DEFAULT_OPTIONS: ImportOptions = { create_leads: true, existing_rows: 'skip' };

export const SALES_IMPORT_ENTITY = 'sales_import';
export const PREVIEW_VALID_MS = 24 * 60 * 60 * 1000;
const CHUNK = 250;
const MAX_ISSUES_STORED = 500;
export const MAX_ROWS_RETURNED = 200;

export interface RawRow {
  rowNumber: number;
  cells: Record<string, string>;
}

/** The Companies rows plus the optional extra sheets of a multi-sheet file (Contacts, Leads, Interactions, ...). */
interface ParsedFile {
  rows: RawRow[];
  columns: FileColumn[];
  extra: RawSheets;
}

/** What the user chose in the preview: companies to leave out, and cell values corrected before importing. */
export interface PreviewEdits {
  excluded_rows: number[];
  /** row number -> (file column key -> corrected value) */
  overrides: Record<string, Record<string, string>>;
}
export const NO_EDITS: PreviewEdits = { excluded_rows: [], overrides: {} };

/** Keeps only row numbers and column keys that exist in the file, and text values. */
export function cleanPreviewEdits(excluded: number[] | undefined, overrides: PreviewEdits['overrides'] | undefined, rows: RawRow[], columns: FileColumn[]): PreviewEdits {
  const known = new Set(rows.map((r) => r.rowNumber));
  const cols = new Set(columns.map((c) => c.key));
  const out: PreviewEdits = { excluded_rows: [...new Set((excluded ?? []).filter((n) => known.has(n)))], overrides: {} };
  for (const [row, cells] of Object.entries(overrides ?? {})) {
    if (!known.has(Number(row))) continue;
    const kept: Record<string, string> = {};
    for (const [col, v] of Object.entries(cells ?? {})) if (cols.has(col) && typeof v === 'string') kept[col] = v.trim().slice(0, 2000);
    if (Object.keys(kept).length > 0) out.overrides[row] = kept;
  }
  return out;
}
export interface SheetData {
  name: string;
  headers: Array<{ key: string; header: string; width: number }>;
  data: Array<Record<string, unknown>>;
}
const MAX_EXTRA_SHEET_ROWS = 10_000;

export interface PreviewRow {
  row: number;
  company_key: string | null;
  company: string;
  city: string | null;
  status: 'ready' | 'existing' | 'error';
  problems: string[];
  warnings: string[];
  /** Contacts, conversations, follow-ups, notes (and client) coming with this company from the extra sheets. */
  includes: { contacts: number; interactions: number; follow_ups: number; notes: number; client: boolean; lead_status: string | null };
  /** File column key -> value, so a value can be corrected in the preview. */
  cells: Record<string, string>;
}

export interface HistoryTotals {
  contacts: number;
  interactions: number;
  follow_ups: number;
  notes: number;
  clients: number;
}
const emptyTotals = (): HistoryTotals => ({ contacts: 0, interactions: 0, follow_ups: 0, notes: 0, clients: 0 });

export interface RowOutcome {
  row_number: number;
  company_name: string;
  /** The Company Key of the row (multi-sheet files), or null. */
  company_key?: string | null;
  /** What the extra sheets say about this company, when the file has any. */
  plan?: CompanyPlan | null;
  /** The cells of the row as checked (after preview corrections), for the preview table. */
  cells?: Record<string, string>;
  status: 'ready' | 'existing' | 'error';
  errors: FieldError[];
  warnings: string[];
  existing: ExistingCompany | null;
  /** The row will also get a lead (all three lead fields present, valid, and "create leads" ticked). */
  commit: ImportCommitRow | null;
  converted: ConvertedRow;
}

export interface CheckResult {
  job_id: string;
  summary: { total: number; ready: number; already_in_database: number; with_errors: number };
  /** Companies that will be created and how many of them also get a lead. */
  will_create: { companies: number; leads: number } & HistoryTotals;
  will_fill: number;
  /** Multi-sheet files: rows read per sheet, and every problem found on the extra sheets. */
  sheets: Array<{ name: string; rows: number }>;
  extra_issues: HistoryIssue[];
  extra_issues_truncated: boolean;
  /** The companies of the file for the preview table: rows with problems first, at most 200. */
  preview: PreviewRow[];
  preview_truncated: boolean;
  /** Companies the user left out of this import, and the cell corrections made in the preview. */
  edits: PreviewEdits;
  errors: Array<{ row: number; company: string | null; field: string; problem: string }>;
  errors_truncated: boolean;
  existing: Array<{ row: number; company: string; matched_company_id: number; matched_company_code: string | null; matched_by: string }>;
  warnings: Array<{ row: number; message: string }>;
  mapping: ColumnMapping;
  options: ImportOptions;
  can_import: boolean;
}

export interface UploadResult extends CheckResult {
  file: { name: string | null; rows: number; format: 'xlsx' | 'csv' };
  columns: ColumnMatch[];
  fields: Array<{ key: string; header: string; group: 'company' | 'lead'; required: boolean; system: boolean }>;
}

export interface ImportResult {
  job_id: string;
  status: 'completed' | 'completed_with_errors' | 'failed';
  companies_created: number;
  companies_updated: number;
  leads_created: number;
  /** Contacts, conversations, follow-ups, notes and clients saved from the extra sheets. */
  history: HistoryTotals;
  skipped_existing: number;
  rows_with_errors: number;
  rows_failed: number;
  batch: { batch_id: number; can_undo_until: Date };
  row_results: Array<{ row: number; company: string; status: 'created' | 'updated' | 'skipped' | 'error' | 'failed'; company_code?: string | null; lead_code?: string | null; message?: string }>;
}

export const streamToBuffer = async (s: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c as string));
  return Buffer.concat(chunks);
};

/** Company Database / Leads import (BFD section 3, Part 2). */
export class ImportUseCases {
  constructor(
    private readonly repo: SalesImportRepositoryPort,
    private readonly template: SalesImportTemplatePort,
    private readonly jobs: TransferJobRepository,
    private readonly storage: FileStoragePort,
    private readonly inspection: FileInspectionService,
    private readonly readers: { xlsx: SpreadsheetReaderPort; csv: SpreadsheetReaderPort },
    private readonly writers: { xlsx: SpreadsheetWriterPort; csv: SpreadsheetWriterPort },
    private readonly notifier: SalesNotifierPort,
    /** Saves the extra sheets of a multi-sheet file. Without it only the Companies sheet is imported, as before. */
    private readonly historyRepo?: SalesImportHistoryRepositoryPort,
  ) {}

  // ------------------------------------------------------------- template ----

  async downloadTemplate(format: 'xlsx' | 'csv'): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const buffer = await this.template.build(format, await this.repo.loadLookups());
    return {
      buffer,
      filename: `sales-import-template.${format}`,
      contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
    };
  }

  // --------------------------------------------------------------- upload ----

  /** Steps 1 and 2 of the pop-up: Upload file, Match columns. The result already shows what the automatic matching gives. */
  async upload(file: Buffer, originalFilename: string | undefined, actor: SalesActor, now = new Date()): Promise<UploadResult> {
    if (!file || file.length === 0) throw new FileProblemError('The file is empty.', 'FILE_EMPTY', 422);
    if (file.length > IMPORT_MAX_BYTES) {
      throw new FileProblemError('The file is bigger than 5 MB. Split it into smaller files.', 'FILE_TOO_LARGE', 413);
    }
    const format = this.detectFormat(file, originalFilename);
    const { rows, columns, extra } = await this.parse(file, format);
    if (rows.length === 0) throw new FileProblemError('The file has no rows to import.', 'FILE_NO_ROWS', 422);
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new FileProblemError(`The file has ${rows.length} rows. An import can have up to ${IMPORT_MAX_ROWS.toLocaleString('en-US')} rows.`, 'TOO_MANY_ROWS', 422);
    }

    const fileKey = StorageValidator.generateStorageKey(format);
    await this.storage.put(fileKey, file, format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', 'imports');
    const safeName = originalFilename ? path.basename(originalFilename).replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 255) : null;

    const matches = suggestMapping(columns);
    const job = await this.jobs.create(
      new DataTransferJob({
        jobId: crypto.randomUUID(),
        direction: 'import',
        entityType: SALES_IMPORT_ENTITY,
        format,
        status: 'previewed',
        originalFilename: safeName,
        fileKey,
        fileSha256: crypto.createHash('sha256').update(file).digest('hex'),
        fileSizeBytes: file.length,
        options: { columns, mapping: toMapping(matches), ...DEFAULT_OPTIONS },
        expiresAt: new Date(now.getTime() + PREVIEW_VALID_MS),
        createdBy: actor.emp_id,
      }),
    );

    const check = await this.runCheck(job, rows, toMapping(matches), DEFAULT_OPTIONS, extra, NO_EDITS);
    return {
      ...check,
      file: { name: safeName, rows: rows.length, format },
      columns: matches,
      fields: IMPORT_FIELDS.map((f) => ({ key: f.key, header: f.header, group: f.group, required: f.required === true, system: f.system === true })),
    };
  }

  // ---------------------------------------------------------------- check ----

  /** Step 3 "Check and import": every row is checked with the same rules as the Add Company form. */
  async check(
    jobId: string,
    input: { mapping?: ColumnMapping; create_leads?: boolean; existing_rows?: ExistingRowsPolicy; excluded_rows?: number[]; overrides?: PreviewEdits['overrides'] },
    actor: SalesActor,
  ): Promise<CheckResult> {
    const job = await this.openJob(jobId, actor);
    const { rows, columns, extra } = await this.loadRows(job);
    const mapping = input.mapping ?? (job.options.mapping as ColumnMapping);
    const errors = validateMapping(mapping, columns);
    if (errors.length > 0) throw new FieldValidationError(errors);
    const options: ImportOptions = {
      create_leads: input.create_leads ?? (job.options.create_leads as boolean) ?? DEFAULT_OPTIONS.create_leads,
      existing_rows: input.existing_rows ?? (job.options.existing_rows as ExistingRowsPolicy) ?? DEFAULT_OPTIONS.existing_rows,
    };
    const edits = this.cleanEdits(input.excluded_rows ?? (job.options.excluded_rows as number[] | undefined), input.overrides ?? (job.options.overrides as PreviewEdits['overrides'] | undefined), rows, columns);
    return this.runCheck(job, rows, mapping, options, extra, edits);
  }

  /** Keeps only row numbers and column keys that exist in the file, and text values. */
  private cleanEdits(excluded: number[] | undefined, overrides: PreviewEdits['overrides'] | undefined, rows: RawRow[], columns: FileColumn[]): PreviewEdits {
    return cleanPreviewEdits(excluded, overrides, rows, columns);
  }

  // -------------------------------------------------------------- confirm ----

  /**
   * "Import N companies". Runs now, in this request (the limit is 1,000 rows): error rows are never imported,
   * rows already in the database are skipped or have only their empty fields filled, and each chunk is saved
   * all or nothing. The result is kept in History and the Admin is told.
   */
  async confirm(jobId: string, actor: SalesActor, now = new Date()): Promise<ImportResult> {
    const job = await this.openJob(jobId, actor);
    const { rows, extra, columns } = await this.loadRows(job);
    const mapping = job.options.mapping as ColumnMapping;
    const options: ImportOptions = {
      create_leads: (job.options.create_leads as boolean) ?? DEFAULT_OPTIONS.create_leads,
      existing_rows: (job.options.existing_rows as ExistingRowsPolicy) ?? DEFAULT_OPTIONS.existing_rows,
    };
    const edits = this.cleanEdits(job.options.excluded_rows as number[] | undefined, job.options.overrides as PreviewEdits['overrides'] | undefined, rows, columns);

    // Checked again right now: someone may have added a company since the last check.
    const outcomes = (await this.analyze(rows, mapping, options, extra, edits)).outcomes;
    const ready = outcomes.filter((o) => o.status === 'ready');
    const existing = outcomes.filter((o) => o.status === 'existing');
    const toFill = options.existing_rows === 'update_empty' ? existing : [];
    if (ready.length + toFill.length === 0) {
      throw new FieldValidationError([{ field: 'file', message: 'There is nothing to import: every row is already in the database or has an error.' }]);
    }

    await this.jobs.updateStatus(job.jobId, 'running', { startedAt: now });
    const lookups = await this.repo.loadLookups();
    const batchId = await this.repo.createBatch({
      job_id: job.jobId,
      file_name: job.originalFilename ?? 'import',
      actor_emp_id: actor.emp_id,
      can_undo_until: new Date(now.getTime() + IMPORT_UNDO_WINDOW_MS),
    });

    const results: ImportResult['row_results'] = [];
    for (const o of outcomes.filter((x) => x.status === 'error')) {
      results.push({ row: o.row_number, company: o.company_name, status: 'error', message: o.errors.map((e) => `${e.field}: ${e.message}`).join(' | ') });
    }
    let created = 0;
    let leads = 0;
    let failed = 0;
    const totals = emptyTotals();

    for (let i = 0; i < ready.length; i += CHUNK) {
      const slice = ready.slice(i, i + CHUNK);
      const commitRows = slice.map((o) => o.commit as ImportCommitRow);
      const saved = await this.commit(batchId, commitRows, lookups, actor, results, slice);
      failed += slice.length - saved.length;
      for (const s of saved) {
        const o = slice.find((x) => x.row_number === s.row_number)!;
        let note: string | undefined;
        if (o.plan && this.historyRepo) {
          // The extra sheets of this company, all or nothing; if they cannot be saved the company is removed again.
          try {
            if (o.plan.lead && s.lead_id === null) throw new Error('The lead of this company could not be created.');
            const c = await this.historyRepo.commitCompany({ batch_id: batchId, actor_emp_id: actor.emp_id, company_id: s.company_id, lead_id: s.lead_id, plan: o.plan });
            totals.contacts += c.contacts;
            totals.interactions += c.interactions;
            totals.follow_ups += c.follow_ups;
            totals.notes += c.notes;
            totals.clients += c.won ? 1 : 0;
            const parts = [c.contacts && `${c.contacts} contacts`, c.interactions && `${c.interactions} conversations`, c.follow_ups && `${c.follow_ups} follow-ups`, c.notes && `${c.notes} notes`, c.won && 'client'].filter(Boolean);
            if (parts.length > 0) note = `Also saved: ${parts.join(', ')}.`;
          } catch (err) {
            await this.historyRepo.discardCompany({ company_id: s.company_id, lead_id: s.lead_id, actor_emp_id: actor.emp_id }).catch(() => undefined);
            failed++;
            results.push({ row: s.row_number, company: o.company_name, status: 'failed', message: `Not imported: ${err instanceof Error ? err.message.slice(0, 250) : 'its contacts, conversations, follow-ups or notes could not be saved.'}` });
            continue;
          }
        }
        created++;
        if (s.lead_id !== null) leads++;
        results.push({ row: s.row_number, company: o.company_name, status: 'created', company_code: s.company_code, lead_code: s.lead_code, message: note });
      }
    }

    let updated = 0;
    if (toFill.length > 0) {
      const filled: UpdatedRow[] = await this.repo.updateEmptyFields({
        batch_id: batchId,
        actor_emp_id: actor.emp_id,
        rows: toFill.map((o): UpdateEmptyRow => ({ row_number: o.row_number, company_id: (o.existing as ExistingCompany).company_id, company: o.converted.company, contact: o.converted.contact })),
      });
      updated = filled.filter((f) => f.filled.length > 0).length;
      for (const o of toFill) {
        const f = filled.find((x) => x.row_number === o.row_number);
        results.push({
          row: o.row_number, company: o.company_name, status: f && f.filled.length > 0 ? 'updated' : 'skipped',
          company_code: o.existing?.company_code ?? null,
          message: f && f.filled.length > 0 ? `Filled: ${f.filled.join(', ')}` : 'Nothing to fill; all fields already have a value.',
        });
      }
    }
    const skippedExisting = existing.length - updated;
    for (const o of existing.filter((x) => options.existing_rows === 'skip')) {
      results.push({ row: o.row_number, company: o.company_name, status: 'skipped', company_code: o.existing?.company_code ?? null, message: `Already in the database as ${o.existing?.company_code ?? 'a company'}.` });
    }

    const errorRows = outcomes.filter((o) => o.status === 'error').length;
    const status: ImportResult['status'] = created + updated === 0 && failed > 0 ? 'failed' : failed > 0 || errorRows > 0 ? 'completed_with_errors' : 'completed';
    const batch = await this.repo.getBatchByJob(job.jobId);
    const summary = { companies_created: created, companies_updated: updated, leads_created: leads, history: totals, skipped_existing: skippedExisting, rows_with_errors: errorRows, rows_failed: failed };

    results.sort((a, b) => a.row - b.row);
    job.options = { ...job.options, result: summary, row_results: results, batch_id: batchId, undo_until: batch?.can_undo_until?.toISOString() };
    await this.jobs.update(job);
    await this.jobs.updateProgress(job.jobId, {
      totalRows: outcomes.length,
      validRows: ready.length,
      errorRows,
      processedRows: outcomes.length,
      createdRows: created + updated,
      skippedRows: skippedExisting + errorRows,
      failedRows: failed,
    });
    await this.jobs.updateStatus(job.jobId, status, { finishedAt: new Date() });

    await this.tellAdmins(job, actor, summary);
    return {
      job_id: job.jobId,
      status,
      ...summary,
      batch: { batch_id: batchId, can_undo_until: batch?.can_undo_until ?? new Date(now.getTime() + IMPORT_UNDO_WINDOW_MS) },
      row_results: results,
    };
  }

  /** One chunk. If it cannot be saved as a whole (a race with someone else), its rows are tried one by one. */
  private async commit(
    batchId: number,
    rows: ImportCommitRow[],
    lookups: ImportLookups,
    actor: SalesActor,
    results: ImportResult['row_results'],
    outcomes: RowOutcome[],
  ): Promise<CommittedRow[]> {
    const base = { batch_id: batchId, default_industry_id: lookups.default_industry_id, default_customer_type_id: lookups.default_customer_type_id, new_stage_id: lookups.new_stage_id, actor_emp_id: actor.emp_id };
    try {
      return await this.repo.commitChunk({ ...base, rows });
    } catch {
      const saved: CommittedRow[] = [];
      for (const r of rows) {
        try {
          saved.push(...(await this.repo.commitChunk({ ...base, rows: [r] })));
        } catch (err) {
          const o = outcomes.find((x) => x.row_number === r.row_number);
          results.push({ row: r.row_number, company: o?.company_name ?? '', status: 'failed', message: err instanceof Error ? err.message.slice(0, 300) : 'The row could not be saved.' });
        }
      }
      return saved;
    }
  }

  private async tellAdmins(job: DataTransferJob, actor: SalesActor, s: { companies_created: number; companies_updated: number; leads_created: number }) {
    try {
      const [admins, names] = await Promise.all([this.repo.listAdminIds(), this.repo.employeeNames([actor.emp_id])]);
      const who = names.get(actor.emp_id) ?? 'A colleague';
      const filled = s.companies_updated > 0 ? `, ${s.companies_updated} updated` : '';
      const leads = s.leads_created > 0 ? ` and ${s.leads_created} leads` : '';
      await this.notifier.send(
        admins
          .filter((a) => a !== actor.emp_id)
          .map((to) => ({
            recipient_emp_id: to,
            kind: 'import_completed',
            title: 'Import finished',
            body: `${who} imported ${s.companies_created} companies${leads}${filled} from ${job.originalFilename ?? 'a file'}.`,
            entity_type: null,
            entity_id: null,
            created_by: actor.emp_id,
          })),
      );
    } catch {
      /* best effort */
    }
  }

  // ---------------------------------------------------------- error rows ----

  /** "Download error rows to fix and re-import": the rows with a problem, as they were in the file, plus the Problem. */
  async errorRows(jobId: string, format: 'xlsx' | 'csv', actor: SalesActor): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const job = await this.findJob(jobId, actor);
    const { rows, columns, extra } = await this.loadRows(job);
    const mapping = (job.options.mapping as ColumnMapping) ?? toMapping(suggestMapping(columns));
    const options: ImportOptions = { create_leads: (job.options.create_leads as boolean) ?? true, existing_rows: (job.options.existing_rows as ExistingRowsPolicy) ?? 'skip' };
    const edits = this.cleanEdits(job.options.excluded_rows as number[] | undefined, job.options.overrides as PreviewEdits['overrides'] | undefined, rows, columns);
    const analysis = await this.analyze(rows, mapping, options, extra, edits);
    const outcomes = analysis.outcomes.filter((o) => o.status === 'error');
    const byRow = new Map(rows.map((r) => [r.rowNumber, r]));

    const headers = [
      ...columns.map((c) => ({ key: c.key, header: c.header, width: 20 })),
      { key: '__problem', header: 'Problem', width: 60 },
    ];
    const data = outcomes.map((o) => ({
      ...(byRow.get(o.row_number)?.cells ?? {}),
      __problem: o.errors.map((e) => `${e.field}: ${e.message}`).join(' | '),
    }));
    const sheets: SheetData[] = [{ name: 'Companies', headers, data }];
    if (analysis.extraIssues.length > 0 && format === 'xlsx') {
      sheets.push({
        name: 'Issues',
        headers: [{ key: 'sheet', header: 'Sheet', width: 16 }, { key: 'row', header: 'Row', width: 8 }, { key: 'company_key', header: 'Company Key', width: 16 }, { key: 'field', header: 'Field', width: 24 }, { key: 'severity', header: 'Type', width: 10 }, { key: 'message', header: 'Problem', width: 80 }],
        data: analysis.extraIssues.map((i) => ({ ...i })),
      });
    }
    return {
      buffer: await this.writeSheets(sheets, format),
      filename: `import-error-rows.${format}`,
      contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
    };
  }

  private async writeSheets(sheets: SheetData[], format: 'xlsx' | 'csv'): Promise<Buffer> {
    const out = new PassThrough();
    const sink = streamToBuffer(out);
    await this.writers[format].writeWorkbookStream(
      sheets.map((s) => ({ name: s.name, headers: s.headers })),
      new Map(sheets.map((s) => [s.name, async function* () { yield s.data; }])),
      format,
      out,
    );
    out.end();
    return sink;
  }

  // ------------------------------------------------------------- reports ----

  /**
   * "Download failed records / successful records / import summary" for a finished import. Built from the row results
   * kept with the job, so it shows exactly what was reported at the end of the import.
   */
  async report(jobId: string, kind: 'success' | 'failed' | 'summary', format: 'xlsx' | 'csv', actor: SalesActor): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const job = await this.findJob(jobId, actor);
    if (!['completed', 'completed_with_errors', 'failed'].includes(job.status)) {
      throw new ConflictSalesError('This import has not finished yet, so there is no report.', 'IMPORT_NOT_FINISHED');
    }
    const results = (job.options.row_results as ImportResult['row_results'] | undefined) ?? [];
    const rowHeaders = [
      { key: 'row', header: 'Row', width: 8 }, { key: 'company', header: 'Company', width: 34 }, { key: 'status', header: 'Result', width: 12 },
      { key: 'company_code', header: 'Company ID', width: 14 }, { key: 'lead_code', header: 'Lead ID', width: 14 }, { key: 'message', header: 'Details', width: 80 },
    ];
    const rows = (list: ImportResult['row_results']) => list.map((r) => ({ row: r.row, company: r.company, status: r.status, company_code: r.company_code ?? '', lead_code: r.lead_code ?? '', message: r.message ?? '' }));
    let sheets: SheetData[];
    if (kind === 'success') {
      sheets = [{ name: 'Imported', headers: rowHeaders, data: rows(results.filter((r) => r.status === 'created' || r.status === 'updated')) }];
    } else if (kind === 'failed') {
      sheets = [{ name: 'Not imported', headers: rowHeaders, data: rows(results.filter((r) => r.status === 'error' || r.status === 'failed' || r.status === 'skipped')) }];
    } else {
      const r = (job.options.result as Record<string, unknown> | undefined) ?? {};
      const h = (r.history as HistoryTotals | undefined) ?? emptyTotals();
      const lines: Array<[string, unknown]> = [
        ['File', job.originalFilename ?? ''], ['Status', job.status.replace(/_/g, ' ')], ['Started', job.startedAt?.toISOString() ?? ''], ['Finished', job.finishedAt?.toISOString() ?? ''],
        ['Rows in the Companies sheet', job.totalRows], ['Companies created', r.companies_created ?? 0], ['Companies updated', r.companies_updated ?? 0], ['Leads created', r.leads_created ?? 0],
        ['Contacts added', h.contacts], ['Conversations saved', h.interactions], ['Follow-ups saved', h.follow_ups], ['Notes saved', h.notes], ['Clients created', h.clients],
        ['Skipped (already in the database)', r.skipped_existing ?? 0], ['Rows with errors (not imported)', r.rows_with_errors ?? 0], ['Rows that could not be saved', r.rows_failed ?? 0],
      ];
      sheets = [{ name: 'Summary', headers: [{ key: 'item', header: 'Item', width: 40 }, { key: 'value', header: 'Value', width: 50 }], data: lines.map(([item, value]) => ({ item, value })) }];
    }
    return {
      buffer: await this.writeSheets(sheets, format),
      filename: `import-${kind}.${format}`,
      contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
    };
  }

  // ---------------------------------------------------------------- undo ----

  /** The Admin can undo an import within 24 hours if nothing was added to the imported companies since. */
  async undo(jobId: string, actor: SalesActor, now = new Date()) {
    if (!actor.is_admin) throw new ForbiddenSalesError('Only the Admin can undo an import.');
    const batch = await this.repo.getBatchByJob(jobId);
    if (!batch) throw new NotFoundSalesError('This import has nothing to undo.', 'IMPORT_NOT_FOUND', 'job_id');
    if (batch.is_undone) throw new ConflictSalesError('This import was already undone.', 'IMPORT_ALREADY_UNDONE');
    if (now.getTime() > batch.can_undo_until.getTime()) {
      throw new ImportNotUndoableError('An import can be undone only within 24 hours.');
    }
    // What the import itself saved from the extra sheets is not "work done since the import".
    const imported = this.historyRepo ? await this.historyRepo.listImported(batch.batch_id) : undefined;
    const blockers = await this.repo.findUndoBlockers(batch, imported);
    if (blockers.length > 0) {
      throw new ImportNotUndoableError(
        `${blockers.length} imported ${blockers.length === 1 ? 'company has' : 'companies have'} a lead, conversation, note or follow-up of their own since the import, so it cannot be undone.`,
        blockers,
      );
    }
    const removed = await this.repo.undo({ batch, actor_emp_id: actor.emp_id });
    const extra = this.historyRepo ? await this.historyRepo.undo({ batch_id: batch.batch_id, company_ids: batch.companies_created, actor_emp_id: actor.emp_id }) : null;
    return { ...removed, ...(extra ?? {}) };
  }

  // ------------------------------------------------------------- history ----

  async history(actor: SalesActor, limit = 50) {
    const types = [SALES_IMPORT_ENTITY, 'sales_export_companies', 'sales_export_leads', 'sales_export_follow_ups'];
    const found = (await Promise.all(types.map((t) => this.jobs.findRecentJobs(t, limit)))).flatMap((r) => r.jobs);
    const mine = found.filter((j) => j.status !== 'previewed' && (actor.is_admin || j.createdBy === actor.emp_id));
    mine.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const page = mine.slice(0, limit);
    const names = await this.repo.employeeNames([...new Set(page.map((j) => j.createdBy).filter((x): x is number => x !== null))]);
    const batches = await Promise.all(page.map((j) => (j.direction === 'import' ? this.repo.getBatchByJob(j.jobId) : Promise.resolve(null))));
    const now = Date.now();
    return page.map((j, i) => {
      const b: ImportBatch | null = batches[i];
      return {
        job_id: j.jobId,
        kind: j.direction,
        entity: j.entityType,
        status: j.status,
        by: j.createdBy ? { emp_id: j.createdBy, name: names.get(j.createdBy) ?? '' } : null,
        at: j.createdAt,
        file_name: j.originalFilename,
        format: j.format,
        rows: j.totalRows,
        counts: { created: j.createdRows, skipped: j.skippedRows, failed: j.failedRows, errors: j.errorRows },
        result: (j.options.result as Record<string, number> | undefined) ?? null,
        list: j.direction === 'export' ? ((j.options.list as string | undefined) ?? null) : null,
        filters: j.direction === 'export' ? ((j.options.filters as Record<string, unknown> | undefined) ?? {}) : null,
        undo: b ? { can_undo: !b.is_undone && now <= b.can_undo_until.getTime(), until: b.can_undo_until, undone: b.is_undone } : null,
      };
    });
  }

  async getJob(jobId: string, actor: SalesActor) {
    const job = await this.findJob(jobId, actor);
    const batch = await this.repo.getBatchByJob(jobId);
    return {
      job_id: job.jobId, status: job.status, file_name: job.originalFilename, rows: job.totalRows,
      counts: { ready: job.validRows, errors: job.errorRows, created: job.createdRows, skipped: job.skippedRows, failed: job.failedRows },
      options: { create_leads: job.options.create_leads, existing_rows: job.options.existing_rows },
      result: job.options.result ?? null,
      row_results: job.options.row_results ?? [],
      batch: batch ? { batch_id: batch.batch_id, can_undo_until: batch.can_undo_until, undone: batch.is_undone } : null,
      created_at: job.createdAt,
    };
  }

  // ------------------------------------------------------------- helpers ----

  private async findJob(jobId: string, actor: SalesActor): Promise<DataTransferJob> {
    const job = await this.jobs.findById(jobId);
    if (!job || job.entityType !== SALES_IMPORT_ENTITY || job.direction !== 'import') {
      throw new NotFoundSalesError('Import not found', 'IMPORT_NOT_FOUND', 'job_id');
    }
    if (!actor.is_admin && job.createdBy !== actor.emp_id) throw new ForbiddenSalesError('This import was started by someone else.');
    return job;
  }

  /** A job that can still be checked and imported: previewed, not expired. */
  private async openJob(jobId: string, actor: SalesActor): Promise<DataTransferJob> {
    const job = await this.findJob(jobId, actor);
    if (job.isExpired()) throw new ConflictSalesError('This upload has expired. Upload the file again.', 'IMPORT_EXPIRED');
    if (job.status !== 'previewed') throw new ConflictSalesError(`This import is already ${job.status.replace(/_/g, ' ')}.`, 'IMPORT_NOT_OPEN');
    return job;
  }

  private detectFormat(file: Buffer, name?: string): 'xlsx' | 'csv' {
    try {
      return this.inspection.inspectAndDetectFormat(file, name);
    } catch (err) {
      const e = err as { message: string; statusCode?: 413 | 415 | 422; code?: string };
      throw new FileProblemError(e.message, e.code ?? 'FILE_INVALID', e.statusCode ?? 422);
    }
  }

  private async parse(file: Buffer, format: 'xlsx' | 'csv'): Promise<ParsedFile> {
    let parsed;
    try {
      parsed = await this.readers[format].parseWorkbook(file, format, { phoneColumns: ['mobile', 'phone', 'pin'], maxColumns: 60, maxCellLength: 2000 });
    } catch (err) {
      const e = err as { message: string; statusCode?: 413 | 415 | 422; code?: string };
      throw new FileProblemError(e.message ?? 'The file could not be read.', e.code ?? 'FILE_INVALID', e.statusCode ?? 422);
    }
    if (parsed.fileErrors.length > 0) throw new FileProblemError(parsed.fileErrors.map((f) => f.message).join(' '), parsed.fileErrors[0].code, 422);
    // The "Companies" sheet when there is one, otherwise the first sheet.
    const sheet = [...parsed.sheets.entries()].find(([n]) => n.toLowerCase() === 'companies') ?? [...parsed.sheets.entries()][0];
    const sheetRows = sheet ? sheet[1] : [];
    const first = sheetRows[0];
    const keys = first ? Object.keys(first.cells) : [];

    // The extra sheets of a multi-sheet file (Contacts, Leads, Interactions, Follow-ups, Won, Notes). All optional.
    const extra: RawSheets = {};
    for (const [name, list] of parsed.sheets.entries()) {
      const wanted = HISTORY_SHEETS.find((h) => h === name.trim().toLowerCase());
      if (!wanted) continue;
      if (list.length > MAX_EXTRA_SHEET_ROWS) {
        throw new FileProblemError(`The ${name} sheet has ${list.length} rows. A sheet can have up to ${MAX_EXTRA_SHEET_ROWS.toLocaleString('en-US')} rows.`, 'TOO_MANY_ROWS', 422);
      }
      extra[wanted] = list.map((r) => ({ rowNumber: r.rowNumber, cells: r.cells }));
    }
    return {
      rows: sheetRows.map((r) => ({ rowNumber: r.rowNumber, cells: r.cells })),
      columns: keys.map((k) => ({ key: k, header: k.replace(/_/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase()) })),
      extra,
    };
  }

  private async loadRows(job: DataTransferJob): Promise<ParsedFile> {
    if (!job.fileKey) throw new NotFoundSalesError('The uploaded file is missing.', 'IMPORT_FILE_MISSING', 'job_id');
    const buffer = await streamToBuffer(await this.storage.openReadStream(job.fileKey, 'imports'));
    return this.parse(buffer, job.format);
  }

  private async runCheck(job: DataTransferJob, rows: RawRow[], mapping: ColumnMapping, options: ImportOptions, extra: RawSheets, edits: PreviewEdits): Promise<CheckResult> {
    const { outcomes, extraIssues } = await this.analyze(rows, mapping, options, extra, edits);
    const result = this.summarize(job.jobId, outcomes, mapping, options, extra, edits, extraIssues);

    const issues: JobIssue[] = [];
    for (const o of outcomes) {
      for (const e of o.errors) issues.push({ row: o.row_number, sheet: 'Companies', severity: 'error', code: 'ROW_INVALID', message: e.message, field: e.field });
    }
    job.totalRows = result.summary.total;
    job.validRows = result.summary.ready;
    job.errorRows = result.summary.with_errors;
    job.options = {
      ...job.options,
      mapping,
      ...options,
      excluded_rows: edits.excluded_rows,
      overrides: edits.overrides,
      issues: issues.slice(0, MAX_ISSUES_STORED),
      duplicates_count: result.summary.already_in_database,
      summary: result.summary,
    };
    await this.jobs.update(job);
    return result;
  }

  private summarize(jobId: string, outcomes: RowOutcome[], mapping: ColumnMapping, options: ImportOptions, extra: RawSheets, edits: PreviewEdits, extraIssues: HistoryIssue[]): CheckResult {
    const ready = outcomes.filter((o) => o.status === 'ready');
    const plans = ready.map((o) => o.plan).filter((p): p is CompanyPlan => !!p);
    const history: HistoryTotals = {
      contacts: plans.reduce((n, p) => n + p.contacts.filter((c) => !c.is_primary).length, 0),
      interactions: plans.reduce((n, p) => n + p.interactions.length, 0),
      follow_ups: plans.reduce((n, p) => n + p.follow_ups.length, 0),
      notes: plans.reduce((n, p) => n + p.notes.length, 0),
      clients: plans.filter((p) => p.won).length,
    };
    const existing = outcomes.filter((o) => o.status === 'existing');
    const bad = outcomes.filter((o) => o.status === 'error');
    const errorList = bad.flatMap((o) => o.errors.map((e) => ({ row: o.row_number, company: o.company_name || null, field: e.field, problem: e.message })));
    const willFill = options.existing_rows === 'update_empty' ? existing.length : 0;
    return {
      job_id: jobId,
      summary: { total: outcomes.length, ready: ready.length, already_in_database: existing.length, with_errors: bad.length },
      will_create: { companies: ready.length, leads: ready.filter((o) => o.commit?.lead).length, ...history },
      will_fill: willFill,
      sheets: [{ name: 'Companies', rows: outcomes.length + edits.excluded_rows.length }, ...Object.entries(extra).map(([name, list]) => ({ name: SHEET_TITLE[name as HistorySheet], rows: (list ?? []).length }))],
      extra_issues: extraIssues.slice(0, MAX_ROWS_RETURNED),
      extra_issues_truncated: extraIssues.length > MAX_ROWS_RETURNED,
      preview: [...outcomes]
        .sort((a, b) => Number(b.status === 'error') - Number(a.status === 'error') || a.row_number - b.row_number)
        .slice(0, MAX_ROWS_RETURNED)
        .map((o): PreviewRow => ({
          row: o.row_number,
          company_key: o.company_key ?? null,
          company: o.company_name,
          city: o.converted.company.city,
          status: o.status,
          problems: o.errors.map((e) => `${e.field}: ${e.message}`),
          warnings: o.warnings,
          includes: {
            contacts: o.plan ? o.plan.contacts.filter((c) => !c.is_primary).length : 0,
            interactions: o.plan?.interactions.length ?? 0,
            follow_ups: o.plan?.follow_ups.length ?? 0,
            notes: o.plan?.notes.length ?? 0,
            client: !!o.plan?.won,
            lead_status: o.plan?.lead?.stage ?? null,
          },
          cells: o.cells ?? {},
        })),
      preview_truncated: outcomes.length > MAX_ROWS_RETURNED,
      edits,
      errors: errorList.slice(0, MAX_ROWS_RETURNED),
      errors_truncated: errorList.length > MAX_ROWS_RETURNED,
      existing: existing.slice(0, MAX_ROWS_RETURNED).map((o) => ({
        row: o.row_number, company: o.company_name, matched_company_id: (o.existing as ExistingCompany).company_id,
        matched_company_code: o.existing?.company_code ?? null, matched_by: o.existing?.matched_by ?? '',
      })),
      warnings: outcomes.flatMap((o) => o.warnings.map((message) => ({ row: o.row_number, message }))).slice(0, MAX_ROWS_RETURNED),
      mapping,
      options,
      can_import: ready.length + willFill > 0,
    };
  }

  // -------------------------------------------------------------- analysis ----

  /** Converts and checks every row: the form rules, the masters, duplicates in the file and in the database. */
  async analyze(
    allRows: RawRow[],
    mapping: ColumnMapping,
    options: ImportOptions,
    extra: RawSheets = {},
    edits: PreviewEdits = NO_EDITS,
  ): Promise<{ outcomes: RowOutcome[]; extraIssues: HistoryIssue[] }> {
    const lookups = await this.repo.loadLookups();

    // Corrections made in the preview replace the cell values; excluded companies are left out altogether.
    const excluded = new Set(edits.excluded_rows);
    const corrected = allRows.map((r) => {
      const fix = edits.overrides[String(r.rowNumber)];
      return fix ? { rowNumber: r.rowNumber, cells: { ...r.cells, ...fix } } : r;
    });

    // Multi-sheet files: what the extra sheets say about each company, found through its Company Key.
    const hasExtra = Object.values(extra).some((list) => list && list.length > 0);
    const keyed = new Map<string, { row: number }>();
    const keyOfRow = new Map<number, string>();
    const dupKeyErrors = new Map<number, string>();
    if (hasExtra) {
      for (const r of corrected) {
        const key = cellReader(r.cells)('Company Key');
        if (!key) continue;
        if (keyed.has(key)) dupKeyErrors.set(r.rowNumber, `The Company Key "${key}" is already used in row ${keyed.get(key)!.row}.`);
        else keyed.set(key, { row: r.rowNumber });
        keyOfRow.set(r.rowNumber, key);
      }
    }
    const built = hasExtra ? buildHistory(extra, keyed, lookups.users) : null;
    const excludedKeys = new Set([...keyOfRow].filter(([row]) => excluded.has(row)).map(([, key]) => key));
    const extraIssues = (built?.issues ?? []).filter((i) => !i.company_key || !excludedKeys.has(i.company_key));

    const rows = corrected.filter((r) => !excluded.has(r.rowNumber));
    const outcomes: RowOutcome[] = rows.map((r) => {
      const key = keyOfRow.get(r.rowNumber) ?? null;
      const plan = key && built && !dupKeyErrors.has(r.rowNumber) ? (built.plans.get(key) ?? null) : null;
      const o = this.checkRow(r, mapping, options, lookups, plan);
      o.company_key = key;
      o.plan = plan;
      o.cells = r.cells;
      if (hasExtra && !key) o.warnings.push('This row has no Company Key, so nothing from the other sheets is imported for it.');
      const dup = dupKeyErrors.get(r.rowNumber);
      if (dup) {
        o.errors.push({ field: 'Company Key', message: dup });
        o.status = 'error';
        o.commit = null;
      }
      // A company with a problem in its extra sheets is not imported at all, so no half-imported company is left.
      if (key && built?.blocked.has(key)) {
        for (const i of built.issues.filter((x) => x.company_key === key && x.severity === 'error')) o.errors.push({ field: `${i.sheet} row ${i.row}: ${i.field}`, message: i.message });
        o.status = 'error';
        o.commit = null;
      }
      if (key && built) for (const i of built.issues.filter((x) => x.company_key === key && x.severity === 'warning')) o.warnings.push(`${i.sheet} row ${i.row}: ${i.message}`);
      return o;
    });

    // Duplicates inside the file: the first row wins, later ones are errors to fix.
    const seen = { name_city: new Map<string, number>(), mobile: new Map<string, number>(), email: new Map<string, number>() };
    for (const o of outcomes) {
      if (o.status === 'error') continue;
      const k = identityKeys(o.converted.company, o.converted.contact);
      const hit =
        (seen.name_city.has(k.name_city) && { field: 'Company Name', row: seen.name_city.get(k.name_city)! }) ||
        (k.mobile && seen.mobile.has(k.mobile) && { field: 'Mobile', row: seen.mobile.get(k.mobile)! }) ||
        (k.email && seen.email.has(k.email) && { field: 'Email', row: seen.email.get(k.email)! });
      if (hit) {
        o.errors.push({ field: hit.field, message: `Duplicate of row ${hit.row} in this file.` });
        o.status = 'error';
        o.commit = null;
        continue;
      }
      seen.name_city.set(k.name_city, o.row_number);
      if (k.mobile) seen.mobile.set(k.mobile, o.row_number);
      if (k.email) seen.email.set(k.email, o.row_number);
    }

    // Duplicates in the database (same checks as the Add Company form).
    const live = outcomes.filter((o) => o.status === 'ready');
    const keys = live.map((o) => identityKeys(o.converted.company, o.converted.contact));
    const index = await this.repo.findExisting({
      name_city: keys.map((k) => k.name_city),
      mobiles: keys.map((k) => k.mobile).filter((x): x is string => !!x),
      emails: keys.map((k) => k.email).filter((x): x is string => !!x),
    });
    live.forEach((o, i) => {
      const k = keys[i];
      const hit = index.by_name_city.get(k.name_city) ?? (k.mobile ? index.by_mobile.get(k.mobile) : undefined) ?? (k.email ? index.by_email.get(k.email) : undefined);
      if (hit) {
        o.status = 'existing';
        o.existing = hit;
        o.commit = null;
        if (o.plan) o.warnings.push('The company is already in the database, so its contacts, conversations, follow-ups and notes from the other sheets are not imported.');
      }
    });
    return { outcomes, extraIssues };
  }

  private checkRow(r: RawRow, mapping: ColumnMapping, options: ImportOptions, lk: ImportLookups, plan: CompanyPlan | null = null): RowOutcome {
    // A multi-sheet file keeps the contact and the lead in their own sheets: they feed the same checks as the company row.
    const values = pickValues(r.cells, mapping);
    if (plan) {
      const primary = plan.contacts.find((c) => c.is_primary);
      if (primary) {
        values.contact_name = primary.name;
        if (primary.designation) values.designation = primary.designation;
        if (primary.mobile) values.mobile = primary.mobile;
        if (primary.email) values.email = primary.email;
      }
      if (plan.lead) {
        if (plan.lead.lead_source) values.lead_source = plan.lead.lead_source;
        if (plan.lead.lead_by) values.lead_by = plan.lead.lead_by;
        if (plan.lead.service_fit) values.service_fit = plan.lead.service_fit;
        options = { ...options, create_leads: true };
      }
    }
    const row = convertRow(r.rowNumber, values);
    const errors = [...row.errors];
    const warnings = [...row.warnings];
    const err = (field: string, message: string) => errors.push({ field, message });
    const c = row.company;

    // Master values must match the masters (City is free text).
    const master = (value: string | null, map: Map<string, string>, field: string): string | null => {
      if (!value) return value;
      const hit = map.get(value.toLowerCase());
      if (!hit) err(field, `"${value}" is not in the list. Use a value from the Lists sheet of the template.`);
      return hit ?? value;
    };
    c.nature_of_business = master(c.nature_of_business, lk.nature_of_business, headerOf('nature_of_business'));
    row.contact.designation = master(row.contact.designation, lk.designation, headerOf('designation'));
    c.gidc_name = master(c.gidc_name, lk.gidc_names, headerOf('gidc_name'));
    c.gidc_area_phase = master(c.gidc_area_phase, lk.gidc_areas, headerOf('gidc_area_phase'));
    let industryId: number | null = null;
    if (c.industry) {
      const hit = lk.industries.get(c.industry.toLowerCase());
      if (!hit) err(headerOf('industry'), `"${c.industry}" is not in the list. Use a value from the Lists sheet of the template.`);
      else {
        c.industry = hit.name;
        industryId = hit.id;
      }
    }

    // Lead part: all of Lead Source, Lead By and Service Fit, or none.
    let lead: ImportCommitRow['lead'] = null;
    const l = row.lead;
    if (hasAnyLeadData(l)) {
      const source = l.lead_source ? lk.lead_sources.get(l.lead_source.toLowerCase()) : undefined;
      if (l.lead_source && !source) err(headerOf('lead_source'), `"${l.lead_source}" is not in the list. Use a value from the Lists sheet of the template.`);
      const fits: string[] = [];
      for (const f of l.service_fit) {
        const hit = lk.service_fits.get(f.toLowerCase());
        if (!hit) err(headerOf('service_fit'), `"${f}" is not in the list. Use a value from the Lists sheet of the template.`);
        else if (!fits.includes(hit)) fits.push(hit);
      }
      const person = l.lead_by ? this.resolveUser(l.lead_by, lk) : undefined;
      if (l.lead_by && !person) err(headerOf('lead_by'), `"${l.lead_by}" is not an active Sales user or Admin.`);

      if (hasLeadData(l)) {
        if (source && person && fits.length > 0) {
          lead = { lead_source: source.label, lead_source_id: source.id, lead_by_id: person.emp_id, service_fit: fits };
        }
      } else if (errors.length === row.errors.length) {
        warnings.push('A lead needs Lead Source, Lead By and Service Fit together; the company is imported without a lead.');
      }
    }

    const status: RowOutcome['status'] = errors.length > 0 ? 'error' : 'ready';
    return {
      row_number: r.rowNumber,
      company_name: c.name,
      status,
      errors,
      warnings,
      existing: null,
      converted: row,
      commit:
        status === 'ready'
          ? { row_number: r.rowNumber, company: c, contact: row.contact, industry_id: industryId, lead: options.create_leads ? lead : null }
          : null,
    };
  }

  private resolveUser(value: string, lk: ImportLookups) {
    const v = value.trim().toLowerCase();
    const byEmail = lk.users.filter((u) => u.email?.toLowerCase() === v);
    if (byEmail.length === 1) return byEmail[0];
    const byName = lk.users.filter((u) => u.name.trim().toLowerCase() === v);
    return byName.length === 1 ? byName[0] : undefined;
  }
}
