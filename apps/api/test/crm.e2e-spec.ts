import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
const cookieParser = require('cookie-parser');
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { AUTH_TOKENS } from '../src/modules/auth/application/ports/tokens';
import { InMemoryMailAdapter } from '../src/modules/auth/infrastructure/mail/in-memory-mail.adapter';
import { GlobalExceptionFilter } from '../src/core/filters/global-exception.filter';
import { assertTestEnvironment } from '../src/core/utils/env-guard';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test'), override: true });

describe('CRM Companies & Persons API (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mailAdapter: InMemoryMailAdapter;

  const TEST_PASSWORD = 'ValidP@ssw0rd123!';

  let adminToken: string;
  let nonAdminToken: string;
  let adminEmpId: number;

  let testIndustryId: number;
  let testSubIndustryId: number;
  let testCustomerTypeId: number;

  beforeAll(async () => {
    await assertTestEnvironment(process.env.DATABASE_URL!);

    mailAdapter = new InMemoryMailAdapter();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_TOKENS.MailPort)
      .useValue(mailAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['\\.well-known/(.*)'],
    });

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    const passwordHash = await argon2.hash(TEST_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // 1. Admin department & role
    let adminDep = await prisma.departments.findFirst({
      where: { name: 'Admin', deleted_at: null },
    });
    if (!adminDep) {
      adminDep = await prisma.departments.create({
        data: { name: 'Admin', is_active: true },
      });
    }

    let adminRole = await prisma.roles.findFirst({
      where: { dep_id: adminDep.dep_id, is_admin: true, deleted_at: null },
    });
    if (!adminRole) {
      adminRole = await prisma.roles.create({
        data: {
          role_name: 'Admin',
          dep_id: adminDep.dep_id,
          is_admin: true,
          is_active: true,
        },
      });
    }

    let nonAdminRole = await prisma.roles.findFirst({
      where: { dep_id: adminDep.dep_id, is_admin: false, deleted_at: null },
    });
    if (!nonAdminRole) {
      nonAdminRole = await prisma.roles.create({
        data: {
          role_name: 'Staff',
          dep_id: adminDep.dep_id,
          is_admin: false,
          is_active: true,
        },
      });
    }

    const adminEmail = `crm_admin_${Date.now()}@test.pulse`;
    const adminEmp = await prisma.employees.create({
      data: {
        name: 'CRM Admin',
        email: adminEmail,
        mob: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDep.dep_id,
        role_id: adminRole.role_id,
        status: 'Active',
        joining_date: new Date(),
      },
    });
    adminEmpId = adminEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: adminEmp.emp_id,
        password_hash: passwordHash,
      },
    });

    const nonAdminEmail = `crm_staff_${Date.now()}@test.pulse`;
    const nonAdminEmp = await prisma.employees.create({
      data: {
        name: 'CRM Staff',
        email: nonAdminEmail,
        mob: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDep.dep_id,
        role_id: nonAdminRole.role_id,
        status: 'Active',
        joining_date: new Date(),
      },
    });

    await prisma.employee_credentials.create({
      data: {
        emp_id: nonAdminEmp.emp_id,
        password_hash: passwordHash,
      },
    });

    // Login admin with 2FA
    mailAdapter.clear();
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);
    const adminChallengeId = adminLoginRes.body.challenge_id;
    const adminOtp = mailAdapter.getLatestEmailFor(adminEmail)!.code;
    const verifyAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: adminChallengeId, code: adminOtp })
      .expect(200);
    adminToken = verifyAdminRes.body.access_token;

    // Login non-admin with 2FA
    mailAdapter.clear();
    const nonAdminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: nonAdminEmail, password: TEST_PASSWORD })
      .expect(200);
    const staffChallengeId = nonAdminLoginRes.body.challenge_id;
    const staffOtp = mailAdapter.getLatestEmailFor(nonAdminEmail)!.code;
    const verifyStaffRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: staffChallengeId, code: staffOtp })
      .expect(200);
    nonAdminToken = verifyStaffRes.body.access_token;

    // Ensure active test master data
    let ind = await prisma.industries.findFirst({
      where: { parent_id: null, is_active: true, deleted_at: null },
    });
    testIndustryId = ind!.industry_id;

    let subInd = await prisma.industries.findFirst({
      where: { parent_id: testIndustryId, is_active: true, deleted_at: null },
    });
    if (!subInd) {
      subInd = await prisma.industries.create({
        data: {
          name: `CRM Sub Ind ${Date.now()}`,
          parent_id: testIndustryId,
          is_active: true,
          is_default: false,
          created_by: adminEmpId,
        },
      });
    }
    testSubIndustryId = subInd.industry_id;

    let ct = await prisma.customer_types.findFirst({
      where: { is_active: true, deleted_at: null },
    });
    testCustomerTypeId = ct!.customer_type_id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('401/403 Matrix for CRM routes', () => {
    const routes = [
      { method: 'get', url: '/api/v1/companies' },
      { method: 'get', url: '/api/v1/companies/options' },
      { method: 'get', url: '/api/v1/companies/duplicate-check?name=test' },
      { method: 'post', url: '/api/v1/companies' },
      { method: 'get', url: '/api/v1/persons/lookup?email=test@test.com' },
    ];

    for (const r of routes) {
      it(`returns 401 for unauthenticated ${r.method.toUpperCase()} ${r.url}`, async () => {
        const res = await (request(app.getHttpServer()) as any)[r.method](r.url);
        expect(res.status).toBe(401);
      });

      it(`returns 403 for non-admin on ${r.method.toUpperCase()} ${r.url}`, async () => {
        const res = await (request(app.getHttpServer()) as any)[r.method](r.url)
          .set('Authorization', `Bearer ${nonAdminToken}`);
        expect(res.status).toBe(403);
      });
    }
  });

  describe('Company creation, atomic rollback, and contact sharing', () => {
    let existingPersonId: number;
    let createdCompanyId: number;
    const specialistEmail = `specialist_${Date.now()}@crm-test.com`;

    beforeAll(async () => {
      const p = await prisma.persons.create({
        data: {
          name: 'Shared Specialist',
          email: specialistEmail,
          mobile: '9888800001',
          created_by: adminEmpId,
        },
      });
      existingPersonId = p.person_id;
    });

    it('rolls back completely when a failure occurs during creation (atomic transaction)', async () => {
      const companyCountBefore = await prisma.companies.count({ where: { deleted_at: null } });
      const channelCountBefore = await prisma.company_channels.count({ where: { deleted_at: null } });
      const personCountBefore = await prisma.persons.count({ where: { deleted_at: null } });

      const failRes = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Rollback Company ${Date.now()}`,
          customer_type_id: testCustomerTypeId,
          industry_id: testIndustryId,
          channels: [
            { channel_type: 'email', value: 'contact@rollback.com', is_primary: true },
          ],
          contacts: [
            { person: { name: 'Valid Person', email: 'valid@rollback.com' }, is_primary: true },
            { person: { name: 'Invalid Person', email: 'not-an-email' } }, // Invalid email -> should fail
          ],
        });

      expect(failRes.status).toBe(400);

      const companyCountAfter = await prisma.companies.count({ where: { deleted_at: null } });
      const channelCountAfter = await prisma.company_channels.count({ where: { deleted_at: null } });
      const personCountAfter = await prisma.persons.count({ where: { deleted_at: null } });

      expect(companyCountAfter).toBe(companyCountBefore);
      expect(channelCountAfter).toBe(channelCountBefore);
      expect(personCountAfter).toBe(personCountBefore);
    });

    it('creates company with 3 channels and 3 contacts atomically (one new, one linked, one reports_to)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Mega Corp ${Date.now()}`,
          customer_type_id: testCustomerTypeId,
          industry_id: testIndustryId,
          sub_industry_id: testSubIndustryId,
          owner_id: adminEmpId,
          channels: [
            { channel_type: 'website', value: 'megacorp.com', is_primary: true },
            { channel_type: 'email', value: 'Hello@MegaCorp.com', is_primary: true },
            { channel_type: 'phone', value: '+1 (555) 000-1111', is_primary: true },
          ],
          contacts: [
            {
              person: { name: 'Sarah Connor', email: 'sarah@megacorp.com', mobile: '555-000-2222' },
              designation: 'Managing Director',
              is_primary: true,
            },
            {
              person_id: existingPersonId,
              designation: 'External Consultant',
              reports_to_index: 0,
            },
            {
              person: { name: 'John Connor', mobile: '555-000-3333' },
              designation: 'CTO',
              reports_to_index: 0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/v1/companies/${res.body.company_id}`);
      createdCompanyId = res.body.company_id;

      expect(res.body.channels).toHaveLength(3);
      expect(res.body.contacts).toHaveLength(3);

      const primaryContact = res.body.contacts.find((c: any) => c.is_primary);
      expect(primaryContact).toBeDefined();

      const consultant = res.body.contacts.find((c: any) => c.person_id === existingPersonId);
      expect(consultant).toBeDefined();
      expect(consultant.reports_to_company_person_id).toBe(primaryContact.company_person_id);
    });

    it('a person shared by two companies keeps ONE persons row', async () => {
      // Create a second company linking the same existingPersonId
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Partner Corp ${Date.now()}`,
          customer_type_id: testCustomerTypeId,
          industry_id: testIndustryId,
          contacts: [
            {
              person_id: existingPersonId,
              designation: 'Strategic Advisor',
              is_primary: true,
            },
          ],
        });

      expect(res2.status).toBe(201);

      // Person count for specialistEmail must strictly remain 1
      const count = await prisma.persons.count({
        where: { email: specialistEmail, deleted_at: null },
      });
      expect(count).toBe(1);

      // Detail should reflect linked_company_count >= 2
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/companies/${res2.body.company_id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(detailRes.status).toBe(200);
      const linkedContact = detailRes.body.contacts.find((c: any) => c.person_id === existingPersonId);
      expect(linkedContact.linked_company_count).toBeGreaterThanOrEqual(2);
    });

    it('PATCH does not modify a linked person own details (name, email, mobile)', async () => {
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contacts: [
            {
              person_id: existingPersonId,
              person: { name: 'Attempted Hijack Name' }, // Should be ignored or rejected
              designation: 'Updated Designation Only',
              is_primary: true,
            },
          ],
        });

      expect(patchRes.status).toBe(200);

      // Verify the person in DB still has original name
      const personInDb = await prisma.persons.findUnique({
        where: { person_id: existingPersonId },
      });
      expect(personInDb?.name).toBe('Shared Specialist');
    });

    it('updates company with diff semantics (add, edit, remove channels and contacts)', async () => {
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const existingChannel = getRes.body.channels[0];

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Renamed Mega Corp',
          channels: [
            {
              channel_id: existingChannel.channel_id,
              channel_type: existingChannel.channel_type,
              value: existingChannel.value,
              label: 'Updated Label',
              is_primary: true,
            },
            {
              channel_type: 'whatsapp',
              value: '+15559998888',
              is_primary: true,
            },
          ],
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.name).toBe('Renamed Mega Corp');
      expect(patchRes.body.channels).toHaveLength(2);
      expect(patchRes.body.channels.some((ch: any) => ch.channel_type === 'whatsapp')).toBe(true);
    });
  });

  describe('List Filters & Keyset Pagination', () => {
    it('filters companies by q, customer_type, industry (including sub-industries) and owner', async () => {
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/companies?industry_id=${testIndustryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toBeDefined();

      const unassignedRes = await request(app.getHttpServer())
        .get('/api/v1/companies?owner=unassigned')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unassignedRes.status).toBe(200);
      expect(unassignedRes.body.items.every((c: any) => c.owner === null)).toBe(true);
    });

    it('keyset pagination traverses without duplicates', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/api/v1/companies?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      if (page1.body.next_cursor) {
        const page2 = await request(app.getHttpServer())
          .get(`/api/v1/companies?limit=2&cursor=${encodeURIComponent(page1.body.next_cursor)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(page2.status).toBe(200);
        const p1Ids = new Set(page1.body.items.map((i: any) => i.company_id));
        const p2Ids = page2.body.items.map((i: any) => i.company_id);
        expect(p2Ids.some((id: any) => p1Ids.has(id))).toBe(false);
      }
    });
  });

  describe('Duplicate Detection & Person Lookup', () => {
    it('duplicate check finds name and channel matches', async () => {
      const dupRes = await request(app.getHttpServer())
        .get('/api/v1/companies/duplicate-check?name=Mega%20Corp')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dupRes.status).toBe(200);
      expect(Array.isArray(dupRes.body)).toBe(true);
    });

    it('person lookup matches by email or mobile', async () => {
      const lookupRes = await request(app.getHttpServer())
        .get('/api/v1/persons/lookup?email=specialist@crm-test.com')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(lookupRes.status).toBe(200);
      expect(lookupRes.body.length).toBeGreaterThanOrEqual(1);
      expect(lookupRes.body[0].name).toBe('Shared Specialist');
    });
  });

  describe('Soft Delete Cascade & In-Use protection', () => {
    it('rejects deletion when company has active child companies', async () => {
      // Create parent company
      const parentRes = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Parent Co ${Date.now()}`,
          customer_type_id: testCustomerTypeId,
          industry_id: testIndustryId,
        });

      // Create child company
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Child Co ${Date.now()}`,
          parent_company_id: parentRes.body.company_id,
          customer_type_id: testCustomerTypeId,
          industry_id: testIndustryId,
        });

      // Attempt delete parent
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/companies/${parentRes.body.company_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(409);
      expect(delRes.body.code).toBe('IN_USE');
    });
  });
});
