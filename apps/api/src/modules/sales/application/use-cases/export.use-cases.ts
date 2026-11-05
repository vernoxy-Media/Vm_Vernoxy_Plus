import * as crypto from 'crypto';
import { PassThrough } from 'stream';
import { DataTransferJob, SpreadsheetWriterPort, SheetDefinition, TransferJobRepository } from '../../../data-transfer/public-api';
import { SalesActor } from '../ports/sales-access-policy.port';
import { ExportRow, ExportValue, SalesExportRepositoryPort } from '../ports/sales-export.repository.port';
import { SalesRightsUseCases } from './rights.use-cases';
import { ListSalesCompaniesUseCase } from './list-sales-companies.use-case';
import { ListLeadsUseCase } from './list-leads.use-case';
import { FollowUpUseCases } from './follow-up.use-cases';
import { FieldValidationError } from '../../domain/errors/sales.errors';
import {
  CONTACT_COLUMNS,
  CONVERSATION_COLUMNS,
  EXPORT_COLUMNS,
  EXPORT_MAX_ROWS,
  ExportColumn,
  ExportEntity,
} from '../../domain/entities/export-columns';

export type ColumnChoice = 'all' | 'visible' | 'custom';

export interface ExportInput {
  /** The filters of the list the user is looking at (same names as that list's query). Ignored when `ids` is given. */
  filters?: Record<string, unknown>;
  /** "Selected rows only". */
  ids?: number[];
  columns?: ColumnChoice;
  /** The columns shown on screen ("visible") or picked by the user ("custom"), by key. */
  fields?: string[];
  include_contacts?: boolean;
  include_conversations?: boolean;
  include_next_follow_up?: boolean;
  format: 'xlsx' | 'csv';
}

const MIME = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv; charset=utf-8' } as const;
const PAGE = 100;
const SLICE = 500;
const IST_MS = 5.5 * 60 * 60 * 1000;
const NEXT_FOLLOW_UP: ExportColumn = { key: 'next_follow_up', header: 'Next Follow-up' };
const FILE_NAMES: Record<ExportEntity, string> = { companies: 'companies', leads: 'leads', follow_ups: 'follow-ups' };

const istText = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 16).replace('T', ' ');
const cell = (v: ExportValue | undefined): string | number | boolean | null => (v instanceof Date ? istText(v) : (v ?? null));

const streamToBuffer = async (s: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c as string));
  return Buffer.concat(chunks);
};

/** Export of Companies, Leads and Follow-ups (BFD section 3, Part 3). The Admin always; a Sales user only with the Export right, and only their own leads. */
export class ExportUseCases {
  constructor(
    private readonly repo: SalesExportRepositoryPort,
    private readonly rights: SalesRightsUseCases,
    private readonly companies: ListSalesCompaniesUseCase,
    private readonly leads: ListLeadsUseCase,
    private readonly followUps: FollowUpUseCases,
    private readonly jobs: TransferJobRepository,
    private readonly writers: { xlsx: SpreadsheetWriterPort; csv: SpreadsheetWriterPort },
  ) {}

  async export(entity: ExportEntity, input: ExportInput, actor: SalesActor): Promise<{ buffer: Buffer; filename: string; contentType: string; rows: number }> {
    await this.rights.require(actor, 'export');
    if (input.format === 'csv' && (input.include_contacts || input.include_conversations)) {
      throw new FieldValidationError([{ field: 'format', message: 'Contacts and conversations need the Excel format (they go on their own sheets).' }]);
    }
    const columns = this.pickColumns(entity, input);
    const ids = await this.resolveIds(entity, input, actor);
    if (ids.length === 0) throw new FieldValidationError([{ field: 'ids', message: 'There is nothing to export.' }]);
    if (ids.length > EXPORT_MAX_ROWS) {
      throw new FieldValidationError([{ field: 'ids', message: `You can export up to ${EXPORT_MAX_ROWS.toLocaleString('en-US')} rows at a time. Narrow the filters and try again.` }]);
    }
    const scope = actor.is_admin ? undefined : actor.emp_id;

    const sheets: SheetDefinition[] = [{ name: this.sheetName(entity), headers: columns.map((c) => ({ key: c.key, header: c.header, width: 22, isPhone: c.key === 'mobile' })) }];
    const fetchers = new Map<string, (chunk: number) => AsyncIterable<Record<string, unknown>[]>>();
    const count = { rows: 0 };

    const self = this;
    fetchers.set(sheets[0].name, () =>
      (async function* () {
        for (let i = 0; i < ids.length; i += SLICE) {
          const part = ids.slice(i, i + SLICE);
          const rows = await self.fetch(entity, part, scope);
          count.rows += rows.length;
          yield rows.map((r) => Object.fromEntries(columns.map((c) => [c.key, cell(r[c.key])])));
        }
      })(),
    );

    // Contacts and Conversations & Notes sheets (Excel only), for the companies of the exported rows.
    const companyIds = await this.companyIdsFor(entity, ids, scope);
    if (input.include_contacts) {
      sheets.push({ name: 'Contacts', headers: CONTACT_COLUMNS.map((c) => ({ key: c.key, header: c.header, width: 22, isPhone: c.key === 'mobile' })) });
      fetchers.set('Contacts', () => self.chunked(companyIds, (part) => self.repo.contacts(part), CONTACT_COLUMNS));
    }
    if (input.include_conversations) {
      sheets.push({ name: 'Conversations & Notes', headers: CONVERSATION_COLUMNS.map((c) => ({ key: c.key, header: c.header, width: 30 })) });
      fetchers.set('Conversations & Notes', () => self.chunked(companyIds, (part) => self.repo.conversations(part, scope), CONVERSATION_COLUMNS));
    }

    const out = new PassThrough();
    const sink = streamToBuffer(out);
    await this.writers[input.format].writeWorkbookStream(sheets, fetchers as never, input.format, out);
    out.end();
    const buffer = await sink;

    await this.record(entity, input, actor, count.rows, buffer.length);
    const stamp = new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
    return { buffer, filename: `${FILE_NAMES[entity]}-${stamp}.${input.format}`, contentType: MIME[input.format], rows: count.rows };
  }

  // -------------------------------------------------------------- helpers ----

  private sheetName(entity: ExportEntity) {
    return entity === 'companies' ? 'Companies' : entity === 'leads' ? 'Leads' : 'Follow-ups';
  }

  private pickColumns(entity: ExportEntity, input: ExportInput): ExportColumn[] {
    const all = [...EXPORT_COLUMNS[entity], ...(entity === 'companies' && input.include_next_follow_up ? [NEXT_FOLLOW_UP] : [])];
    const choice = input.columns ?? 'all';
    if (choice === 'all') return all;
    const wanted = input.fields ?? [];
    if (wanted.length === 0) {
      throw new FieldValidationError([{ field: 'fields', message: 'Choose at least one column to export.' }]);
    }
    const byKey = new Map(all.map((c) => [c.key, c]));
    const unknown = wanted.filter((k) => !byKey.has(k));
    if (unknown.length > 0) throw new FieldValidationError([{ field: 'fields', message: `Not an exportable column: ${unknown.join(', ')}.` }]);
    return [...new Set(wanted)].map((k) => byKey.get(k) as ExportColumn);
  }

  private async resolveIds(entity: ExportEntity, input: ExportInput, actor: SalesActor): Promise<number[]> {
    if (input.ids && input.ids.length > 0) return [...new Set(input.ids)];
    const filters = (input.filters ?? {}) as Record<string, never>;
    const ids: number[] = [];
    for (let page = 1; page <= Math.ceil((EXPORT_MAX_ROWS + 1) / PAGE); page++) {
      let got: number[];
      let total: number;
      if (entity === 'companies') {
        const r = await this.companies.execute({ ...filters, page, limit: PAGE });
        got = r.items.map((i) => i.company_id);
        total = r.total;
      } else if (entity === 'leads') {
        const r = await this.leads.execute({ ...filters, page, limit: PAGE }, actor);
        got = r.items.map((i) => i.lead_id);
        total = r.total;
      } else {
        const r = await this.followUps.list({ ...filters, page, limit: PAGE }, actor);
        got = r.items.map((i) => i.follow_up_id);
        total = r.total;
      }
      ids.push(...got);
      if (total > EXPORT_MAX_ROWS || got.length < PAGE || ids.length >= total) {
        if (total > EXPORT_MAX_ROWS) ids.length = EXPORT_MAX_ROWS + 1;
        break;
      }
    }
    return ids;
  }

  private async fetch(entity: ExportEntity, ids: number[], scope?: number): Promise<ExportRow[]> {
    if (entity === 'companies') return this.repo.companies(ids);
    if (entity === 'leads') return this.repo.leads(ids, scope);
    return this.repo.followUps(ids, scope);
  }

  private async companyIdsFor(entity: ExportEntity, ids: number[], scope?: number): Promise<number[]> {
    if (entity === 'companies') return ids;
    if (entity === 'leads') return this.repo.companyIdsOfLeads(ids);
    const rows = await this.repo.followUps(ids, scope);
    return [...new Set(rows.map((r) => Number(r.__company_id)).filter((n) => Number.isFinite(n)))];
  }

  private chunked(ids: number[], load: (part: number[]) => Promise<ExportRow[]>, cols: ExportColumn[]) {
    return (async function* () {
      for (let i = 0; i < ids.length; i += SLICE) {
        const rows = await load(ids.slice(i, i + SLICE));
        yield rows.map((r) => Object.fromEntries(cols.map((c) => [c.key, cell(r[c.key])])));
      }
    })();
  }

  private async record(entity: ExportEntity, input: ExportInput, actor: SalesActor, rows: number, bytes: number) {
    const now = new Date();
    try {
      await this.jobs.create(
        new DataTransferJob({
          jobId: crypto.randomUUID(),
          direction: 'export',
          entityType: `sales_export_${entity}`,
          format: input.format,
          status: 'completed',
          fileSizeBytes: bytes,
          totalRows: rows,
          processedRows: rows,
          createdRows: rows,
          options: {
            list: entity,
            filters: input.ids?.length ? { selected_rows: input.ids.length } : (input.filters ?? {}),
            columns: input.columns ?? 'all',
            include_contacts: !!input.include_contacts,
            include_conversations: !!input.include_conversations,
          },
          startedAt: now,
          finishedAt: now,
          createdBy: actor.emp_id,
        }),
      );
    } catch {
      /* History is a record; it never blocks the file the user asked for. */
    }
  }
}
