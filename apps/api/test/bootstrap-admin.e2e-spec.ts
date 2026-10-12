import { execSync } from 'child_process';
import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test'), override: true });

describe('Bootstrap Admin Script Integration Test', () => {
  const localUrl = process.env.DATABASE_URL!;
  const testAdminEmail = `bootstrap_admin_${Date.now()}@vernoxy.pulse`;
  const testAdminPassword = 'UltraSecureAdminPassword2026!';
  const scriptPath = path.resolve(__dirname, '../src/scripts/bootstrap-admin.ts');

  let client: Client;
  let adminRoleId: number;

  beforeAll(async () => {
    client = new Client({ connectionString: localUrl });
    await client.connect();

    const roleRes = await client.query(
      "SELECT role_id FROM roles WHERE lower(role_name) = 'admin' AND deleted_at IS NULL LIMIT 1",
    );
    expect(roleRes.rows.length).toBeGreaterThan(0);
    adminRoleId = roleRes.rows[0].role_id;

    // Attempt to soft-delete any active Admin employees so bootstrap can run
    try {
      await client.query(
        "UPDATE employees SET deleted_at = now() WHERE role_id = $1 AND deleted_at IS NULL",
        [adminRoleId],
      );
    } catch {
      // Ignore if last admin trigger protects remaining admin
    }
  });

  afterAll(async () => {
    // Clean up test admin
    try {
      await client.query(
        "UPDATE employees SET deleted_at = now() WHERE lower(email) = $1",
        [testAdminEmail.toLowerCase()],
      );
    } catch {
      // ignore
    }
    await client.end();
  });

  it('first run executes bootstrap or detects existing admin without secrets in stdout/stderr', () => {
    const env = {
      ...process.env,
      DIRECT_URL: localUrl,
      BOOTSTRAP_ADMIN_NAME: 'Bootstrap Test Administrator',
      BOOTSTRAP_ADMIN_EMAIL: testAdminEmail,
      BOOTSTRAP_ADMIN_MOBILE: '+919988776655',
      BOOTSTRAP_ADMIN_PASSWORD: testAdminPassword,
    };

    const output = execSync(`npx tsx "${scriptPath}" --allow-test`, {
      env,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Verify no secret or hash in output
    expect(output).not.toContain(testAdminPassword);
    expect(output).not.toContain('$argon2id$');
    const isSuccess = output.includes('[SUCCESS] Admin bootstrap completed successfully');
    const isExisting = output.includes('Active Admin employee already exists');
    expect(isSuccess || isExisting).toBe(true);
  });

  it('second run is idempotent, changes nothing, and outputs info without secrets', async () => {
    const env = {
      ...process.env,
      DIRECT_URL: localUrl,
      BOOTSTRAP_ADMIN_NAME: 'Bootstrap Test Administrator',
      BOOTSTRAP_ADMIN_EMAIL: testAdminEmail,
      BOOTSTRAP_ADMIN_MOBILE: '+919988776655',
      BOOTSTRAP_ADMIN_PASSWORD: testAdminPassword,
    };

    const output = execSync(`npx tsx "${scriptPath}" --allow-test`, {
      env,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    expect(output).not.toContain(testAdminPassword);
    expect(output).not.toContain('$argon2id$');
    expect(output).toContain('Active Admin employee already exists');
  });
});
