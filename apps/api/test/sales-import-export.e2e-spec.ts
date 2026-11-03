import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

// Only load .env.test when the runner has not already pointed us at a database.
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
}

import { SalesModule } from '../src/modules/sales/sales.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { JwtAuthGuard } from '../src/modules/auth/public-api';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/core/filters/global-exception.filter';
import { createValidationException } from '../src/core/filters/validation-exception.factory';
import { assertTestEnvironment } from '../src/core/utils/env-guard';
import { HeaderAuthGuard, FakeEventsModule, FakeAuthModule } from './helpers/sales-e2e';

const HEAD = ['Company Name', 'City', 'Is GIDC', 'GIDC Name', 'GIDC Area/Phase', 'Contact Person', 'Designation', 'Mobile', 'Email', 'Industry', 'Website Quality', 'Estimated Employees', 'Lead Source', 'Lead By', 'Service Fit', 'Brochure'];

describe('Sales - Import, Export, History and rights (e2e)', () => {
  jest.setTimeout(240000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  let seq = 0;
  const phone = () => '9' + String(Date.now() * 10 + ++seq).slice(-9);
  let kishan: number; // Sales, with Import + Export rights
  let dhruv: number; // Sales, no rights
  let boss: number; // Admin
  let outsider: number; // not in Sales
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());
  const U = '/api/v1/sales';

  const workbook = async (rows: Array<Record<string, string | number>>, head = HEAD): Promise<Buffer> => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Companies');
    ws.addRow(head);
    rows.forEach((r) => ws.addRow(head.map((h) => r[h] ?? '')));
    return Buffer.from(await wb.xlsx.writeBuffer());
  };
  const parse = async (buf: Buffer) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    return wb;
  };
  const sheetRows = (ws: ExcelJS.Worksheet) => {
    const head = (ws.getRow(1).values as unknown[]).slice(1).map(String);
    const out: Array<Record<string, unknown>> = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      out.push(Object.fromEntries(head.map((h, i) => [h, (row.values as unknown[])[i + 1] ?? null])));
    });
    return out;
  };
  const upload = (buf: Buffer, who = kishan, name = 'companies.xlsx') =>
    api().post(`${U}/imports`).set(as(who)).attach('file', buf, name);
  const binary = (res: any, cb: (e: Error | null, b: Buffer) => void) => {
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
  };
  const download = async (req: any): Promise<Buffer> =>
    new Promise((resolve, reject) => req.buffer(true).parse(binary).end((err: Error, res: any) => (err ? reject(err) : resolve(res.body as Buffer))));

  const co = (n: string) => `${n} ${run}`;

  beforeAll(async () => {
    await assertTestEnvironment(process.env.DATABASE_URL!);
    const moduleRef = await Test.createTestingModule({ imports: [SalesModule, FakeEventsModule] })
      .overrideModule(AuthModule).useModule(FakeAuthModule)
      .overrideGuard(JwtAuthGuard).useClass(HeaderAuthGuard)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);

    if (!(await prisma.customer_types.findFirst({ where: { name: 'Prospect' } }))) await prisma.customer_types.create({ data: { name: 'Prospect' } });
    if (!(await prisma.industries.findFirst({ where: { name: 'Unclassified' } }))) await prisma.industries.create({ data: { name: 'Unclassified' } });
    if (!(await prisma.industries.findFirst({ where: { name: 'Textile' } }))) await prisma.industries.create({ data: { name: 'Textile' } });
    const ensure = async (lookup_type: string, code: string, label: string, sort_order: number) => {
      if (!(await prisma.master_lookup.findFirst({ where: { lookup_type, code } }))) await prisma.master_lookup.create({ data: { lookup_type, code, label, sort_order } });
    };
    await ensure('lead_source', 'cold_call', 'Cold Call', 30);
    await ensure('service_fit', 'crm_erp', 'CRM / ERP Software', 20);
    await ensure('service_fit', 'website', 'Website Development', 10);
    await ensure('gidc_name', 'vatva', 'Vatva', 10);
    await ensure('gidc_phase', 'phase_2', 'Phase II', 10);
    await ensure('designation', 'md', 'MD', 10);

    const salesDep = (await prisma.departments.findFirst({ where: { name: 'Sales' } })) ?? (await prisma.departments.create({ data: { name: 'Sales' } }));
    const otherDep = await prisma.departments.create({ data: { name: `Ops-${run}` } });
    const adminRole = await prisma.roles.create({ data: { role_name: `AdminRole-${run}`, dep_id: salesDep.dep_id, is_admin: true } });
    const mk = (name: string, role: number | null, dep = salesDep.dep_id) =>
      prisma.employees.create({ data: { name: `${name}-${run}`, email: `${name}-${run}@t.in`, mob: '9' + String(Math.random()).slice(2, 11), dep_id: dep, role_id: role, joining_date: new Date() } as never });
    kishan = (await mk('kishan', null)).emp_id;
    dhruv = (await mk('dhruv', null)).emp_id;
    boss = (await mk('boss', adminRole.role_id)).emp_id;
    outsider = (await mk('outsider', null, otherDep.dep_id)).emp_id;
    await prisma.sales_user_rights.create({ data: { emp_id: kishan, can_import: true, can_export: true } });
  });

  afterAll(async () => {
    await app?.close();
  });

  // ------------------------------------------------------------------ rights ----

  describe('Import / Export rights', () => {
    it('a Sales user without the right is refused; the Admin always may; the message says who to ask', async () => {
      const t = await api().get(`${U}/imports/template`).set(as(dhruv)).expect(403);
      expect(t.body.code).toBe('RIGHT_REQUIRED');
      await upload(await workbook([{ 'Company Name': co('NoRight') }]), dhruv).expect(403);
      await api().post(`${U}/exports/companies`).set(as(dhruv)).send({ format: 'xlsx' }).expect(403);
      expect((await api().get(`${U}/rights/me`).set(as(dhruv)).expect(200)).body).toEqual({ can_import: false, can_export: false });
      expect((await api().get(`${U}/rights/me`).set(as(boss)).expect(200)).body).toEqual({ can_import: true, can_export: true });
      await api().get(`${U}/imports/template`).set(as(boss)).expect(200);
    });

    it('someone outside Sales and the Admin cannot even look', async () => {
      await api().get(`${U}/rights/me`).set(as(outsider)).expect(403);
    });

    it('only the Admin sees or changes the rights; only Sales users can be given them', async () => {
      await api().get(`${U}/rights`).set(as(kishan)).expect(403);
      await api().put(`${U}/rights/${dhruv}`).set(as(kishan)).send({ can_export: true }).expect(403);
      await api().put(`${U}/rights/${outsider}`).set(as(boss)).send({ can_export: true }).expect(404);
      await api().put(`${U}/rights/${dhruv}`).set(as(boss)).send({}).expect(400);

      const list = await api().get(`${U}/rights`).set(as(boss)).expect(200);
      expect(list.body.find((u: { emp_id: number }) => u.emp_id === kishan)).toMatchObject({ can_import: true, can_export: true, is_admin: false });
      expect(list.body.find((u: { emp_id: number }) => u.emp_id === boss)).toMatchObject({ is_admin: true, can_import: true });
      expect(list.body.find((u: { emp_id: number }) => u.emp_id === outsider)).toBeUndefined();

      const set = await api().put(`${U}/rights/${dhruv}`).set(as(boss)).send({ can_export: true }).expect(200);
      expect(set.body).toMatchObject({ emp_id: dhruv, can_export: true, can_import: false });
      await api().put(`${U}/rights/${dhruv}`).set(as(boss)).send({ can_export: false }).expect(200);
    });
  });

  // ---------------------------------------------------------------- template ----

  describe('Template', () => {
    it('is an Excel file with the 36 columns, a Lists sheet and instructions; CSV has the header row', async () => {
      const buf = await download(api().get(`${U}/imports/template`).set(as(kishan)));
      const wb = await parse(buf);
      expect(wb.worksheets.map((w) => w.name)).toEqual(['Companies', 'Lists', 'Instructions']);
      const head = (wb.getWorksheet('Companies')!.getRow(1).values as unknown[]).slice(1);
      expect(head).toHaveLength(36);
      expect(head.slice(0, 3)).toEqual(['Company Name', 'No. of Branches', 'No. of Plants']);
      expect(head.slice(-5)).toEqual(['Lead Source', 'Lead By', 'Date Added', 'Service Fit', 'Status']);
      const lists = wb.getWorksheet('Lists')!;
      expect((lists.getRow(1).values as unknown[]).slice(1)).toContain('Industry');
      expect(JSON.stringify(lists.getColumn(1).values)).toContain('Textile');

      const csv = await download(api().get(`${U}/imports/template?format=csv`).set(as(kishan)));
      expect(csv.toString('utf8')).toContain('Company Name,No. of Branches');
    });
  });

  // ------------------------------------------------------------------ import ----

  describe('Import', () => {
    const goodLead = (n: string, extra: Record<string, string | number> = {}) => ({
      'Company Name': co(n), City: 'Surat', 'Contact Person': `${n} Owner`, Designation: 'MD', Mobile: phone(), Email: `${n.toLowerCase()}-${run}@x.in`,
      Industry: 'Textile', 'Lead Source': 'Cold Call', 'Lead By': `kishan-${run}`, 'Service Fit': 'CRM / ERP Software, Website Development', ...extra,
    });
    let job: string;
    let existingId: number;
    const dupMobile = phone();

    it('uploads, matches the columns by name, and checks every row with the Add Company rules', async () => {
      const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
      const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
      const already = await prisma.companies.create({ data: { name: co('Already'), city: 'Surat', industry_id: ind.industry_id, customer_type_id: ct.customer_type_id } });
      existingId = already.company_id;

      const buf = await workbook([
        goodLead('Alpha'), // 2: company + lead
        { 'Company Name': co('Beta'), City: 'Vapi' }, // 3: company only
        goodLead('Gamma', { 'Lead By': '' }), // 4: lead data incomplete: company only, warned
        { 'Company Name': '', City: 'Surat' }, // 5: name missing
        { 'Company Name': co('BadMail'), Email: 'nope', 'Contact Person': 'X' }, // 6
        { 'Company Name': co('Alpha'), City: 'surat' }, // 7: duplicate of row 2 in the file
        { 'Company Name': co('Already'), City: 'Surat' }, // 8: already in the database
        { 'Company Name': co('BadMaster'), Industry: 'Space Mining' }, // 9
        { 'Company Name': co('Gidc'), 'Is GIDC': 'Yes' }, // 10: GIDC name / area missing
        { 'Company Name': co('Dup Mobile 1'), 'Contact Person': 'D', Mobile: dupMobile }, // 11
        { 'Company Name': co('Dup Mobile 2'), 'Contact Person': 'D', Mobile: dupMobile }, // 12: same mobile as row 11
        goodLead('Unknown', { 'Lead By': 'Nobody Here' }), // 13
        { 'Company Name': co('Brochure'), Brochure: 'http://x.in/b.pdf' }, // 14: brochure ignored
      ]);
      const res = await upload(buf).expect(200);
      job = res.body.job_id;

      expect(res.body.file).toMatchObject({ rows: 13, format: 'xlsx' });
      expect(res.body.columns.find((c: { header: string }) => c.header === 'Company Name')).toMatchObject({ field: 'name', how: 'name' });
      expect(res.body.columns.find((c: { header: string }) => c.header === 'Brochure')).toMatchObject({ field: null, how: 'not_importable' });
      expect(res.body.fields).toHaveLength(36);
      expect(res.body.summary).toEqual({ total: 13, ready: 5, already_in_database: 1, with_errors: 7 });
      expect(res.body.will_create).toEqual({ companies: 5, leads: 1 });
      expect(res.body.can_import).toBe(true);

      const errs: Array<{ row: number; field: string; problem: string }> = res.body.errors;
      const at = (row: number) => errs.filter((e) => e.row === row).map((e) => `${e.field}: ${e.problem}`);
      expect(at(5)).toEqual(['Company Name: Please fill this field.']);
      expect(at(6)).toEqual(['Email: Please enter a valid email.']);
      expect(at(7)).toEqual(['Company Name: Duplicate of row 2 in this file.']);
      expect(at(9)[0]).toMatch(/^Industry: "Space Mining" is not in the list/);
      expect(at(10).map((e) => e.split(':')[0])).toEqual(['GIDC Name', 'GIDC Area/Phase']);
      expect(at(12)).toEqual(['Mobile: Duplicate of row 11 in this file.']);
      expect(at(13)[0]).toMatch(/^Lead By: "Nobody Here" is not an active Sales user or Admin/);
      expect(res.body.existing[0]).toMatchObject({ row: 8, matched_company_id: existingId, matched_by: 'name_city' });
      expect(res.body.warnings.some((w: { row: number; message: string }) => w.row === 4 && /Lead Source, Lead By and Service Fit together/.test(w.message))).toBe(true);
    });

    it('the whole upload is refused for a wrong file: empty, not a spreadsheet, no Company Name column', async () => {
      const e1 = await upload(Buffer.from('not a spreadsheet'), kishan, 'x.xlsx');
      expect([400, 415, 422]).toContain(e1.status);
      expect(e1.body.errors[0].field).toBe('file');
      const noName = await workbook([{ City: 'Surat' }], ['City']);
      const up = await upload(noName).expect(200);
      expect(up.body.can_import).toBe(false);
      const bad = await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(kishan)).send({ mapping: { city: 'city' } }).expect(400);
      expect(bad.body.errors[0].field).toBe('mapping');
      await api().post(`${U}/imports`).set(as(kishan)).expect(400);
    });

    it('lets the user change the column match and the options, and checks again', async () => {
      const buf = await workbook([{ Firm: co('Renamed'), Town: 'Surat' }], ['Firm', 'Town']);
      const up = await upload(buf).expect(200);
      expect(up.body.columns.map((c: { field: string | null }) => c.field)).toEqual([null, null]);
      expect(up.body.summary.with_errors).toBe(1);
      const ok = await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(kishan)).send({ mapping: { firm: 'name', town: 'city' } }).expect(200);
      expect(ok.body.summary).toMatchObject({ total: 1, ready: 1, with_errors: 0 });
      const twice = await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(kishan)).send({ mapping: { firm: 'name', town: 'name' } }).expect(400);
      expect(twice.body.errors[0].message).toMatch(/already matched/);
      await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(dhruv)).send({}).expect(403);
    });

    it('imports the rows that passed, skips the one already in the database, never imports error rows', async () => {
      const before = await prisma.companies.count({ where: { name: { contains: run } } });
      const res = await api().post(`${U}/imports/${job}/confirm`).set(as(kishan)).expect(200);
      expect(res.body).toMatchObject({ status: 'completed_with_errors', companies_created: 5, leads_created: 1, skipped_existing: 1, rows_with_errors: 7, rows_failed: 0 });
      expect(await prisma.companies.count({ where: { name: { contains: run } } })).toBe(before + 5);

      const alpha = await prisma.companies.findFirstOrThrow({ where: { name: co('Alpha') }, include: { leads: true, company_persons: { include: { persons: true } } } });
      expect(alpha.company_code).toMatch(/^COM-\d+/);
      expect(alpha.city).toBe('Surat');
      expect(alpha.company_persons[0]).toMatchObject({ is_primary: true, designation: 'MD' });
      expect(alpha.leads).toHaveLength(1);
      expect(alpha.leads[0]).toMatchObject({ lead_stage: 'New', lead_by_id: kishan, owner_id: kishan, lead_source: 'Cold Call', service_fit: 'CRM / ERP Software, Website Development' });
      expect(alpha.leads[0].lead_code).toMatch(/^LEAD-\d+/);
      expect(alpha.industry_id).toBe((await prisma.industries.findFirstOrThrow({ where: { name: 'Textile' } })).industry_id);

      const beta = await prisma.companies.findFirstOrThrow({ where: { name: co('Beta') }, include: { leads: true } });
      expect(beta.leads).toHaveLength(0);
      expect(await prisma.companies.count({ where: { name: co('Gamma') } })).toBe(1);
      expect(await prisma.leads.count({ where: { companies: { name: co('Gamma') } } })).toBe(0);
      expect(await prisma.companies.count({ where: { name: { in: [co('BadMail'), co('BadMaster'), co('Gidc'), co('Dup Mobile 2'), co('Unknown')] } } })).toBe(0);
      expect(await prisma.companies.count({ where: { name: co('Already') } })).toBe(1); // not doubled

      expect(await prisma.activity_logs.count({ where: { entity_type: 'COMPANY', entity_id: alpha.company_id, event: 'CREATED' } })).toBe(1);
      const batch = await prisma.crm_import_batches.findFirstOrThrow({ where: { job_id: job } });
      expect(batch).toMatchObject({ imported_by: kishan, is_undone: false });
      expect((batch.companies_created as number[]).length).toBe(5);
      expect(batch.can_undo_until.getTime() - batch.imported_at.getTime()).toBeGreaterThan(23.9 * 3600 * 1000);

      const again = await api().post(`${U}/imports/${job}/confirm`).set(as(kishan)).expect(409);
      expect(again.body.code).toBe('IMPORT_NOT_OPEN');
    });

    it('tells the Admin, keeps the result, and gives the error rows to fix with a Problem column', async () => {
      const note = await prisma.notifications.findMany({ where: { recipient_id: boss, title: 'Import finished' } });
      expect(note.length).toBeGreaterThan(0);

      const info = await api().get(`${U}/imports/${job}`).set(as(kishan)).expect(200);
      expect(info.body).toMatchObject({ status: 'completed_with_errors', rows: 13, result: { companies_created: 5, leads_created: 1 } });
      expect(info.body.row_results.find((r: { row: number }) => r.row === 2)).toMatchObject({ status: 'created' });
      expect(info.body.row_results.find((r: { row: number }) => r.row === 5)).toMatchObject({ status: 'error' });
      expect(info.body.batch.undone).toBe(false);
      await api().get(`${U}/imports/${job}`).set(as(dhruv)).expect(403);

      const buf = await download(api().get(`${U}/imports/${job}/error-rows`).set(as(kishan)));
      const rows = sheetRows((await parse(buf)).worksheets[0]);
      expect(rows).toHaveLength(7);
      expect(Object.keys(rows[0]).at(-1)).toBe('Problem');
      expect(rows.find((r) => r['Company Name'] === co('BadMail'))!.Problem).toBe('Email: Please enter a valid email.');
      const csv = await download(api().get(`${U}/imports/${job}/error-rows?format=csv`).set(as(kishan)));
      expect(csv.toString('utf8')).toContain('Problem');
    });

    it('rows already in the database can have only their empty fields filled', async () => {
      const buf = await workbook([{ 'Company Name': co('Already'), City: 'Surat', 'Full Address': 'Plot 5, GIDC', State: 'Gujarat' }].map((r) => r), ['Company Name', 'City', 'Full Address', 'State']);
      const up = await upload(buf).expect(200);
      expect(up.body.summary).toMatchObject({ ready: 0, already_in_database: 1 });
      expect(up.body.can_import).toBe(false);
      const chk = await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(kishan)).send({ existing_rows: 'update_empty' }).expect(200);
      expect(chk.body).toMatchObject({ will_fill: 1, can_import: true });

      await prisma.companies.update({ where: { company_id: existingId }, data: { state: 'Maharashtra' } });
      const res = await api().post(`${U}/imports/${up.body.job_id}/confirm`).set(as(kishan)).expect(200);
      expect(res.body).toMatchObject({ companies_created: 0, companies_updated: 1 });
      expect(await prisma.companies.findUniqueOrThrow({ where: { company_id: existingId } })).toMatchObject({ full_address: 'Plot 5, GIDC', state: 'Maharashtra' }); // state not overwritten
    });

    it('nothing to import is an error, not an empty success', async () => {
      const up = await upload(await workbook([{ 'Company Name': co('Already'), City: 'Surat' }], ['Company Name', 'City'])).expect(200);
      const r = await api().post(`${U}/imports/${up.body.job_id}/confirm`).set(as(kishan)).expect(400);
      expect(r.body.errors[0].message).toMatch(/nothing to import/);
    });

    it('limits: more than 1,000 rows is refused', async () => {
      const rows = Array.from({ length: 1001 }, (_, i) => ({ 'Company Name': `Bulk ${i}` }));
      const r = await upload(await workbook(rows, ['Company Name']));
      expect(r.status).toBe(422);
      expect(r.body.code).toBe('TOO_MANY_ROWS');
    });
  });

  // -------------------------------------------------------------------- undo ----

  describe('Undo', () => {
    const importOne = async (names: string[], withLead = false) => {
      const rows = names.map((n) => ({ 'Company Name': co(n), City: 'Surat', 'Contact Person': `${n} P`, Mobile: phone(), ...(withLead ? { 'Lead Source': 'Cold Call', 'Lead By': `kishan-${run}`, 'Service Fit': 'Website Development' } : {}) }));
      const up = await upload(await workbook(rows)).expect(200);
      const done = await api().post(`${U}/imports/${up.body.job_id}/confirm`).set(as(kishan)).expect(200);
      return { job: up.body.job_id as string, done: done.body };
    };

    it('only the Admin can undo', async () => {
      const { job } = await importOne(['UndoA']);
      await api().post(`${U}/imports/${job}/undo`).set(as(kishan)).expect(403);
    });

    it('removes the imported companies, contacts and leads, and cannot be done twice', async () => {
      const { job } = await importOne(['UndoB', 'UndoC'], true);
      const ids = (await prisma.companies.findMany({ where: { name: { in: [co('UndoB'), co('UndoC')] } } })).map((c) => c.company_id);
      expect(await prisma.leads.count({ where: { company_id: { in: ids }, deleted_at: null } })).toBe(2);

      const res = await api().post(`${U}/imports/${job}/undo`).set(as(boss)).expect(200);
      expect(res.body).toMatchObject({ companies_removed: 2, leads_removed: 2 });
      expect(await prisma.companies.count({ where: { company_id: { in: ids }, deleted_at: null } })).toBe(0);
      expect(await prisma.leads.count({ where: { company_id: { in: ids }, deleted_at: null } })).toBe(0);
      expect(await prisma.company_persons.count({ where: { company_id: { in: ids }, deleted_at: null } })).toBe(0);
      expect((await prisma.crm_import_batches.findFirstOrThrow({ where: { job_id: job } })).is_undone).toBe(true);

      const again = await api().post(`${U}/imports/${job}/undo`).set(as(boss)).expect(409);
      expect(again.body.code).toBe('IMPORT_ALREADY_UNDONE');
      // and the same companies can be imported again
      const re = await upload(await workbook([{ 'Company Name': co('UndoB'), City: 'Surat' }])).expect(200);
      expect(re.body.summary).toMatchObject({ ready: 1, already_in_database: 0 });
    });

    it('is refused when a conversation, note or follow-up was added, and names the companies', async () => {
      const { job } = await importOne(['UndoD', 'UndoE'], true);
      const lead = await prisma.leads.findFirstOrThrow({ where: { companies: { name: co('UndoD') } } });
      await prisma.crm_communications.create({ data: { company_id: lead.company_id, lead_id: lead.lead_id, type: 'Call', what_discussed: 'hello', created_by: kishan } });

      const res = await api().post(`${U}/imports/${job}/undo`).set(as(boss)).expect(409);
      expect(res.body.code).toBe('IMPORT_NOT_UNDOABLE');
      expect(res.body.errors[0].blockers).toEqual([expect.objectContaining({ name: co('UndoD'), reason: 'a conversation was logged' })]);
      expect(await prisma.companies.count({ where: { name: co('UndoE'), deleted_at: null } })).toBe(1);
    });

    it('is refused after 24 hours', async () => {
      const { job } = await importOne(['UndoF']);
      await prisma.crm_import_batches.updateMany({ where: { job_id: job }, data: { can_undo_until: new Date(Date.now() - 1000) } });
      const res = await api().post(`${U}/imports/${job}/undo`).set(as(boss)).expect(409);
      expect(res.body.errors[0].message).toMatch(/within 24 hours/);
    });
  });

  // ----------------------------------------------------------------- export ----

  describe('Export', () => {
    let leadIds: number[] = [];
    beforeAll(async () => {
      const up = await upload(await workbook([
        { 'Company Name': co('ExpOne'), City: 'Rajkot', 'Contact Person': 'Exp Owner', Mobile: phone(), Email: `exp1-${run}@x.in`, Designation: 'MD', 'Lead Source': 'Cold Call', 'Lead By': `kishan-${run}`, 'Service Fit': 'Website Development' },
        { 'Company Name': co('ExpTwo'), City: 'Rajkot', 'Lead Source': 'Cold Call', 'Lead By': `dhruv-${run}`, 'Service Fit': 'CRM / ERP Software', 'Contact Person': 'Two', Mobile: phone() },
        { 'Company Name': co('ExpThree'), City: 'Morbi' },
      ])).expect(200);
      await api().post(`${U}/imports/${up.body.job_id}/confirm`).set(as(kishan)).expect(200);
      const leads = await prisma.leads.findMany({ where: { companies: { name: { startsWith: 'Exp', endsWith: run } } }, include: { companies: true }, orderBy: { lead_id: 'asc' } });
      leadIds = leads.map((l) => l.lead_id);
      const one = leads.find((l) => l.companies?.name === co('ExpOne'))!;
      await prisma.crm_communications.create({ data: { company_id: one.company_id, lead_id: one.lead_id, type: 'Call', what_discussed: 'intro call', outcome: 'Interested', created_by: kishan } });
      await prisma.crm_lead_notes.create({ data: { company_id: one.company_id, lead_id: one.lead_id, note_type: 'Budget', note: 'around 2L', created_by: kishan } });
    });

    it('exports the current list with every field: the 36 import columns first, then the extras', async () => {
      const buf = await download(api().post(`${U}/exports/companies?q=${run}&city=Rajkot`).set(as(kishan)).send({ format: 'xlsx' }));
      const wb = await parse(buf);
      const ws = wb.getWorksheet('Companies')!;
      const head = (ws.getRow(1).values as unknown[]).slice(1);
      expect(head).toHaveLength(42);
      expect(head.slice(0, 3)).toEqual(['Company Name', 'No. of Branches', 'No. of Plants']);
      expect(head.slice(30, 36)).toEqual(['Google Business Profile', 'Lead Source', 'Lead By', 'Date Added', 'Service Fit', 'Status']);
      expect(head.slice(36)).toEqual(['Company ID', 'Lead ID', 'Client ID', 'Brochure', 'Created On', 'Created By']);
      const rows = sheetRows(ws);
      expect(rows.map((r) => r['Company Name']).sort()).toEqual([co('ExpOne'), co('ExpTwo')]);
      const one = rows.find((r) => r['Company Name'] === co('ExpOne'))!;
      expect(one).toMatchObject({ City: 'Rajkot', 'Contact Person': 'Exp Owner', Designation: 'MD', 'Lead Source': 'Cold Call', 'Lead By': `kishan-${run}`, 'Service Fit': 'Website Development', Status: 'New' });
      expect(String(one['Company ID'])).toMatch(/^COM-/);
      expect(String(one['Date Added'])).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('an export can be imported again: its columns are matched automatically', async () => {
      const buf = await download(api().post(`${U}/exports/companies?q=${run}`).set(as(kishan)).send({ format: 'xlsx' }));
      const up = await upload(buf).expect(200);
      expect(up.body.columns.filter((c: { field: string | null }) => c.field !== null).length).toBeGreaterThanOrEqual(34);
      expect(up.body.summary.ready).toBe(0); // every one of them is already in the database
    });

    it('exports only the selected rows, with the chosen columns, contacts and conversations & notes', async () => {
      const ids = (await prisma.companies.findMany({ where: { name: { in: [co('ExpOne'), co('ExpThree')] } }, orderBy: { company_id: 'asc' } })).map((c) => c.company_id);
      const buf = await download(api().post(`${U}/exports/companies`).set(as(kishan)).send({
        format: 'xlsx', ids, columns: 'custom', fields: ['name', 'city', 'company_code'], include_contacts: true, include_conversations: true, include_next_follow_up: true,
      }));
      const wb = await parse(buf);
      expect(wb.worksheets.map((w) => w.name)).toEqual(['Companies', 'Contacts', 'Conversations & Notes']);
      const rows = sheetRows(wb.getWorksheet('Companies')!);
      expect(rows.map((r) => r['Company Name'])).toEqual([co('ExpOne'), co('ExpThree')]);
      expect(Object.keys(rows[0])).toEqual(['Company Name', 'City', 'Company ID']);
      const contacts = sheetRows(wb.getWorksheet('Contacts')!);
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject({ 'Company Name': co('ExpOne'), 'Contact Person': 'Exp Owner', Primary: 'Yes' });
      const talk = sheetRows(wb.getWorksheet('Conversations & Notes')!);
      expect(talk.map((t) => [t.Kind, t.Type])).toEqual([['Conversation', 'Call'], ['Note', 'Budget']]);
      expect(talk[0]).toMatchObject({ 'What Was Discussed / Note': 'intro call', Outcome: 'Interested' });
    });

    it('CSV works for one sheet; contacts / conversations need Excel; unknown columns and empty exports are refused', async () => {
      const csv = await download(api().post(`${U}/exports/companies?q=${run}`).set(as(kishan)).send({ format: 'csv', columns: 'visible', fields: ['name', 'city'] }));
      expect(csv.toString('utf8')).toContain('"Company Name","City"');
      const a = await api().post(`${U}/exports/companies?q=${run}`).set(as(kishan)).send({ format: 'csv', include_contacts: true }).expect(400);
      expect(a.body.errors[0].field).toBe('format');
      const b = await api().post(`${U}/exports/companies?q=${run}`).set(as(kishan)).send({ format: 'xlsx', columns: 'custom', fields: ['name', 'secret'] }).expect(400);
      expect(b.body.errors[0].message).toMatch(/secret/);
      const c = await api().post(`${U}/exports/companies?q=zzz-nothing-${run}`).set(as(kishan)).send({ format: 'xlsx' }).expect(400);
      expect(c.body.errors[0].message).toMatch(/nothing to export/);
    });

    it('a Sales user exports only their own leads; the Admin exports all', async () => {
      const mine = sheetRows((await parse(await download(api().post(`${U}/exports/leads?status=all&q=Exp`).set(as(kishan)).send({ format: 'xlsx' })))).worksheets[0]);
      expect(mine.map((r) => r['Company Name']).filter((n) => String(n).startsWith('Exp'))).toEqual([co('ExpOne')]);
      // selecting a colleague's lead by id gives nothing for a Sales user
      const theirs = leadIds[1];
      const sel = sheetRows((await parse(await download(api().post(`${U}/exports/leads`).set(as(kishan)).send({ format: 'xlsx', ids: [theirs] })))).worksheets[0]);
      expect(sel).toHaveLength(0);
      const all = sheetRows((await parse(await download(api().post(`${U}/exports/leads?status=all&q=Exp`).set(as(boss)).send({ format: 'xlsx' })))).worksheets[0]);
      expect(all.map((r) => r['Company Name']).filter((n) => String(n).endsWith(run) && String(n).startsWith('Exp')).sort()).toEqual([co('ExpOne'), co('ExpTwo')]);
      expect(all.find((r) => r['Company Name'] === co('ExpOne'))).toMatchObject({ Status: 'New', Conversations: 1, 'Lead By': `kishan-${run}` });
    });

    it('exports follow-ups', async () => {
      const lead = await prisma.leads.findFirstOrThrow({ where: { companies: { name: co('ExpOne') } } });
      await prisma.crm_follow_ups.create({ data: { company_id: lead.company_id, lead_id: lead.lead_id, follow_up_on: new Date(Date.now() + 86400000), type: 'Call', assigned_to: kishan, purpose: 'Send quote', created_by: kishan } });
      const rows = sheetRows((await parse(await download(api().post(`${U}/exports/follow-ups?tab=upcoming&q=${run}`).set(as(kishan)).send({ format: 'xlsx' })))).worksheets[0]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ 'Company Name': co('ExpOne'), Type: 'Call', Purpose: 'Send quote', 'Assigned To': `kishan-${run}`, Status: 'Pending' });
    });
  });

  // ----------------------------------------------------------------- history ----

  describe('History', () => {
    it('lists imports and exports; the Admin sees everyone, a Sales user only their own', async () => {
      const mine = await api().get(`${U}/history`).set(as(kishan)).expect(200);
      expect(mine.body.length).toBeGreaterThan(5);
      expect(mine.body.every((h: { by: { emp_id: number } }) => h.by.emp_id === kishan)).toBe(true);
      expect(mine.body.some((h: { kind: string; entity: string }) => h.kind === 'export' && h.entity === 'sales_export_companies')).toBe(true);
      const imp = mine.body.find((h: { kind: string; result: unknown }) => h.kind === 'import' && h.result);
      expect(imp).toMatchObject({ status: expect.stringMatching(/completed/), undo: { can_undo: expect.any(Boolean), undone: expect.any(Boolean) } });
      expect(mine.body.every((h: { status: string }) => h.status !== 'previewed')).toBe(true);

      const none = await api().get(`${U}/history`).set(as(dhruv)).expect(200);
      expect(none.body.filter((h: { by: { emp_id: number } }) => h.by.emp_id !== dhruv)).toHaveLength(0);
      const all = await api().get(`${U}/history?limit=200`).set(as(boss)).expect(200);
      expect(all.body.some((h: { by: { emp_id: number } }) => h.by.emp_id === kishan)).toBe(true);
    });
  });
});
