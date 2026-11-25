import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { CsvSpreadsheetAdapter, DataTransferJob, ExcelJsSpreadsheetAdapter, FileInspectionService } from '../../../data-transfer/public-api';
import { ImportUseCases } from './import.use-cases';
import { ImportBatch, ImportCommitRow, ImportLookups, SalesImportRepositoryPort } from '../ports/sales-import.repository.port';
import { HistoryCommitData, SalesImportHistoryRepositoryPort } from '../ports/sales-import-history.repository.port';
import { SalesActor } from '../ports/sales-access-policy.port';
import { ExcelJsSalesImportTemplateAdapter } from '../../infrastructure/adapters/exceljs-sales-import-template.adapter';

// These tests build and read real .xlsx files; under a full parallel run that can pass 5 seconds.
jest.setTimeout(60_000);

const actor: SalesActor = { emp_id: 7, is_admin: true, is_sales: true };

const lookups = (): ImportLookups => ({
  industries: new Map([['engineering & industrial', { id: 3, name: 'Engineering & Industrial' }]]),
  nature_of_business: new Map([['manufacturing', 'Manufacturing']]),
  designation: new Map([['director', 'Director']]),
  gidc_names: new Map([['naroda', 'Naroda']]),
  gidc_areas: new Map([['phase 1', 'Phase 1']]),
  lead_sources: new Map([['linkedin', { id: 11, label: 'LinkedIn' }]]),
  service_fits: new Map([['erp', 'ERP'], ['crm', 'CRM']]),
  users: [{ emp_id: 7, name: 'Krishna Admin', email: 'krishna@vernoxy.com' }],
  default_industry_id: 1,
  default_customer_type_id: 1,
  new_stage_id: 1,
});

/** The sample company of the template, as a real .xlsx with every sheet. */
async function workbook(mutate?: (sheets: Record<string, ExcelJS.Worksheet>) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const add = (name: string, headers: string[], rows: Array<Array<string | number>>) => {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers);
    rows.forEach((r) => ws.addRow(r));
    return ws;
  };
  const sheets: Record<string, ExcelJS.Worksheet> = {
    companies: add('Companies', ['Company Key', 'Company Name', 'City', 'Is GIDC', 'GIDC Name', 'GIDC Area/Phase', 'Nature of Business', 'Industry', 'Year Established', 'Website'],
      [['CMP001', 'Shree Ram Industries', 'Ahmedabad', 'Yes', 'Naroda', 'Phase 1', 'Manufacturing', 'Engineering & Industrial', 2015, 'https://shreeramind.com']]),
    contacts: add('Contacts', ['Company Key', 'Contact Name', 'Designation', 'Mobile', 'Email', 'Is Primary'], [['CMP001', 'Ramesh Patel', 'Director', '9824012345', 'ramesh@shreeramind.com', 'Yes']]),
    leads: add('Leads', ['Company Key', 'Lead Source', 'Lead By', 'Service Fit', 'Date Added', 'Lead Status'], [['CMP001', 'LinkedIn', 'Krishna Admin', 'ERP, CRM', '2026-10-15', 'Converted']]),
    interactions: add('Interactions', ['Company Key', 'Contact Name', 'Date', 'Time', 'Type', 'What Discussed', 'Outcome', 'Call Status', 'Call Duration (min)', 'Done By'],
      [['CMP001', 'Ramesh Patel', '2026-11-10', '11:15', 'Call', 'Intro call', 'Interested', 'Received', 8, 'Krishna Admin']]),
    followups: add('Follow-ups', ['Company Key', 'Contact Name', 'Follow-up Date', 'Follow-up Time', 'Type', 'Assigned To', 'Status', 'Done On Date', 'Done Time', 'Outcome', 'Completion Note'],
      [['CMP001', 'Ramesh Patel', '2026-11-20', '14:30', 'Meeting', 'Krishna Admin', 'Completed', '2026-11-20', '15:15', 'Interested', 'Confirmed budget'],
       ['CMP001', 'Ramesh Patel', '2026-11-25', '11:00', 'Call', 'Krishna Admin', 'Pending', '', '', '', '']]),
    won: add('Won', ['Company Key', 'Won On', 'Project Revenue', 'Win Note', 'Owner'], [['CMP001', '2026-11-20', 550000, 'Contract signed', 'Krishna Admin']]),
    notes: add('Notes', ['Company Key', 'Note Type', 'Note', 'Is Pinned', 'Created By', 'Created On'], [['CMP001', 'Budget', 'Budget is 10 lakhs', 'Yes', 'Krishna Admin', '2026-10-20']]),
  };
  mutate?.(sheets);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function build(opts: { existingByName?: boolean; historyFails?: boolean } = {}) {
  const store = new Map<string, Buffer>();
  const jobs = new Map<string, DataTransferJob>();
  const committed: ImportCommitRow[][] = [];
  const history: HistoryCommitData[] = [];
  const discarded: number[] = [];
  let nextId = 100;

  const batch: ImportBatch = { batch_id: 1, job_id: null, file_name: 'x', imported_by: 7, imported_at: new Date(), can_undo_until: new Date(Date.now() + 3600_000), is_undone: false, undone_at: null, companies_created: [], leads_created: [], companies_updated: [] };
  const repo: SalesImportRepositoryPort = {
    loadLookups: async () => lookups(),
    findExisting: async () => ({
      by_name_city: new Map(opts.existingByName ? [['shree ram industries|ahmedabad', { company_id: 5, company_code: 'C-5', name: 'Shree Ram Industries', matched_by: 'name_city' as const }]] : []),
      by_mobile: new Map(),
      by_email: new Map(),
    }),
    createBatch: async (d) => { batch.job_id = d.job_id; return 1; },
    commitChunk: async (d) => {
      committed.push(d.rows);
      return d.rows.map((r) => ({ row_number: r.row_number, company_id: nextId++, company_code: `C-${nextId}`, lead_id: r.lead ? nextId++ : null, lead_code: r.lead ? `L-${nextId}` : null }));
    },
    updateEmptyFields: async () => [],
    getBatchByJob: async () => (batch.job_id ? batch : null),
    findUndoBlockers: async () => [],
    undo: async () => ({ companies_removed: 1, leads_removed: 1 }),
    employeeNames: async () => new Map(),
    listAdminIds: async () => [],
  };
  const historyRepo: SalesImportHistoryRepositoryPort = {
    commitCompany: async (d) => {
      if (opts.historyFails) throw new Error('database exploded');
      history.push(d);
      return { contacts: d.plan.contacts.filter((c) => !c.is_primary).length, interactions: d.plan.interactions.length, follow_ups: d.plan.follow_ups.length, notes: d.plan.notes.length, won: !!d.plan.won };
    },
    discardCompany: async (d) => { discarded.push(d.company_id); },
    listImported: async () => ({ communications: [], follow_ups: [], notes: [], clients: [], leads: [] }),
    undo: async () => ({ conversations: 1, follow_ups: 2, notes: 1, clients: 1 }),
  };
  const jobRepo = {
    create: async (j: DataTransferJob) => { jobs.set(j.jobId, j); return j; },
    findById: async (id: string) => jobs.get(id) ?? null,
    update: async () => undefined,
    updateStatus: async (id: string, status: DataTransferJob['status'], fields?: Partial<DataTransferJob>) => { const j = jobs.get(id)!; j.status = status; Object.assign(j, fields ?? {}); },
    updateProgress: async (id: string, c: Partial<DataTransferJob>) => { Object.assign(jobs.get(id)!, c); },
    findRecentJobs: async () => ({ jobs: [...jobs.values()], nextCursor: null }),
  };
  const storage = {
    put: async (k: string, b: Buffer) => { store.set(k, b); },
    openReadStream: async (k: string) => Readable.from(store.get(k)!),
  };
  const xlsx = new ExcelJsSpreadsheetAdapter();
  const csv = new CsvSpreadsheetAdapter();
  const uc = new ImportUseCases(
    repo, {} as never, jobRepo as never, storage as never, new FileInspectionService(), { xlsx, csv }, { xlsx, csv },
    { send: async () => undefined } as never, historyRepo,
  );
  return { uc, committed, history, discarded };
}

describe('ImportUseCases: multi-sheet file', () => {
  it('reads every sheet and plans the whole history', async () => {
    const { uc } = build();
    const r = await uc.upload(await workbook(), 'sales.xlsx', actor);
    expect(r.errors).toEqual([]);
    expect(r.can_import).toBe(true);
    expect(r.summary).toMatchObject({ total: 1, ready: 1, with_errors: 0 });
    expect(r.will_create).toMatchObject({ companies: 1, leads: 1, interactions: 1, follow_ups: 2, notes: 1, clients: 1 });
    expect(r.sheets.map((s) => s.name)).toEqual(['Companies', 'Contacts', 'Leads', 'Interactions', 'Follow-ups', 'Won', 'Notes']);
  });

  it('imports the company with its primary contact and lead, then saves the history for it', async () => {
    const { uc, committed, history } = build();
    const up = await uc.upload(await workbook(), 'sales.xlsx', actor);
    const res = await uc.confirm(up.job_id, actor);
    expect(res.status).toBe('completed');
    expect(res.companies_created).toBe(1);
    expect(res.leads_created).toBe(1);
    expect(res.history).toEqual({ contacts: 0, interactions: 1, follow_ups: 2, notes: 1, clients: 1 });

    const row = committed[0][0];
    expect(row.contact).toMatchObject({ name: 'Ramesh Patel', mobile: '9824012345', designation: 'Director' });
    expect(row.lead).toMatchObject({ lead_source: 'LinkedIn', lead_by_id: 7, service_fit: ['ERP', 'CRM'] });
    expect(history).toHaveLength(1);
    expect(history[0].plan.lead?.stage).toBe('Converted');
    expect(history[0].lead_id).not.toBeNull();
    expect(res.row_results[0].message).toContain('follow-ups');
  });

  it('does not import a company whose extra sheets have a problem, and says where', async () => {
    const { uc, committed } = build();
    const up = await uc.upload(await workbook((s) => { s.interactions.getRow(2).getCell(2).value = 'Somebody Else'; }), 'sales.xlsx', actor);
    expect(up.can_import).toBe(false);
    expect(up.summary.with_errors).toBe(1);
    expect(up.errors[0].field).toContain('Interactions row 2');
    expect(up.extra_issues.some((i) => i.sheet === 'Interactions' && i.severity === 'error')).toBe(true);
    await expect(uc.confirm(up.job_id, actor)).rejects.toThrow();
    expect(committed).toHaveLength(0);
  });

  it('removes the company again when its history cannot be saved', async () => {
    const { uc, discarded } = build({ historyFails: true });
    const up = await uc.upload(await workbook(), 'sales.xlsx', actor);
    const res = await uc.confirm(up.job_id, actor);
    expect(res.companies_created).toBe(0);
    expect(res.rows_failed).toBe(1);
    expect(res.status).toBe('failed');
    expect(discarded).toHaveLength(1);
    expect(res.row_results[0].message).toContain('database exploded');
  });

  it('leaves out an excluded company and its history', async () => {
    const { uc } = build();
    const up = await uc.upload(await workbook(), 'sales.xlsx', actor);
    const c = await uc.check(up.job_id, { excluded_rows: [2] }, actor);
    expect(c.summary.total).toBe(0);
    expect(c.will_create.companies).toBe(0);
    expect(c.edits.excluded_rows).toEqual([2]);
    expect(c.can_import).toBe(false);
  });

  it('applies a corrected value from the preview', async () => {
    const { uc } = build();
    const up = await uc.upload(await workbook((s) => { s.companies.getRow(2).getCell(2).value = ''; }), 'sales.xlsx', actor);
    expect(up.summary.with_errors).toBe(1);
    const nameKey = up.columns.find((c) => c.header.toLowerCase() === 'company name')!.key;
    const fixed = await uc.check(up.job_id, { overrides: { '2': { [nameKey]: 'Shree Ram Industries' } } }, actor);
    expect(fixed.summary).toMatchObject({ ready: 1, with_errors: 0 });
    expect(fixed.can_import).toBe(true);
  });

  it('skips a company that is already in the database and says its history was not imported', async () => {
    const { uc, history } = build({ existingByName: true });
    const up = await uc.upload(await workbook(), 'sales.xlsx', actor);
    expect(up.summary.already_in_database).toBe(1);
    expect(up.warnings.some((w) => w.message.includes('already in the database'))).toBe(true);
    expect(up.can_import).toBe(false);
    expect(history).toHaveLength(0);
  });

  it('builds the summary and success reports after an import, and refuses them before', async () => {
    const { uc } = build();
    const up = await uc.upload(await workbook(), 'sales.xlsx', actor);
    await expect(uc.report(up.job_id, 'summary', 'xlsx', actor)).rejects.toThrow();
    await uc.confirm(up.job_id, actor);
    const summary = await uc.report(up.job_id, 'summary', 'xlsx', actor);
    const ok = await uc.report(up.job_id, 'success', 'xlsx', actor);
    expect(summary.buffer.length).toBeGreaterThan(500);
    expect(ok.filename).toBe('import-success.xlsx');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(summary.buffer as never);
    const text = JSON.stringify(wb.worksheets[0].getSheetValues());
    expect(text).toContain('Companies created');
    expect(text).toContain('Clients created');
  });

  it('undoes the extra records as well as the companies', async () => {
    const { uc } = build();
    const up = await uc.upload(await workbook(), 'sales.xlsx', actor);
    await uc.confirm(up.job_id, actor);
    const undone = await uc.undo(up.job_id, actor);
    expect(undone).toMatchObject({ companies_removed: 1, conversations: 1, follow_ups: 2, notes: 1, clients: 1 });
  });
});

describe('ImportUseCases: preview and template', () => {
  it('gives the preview table everything it needs, problems first', async () => {
    const { uc } = build();
    const up = await uc.upload(await workbook((s) => { s.interactions.getRow(2).getCell(2).value = 'Somebody Else'; }), 'sales.xlsx', actor);
    expect(up.preview).toHaveLength(1);
    expect(up.preview[0]).toMatchObject({ row: 2, company_key: 'CMP001', company: 'Shree Ram Industries', status: 'error' });
    expect(up.preview[0].problems[0]).toContain('Interactions row 2');
    expect(up.preview[0].includes).toMatchObject({ interactions: 0, follow_ups: 2, notes: 1, client: true, lead_status: 'Converted' });
    expect(Object.keys(up.preview[0].cells)).toContain('company_name');
  });

  it('the downloaded Company Database template can be filled in and imported (round trip)', async () => {
    const template = await new ExcelJsSalesImportTemplateAdapter().build('xlsx', lookups());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(template as never);
    const ws = wb.getWorksheet('Companies')!;
    const values: Record<string, string> = { 'Company Name': 'Om Traders', City: 'Surat', 'Contact Person': 'Mehul Shah', Mobile: '9898011223', 'Lead Source': 'LinkedIn', 'Lead By': 'Krishna Admin', 'Service Fit': 'ERP' };
    ws.getRow(1).eachCell((cell, col) => {
      const v = values[String(cell.text)];
      if (v !== undefined) ws.getRow(2).getCell(col).value = v;
    });
    const { uc, history, committed } = build();
    const up = await uc.upload(Buffer.from(await wb.xlsx.writeBuffer()), 'template.xlsx', actor);
    expect(up.errors).toEqual([]);
    expect(up.will_create).toMatchObject({ companies: 1, leads: 1, interactions: 0, follow_ups: 0 });
    expect(up.sheets).toEqual([{ name: 'Companies', rows: 1 }]);
    await uc.confirm(up.job_id, actor);
    expect(committed[0][0].contact.name).toBe('Mehul Shah');
    expect(history).toHaveLength(0);
  });
});

describe('ImportUseCases: an ordinary single-sheet file still works as before', () => {
  it('imports from the Companies sheet alone, with no extra sheets and no history', async () => {
    const { uc, committed, history } = build();
    const file = await (async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Companies');
      ws.addRow(['Company Name', 'City', 'Contact Person', 'Mobile', 'Lead Source', 'Lead By', 'Service Fit']);
      ws.addRow(['Om Traders', 'Surat', 'Mehul Shah', '9898011223', 'LinkedIn', 'Krishna Admin', 'ERP']);
      return Buffer.from(await wb.xlsx.writeBuffer());
    })();
    const up = await uc.upload(file, 'old.xlsx', actor);
    expect(up.will_create).toMatchObject({ companies: 1, leads: 1, interactions: 0, follow_ups: 0, notes: 0, clients: 0 });
    expect(up.sheets).toEqual([{ name: 'Companies', rows: 1 }]);
    const res = await uc.confirm(up.job_id, actor);
    expect(res.companies_created).toBe(1);
    expect(committed[0][0].contact.name).toBe('Mehul Shah');
    expect(history).toHaveLength(0);
  });
});
