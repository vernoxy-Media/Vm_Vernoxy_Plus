import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as argon2 from 'argon2';

import { assertTestEnvironment } from '../apps/api/src/core/utils/env-guard';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

export async function setupPlaywrightUser(customPassword?: string) {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) throw new Error('DIRECT_URL is required');

  const client = new Client({ connectionString: directUrl });
  await client.connect();

  try {
    await assertTestEnvironment(client);
    const email = 'playwright_test@vernoxy.com';
    const password = customPassword || 'PlaywrightP@ssw0rd123!';
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    // Check if role and department exist
    const roleRes = await client.query(`SELECT role_id FROM roles WHERE role_name = 'Admin' AND deleted_at IS NULL LIMIT 1;`);
    const depRes = await client.query(`SELECT dep_id FROM departments WHERE deleted_at IS NULL LIMIT 1;`);

    const roleId = roleRes.rows[0]?.role_id || 1;
    const depId = depRes.rows[0]?.dep_id || 1;

    // Check if employee exists
    const empRes = await client.query(`SELECT emp_id FROM employees WHERE email = $1 AND deleted_at IS NULL ORDER BY emp_id DESC LIMIT 1;`, [email]);

    let empId: number;
    if (empRes.rows.length > 0) {
      empId = empRes.rows[0].emp_id;
      // Update employee status to Active
      await client.query(`UPDATE employees SET status = 'Active', name = 'Playwright Tester' WHERE emp_id = $1;`, [empId]);
      // Update credentials
      await client.query(
        `UPDATE employee_credentials SET password_hash = $1, failed_attempts = 0, locked_until = NULL, must_change_password = false WHERE emp_id = $2;`,
        [passwordHash, empId],
      );
    } else {
      const insEmp = await client.query(
        `INSERT INTO employees (name, email, mob, status, role_id, dep_id, joining_date)
         VALUES ('Playwright Tester', $1, '9999988888', 'Active', $2, $3, '2026-01-01')
         RETURNING emp_id;`,
        [email, roleId, depId],
      );
      empId = insEmp.rows[0].emp_id;
      await client.query(
        `INSERT INTO employee_credentials (emp_id, password_hash, failed_attempts, must_change_password)
         VALUES ($1, $2, 0, false);`,
        [empId, passwordHash],
      );
    }

    // Clean up any stale sessions or open OTP codes for this user
    await client.query(
      `UPDATE auth_sessions SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE emp_id = $1 AND revoked_at IS NULL;`,
      [empId],
    );
    await client.query(`UPDATE otp_codes SET deleted_at = NOW(), deleted_by = $1 WHERE emp_id = $1 AND deleted_at IS NULL;`, [empId]);

    console.log(`[PlaywrightSetup] User ${email} configured successfully.`);
  } finally {
    await client.end();
  }
}

export async function setupNonAdminPlaywrightUser(customPassword?: string) {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) throw new Error('DIRECT_URL is required');

  const client = new Client({ connectionString: directUrl });
  await client.connect();

  try {
    await assertTestEnvironment(client);
    const email = 'playwright_nonadmin@vernoxy.com';
    const password = customPassword || 'PlaywrightP@ssw0rd123!';
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    // Check for a non-admin role
    const roleRes = await client.query(`SELECT role_id FROM roles WHERE is_admin = false AND deleted_at IS NULL LIMIT 1;`);
    const depRes = await client.query(`SELECT dep_id FROM departments WHERE deleted_at IS NULL LIMIT 1;`);

    const roleId = roleRes.rows[0]?.role_id || 16;
    const depId = depRes.rows[0]?.dep_id || 1;

    const empRes = await client.query(`SELECT emp_id FROM employees WHERE email = $1 AND deleted_at IS NULL ORDER BY emp_id DESC LIMIT 1;`, [email]);

    let empId: number;
    if (empRes.rows.length > 0) {
      empId = empRes.rows[0].emp_id;
      await client.query(`UPDATE employees SET status = 'Active', name = 'Playwright Non-Admin', role_id = $1 WHERE emp_id = $2;`, [roleId, empId]);
      await client.query(
        `UPDATE employee_credentials SET password_hash = $1, failed_attempts = 0, locked_until = NULL, must_change_password = false WHERE emp_id = $2;`,
        [passwordHash, empId],
      );
    } else {
      const insEmp = await client.query(
        `INSERT INTO employees (name, email, mob, status, role_id, dep_id, joining_date)
         VALUES ('Playwright Non-Admin', $1, '9999977777', 'Active', $2, $3, '2026-01-01')
         RETURNING emp_id;`,
        [email, roleId, depId],
      );
      empId = insEmp.rows[0].emp_id;
      await client.query(
        `INSERT INTO employee_credentials (emp_id, password_hash, failed_attempts, must_change_password)
         VALUES ($1, $2, 0, false);`,
        [empId, passwordHash],
      );
    }

    await client.query(
      `UPDATE auth_sessions SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE emp_id = $1 AND revoked_at IS NULL;`,
      [empId],
    );
    await client.query(`UPDATE otp_codes SET deleted_at = NOW(), deleted_by = $1 WHERE emp_id = $1 AND deleted_at IS NULL;`, [empId]);

    console.log(`[PlaywrightSetup] Non-admin user ${email} configured successfully.`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  setupPlaywrightUser()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
