import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
const cookieParser = require('cookie-parser');
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import sharp from 'sharp';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { AUTH_TOKENS } from '../src/modules/auth/application/ports/tokens';
import { InMemoryMailAdapter } from '../src/modules/auth/infrastructure/mail/in-memory-mail.adapter';
import { GlobalExceptionFilter } from '../src/core/filters/global-exception.filter';
import { assertTestEnvironment } from '../src/core/utils/env-guard';
import { LocalDiskStorageAdapter } from '../src/modules/storage/infrastructure/local-disk-storage.adapter';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test'), override: true });

describe('Employee Photo Management API (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mailAdapter: InMemoryMailAdapter;
  let tempStorageDir: string;

  const TEST_PASSWORD = 'ValidP@ssw0rd123!';
  let adminToken: string;
  let nonAdminToken: string;
  let adminEmpId: number;
  let nonAdminEmpId: number;
  let testTargetEmpId: number;
  let validPngBuffer: Buffer;
  let validJpegBuffer: Buffer;

  beforeAll(async () => {
    await assertTestEnvironment(process.env.DATABASE_URL!);

    // Dedicated TEMP storage folder
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-e2e-storage-'));
    process.env.STORAGE_LOCAL_DIR = tempStorageDir;
    if (!process.env.FILE_URL_SECRET || process.env.FILE_URL_SECRET.length < 32) {
      process.env.FILE_URL_SECRET = 'test_secret_for_signing_files_min_32_characters!';
    }

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

    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);

    // Pre-generate image fixtures
    validPngBuffer = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 120, b: 230 } },
    })
      .png()
      .toBuffer();

    validJpegBuffer = await sharp({
      create: { width: 300, height: 150, channels: 3, background: { r: 240, g: 80, b: 20 } },
    })
      .jpeg()
      .toBuffer();

    // Create test admin and non-admin employees in DB
    const department = await prisma.departments.create({
      data: {
        name: `Photo Dept ${Date.now()}`,
        is_active: true,
      },
    });

    const adminRole = await prisma.roles.create({
      data: {
        role_name: `Photo Admin Role ${Date.now()}`,
        dep_id: department.dep_id,
        is_admin: true,
        is_active: true,
      },
    });

    const nonAdminRole = await prisma.roles.create({
      data: {
        role_name: `Photo NonAdmin Role ${Date.now()}`,
        dep_id: department.dep_id,
        is_admin: false,
        is_active: true,
      },
    });

    const pwdHash = await argon2.hash(TEST_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const adminEmp = await prisma.employees.create({
      data: {
        name: 'Photo E2E Admin',
        email: `photo_admin_${Date.now()}@vernoxy.com`,
        mob: `+9181${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: department.dep_id,
        role_id: adminRole.role_id,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    adminEmpId = adminEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: adminEmpId,
        password_hash: pwdHash,
      },
    });

    const nonAdminEmp = await prisma.employees.create({
      data: {
        name: 'Photo E2E NonAdmin',
        email: `photo_user_${Date.now()}@vernoxy.com`,
        mob: `+9182${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: department.dep_id,
        role_id: nonAdminRole.role_id,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    nonAdminEmpId = nonAdminEmp.emp_id;

    await prisma.employee_credentials.create({
      data: {
        emp_id: nonAdminEmpId,
        password_hash: pwdHash,
      },
    });

    const targetEmp = await prisma.employees.create({
      data: {
        name: 'Photo E2E Target',
        email: `photo_target_${Date.now()}@vernoxy.com`,
        mob: `+9183${Math.floor(10000000 + Math.random() * 90000000)}`,
        dep_id: department.dep_id,
        role_id: nonAdminRole.role_id,
        status: 'Active',
        joining_date: new Date('2026-01-01'),
      },
    });
    testTargetEmpId = targetEmp.emp_id;

    // Login admin
    mailAdapter.clear();
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmp.email, password: TEST_PASSWORD })
      .expect(200);
    const adminChallengeId = adminLoginRes.body.challenge_id;
    const adminOtp = mailAdapter.getLatestEmailFor(adminEmp.email)!.code;
    const adminVerifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: adminChallengeId, code: adminOtp })
      .expect(200);
    adminToken = adminVerifyRes.body.access_token;

    // Login non-admin
    mailAdapter.clear();
    const nonAdminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: nonAdminEmp.email, password: TEST_PASSWORD })
      .expect(200);
    const nonAdminChallengeId = nonAdminLoginRes.body.challenge_id;
    const nonAdminOtp = mailAdapter.getLatestEmailFor(nonAdminEmp.email)!.code;
    const nonAdminVerifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login/verify')
      .send({ challenge_id: nonAdminChallengeId, code: nonAdminOtp })
      .expect(200);
    nonAdminToken = nonAdminVerifyRes.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    try {
      if (tempStorageDir && fs.existsSync(tempStorageDir)) {
        fs.rmSync(tempStorageDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('Authorization Checks', () => {
    it('rejects PUT /employees/:id/photo without token (401)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .attach('file', validPngBuffer, 'avatar.png')
        .expect(401);
    });

    it('rejects DELETE /employees/:id/photo without token (401)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testTargetEmpId}/photo`)
        .expect(401);
    });

    it('rejects PUT /employees/:id/photo for non-admin on employee (403)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .attach('file', validPngBuffer, 'avatar.png')
        .expect(403);
    });

    it('rejects DELETE /employees/:id/photo for non-admin (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });
  });

  describe('Upload, Serve, and Replace Flow', () => {
    let signedPhotoUrl: string;
    let initialArchiveCount = 0;

    const getArchiveFileCount = (): number => {
      const archiveDir = path.join(tempStorageDir, 'archive/profile-photos');
      if (!fs.existsSync(archiveDir)) return 0;
      return fs.readdirSync(archiveDir).length;
    };

    it('allows admin to upload PNG photo and returns employee with signed URL', async () => {
      initialArchiveCount = getArchiveFileCount();

      const res = await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validPngBuffer, 'profile.png')
        .expect(200);

      expect(res.body.emp_id).toBe(testTargetEmpId);
      expect(res.body.profile_picture_url).toBeDefined();
      expect(typeof res.body.profile_picture_url).toBe('string');
      expect(res.body.profile_picture_url).toMatch(/^\/api\/v1\/files\/profile-photos\/[a-f0-9]{32}\.webp\?exp=\d+&sig=[a-f0-9]{64}$/);

      // Verify no secrets or raw filesystem paths in response
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(process.env.FILE_URL_SECRET);
      expect(bodyStr).not.toContain(tempStorageDir);
      expect(res.body).not.toHaveProperty('profile_picture'); // raw key must never be exposed

      signedPhotoUrl = res.body.profile_picture_url;
    });

    it('public signed URL serves photo with 200, WebP format, and all security headers', async () => {
      const res = await request(app.getHttpServer())
        .get(signedPhotoUrl)
        .buffer(true)
        .parse((response: any, callback: any) => {
          response.setEncoding('binary');
          let data = '';
          response.on('data', (chunk: string) => {
            data += chunk;
          });
          response.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        })
        .expect(200);

      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-disposition']).toBe('inline');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'");
      expect(res.headers['cache-control']).toBe('private, max-age=300');
      expect(res.headers['cross-origin-resource-policy']).toBe('same-site');

      // Verify image dimensions are 512x512
      const meta = await sharp(res.body).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(512);
      expect(meta.height).toBe(512);
    });

    it('rejects tampered signature with 403 problem+json', async () => {
      const tamperedUrl = signedPhotoUrl.replace(/sig=[a-f0-9]{64}/, 'sig=ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const res = await request(app.getHttpServer())
        .get(tamperedUrl)
        .expect(403);

      expect(res.body.title).toBe('Forbidden');
    });

    it('rejects expired signature with 403 problem+json', async () => {
      const expiredUrl = signedPhotoUrl.replace(/exp=\d+/, 'exp=1000000000');
      const res = await request(app.getHttpServer())
        .get(expiredUrl)
        .expect(403);

      expect(res.body.title).toBe('Forbidden');
    });

    it('rejects unknown key with valid format and signature with 403 (no hints)', async () => {
      const randomKey = '00000000000000000000000000000000.webp';
      const exp = Math.floor(Date.now() / 1000) + 300;
      const sig = crypto
        .createHmac('sha256', process.env.FILE_URL_SECRET!)
        .update(`${randomKey}:${exp}`)
        .digest('hex');

      const res = await request(app.getHttpServer())
        .get(`/api/v1/files/profile-photos/${randomKey}?exp=${exp}&sig=${sig}`)
        .expect(403);

      expect(res.body.title).toBe('Forbidden');
    });

    it('replacing photo with JPEG archives old file and previous URL no longer resolves', async () => {
      const beforeReplaceArchiveCount = getArchiveFileCount();

      const replaceRes = await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validJpegBuffer, 'new_profile.jpg')
        .expect(200);

      expect(replaceRes.body.profile_picture_url).not.toBe(signedPhotoUrl);

      // Old signed URL should now 403 because file was moved to archive
      await request(app.getHttpServer())
        .get(signedPhotoUrl)
        .expect(403);

      // New signed URL serves cleanly
      await request(app.getHttpServer())
        .get(replaceRes.body.profile_picture_url)
        .expect(200);

      // Verify archive grew
      const afterReplaceArchiveCount = getArchiveFileCount();
      expect(afterReplaceArchiveCount).toBe(beforeReplaceArchiveCount + 1);

      signedPhotoUrl = replaceRes.body.profile_picture_url;
    });

    it('DELETE /employees/:id/photo sets profile_picture null, archives photo, returns 204', async () => {
      const beforeDeleteArchiveCount = getArchiveFileCount();

      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Check DB is updated
      const empInDb = await prisma.employees.findUnique({
        where: { emp_id: testTargetEmpId },
      });
      expect(empInDb?.profile_picture).toBeNull();

      // Old signed URL no longer resolves
      await request(app.getHttpServer())
        .get(signedPhotoUrl)
        .expect(403);

      // Archive grew again
      const afterDeleteArchiveCount = getArchiveFileCount();
      expect(afterDeleteArchiveCount).toBe(beforeDeleteArchiveCount + 1);
    });

    it('admin can update photo on themselves', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/employees/${adminEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validPngBuffer, 'self.png')
        .expect(200);

      expect(res.body.emp_id).toBe(adminEmpId);
      expect(res.body.profile_picture_url).toBeDefined();

      // GET /auth/me should also include freshly signed profile_picture_url
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(meRes.body.profile_picture_url).toBeDefined();
      expect(meRes.body.profile_picture_url).toMatch(/^\/api\/v1\/files\/profile-photos\//);
    });
  });

  describe('Security and Validation Edge Cases', () => {
    it('rejects file larger than 5 MB with 413 Payload Too Large', async () => {
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
      // Valid JPEG header on huge buffer
      bigBuffer[0] = 0xff;
      bigBuffer[1] = 0xd8;
      bigBuffer[2] = 0xff;

      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', '10.1.1.1')
        .attach('file', bigBuffer, 'huge.jpg')
        .expect(413);
    });

    it('rejects SVG file with 415 Unsupported Media Type', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', '10.1.1.2')
        .attach('file', svgBuffer, 'vector.svg')
        .expect(415);
    });

    it('rejects GIF file with 415 Unsupported Media Type', async () => {
      const gifBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00');
      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', '10.1.1.3')
        .attach('file', gifBuffer, 'image.gif')
        .expect(415);
    });

    it('rejects PDF file with 415 Unsupported Media Type', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', '10.1.1.4')
        .attach('file', pdfBuffer, 'document.pdf')
        .expect(415);
    });

    it('rejects upload with wrong multipart field name (400)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', '10.1.1.5')
        .attach('wrong_field', validPngBuffer, 'photo.png')
        .expect(400);
    });

    it('returns 404 if employee is soft deleted', async () => {
      // Soft delete testTargetEmpId
      await prisma.employees.update({
        where: { emp_id: testTargetEmpId },
        data: { deleted_at: new Date(), deleted_by: adminEmpId },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', '10.1.1.6')
        .attach('file', validPngBuffer, 'photo.png')
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testTargetEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('enforces rate limit of 10 requests per minute per IP on photo upload', async () => {
      const ip = '10.200.200.200';
      const dummyBuffer = Buffer.from('fast-rate-limit-test');
      // First 10 requests consume rate limit tokens (rejected with 415 before image processing)
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .put(`/api/v1/employees/${adminEmpId}/photo`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Forwarded-For', ip)
          .attach('file', dummyBuffer, 'photo.txt');
      }

      // 11th request from same IP is throttled with 429
      const throttledRes = await request(app.getHttpServer())
        .put(`/api/v1/employees/${adminEmpId}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', ip)
        .attach('file', dummyBuffer, 'photo.txt');

      expect(throttledRes.status).toBe(429);
    });

    it('fails startup cleanly when storage folder is not writable or secret is missing', () => {
      const adapter = new LocalDiskStorageAdapter();
      // Test missing secret
      const originalSecret = process.env.FILE_URL_SECRET;
      delete process.env.FILE_URL_SECRET;
      expect(() => new LocalDiskStorageAdapter().ensureDirectoriesWritable()).toThrow(
        /Startup failure: FILE_URL_SECRET is missing or less than 32 characters/,
      );
      process.env.FILE_URL_SECRET = originalSecret;
    });
  });
});
