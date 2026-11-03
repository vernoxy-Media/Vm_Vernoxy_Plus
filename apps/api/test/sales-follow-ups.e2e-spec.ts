import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import * as dotenv from 'dotenv';
import * as path from 'path';

// Only load .env.test when the runner has not already pointed us at a database.
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
}
process.env.CRON_SECRET = 'e2e-cron-secret-0123456789';

import { SalesModule } from '../src/modules/sales/sales.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { JwtAuthGuard } from '../src/modules/auth/public-api';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/core/filters/global-exception.filter';
import { createValidationException } from '../src/core/filters/validation-exception.factory';
import { assertTestEnvironment } from '../src/core/utils/env-guard';
import { HeaderAuthGuard, FakeEventsModule, FakeAuthModule } from './helpers/sales-e2e';
import { FollowUpJobs } from '../src/modules/sales/application/use-cases/follow-up-jobs.use-case';
import { istDayRange } from '../src/modules/sales/domain/services/lead-time.service';
import { ListLeadsUseCase, GetLeadBoardUseCase } from '../src/modules/sales/application/use-cases/list-leads.use-case';

describe('Sales - Follow-ups (e2e)', () => {
  jest.setTimeout(180000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  const phone = (n: number) => '9' + String(Date.now() + n).slice(-9);
  let kishan: number; // Sales
  let dhruv: number; // Sales
  let boss: number; // Admin
  let boss2: number; // second Admin
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());
  const MIN = 60 * 1000;
  const inMin = (m: number) => new Date(Date.now() + m * MIN);
  const iso = (d: Date) => d.toISOString();

  /** A company with a primary contact and an open lead owned by `owner`. */
  const newLead = async (name: string, owner = kishan, extra: Record<string, unknown> = {}) => {
    const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
    const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
    const co = await prisma.companies.create({ data: { name: `${name} ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id, ...extra } });
    const p = await prisma.persons.create({ data: { name: `${name} Contact`, mobile: phone(co.company_id) } });
    await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: p.person_id, is_primary: true } });
    const lead = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(owner)).send({ service_fit: ['Website Development'] }).expect(201);
    return { company: co, person: p, leadId: lead.body.lead_id as number };
  };

  const schedule = (leadId: number, who: number, at: Date, extra: Record<string, unknown> = {}) =>
    api().post(`/api/v1/sales/leads/${leadId}/follow-ups`).set(as(who)).send({ follow_up_on: iso(at), type: 'Call', purpose: 'Send quotation', ...extra });

  const leadRow = (id: number) => prisma.leads.findUniqueOrThrow({ where: { lead_id: id } });

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
    await ensure('service_fit', 'website_development', 'Website Development', 10);
    await ensure('service_fit', 'crm_erp', 'CRM / ERP Software', 20);
    await ensure('lost_reason', 'budget_too_low', 'Budget too low', 1);

    const salesDep = (await prisma.departments.findFirst({ where: { name: 'Sales' } })) ?? (await prisma.departments.create({ data: { name: 'Sales' } }));
    const adminRole = await prisma.roles.create({ data: { role_name: `AdminRole-${run}`, dep_id: salesDep.dep_id, is_admin: true } });
    const mk = (name: string, role: number | null) =>
      prisma.employees.create({ data: { name: `${name}-${run}`, email: `${name}-${run}@t.in`, mob: '9' + String(Math.random()).slice(2, 11), dep_id: salesDep.dep_id, role_id: role, joining_date: new Date() } as never });
    kishan = (await mk('kishan', null)).emp_id;
    dhruv = (await mk('dhruv', null)).emp_id;
    boss = (await mk('boss', adminRole.role_id)).emp_id;
    boss2 = (await mk('boss2', adminRole.role_id)).emp_id;
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------- schedule ----

  describe('Schedule', () => {
    it('plans a follow-up on a lead: Pending, defaults from the lead, on the Calendar of the Assigned to user', async () => {
      const t = await newLead('Sched');
      const at = inMin(26 * 60);
      const res = await schedule(t.leadId, kishan, at).expect(201);
      expect(res.body).toMatchObject({
        status: 'Pending', type: 'Call', purpose: 'Send quotation', rescheduled_count: 0,
        related_to: { kind: 'lead', lead_id: t.leadId },
        contact: { person_id: t.person.person_id }, assigned_to: { emp_id: kishan },
        actions: ['view', 'edit', 'complete', 'reschedule', 'cancel'],
      });
      expect(new Date(res.body.follow_up_on).getTime()).toBe(at.getTime());
      expect(res.body.company.name).toBe(`Sched ${run}`);

      const row = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: res.body.follow_up_id } });
      expect(row.calendar_event_id).not.toBeNull();
      const ev = await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: row.calendar_event_id! } });
      expect(ev).toMatchObject({ organizer_id: kishan, event_type: 'appointment', status: 'scheduled', deleted_at: null });
      expect(ev.start_time.getTime()).toBe(at.getTime());
      expect(ev.title).toBe(`Follow-up: Call - Sched ${run}`);
      expect((await leadRow(t.leadId)).next_follow_up_at?.getTime()).toBe(at.getTime());
      const history = await prisma.activity_logs.findMany({ where: { entity_type: 'LEAD', entity_id: t.leadId, event: 'FOLLOW_UP_SCHEDULED' } });
      expect(history).toHaveLength(1);
    });

    it('validates with the BFD messages and saves nothing', async () => {
      const t = await newLead('SchedBad');
      const empty = await api().post(`/api/v1/sales/leads/${t.leadId}/follow-ups`).set(as(kishan)).send({}).expect(400);
      expect(empty.body.errors[0]).toMatchObject({ field: 'follow_up_on', message: 'Please fill this field.' });
      const bad = await schedule(t.leadId, kishan, inMin(-3 * 24 * 60), { type: 'Smoke', assigned_to: 999999 }).expect(400);
      expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual(['assigned_to', 'follow_up_on', 'type']);
      const stranger = await prisma.persons.create({ data: { name: 'Nobody', mobile: phone(31) } });
      const wrongContact = await schedule(t.leadId, kishan, inMin(60), { contact_id: stranger.person_id }).expect(400);
      expect(wrongContact.body.errors[0].field).toBe('contact_id');
      expect(await prisma.crm_follow_ups.count({ where: { lead_id: t.leadId } })).toBe(0);
      await api().post('/api/v1/sales/follow-ups').set(as(kishan)).send({ follow_up_on: iso(inMin(60)), type: 'Call' }).expect(400); // neither lead nor company
      await schedule(99999999, kishan, inMin(60)).expect(404);
    });

    it('from the Follow-ups page: a company that is not yet a lead, or a company with an open lead (which then owns it)', async () => {
      const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
      const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
      const co = await prisma.companies.create({ data: { name: `Plain Co ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id } });
      const p = await prisma.persons.create({ data: { name: 'Anil', mobile: phone(41) } });
      await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: p.person_id, is_primary: true } });

      const plain = await api().post('/api/v1/sales/follow-ups').set(as(dhruv)).send({ company_id: co.company_id, follow_up_on: iso(inMin(120)), type: 'Meeting' }).expect(201);
      expect(plain.body).toMatchObject({ related_to: { kind: 'company', lead_id: null, company_id: co.company_id }, assigned_to: { emp_id: dhruv }, lead_status: null });
      expect(plain.body.actions).toEqual(['view', 'edit', 'complete', 'reschedule', 'cancel']);

      const lead = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['Website Development'] }).expect(201);
      const viaCompany = await api().post('/api/v1/sales/follow-ups').set(as(kishan)).send({ company_id: co.company_id, follow_up_on: iso(inMin(180)), type: 'Call' }).expect(201);
      expect(viaCompany.body.related_to).toMatchObject({ kind: 'lead', lead_id: lead.body.lead_id });
      await api().post('/api/v1/sales/follow-ups').set(as(dhruv)).send({ company_id: co.company_id, follow_up_on: iso(inMin(180)), type: 'Call' }).expect(403); // someone else's lead
    });

    it('closed leads take no new follow-ups; only the Lead By user or Admin plans on a lead; a colleague can be given the follow-up and is told', async () => {
      const t = await newLead('Rules');
      await schedule(t.leadId, dhruv, inMin(60)).expect(403);
      const gift = await schedule(t.leadId, kishan, inMin(120), { assigned_to: dhruv }).expect(201);
      expect(gift.body.assigned_to.emp_id).toBe(dhruv);
      const n = await prisma.notifications.findFirstOrThrow({ where: { recipient_id: dhruv, kind: 'follow_up_assigned', entity_id: gift.body.follow_up_id } });
      expect(n.body).toMatch(new RegExp(`^kishan-${run} gave you a follow-up: Rules ${run}, \\d+ \\w{3}, \\d\\d:\\d\\d, Call\\.$`));
      const ev = await prisma.calendar_events.findFirstOrThrow({ where: { event_id: (await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: gift.body.follow_up_id } })).calendar_event_id! } });
      expect(ev.organizer_id).toBe(dhruv); // on the Calendar of the Assigned to user

      await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'Budget too low' }).expect(200);
      const closed = await schedule(t.leadId, kishan, inMin(60)).expect(409);
      expect(closed.body.code).toBe('LEAD_CLOSED');
    });
  });

  // -------------------------------------------------------------------- list ----

  describe('Follow-ups page', () => {
    const ids: Record<string, number> = {};
    let owner: number;
    let other: number;
    const lead = {} as Record<string, { leadId: number; person: { person_id: number }; company: { company_id: number } }>;

    beforeAll(async () => {
      owner = (await prisma.employees.create({ data: { name: `owner-${run}`, email: `owner-${run}@t.in`, mob: phone(70), dep_id: (await prisma.departments.findFirstOrThrow({ where: { name: 'Sales' } })).dep_id, joining_date: new Date() } as never })).emp_id;
      other = (await prisma.employees.create({ data: { name: `other-${run}`, email: `other-${run}@t.in`, mob: phone(71), dep_id: (await prisma.departments.findFirstOrThrow({ where: { name: 'Sales' } })).dep_id, joining_date: new Date() } as never })).emp_id;
      lead.a = await newLead('ListA', owner, { city: 'Surat' });
      lead.b = await newLead('ListB', other, { city: 'Vapi' });
      const mk = async (key: string, l: typeof lead.a, over: Record<string, unknown>) => {
        const r = await prisma.crm_follow_ups.create({
          data: { company_id: l.company.company_id, lead_id: l.leadId, contact_id: l.person.person_id, contact_person_name: 'X', type: 'Call', assigned_to: owner, status: 'Pending', follow_up_on: inMin(60), ...over } as never,
        });
        ids[key] = r.follow_up_id;
      };
      const day = istDayRange(new Date());
      const laterToday = new Date(Math.min(Date.now() + 20 * MIN, day.to.getTime() - 60 * 1000));
      await mk('late', lead.a, { follow_up_on: inMin(-120), purpose: 'late one' }); // stored Pending, but 2 hours late
      await mk('stored-overdue', lead.a, { follow_up_on: inMin(-3 * 24 * 60), status: 'Overdue', purpose: 'old overdue' });
      await mk('today', lead.a, { follow_up_on: laterToday, type: 'Email', purpose: 'today later' });
      await mk('tomorrow', lead.a, { follow_up_on: new Date(day.to.getTime() + 3 * 3600 * 1000), purpose: 'tomorrow one' });
      await mk('next-week', lead.a, { follow_up_on: new Date(day.to.getTime() + 6 * 24 * 3600 * 1000), purpose: 'next week' });
      await mk('done', lead.a, { status: 'Completed', done_on: inMin(-30), outcome: 'Interested', follow_up_on: inMin(-60) });
      await mk('cancelled', lead.a, { status: 'Cancelled', reason: 'wrong number', follow_up_on: inMin(-90) });
      await mk('theirs', lead.b, { assigned_to: other, follow_up_on: inMin(-50), purpose: 'other persons' });
    });

    const tab = async (t: string, who: number, q: Record<string, unknown> = {}) => {
      const res = await api().get('/api/v1/sales/follow-ups').query({ tab: t, limit: 100, ...q }).set(as(who)).expect(200);
      return { body: res.body, ids: res.body.items.map((i: { follow_up_id: number }) => i.follow_up_id).filter((id: number) => Object.values(ids).includes(id)) as number[] };
    };

    it('Overdue is computed: 15 minutes after the due time, even before any job has run; oldest first', async () => {
      const o = await tab('overdue', owner);
      expect(o.ids).toEqual([ids['stored-overdue'], ids['late']]);
      const late = o.body.items.find((i: { follow_up_id: number }) => i.follow_up_id === ids['late']);
      expect(late.status).toBe('Overdue'); // stored as Pending
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: ids['late'] } })).status).toBe('Pending');
    });

    it('Today shows what is due today (late ones on top); Upcoming starts tomorrow; Completed and Cancelled are their own tabs', async () => {
      const day = istDayRange(new Date());
      const t = await tab('today', owner);
      expect(t.ids).not.toContain(ids['tomorrow']);
      if (Date.now() + 5 * MIN < day.to.getTime() - 60 * 1000) expect(t.ids).toEqual(expect.arrayContaining([ids['today']]));
      const todayLate = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: ids['late'] } });
      if (todayLate.follow_up_on >= day.from) expect(t.ids.indexOf(ids['late'])).toBeLessThan(t.ids.indexOf(ids['today']));

      const up = await tab('upcoming', owner);
      expect(up.ids).toEqual([ids['tomorrow'], ids['next-week']]);
      expect(up.body.items.every((i: { status: string }) => i.status === 'Pending')).toBe(true);
      expect((await tab('completed', owner)).ids).toEqual([ids['done']]);
      expect((await tab('cancelled', owner)).ids).toEqual([ids['cancelled']]);
      const done = (await tab('completed', owner)).body.items[0];
      expect(done).toMatchObject({ status: 'Completed', outcome: 'Interested', actions: ['view'] });
    });

    it('every tab carries the counts of all tabs', async () => {
      const r = await tab('upcoming', owner);
      const c = r.body.tab_counts;
      expect(c.upcoming).toBe(2);
      expect(c.overdue).toBe(2);
      expect(c.completed).toBe(1);
      expect(c.cancelled).toBe(1);
      expect(typeof c.today).toBe('number');
      expect(r.body.total).toBe(2);
    });

    it('a Sales user sees what is assigned to them or on their leads; the Admin sees all; "Assigned to" narrows', async () => {
      const mine = await tab('overdue', owner);
      expect(mine.ids).not.toContain(ids['theirs']);
      const theirs = await tab('overdue', other);
      expect(theirs.ids).toEqual([ids['theirs']]);
      // Lead By sees follow-ups on their lead even when assigned to someone else.
      await prisma.crm_follow_ups.update({ where: { follow_up_id: ids['theirs'] }, data: { assigned_to: owner } });
      expect((await tab('overdue', other)).ids).toEqual([ids['theirs']]);
      expect((await tab('overdue', owner, { assigned_to: 'me' })).ids).toContain(ids['theirs']);
      expect((await tab('overdue', other, { assigned_to: 'me' })).ids).toEqual([]);
      await prisma.crm_follow_ups.update({ where: { follow_up_id: ids['theirs'] }, data: { assigned_to: other } });

      const admin = await tab('overdue', boss, { assigned_to: 'all', q: run }); // q keeps the page to this run's data as the shared test database grows
      expect(admin.ids).toEqual(expect.arrayContaining([ids['late'], ids['stored-overdue'], ids['theirs']]));
      expect((await tab('overdue', boss, { assigned_to: String(other) })).ids).toEqual([ids['theirs']]);
    });

    it('filters by type, city, lead owner and search; search matches company, contact, purpose and IDs', async () => {
      expect((await tab('upcoming', owner, { type: 'Email' })).ids).toEqual([]);
      expect((await tab('today', owner, { type: 'email' })).ids).toEqual(expect.arrayContaining(Object.values([ids['today']]).filter(() => Date.now() < istDayRange(new Date()).to.getTime() - 5 * MIN)));
      expect((await tab('overdue', boss, { city: 'vapi', assigned_to: 'all', q: run })).ids).toEqual([ids['theirs']]);
      expect((await tab('overdue', boss, { lead_by: String(other), assigned_to: 'all', q: run })).ids).toEqual([ids['theirs']]);
      expect((await tab('overdue', owner, { q: 'old overdue' })).ids).toEqual([ids['stored-overdue']]);
      expect((await tab('overdue', owner, { q: `ListA ${run}` })).ids).toEqual([ids['stored-overdue'], ids['late']]);
      const code = (await prisma.leads.findUniqueOrThrow({ where: { lead_id: lead.a.leadId } })).lead_code!;
      expect((await tab('overdue', owner, { q: code })).ids).toEqual([ids['stored-overdue'], ids['late']]);
      expect((await tab('completed', owner, { date_from: iso(inMin(-24 * 60)), date_to: iso(inMin(24 * 60)) })).ids).toEqual([ids['done']]);
      expect((await tab('completed', owner, { date_from: iso(inMin(60)) })).ids).toEqual([]);
    });

    it('paginates and rejects bad parameters; the Lead Details tab lists open follow-ups first', async () => {
      const p = await api().get('/api/v1/sales/follow-ups').query({ tab: 'overdue', limit: 1, page: 2 }).set(as(owner)).expect(200);
      expect(p.body).toMatchObject({ page: 2, limit: 1, items: expect.any(Array) });
      await api().get('/api/v1/sales/follow-ups').query({ tab: 'later' }).set(as(owner)).expect(400);
      await api().get('/api/v1/sales/follow-ups').query({ assigned_to: 'everyone' }).set(as(owner)).expect(400);
      await api().get('/api/v1/sales/follow-ups').query({ limit: 101 }).set(as(owner)).expect(400);
      await api().get('/api/v1/sales/follow-ups').set(as(99999999)).expect(403);

      const tabRes = await api().get(`/api/v1/sales/leads/${lead.a.leadId}/follow-ups`).set(as(owner)).expect(200);
      const statuses = tabRes.body.map((f: { status: string }) => f.status);
      expect(statuses.slice(-2).sort()).toEqual(['Cancelled', 'Completed']);
      expect(statuses.slice(0, -2).every((s: string) => s === 'Pending' || s === 'Overdue')).toBe(true);
      const one = await api().get(`/api/v1/sales/follow-ups/${ids['late']}`).set(as(owner)).expect(200);
      expect(one.body.suggest_lost_on_outcomes).toEqual(['Not interested']);
      await api().get('/api/v1/sales/follow-ups/99999999').set(as(owner)).expect(404);
    });
  });

  // ------------------------------------------------------- edit / reschedule / cancel ----

  describe('Edit, Reschedule, Cancel', () => {
    it('edit: purpose, contact and Assigned to; reassigning moves the Calendar event and tells the new person; the date is not editable', async () => {
      const t = await newLead('Edit');
      const f = (await schedule(t.leadId, kishan, inMin(300)).expect(201)).body;
      const before = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } });
      const second = await api().post(`/api/v1/sales/companies/${t.company.company_id}/contacts`).set(as(kishan)).send({ name: 'Second', mobile: phone(81) }).expect(201);

      const res = await api().patch(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(kishan)).send({ purpose: 'Demo for IT head', contact_id: second.body.person_id, assigned_to: dhruv }).expect(200);
      expect(res.body).toMatchObject({ purpose: 'Demo for IT head', contact: { person_id: second.body.person_id }, assigned_to: { emp_id: dhruv } });
      const after = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } });
      expect(after.calendar_event_id).not.toBeNull();
      expect(after.calendar_event_id).not.toBe(before.calendar_event_id);
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: before.calendar_event_id! } })).deleted_at).not.toBeNull();
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: after.calendar_event_id! } })).organizer_id).toBe(dhruv);
      expect(await prisma.notifications.count({ where: { recipient_id: dhruv, kind: 'follow_up_assigned', entity_id: f.follow_up_id } })).toBe(1);

      await api().patch(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(kishan)).send({ follow_up_on: iso(inMin(10)) }).expect(400); // not a field here
      await api().patch(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(kishan)).send({ assigned_to: 999999 }).expect(400);
      const stranger = await prisma.persons.create({ data: { name: 'Nobody', mobile: phone(82) } });
      await api().patch(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(kishan)).send({ contact_id: stranger.person_id }).expect(400);
      const stranger2 = await api().patch(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(dhruv)).send({ purpose: 'by assignee' }).expect(200); // the assignee may edit
      expect(stranger2.body.purpose).toBe('by assignee');
      const hist = await prisma.activity_logs.findMany({ where: { entity_type: 'LEAD', entity_id: t.leadId, event: 'FOLLOW_UP_EDITED' } });
      expect(hist).toHaveLength(2);
    });

    it('only the assignee, the Lead By user or the Admin may act', async () => {
      const t = await newLead('Perm');
      const f = (await schedule(t.leadId, kishan, inMin(300)).expect(201)).body;
      for (const call of [
        () => api().patch(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(dhruv)).send({ purpose: 'x' }),
        () => api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/reschedule`).set(as(dhruv)).send({ follow_up_on: iso(inMin(400)), reason: 'x' }),
        () => api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/cancel`).set(as(dhruv)).send({ reason: 'x' }),
        () => api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/complete`).set(as(dhruv)).send({ outcome: 'Interested', what_happened: 'x', next_step: { action: 'none' } }),
      ]) {
        await call().expect(403);
      }
      const seen = await api().get(`/api/v1/sales/follow-ups/${f.follow_up_id}`).set(as(dhruv)).expect(200);
      expect(seen.body.actions).toEqual(['view']);
      await api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/cancel`).set(as(boss)).send({ reason: 'Admin cleanup' }).expect(200);
    });

    it('reschedule: needs a new date and a reason, keeps the old date in History, resets reminders, and flags the 3rd time to every Admin', async () => {
      const t = await newLead('Resched');
      const original = inMin(300);
      const f = (await schedule(t.leadId, kishan, original).expect(201)).body;
      const id = f.follow_up_id;
      const bad = await api().post(`/api/v1/sales/follow-ups/${id}/reschedule`).set(as(kishan)).send({}).expect(400);
      expect(bad.body.errors.map((e: { field: string }) => e.field)).toEqual(['follow_up_on', 'reason']);
      await api().post(`/api/v1/sales/follow-ups/${id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(inMin(-3 * 24 * 60)), reason: 'x' }).expect(400);

      await prisma.crm_follow_ups.update({ where: { follow_up_id: id }, data: { reminder_sent_at: new Date(), overdue_notified_at: new Date() } });
      const first = inMin(24 * 60);
      const r1 = await api().post(`/api/v1/sales/follow-ups/${id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(first), reason: 'Client travelling' }).expect(200);
      expect(r1.body).toMatchObject({ status: 'Pending', rescheduled_count: 1, reason: 'Client travelling' });
      const row = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: id } });
      expect(row).toMatchObject({ reminder_sent_at: null, overdue_notified_at: null });
      expect((await leadRow(t.leadId)).next_follow_up_at?.getTime()).toBe(first.getTime());
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: row.calendar_event_id! } })).start_time.getTime()).toBe(first.getTime());
      const log = await prisma.activity_logs.findFirstOrThrow({ where: { entity_type: 'LEAD', entity_id: t.leadId, event: 'FOLLOW_UP_RESCHEDULED' } });
      expect(log.details).toMatchObject({ from: iso(original), to: iso(first), reason: 'Client travelling', count: 1 });

      await api().post(`/api/v1/sales/follow-ups/${id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(inMin(30 * 60)), reason: 'Again' }).expect(200);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_rescheduled', entity_id: id } })).toBe(0); // only the 3rd time
      const r3 = await api().post(`/api/v1/sales/follow-ups/${id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(inMin(36 * 60)), reason: 'And again' }).expect(200);
      expect(r3.body.rescheduled_count).toBe(3);
      const flags = await prisma.notifications.findMany({ where: { kind: 'follow_up_rescheduled', entity_id: id } });
      expect(flags.map((n) => n.recipient_id)).toEqual(expect.arrayContaining([boss, boss2]));
      expect(flags[0].body).toBe(`The follow-up with Resched ${run} has been moved 3 times.`);
      await api().post(`/api/v1/sales/follow-ups/${id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(inMin(40 * 60)), reason: 'Fourth' }).expect(200);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_rescheduled', entity_id: id, recipient_id: boss } })).toBe(1); // flagged once
    });

    it('cancel: needs a reason, lands in the Cancelled tab, leaves the Calendar and no longer counts as next follow-up', async () => {
      const t = await newLead('Cancel');
      const f = (await schedule(t.leadId, kishan, inMin(300)).expect(201)).body;
      const eventId = (await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } })).calendar_event_id!;
      const none = await api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/cancel`).set(as(kishan)).send({}).expect(400);
      expect(none.body.errors[0]).toMatchObject({ field: 'reason', message: 'Please fill this field.' });
      const res = await api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/cancel`).set(as(kishan)).send({ reason: 'Wrong number' }).expect(200);
      expect(res.body).toMatchObject({ status: 'Cancelled', reason: 'Wrong number', actions: ['view'] });
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: eventId } })).deleted_at).not.toBeNull();
      expect((await leadRow(t.leadId)).next_follow_up_at).toBeNull();
      const again = await api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/cancel`).set(as(kishan)).send({ reason: 'twice' }).expect(409);
      expect(again.body.code).toBe('FOLLOW_UP_CLOSED');
      await api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(inMin(60)), reason: 'x' }).expect(409);
    });
  });

  // ------------------------------------------------------------------ complete ----

  describe('Complete', () => {
    const complete = (id: number, who: number, body: Record<string, unknown>) =>
      api().post(`/api/v1/sales/follow-ups/${id}/complete`).set(as(who)).send(body);

    it('records what happened as a conversation, marks it Completed, takes it off the Calendar, and the first conversation makes a New lead Contacted', async () => {
      const t = await newLead('Done');
      const f = (await schedule(t.leadId, kishan, inMin(30), { type: 'Meeting' }).expect(201)).body;
      const eventId = (await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } })).calendar_event_id!;
      expect((await leadRow(t.leadId)).lead_stage).toBe('New');

      const res = await complete(f.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'Quote sent for 15 users', next_step: { action: 'none' } }).expect(200);
      expect(res.body.follow_up).toMatchObject({ status: 'Completed', outcome: 'Interested', what_happened: 'Quote sent for 15 users', actions: ['view'] });
      expect(res.body.conversation.status_change).toEqual({ from: 'New', to: 'Contacted' });
      expect(res.body.next_step).toMatchObject({ action: 'none', follow_up: null, transition: null });

      const row = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } });
      expect(row.done_on).not.toBeNull();
      const conv = await prisma.crm_communications.findUniqueOrThrow({ where: { communication_id: row.completed_communication_id! } });
      expect(conv).toMatchObject({ lead_id: t.leadId, type: 'Meeting', outcome: 'Interested', what_discussed: 'Quote sent for 15 users', contact_id: t.person.person_id, created_by: kishan });
      expect(row.calendar_event_id).toBeNull();
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: eventId } })).deleted_at).not.toBeNull();
      const lead = await leadRow(t.leadId);
      expect(lead.lead_stage).toBe('Contacted');
      expect(lead.next_follow_up_at).toBeNull();
      expect((await prisma.activity_logs.count({ where: { entity_type: 'LEAD', entity_id: t.leadId, event: 'FOLLOW_UP_COMPLETED' } }))).toBe(1);
    });

    it('validates the popup (BFD messages) before touching anything', async () => {
      const t = await newLead('DoneBad');
      const f = (await schedule(t.leadId, kishan, inMin(30)).expect(201)).body;
      const empty = await complete(f.follow_up_id, kishan, {}).expect(400);
      expect(empty.body.errors.map((e: { field: string }) => e.field)).toEqual(['outcome', 'what_happened', 'next_step.action']);
      const future = await complete(f.follow_up_id, kishan, { done_on: iso(inMin(3 * 24 * 60)), outcome: 'Interested', what_happened: 'x', next_step: { action: 'none' } }).expect(400);
      expect(future.body.errors[0].field).toBe('done_on');
      const before = await complete(f.follow_up_id, kishan, { done_on: iso(inMin(-10 * 24 * 60)), outcome: 'Interested', what_happened: 'x', next_step: { action: 'none' } }).expect(400);
      expect(before.body.errors[0].field).toBe('done_on');
      const noNext = await complete(f.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'x', next_step: { action: 'schedule' } }).expect(400);
      expect(noNext.body.errors.map((e: { field: string }) => e.field)).toEqual(['next_step.follow_up_on']);
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } })).status).toBe('Pending');
      expect(await prisma.crm_communications.count({ where: { lead_id: t.leadId } })).toBe(0);
    });

    it('next step "Schedule next follow-up": the new one is Pending, on the Calendar, and the assignee is told', async () => {
      const t = await newLead('Chain');
      const f = (await schedule(t.leadId, kishan, inMin(30)).expect(201)).body;
      const at = inMin(5 * 24 * 60);
      const res = await complete(f.follow_up_id, kishan, {
        outcome: 'Needs more information', what_happened: 'Asked for references',
        next_step: { action: 'schedule', follow_up_on: iso(at), type: 'Email', assigned_to: dhruv, purpose: 'Send references' },
      }).expect(200);
      const next = res.body.next_step.follow_up;
      expect(next).toMatchObject({ status: 'Pending', type: 'Email', purpose: 'Send references', assigned_to: { emp_id: dhruv }, related_to: { lead_id: t.leadId } });
      expect(next.follow_up_id).not.toBe(f.follow_up_id);
      expect((await leadRow(t.leadId)).next_follow_up_at?.getTime()).toBe(at.getTime());
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: next.follow_up_id } })).calendar_event_id).not.toBeNull();
      expect(await prisma.notifications.count({ where: { recipient_id: dhruv, kind: 'follow_up_assigned', entity_id: next.follow_up_id } })).toBe(1);
    });

    it('next step "Qualify lead": runs the checklist; when it fails NOTHING is saved (all or nothing); when it passes the lead is Qualified', async () => {
      const t = await newLead('Qual');
      await prisma.leads.update({ where: { lead_id: t.leadId }, data: { lead_stage: 'Contacted' } });
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Requirement', note: 'CRM' }).expect(201);
      const f = (await schedule(t.leadId, kishan, inMin(30)).expect(201)).body;

      const fail = await complete(f.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'Great call', next_step: { action: 'qualify' } }).expect(422);
      expect(fail.body.code).toBe('QUALIFICATION_INCOMPLETE');
      // The conversation of this very follow-up is already counted (it is saved in the same transaction), so only the notes are missing.
      expect(fail.body.errors.map((e: { field: string }) => e.field).sort()).toEqual(['budget', 'readiness']);
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } })).status).toBe('Pending'); // still open
      expect(await prisma.crm_communications.count({ where: { lead_id: t.leadId } })).toBe(0); // no half-saved conversation

      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Budget', note: '3 lakh' }).expect(201);
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Readiness', note: 'April' }).expect(201);
      const ok = await complete(f.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'Great call', next_step: { action: 'qualify' } }).expect(200);
      expect(ok.body.next_step.transition).toEqual({ from: 'Contacted', to: 'Qualified' });
      expect((await leadRow(t.leadId)).lead_stage).toBe('Qualified');
    });

    it('next step "Put on hold": the check-back date becomes a follow-up; "Mark as lost": the other pending follow-ups are cancelled', async () => {
      const h = await newLead('HoldStep');
      await prisma.leads.update({ where: { lead_id: h.leadId }, data: { lead_stage: 'Contacted' } });
      const hf = (await schedule(h.leadId, kishan, inMin(30)).expect(201)).body;
      const noDate = await complete(hf.follow_up_id, kishan, { outcome: 'Call back later', what_happened: 'Busy', next_step: { action: 'hold' } }).expect(400);
      expect(noDate.body.errors[0].field).toBe('follow_up_on');
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: hf.follow_up_id } })).status).toBe('Pending');
      const held = await complete(hf.follow_up_id, kishan, { outcome: 'Call back later', what_happened: 'Busy', next_step: { action: 'hold', follow_up_on: iso(inMin(10 * 24 * 60)), reason: 'Budget freeze' } }).expect(200);
      expect(held.body.next_step.transition).toEqual({ from: 'Contacted', to: 'On Hold' });
      expect(await prisma.crm_follow_ups.count({ where: { lead_id: h.leadId, status: 'Pending' } })).toBe(1); // the check-back follow-up

      const l = await newLead('LostStep');
      const lf1 = (await schedule(l.leadId, kishan, inMin(30)).expect(201)).body;
      const lf2 = (await schedule(l.leadId, kishan, inMin(2 * 24 * 60)).expect(201)).body;
      const bad = await complete(lf1.follow_up_id, kishan, { outcome: 'Not interested', what_happened: 'No budget', next_step: { action: 'lost', lost_reason: 'Mood' } }).expect(400);
      expect(bad.body.errors[0].field).toBe('reason');
      const lost = await complete(lf1.follow_up_id, kishan, { outcome: 'Not interested', what_happened: 'No budget', next_step: { action: 'lost', lost_reason: 'Budget too low', note: 'Half the price' } }).expect(200);
      expect(lost.body.next_step.transition).toEqual({ from: 'Contacted', to: 'Lost' });
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: lf1.follow_up_id } })).status).toBe('Completed'); // not cancelled
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: lf2.follow_up_id } })).status).toBe('Cancelled');
    });

    it('a company-level follow-up has no lead steps; and a finished follow-up cannot be completed again', async () => {
      const t = await newLead('Closed');
      const f = (await schedule(t.leadId, kishan, inMin(30)).expect(201)).body;
      await complete(f.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'ok', next_step: { action: 'none' } }).expect(200);
      const again = await complete(f.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'ok', next_step: { action: 'none' } }).expect(409);
      expect(again.body.code).toBe('FOLLOW_UP_CLOSED');

      const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
      const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
      const co = await prisma.companies.create({ data: { name: `NoLead ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id } });
      const p = await prisma.persons.create({ data: { name: 'Ravi', mobile: phone(91) } });
      await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: p.person_id, is_primary: true } });
      const cf = (await api().post('/api/v1/sales/follow-ups').set(as(kishan)).send({ company_id: co.company_id, follow_up_on: iso(inMin(30)), type: 'Call' }).expect(201)).body;
      const lead = await complete(cf.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'ok', next_step: { action: 'qualify' } }).expect(400);
      expect(lead.body.errors[0].message).toMatch(/only available for a lead/);
      await complete(cf.follow_up_id, kishan, { outcome: 'Interested', what_happened: 'Met the owner', next_step: { action: 'none' } }).expect(200);
      const conv = await prisma.crm_communications.findFirstOrThrow({ where: { company_id: co.company_id } });
      expect(conv).toMatchObject({ lead_id: null, what_discussed: 'Met the owner' }); // belongs to the company
    });
  });

  // -------------------------------------------------------------------- jobs ----

  describe('Background jobs', () => {
    const callJob = (secret?: string) => {
      const r = api().post('/api/v1/sales/jobs/follow-ups');
      return secret === undefined ? r : r.set('Authorization', `Bearer ${secret}`);
    };

    it('the job endpoint needs the secret', async () => {
      await callJob().expect(403);
      await callJob('wrong-secret-0000000000000000').expect(403);
      const ok = await callJob(process.env.CRON_SECRET).expect(200);
      expect(ok.body).toMatchObject({ errors: [], overdue: expect.any(Number), reminders: expect.any(Number) });
      await api().get('/api/v1/sales/jobs/follow-ups').set('x-cron-secret', process.env.CRON_SECRET!).expect(200);
    });

    it('marks follow-ups Overdue 15 minutes after the due time and tells the user and every Admin, once', async () => {
      const t = await newLead('JobOverdue');
      const f = await prisma.crm_follow_ups.create({
        data: { company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Call', assigned_to: kishan, status: 'Pending', follow_up_on: inMin(-20) },
      });
      const young = await prisma.crm_follow_ups.create({
        data: { company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Call', assigned_to: kishan, status: 'Pending', follow_up_on: inMin(-10) },
      });
      await callJob(process.env.CRON_SECRET).expect(200);
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: f.follow_up_id } })).status).toBe('Overdue');
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: young.follow_up_id } })).status).toBe('Pending'); // only 10 minutes late
      const notes = await prisma.notifications.findMany({ where: { kind: 'follow_up_overdue', entity_id: f.follow_up_id } });
      const admins = (await prisma.employees.findMany({ where: { roles_employees_role_idToroles: { is_admin: true }, deleted_at: null, status: 'Active' }, select: { emp_id: true } })).map((e) => e.emp_id);
      expect(notes.map((n) => n.recipient_id).sort((a, b) => a - b)).toEqual([...new Set([kishan, ...admins])].sort((a, b) => a - b)); // the user and every Admin, each once
      expect(notes.map((n) => n.recipient_id)).toEqual(expect.arrayContaining([kishan, boss, boss2]));
      expect(notes[0].body).toMatch(new RegExp(`^Follow-up with JobOverdue ${run} is overdue since \\d+ \\w{3}, \\d\\d:\\d\\d\\.$`));
      await callJob(process.env.CRON_SECRET).expect(200);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_overdue', entity_id: f.follow_up_id } })).toBe(notes.length); // not repeated
    });

    it('sends the 1-hour reminder once, and again after a reschedule', async () => {
      const t = await newLead('JobRemind');
      const f = (await schedule(t.leadId, kishan, inMin(45)).expect(201)).body;
      const far = (await schedule(t.leadId, kishan, inMin(5 * 60)).expect(201)).body;
      await callJob(process.env.CRON_SECRET).expect(200);
      await callJob(process.env.CRON_SECRET).expect(200);
      const r = await prisma.notifications.findMany({ where: { kind: 'follow_up_reminder', entity_id: f.follow_up_id } });
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ recipient_id: kishan });
      expect(r[0].body).toBe(`Follow-up in 1 hour: Call JobRemind Contact, JobRemind ${run}.`);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_reminder', entity_id: far.follow_up_id } })).toBe(0); // more than an hour away

      await api().post(`/api/v1/sales/follow-ups/${f.follow_up_id}/reschedule`).set(as(kishan)).send({ follow_up_on: iso(inMin(50)), reason: 'moved' }).expect(200);
      await callJob(process.env.CRON_SECRET).expect(200);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_reminder', entity_id: f.follow_up_id } })).toBe(2);
    });

    it('two runs at the same moment never double-send', async () => {
      const t = await newLead('JobRace');
      const late = await prisma.crm_follow_ups.create({
        data: { company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Call', assigned_to: dhruv, status: 'Pending', follow_up_on: inMin(-30) },
      });
      const soon = (await schedule(t.leadId, kishan, inMin(40)).expect(201)).body;
      const jobs = app.get(FollowUpJobs);
      await Promise.all([jobs.run(), jobs.run(), jobs.run()]);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_overdue', entity_id: late.follow_up_id, recipient_id: dhruv } })).toBe(1);
      expect(await prisma.notifications.count({ where: { kind: 'follow_up_reminder', entity_id: soon.follow_up_id } })).toBe(1);
    });

    it('sends each sales user one daily summary from 9:30 IST: "You have 3 follow-ups today and 1 overdue."', async () => {
      const salesDep = await prisma.departments.findFirstOrThrow({ where: { name: 'Sales' } });
      const sum = await prisma.employees.create({ data: { name: `summary-${run}`, email: `summary-${run}@t.in`, mob: phone(95), dep_id: salesDep.dep_id, joining_date: new Date() } as never });
      const t = await newLead('JobSummary', sum.emp_id);
      const day = istDayRange(new Date());
      const at = (hoursIntoDay: number) => new Date(day.from.getTime() + hoursIntoDay * 3600 * 1000);
      for (const h of [14, 15, 16]) {
        await prisma.crm_follow_ups.create({ data: { company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Call', assigned_to: sum.emp_id, status: 'Pending', follow_up_on: at(h) } });
      }
      await prisma.crm_follow_ups.create({ data: { company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Call', assigned_to: sum.emp_id, status: 'Overdue', follow_up_on: new Date(day.from.getTime() - 2 * 24 * 3600 * 1000) } });

      const jobs = app.get(FollowUpJobs);
      // "Now" is 10:00 IST today: after 9:30, and before the three follow-ups are due.
      const tenAm = at(10);
      await jobs.run(new Date(day.from.getTime() + 3.5 * 3600 * 1000)); // 03:30 IST: too early, nothing is sent
      expect(await prisma.notifications.count({ where: { recipient_id: sum.emp_id, kind: 'follow_up_daily_summary' } })).toBe(0);
      const report = await jobs.run(tenAm);
      expect(report.daily_summaries).toBeGreaterThanOrEqual(1);
      const mine = await prisma.notifications.findMany({ where: { recipient_id: sum.emp_id, kind: 'follow_up_daily_summary' } });
      expect(mine).toHaveLength(1);
      expect(mine[0].body).toBe('You have 3 follow-ups today and 1 overdue.');
      await jobs.run(at(11));
      expect(await prisma.notifications.count({ where: { recipient_id: sum.emp_id, kind: 'follow_up_daily_summary' } })).toBe(1); // once a day
    });

    it('keeps the Calendar in step: creates missing events, removes the ones of finished follow-ups', async () => {
      const t = await newLead('JobCal');
      const missing = await prisma.crm_follow_ups.create({
        data: { company_id: t.company.company_id, lead_id: t.leadId, contact_id: t.person.person_id, type: 'Meeting', assigned_to: dhruv, status: 'Pending', follow_up_on: inMin(3 * 24 * 60), purpose: 'Plant visit' },
      });
      const finished = (await schedule(t.leadId, kishan, inMin(4 * 24 * 60)).expect(201)).body;
      const eventId = (await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: finished.follow_up_id } })).calendar_event_id!;
      await prisma.crm_follow_ups.update({ where: { follow_up_id: finished.follow_up_id }, data: { status: 'Completed', done_on: new Date() } }); // finished behind our back

      const report = await callJob(process.env.CRON_SECRET).expect(200);
      expect(report.body.calendar_created).toBeGreaterThanOrEqual(1);
      expect(report.body.calendar_removed).toBeGreaterThanOrEqual(1);
      const row = await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: missing.follow_up_id } });
      const ev = await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: row.calendar_event_id! } });
      expect(ev).toMatchObject({ organizer_id: dhruv, title: `Follow-up: Meeting - JobCal ${run}`, description: expect.stringContaining('Plant visit') });
      expect((await prisma.calendar_events.findUniqueOrThrow({ where: { event_id: eventId } })).deleted_at).not.toBeNull();
      expect((await prisma.crm_follow_ups.findUniqueOrThrow({ where: { follow_up_id: finished.follow_up_id } })).calendar_event_id).toBeNull();
    });
  });

  // ------------------------------------------------- Leads list: "No follow-up" tag ----

  describe('"No follow-up" tag', () => {
    it('an open lead with no pending follow-up for 7 days is tagged; planning one removes the tag', async () => {
      const t = await newLead('TagLead');
      const lists = app.get(ListLeadsUseCase);
      const boards = app.get(GetLeadBoardUseCase);
      const actor = { emp_id: kishan, is_admin: false, is_sales: true };
      const tagged = async (now: Date) => {
        const l = await lists.execute({ limit: 100 }, actor, now);
        const b = await boards.execute({}, actor, now);
        const card = b.columns.flatMap((c) => c.cards).find((c) => c.lead_id === t.leadId);
        return { list: l.items.find((i) => i.lead_id === t.leadId)!.no_follow_up, board: card!.no_follow_up };
      };

      expect(await tagged(new Date())).toEqual({ list: false, board: false }); // a new lead is not tagged yet
      expect(await tagged(inMin(6 * 24 * 60))).toEqual({ list: false, board: false }); // 6 days: not yet
      expect(await tagged(inMin(8 * 24 * 60))).toEqual({ list: true, board: true }); // 8 days with no follow-up

      await schedule(t.leadId, kishan, inMin(2 * 24 * 60)).expect(201);
      expect(await tagged(inMin(8 * 24 * 60))).toEqual({ list: false, board: false }); // a pending follow-up removes the tag

      // Once that follow-up is cancelled the 7 days count from then.
      const fu = await prisma.crm_follow_ups.findFirstOrThrow({ where: { lead_id: t.leadId, status: 'Pending' } });
      await api().post(`/api/v1/sales/follow-ups/${fu.follow_up_id}/cancel`).set(as(kishan)).send({ reason: 'not needed' }).expect(200);
      expect(await tagged(inMin(3 * 24 * 60))).toEqual({ list: false, board: false });
      expect(await tagged(inMin(8 * 24 * 60))).toEqual({ list: true, board: true });
    });
  });
});
