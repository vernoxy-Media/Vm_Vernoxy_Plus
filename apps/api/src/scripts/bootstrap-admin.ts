import { Client } from 'pg';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { Argon2PasswordHasher } from '../modules/auth/infrastructure/security/argon2-password-hasher';

dotenv.config();

function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function getHiddenPassword(promptText: string): Promise<string> {
  if (process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    return process.env.BOOTSTRAP_ADMIN_PASSWORD;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Interactive hidden password prompt requires a TTY. Set BOOTSTRAP_ADMIN_PASSWORD for non-interactive/CI environments.');
  }

  process.stdout.write(promptText);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');

    let input = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (char === '\u0003') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.exit(1);
      } else if (char === '\b' || char === '\x7f') {
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
      } else {
        input += char;
      }
    };
    stdin.on('data', onData);
  });
}

export async function bootstrapAdmin(): Promise<void> {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    throw new Error('DIRECT_URL or DATABASE_URL must be defined to run bootstrap:admin.');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let name = process.env.BOOTSTRAP_ADMIN_NAME;
    if (!name && process.stdin.isTTY) {
      name = await askQuestion(rl, 'Enter Admin Name: ');
    }
    if (!name) {
      throw new Error('BOOTSTRAP_ADMIN_NAME must be specified.');
    }

    let email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    if (!email && process.stdin.isTTY) {
      email = await askQuestion(rl, 'Enter Admin Email: ');
    }
    if (!email) {
      throw new Error('BOOTSTRAP_ADMIN_EMAIL must be specified.');
    }

    let mobile = process.env.BOOTSTRAP_ADMIN_MOBILE;
    if (!mobile && process.stdin.isTTY) {
      mobile = await askQuestion(rl, 'Enter Admin Mobile (+91...): ');
    }
    if (!mobile) {
      throw new Error('BOOTSTRAP_ADMIN_MOBILE must be specified.');
    }

    rl.close();

    const password = await getHiddenPassword('Enter Admin Password (hidden, min 12 chars): ');
    if (!password || password.length < 12) {
      throw new Error('Admin password must be at least 12 characters long.');
    }

    if (password.trim().toLowerCase() === name.trim().toLowerCase()) {
      throw new Error('Admin password cannot be identical to the admin name.');
    }

    if (password.trim().toLowerCase() === email.trim().toLowerCase()) {
      throw new Error('Admin password cannot be identical to the admin email.');
    }

    const client = new Client({ connectionString: directUrl });
    await client.connect();

    try {
      // Check environment marker
      const markerRes = await client.query(
        "SELECT shobj_description(oid, 'pg_database') AS environment FROM pg_database WHERE datname = current_database();"
      );
      const envMarker = markerRes.rows[0]?.environment ?? null;
      console.log(`[INFO] Database environment marker found: '${envMarker ?? 'none'}'`);

      const allowTest = process.argv.includes('--allow-test');
      if (envMarker === 'pulse:test' && !allowTest) {
        console.error(
          "[REFUSED] Refusing to bootstrap on test database ('pulse:test') without explicit --allow-test flag."
        );
        process.exit(1);
      }

      // Hash password with argon2id
      const hasher = new Argon2PasswordHasher();
      const passwordHash = await hasher.hash(password);

      // In ONE atomic transaction: create department (if missing), role (if missing), employee, credentials, event
      await client.query('BEGIN');

      // 1. Check if active Admin employee already exists
      const existingAdminRes = await client.query(
        `SELECT e.emp_id, e.name, e.email 
         FROM employees e
         JOIN roles r ON e.role_id = r.role_id AND e.dep_id = r.dep_id
         WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL 
         LIMIT 1`
      );
      if (existingAdminRes.rows.length > 0) {
        await client.query('ROLLBACK');
        console.log(`[INFO] Active Admin employee already exists (${existingAdminRes.rows[0].email}). No bootstrap needed.`);
        return;
      }

      // 2. Department 'Admin' (create if missing)
      let adminDepId: number;
      const depRes = await client.query(
        "SELECT dep_id FROM departments WHERE lower(name) = 'admin' AND deleted_at IS NULL LIMIT 1"
      );
      if (depRes.rows.length > 0) {
        adminDepId = depRes.rows[0].dep_id;
      } else {
        const newDepRes = await client.query(
          "INSERT INTO departments (name, is_active) VALUES ('Admin', true) RETURNING dep_id"
        );
        adminDepId = newDepRes.rows[0].dep_id;
      }

      // 3. Role 'Admin' in 'Admin' department with is_admin = true (create if missing)
      let adminRoleId: number;
      const roleRes = await client.query(
        "SELECT role_id FROM roles WHERE dep_id = $1 AND lower(role_name) = 'admin' AND deleted_at IS NULL LIMIT 1",
        [adminDepId]
      );
      if (roleRes.rows.length > 0) {
        adminRoleId = roleRes.rows[0].role_id;
      } else {
        const newRoleRes = await client.query(
          `INSERT INTO roles (role_name, dep_id, description, is_active, is_admin)
           VALUES ('Admin', $1, 'System Administrator', true, true)
           RETURNING role_id`,
          [adminDepId]
        );
        adminRoleId = newRoleRes.rows[0].role_id;
      }

      // 4. Insert admin employee
      const empRes = await client.query(
        `INSERT INTO employees (name, email, mob, dep_id, role_id, status, joining_date, created_by)
         VALUES ($1, $2, $3, $4, $5, 'Active', CURRENT_DATE, NULL)
         RETURNING emp_id`,
        [name, email.toLowerCase(), mobile, adminDepId, adminRoleId]
      );
      const newEmpId = empRes.rows[0].emp_id;

      // 5. Insert credentials
      await client.query(
        `INSERT INTO employee_credentials (emp_id, password_hash, created_by)
         VALUES ($1, $2, NULL)`,
        [newEmpId, passwordHash]
      );

      // 6. Insert credentials_created auth_event
      await client.query(
        `INSERT INTO auth_events (emp_id, actor_emp_id, event_type, details)
         VALUES ($1, NULL, 'credentials_created', $2)`,
        [newEmpId, JSON.stringify({ source: 'bootstrap' })]
      );

      await client.query('COMMIT');
      console.log(`[SUCCESS] Admin bootstrap completed successfully for employee ID: ${newEmpId} (${email}).`);

    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      await client.end();
    }

  } finally {
    rl.close();
  }
}

if (require.main === module) {
  bootstrapAdmin().catch((err) => {
    console.error('[ERROR] Bootstrap failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
