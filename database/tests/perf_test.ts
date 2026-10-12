import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface PlanMetrics {
  nodeType: string;
  indexName?: string;
  buffersHit: number;
  buffersRead: number;
  heapFetches?: number;
  planningTimeMs: number;
  executionTimeMs: number;
  fullPlan: string;
}

function parsePlan(planLines: string[]): PlanMetrics {
  const fullPlan = planLines.join('\n');
  let nodeType = 'Unknown';
  let indexName: string | undefined;
  let buffersHit = 0;
  let buffersRead = 0;
  let heapFetches: number | undefined;
  let planningTimeMs = 0;
  let executionTimeMs = 0;

  // Extract root or prominent node type
  const firstLine = planLines[0] || '';
  const nodeMatch = firstLine.match(/^\s*->?\s*([A-Za-z\s]+?)(?:\s+on|\s+\(|$)/);
  if (nodeMatch) {
    nodeType = nodeMatch[1].trim();
  }

  // Scan all lines for detailed index and buffer stats
  for (const line of planLines) {
    const idxMatch = line.match(/(?:using|on)\s+([a-zA-Z0-9_]+)/i);
    if (idxMatch && idxMatch[1].startsWith('ix_')) {
      indexName = idxMatch[1];
    }
    const hitMatch = line.match(/hit=(\d+)/);
    if (hitMatch) buffersHit += parseInt(hitMatch[1], 10);

    const readMatch = line.match(/read=(\d+)/);
    if (readMatch) buffersRead += parseInt(readMatch[1], 10);

    const heapMatch = line.match(/Heap Fetches:\s*(\d+)/i);
    if (heapMatch) heapFetches = parseInt(heapMatch[1], 10);

    const planTimeMatch = line.match(/Planning Time:\s*([\d.]+)\s*ms/i);
    if (planTimeMatch) planningTimeMs = parseFloat(planTimeMatch[1]);

    const execTimeMatch = line.match(/Execution Time:\s*([\d.]+)\s*ms/i);
    if (execTimeMatch) executionTimeMs = parseFloat(execTimeMatch[1]);
  }

  return {
    nodeType,
    indexName,
    buffersHit,
    buffersRead,
    heapFetches,
    planningTimeMs,
    executionTimeMs,
    fullPlan,
  };
}

export async function runPerfTest(baseUrl: string): Promise<void> {
  console.log('\n=============================================================');
  console.log('Running 6-Million Row Performance & Index Verification Suite');
  console.log('=============================================================\n');

  // Connect to postgres maintenance DB to manage throwaway database
  const maintenanceUrl = baseUrl.replace(/\/([^\/?]+)(\?.*)?$/, '/postgres$2');
  const adminClient = new Client({ connectionString: maintenanceUrl });
  await adminClient.connect();

  const perfDbName = 'vernoxy_pulse_perf_test';
  console.log(`1. Setting up throwaway performance database: ${perfDbName}...`);

  await adminClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${perfDbName}' AND pid <> pg_backend_pid();
  `);
  await adminClient.query(`DROP DATABASE IF EXISTS ${perfDbName};`);
  await adminClient.query(`CREATE DATABASE ${perfDbName};`);
  await adminClient.end();

  const perfDbUrl = baseUrl.replace(/\/([^\/?]+)(\?.*)?$/, `/${perfDbName}$2`);
  const perfClient = new Client({ connectionString: perfDbUrl });
  await perfClient.connect();

  try {
    console.log('2. Applying schema migrations to throwaway database...');
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of migrationFiles) {
      const fullPath = path.join(migrationsDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const upPart = content.split('-- migrate:down')[0]?.replace('-- migrate:up', '') || '';
      await perfClient.query(upPart);
    }
    console.log('   All migrations applied successfully.');

    console.log('3. Seeding baseline metadata...');
    const seedFile = path.resolve(__dirname, '../seeds/01_baseline_seeds.sql');
    const seedSql = fs.readFileSync(seedFile, 'utf-8');
    await perfClient.query(seedSql);

    console.log('   Seeding 100 employees for realistic ownership...');
    await perfClient.query(`
      INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date)
      SELECT
        'Employee ' || s,
        'employee_' || s || '@vernoxy.internal',
        '+9198' || lpad(s::text, 8, '0'),
        (SELECT dep_id FROM departments WHERE deleted_at IS NULL LIMIT 1),
        (SELECT role_id FROM roles WHERE deleted_at IS NULL LIMIT 1),
        '2024-01-01'::date
      FROM generate_series(1, 100) s;
    `);

    const customerTypeId = (await perfClient.query('SELECT customer_type_id FROM customer_types WHERE deleted_at IS NULL LIMIT 1')).rows[0].customer_type_id;
    const industryId = (await perfClient.query('SELECT industry_id FROM industries WHERE parent_id IS NULL AND deleted_at IS NULL LIMIT 1')).rows[0].industry_id;
    const wonStageId = (await perfClient.query('SELECT pipeline_stage_id FROM pipeline_stages WHERE is_won = true LIMIT 1')).rows[0].pipeline_stage_id;
    const lostStageId = (await perfClient.query('SELECT pipeline_stage_id FROM pipeline_stages WHERE is_lost = true LIMIT 1')).rows[0].pipeline_stage_id;
    const openStageId = (await perfClient.query('SELECT pipeline_stage_id FROM pipeline_stages WHERE is_won = false AND is_lost = false LIMIT 1')).rows[0].pipeline_stage_id;
    const lostReasonId = (await perfClient.query("SELECT lookup_id FROM master_lookup WHERE lookup_type = 'lost_reason' LIMIT 1")).rows[0].lookup_id;
    const leadSourceId = (await perfClient.query("SELECT lookup_id FROM master_lookup WHERE lookup_type = 'lead_source' LIMIT 1")).rows[0].lookup_id;

    console.log('4. Generating 1,000,000 companies in bulk (with 5 rare rows containing "zq7")...');
    const t0Comp = Date.now();
    await perfClient.query(`
      INSERT INTO companies (name, customer_type_id, industry_id, city, state, country, owner_id)
      SELECT
        CASE
          WHEN s <= 5 THEN 'Vernoxy Rare zq7 Company ' || s
          WHEN s % 13 = 0 THEN 'Company ' || s || ' abc tech'
          ELSE 'Company ' || s || ' corp'
        END,
        $1,
        $2,
        CASE (s % 5)
          WHEN 0 THEN 'Mumbai'
          WHEN 1 THEN 'Bengaluru'
          WHEN 2 THEN 'Delhi'
          WHEN 3 THEN 'Surat'
          ELSE 'Hyderabad'
        END,
        CASE (s % 5)
          WHEN 0 THEN 'Maharashtra'
          WHEN 1 THEN 'Karnataka'
          WHEN 2 THEN 'Delhi'
          WHEN 3 THEN 'Gujarat'
          ELSE 'Telangana'
        END,
        'India',
        ((s % 100) + 1)
      FROM generate_series(1, 1000000) s;
    `, [customerTypeId, industryId]);
    console.log(`   1,000,000 companies generated in ${((Date.now() - t0Comp) / 1000).toFixed(2)}s.`);

    console.log('5. Generating 3,000,000 persons in bulk...');
    const t0Persons = Date.now();
    await perfClient.query(`
      INSERT INTO persons (name, email, mobile)
      SELECT
        'Person ' || s,
        'person_' || s || '@domain.com',
        '+91' || lpad(s::text, 10, '0')
      FROM generate_series(1, 3000000) s;
    `);
    console.log(`   3,000,000 persons generated in ${((Date.now() - t0Persons) / 1000).toFixed(2)}s.`);

    console.log('6. Generating 2,000,000 leads in bulk (70% open, 20% won, 10% lost)...');
    const t0Leads = Date.now();
    await perfClient.query(`
      INSERT INTO leads (
        company_id,
        title,
        pipeline_stage_id,
        status,
        owner_id,
        source_id,
        expected_value,
        actual_value,
        currency_code,
        expected_close_date,
        lost_reason_id,
        closed_at,
        created_at
      )
      SELECT
        ((s % 1000000) + 1),
        'Lead Opportunity ' || s,
        CASE
          WHEN s % 10 < 7 THEN $1::integer
          WHEN s % 10 < 9 THEN $2::integer
          ELSE $3::integer
        END,
        CASE
          WHEN s % 10 < 7 THEN 'open'::lead_status
          WHEN s % 10 < 9 THEN 'won'::lead_status
          ELSE 'lost'::lead_status
        END,
        ((s % 100) + 1),
        $4::integer,
        CASE WHEN s % 10 < 7 THEN (1000 + (s % 9000))::numeric(14,2) ELSE NULL END,
        CASE WHEN s % 10 >= 7 AND s % 10 < 9 THEN (1200 + (s % 8000))::numeric(14,2) ELSE NULL END,
        'INR',
        CASE WHEN s % 10 < 7 THEN (current_date + ((s % 360) * interval '1 day'))::date ELSE NULL END,
        CASE WHEN s % 10 >= 9 THEN $5::integer ELSE NULL END,
        CASE
          WHEN s % 10 >= 7 AND s % 10 < 9 THEN (now() - ((s % 360) * interval '1 day'))
          WHEN s % 10 >= 9 THEN (now() - ((s % 360) * interval '1 day'))
          ELSE NULL
        END,
        (now() - ((s % 500) * interval '1 day'))
      FROM generate_series(1, 2000000) s;
    `, [openStageId, wonStageId, lostStageId, leadSourceId, lostReasonId]);
    console.log(`   2,000,000 leads generated in ${((Date.now() - t0Leads) / 1000).toFixed(2)}s.`);

    console.log('7. Running VACUUM (ANALYZE) on all tables...');
    const t0Vacuum = Date.now();
    await perfClient.query('VACUUM (ANALYZE)');
    console.log(`   VACUUM (ANALYZE) completed in ${((Date.now() - t0Vacuum) / 1000).toFixed(2)}s.\n`);

    // -------------------------------------------------------------------------
    // Performance Verification Queries
    // -------------------------------------------------------------------------
    console.log('-------------------------------------------------------------');
    console.log('EXPLAIN (ANALYZE, BUFFERS) Results (Cold & Warm Execution)');
    console.log('-------------------------------------------------------------\n');

    const queries = [
      {
        id: '1A',
        name: 'Query 1A: Company search RARE term (lower(name) LIKE "%zq7%") (5 matches out of 1,000,000)',
        sql: `EXPLAIN (ANALYZE, BUFFERS)
              SELECT company_id, name
              FROM companies
              WHERE lower(name) LIKE '%zq7%' AND deleted_at IS NULL;`,
        expectedIndex: 'ix_companies_name_trgm',
        note: 'Trigram GIN index is chosen due to high selectivity of rare term.',
      },
      {
        id: '1B',
        name: 'Query 1B: Company search COMMON term ILIKE "%corp%" (~923,000 matches in 1,000,000 rows)',
        sql: `EXPLAIN (ANALYZE, BUFFERS)
              SELECT company_id, name
              FROM companies
              WHERE lower(name) LIKE '%corp%' AND deleted_at IS NULL
              LIMIT 50;`,
        expectedIndex: 'ix_companies_name_trgm',
        note: 'Trigram GIN index unpacks ~923,000 entries across 290 pages before Limit, taking ~41ms vs ~0.03ms for rare term.',
      },
      {
        id: '2',
        name: 'Query 2: Keyset pagination page of 50 companies (B-tree Keyset Index)',
        sql: `EXPLAIN (ANALYZE, BUFFERS)
              SELECT company_id, name
              FROM companies
              WHERE deleted_at IS NULL AND (lower(name), company_id) > ('company 100000', 100000)
              ORDER BY lower(name), company_id
              LIMIT 50;`,
        expectedIndex: 'ix_companies_keyset',
        note: 'B-tree keyset index avoids deep offset costs.',
      },
      {
        id: '3',
        name: 'Query 3: Leads by owner + status (Partial Composite Index)',
        sql: `EXPLAIN (ANALYZE, BUFFERS)
              SELECT lead_id, title, expected_close_date
              FROM leads
              WHERE owner_id = 42 AND status = 'open' AND deleted_at IS NULL
              ORDER BY expected_close_date
              LIMIT 50;`,
        expectedIndex: 'ix_leads_owner_status_close_date',
        note: 'Partial index on (owner_id, status, expected_close_date).',
      },
      {
        id: '4',
        name: 'Query 4: Open forecast next 12 months grouped by month (Covering Index-Only Scan)',
        sql: `EXPLAIN (ANALYZE, BUFFERS)
              SELECT
                date_trunc('month', expected_close_date) AS forecast_month,
                count(*) AS open_leads_count,
                sum(expected_value) AS total_forecast_value
              FROM leads
              WHERE status = 'open'
                AND deleted_at IS NULL
                AND expected_close_date >= current_date
                AND expected_close_date < current_date + interval '12 months'
              GROUP BY 1
              ORDER BY 1;`,
        expectedIndex: 'ix_leads_open_forecast',
        note: 'Covering index on expected_close_date INCLUDE (expected_value, currency_code, pipeline_stage_id).',
      },
      {
        id: '5',
        name: 'Query 5: Won revenue last 12 months grouped by month with closed_at range (Covering Index-Only Scan)',
        sql: `EXPLAIN (ANALYZE, BUFFERS)
              SELECT
                date_trunc('month', closed_at) AS won_month,
                count(*) AS won_leads_count,
                sum(actual_value) AS total_won_revenue
              FROM leads
              WHERE status = 'won'
                AND deleted_at IS NULL
                AND closed_at >= now() - interval '12 months'
                AND closed_at <= now()
              GROUP BY 1
              ORDER BY 1;`,
        expectedIndex: 'ix_leads_won_revenue',
        note: 'Covering index on closed_at INCLUDE (owner_id, actual_value, currency_code) with 0/low Heap Fetches.',
      },
    ];

    for (const q of queries) {
      console.log(`=============================================================`);
      console.log(`>>> ${q.name}`);
      console.log(`    Note: ${q.note}`);
      console.log(`-------------------------------------------------------------`);

      // Run 1: Cold
      const coldRes = await perfClient.query(q.sql);
      const coldLines = coldRes.rows.map((r: any) => r['QUERY PLAN']);
      const coldParsed = parsePlan(coldLines);

      // Run 2: Warm
      const warmRes = await perfClient.query(q.sql);
      const warmLines = warmRes.rows.map((r: any) => r['QUERY PLAN']);
      const warmParsed = parsePlan(warmLines);

      console.log('--- COLD EXECUTION PLAN ---');
      console.log(coldParsed.fullPlan);
      console.log(`  Metrics (Cold): Execution Time: ${coldParsed.executionTimeMs.toFixed(3)} ms | Buffers Hit: ${coldParsed.buffersHit}, Read: ${coldParsed.buffersRead}${coldParsed.heapFetches !== undefined ? ` | Heap Fetches: ${coldParsed.heapFetches}` : ''}`);

      console.log('\n--- WARM EXECUTION PLAN ---');
      console.log(warmParsed.fullPlan);
      console.log(`  Metrics (Warm): Execution Time: ${warmParsed.executionTimeMs.toFixed(3)} ms | Buffers Hit: ${warmParsed.buffersHit}, Read: ${warmParsed.buffersRead}${warmParsed.heapFetches !== undefined ? ` | Heap Fetches: ${warmParsed.heapFetches}` : ''}`);

      const coldHasIdx = coldParsed.fullPlan.includes(q.expectedIndex);
      const warmHasIdx = warmParsed.fullPlan.includes(q.expectedIndex);
      if (coldHasIdx || warmHasIdx) {
        console.log(`\n  [VERIFIED] Expected access pattern (${q.expectedIndex}) successfully utilized.\n`);
      } else {
        console.log(`\n  [ATTENTION] Access pattern differed from ${q.expectedIndex}.\n`);
      }
    }

  } finally {
    await perfClient.end();

    console.log(`8. Cleaning up throwaway database ${perfDbName}...`);
    const cleanClient = new Client({ connectionString: maintenanceUrl });
    await cleanClient.connect();
    await cleanClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${perfDbName}' AND pid <> pg_backend_pid();
    `);
    await cleanClient.query(`DROP DATABASE IF EXISTS ${perfDbName};`);
    await cleanClient.end();
    console.log('   Throwaway database dropped cleanly.\n');
  }
}
