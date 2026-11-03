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

describe('Sales - Company Database (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now().toString(36);
  // 10-digit mobile that is unique per run, so reruns on the same database never collide.
  const mobile = '9' + String(Date.now()).slice(-9);
  let salesId: number;
  let devId: number;
  let adminId: number;
  const as = (id: number) => ({ 'x-emp-id': String(id) });
  const api = () => request(app.getHttpServer());

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
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: createValidationException,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);

    // Master data and people this suite needs (unique per run, never deleted).
    if (!(await prisma.customer_types.findFirst({ where: { name: 'Prospect' } }))) await prisma.customer_types.create({ data: { name: 'Prospect' } });
    if (!(await prisma.industries.findFirst({ where: { name: 'Unclassified' } }))) await prisma.industries.create({ data: { name: 'Unclassified' } });
    const salesDep = (await prisma.departments.findFirst({ where: { name: 'Sales' } })) ?? (await prisma.departments.create({ data: { name: 'Sales' } }));
    const devDep = (await prisma.departments.findFirst({ where: { name: 'Developer' } })) ?? (await prisma.departments.create({ data: { name: 'Developer' } }));
    const adminRole = await prisma.roles.create({ data: { role_name: `AdminRole-${run}`, dep_id: salesDep.dep_id, is_admin: true } });
    const mk = (name: string, dep: number, role: number | null) =>
      prisma.employees.create({
        data: { name: `${name}-${run}`, email: `${name}-${run}@t.in`, mob: '9' + String(Math.random()).slice(2, 11), dep_id: dep, role_id: role, joining_date: new Date() } as never,
      });
    salesId = (await mk('sales', salesDep.dep_id, null)).emp_id;
    devId = (await mk('dev', devDep.dep_id, null)).emp_id;
    adminId = (await mk('admin', salesDep.dep_id, adminRole.role_id)).emp_id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects unauthenticated and non-sales users, allows Sales and Admin', async () => {
    await api().get('/api/v1/sales/companies').expect(403);
    const res = await api().get('/api/v1/sales/companies').set(as(devId)).expect(403);
    expect(res.body.detail).toMatch(/Sales team or Admin/);
    await api().get('/api/v1/sales/companies').set(as(salesId)).expect(200);
    await api().get('/api/v1/sales/companies').set(as(adminId)).expect(200);
  });

  it('adds a company with only a name, then reads it back', async () => {
    const created = await api().post('/api/v1/sales/companies').set(as(salesId)).send({ company: { name: `Only Name ${run}` } }).expect(201);
    expect(created.body.company_code).toMatch(/^COM-\d{4}$/);
    expect(created.body.fields.website_quality).toBe('No Website');
    const got = await api().get(`/api/v1/sales/companies/${created.body.company_id}`).set(as(salesId)).expect(200);
    expect(got.body.fields.name).toBe(`Only Name ${run}`);
    expect(got.body.can_convert_to_lead).toBe(true);
  });

  it('returns every field error with the BFD messages and saves nothing', async () => {
    const res = await api()
      .post('/api/v1/sales/companies')
      .set(as(salesId))
      .send({ company: { name: '', pin: '12', is_gidc: true }, contact: { name: 'R', mobile: '123', email: 'x' } })
      .expect(400);
    const byField = Object.fromEntries(res.body.errors.map((e: { field: string; message: string }) => [e.field, e.message]));
    expect(byField).toMatchObject({
      name: 'Please fill this field.',
      gidc_name: 'Please fill this field.',
      pin: 'Please enter a valid PIN code.',
      'contact.mobile': 'The mobile number must be 10 digits.',
      'contact.email': 'Please enter a valid email.',
    });
  });

  it('treats a duplicate as a warning that the user can confirm', async () => {
    const body = { company: { name: `Dup Co ${run}`, city: 'Surat' }, contact: { name: 'Amit', mobile: `+91 ${mobile}` } };
    await api().post('/api/v1/sales/companies').set(as(salesId)).send(body).expect(201);

    const warn = await api().post('/api/v1/sales/companies').set(as(salesId)).send(body).expect(409);
    expect(warn.body.code).toBe('DUPLICATE_COMPANY');
    expect(warn.body.errors[0].matches[0]).toMatchObject({ reason: 'SAME_NAME_CITY' });

    const check = await api().get('/api/v1/sales/companies/duplicate-check').query({ mobile }).set(as(salesId)).expect(200);
    expect(check.body[0].reason).toBe('SAME_MOBILE');

    await api().post('/api/v1/sales/companies').set(as(salesId)).send({ ...body, confirm_duplicate: true }).expect(201);
  });

  it('lists with filters, sorting, pagination and counters; masters route is not shadowed by :id', async () => {
    const res = await api()
      .get('/api/v1/sales/companies')
      .query({ q: `Dup Co ${run}`, city: 'surat,vapi', is_gidc: 'false', lead: 'not_a_lead', sort: 'name', order: 'asc', page: 1, limit: 1 })
      .set(as(adminId))
      .expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(2);
    expect(res.body.total_pages).toBe(2);
    expect(res.body.counters).toMatchObject({ total: 2, not_a_lead: 2, open_leads: 0, converted_to_client: 0 });
    expect(res.body.items[0]).toMatchObject({ lead: { kind: 'none' }, can_convert_to_lead: true });

    const masters = await api().get('/api/v1/sales/companies/masters').set(as(salesId)).expect(200);
    expect(masters.body.countries).toContain('India');
  });

  it('rejects unknown properties and out-of-range paging', async () => {
    await api().post('/api/v1/sales/companies').set(as(salesId)).send({ company: { name: 'x' }, hacker: true }).expect(400);
    await api().get('/api/v1/sales/companies').query({ limit: 500 }).set(as(salesId)).expect(400);
    await api().get('/api/v1/sales/companies').query({ lead: 'everything' }).set(as(salesId)).expect(400);
  });

  it('edits a company and 404s for an unknown one', async () => {
    const c = await api().post('/api/v1/sales/companies').set(as(salesId)).send({ company: { name: `Edit Me ${run}` } }).expect(201);
    const upd = await api()
      .patch(`/api/v1/sales/companies/${c.body.company_id}`)
      .set(as(salesId))
      .send({ company: { pin: '395007', website: 'edit.example.in', website_quality: 'Good' }, contact: { name: 'New Person', email: `np-${run}@edit.in` } })
      .expect(200);
    expect(upd.body.fields).toMatchObject({ pin: '395007', website: 'edit.example.in', website_quality: 'Good' });
    expect(upd.body.contacts[0]).toMatchObject({ name: 'New Person', is_primary: true });
    await api().patch('/api/v1/sales/companies/99999999').set(as(salesId)).send({ company: { pin: '395007' } }).expect(404);
  });

  it('lets only the Admin delete, and only a company with no lead', async () => {
    const c = await api().post('/api/v1/sales/companies').set(as(salesId)).send({ company: { name: `Delete Me ${run}` } }).expect(201);
    await api().delete(`/api/v1/sales/companies/${c.body.company_id}`).set(as(salesId)).expect(403);
    await api().delete(`/api/v1/sales/companies/${c.body.company_id}`).set(as(adminId)).expect(204);
    await api().get(`/api/v1/sales/companies/${c.body.company_id}`).set(as(adminId)).expect(404);

    const withLead = await api().post('/api/v1/sales/companies').set(as(salesId)).send({ company: { name: `Has Lead ${run}` } }).expect(201);
    await prisma.leads.create({
      data: { company_id: withLead.body.company_id, title: 'L', pipeline_stage_id: 1, owner_id: salesId, lead_by_id: salesId, lead_stage: 'New' },
    });
    const blocked = await api().delete(`/api/v1/sales/companies/${withLead.body.company_id}`).set(as(adminId)).expect(409);
    expect(blocked.body.code).toBe('COMPANY_HAS_DEPENDENCIES');
  });
});
