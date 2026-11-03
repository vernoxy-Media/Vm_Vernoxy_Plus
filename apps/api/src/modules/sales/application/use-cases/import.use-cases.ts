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
const PREVIEW_VALID_MS = 24 * 60 * 60 * 1000;
const CHUNK = 250;
const MAX_ISSUES_STORED = 500;
const MAX_ROWS_RETURNED = 200;

interface RawRow {
  rowNumber: number;
  cells: Record<string, string>;
}

export interface RowOutcome {
  row_number: number;
  company_name: string;
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
  will_create: { companies: number; leads: number };
  will_fill: number;
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
  skipped_existing: number;
  rows_with_errors: number;
  rows_failed: number;
  batch: { batch_id: number; can_undo_until: Date };
  row_results: Array<{ row: number; company: string; status: 'created' | 'updated' | 'skipped' | 'error' | 'failed'; company_code?: string | null; lead_code?: string | null; message?: string }>;
}

const streamToBuffer = async (s: NodeJS.ReadableStream): Promise<Buffer> => {
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
    const { rows, columns } = await this.parse(file, format);
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

    const check = await this.runCheck(job, rows, toMapping(matches), DEFAULT_OPTIONS);
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
    input: { mapping?: ColumnMapping; create_leads?: boolean; existing_rows?: ExistingRowsPolicy },
    actor: SalesActor,
  ): Promise<CheckResult> {
    const job = await this.openJob(jobId, actor);
    const { rows, columns } = await this.loadRows(job);
    const mapping = input.mapping ?? (job.options.mapping as ColumnMapping);
    const errors = validateMapping(mapping, columns);
    if (errors.length > 0) throw new FieldValidationError(errors);
    const options: ImportOptions = {
      create_leads: input.create_leads ?? (job.options.create_leads as boolean) ?? DEFAULT_OPTIONS.create_leads,
      existing_rows: input.existing_rows ?? (job.options.existing_rows as ExistingRowsPolicy) ?? DEFAULT_OPTIONS.existing_rows,
    };
    return this.runCheck(job, rows, mapping, options);
  }

  // -------------------------------------------------------------- confirm ----

  /**
   * "Import N companies". Runs now, in this request (the limit is 1,000 rows): error rows are never imported,
   * rows already in the database are skipped or have only their empty fields filled, and each chunk is saved
   * all or nothing. The result is kept in History and the Admin is told.
   */
  async confirm(jobId: string, actor: SalesActor, now = new Date()): Promise<ImportResult> {
    const job = await this.openJob(jobId, actor);
    const { rows } = await this.loadRows(job);
    const mapping = job.options.mapping as ColumnMapping;
    const options: ImportOptions = {
      create_leads: (job.options.create_leads as boolean) ?? DEFAULT_OPTIONS.create_leads,
      existing_rows: (job.options.existing_rows as ExistingRowsPolicy) ?? DEFAULT_OPTIONS.existing_rows,
    };

    // Checked again right now: someone may have added a company since the last check.
    const outcomes = await this.analyze(rows, mapping, options);
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

    for (let i = 0; i < ready.length; i += CHUNK) {
      const slice = ready.slice(i, i + CHUNK);
      const commitRows = slice.map((o) => o.commit as ImportCommitRow);
      const saved = await this.commit(batchId, commitRows, lookups, actor, results, slice);
      created += saved.length;
      leads += saved.filter((s) => s.lead_id !== null).length;
      for (const s of saved) {
        const o = slice.find((x) => x.row_number === s.row_number)!;
        results.push({ row: s.row_number, company: o.company_name, status: 'created', company_code: s.company_code, lead_code: s.lead_code });
      }
      failed += slice.length - saved.length;
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
    const summary = { companies_created: created, companies_updated: updated, leads_created: leads, skipped_existing: skippedExisting, rows_with_errors: errorRows, rows_failed: failed };

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
    const { rows, columns } = await this.loadRows(job);
    const mapping = (job.options.mapping as ColumnMapping) ?? toMapping(suggestMapping(columns));
    const options: ImportOptions = { create_leads: (job.options.create_leads as boolean) ?? true, existing_rows: (job.options.existing_rows as ExistingRowsPolicy) ?? 'skip' };
    const outcomes = (await this.analyze(rows, mapping, options)).filter((o) => o.status === 'error');
    const byRow = new Map(rows.map((r) => [r.rowNumber, r]));

    const headers = [
      ...columns.map((c) => ({ key: c.key, header: c.header, width: 20 })),
      { key: '__problem', header: 'Problem', width: 60 },
    ];
    const data = outcomes.map((o) => ({
      ...(byRow.get(o.row_number)?.cells ?? {}),
      __problem: o.errors.map((e) => `${e.field}: ${e.message}`).join(' | '),
    }));
    const out = new PassThrough();
    const sink = streamToBuffer(out);
    await this.writers[format].writeWorkbookStream(
      [{ name: 'Companies', headers }],
      new Map([['Companies', async function* () { yield data; }]]),
      format,
      out,
    );
    out.end();
    return {
      buffer: await sink,
      filename: `import-error-rows.${format}`,
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
    const blockers = await this.repo.findUndoBlockers(batch);
    if (blockers.length > 0) {
      throw new ImportNotUndoableError(
        `${blockers.length} imported ${blockers.length === 1 ? 'company has' : 'companies have'} a lead, conversation, note or follow-up of their own since the import, so it cannot be undone.`,
        blockers,
      );
    }
    return this.repo.undo({ batch, actor_emp_id: actor.emp_id });
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

  private async parse(file: Buffer, format: 'xlsx' | 'csv'): Promise<{ rows: RawRow[]; columns: FileColumn[] }> {
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
    return {
      rows: sheetRows.map((r) => ({ rowNumber: r.rowNumber, cells: r.cells })),
      columns: keys.map((k) => ({ key: k, header: k.replace(/_/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase()) })),
    };
  }

  private async loadRows(job: DataTransferJob): Promise<{ rows: RawRow[]; columns: FileColumn[] }> {
    if (!job.fileKey) throw new NotFoundSalesError('The uploaded file is missing.', 'IMPORT_FILE_MISSING', 'job_id');
    const buffer = await streamToBuffer(await this.storage.openReadStream(job.fileKey, 'imports'));
    return this.parse(buffer, job.format);
  }

  private async runCheck(job: DataTransferJob, rows: RawRow[], mapping: ColumnMapping, options: ImportOptions): Promise<CheckResult> {
    const outcomes = await this.analyze(rows, mapping, options);
    const result = this.summarize(job.jobId, outcomes, mapping, options);

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
      issues: issues.slice(0, MAX_ISSUES_STORED),
      duplicates_count: result.summary.already_in_database,
      summary: result.summary,
    };
    await this.jobs.update(job);
    return result;
  }

  private summarize(jobId: string, outcomes: RowOutcome[], mapping: ColumnMapping, options: ImportOptions): CheckResult {
    const ready = outcomes.filter((o) => o.status === 'ready');
    const existing = outcomes.filter((o) => o.status === 'existing');
    const bad = outcomes.filter((o) => o.status === 'error');
    const errorList = bad.flatMap((o) => o.errors.map((e) => ({ row: o.row_number, company: o.company_name || null, field: e.field, problem: e.message })));
    const willFill = options.existing_rows === 'update_empty' ? existing.length : 0;
    return {
      job_id: jobId,
      summary: { total: outcomes.length, ready: ready.length, already_in_database: existing.length, with_errors: bad.length },
      will_create: { companies: ready.length, leads: ready.filter((o) => o.commit?.lead).length },
      will_fill: willFill,
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
  async analyze(rows: RawRow[], mapping: ColumnMapping, options: ImportOptions): Promise<RowOutcome[]> {
    const lookups = await this.repo.loadLookups();
    const outcomes: RowOutcome[] = rows.map((r) => this.checkRow(r, mapping, options, lookups));

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
      }
    });
    return outcomes;
  }

  private checkRow(r: RawRow, mapping: ColumnMapping, options: ImportOptions, lk: ImportLookups): RowOutcome {
    const row = convertRow(r.rowNumber, pickValues(r.cells, mapping));
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
