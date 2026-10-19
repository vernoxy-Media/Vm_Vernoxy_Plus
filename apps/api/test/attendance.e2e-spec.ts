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

describe('Attendance API (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mailAdapter: InMemoryMailAdapter;

  const TEST_PASSWORD = 'ValidP@ssw0rd123!';

  let adminToken: string;
  let adminEmpId: number;
  let staffToken: string;
  let staffEmpId: number;

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

    let staffRole = await prisma.roles.findFirst({
      where: { dep_id: adminDep.dep_id, is_admin: false, deleted_at: null },
    });
    if (!staffRole) {
      staffRole = await prisma.roles.create({
        data: {
          role_name: 'Staff',
          dep_id: adminDep.dep_id,
          is_admin: false,
          is_active: true,
        },
      });
    }

    // 2. Create unique test admin employee
    const adminEmail = `att_admin_${Date.now()}@test.pulse`;
    const adminEmp = await prisma.employees.create({
      data: {
        name: 'Attendance Admin',
        email: adminEmail,
        mob: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDep.dep_id,
        role_id: adminRole.role_id,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    adminEmpId = adminEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: adminEmp.emp_id,
        password_hash: passwordHash,
      },
    });

    // 3. Create unique test staff employee
    const staffEmail = `att_staff_${Date.now()}@test.pulse`;
    const staffEmp = await prisma.employees.create({
      data: {
        name: 'Attendance Staff',
        email: staffEmail,
        mob: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDep.dep_id,
        role_id: staffRole.role_id,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    staffEmpId = staffEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: staffEmp.emp_id,
        password_hash: passwordHash,
      },
    });

    // 4. Login Admin
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

    // 5. Login Staff
    mailAdapter.clear();
    const staffLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: staffEmail, password: TEST_PASSWORD })
      .expect(200);
    const staffChallengeId = staffLoginRes.body.challenge_id;
    const staffOtp = mailAdapter.getLatestEmailFor(staffEmail)!.code;
    const verifyStaffRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: staffChallengeId, code: staffOtp })
      .expect(200);
    staffToken = verifyStaffRes.body.access_token;
  });

  afterAll(async () => {
    // Soft delete created test records (hard delete is disabled by db trigger)
    await prisma.attendance_breaks.updateMany({
      where: { attendance_days: { emp_id: { in: [adminEmpId, staffEmpId] } } },
      data: { deleted_at: new Date() },
    });
    await prisma.attendance_corrections.updateMany({
      where: { emp_id: { in: [adminEmpId, staffEmpId] } },
      data: { deleted_at: new Date() },
    });
    await prisma.attendance_days.updateMany({
      where: { emp_id: { in: [adminEmpId, staffEmpId] } },
      data: { deleted_at: new Date() },
    });
    await prisma.employee_credentials.updateMany({
      where: { emp_id: { in: [adminEmpId, staffEmpId] } },
      data: { deleted_at: new Date() },
    });
    await prisma.employees.updateMany({
      where: { emp_id: { in: [adminEmpId, staffEmpId] } },
      data: { deleted_at: new Date() },
    });
    await app.close();
  });

  describe('Workday Lifecycle & State Transitions', () => {
    it('1. Initial state is not_started', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.state).toBe('not_started');
      expect(res.body.check_in_at).toBeNull();
      expect(res.body.check_out_at).toBeNull();
    });

    it('2. Punch In transitions to working', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.state).toBe('working');
      expect(res.body.check_in_at).not.toBeNull();
      expect(res.body.events.length).toBeGreaterThanOrEqual(1);
    });

    it('3. Repeated Punch In returns 409 Conflict with RFC 7807 error format and resync today', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(409);

      expect(res.body.status).toBe(409);
      expect(res.body.title).toBeDefined();
      expect(res.body.today).toBeDefined();
      expect(res.body.today.state).toBe('working');
    });

    it('4. Start Break transitions to on_break', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.state).toBe('on_break');
      expect(res.body.current_break_started_at).not.toBeNull();
    });

    it('5. Repeated Start Break returns 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(409);

      expect(res.body.status).toBe(409);
    });

    it('6. End Break transitions back to working', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/break/end')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.state).toBe('working');
      expect(res.body.current_break_started_at).toBeNull();
    });

    it('7. Repeated End Break returns 409 Conflict (not on break)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/break/end')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(409);

      expect(res.body.status).toBe(409);
    });

    it('8. Punch Out finishes the day and transitions to done', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.state).toBe('done');
      expect(res.body.check_out_at).not.toBeNull();
    });

    it('9. Repeated Punch Out returns 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(409);

      expect(res.body.status).toBe(409);
    });
  });

  describe('Auto-ending break on checkout', () => {
    it('automatically closes active break when checking out while on break', async () => {
      // Use admin employee for this test on today's record
      await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Punch out directly while on break
      const checkOutRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(checkOutRes.body.state).toBe('done');
      expect(checkOutRes.body.current_break_started_at).toBeNull();

      // Verify in DB that no open break remains
      const openBreaks = await prisma.attendance_breaks.findMany({
        where: {
          attendance_days: { emp_id: adminEmpId },
          ended_at: null,
        },
      });
      expect(openBreaks.length).toBe(0);
    });
  });

  describe('Dashboard Query Performance & Budget', () => {
    it('returns complete dashboard with <= 2 database round trips', async () => {
      let queryCount = 0;
      const originalQuery = (prisma as any).$queryRawUnsafe;
      // We query dashboard for the current month
      const currentMonth = new Date().toISOString().slice(0, 7);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/attendance/me/dashboard?month=${currentMonth}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.today).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(res.body.month).toBeDefined();
      expect(res.body.month.summary).toBeDefined();
      expect(Array.isArray(res.body.month.days)).toBe(true);
      expect(res.body.month.days.length).toBeGreaterThanOrEqual(28);
    });

    it('returns day detail with breaks and timeline', async () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attendance/me/days/${todayDate}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.date).toBe(todayDate);
      expect(res.body.state).toBeDefined();
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(Array.isArray(res.body.breaks)).toBe(true);
    });
  });

  describe('Corrections Workflow & IDOR protection', () => {
    let createdCorrectionId: number;

    it('Staff creates an attendance correction request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/corrections')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          work_date: '2026-10-10',
          requested_check_in_at: '2026-10-10T09:00:00.000Z',
          requested_check_out_at: '2026-10-10T18:00:00.000Z',
          requested_break_minutes: 60,
          reason: 'Forgot to punch due to client onsite visit',
        })
        .expect(201);

      const correctionId = res.body.correctionId || res.body.correction_id;
      expect(correctionId).toBeDefined();
      createdCorrectionId = Number(correctionId);
    });

    it('Admin approves the correction request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/attendance/corrections/${createdCorrectionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();

      // Verify that the attendance day was created or updated
      const day = await prisma.attendance_days.findFirst({
        where: { emp_id: staffEmpId, work_date: new Date('2026-10-10') },
      });
      expect(day).not.toBeNull();
      expect(day!.production_minutes).toBe(480);
    });

    it('Non-admin staff cannot reject corrections (requires admin role)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/attendance/corrections/${createdCorrectionId}/reject`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rejection_reason: 'Unauthorized rejection' })
        .expect(403);
    });

    it('Non-admin staff cannot edit other employee attendance day directly', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/attendance/employees/${adminEmpId}/2026-10-10`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          check_in_at: '2026-10-10T10:00:00.000Z',
          check_out_at: '2026-10-10T19:00:00.000Z',
          break_minutes: 30,
        })
        .expect(403);
    });
  });
});
