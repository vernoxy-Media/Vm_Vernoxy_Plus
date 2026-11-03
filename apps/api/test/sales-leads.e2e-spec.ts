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

describe('Sales - Convert to Lead, Leads list and Kanban (e2e)', () => {
  jest.setTimeout(90000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  let kishan: number; // Sales user
  let dhruv: number; // Sales user
  let boss: number; // Admin
  let dev: number; // not allowed
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());
  const IN_ONE_HOUR = () => new Date(Date.now() + 60 * 60 * 1000);

  const newCompany = async (name: string, extra: Record<string, unknown> = {}) => {
    const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
    const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
    return prisma.companies.create({
      data: { name: `${name} ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id, ...extra },
    });
  };

  beforeAll(async () => {
    await assertTestEnvironment(process.env.DATABASE_URL!);

    const moduleRef = await Test.createTestingModule({ imports: [SalesModule, FakeEventsModule] })
      .overrideModule(AuthModule)
      .useModule(FakeAuthModule)
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);

    // Masters this suite needs (created once, shared with other suites).
    if (!(await prisma.customer_types.findFirst({ where: { name: 'Prospect' } }))) await prisma.customer_types.create({ data: { name: 'Prospect' } });
    if (!(await prisma.industries.findFirst({ where: { name: 'Unclassified' } }))) await prisma.industries.create({ data: { name: 'Unclassified' } });
    const ensureLookup = async (lookup_type: string, code: string, label: string, sort_order: number) => {
      if (!(await prisma.master_lookup.findFirst({ where: { lookup_type, code } }))) {
        await prisma.master_lookup.create({ data: { lookup_type, code, label, sort_order } });
      }
    };
    await ensureLookup('lead_source', 'cold_call', 'Cold Call', 30);
    await ensureLookup('lead_source', 'referral', 'Referral', 20);
    await ensureLookup('lead_source', 'existing_client', 'Existing Client', 80);
    await ensureLookup('service_fit', 'website_development', 'Website Development', 10);
    await ensureLookup('service_fit', 'crm_erp', 'CRM / ERP Software', 20);
    await ensureLookup('service_fit', 'mobile_app', 'Mobile App', 30);

    const salesDep = (await prisma.departments.findFirst({ where: { name: 'Sales' } })) ?? (await prisma.departments.create({ data: { name: 'Sales' } }));
    const devDep = (await prisma.departments.findFirst({ where: { name: 'Developer' } })) ?? (await prisma.departments.create({ data: { name: 'Developer' } }));
    const adminRole = await prisma.roles.create({ data: { role_name: `AdminRole-${run}`, dep_id: salesDep.dep_id, is_admin: true } });
    const mk = (name: string, dep: number, role: number | null) =>
      prisma.employees.create({
        data: { name: `${name}-${run}`, email: `${name}-${run}@t.in`, mob: '9' + String(Math.random()).slice(2, 11), dep_id: dep, role_id: role, joining_date: new Date() } as never,
      });
    kishan = (await mk('kishan', salesDep.dep_id, null)).emp_id;
    dhruv = (await mk('dhruv', salesDep.dep_id, null)).emp_id;
    boss = (await mk('boss', salesDep.dep_id, adminRole.role_id)).emp_id;
    dev = (await mk('dev', devDep.dep_id, null)).emp_id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('the popup data: company strip, defaults, Lead ID preview and dropdown values', async () => {
    const co = await newCompany('Popup Co', { mobile: '9000000001' });
    const person = await prisma.persons.create({ data: { name: 'Rakesh Shah', mobile: '9825041236' } });
    await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: person.person_id, designation: 'Managing Director', is_primary: true } });
    await prisma.crm_communications.create({ data: { company_id: co.company_id, type: 'Call', what_discussed: 'Intro call', created_by: kishan } });

    const res = await api().get(`/api/v1/sales/companies/${co.company_id}/lead-form`).set(as(kishan)).expect(200);
    expect(res.body.company).toMatchObject({ company_id: co.company_id, is_client: false });
    expect(res.body.primary_contact).toMatchObject({ name: 'Rakesh Shah', designation: 'Managing Director' });
    expect(res.body.communication_count).toBe(1);
    expect(res.body.next_lead_code).toMatch(/^LEAD-\d{4}$/);
    expect(res.body.defaults).toMatchObject({ lead_source: 'Cold Call', status: 'New' });
    expect(res.body.defaults.lead_by.emp_id).toBe(kishan);
    expect(res.body.lead_sources).toEqual(expect.arrayContaining(['Cold Call', 'Referral']));
    expect(res.body.service_fits).toEqual(expect.arrayContaining(['Website Development', 'CRM / ERP Software']));
    const ids = res.body.lead_by_users.map((u: { emp_id: number }) => u.emp_id);
    expect(ids).toEqual(expect.arrayContaining([kishan, dhruv, boss]));
    expect(ids).not.toContain(dev);
    expect(res.body.open_lead).toBeNull();
  });

  it('keeps non-sales users out', async () => {
    const co = await newCompany('Locked Co');
    await api().get(`/api/v1/sales/companies/${co.company_id}/lead-form`).set(as(dev)).expect(403);
    await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(dev)).send({ service_fit: ['Mobile App'] }).expect(403);
    await api().get('/api/v1/sales/leads').set(as(dev)).expect(403);
    await api().get('/api/v1/sales/leads/board').set(as(dev)).expect(403);
  });

  it('converts a company to a lead: New, LEAD- id, primary contact copied, first note saved, History written', async () => {
    const co = await newCompany('Convert Co');
    const person = await prisma.persons.create({ data: { name: 'Nirav Patel', mobile: '9811111111' } });
    await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: person.person_id, is_primary: true } });

    const res = await api()
      .post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`)
      .set(as(kishan))
      .send({ service_fit: ['website development', 'CRM / ERP Software'], first_note: 'Needs a new website with catalogue' })
      .expect(201);

    expect(res.body.lead_code).toMatch(/^LEAD-\d{4}$/);
    expect(res.body).toMatchObject({ status: 'New', lead_source: 'Cold Call' });
    expect(res.body.service_fit).toEqual(['Website Development', 'CRM / ERP Software']);
    expect(res.body.lead_by.emp_id).toBe(kishan);
    expect(res.body.primary_contact).toMatchObject({ name: 'Nirav Patel' });
    expect(res.body.company.company_id).toBe(co.company_id);
    expect(res.body.counts).toEqual({ conversations: 0, open_follow_ups: 0, notes: 1 });

    const note = await prisma.crm_lead_notes.findFirstOrThrow({ where: { lead_id: res.body.lead_id } });
    expect(note).toMatchObject({ note_type: 'Requirement', note: 'Needs a new website with catalogue', created_by: kishan });
    const row = await prisma.leads.findUniqueOrThrow({ where: { lead_id: res.body.lead_id } });
    expect(row).toMatchObject({ status: 'open', lead_stage: 'New', owner_id: kishan, person_id: person.person_id });
    const leadEvent = await prisma.activity_logs.findMany({ where: { entity_type: 'LEAD', entity_id: res.body.lead_id } });
    const companyEvent = await prisma.activity_logs.findMany({ where: { entity_type: 'COMPANY', entity_id: co.company_id, event: 'LEAD_CREATED' } });
    expect(leadEvent.map((e) => e.event)).toEqual(['CREATED']);
    expect(companyEvent).toHaveLength(1);
    expect(companyEvent[0].summary).toContain(res.body.lead_code);

    // The company list now shows the lead and hides Convert to Lead.
    const list = await api().get('/api/v1/sales/companies').query({ q: co.company_code! }).set(as(kishan)).expect(200);
    expect(list.body.items[0]).toMatchObject({ can_convert_to_lead: false, lead: { kind: 'lead', stage: 'New', lead_code: res.body.lead_code } });
    expect(list.body.counters.open_leads).toBe(1);
  });

  it('refuses a second open lead and points at the existing one', async () => {
    const co = await newCompany('Once Co');
    const first = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['Mobile App'] }).expect(201);
    const again = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(dhruv)).send({ service_fit: ['Mobile App'] }).expect(409);
    expect(again.body.code).toBe('OPEN_LEAD_EXISTS');
    expect(again.body.errors[0].lead).toMatchObject({ lead_id: first.body.lead_id, lead_code: first.body.lead_code, stage: 'New' });
    expect(again.body.detail).toBe(`This company is already ${first.body.lead_code} (New).`);
    const form = await api().get(`/api/v1/sales/companies/${co.company_id}/lead-form`).set(as(dhruv)).expect(200);
    expect(form.body.open_lead.lead_id).toBe(first.body.lead_id);

    // Once that lead is Lost the company can be converted again, with a new Lead ID.
    await prisma.leads.update({ where: { lead_id: first.body.lead_id }, data: { lead_stage: 'Lost', lost_reason: 'Budget too low' } });
    const second = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(dhruv)).send({ service_fit: ['Mobile App'] }).expect(201);
    expect(second.body.lead_code).not.toBe(first.body.lead_code);
  });

  it('survives two people converting the same company at the same moment', async () => {
    const co = await newCompany('Race Co');
    const attempts = await Promise.all(
      [kishan, dhruv, boss, kishan].map((id) =>
        api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(id)).send({ service_fit: ['Mobile App'] }),
      ),
    );
    const codes = attempts.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(3);
    expect(await prisma.leads.count({ where: { company_id: co.company_id, deleted_at: null } })).toBe(1);
  });

  it('validates the popup and saves nothing when it fails', async () => {
    const co = await newCompany('Invalid Co');
    const res = await api()
      .post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`)
      .set(as(kishan))
      .send({ lead_source: 'Smoke signals', lead_by_id: dev, service_fit: ['Teleportation'] })
      .expect(400);
    const byField = Object.fromEntries(res.body.errors.map((e: { field: string; message: string }) => [e.field, e.message]));
    expect(Object.keys(byField).sort()).toEqual(['lead_by_id', 'lead_source', 'service_fit']);
    const empty = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(kishan)).send({}).expect(400);
    expect(empty.body.errors[0]).toMatchObject({ field: 'service_fit', message: 'Please fill this field.' });
    expect(await prisma.leads.count({ where: { company_id: co.company_id } })).toBe(0);
    await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['Mobile App'], hacker: 1 }).expect(400);
    await api().post('/api/v1/sales/companies/99999999/convert-to-lead').set(as(kishan)).send({ service_fit: ['Mobile App'] }).expect(404);
  });

  it('a client gets the source "Existing client"; a lead made for a colleague notifies that colleague', async () => {
    const client = await newCompany('Client Co', { is_client: true, client_code: `CLI-${run}` });
    const a = await api().post(`/api/v1/sales/companies/${client.company_id}/convert-to-lead`).set(as(kishan)).send({ lead_source: 'Cold Call', service_fit: ['CRM / ERP Software'] }).expect(201);
    expect(a.body.lead_source).toBe('Existing Client');

    const co = await newCompany('Gift Co');
    const b = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(kishan)).send({ lead_by_id: dhruv, service_fit: ['Mobile App'] }).expect(201);
    expect(b.body.lead_by.emp_id).toBe(dhruv);
    const note = await prisma.notifications.findFirst({ where: { recipient_id: dhruv, entity_type: 'LEAD', entity_id: b.body.lead_id } });
    expect(note).toMatchObject({ kind: 'lead_assigned', created_by: kishan });
    expect(note!.title).toContain('Gift Co');
    // Not told about leads made for oneself.
    expect(await prisma.notifications.count({ where: { recipient_id: kishan, entity_type: 'LEAD', entity_id: a.body.lead_id } })).toBe(0);
  });

  describe('Leads list and Kanban', () => {
    const ids: Record<string, number> = {};

    beforeAll(async () => {
      const mkLead = async (key: string, owner: number, stage: string, extra: Record<string, unknown> = {}, company: Record<string, unknown> = {}) => {
        const co = await newCompany(`L-${key}`, { city: 'Surat', ...company });
        const lead = await prisma.leads.create({
          data: { company_id: co.company_id, title: key, pipeline_stage_id: 1, owner_id: owner, lead_by_id: owner, lead_stage: stage, lead_source: 'Cold Call', service_fit: 'Website Development', ...extra } as never,
        });
        ids[key] = lead.lead_id;
        return lead;
      };
      await mkLead('k-new', kishan, 'New');
      const lc = await mkLead('k-contacted', kishan, 'Contacted', {}, { city: 'Vapi' });
      await mkLead('k-qualified', kishan, 'Qualified', { service_fit: 'CRM / ERP Software' });
      await mkLead('k-hold', kishan, 'On Hold');
      await mkLead('k-lost', kishan, 'Lost', { lost_reason: 'Chose a competitor' });
      await mkLead('k-conv', kishan, 'Converted', { won_on: new Date() }, { is_client: true, client_code: `CLI-K-${run}` });
      await mkLead('d-new', dhruv, 'New');
      // Follow-ups drive "next follow-up" through the DB trigger.
      await prisma.crm_follow_ups.create({ data: { lead_id: ids['k-contacted'], follow_up_on: new Date(Date.now() - 3 * 24 * 3600 * 1000), type: 'Call', assigned_to: kishan, status: 'Overdue' } });
      await prisma.crm_follow_ups.create({ data: { lead_id: ids['k-qualified'], follow_up_on: IN_ONE_HOUR(), type: 'Call', assigned_to: kishan } });
      await prisma.crm_follow_ups.create({ data: { lead_id: ids['k-hold'], follow_up_on: new Date(Date.now() + 5 * 24 * 3600 * 1000), type: 'Email', assigned_to: kishan } });
      await prisma.crm_communications.create({ data: { lead_id: ids['k-contacted'], company_id: lc.company_id, type: 'Call', what_discussed: 'hi', created_by: kishan } });
    });

    const mine = (res: { body: { items: Array<{ lead_id: number }> } }) => res.body.items.map((i) => i.lead_id).filter((id) => Object.values(ids).includes(id));

    it('Sales user sees only their own open leads, most urgent first, leads without a follow-up last', async () => {
      const res = await api().get('/api/v1/sales/leads').query({ limit: 100 }).set(as(kishan)).expect(200);
      expect(mine(res)).toEqual([ids['k-contacted'], ids['k-qualified'], ids['k-hold'], ids['k-new']]);
      expect(res.body.items.every((i: { lead_by: { emp_id: number } }) => i.lead_by.emp_id === kishan)).toBe(true);
      const contacted = res.body.items.find((i: { lead_id: number }) => i.lead_id === ids['k-contacted']);
      expect(contacted).toMatchObject({ status: 'Contacted', next_follow_up: { flag: 'overdue' }, service_fit: ['Website Development'], company: { city: 'Vapi' } });
      expect(contacted.company.initials).toHaveLength(2);
    });

    it('a Sales user cannot widen the view to other people; the Admin can', async () => {
      const asDhruv = await api().get('/api/v1/sales/leads').query({ lead_by: 'all', limit: 100 }).set(as(dhruv)).expect(200);
      expect(mine(asDhruv)).toEqual([ids['d-new']]);
      const sneaky = await api().get('/api/v1/sales/leads').query({ lead_by: String(kishan), limit: 100 }).set(as(dhruv)).expect(200);
      expect(mine(sneaky)).toEqual([ids['d-new']]);
      const admin = await api().get('/api/v1/sales/leads').query({ limit: 100, q: run }).set(as(boss)).expect(200); // q keeps the page to this run's leads as the shared test database grows
      expect(mine(admin)).toEqual(expect.arrayContaining([ids['k-new'], ids['d-new']]));
      const onlyDhruv = await api().get('/api/v1/sales/leads').query({ lead_by: String(dhruv), limit: 100, q: run }).set(as(boss)).expect(200);
      expect(mine(onlyDhruv)).toEqual([ids['d-new']]);
    });

    it('filters by status, follow-up, city, service fit, search and conversation age', async () => {
      const get = async (q: Record<string, unknown>) => mine(await api().get('/api/v1/sales/leads').query({ limit: 100, ...q }).set(as(kishan)).expect(200));
      expect(await get({ status: 'all' })).toHaveLength(6);
      expect(await get({ status: 'Lost' })).toEqual([ids['k-lost']]);
      expect(await get({ status: 'Lost', lost_reason: 'chose a competitor' })).toEqual([ids['k-lost']]);
      expect(await get({ status: 'Converted' })).toEqual([ids['k-conv']]);
      expect(await get({ follow_up: 'overdue' })).toEqual([ids['k-contacted']]);
      expect(await get({ follow_up: 'none' })).toEqual([ids['k-new']]);
      expect(await get({ city: 'vapi' })).toEqual([ids['k-contacted']]);
      expect(await get({ service_fit: 'crm / erp software' })).toEqual([ids['k-qualified']]);
      expect(await get({ q: `L-k-hold ${run}` })).toEqual([ids['k-hold']]);
      expect(await get({ no_conversation_days: 7 })).not.toContain(ids['k-contacted']);
      expect(await get({ no_conversation_days: 7 })).toContain(ids['k-new']);
      expect(await get({ date_added: 'today' })).toHaveLength(4);
      expect(await get({ sort: 'company', order: 'asc' })).toEqual([ids['k-contacted'], ids['k-hold'], ids['k-new'], ids['k-qualified']]);
    });

    it('counts leads per status and follow-ups due today, ignoring the status filter', async () => {
      const res = await api().get('/api/v1/sales/leads').query({ status: 'Lost', limit: 1 }).set(as(kishan)).expect(200);
      const c = res.body.counters;
      expect(c.by_status.New).toBeGreaterThanOrEqual(1);
      expect(c.by_status).toEqual(expect.objectContaining({ Contacted: expect.any(Number), Qualified: expect.any(Number), 'On Hold': expect.any(Number), Converted: expect.any(Number), Lost: expect.any(Number) }));
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(typeof c.follow_ups_due_today).toBe('number');
    });

    it('paginates 10 per page by default', async () => {
      const res = await api().get('/api/v1/sales/leads').set(as(boss)).expect(200);
      expect(res.body.limit).toBe(10);
      expect(res.body.items.length).toBeLessThanOrEqual(10);
      const p2 = await api().get('/api/v1/sales/leads').query({ page: 2, limit: 2 }).set(as(boss)).expect(200);
      expect(p2.body.page).toBe(2);
      expect(p2.body.items).toHaveLength(2);
    });

    it('Kanban: one column per status in order, with cards, counts, follow-up due and client / lost info', async () => {
      const res = await api().get('/api/v1/sales/leads/board').set(as(kishan)).expect(200);
      expect(res.body.columns.map((c: { status: string }) => c.status)).toEqual(['New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost']);
      const col = (s: string) => res.body.columns.find((c: { status: string }) => c.status === s);
      const card = (s: string, key: string) => col(s).cards.find((c: { lead_id: number }) => c.lead_id === ids[key]);
      expect(col('Contacted').count).toBe(col('Contacted').cards.length);
      expect(card('Contacted', 'k-contacted')).toMatchObject({ follow_up_due: true, next_follow_up: { flag: 'overdue' } });
      expect(card('Qualified', 'k-qualified')).toMatchObject({ follow_up_due: expect.any(Boolean) });
      expect(card('On Hold', 'k-hold')).toMatchObject({ follow_up_due: false });
      expect(card('Converted', 'k-conv')).toMatchObject({ client_code: `CLI-K-${run}` });
      expect(card('Lost', 'k-lost')).toMatchObject({ lost_reason: 'Chose a competitor' });
      expect(res.body.per_column).toBe(20);
      expect(res.body.counters.by_status.Lost).toBeGreaterThanOrEqual(1);

      const narrowed = await api().get('/api/v1/sales/leads/board').query({ city: 'vapi', per_column: 1 }).set(as(kishan)).expect(200);
      expect(narrowed.body.columns.find((c: { status: string }) => c.status === 'Contacted').count).toBe(1);
      expect(narrowed.body.columns.find((c: { status: string }) => c.status === 'New').count).toBe(0);
      const onlyOpenCols = await api().get('/api/v1/sales/leads/board').query({ status: 'Lost' }).set(as(kishan)).expect(200);
      expect(onlyOpenCols.body.columns.map((c: { status: string }) => c.status)).toEqual(['Lost']);
    });

    it('Lead Details: header, summary and counts; 404 for an unknown lead; bad filters are 400', async () => {
      const res = await api().get(`/api/v1/sales/leads/${ids['k-contacted']}`).set(as(kishan)).expect(200);
      expect(res.body).toMatchObject({ status: 'Contacted', counts: { conversations: 1, open_follow_ups: 1, notes: 0 }, next_follow_up: { flag: 'overdue' } });
      const conv = await api().get(`/api/v1/sales/leads/${ids['k-conv']}`).set(as(kishan)).expect(200);
      expect(conv.body.client_code).toBe(`CLI-K-${run}`);
      await api().get('/api/v1/sales/leads/99999999').set(as(kishan)).expect(404);
      await api().get('/api/v1/sales/leads').query({ status: 'Won' }).set(as(kishan)).expect(400);
      await api().get('/api/v1/sales/leads').query({ lead_by: 'everyone' }).set(as(kishan)).expect(400);
      await api().get('/api/v1/sales/leads').query({ no_conversation_days: 10 }).set(as(kishan)).expect(400);
      await api().get('/api/v1/sales/leads').query({ limit: 101 }).set(as(kishan)).expect(400);
    });
  });
});
