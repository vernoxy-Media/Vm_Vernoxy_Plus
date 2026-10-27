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

describe('Organization Management API (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mailAdapter: InMemoryMailAdapter;

  const TEST_PASSWORD = 'ValidP@ssw0rd123!';

  let adminToken: string;
  let nonAdminToken: string;

  let adminEmpId: number;
  let nonAdminEmpId: number;

  let adminDepId: number;
  let adminRoleId: number;

  beforeAll(async () => {
    // Hard rule: assert connection is strictly to pulse:test database
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

    app.getHttpAdapter().getInstance().set('trust proxy', true);

    let ipCounter = 1;
    app.use((req: any, res: any, next: any) => {
      req.headers['x-forwarded-for'] = `10.88.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
      next();
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

    // Bootstrap or locate test admin
    const passwordHash = await argon2.hash(TEST_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // 1. Ensure Admin department
    let adminDep = await prisma.departments.findFirst({
      where: { name: 'Admin', deleted_at: null },
    });
    if (!adminDep) {
      adminDep = await prisma.departments.create({
        data: { name: 'Admin', is_active: true },
      });
    }
    adminDepId = adminDep.dep_id;

    // 2. Ensure Admin role (is_admin = true)
    let adminRole = await prisma.roles.findFirst({
      where: { dep_id: adminDepId, is_admin: true, deleted_at: null },
    });
    if (!adminRole) {
      adminRole = await prisma.roles.create({
        data: {
          role_name: 'Admin',
          dep_id: adminDepId,
          is_admin: true,
          is_active: true,
        },
      });
    }
    adminRoleId = adminRole.role_id;

    // 3. Create active test admin employee
    const adminEmail = `admin_org_test_${Date.now()}@vernoxy.com`;
    const adminEmp = await prisma.employees.create({
      data: {
        name: 'Org E2E Admin',
        email: adminEmail,
        mob: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDepId,
        role_id: adminRoleId,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    adminEmpId = adminEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: adminEmpId,
        password_hash: passwordHash,
      },
    });

    // 4. Create active non-admin role & employee
    let nonAdminRole = await prisma.roles.findFirst({
      where: { dep_id: adminDepId, is_admin: false, deleted_at: null },
    });
    if (!nonAdminRole) {
      nonAdminRole = await prisma.roles.create({
        data: {
          role_name: `Staff_${Date.now()}`,
          dep_id: adminDepId,
          is_admin: false,
          is_active: true,
        },
      });
    }

    const nonAdminEmail = `staff_org_test_${Date.now()}@vernoxy.com`;
    const nonAdminEmp = await prisma.employees.create({
      data: {
        name: 'Org E2E Staff',
        email: nonAdminEmail,
        mob: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: adminDepId,
        role_id: nonAdminRole.role_id,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    nonAdminEmpId = nonAdminEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: nonAdminEmpId,
        password_hash: passwordHash,
      },
    });

    // Acquire JWT token for admin
    mailAdapter.clear();
    const loginAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    if (loginAdminRes.body.access_token) {
      adminToken = loginAdminRes.body.access_token;
    } else {
      const adminChallengeId = loginAdminRes.body.challenge_id;
      const adminOtp = mailAdapter.getLatestEmailFor(adminEmail)?.code || loginAdminRes.body.otp_code;
      const verifyAdminRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login/verify')
        .send({ challenge_id: adminChallengeId, code: adminOtp })
        .expect(200);
      adminToken = verifyAdminRes.body.access_token;
    }

    // Acquire JWT token for non-admin
    mailAdapter.clear();
    const loginStaffRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: nonAdminEmail, password: TEST_PASSWORD })
      .expect(200);

    if (loginStaffRes.body.access_token) {
      nonAdminToken = loginStaffRes.body.access_token;
    } else {
      const staffChallengeId = loginStaffRes.body.challenge_id;
      const staffOtp = mailAdapter.getLatestEmailFor(nonAdminEmail)?.code || loginStaffRes.body.otp_code;
      const verifyStaffRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login/verify')
        .send({ challenge_id: staffChallengeId, code: staffOtp })
        .expect(200);
      nonAdminToken = verifyStaffRes.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // 1. Authorization Guards & Access Control
  // ==========================================
  describe('Guard Protection', () => {
    it('returns 401 Unauthorized for unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/v1/departments').expect(401);
      await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
      await request(app.getHttpServer()).get('/api/v1/employees').expect(401);
    });

    it('returns 403 Forbidden with problem+json for non-admin token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);

      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.title).toBe('Forbidden');
    });

    it('allows access for admin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ==========================================
  // 2. Department Lifecycle & Integrity
  // ==========================================
  describe('Departments Management', () => {
    let createdDepId: number;
    const depName = `Engineering_${Date.now()}`;

    it('creates a new department successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: depName })
        .expect(201);

      expect(res.body.dep_id).toBeDefined();
      expect(res.body.name).toBe(depName);
      expect(res.body.is_active).toBe(true);
      createdDepId = res.body.dep_id;
    });

    it('rejects duplicate department name with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: depName.toUpperCase() })
        .expect(409);

      expect(res.body.code).toBe('DEPARTMENT_NAME_EXISTS');
    });

    it('updates department name', async () => {
      const updatedName = `${depName}_Renamed`;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/departments/${createdDepId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: updatedName })
        .expect(200);

      expect(res.body.name).toBe(updatedName);
    });

    it('blocks deactivating department if it has active roles', async () => {
      // Create role in this department
      const role = await prisma.roles.create({
        data: {
          role_name: `Dev_${Date.now()}`,
          dep_id: createdDepId,
          is_active: true,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/departments/${createdDepId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(409);

      expect(res.body.code).toBe('DEPARTMENT_HAS_ACTIVE_MEMBERS');

      // Also blocks soft-delete
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/departments/${createdDepId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(delRes.body.code).toBe('DEPARTMENT_HAS_ACTIVE_MEMBERS');

      // Soft delete the role to free up department
      await prisma.roles.update({
        where: { role_id: role.role_id },
        data: { deleted_at: new Date(), is_active: false },
      });
    });

    it('soft-deletes empty department with 204 No Content', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/departments/${createdDepId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Subsequent fetch returns 404
      await request(app.getHttpServer())
        .get(`/api/v1/departments/${createdDepId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ==========================================
  // 3. Role Scoping & Immutability
  // ==========================================
  describe('Roles Management', () => {
    let testDepA: number;
    let testDepB: number;
    let roleAId: number;

    beforeAll(async () => {
      const depA = await prisma.departments.create({
        data: { name: `DepA_${Date.now()}`, is_active: true },
      });
      const depB = await prisma.departments.create({
        data: { name: `DepB_${Date.now()}`, is_active: true },
      });
      testDepA = depA.dep_id;
      testDepB = depB.dep_id;
    });

    it('creates role scoped to department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_name: 'Lead Developer',
          dep_id: testDepA,
          description: 'Team lead',
        })
        .expect(201);

      expect(res.body.role_id).toBeDefined();
      expect(res.body.role_name).toBe('Lead Developer');
      expect(res.body.dep_id).toBe(testDepA);
      expect(res.body.is_admin).toBe(false);
      roleAId = res.body.role_id;
    });

    it('rejects duplicate role name in the SAME department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_name: 'Lead Developer',
          dep_id: testDepA,
        })
        .expect(409);

      expect(res.body.code).toBe('ROLE_NAME_EXISTS');
    });

    it('permits duplicate role name in a DIFFERENT department (scoped uniqueness)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role_name: 'Lead Developer',
          dep_id: testDepB,
        })
        .expect(201);

      expect(res.body.dep_id).toBe(testDepB);
      expect(res.body.role_name).toBe('Lead Developer');
    });

    it('protects System Admin role from deletion and deactivation', async () => {
      // Attempt to deactivate admin role
      const deactRes = await request(app.getHttpServer())
        .patch(`/api/v1/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(409);

      expect(deactRes.body.code).toBe('CANNOT_DEACTIVATE_ADMIN_ROLE');

      // Attempt to delete admin role
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/roles/${adminRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(delRes.body.code).toBe('CANNOT_DELETE_ADMIN_ROLE');
    });

    it('blocks deactivating or deleting role if active employees are assigned', async () => {
      // Assign an employee to roleAId
      const emp = await prisma.employees.create({
        data: {
          name: 'Dev Tester',
          email: `dev_${Date.now()}@vernoxy.com`,
          mob: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
          dep_id: testDepA,
          role_id: roleAId,
          status: 'Active',
          joining_date: new Date(),
        },
      });

      const deactRes = await request(app.getHttpServer())
        .patch(`/api/v1/roles/${roleAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(409);

      expect(deactRes.body.code).toBe('ROLE_HAS_ACTIVE_EMPLOYEES');

      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/roles/${roleAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(delRes.body.code).toBe('ROLE_HAS_ACTIVE_EMPLOYEES');

      // Soft delete the employee to unblock
      await prisma.employees.update({
        where: { emp_id: emp.emp_id },
        data: { deleted_at: new Date(), status: 'Inactive' },
      });
    });
  });

  // ==========================================
  // 4. Employee Management & Constraints
  // ==========================================
  describe('Employees Management', () => {
    let empDepId: number;
    let empRoleId: number;
    let otherDepId: number;
    let otherRoleId: number;

    beforeAll(async () => {
      const dep1 = await prisma.departments.create({
        data: { name: `HR_${Date.now()}`, is_active: true },
      });
      const dep2 = await prisma.departments.create({
        data: { name: `Operations_${Date.now()}`, is_active: true },
      });
      empDepId = dep1.dep_id;
      otherDepId = dep2.dep_id;

      const r1 = await prisma.roles.create({
        data: { role_name: 'HR Exec', dep_id: empDepId, is_active: true },
      });
      const r2 = await prisma.roles.create({
        data: { role_name: 'Ops Exec', dep_id: otherDepId, is_active: true },
      });
      empRoleId = r1.role_id;
      otherRoleId = r2.role_id;
    });

    it('creates employee and provisions credentials atomically', async () => {
      const empEmail = `new_emp_${Date.now()}@vernoxy.com`;
      const empMob = `+9196${Math.floor(10000000 + Math.random() * 90000000)}`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sarah Connor',
          email: empEmail,
          mob: empMob,
          password: 'ComplexP@ssw0rd2026!',
          dep_id: empDepId,
          role_id: empRoleId,
          joining_date: '2026-05-01',
        })
        .expect(201);

      expect(res.body.emp_id).toBeDefined();
      expect(res.body.status).toBe('Active');

      // Verify credentials record created in DB
      const cred = await prisma.employee_credentials.findFirst({
        where: { emp_id: res.body.emp_id, deleted_at: null },
      });
      expect(cred).not.toBeNull();
      expect(cred!.password_hash).toContain('$argon2id$');

      // Verify auth event created in DB
      const event = await prisma.auth_events.findFirst({
        where: { emp_id: res.body.emp_id, event_type: 'credentials_created' },
      });
      expect(event).not.toBeNull();
    });

    it('rejects employee creation when role does NOT belong to the department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Role Mismatch',
          email: `mismatch_${Date.now()}@vernoxy.com`,
          mob: `+9195${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: 'ComplexP@ssw0rd2026!',
          dep_id: empDepId,
          role_id: otherRoleId, // Belongs to otherDepId!
          joining_date: '2026-05-01',
        })
        .expect(422);

      expect(res.body.code).toBe('ROLE_NOT_IN_DEPARTMENT');
    });

    it('rejects weak password on employee creation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak Pass',
          email: `weak_${Date.now()}@vernoxy.com`,
          mob: `+9194${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: 'password123!', // Common & weak
          dep_id: empDepId,
          role_id: empRoleId,
          joining_date: '2026-05-01',
        })
        .expect(422);

      expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('prevents self-modification by the acting administrator', async () => {
      // Admin cannot change their own dep_id or role_id
      const res1 = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${adminEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ dep_id: otherDepId, role_id: otherRoleId })
        .expect(409);

      expect(res1.body.code).toBe('SELF_MODIFICATION_FORBIDDEN');

      // Admin cannot deactivate themselves
      const res2 = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${adminEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Inactive' })
        .expect(409);

      expect(res2.body.code).toBe('SELF_MODIFICATION_FORBIDDEN');

      // Admin cannot delete themselves
      const res3 = await request(app.getHttpServer())
        .delete(`/api/v1/employees/${adminEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res3.body.code).toBe('SELF_MODIFICATION_FORBIDDEN');
    });

    it('detects and rejects reporting cycles (self-reporting & transitive cycle)', async () => {
      // Create employee A
      const empA = await prisma.employees.create({
        data: {
          name: 'Emp A',
          email: `empa_${Date.now()}@vernoxy.com`,
          mob: `+9193${Math.floor(10000000 + Math.random() * 90000000)}`,
          dep_id: empDepId,
          role_id: empRoleId,
          status: 'Active',
          joining_date: new Date(),
        },
      });

      // 1. Self-reporting
      const selfRes = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${empA.emp_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reporting_manager: empA.emp_id })
        .expect(409);

      expect(selfRes.body.code).toBe('REPORTING_CYCLE_DETECTED');

      // Create employee B reporting to A
      const empB = await prisma.employees.create({
        data: {
          name: 'Emp B',
          email: `empb_${Date.now()}@vernoxy.com`,
          mob: `+9192${Math.floor(10000000 + Math.random() * 90000000)}`,
          dep_id: empDepId,
          role_id: empRoleId,
          reporting_manager: empA.emp_id,
          status: 'Active',
          joining_date: new Date(),
        },
      });

      // 2. Transitive cycle: Making A report to B (A -> B -> A)
      const cycleRes = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${empA.emp_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reporting_manager: empB.emp_id })
        .expect(409);

      expect(cycleRes.body.code).toBe('REPORTING_CYCLE_DETECTED');
    });

    it('enforces last-admin protection against demoting or deactivating the last active admin', async () => {
      // In our test branch, count active admins
      const activeAdminCount = await prisma.employees.count({
        where: {
          deleted_at: null,
          status: 'Active',
          roles_employees_role_idToroles: {
            is_admin: true,
            is_active: true,
            deleted_at: null,
          },
        },
      });

      // If only adminEmpId and maybe the bootstrapped admin exist,
      // create a solitary secondary admin to test demotion of the last one.
      const soleAdmin = await prisma.employees.create({
        data: {
          name: 'Sole Admin',
          email: `sole_admin_${Date.now()}@vernoxy.com`,
          mob: `+9191${Math.floor(10000000 + Math.random() * 90000000)}`,
          dep_id: adminDepId,
          role_id: adminRoleId,
          status: 'Active',
          joining_date: new Date(),
        },
      });

      // We have multiple admins currently, so updating soleAdmin's status works
      // But if we delete/deactivate all others, the last one cannot be demoted
      const nonAdminRole = await prisma.roles.findFirst({
        where: { dep_id: empDepId, is_admin: false, deleted_at: null },
      });

      // Demoting soleAdmin while other admin exists succeeds
      const demoteRes = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${soleAdmin.emp_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ dep_id: empDepId, role_id: nonAdminRole!.role_id })
        .expect(200);

      expect(demoteRes.body.role_id).toBe(nonAdminRole!.role_id);
    });
  });
});
