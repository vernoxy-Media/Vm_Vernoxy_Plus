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

describe('Master Data API (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mailAdapter: InMemoryMailAdapter;

  const TEST_PASSWORD = 'ValidP@ssw0rd123!';

  let adminToken: string;
  let nonAdminToken: string;

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

    // 1. Ensure Admin department & role
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

    // Ensure non-admin role
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

    // 2. Ensure admin employee
    const adminEmail = `master_admin_${Date.now()}@test.pulse`;
    const adminEmp = await prisma.employees.create({
      data: {
        name: 'Master Admin',
        email: adminEmail,
        mob: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDep.dep_id,
        role_id: adminRole.role_id,
        status: 'Active',
        joining_date: new Date(),
      },
    });

    await prisma.employee_credentials.create({
      data: {
        emp_id: adminEmp.emp_id,
        password_hash: passwordHash,
      },
    });

    // 3. Ensure non-admin employee
    const nonAdminEmail = `master_staff_${Date.now()}@test.pulse`;
    const nonAdminEmp = await prisma.employees.create({
      data: {
        name: 'Master Staff',
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('401/403 Matrix for Master Data routes', () => {
    const routes = [
      { method: 'get', url: '/api/v1/industries' },
      { method: 'get', url: '/api/v1/industries/options' },
      { method: 'post', url: '/api/v1/industries' },
      { method: 'get', url: '/api/v1/customer-types' },
      { method: 'get', url: '/api/v1/customer-types/options' },
      { method: 'post', url: '/api/v1/customer-types' },
      { method: 'get', url: '/api/v1/lookups/options?type=person_department' },
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

  describe('Industries CRUD, hierarchy & default protection', () => {
    let topIndustryId: number;
    let subIndustryId: number;

    it('creates a top-level industry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/industries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Test Clean Tech ${Date.now()}` });

      expect(res.status).toBe(201);
      expect(res.body.industry_id).toBeDefined();
      expect(res.body.parent_id).toBeNull();
      topIndustryId = res.body.industry_id;
    });

    it('creates a sub-industry under top-level industry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/industries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Solar Power ${Date.now()}`, parent_id: topIndustryId });

      expect(res.status).toBe(201);
      expect(res.body.parent_id).toBe(topIndustryId);
      subIndustryId = res.body.industry_id;
    });

    it('rejects creating a 3rd level sub-industry (max 2 levels)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/industries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Microinverters ${Date.now()}`, parent_id: subIndustryId });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MAX_LEVELS_EXCEEDED');
    });

    it('GET /industries/options returns top-level with is_default and sub-industries with parent_id', async () => {
      const topRes = await request(app.getHttpServer())
        .get('/api/v1/industries/options')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(topRes.status).toBe(200);
      expect(Array.isArray(topRes.body)).toBe(true);
      const defaultInd = topRes.body.find((x: any) => x.is_default);
      expect(defaultInd).toBeDefined();

      const subRes = await request(app.getHttpServer())
        .get(`/api/v1/industries/options?parent_id=${topIndustryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(subRes.status).toBe(200);
      expect(subRes.body.some((x: any) => x.id === subIndustryId)).toBe(true);
    });

    it('protects default industry from deactivation and deletion', async () => {
      const defaultInd = await prisma.industries.findFirst({
        where: { is_default: true, deleted_at: null },
      });
      expect(defaultInd).toBeDefined();

      // Attempt deactivate
      const deactRes = await request(app.getHttpServer())
        .patch(`/api/v1/industries/${defaultInd!.industry_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });
      expect(deactRes.status).toBe(409);
      expect(deactRes.body.code).toBe('DEFAULT_PROTECTED');

      // Attempt delete
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/industries/${defaultInd!.industry_id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(409);
      expect(delRes.body.code).toBe('DEFAULT_PROTECTED');
    });

    it('blocks deactivating top-level industry while active sub-industries exist', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/industries/${topIndustryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('IN_USE');
    });
  });

  describe('Customer Types CRUD & atomic default switching', () => {
    let ctAId: number;
    let ctBId: number;

    it('creates customer types', async () => {
      const resA = await request(app.getHttpServer())
        .post('/api/v1/customer-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Type A ${Date.now()}` });
      expect(resA.status).toBe(201);
      ctAId = resA.body.customer_type_id;

      const resB = await request(app.getHttpServer())
        .post('/api/v1/customer-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Type B ${Date.now()}` });
      expect(resB.status).toBe(201);
      ctBId = resB.body.customer_type_id;
    });

    it('switches default customer type atomically', async () => {
      const switchRes = await request(app.getHttpServer())
        .patch(`/api/v1/customer-types/${ctAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_default: true });

      expect(switchRes.status).toBe(200);
      expect(switchRes.body.is_default).toBe(true);

      // Verify exactly one default exists in database
      const defaultCount = await prisma.customer_types.count({
        where: { is_default: true, deleted_at: null },
      });
      expect(defaultCount).toBe(1);

      // Verify Info Only is no longer default
      const infoOnly = await prisma.customer_types.findFirst({
        where: { name: 'Info Only', deleted_at: null },
      });
      expect(infoOnly?.is_default).toBe(false);

      // Switch default back to Info Only
      if (infoOnly) {
        await request(app.getHttpServer())
          .patch(`/api/v1/customer-types/${infoOnly.customer_type_id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ is_default: true });
      }
    });

    it('rejects directly unsetting is_default=false', async () => {
      const defaultCt = await prisma.customer_types.findFirst({
        where: { is_default: true, deleted_at: null },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customer-types/${defaultCt!.customer_type_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_default: false });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DEFAULT_PROTECTED');
    });
  });

  describe('Lookups Whitelist', () => {
    it('allows whitelisted lookup types', async () => {
      for (const type of ['person_department', 'lead_source', 'lost_reason']) {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/lookups/options?type=${type}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it('rejects non-whitelisted lookup types with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/lookups/options?type=invalid_type')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_LOOKUP_TYPE');
    });
  });
});
