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
import { istDateString } from '../src/modules/sales/domain/services/client-conversion.service';

describe('Sales - Mark as Won and Convert to Client (e2e)', () => {
  jest.setTimeout(180000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  const phone = (n: number) => '9' + String(Date.now() + n).slice(-9);
  let kishan: number; // Sales
  let dhruv: number; // Sales
  let boss: number; // Admin
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());
  const MIN = 60 * 1000;
  const today = () => istDateString(new Date());

  /** A company with a primary contact and a lead owned by `owner`, moved to `stage`. */
  const newLead = async (name: string, owner = kishan, stage = 'Qualified', extra: Record<string, unknown> = {}) => {
    const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
    const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
    const co = await prisma.companies.create({ data: { name: `${name} ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id, city: 'Surat', ...extra } });
    const p = await prisma.persons.create({ data: { name: `${name} Contact`, mobile: phone(co.company_id), email: `${name.toLowerCase()}-${run}@x.in` } });
    await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: p.person_id, is_primary: true, designation: 'MD' } });
    const lead = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(owner)).send({ service_fit: ['CRM / ERP Software'] }).expect(201);
    if (stage !== 'New') await prisma.leads.update({ where: { lead_id: lead.body.lead_id }, data: { lead_stage: stage } });
    return { company: co, person: p, leadId: lead.body.lead_id as number, code: lead.body.lead_code as string };
  };

  const win = (leadId: number, who: number, body: Record<string, unknown> = { won_on: today(), win_note: 'PO received for CRM with Tally, 15 users.' }) =>
    api().post(`/api/v1/sales/leads/${leadId}/convert-to-client`).set(as(who)).send(body);

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
    await ensure('lead_source', 'existing_client', 'Existing Client', 80);
    await ensure('service_fit', 'crm_erp', 'CRM / ERP Software', 20);

    const salesDep = (await prisma.departments.findFirst({ where: { name: 'Sales' } })) ?? (await prisma.departments.create({ data: { name: 'Sales' } }));
    const adminRole = await prisma.roles.create({ data: { role_name: `AdminRole-${run}`, dep_id: salesDep.dep_id, is_admin: true } });
    const mk = (name: string, role: number | null) =>
      prisma.employees.create({ data: { name: `${name}-${run}`, email: `${name}-${run}@t.in`, mob: '9' + String(Math.random()).slice(2, 11), dep_id: salesDep.dep_id, role_id: role, joining_date: new Date() } as never });
    kishan = (await mk('kishan', null)).emp_id;
    dhruv = (await mk('dhruv', null)).emp_id;
    boss = (await mk('boss', adminRole.role_id)).emp_id;
  });

  afterAll(async () => {
    await app?.close();
  });

  // ------------------------------------------------------------------ the pop-up ----

  describe('The pop-up', () => {
    it('shows the Client ID preview, the Won on range and what is carried forward', async () => {
      const t = await newLead('Popup');
      await prisma.crm_communications.createMany({ data: [1, 2, 3].map((n) => ({ company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Call', what_discussed: `call ${n}`, created_by: kishan })) });
      await prisma.crm_lead_notes.createMany({ data: [{ note_type: 'Requirement' }, { note_type: 'Budget' }].map((n) => ({ lead_id: t.leadId, company_id: t.company.company_id, note: 'x', ...n, created_by: kishan })) });

      const res = await api().get(`/api/v1/sales/leads/${t.leadId}/client-form`).set(as(kishan)).expect(200);
      expect(res.body.client_id_preview).toMatch(/^CLI-\d{4}$/);
      expect(res.body).toMatchObject({ client_exists: false, can_convert: true, blocked_reason: null, lead: { lead_id: t.leadId, status: 'Qualified', service_fit: ['CRM / ERP Software'] } });
      expect(res.body.won_on).toEqual({ default: today(), min: today(), max: today() });
      const cf = Object.fromEntries(res.body.carried_forward.map((c: { key: string; summary: string }) => [c.key, c.summary]));
      expect(cf.company).toBe('All 31 company fields, including address, GIDC and brochure');
      expect(cf.contacts).toBe(`1 contact - ${t.person.name} is the primary contact`);
      expect(cf.communication).toBe('3 conversations, with dates and outcomes');
      expect(cf.notes).toBe('2 notes, including Requirement and Budget');
      expect(res.body.result_note).toMatch(/Converted and is locked/);
    });

    it('is switched off for a lead that is not Qualified and for someone who does not own it', async () => {
      const fresh = await newLead('NotReady', kishan, 'Contacted');
      const a = await api().get(`/api/v1/sales/leads/${fresh.leadId}/client-form`).set(as(kishan)).expect(200);
      expect(a.body).toMatchObject({ can_convert: false });
      expect(a.body.blocked_reason).toMatch(/Only a Qualified lead/);

      const q = await newLead('NotMine');
      const b = await api().get(`/api/v1/sales/leads/${q.leadId}/client-form`).set(as(dhruv)).expect(200);
      expect(b.body).toMatchObject({ can_convert: false, blocked_reason: 'Only the Lead By user or the Admin can mark this lead as won.' });
      const c = await api().get(`/api/v1/sales/leads/${q.leadId}/client-form`).set(as(boss)).expect(200);
      expect(c.body.can_convert).toBe(true);
      await api().get('/api/v1/sales/leads/99999999/client-form').set(as(kishan)).expect(404);
    });
  });

  // --------------------------------------------------------------------- convert ----

  describe('Convert to Client', () => {
    it('refuses a lead that is not Qualified, a stranger, and a form with problems - saving nothing', async () => {
      const contacted = await newLead('NeedQualify', kishan, 'Contacted');
      const notQ = await win(contacted.leadId, kishan).expect(409);
      expect(notQ.body.code).toBe('INVALID_TRANSITION');
      expect(notQ.body.detail).toMatch(/Only a Qualified lead can be marked as Won \(this lead is Contacted\)\. Qualify it first\./);

      const t = await newLead('Invalid');
      await win(t.leadId, dhruv).expect(403);
      const empty = await win(t.leadId, kishan, {}).expect(400);
      expect(empty.body.errors).toEqual([
        expect.objectContaining({ field: 'won_on', message: 'Please fill this field.' }),
        expect.objectContaining({ field: 'win_note', message: 'Please fill this field.' }),
      ]);
      const future = await win(t.leadId, kishan, { won_on: istDateString(new Date(Date.now() + 3 * 24 * 60 * MIN)), win_note: 'x' }).expect(400);
      expect(future.body.errors[0]).toMatchObject({ field: 'won_on', message: 'Won on must be today or a past date.' });
      const early = await win(t.leadId, kishan, { won_on: '2020-01-01', win_note: 'x' }).expect(400);
      expect(early.body.errors[0]).toMatchObject({ field: 'won_on', message: 'Won on cannot be before the lead was added.' });
      await win(t.leadId, kishan, { won_on: 'last week', win_note: 'x' }).expect(400);
      await api().post(`/api/v1/sales/leads/${t.leadId}/convert-to-client`).set(as(kishan)).send({ won_on: today(), win_note: 'x', hacker: 1 }).expect(400);

      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).lead_stage).toBe('Qualified');
      expect(await prisma.clients.count({ where: { company_id: t.company.company_id } })).toBe(0);
    });

    it('creates the client: Converted and locked, Client ID given, company marked, Win note saved, follow-ups cancelled, everyone told', async () => {
      const t = await newLead('Winner');
      const fu = (await api().post(`/api/v1/sales/leads/${t.leadId}/follow-ups`).set(as(kishan)).send({ follow_up_on: new Date(Date.now() + 2 * 24 * 60 * MIN).toISOString(), type: 'Call' }).expect(201)).body;
      const eventId = (await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: fu.follow_up_id } })).calendar_event_id!;
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).next_follow_up_at).not.toBeNull();

      const wonOn = today();
      const res = await win(t.leadId, kishan, { won_on: wonOn, win_note: '  PO received for CRM with Tally, 15 users.  ' }).expect(201);
      const { client, lead } = res.body;
      expect(client.client_code).toMatch(/^CLI-\d{4}$/);
      expect(res.body.reused_existing_client).toBe(false);
      expect(client).toMatchObject({
        win_note: 'PO received for CRM with Tally, 15 users.',
        owner: { emp_id: kishan },
        converted_from_lead: { lead_id: t.leadId, lead_code: t.code },
        company: { company_id: t.company.company_id, name: `Winner ${run}`, city: 'Surat' },
        carried_forward: { contacts: 1 },
      });
      expect(client.won_on.slice(0, 10)).toBe(wonOn);
      expect(client.contacts[0]).toMatchObject({ name: 'Winner Contact', is_primary: true });
      expect(lead).toMatchObject({ status: 'Converted', client_id: client.client_id, client_code: client.client_code, next_follow_up: null });

      const row = await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } });
      expect(row).toMatchObject({ lead_stage: 'Converted', status: 'won', converted_client_id: client.client_id, win_note: 'PO received for CRM with Tally, 15 users.' });
      expect(row.won_on!.toISOString().slice(0, 10)).toBe(wonOn);
      expect(await prisma.companies.findUniqueOrThrow({ where: { company_id: t.company.company_id } })).toMatchObject({ is_client: true, client_code: client.client_code });
      expect(await prisma.crm_lead_notes.findFirstOrThrow({ where: { lead_id: t.leadId, note_type: 'Win' } })).toMatchObject({ note: 'PO received for CRM with Tally, 15 users.', created_by: kishan });

      const cancelled = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: fu.follow_up_id } });
      expect(cancelled).toMatchObject({ status: 'Cancelled', reason: 'Lead converted to client', calendar_event_id: null });
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: eventId } })).deleted_at).not.toBeNull();

      const events = (await prisma.activity_logs.findMany({ where: { entity_type: 'LEAD', entity_id: t.leadId } })).map((e) => e.event);
      expect(events).toEqual(expect.arrayContaining(['STATUS_CHANGED', 'CONVERTED_TO_CLIENT']));
      expect(await prisma.activity_logs.count({ where: { entity_type: 'COMPANY', entity_id: t.company.company_id, event: 'CLIENT_CREATED' } })).toBe(1);
      expect(await prisma.activity_logs.count({ where: { entity_type: 'CLIENT', entity_id: client.client_id, event: 'CREATED' } })).toBe(1);

      // "Admin and Lead By user are told": the Admin is told; the Lead By user did it himself.
      const told = await prisma.notifications.findMany({ where: { kind: 'client_converted', entity_type: 'LEAD', entity_id: t.leadId } });
      expect(told.map((n) => n.recipient_id)).toContain(boss);
      expect(told.map((n) => n.recipient_id)).not.toContain(kishan);
      expect(told[0].body).toBe(`${t.code} was won and converted to client ${client.client_code}.`);
    });

    it('when the Admin converts someone else\'s lead, its Lead By user is told too', async () => {
      const t = await newLead('AdminWins');
      await win(t.leadId, boss).expect(201);
      expect(await prisma.notifications.count({ where: { kind: 'client_converted', entity_id: t.leadId, recipient_id: kishan } })).toBe(1);
    });

    it('a converted lead is locked and can be converted only once', async () => {
      const t = await newLead('Locked');
      const first = await win(t.leadId, kishan).expect(201);
      const again = await win(t.leadId, kishan).expect(409);
      expect(again.body.code).toBe('ALREADY_CONVERTED');
      expect(again.body.detail).toBe(`This lead was already converted to ${first.body.client.client_code}.`);
      const note = await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'General', note: 'x' }).expect(409);
      expect(note.body.code).toBe('LEAD_LOCKED');
      await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'Budget too low' }).expect(409);
      await api().post(`/api/v1/sales/leads/${t.leadId}/follow-ups`).set(as(kishan)).send({ follow_up_on: new Date(Date.now() + 60 * MIN).toISOString(), type: 'Call' }).expect(409);
      const form = await api().get(`/api/v1/sales/leads/${t.leadId}/client-form`).set(as(kishan)).expect(200);
      expect(form.body).toMatchObject({ can_convert: false, blocked_reason: `This lead was already converted to ${first.body.client.client_code}.` });
    });

    it('two simultaneous clicks make exactly one client', async () => {
      const t = await newLead('Race');
      const results = await Promise.all([win(t.leadId, kishan), win(t.leadId, boss), win(t.leadId, kishan)]);
      const statuses = results.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(2);
      expect(await prisma.clients.count({ where: { company_id: t.company.company_id, deleted_at: null } })).toBe(1);
    });

    it('Client IDs run on and are never given twice', async () => {
      const a = await win((await newLead('SeqA')).leadId, kishan).expect(201);
      const b = await win((await newLead('SeqB')).leadId, kishan).expect(201);
      const n = (code: string) => Number(code.slice(4));
      expect(n(b.body.client.client_code)).toBeGreaterThan(n(a.body.client.client_code));
      const all = await prisma.clients.findMany({ select: { client_code: true } });
      expect(new Set(all.map((c) => c.client_code)).size).toBe(all.length);
    });
  });

  // ------------------------------------------------------------- after the conversion ----

  describe('After the conversion', () => {
    it('the Company Database shows the Client tag and an "Open client" link; Client Details opens', async () => {
      const t = await newLead('Visible');
      const res = await win(t.leadId, kishan).expect(201);
      const list = await api().get('/api/v1/sales/companies').query({ q: t.company.company_code! }).set(as(dhruv)).expect(200);
      expect(list.body.items[0]).toMatchObject({
        lead: { kind: 'client', client_code: res.body.client.client_code, client_id: res.body.client.client_id },
        can_convert_to_lead: true, // a client can get a new lead for more work
      });
      expect(list.body.counters.converted_to_client).toBe(1);
      const clients = await api().get('/api/v1/sales/companies').query({ lead: 'client', limit: 100 }).set(as(dhruv)).expect(200);
      expect(clients.body.items.map((c: { company_id: number }) => c.company_id)).toContain(t.company.company_id);

      const detail = await api().get(`/api/v1/sales/clients/${res.body.client.client_id}`).set(as(dhruv)).expect(200);
      expect(detail.body).toMatchObject({ client_code: res.body.client.client_code, converted_from_lead: { lead_id: t.leadId } });
      await api().get('/api/v1/sales/clients/99999999').set(as(dhruv)).expect(404);
      const company = await api().get(`/api/v1/sales/companies/${t.company.company_id}`).set(as(dhruv)).expect(200);
      expect(company.body.lead).toMatchObject({ kind: 'client', client_id: res.body.client.client_id });
    });

    it('a client that wins more work keeps its Client ID (one client per company)', async () => {
      const first = await newLead('Repeat');
      const c1 = (await win(first.leadId, kishan).expect(201)).body;

      const more = await api().post(`/api/v1/sales/companies/${first.company.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['CRM / ERP Software'] }).expect(201);
      expect(more.body.lead_source).toBe('Existing Client');
      await prisma.leads.update({ where: { lead_id: more.body.lead_id }, data: { lead_stage: 'Qualified' } });

      const form = await api().get(`/api/v1/sales/leads/${more.body.lead_id}/client-form`).set(as(kishan)).expect(200);
      expect(form.body).toMatchObject({ client_exists: true, client_id_preview: c1.client.client_code });
      const c2 = (await win(more.body.lead_id, kishan, { won_on: today(), win_note: 'Second phase: mobile app' }).expect(201)).body;
      expect(c2.reused_existing_client).toBe(true);
      expect(c2.client.client_id).toBe(c1.client.client_id);
      expect(c2.client.client_code).toBe(c1.client.client_code);
      expect(c2.client.leads.map((l: { lead_id: number }) => l.lead_id)).toEqual([first.leadId, more.body.lead_id]);
      expect(await prisma.clients.count({ where: { company_id: first.company.company_id } })).toBe(1);
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: more.body.lead_id } })).converted_client_id).toBe(c1.client.client_id);
    });
  });

  // -------------------------------------------------------------------- reversal ----

  describe('Reversing a conversion (Admin only)', () => {
    const reverse = (leadId: number, who: number, body: Record<string, unknown> = { reason: 'Won by mistake' }) =>
      api().post(`/api/v1/sales/leads/${leadId}/reverse-conversion`).set(as(who)).send(body);

    it('is for the Admin, needs a reason and a Converted lead', async () => {
      const t = await newLead('RevRules');
      await reverse(t.leadId, boss).expect(409); // not Converted yet
      await win(t.leadId, kishan).expect(201);
      await reverse(t.leadId, kishan).expect(403);
      const none = await reverse(t.leadId, boss, {}).expect(400);
      expect(none.body.errors[0]).toMatchObject({ field: 'reason', message: 'Please fill this field.' });
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).lead_stage).toBe('Converted');
    });

    it('puts the lead back to Qualified, removes the client and the Client tag, and never reuses the Client ID', async () => {
      const t = await newLead('Undo');
      const c = (await win(t.leadId, kishan).expect(201)).body.client;
      const res = await reverse(t.leadId, boss, { reason: 'Client withdrew the PO' }).expect(200);
      expect(res.body).toMatchObject({ client_code: c.client_code, client_removed: true, lead: { status: 'Qualified', client_id: null, client_code: null } });

      const lead = await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } });
      expect(lead).toMatchObject({ lead_stage: 'Qualified', converted_client_id: null, won_on: null, win_note: null, closed_at: null });
      expect(await prisma.companies.findUniqueOrThrow({ where: { company_id: t.company.company_id } })).toMatchObject({ is_client: false, client_code: null });
      const client = await prisma.clients.findUniqueOrThrow({ where: { client_id: c.client_id } });
      expect(client).toMatchObject({ deleted_by: boss, reversed_reason: 'Client withdrew the PO' });
      expect(client.deleted_at).not.toBeNull();
      await api().get(`/api/v1/sales/clients/${c.client_id}`).set(as(boss)).expect(404);
      const log = await prisma.activity_logs.findFirstOrThrow({ where: { entity_type: 'LEAD', entity_id: t.leadId, event: 'CONVERSION_REVERSED' } });
      expect(log.details).toMatchObject({ reason: 'Client withdrew the PO', client_code: c.client_code, client_removed: true });

      // The lead is a normal Qualified lead again and can be won again; the new client gets a new number.
      const again = await win(t.leadId, kishan).expect(201);
      expect(again.body.client.client_code).not.toBe(c.client_code);
      expect(Number(again.body.client.client_code.slice(4))).toBeGreaterThan(Number(c.client_code.slice(4)));
    });

    it('is refused while the client has a project', async () => {
      const t = await newLead('HasProject');
      const c = (await win(t.leadId, kishan).expect(201)).body.client;
      const project = await prisma.projects.create({
        data: {
          project_no: `T-${run}-${t.leadId}`, project_name: 'Website', project_type: 'client', category: 'crm',
          start_date: new Date(), deadline: new Date(Date.now() + 30 * 24 * 60 * MIN), project_manager_id: boss, client_name: `HasProject ${run}`,
        },
      });
      const res = await reverse(t.leadId, boss).expect(409);
      expect(res.body.code).toBe('CLIENT_HAS_PROJECT');
      expect(res.body.detail).toBe(`${c.client_code} already has a project, so the conversion cannot be reversed.`);
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).lead_stage).toBe('Converted');
      await prisma.projects.update({ where: { project_id: project.project_id }, data: { deleted_at: new Date(), deleted_by: boss } });
      await reverse(t.leadId, boss).expect(200); // once the project is gone it can be reversed
    });

    it('keeps the client when it has other converted leads, and refuses while the company has a newer open lead', async () => {
      const first = await newLead('TwoLeads');
      const c = (await win(first.leadId, kishan).expect(201)).body.client;
      const more = await api().post(`/api/v1/sales/companies/${first.company.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['CRM / ERP Software'] }).expect(201);
      await prisma.leads.update({ where: { lead_id: more.body.lead_id }, data: { lead_stage: 'Qualified' } });

      // First lead cannot go back to Qualified: the company already has another open lead.
      const blocked = await reverse(first.leadId, boss).expect(409);
      expect(blocked.body.code).toBe('OPEN_LEAD_EXISTS');
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: first.leadId } })).lead_stage).toBe('Converted');

      await win(more.body.lead_id, kishan, { won_on: today(), win_note: 'Phase 2' }).expect(201);
      const res = await reverse(more.body.lead_id, boss).expect(200);
      expect(res.body.client_removed).toBe(false); // the first lead still belongs to this client
      expect(await prisma.clients.findUniqueOrThrow({ where: { client_id: c.client_id } })).toMatchObject({ deleted_at: null });
      expect(await prisma.companies.findUniqueOrThrow({ where: { company_id: first.company.company_id } })).toMatchObject({ is_client: true, client_code: c.client_code });
    });
  });
});
