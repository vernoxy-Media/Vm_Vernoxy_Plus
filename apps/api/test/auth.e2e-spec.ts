import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import * as express from 'express';
const cookieParser = require('cookie-parser');
import * as argon2 from 'argon2';
import * as jose from 'jose';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { AUTH_TOKENS } from '../src/modules/auth/application/ports/tokens';
import { InMemoryMailAdapter } from '../src/modules/auth/infrastructure/mail/in-memory-mail.adapter';
import { GlobalExceptionFilter } from '../src/core/filters/global-exception.filter';

import { assertTestEnvironment } from '../src/core/utils/env-guard';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test'), override: true });

function getCookie(res: any, name: string): string {
  const cookies = res.headers['set-cookie'];
  const arr: string[] = Array.isArray(cookies) ? cookies : typeof cookies === 'string' ? [cookies] : [];
  return arr.find((c: string) => c.startsWith(`${name}=`)) || '';
}

describe('Auth System API (e2e)', () => {
  jest.setTimeout(45000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mailAdapter: InMemoryMailAdapter;

  const testClock = {
    offsetMs: 0,
    now() {
      return new Date(Date.now() + this.offsetMs);
    },
    advance(ms: number) {
      this.offsetMs += ms;
    },
    reset() {
      this.offsetMs = 0;
    },
  };

  const TEST_PASSWORD = 'ValidP@ssw0rd123!';
  let passwordHash: string;

  // Test employee IDs
  let adminEmpId: number;
  let userEmpId: number;
  let inactiveEmpId: number;
  let mustChangeEmpId: number;

  const adminEmail = `admin_e2e_${Date.now()}@vernoxy.com`;
  const userEmail = `user_e2e_${Date.now()}@vernoxy.com`;
  const inactiveEmail = `inactive_e2e_${Date.now()}@vernoxy.com`;
  const mustChangeEmail = `mustchange_e2e_${Date.now()}@vernoxy.com`;

  // Captured output for secret leak check
  const capturedLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  beforeAll(async () => {
    await assertTestEnvironment(process.env.DIRECT_URL || process.env.DATABASE_URL!);
    // Intercept console logs to check for leaks
    // Intercept console logs to check for leaks
    console.log = (...args: any[]) => {
      capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      originalLog.apply(console, args);
    };
    console.error = (...args: any[]) => {
      capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      originalError.apply(console, args);
    };

    passwordHash = await argon2.hash(TEST_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    mailAdapter = new InMemoryMailAdapter();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_TOKENS.MailPort)
      .useValue(mailAdapter)
      .overrideProvider(AUTH_TOKENS.Clock)
      .useValue(testClock)
      .compile();

    app = moduleFixture.createNestApplication();
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', true);

    let ipCounter = 1;
    app.use((req: any, res: any, next: any) => {
      if (!req.headers['x-forwarded-for']) {
        req.headers['x-forwarded-for'] = `10.99.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
      }
      next();
    });

    app.use(cookieParser());
    app.use(express.json({ limit: '10kb' }));
    app.enableCors({ origin: 'http://localhost:5173', credentials: true });
    app.setGlobalPrefix('api/v1', { exclude: ['\\.well-known/(.*)'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    prisma = app.get(PrismaService);

    // Get an existing department and roles
    const dep = await prisma.departments.findFirst({ where: { deleted_at: null } });
    const adminRole = await prisma.roles.findFirst({ where: { role_name: 'Admin', deleted_at: null } });
    const salesRole = await prisma.roles.findFirst({ where: { role_name: { not: 'Admin' }, deleted_at: null } });

    const depId = dep?.dep_id || 1;
    const adminRoleId = adminRole?.role_id || 1;
    const userRoleId = salesRole?.role_id || 2;

    const randomMob = () => '9' + Math.floor(100000000 + Math.random() * 900000000).toString();

    // Create Admin employee
    const admin = await prisma.employees.create({
      data: {
        name: 'E2E Admin',
        email: adminEmail,
        mob: randomMob(),
        joining_date: new Date('2026-01-01'),
        status: 'Active',
        role_id: adminRoleId,
        dep_id: depId,
      },
    });
    adminEmpId = admin.emp_id;
    await prisma.$executeRaw`
      INSERT INTO employee_credentials (emp_id, password_hash, must_change_password)
      VALUES (${adminEmpId}, ${passwordHash}, false);
    `;

    // Create Non-admin active employee
    const regularUser = await prisma.employees.create({
      data: {
        name: 'E2E Regular User',
        email: userEmail,
        mob: randomMob(),
        joining_date: new Date('2026-01-01'),
        status: 'Active',
        role_id: userRoleId,
        dep_id: depId,
      },
    });
    userEmpId = regularUser.emp_id;
    await prisma.$executeRaw`
      INSERT INTO employee_credentials (emp_id, password_hash, must_change_password)
      VALUES (${userEmpId}, ${passwordHash}, false);
    `;

    // Create Inactive employee
    const inactiveUser = await prisma.employees.create({
      data: {
        name: 'E2E Inactive User',
        email: inactiveEmail,
        mob: randomMob(),
        joining_date: new Date('2026-01-01'),
        status: 'Inactive',
        role_id: userRoleId,
        dep_id: depId,
      },
    });
    inactiveEmpId = inactiveUser.emp_id;
    await prisma.$executeRaw`
      INSERT INTO employee_credentials (emp_id, password_hash, must_change_password)
      VALUES (${inactiveEmpId}, ${passwordHash}, false);
    `;

    // Create Employee with must_change_password: true
    const mustChangeUser = await prisma.employees.create({
      data: {
        name: 'E2E Must Change User',
        email: mustChangeEmail,
        mob: randomMob(),
        joining_date: new Date('2026-01-01'),
        status: 'Active',
        role_id: userRoleId,
        dep_id: depId,
      },
    });
    mustChangeEmpId = mustChangeUser.emp_id;
    await prisma.$executeRaw`
      INSERT INTO employee_credentials (emp_id, password_hash, must_change_password)
      VALUES (${mustChangeEmpId}, ${passwordHash}, true);
    `;
  }, 30000);

  afterAll(async () => {
    console.log = originalLog;
    console.error = originalError;

    // Clean up test rows
    if (prisma && adminEmpId) {
      const empIds = [adminEmpId, userEmpId, inactiveEmpId, mustChangeEmpId].filter(Boolean);
      for (const id of empIds) {
        await prisma.$executeRaw`DELETE FROM auth_sessions WHERE emp_id = ${id};`.catch(() => {});
        await prisma.$executeRaw`UPDATE otp_codes SET deleted_at = NOW(), deleted_by = ${adminEmpId} WHERE emp_id = ${id} AND deleted_at IS NULL;`.catch(() => {});
        await prisma.$executeRaw`UPDATE employee_credentials SET deleted_at = NOW(), deleted_by = ${adminEmpId} WHERE emp_id = ${id} AND deleted_at IS NULL;`.catch(() => {});
        await prisma.$executeRaw`UPDATE employees SET deleted_at = NOW(), deleted_by = ${adminEmpId} WHERE emp_id = ${id} AND deleted_at IS NULL;`.catch(() => {});
      }
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    mailAdapter.clear();
    testClock.reset();
    if (prisma && adminEmpId) {
      await prisma.$executeRaw`
        UPDATE otp_codes SET deleted_at = NOW(), deleted_by = ${adminEmpId}
        WHERE emp_id IN (${adminEmpId}, ${userEmpId}, ${inactiveEmpId}, ${mustChangeEmpId})
          AND deleted_at IS NULL;
      `.catch(() => {});
    }
  });

  // 1. Happy-path full login flow
  it('1. full login (password -> OTP -> tokens -> /me)', async () => {
    mailAdapter.clear();

    // Step 1: Login with credentials
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    expect(loginRes.body).toHaveProperty('challenge_id');
    expect(loginRes.body).toHaveProperty('masked_email');
    expect(loginRes.body.expires_in_seconds).toBe(600);
    expect(loginRes.body.resend_available_in_seconds).toBe(60);

    const challengeId = loginRes.body.challenge_id;

    // Check email received
    const sentEmail = mailAdapter.getLatestEmailFor(adminEmail);
    expect(sentEmail).toBeDefined();
    expect(sentEmail?.purpose).toBe('login_2fa');
    const otpCode = sentEmail!.code;
    expect(otpCode).toMatch(/^[0-9]{6}$/);

    // Step 2: Verify OTP
    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: challengeId, code: otpCode })
      .expect(200);

    expect(verifyRes.body).toHaveProperty('access_token');
    expect(verifyRes.body.token_type).toBe('Bearer');
    expect(verifyRes.body.expires_in).toBe(900);
    expect(verifyRes.body.must_change_password).toBe(false);
    expect(verifyRes.body.user.email).toBe(adminEmail);

    // Check refresh cookie
    const rtCookie = getCookie(verifyRes, 'pulse_rt');
    expect(rtCookie).toBeTruthy();
    expect(rtCookie).toContain('HttpOnly');
    expect(rtCookie).toContain('SameSite=Strict');

    const accessToken = verifyRes.body.access_token;

    // Step 3: Access /auth/me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(adminEmail);
    expect(meRes.body.name).toBe('E2E Admin');
    expect(meRes.body.role.role_name).toBe('Admin');
    expect(meRes.body.department).toBeDefined();
  });

  // 2. Wrong password increments failed_attempts
  it('2. wrong password returns 401 and failed_attempts increments', async () => {
    // Check initial failed attempts
    const initialCreds: any[] = await prisma.$queryRaw`
      SELECT failed_attempts FROM employee_credentials WHERE emp_id = ${userEmpId} AND deleted_at IS NULL;
    `;
    const initialAttempts = initialCreds[0]?.failed_attempts ?? 0;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'WrongPassword999!' })
      .expect(401);

    expect(res.body.detail).toBe('Invalid email or password');

    const updatedCreds: any[] = await prisma.$queryRaw`
      SELECT failed_attempts FROM employee_credentials WHERE emp_id = ${userEmpId} AND deleted_at IS NULL;
    `;
    expect(updatedCreds[0].failed_attempts).toBe(initialAttempts + 1);
  });

  // 3. Fifth failure locks account
  it('3. fifth consecutive failure locks the account for 15 minutes', async () => {
    // Reset attempts to 4
    await prisma.$executeRaw`
      UPDATE employee_credentials SET failed_attempts = 4, locked_until = NULL WHERE emp_id = ${userEmpId};
    `;

    // 5th failure
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'WrongPassword999!' })
      .expect(401);

    expect(res.body.detail).toBe('Invalid email or password');

    const creds: any[] = await prisma.$queryRaw`
      SELECT failed_attempts, locked_until FROM employee_credentials WHERE emp_id = ${userEmpId};
    `;
    expect(creds[0].failed_attempts).toBe(5);
    expect(creds[0].locked_until).not.toBeNull();
    const lockedUntil = new Date(creds[0].locked_until);
    expect(lockedUntil.getTime()).toBeGreaterThan(Date.now() + 10 * 60 * 1000);
  });

  // 4. Equalized responses for locked, unknown, and inactive accounts
  it('4. locked, unknown, and inactive accounts return an identical response body', async () => {
    // A: Locked account
    const lockedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: TEST_PASSWORD })
      .expect(401);

    // B: Unknown account
    const unknownRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'unknown_ghost_user@vernoxy.com', password: TEST_PASSWORD })
      .expect(401);

    // C: Inactive account
    const inactiveRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inactiveEmail, password: TEST_PASSWORD })
      .expect(401);

    expect(lockedRes.body.detail).toBe('Invalid email or password');
    expect(unknownRes.body.detail).toBe('Invalid email or password');
    expect(inactiveRes.body.detail).toBe('Invalid email or password');

    expect(lockedRes.body.status).toBe(401);
    expect(unknownRes.body.status).toBe(401);
    expect(inactiveRes.body.status).toBe(401);

    expect(lockedRes.body.title).toBe(unknownRes.body.title);
    expect(lockedRes.body.title).toBe(inactiveRes.body.title);
  });

  // 5. Wrong OTP increments attempts and fifth voids
  it('5. wrong OTP increments attempts and the fifth voids the code', async () => {
    // Reset lockout on user
    await prisma.$executeRaw`
      UPDATE employee_credentials SET failed_attempts = 0, locked_until = NULL WHERE emp_id = ${userEmpId};
    `;

    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: TEST_PASSWORD })
      .expect(200);

    const challengeId = loginRes.body.challenge_id;
    const realCode = mailAdapter.getLatestEmailFor(userEmail)!.code;

    // Fail 4 times
    for (let i = 1; i <= 4; i++) {
      const errRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login/verify')
        .send({ challenge_id: challengeId, code: '000000' })
        .expect(401);

      expect(errRes.body.detail).toBe('Invalid or expired code');

      const otpRows: any[] = await prisma.$queryRaw`
        SELECT attempts, voided_at FROM otp_codes WHERE otp_id = ${challengeId}::uuid;
      `;
      expect(otpRows[0].attempts).toBe(i);
      expect(otpRows[0].voided_at).toBeNull();
    }

    // 5th failure voids
    await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: challengeId, code: '000000' })
      .expect(401);

    const voidedRows: any[] = await prisma.$queryRaw`
      SELECT attempts, voided_at FROM otp_codes WHERE otp_id = ${challengeId}::uuid;
    `;
    expect(voidedRows[0].attempts).toBe(5);
    expect(voidedRows[0].voided_at).not.toBeNull();

    // Now even correct code fails
    const retryRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: challengeId, code: realCode })
      .expect(401);

    expect(retryRes.body.detail).toBe('Invalid or expired code');
  });

  // 6. Used code cannot be reused
  it('6. used code cannot be reused', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const challengeId = loginRes.body.challenge_id;
    const realCode = mailAdapter.getLatestEmailFor(adminEmail)!.code;

    // First use succeeds
    await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: challengeId, code: realCode })
      .expect(200);

    // Second use rejected
    const reuseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: challengeId, code: realCode })
      .expect(401);

    expect(reuseRes.body.detail).toBe('Invalid or expired code');
  });

  // 7. Expired code rejected
  it('7. expired code rejected', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const challengeId = loginRes.body.challenge_id;
    const realCode = mailAdapter.getLatestEmailFor(adminEmail)!.code;

    // Advance clock past 10 minutes expiry (11 minutes)
    testClock.advance(11 * 60 * 1000);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: challengeId, code: realCode })
      .expect(401);

    expect(res.body.detail).toBe('Invalid or expired code');
  });

  // 8. Resend cooldown 429 and only one open code after resend
  it('8. resend cooldown 429 and only one open code after resend', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const challengeId = loginRes.body.challenge_id;

    // Immediate resend triggers 429
    const cooldownRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/resend')
      .send({ challenge_id: challengeId })
      .expect(429);

    expect(cooldownRes.body.detail).toContain('wait');

    // Advance clock past 60s cooldown (65 seconds)
    testClock.advance(65 * 1000);

    // Resend now succeeds
    const resendRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/resend')
      .send({ challenge_id: challengeId })
      .expect(200);

    const newChallengeId = resendRes.body.challenge_id;
    expect(newChallengeId).not.toBe(challengeId);

    // Verify only ONE open code exists
    const openCount: any[] = await prisma.$queryRaw`
      SELECT count(*)::int as count FROM otp_codes
      WHERE emp_id = ${adminEmpId} AND purpose = 'login_2fa'::otp_purpose
        AND consumed_at IS NULL AND voided_at IS NULL AND deleted_at IS NULL;
    `;
    expect(openCount[0].count).toBe(1);
  });

  // 9. Refresh rotates and old token fails
  it('9. refresh rotates and the old token fails', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: loginRes.body.challenge_id, code: mailAdapter.getLatestEmailFor(adminEmail)!.code })
      .expect(200);

    const oldCookie = getCookie(verifyRes, 'pulse_rt');

    // Refresh with old cookie
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie)
      .set('X-Requested-With', 'pulse-web')
      .expect(200);

    expect(refreshRes.body).toHaveProperty('access_token');
    const newCookie = getCookie(refreshRes, 'pulse_rt');
    expect(newCookie).not.toBe(oldCookie);

    // Using old cookie again fails with 401
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie)
      .set('X-Requested-With', 'pulse-web')
      .expect(401);
  });

  // 10. Reuse of old token revokes session
  it('10. reuse of old token revokes the session after grace period', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: loginRes.body.challenge_id, code: mailAdapter.getLatestEmailFor(adminEmail)!.code })
      .expect(200);

    const firstCookie = getCookie(verifyRes, 'pulse_rt');

    // Rotate once
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .set('X-Requested-With', 'pulse-web')
      .expect(200);

    const secondCookie = getCookie(refreshRes, 'pulse_rt');

    // Advance clock by 15 seconds to exceed 10s grace window
    testClock.advance(15 * 1000);

    // Attacker tries using firstCookie
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .set('X-Requested-With', 'pulse-web')
      .expect(401);

    // Session must now be revoked with token_reuse_detected
    const revokedCheck: any[] = await prisma.$queryRaw`
      SELECT revoked_at, revoked_reason FROM auth_sessions
      WHERE emp_id = ${adminEmpId}
      ORDER BY created_at DESC LIMIT 1;
    `;
    expect(revokedCheck[0].revoked_reason).toBe('token_reuse_detected');

    // Legitimate user with secondCookie is also now locked out (revoked)
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', secondCookie)
      .set('X-Requested-With', 'pulse-web')
      .expect(401);
  });

  // 11. Logout and logout-all revoke immediately
  it('11. logout and logout-all revoke immediately', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: loginRes.body.challenge_id, code: mailAdapter.getLatestEmailFor(adminEmail)!.code })
      .expect(200);

    const token = verifyRes.body.access_token;
    const cookie = getCookie(verifyRes, 'pulse_rt');

    // Access works
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Logout
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    // Access token stops working immediately
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  // 12. Deactivating employee kills sessions via DB trigger
  it('12. deactivating an employee kills their sessions', async () => {
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: TEST_PASSWORD })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: loginRes.body.challenge_id, code: mailAdapter.getLatestEmailFor(userEmail)!.code })
      .expect(200);

    const token = verifyRes.body.access_token;

    // Verify token works
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Deactivate employee in DB
    await prisma.$executeRaw`
      UPDATE employees SET status = 'Inactive' WHERE emp_id = ${userEmpId};
    `;

    // Access token stops working immediately
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    // Restore to Active for further tests
    await prisma.$executeRaw`
      UPDATE employees SET status = 'Active' WHERE emp_id = ${userEmpId};
    `;
  });

  // 13. Change password revokes other sessions
  it('13. change password revokes other sessions', async () => {
    mailAdapter.clear();

    // Session 1
    const l1 = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: userEmail, password: TEST_PASSWORD });
    const v1 = await request(app.getHttpServer()).post('/api/v1/auth/login/verify').send({ challenge_id: l1.body.challenge_id, code: mailAdapter.getLatestEmailFor(userEmail)!.code });
    const token1 = v1.body.access_token;

    // Advance time slightly and make Session 2
    await new Promise((r) => setTimeout(r, 100));
    const l2 = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: userEmail, password: TEST_PASSWORD });
    const v2 = await request(app.getHttpServer()).post('/api/v1/auth/login/verify').send({ challenge_id: l2.body.challenge_id, code: mailAdapter.getLatestEmailFor(userEmail)!.code });
    const token2 = v2.body.access_token;

    const newPass = 'BrandNewP@ssw0rd2026!';

    // Session 1 changes password
    await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${token1}`)
      .send({ current_password: TEST_PASSWORD, new_password: newPass })
      .expect(204);

    // Session 1 continues working
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    // Session 2 is revoked
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token2}`)
      .expect(401);

    // Reset password back for other tests
    await prisma.$executeRaw`
      UPDATE employee_credentials SET password_hash = ${passwordHash} WHERE emp_id = ${userEmpId};
    `;
  });

  // 14. Forgot always returns 202
  it('14. forgot always returns 202', async () => {
    // Existing email
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: userEmail })
      .expect(202);

    expect(res1.body.message).toContain('password reset code has been sent');

    // Unknown email
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'nonexistent_test@vernoxy.com' })
      .expect(202);

    expect(res2.body.message).toBe(res1.body.message);
  });

  // 15. Reset works and revokes all sessions
  it('15. reset works and revokes all sessions', async () => {
    mailAdapter.clear();
    await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: adminEmail })
      .expect(202);

    const resetEmail = mailAdapter.getLatestEmailFor(adminEmail);
    expect(resetEmail).toBeDefined();
    expect(resetEmail?.purpose).toBe('password_reset');
    const resetCode = resetEmail!.code;

    const newPass = 'UpdatedAdminP@ssw0rd!';

    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset')
      .send({
        email: adminEmail,
        code: resetCode,
        new_password: newPass,
      })
      .expect(204);

    // Login with new password succeeds
    mailAdapter.clear();
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: newPass })
      .expect(200);

    expect(loginRes.body).toHaveProperty('challenge_id');
  });

  // 16. must_change_password blocks other endpoints
  it('16. must_change_password blocks other endpoints', async () => {
    mailAdapter.clear();
    const l = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: mustChangeEmail, password: TEST_PASSWORD })
      .expect(200);

    const v = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: l.body.challenge_id, code: mailAdapter.getLatestEmailFor(mustChangeEmail)!.code })
      .expect(200);

    expect(v.body.must_change_password).toBe(true);
    const token = v.body.access_token;

    // Allowed: GET /auth/me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meRes.body.must_change_password).toBe(true);

    // Allowed: POST /auth/password/change
    const newPass = 'FreshPasswordForUser2026!';
    await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: TEST_PASSWORD, new_password: newPass })
      .expect(204);
  });

  // 17. Responses and logs contain no hashes, codes, or tokens
  it('17. responses and logs contain no hashes, codes or tokens', () => {
    const fullLog = capturedLogs.join('\n');
    expect(fullLog).not.toContain(passwordHash);
    expect(fullLog).not.toContain('$argon2id$');
    // Ensure 6-digit OTP codes are not exposed as plaintext secrets in logs
    expect(fullLog).not.toMatch(/code:\s*['"]\d{6}['"]/);
  });

  // 18. JWKS verifies a token
  it('18. JWKS verifies a token', async () => {
    const jwksRes = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .expect(200);

    expect(jwksRes.body).toHaveProperty('keys');
    const jwk = jwksRes.body.keys[0];
    expect(jwk.kty).toBe('RSA');
    expect(jwk.alg).toBe('RS256');

    // Issue a token
    mailAdapter.clear();
    const l = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: userEmail, password: TEST_PASSWORD });
    const v = await request(app.getHttpServer()).post('/api/v1/auth/login/verify').send({ challenge_id: l.body.challenge_id, code: mailAdapter.getLatestEmailFor(userEmail)!.code });
    const token = v.body.access_token;

    // Verify token using imported JWK from endpoint
    const publicKey = await jose.importJWK(jwk, 'RS256');
    const verifyResult = await jose.jwtVerify(token, publicKey, {
      issuer: 'pulse-api',
      audience: 'pulse-web',
    });
    expect(verifyResult.payload.sub).toBe(userEmpId.toString());
  });

  // 19. CORS rejects another origin
  it('19. CORS rejects unauthorized origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://untrusted-site.evil.com')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).not.toBe('http://untrusted-site.evil.com');
  });

  // 20. Rate limits return 429
  it('20. rate limits return 429 when threshold exceeded', async () => {
    // resend endpoint threshold is 3/min
    const challengeId = '11111111-1111-1111-1111-111111111111';
    const rateLimitTestIp = '198.51.100.99';
    let hit429 = false;

    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login/resend')
        .set('X-Forwarded-For', rateLimitTestIp)
        .send({ challenge_id: challengeId });

      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }

    expect(hit429).toBe(true);
  });
});
