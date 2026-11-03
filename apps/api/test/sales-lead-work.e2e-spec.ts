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

describe('Sales - contacts, conversations, notes and lead status actions (e2e)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  const phone = (n: number) => '9' + String(Date.now() + n).slice(-9);
  let kishan: number;
  let dhruv: number;
  let boss: number;
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600 * 1000).toISOString();

  /** A company with a primary contact and an open lead owned by `owner`. */
  const newLead = async (name: string, owner = kishan) => {
    const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
    const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
    const co = await prisma.companies.create({ data: { name: `${name} ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id } });
    const p = await prisma.persons.create({ data: { name: `${name} Contact`, mobile: phone(co.company_id) } });
    await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: p.person_id, is_primary: true, designation: 'Director' } });
    const lead = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(owner)).send({ service_fit: ['Website Development'] }).expect(201);
    return { company: co, person: p, leadId: lead.body.lead_id as number, code: lead.body.lead_code as string };
  };

  const logConv = (leadId: number, who: number, extra: Record<string, unknown> = {}, contact?: number) =>
    api().post(`/api/v1/sales/leads/${leadId}/conversations`).set(as(who)).send({ type: 'Call', what_discussed: 'Intro', outcome: 'Interested', contact_id: contact, ...extra });

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
    await ensure('lost_reason', 'other', 'Other', 9);

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

  // ------------------------------------------------------------------ contacts ----

  describe('Contacts', () => {
    it('adds contacts (the first becomes primary), validates, and keeps the company row in step with the primary', async () => {
      const co = await prisma.companies.create({ data: { name: `Contacts Co ${run}`, customer_type_id: (await prisma.customer_types.findFirstOrThrow()).customer_type_id, industry_id: (await prisma.industries.findFirstOrThrow()).industry_id } });
      const bad = await api().post(`/api/v1/sales/companies/${co.company_id}/contacts`).set(as(kishan)).send({ designation: 'MD' }).expect(400);
      expect(bad.body.errors.map((e: { field: string }) => e.field)).toEqual(['name', 'mobile']);
      await api().post(`/api/v1/sales/companies/${co.company_id}/contacts`).set(as(kishan)).send({ name: 'X', mobile: '12', email: 'nope' }).expect(400);

      const m1 = phone(1);
      const first = await api().post(`/api/v1/sales/companies/${co.company_id}/contacts`).set(as(kishan)).send({ name: 'Rakesh', designation: 'MD', mobile: `+91 ${m1}` }).expect(201);
      expect(first.body).toMatchObject({ name: 'Rakesh', mobile: m1, is_primary: true, is_active: true });
      const second = await api().post(`/api/v1/sales/companies/${co.company_id}/contacts`).set(as(kishan)).send({ name: 'Pooja', email: `Pooja-${run}@Acme.in` }).expect(201);
      expect(second.body).toMatchObject({ is_primary: false, email: `pooja-${run}@acme.in` });
      expect((await prisma.companies.findUniqueOrThrow({ where: { company_id: co.company_id } })).contact_person).toBe('Rakesh');

      const made = await api().post(`/api/v1/sales/contacts/${second.body.company_person_id}/make-primary`).set(as(dhruv)).expect(200);
      expect(made.body.is_primary).toBe(true);
      const list = await api().get(`/api/v1/sales/companies/${co.company_id}/contacts`).set(as(kishan)).expect(200);
      expect(list.body.filter((c: { is_primary: boolean }) => c.is_primary)).toHaveLength(1);
      expect((await prisma.companies.findUniqueOrThrow({ where: { company_id: co.company_id } })).contact_person).toBe('Pooja');

      const edited = await api().patch(`/api/v1/sales/contacts/${first.body.company_person_id}`).set(as(kishan)).send({ designation: 'Owner' }).expect(200);
      expect(edited.body).toMatchObject({ name: 'Rakesh', designation: 'Owner' });
      await api().get('/api/v1/sales/companies/99999999/contacts').set(as(kishan)).expect(404);
    });

    it('warns when the same person is already a contact of another company, and lets the user confirm', async () => {
      const a = await newLead('SamePerson A');
      const b = await prisma.companies.create({ data: { name: `SamePerson B ${run}`, customer_type_id: a.company.customer_type_id, industry_id: a.company.industry_id } });
      const dup = await api().post(`/api/v1/sales/companies/${b.company_id}/contacts`).set(as(kishan)).send({ name: 'Same Guy', mobile: a.person.mobile }).expect(409);
      expect(dup.body.code).toBe('DUPLICATE_CONTACT');
      expect(dup.body.errors[0].matches[0]).toMatchObject({ company_id: a.company.company_id, reason: 'SAME_MOBILE' });
      await api().post(`/api/v1/sales/companies/${b.company_id}/contacts`).set(as(kishan)).send({ name: 'Same Guy', mobile: a.person.mobile, confirm_duplicate: true }).expect(201);
    });

    it('"Left the company": promotes the next contact, hides them from new conversations, and keeps leads saveable', async () => {
      const t = await newLead('Leaver');
      const second = await api().post(`/api/v1/sales/companies/${t.company.company_id}/contacts`).set(as(kishan)).send({ name: 'Successor', mobile: phone(7) }).expect(201);
      const primaryCp = await prisma.company_persons.findFirstOrThrow({ where: { company_id: t.company.company_id, person_id: t.person.person_id } });

      const left = await api().post(`/api/v1/sales/contacts/${primaryCp.company_person_id}/left-company`).set(as(kishan)).expect(200);
      expect(left.body).toMatchObject({ is_active: false, is_primary: false });
      const list = await api().get(`/api/v1/sales/companies/${t.company.company_id}/contacts`).set(as(kishan)).expect(200);
      expect(list.body.find((c: { company_person_id: number }) => c.company_person_id === second.body.company_person_id).is_primary).toBe(true);
      // The lead pointed at the person who left: it now points at the successor, so it can still be edited.
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).person_id).toBe(second.body.person_id);

      const refused = await logConv(t.leadId, kishan, {}, t.person.person_id).expect(400);
      expect(refused.body.errors[0]).toMatchObject({ field: 'contact_id', message: 'Choose a contact who works at this company.' });
      await logConv(t.leadId, kishan, {}, second.body.person_id).expect(201);
      await api().post(`/api/v1/sales/contacts/${primaryCp.company_person_id}/make-primary`).set(as(kishan)).expect(409);
    });

    it('deletes only a contact that is not used', async () => {
      const t = await newLead('Deleter');
      const spare = await api().post(`/api/v1/sales/companies/${t.company.company_id}/contacts`).set(as(kishan)).send({ name: 'Spare', mobile: phone(9) }).expect(201);
      await api().delete(`/api/v1/sales/contacts/${spare.body.company_person_id}`).set(as(kishan)).expect(204);
      const used = await prisma.company_persons.findFirstOrThrow({ where: { company_id: t.company.company_id, person_id: t.person.person_id } });
      const blocked = await api().delete(`/api/v1/sales/contacts/${used.company_person_id}`).set(as(kishan)).expect(409);
      expect(blocked.body.code).toBe('CONTACT_IN_USE');
    });
  });

  // ------------------------------------------------------------- conversations ----

  describe('Conversations', () => {
    it('logs a conversation: validated, First conversation moves New -> Contacted, optional follow-up saved with it', async () => {
      const t = await newLead('Convo');
      const empty = await api().post(`/api/v1/sales/leads/${t.leadId}/conversations`).set(as(kishan)).send({}).expect(400);
      expect(empty.body.errors.map((e: { field: string }) => e.field)).toEqual(['type', 'contact_id', 'what_discussed', 'outcome']);
      const future = await logConv(t.leadId, kishan, { communication_date: hoursFromNow(48) }, t.person.person_id).expect(400);
      expect(future.body.errors[0]).toMatchObject({ field: 'communication_date' });
      const stranger = await prisma.persons.create({ data: { name: 'Not here', mobile: phone(11) } });
      await logConv(t.leadId, kishan, {}, stranger.person_id).expect(400);
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).lead_stage).toBe('New');

      const res = await logConv(t.leadId, kishan, { next_follow_up: { follow_up_on: hoursFromNow(26), type: 'Meeting', purpose: 'Send quotation' } }, t.person.person_id).expect(201);
      expect(res.body.status_change).toEqual({ from: 'New', to: 'Contacted' });
      expect(res.body.conversation).toMatchObject({ type: 'Call', outcome: 'Interested', editable: true, contact: { name: 'Convo Contact' }, logged_by: { emp_id: kishan } });
      expect(res.body.follow_up_id).toEqual(expect.any(Number));
      const lead = await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } });
      expect(lead.lead_stage).toBe('Contacted');
      expect(lead.next_follow_up_at).not.toBeNull(); // kept by the database from the follow-up
      const second = await logConv(t.leadId, kishan, {}, t.person.person_id).expect(201);
      expect(second.body.status_change).toBeNull();

      const list = await api().get(`/api/v1/sales/leads/${t.leadId}/conversations`).set(as(boss)).expect(200);
      expect(list.body.total).toBe(2);
      const detail = await api().get(`/api/v1/sales/leads/${t.leadId}`).set(as(kishan)).expect(200);
      expect(detail.body.counts).toMatchObject({ conversations: 2, open_follow_ups: 1 });
    });

    it('rejects a bad next follow-up with its own field errors and saves nothing', async () => {
      const t = await newLead('BadFollowUp');
      const res = await logConv(t.leadId, kishan, { next_follow_up: { follow_up_on: hoursFromNow(-48), type: 'Smoke', assigned_to: 999999 } }, t.person.person_id).expect(400);
      expect(res.body.errors.map((e: { field: string }) => e.field).sort()).toEqual(['next_follow_up.assigned_to', 'next_follow_up.follow_up_on', 'next_follow_up.type']);
      expect(await prisma.crm_communications.count({ where: { lead_id: t.leadId } })).toBe(0);
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).lead_stage).toBe('New');
    });

    it('only the Lead By user or the Admin works on a lead; anyone can read it', async () => {
      const t = await newLead('Ownership');
      await logConv(t.leadId, dhruv, {}, t.person.person_id).expect(403);
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(dhruv)).send({ note_type: 'General', note: 'x' }).expect(403);
      await logConv(t.leadId, boss, {}, t.person.person_id).expect(201);
      await api().get(`/api/v1/sales/leads/${t.leadId}/conversations`).set(as(dhruv)).expect(200);
      await api().get(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(dhruv)).expect(200);
    });

    it('company level: belongs to the company before a lead exists, to the open lead after', async () => {
      const ct = await prisma.customer_types.findFirstOrThrow({ where: { name: 'Prospect' } });
      const ind = await prisma.industries.findFirstOrThrow({ where: { name: 'Unclassified' } });
      const co = await prisma.companies.create({ data: { name: `CompanyLevel ${run}`, customer_type_id: ct.customer_type_id, industry_id: ind.industry_id } });
      const p = await prisma.persons.create({ data: { name: 'Anil', mobile: phone(13) } });
      await prisma.company_persons.create({ data: { company_id: co.company_id, person_id: p.person_id, is_primary: true } });

      const before = await api().post(`/api/v1/sales/companies/${co.company_id}/communications`).set(as(dhruv)).send({ type: 'Site Visit', contact_id: p.person_id, what_discussed: 'Saw the plant', outcome: 'Needs more information' }).expect(201);
      expect(before.body.conversation.lead_id).toBeNull();
      expect(before.body.status_change).toBeNull();

      const lead = await api().post(`/api/v1/sales/companies/${co.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['Website Development'] }).expect(201);
      const after = await api().post(`/api/v1/sales/companies/${co.company_id}/communications`).set(as(dhruv)).send({ type: 'Email', contact_id: p.person_id, what_discussed: 'Sent profile', outcome: 'Interested' }).expect(201);
      expect(after.body.conversation.lead_id).toBe(lead.body.lead_id);
      expect(after.body.status_change).toEqual({ from: 'New', to: 'Contacted' });

      const all = await api().get(`/api/v1/sales/companies/${co.company_id}/communications`).set(as(dhruv)).expect(200);
      expect(all.body.total).toBe(2);
      const history = await api().get(`/api/v1/sales/companies/${co.company_id}/history`).set(as(dhruv)).expect(200);
      expect(history.body.items.map((h: { event: string }) => h.event)).toEqual(expect.arrayContaining(['LEAD_CREATED', 'CONVERSATION_LOGGED']));
    });

    it('edit: the author for 24 hours, the Admin any time, and every edit lands in History', async () => {
      const t = await newLead('Editing');
      const c = await logConv(t.leadId, kishan, {}, t.person.person_id).expect(201);
      const id = c.body.conversation.communication_id;
      const ok = await api().patch(`/api/v1/sales/conversations/${id}`).set(as(kishan)).send({ outcome: 'Call back later', what_discussed: 'Asked to call on Monday' }).expect(200);
      expect(ok.body).toMatchObject({ outcome: 'Call back later', what_discussed: 'Asked to call on Monday', editable: true });
      await api().patch(`/api/v1/sales/conversations/${id}`).set(as(dhruv)).send({ outcome: 'No response' }).expect(403);
      await api().patch(`/api/v1/sales/conversations/${id}`).set(as(kishan)).send({ type: 'Telepathy' }).expect(400);

      await prisma.crm_communications.update({ where: { communication_id: id }, data: { created_at: new Date(Date.now() - 25 * 3600 * 1000) } });
      const locked = await api().patch(`/api/v1/sales/conversations/${id}`).set(as(kishan)).send({ outcome: 'No response' }).expect(403);
      expect(locked.body.detail).toMatch(/locked/);
      await api().patch(`/api/v1/sales/conversations/${id}`).set(as(boss)).send({ outcome: 'No response' }).expect(200);

      const history = await api().get(`/api/v1/sales/leads/${t.leadId}/history`).set(as(kishan)).expect(200);
      const edits = history.body.items.filter((h: { event: string }) => h.event === 'CONVERSATION_EDITED');
      expect(edits).toHaveLength(2);
      expect(edits[0].details.changes.outcome).toEqual({ from: 'Call back later', to: 'No response' });
    });

    it('quick log: a one-line call is a conversation with the primary contact and no outcome; "Note" is a General note', async () => {
      const t = await newLead('Quick');
      const call = await api().post(`/api/v1/sales/leads/${t.leadId}/quick-log`).set(as(kishan)).send({ type: 'WhatsApp', text: 'Sent the catalogue' }).expect(201);
      expect(call.body).toMatchObject({ kind: 'conversation', result: { status_change: { from: 'New', to: 'Contacted' }, conversation: { type: 'WhatsApp', outcome: null, contact: { person_id: t.person.person_id } } } });
      const note = await api().post(`/api/v1/sales/leads/${t.leadId}/quick-log`).set(as(kishan)).send({ type: 'Note', text: 'Likes the demo' }).expect(201);
      expect(note.body).toMatchObject({ kind: 'note', note: { note_type: 'General', note: 'Likes the demo' } });
      await api().post(`/api/v1/sales/leads/${t.leadId}/quick-log`).set(as(kishan)).send({ type: 'Telegram', text: 'x' }).expect(400);
      await api().post(`/api/v1/sales/leads/${t.leadId}/quick-log`).set(as(kishan)).send({ type: 'Call', text: '   ' }).expect(400);
    });
  });

  // -------------------------------------------------------------------- notes ----

  describe('Notes and timeline', () => {
    it('adds typed notes, rejects system types, pins, and orders pinned first', async () => {
      const t = await newLead('Notes');
      const add = (note_type: string, note: string, extra: Record<string, unknown> = {}) =>
        api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type, note, ...extra });
      await add('Win', 'x').expect(400);
      await add('Budget', '').expect(400);
      const req = await add('Requirement', 'Needs CRM').expect(201);
      await add('Budget', 'Rs 3-4 lakh').expect(201);
      const pinned = await add('General', 'Decision maker is the MD', { is_pinned: true }).expect(201);
      expect(pinned.body).toMatchObject({ is_pinned: true, editable: true, created_by: { emp_id: kishan } });
      const list = await api().get(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).expect(200);
      expect(list.body[0].note_id).toBe(pinned.body.note_id);

      await api().patch(`/api/v1/sales/notes/${req.body.note_id}`).set(as(kishan)).send({ is_pinned: true }).expect(200);
      await api().patch(`/api/v1/sales/notes/${req.body.note_id}`).set(as(dhruv)).send({ note: 'hijack' }).expect(403);
      await api().patch(`/api/v1/sales/notes/${req.body.note_id}`).set(as(dhruv)).send({ is_pinned: false }).expect(403);
      await api().patch(`/api/v1/sales/notes/${req.body.note_id}`).set(as(kishan)).send({ note: 'Needs CRM with Tally' }).expect(200);
      await api().patch('/api/v1/sales/notes/99999999').set(as(kishan)).send({ note: 'x' }).expect(404);
    });

    it('timeline: pending follow-ups first, pinned notes next, then newest first; History records the changes', async () => {
      const t = await newLead('Timeline');
      await logConv(t.leadId, kishan, { next_follow_up: { follow_up_on: hoursFromNow(24), type: 'Call' } }, t.person.person_id).expect(201);
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Budget', note: 'older note' }).expect(201);
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'General', note: 'pinned one', is_pinned: true }).expect(201);
      const tl = await api().get(`/api/v1/sales/leads/${t.leadId}/timeline`).set(as(dhruv)).expect(200);
      const kinds = tl.body.items.map((i: { kind: string; pinned: boolean }) => (i.kind === 'note' && i.pinned ? 'pinned_note' : i.kind));
      expect(kinds[0]).toBe('follow_up');
      expect(kinds[1]).toBe('pinned_note');
      expect(kinds).toEqual(expect.arrayContaining(['conversation', 'note', 'status_change']));
      const times = tl.body.items.slice(2).map((i: { at: string }) => new Date(i.at).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
      const history = await api().get(`/api/v1/sales/leads/${t.leadId}/history`).set(as(dhruv)).expect(200);
      expect(history.body.items.map((h: { event: string }) => h.event)).toEqual(expect.arrayContaining(['CREATED', 'STATUS_CHANGED', 'CONVERSATION_LOGGED', 'FOLLOW_UP_SCHEDULED', 'NOTE_ADDED']));
    });
  });

  // ------------------------------------------------------------- status actions ----

  describe('Qualify, Hold, Lost, Reopen, Change Lead By', () => {
    it('Qualify Lead: the checklist says what is missing; it passes once it is all there', async () => {
      const t = await newLead('Qualify');
      const q0 = await api().get(`/api/v1/sales/leads/${t.leadId}/qualification`).set(as(kishan)).expect(200);
      expect(q0.body).toMatchObject({ status: 'New', complete: false, can_qualify: false, allowed_actions: ['lost'] });
      expect(q0.body.items.filter((i: { done: boolean }) => i.done).map((i: { key: string }) => i.key)).toEqual(['service_fit']);

      const early = await api().post(`/api/v1/sales/leads/${t.leadId}/qualify`).set(as(kishan)).send({}).expect(409);
      expect(early.body.code).toBe('INVALID_TRANSITION');

      await logConv(t.leadId, kishan, {}, t.person.person_id).expect(201);
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Requirement', note: 'CRM' }).expect(201);
      const missing = await api().post(`/api/v1/sales/leads/${t.leadId}/qualify`).set(as(kishan)).send({}).expect(422);
      expect(missing.body.code).toBe('QUALIFICATION_INCOMPLETE');
      expect(missing.body.errors.map((e: { field: string }) => e.field)).toEqual(['budget', 'readiness']);
      await api().post(`/api/v1/sales/leads/${t.leadId}/qualify`).set(as(dhruv)).send({}).expect(403);

      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Budget', note: '3 lakh' }).expect(201);
      await api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(kishan)).send({ note_type: 'Readiness', note: 'April' }).expect(201);
      const q1 = await api().get(`/api/v1/sales/leads/${t.leadId}/qualification`).set(as(kishan)).expect(200);
      expect(q1.body).toMatchObject({ complete: true, can_qualify: true });
      const bad = await api().post(`/api/v1/sales/leads/${t.leadId}/qualify`).set(as(kishan)).send({ service_fit: ['Teleportation'] }).expect(400);
      expect(bad.body.errors[0].field).toBe('service_fit');
      const ok = await api().post(`/api/v1/sales/leads/${t.leadId}/qualify`).set(as(kishan)).send({ service_fit: ['CRM / ERP Software'] }).expect(200);
      expect(ok.body).toMatchObject({ from: 'Contacted', to: 'Qualified', lead: { status: 'Qualified', service_fit: ['CRM / ERP Software'] } });
    });

    it('Put On Hold needs a check-back date, creates the follow-up, and Reopen returns to the previous status', async () => {
      const t = await newLead('Hold');
      await api().post(`/api/v1/sales/leads/${t.leadId}/hold`).set(as(kishan)).send({ follow_up_on: hoursFromNow(48) }).expect(409); // New cannot be put on hold
      await logConv(t.leadId, kishan, {}, t.person.person_id).expect(201);
      await prisma.leads.update({ where: { lead_id: t.leadId }, data: { lead_stage: 'Qualified' } });

      const none = await api().post(`/api/v1/sales/leads/${t.leadId}/hold`).set(as(kishan)).send({}).expect(400);
      expect(none.body.errors[0]).toMatchObject({ field: 'follow_up_on', message: 'Please fill this field.' });
      await api().post(`/api/v1/sales/leads/${t.leadId}/hold`).set(as(kishan)).send({ follow_up_on: hoursFromNow(-72) }).expect(400);

      const held = await api().post(`/api/v1/sales/leads/${t.leadId}/hold`).set(as(kishan)).send({ follow_up_on: hoursFromNow(72), reason: 'Waiting for budget approval' }).expect(200);
      expect(held.body).toMatchObject({ from: 'Qualified', to: 'On Hold', lead: { status: 'On Hold', on_hold_reason: 'Waiting for budget approval', next_follow_up: expect.any(Object) } });
      expect(await prisma.crm_follow_ups.count({ where: { lead_id: t.leadId, status: 'Pending' } })).toBe(1);

      const back = await api().post(`/api/v1/sales/leads/${t.leadId}/reopen`).set(as(kishan)).expect(200);
      expect(back.body).toMatchObject({ from: 'On Hold', to: 'Qualified', lead: { status: 'Qualified', on_hold_reason: null } });
      await api().post(`/api/v1/sales/leads/${t.leadId}/reopen`).set(as(kishan)).expect(409); // not On Hold / Lost any more
    });

    it('Mark as Lost needs a reason ("Other" needs a note), cancels follow-ups, writes a Lost note; Reopen goes back to Contacted', async () => {
      const t = await newLead('Lost');
      await logConv(t.leadId, kishan, { next_follow_up: { follow_up_on: hoursFromNow(24), type: 'Call' } }, t.person.person_id).expect(201);
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).next_follow_up_at).not.toBeNull();

      const none = await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({}).expect(400);
      expect(none.body.errors[0].field).toBe('reason');
      await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'Mood' }).expect(400);
      const other = await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'other' }).expect(400);
      expect(other.body.errors[0]).toMatchObject({ field: 'note' });

      const lost = await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'budget too low', note: 'Wants it for half the price' }).expect(200);
      expect(lost.body).toMatchObject({ from: 'Contacted', to: 'Lost', lead: { status: 'Lost', lost_reason: 'Budget too low', lost_note: 'Wants it for half the price', next_follow_up: null } });
      expect(await prisma.crm_follow_ups.count({ where: { lead_id: t.leadId, status: 'Cancelled', reason: 'Lead marked as Lost' } })).toBe(1);
      const lostNote = await prisma.crm_lead_notes.findFirstOrThrow({ where: { lead_id: t.leadId, note_type: 'Lost' } });
      expect(lostNote.note).toBe('Budget too low: Wants it for half the price');
      await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'Budget too low' }).expect(409);

      const reopened = await api().post(`/api/v1/sales/leads/${t.leadId}/reopen`).set(as(boss)).expect(200);
      expect(reopened.body).toMatchObject({ from: 'Lost', to: 'Contacted', lead: { status: 'Contacted', lost_reason: null } });
      // The lead can still be worked on after being reopened (contact pointer is valid).
      await logConv(t.leadId, kishan, {}, t.person.person_id).expect(201);
    });

    it('Reopen is refused while the company has a newer open lead', async () => {
      const t = await newLead('Reopen Race');
      await api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(kishan)).send({ reason: 'Budget too low' }).expect(200);
      const newer = await api().post(`/api/v1/sales/companies/${t.company.company_id}/convert-to-lead`).set(as(kishan)).send({ service_fit: ['Website Development'] }).expect(201);
      const res = await api().post(`/api/v1/sales/leads/${t.leadId}/reopen`).set(as(kishan)).expect(409);
      expect(res.body.code).toBe('OPEN_LEAD_EXISTS');
      expect(res.body.errors[0].lead.lead_id).toBe(newer.body.lead_id);
      expect((await prisma.leads.findUniqueOrThrow({ where: { lead_id: t.leadId } })).lead_stage).toBe('Lost');
    });

    it('Change Lead By is Admin only; the new owner is notified and now owns the lead', async () => {
      const t = await newLead('Handover');
      await api().post(`/api/v1/sales/leads/${t.leadId}/change-lead-by`).set(as(kishan)).send({ lead_by_id: dhruv }).expect(403);
      await api().post(`/api/v1/sales/leads/${t.leadId}/change-lead-by`).set(as(boss)).send({}).expect(400);
      await api().post(`/api/v1/sales/leads/${t.leadId}/change-lead-by`).set(as(boss)).send({ lead_by_id: 999999 }).expect(400);
      const res = await api().post(`/api/v1/sales/leads/${t.leadId}/change-lead-by`).set(as(boss)).send({ lead_by_id: dhruv }).expect(200);
      expect(res.body).toMatchObject({ lead_by_id: dhruv, previous: kishan, lead: { lead_by: { emp_id: dhruv } } });
      expect(await prisma.notifications.count({ where: { recipient_id: dhruv, entity_type: 'LEAD', entity_id: t.leadId } })).toBe(1);
      await logConv(t.leadId, kishan, {}, t.person.person_id).expect(403);
      await logConv(t.leadId, dhruv, {}, t.person.person_id).expect(201);
      const history = await api().get(`/api/v1/sales/leads/${t.leadId}/history`).set(as(boss)).expect(200);
      expect(history.body.items.find((h: { event: string }) => h.event === 'LEAD_BY_CHANGED').details).toEqual({ from: kishan, to: dhruv });
    });

    it('a Converted lead is read-only', async () => {
      const t = await newLead('Converted');
      await prisma.leads.update({ where: { lead_id: t.leadId }, data: { lead_stage: 'Converted' } });
      const attempts = [
        () => logConv(t.leadId, boss, {}, t.person.person_id),
        () => api().post(`/api/v1/sales/leads/${t.leadId}/notes`).set(as(boss)).send({ note_type: 'General', note: 'x' }),
        () => api().post(`/api/v1/sales/leads/${t.leadId}/lost`).set(as(boss)).send({ reason: 'Budget too low' }),
        () => api().post(`/api/v1/sales/leads/${t.leadId}/change-lead-by`).set(as(boss)).send({ lead_by_id: dhruv }),
      ];
      for (const attempt of attempts) {
        const res = await attempt().expect(409);
        expect(res.body.code).toBe('LEAD_LOCKED');
      }
      const q = await api().get(`/api/v1/sales/leads/${t.leadId}/qualification`).set(as(boss)).expect(200);
      expect(q.body.allowed_actions).toEqual([]);
      await api().get(`/api/v1/sales/leads/${t.leadId}/timeline`).set(as(boss)).expect(200);
    });
  });
});
