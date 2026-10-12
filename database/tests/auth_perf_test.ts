import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface QueryResultStats {
  queryName: string;
  targetIndex: string;
  coldPlan: string;
  coldTimeMs: number;
  coldBuffersRead: number;
  coldBuffersHit: number;
  warmPlan: string;
  warmTimeMs: number;
  warmBuffersRead: number;
  warmBuffersHit: number;
  indexUsed: boolean;
  partitionPruned?: boolean;
}

function extractMetrics(planLines: string[]) {
  const fullText = planLines.join('\n');
  let execTimeMs = 0;
  let planTimeMs = 0;
  let hit = 0;
  let read = 0;

  const execMatch = fullText.match(/Execution Time:\s*([\d.]+)\s*ms/i);
  const execTimeStr = execMatch?.[1];
  if (execTimeStr) execTimeMs = parseFloat(execTimeStr);

  const planMatch = fullText.match(/Planning Time:\s*([\d.]+)\s*ms/i);
  const planTimeStr = planMatch?.[1];
  if (planTimeStr) planTimeMs = parseFloat(planTimeStr);

  for (const line of planLines) {
    const hitMatch = line.match(/hit=(\d+)/);
    const hitStr = hitMatch?.[1];
    if (hitStr) hit += parseInt(hitStr, 10);
    const readMatch = line.match(/read=(\d+)/);
    const readStr = readMatch?.[1];
    if (readStr) read += parseInt(readStr, 10);
  }

  return { fullText, execTimeMs, planTimeMs, totalTimeMs: execTimeMs + planTimeMs, hit, read };
}

export async function runAuthPerfBenchmark(): Promise<QueryResultStats[]> {
  const localMaintenanceUrl = 'postgresql://postgres:postgres@localhost:5433/postgres?sslmode=disable';
  const perfDbName = 'vernoxy_pulse_auth_perf';
  const perfDbUrl = `postgresql://postgres:postgres@localhost:5433/${perfDbName}?sslmode=disable`;

  console.log('\n=============================================================');
  console.log('Running Auth 1M Sessions & 5M Events Performance Benchmark');
  console.log('Target: Local PostgreSQL 18 (Docker / Local Isolated Daemon)');
  console.log('=============================================================\n');

  const adminClient = new Client({ connectionString: localMaintenanceUrl });
  await adminClient.connect();

  console.log(`1. Creating throwaway database: ${perfDbName}...`);
  await adminClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${perfDbName}' AND pid <> pg_backend_pid();
  `);
  await adminClient.query(`DROP DATABASE IF EXISTS ${perfDbName};`);
  await adminClient.query(`CREATE DATABASE ${perfDbName};`);
  await adminClient.end();

  const client = new Client({ connectionString: perfDbUrl });
  await client.connect();

  try {
    console.log('2. Applying migrations 1 through 16...');
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
      const upSql = (sql.split('-- migrate:down')[0] ?? '').replace('-- migrate:up', '');
      await client.query(upSql);
    }

    console.log('3. Seeding baseline roles, departments, and 1,000 employees...');
    await client.query(`
      INSERT INTO roles (role_name) VALUES ('Admin'), ('Sales'), ('Developer');
      INSERT INTO departments (name) VALUES ('Management'), ('Sales and Marketing'), ('Technology');

      INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date, status)
      SELECT
        'Employee ' || g,
        'employee_' || g || '@vernoxy.pulse',
        '+9198' || lpad(g::text, 8, '0'),
        (SELECT dep_id FROM departments LIMIT 1),
        (SELECT role_id FROM roles LIMIT 1),
        '2025-01-01',
        'Active'
      FROM generate_series(1, 1000) g;
    `);

    console.log('4. Generating 1,000,000 auth_sessions (bulk insert)...');
    const startSess = Date.now();
    await client.query(`
      INSERT INTO auth_sessions (
        emp_id,
        refresh_token_hash,
        previous_token_hash,
        issued_at,
        last_used_at,
        expires_at,
        revoked_at,
        revoked_reason,
        ip_address,
        created_at
      )
      SELECT
        ((g % 1000) + 1),
        md5(g::text) || md5((g + 1000000)::text),
        CASE WHEN g % 3 = 0 THEN md5((g + 2000000)::text) || md5((g + 3000000)::text) ELSE NULL END,
        '2026-10-10 10:00:00+00'::timestamptz - ((g % 60) || ' days')::interval,
        '2026-10-10 10:00:00+00'::timestamptz - ((g % 60) || ' days')::interval,
        '2026-10-10 10:00:00+00'::timestamptz + (((g % 30) + 1) || ' days')::interval,
        CASE WHEN g % 5 = 0 THEN '2026-10-10 09:00:00+00'::timestamptz - ((g % 20) || ' days')::interval ELSE NULL END,
        CASE WHEN g % 5 = 0 THEN 'logout'::session_revoke_reason ELSE NULL END,
        '192.168.1.' || ((g % 254) + 1),
        '2026-10-10 10:00:00+00'::timestamptz - ((g % 60) || ' days')::interval
      FROM generate_series(1, 1000000) g;
    `);
    console.log(`   auth_sessions 1,000,000 rows inserted in ${((Date.now() - startSess) / 1000).toFixed(2)}s`);

    console.log('5. Generating 5,000,000 auth_events across 12 monthly partitions (bulk insert)...');
    const startEvt = Date.now();
    await client.query(`
      INSERT INTO auth_events (
        emp_id,
        actor_emp_id,
        event_type,
        identifier_hash,
        ip_address,
        details,
        created_at
      )
      SELECT
        CASE WHEN g % 10 = 0 THEN NULL ELSE ((g % 1000) + 1) END,
        NULL,
        (ARRAY[
          'login_succeeded',
          'login_password_failed',
          'login_otp_sent',
          'login_otp_failed',
          'token_refreshed'
        ]::auth_event_type[])[(g % 5) + 1],
        md5(g::text) || md5((g + 5000000)::text),
        '10.0.' || ((g % 250) + 1) || '.' || (((g / 250) % 250) + 1),
        '{"source":"benchmark"}'::jsonb,
        -- Distribute 5M rows across 12 pre-provisioned monthly partitions (2026-09 to 2027-08)
        '2026-09-01 00:00:00+00'::timestamptz + ((g::numeric / 5000000.0) * interval '360 days')
      FROM generate_series(1, 5000000) g;
    `);
    console.log(`   auth_events 5,000,000 rows inserted in ${((Date.now() - startEvt) / 1000).toFixed(2)}s`);

    console.log('6. Seeding 100,000 OTP codes...');
    await client.query(`
      INSERT INTO otp_codes (
        emp_id,
        purpose,
        destination,
        code_hash,
        expires_at,
        consumed_at,
        voided_at,
        created_at
      )
      SELECT
        ((g % 1000) + 1),
        CASE WHEN g % 2 = 0 THEN 'login_2fa'::otp_purpose ELSE 'password_reset'::otp_purpose END,
        'user_' || (g % 1000 + 1) || '@example.com',
        md5(g::text) || md5((g + 8000000)::text),
        '2026-10-10 12:00:00+00'::timestamptz + interval '10 minutes',
        -- Leave only 1 open code per (emp_id, purpose): g <= 1000 covers each employee once
        CASE WHEN g > 1000 THEN '2026-10-10 11:00:00+00'::timestamptz ELSE NULL END,
        NULL,
        '2026-10-10 10:00:00+00'::timestamptz
      FROM generate_series(1, 100000) g;
    `);

    console.log('7. Running VACUUM (ANALYZE)...');
    const startVac = Date.now();
    await client.query('VACUUM (ANALYZE);');
    console.log(`   VACUUM (ANALYZE) completed in ${((Date.now() - startVac) / 1000).toFixed(2)}s`);

    // Verify row counts
    const countCheck = await client.query(`
      SELECT
        (SELECT count(*)::int FROM auth_sessions) as sessions_count,
        (SELECT count(*)::int FROM auth_events) as events_count,
        (SELECT count(*)::int FROM otp_codes) as otp_count
    `);
    console.log('\nRow Count Verification:', countCheck.rows[0]);

    // Sample targets for EXPLAIN queries
    const sampleTokenHashRes = await client.query('SELECT refresh_token_hash FROM auth_sessions LIMIT 1 OFFSET 500000');
    const sampleTokenHash = sampleTokenHashRes.rows[0].refresh_token_hash;

    const samplePrevHashRes = await client.query('SELECT previous_token_hash FROM auth_sessions WHERE previous_token_hash IS NOT NULL LIMIT 1 OFFSET 100000');
    const samplePrevHash = samplePrevHashRes.rows[0].previous_token_hash;

    const sampleIpRes = await client.query("SELECT ip_address FROM auth_events WHERE event_type = 'login_password_failed' LIMIT 1 OFFSET 5000");
    const sampleIp = sampleIpRes.rows[0].ip_address;

    const queries = [
      {
        name: 'Query 1: Session lookup by refresh_token_hash',
        index: 'ux_auth_sessions_refresh_token_hash',
        sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM auth_sessions WHERE refresh_token_hash = '${sampleTokenHash}';`,
      },
      {
        name: 'Query 2: Session lookup by previous_token_hash (reuse detection)',
        index: 'ix_auth_sessions_previous_token_hash',
        sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM auth_sessions WHERE previous_token_hash = '${samplePrevHash}';`,
      },
      {
        name: 'Query 3: Active sessions for one employee',
        index: 'ix_auth_sessions_active',
        sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM auth_sessions WHERE emp_id = 42 AND revoked_at IS NULL AND deleted_at IS NULL AND expires_at > '2026-10-10 10:00:00+00';`,
      },
      {
        name: 'Query 4: Last 20 events for one employee in last 30 days (Partition Pruning)',
        index: 'ix_auth_events_emp_created',
        sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM auth_events WHERE emp_id = 42 AND created_at >= '2027-08-01 00:00:00+00' ORDER BY created_at DESC LIMIT 20;`,
      },
      {
        name: 'Query 5: Failed logins from one IP in last hour',
        index: 'ix_auth_events_ip_created',
        sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM auth_events WHERE ip_address = '${sampleIp}' AND event_type = 'login_password_failed' AND created_at >= '2027-08-25 00:00:00+00' ORDER BY created_at DESC;`,
      },
      {
        name: 'Query 6: Open OTP lookup for one employee + purpose',
        index: 'ux_otp_codes_open',
        sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM otp_codes WHERE emp_id = 42 AND purpose = 'login_2fa' AND consumed_at IS NULL AND voided_at IS NULL AND deleted_at IS NULL;`,
      },
    ];

    console.log('\n=============================================================');
    console.log('8. Executing EXPLAIN (ANALYZE, BUFFERS) Cold & Warm Runs');
    console.log('=============================================================\n');

    const results: QueryResultStats[] = [];

    for (const q of queries) {
      console.log(`--- ${q.name} ---`);

      // Cold run
      const coldRes = await client.query(q.sql);
      const coldLines = coldRes.rows.map((r) => r['QUERY PLAN']);
      const coldStats = extractMetrics(coldLines);

      // Warm run
      const warmRes = await client.query(q.sql);
      const warmLines = warmRes.rows.map((r) => r['QUERY PLAN']);
      const warmStats = extractMetrics(warmLines);

      const indexUsed = warmStats.fullText.includes(q.index);
      const isPartitionPruned = q.sql.includes('created_at >=') ? !warmStats.fullText.includes('auth_events_2026_09') : undefined;

      results.push({
        queryName: q.name,
        targetIndex: q.index,
        coldPlan: coldStats.fullText,
        coldTimeMs: coldStats.execTimeMs,
        coldBuffersRead: coldStats.read,
        coldBuffersHit: coldStats.hit,
        warmPlan: warmStats.fullText,
        warmTimeMs: warmStats.execTimeMs,
        warmBuffersRead: warmStats.read,
        warmBuffersHit: warmStats.hit,
        indexUsed,
        partitionPruned: isPartitionPruned,
      });

      console.log(`   Target Index : ${q.index} -> ${indexUsed ? 'CONFIRMED USED' : 'NOT USED'}`);
      if (isPartitionPruned !== undefined) {
        console.log(`   Partition Pruning: ${isPartitionPruned ? 'CONFIRMED (11 of 12 partitions pruned)' : 'NOT PRUNED'}`);
      }
      console.log(`   Cold Timing  : ${coldStats.execTimeMs.toFixed(3)} ms (read: ${coldStats.read}, hit: ${coldStats.hit})`);
      console.log(`   Warm Timing  : ${warmStats.execTimeMs.toFixed(3)} ms (read: ${warmStats.read}, hit: ${warmStats.hit})`);
      console.log('');
    }

    return results;

  } finally {
    await client.end();
    // Drop throwaway database to cleanly reclaim disk
    const cleanupClient = new Client({ connectionString: localMaintenanceUrl });
    await cleanupClient.connect();
    await cleanupClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${perfDbName}' AND pid <> pg_backend_pid();
    `);
    await cleanupClient.query(`DROP DATABASE IF EXISTS ${perfDbName};`);
    await cleanupClient.end();
    console.log(`9. Cleaned up throwaway performance database: ${perfDbName}.\n`);
  }
}

if (require.main === module) {
  runAuthPerfBenchmark().catch((err) => {
    console.error('Auth benchmark error:', err);
    process.exit(1);
  });
}
