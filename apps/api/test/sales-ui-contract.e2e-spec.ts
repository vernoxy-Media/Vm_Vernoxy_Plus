import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import * as dotenv from 'dotenv';
import * as path from 'path';

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

/**
 * The Sales screens call the API with these exact query strings and bodies.
 * The API rejects anything it does not know (400), so this suite keeps the screens and the API in step.
 */
describe('Sales - what the screens send (e2e)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  let kishan: number;
  let boss: number;
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());
  const U = '/api/v1/sales';

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
    const ensure = async (lookup_type: string, code: string, label: string, sort_order: number) => {
      if (!(await prisma.master_lookup.findFirst({ where: { lookup_type, code } }))) await prisma.master_lookup.create({ data: { lookup_type, code, label, sort_order } });
    };
    await ensure('lead_source', 'cold_call', 'Cold Call', 30);
    await ensure('service_fit', 'crm_erp', 'CRM / ERP Software', 20);

    const salesDep = (await prisma.departments.findFirst({ where: { name: 'Sales' } })) ?? (await prisma.departments.create({ data: { name: 'Sales' } }));
    const adminRole = await prisma.roles.create({ data: { role_name: `AdminRole-${run}`, dep_id: salesDep.dep_id, is_admin: true } });
    const mk = (name: string, role: number | null) =>
      prisma.employees.create({ data: { name: `${name}-${run}`, email: `${name}-${run}@t.in`, mob: '9' + String(Math.random()).slice(2, 11), dep_id: salesDep.dep_id, role_id: role, joining_date: new Date() } as never });
    kishan = (await mk('kishan', null)).emp_id;
    boss = (await mk('boss', adminRole.role_id)).emp_id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('Add Company form: company + contact body, then the id comes back as company_id', async () => {
    const res = await api().post(`${U}/companies`).set(as(kishan)).send({
      company: { name: `UiCo ${run}`, city: 'Surat', country: 'India', is_gidc: false, no_of_branches: 2, estimated_turnover: 4500000, website_quality: 'No Website' },
      contact: { name: 'Owner', designation: 'MD', mobile: '9' + String(Date.now()).slice(-9), email: `ui-${run}@x.in` },
      confirm_duplicate: false,
    }).expect(201);
    expect(res.body.company_id).toEqual(expect.any(Number));
    expect(res.body.contacts).toHaveLength(1);
  });

  it('Companies list: the query the page builds (q, lead, sort, order, page, limit and filters)', async () => {
    const res = await api().get(`${U}/companies`).query({ q: run, lead: 'not_a_lead', sort: 'created_at', order: 'desc', page: 1, limit: 10, city: 'Surat', website_quality: 'Good,No Website', turnover_min: 1 }).set(as(kishan)).expect(200);
    expect(res.body.counters).toEqual(expect.objectContaining({ total: expect.any(Number), not_a_lead: expect.any(Number), open_leads: expect.any(Number), converted_to_client: expect.any(Number) }));
    expect(res.body.total_pages).toEqual(expect.any(Number));
    expect(res.body.items[0]).toEqual(expect.objectContaining({ company_id: expect.any(Number) }));
  });

  it('Convert to Lead pop-up: the form comes with flat lists and the defaults', async () => {
    const co = await prisma.companies.findFirstOrThrow({ where: { name: `UiCo ${run}` } });
    const form = await api().get(`${U}/companies/${co.company_id}/lead-form`).set(as(kishan)).expect(200);
    expect(form.body.lead_sources).toEqual(expect.arrayContaining(['Cold Call']));
    expect(form.body.service_fits).toEqual(expect.arrayContaining(['CRM / ERP Software']));
    expect(form.body.lead_by_users.length).toBeGreaterThan(0);
    expect(form.body.defaults).toEqual(expect.objectContaining({ lead_source: expect.any(String), lead_by: expect.objectContaining({ emp_id: kishan }) }));
    expect(form.body.next_lead_code).toMatch(/^LEAD-/);
  });

  it('Companies counters do not change when a counter card (the "lead" filter) is clicked', async () => {
    const get = (lead?: string) => api().get(`${U}/companies`).query({ q: run, ...(lead ? { lead } : {}) }).set(as(kishan)).expect(200);
    const all = await get();
    for (const lead of ['not_a_lead', 'open', 'client', 'lost']) {
      const res = await get(lead);
      expect(res.body.counters).toEqual(all.body.counters);
    }
    expect(all.body.counters.total).toBeGreaterThan(0);
  });

  describe('with a lead', () => {
    let leadId: number;
    let companyId: number;
    beforeAll(async () => {
      companyId = (await prisma.companies.findFirstOrThrow({ where: { name: `UiCo ${run}` } })).company_id;
      const lead = await api().post(`${U}/companies/${companyId}/convert-to-lead`).set(as(kishan)).send({ lead_source: 'Cold Call', service_fit: ['CRM / ERP Software'], lead_by_id: kishan }).expect(201);
      leadId = lead.body.lead_id;
    });

    it('Leads list: status, sort, order, lead_source, follow_up, added_from, no_conversation_days', async () => {
      const res = await api().get(`${U}/leads`).query({ status: 'all', q: run, sort: 'date_added', order: 'desc', page: 1, limit: 10, lead_by: 'me', lead_source: 'Cold Call', service_fit: 'CRM / ERP Software', follow_up: 'none', no_conversation_days: 7 }).set(as(kishan)).expect(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.counters.by_status).toBeDefined();
    });

    it('Kanban board: every column has its own count and cards', async () => {
      const res = await api().get(`${U}/leads/board`).query({ q: run, lead_source: 'Cold Call', per_column: 30 }).set(as(kishan)).expect(200);
      expect(res.body.columns.map((c: { status: string }) => c.status)).toEqual(['New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost']);
      expect(res.body.columns[0]).toEqual(expect.objectContaining({ count: expect.any(Number), cards: expect.any(Array) }));
      expect(res.body.counters.by_status).toBeDefined();
    });

    it('Lead page: qualification checklist, conversation (outcome + what_discussed), note (note_type), history and timeline', async () => {
      const q = await api().get(`${U}/leads/${leadId}/qualification`).set(as(kishan)).expect(200);
      expect(q.body.items[0]).toEqual(expect.objectContaining({ key: expect.any(String), label: expect.any(String), done: expect.any(Boolean) }));

      const contact = (await prisma.persons.findFirstOrThrow({ where: { email: `ui-${run}@x.in` } })).person_id;
      await api().post(`${U}/leads/${leadId}/conversations`).set(as(kishan)).send({
        type: 'Call', contact_id: contact, outcome: 'Interested', what_discussed: 'Intro call',
        next_follow_up: { follow_up_on: new Date(Date.now() + 2 * 86400000).toISOString(), type: 'Call', purpose: 'Send quote' },
      }).expect(201);
      const convs = await api().get(`${U}/leads/${leadId}/conversations`).set(as(kishan)).expect(200);
      const rows = Array.isArray(convs.body) ? convs.body : convs.body.items;
      expect(rows[0]).toEqual(expect.objectContaining({ communication_id: expect.any(Number), what_discussed: 'Intro call', outcome: 'Interested', communication_date: expect.any(String) }));

      const note = await api().post(`${U}/leads/${leadId}/notes`).set(as(kishan)).send({ note_type: 'Budget', note: 'around 2L', is_pinned: true }).expect(201);
      expect(note.body.note_id).toEqual(expect.any(Number));
      await api().patch(`${U}/notes/${note.body.note_id}`).set(as(kishan)).send({ note_type: 'Budget', note: 'about 2.5L', is_pinned: false }).expect(200);
      const notes = await api().get(`${U}/leads/${leadId}/notes`).set(as(kishan)).expect(200);
      expect(notes.body[0]).toEqual(expect.objectContaining({ note_id: expect.any(Number), note_type: 'Budget' }));

      const hist = await api().get(`${U}/leads/${leadId}/history`).set(as(kishan)).expect(200);
      expect((Array.isArray(hist.body) ? hist.body : hist.body.items)[0]).toEqual(expect.objectContaining({ log_id: expect.any(Number), performed_at: expect.any(String) }));
      await api().get(`${U}/companies/${companyId}/history`).set(as(kishan)).expect(200);
    });

    it('Lead panel composer: quick-log a Call and a Note, then schedule the next follow-up on the lead', async () => {
      const call = await api().post(`${U}/leads/${leadId}/quick-log`).set(as(kishan)).send({ type: 'Call', text: 'Spoke to the owner, wants a quote' }).expect(201);
      expect(call.body.kind).toBe('conversation');
      const note = await api().post(`${U}/leads/${leadId}/quick-log`).set(as(kishan)).send({ type: 'Note', text: 'Budget around 2L' }).expect(201);
      expect(note.body.kind).toBe('note');
      const next = await api().post(`${U}/leads/${leadId}/follow-ups`).set(as(kishan)).send({ type: 'Call', follow_up_on: new Date(Date.now() + 3 * 86400000).toISOString() }).expect(201);
      expect(next.body.follow_up_id).toEqual(expect.any(Number));
      const tl = await api().get(`${U}/leads/${leadId}/timeline`).query({ limit: 12 }).set(as(kishan)).expect(200);
      expect((Array.isArray(tl.body) ? tl.body : tl.body.items).length).toBeGreaterThan(0);
    });

    it('Follow-ups list: tab, q, date_from, industry_ids, assigned_to; and a lead\'s own list carries related_to and actions', async () => {
      const res = await api().get(`${U}/follow-ups`).query({ tab: 'upcoming', page: 1, limit: 10, q: run, assigned_to: 'me', type: 'Call', date_from: '2020-01-01', date_to: '2099-01-01' }).set(as(kishan)).expect(200);
      expect(res.body.tab_counts).toBeDefined();
      const one = res.body.items.find((f: { company: { name: string } }) => f.company.name === `UiCo ${run}`);
      expect(one).toEqual(expect.objectContaining({ follow_up_id: expect.any(Number), follow_up_on: expect.any(String), related_to: expect.objectContaining({ lead_id: leadId }), actions: expect.arrayContaining(['complete']) }));

      const own = await api().get(`${U}/leads/${leadId}/follow-ups`).set(as(kishan)).expect(200);
      expect(own.body[0].related_to.lead_id).toBe(leadId);

      // Complete: outcome is one of the five, next_step.action is one of the five
      await api().post(`${U}/follow-ups/${one.follow_up_id}/complete`).set(as(kishan)).send({ outcome: 'Interested', what_happened: 'Quote sent', next_step: { action: 'none' } }).expect(200);
    });

    it('Mark as Won: the pop-up form has client_id_preview, won_on range and carried_forward lines', async () => {
      await prisma.leads.update({ where: { lead_id: leadId }, data: { lead_stage: 'Qualified' } });
      const form = await api().get(`${U}/leads/${leadId}/client-form`).set(as(kishan)).expect(200);
      expect(form.body.client_id_preview).toMatch(/^CLI-/);
      expect(form.body.won_on).toEqual({ default: expect.any(String), min: expect.any(String), max: expect.any(String) });
      expect(Array.isArray(form.body.carried_forward)).toBe(true);
    });
  });

  it('History and rights: history takes only limit; rights/me and rights list', async () => {
    const h = await api().get(`${U}/history`).query({ limit: 200 }).set(as(kishan)).expect(200);
    expect(Array.isArray(h.body)).toBe(true);
    await api().get(`${U}/rights/me`).set(as(kishan)).expect(200);
    const list = await api().get(`${U}/rights`).set(as(boss)).expect(200);
    expect(list.body[0]).toEqual(expect.objectContaining({ emp_id: expect.any(Number), is_admin: expect.any(Boolean) }));
  });

  it('Import check body: mapping, create_leads and existing_rows are top-level', async () => {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Companies');
    ws.addRow(['Company Name', 'City']);
    ws.addRow([`UiImp ${run}`, 'Surat']);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const up = await api().post(`${U}/imports`).set(as(boss)).attach('file', buf, 'a.xlsx').expect(200);
    expect(up.body.columns[0]).toEqual(expect.objectContaining({ key: 'company_name', header: 'Company Name', field: 'name' }));
    await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(boss)).send({ mapping: { company_name: 'name', city: 'city' }, create_leads: true, existing_rows: 'skip' }).expect(200);
    const bad = await api().post(`${U}/imports/${up.body.job_id}/check`).set(as(boss)).send({ options: { create_leads: true } }).expect(400);
    expect(bad.body.code).toBeDefined();
  });

  it('Export body: format + columns + fields (no "scope")', async () => {
    await api().post(`${U}/exports/companies?q=${run}`).set(as(boss)).send({ format: 'xlsx', columns: 'custom', fields: ['name', 'city', 'company_code'], include_contacts: false, include_conversations: false }).expect(200);
    await api().post(`${U}/exports/companies?q=${run}`).set(as(boss)).send({ format: 'xlsx', scope: 'all' }).expect(400);
  });
});
