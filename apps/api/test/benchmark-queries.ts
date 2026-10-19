import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test'), override: true });

async function runBenchmark() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await prisma.$connect();
    console.log('Connected to database for EXPLAIN ANALYZE benchmark');

    // Find a valid active employee
    const emp = await prisma.employees.findFirst({
      where: { deleted_at: null },
      select: { emp_id: true },
    });

    if (!emp) {
      throw new Error('No active employee found for benchmark');
    }

    const empId = emp.emp_id;
    const monthStart = '2026-10-01';
    const dayDate = '2026-10-16';

    const outputLines: string[] = [];
    outputLines.push('===============================================================');
    outputLines.push('ATTENDANCE DATABASE QUERY EXPLAIN ANALYZE BENCHMARK');
    outputLines.push(`Timestamp: ${new Date().toISOString()}`);
    outputLines.push(`Employee ID: ${empId}`);
    outputLines.push('===============================================================\n');

    // 1. Dashboard Month Query
    outputLines.push('---------------------------------------------------------------');
    outputLines.push('1. DASHBOARD MONTH DATA QUERY (Single SQL generate_series + joins)');
    outputLines.push('Target Execution Time: < 60ms');
    outputLines.push('---------------------------------------------------------------');

    const monthExplainSql = `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      WITH month_bounds AS (
        SELECT 
          $2::date AS m_start,
          ($2::date + interval '1 month' - interval '1 day')::date AS m_end
      ),
      cal_days AS (
        SELECT generate_series(m_start, m_end, '1 day'::interval)::date AS day_date
        FROM month_bounds
      )
      SELECT
        TO_CHAR(cd.day_date, 'YYYY-MM-DD') AS date,
        EXTRACT(DOW FROM cd.day_date)::int AS dow,
        ad.attendance_id,
        ad.check_in_at,
        ad.check_out_at,
        COALESCE(ad.break_minutes, 0)::int AS break_minutes,
        COALESCE(ad.production_minutes, 0)::int AS production_minutes,
        ad.day_status::text AS day_status,
        COALESCE(ad.worked_on_non_working_day, false) AS worked_on_non_working_day,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'break_id', ab.break_id,
                'started_at', ab.started_at,
                'ended_at', ab.ended_at
              ) ORDER BY ab.started_at ASC
            )
            FROM attendance_breaks ab
            WHERE ab.attendance_id = ad.attendance_id
              AND ab.deleted_at IS NULL
          ),
          '[]'::json
        ) AS breaks
      FROM cal_days cd
      LEFT JOIN attendance_days ad
        ON ad.emp_id = $1
        AND ad.work_date = cd.day_date
        AND ad.deleted_at IS NULL
      ORDER BY cd.day_date ASC;
    `;

    const monthResult = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
      monthExplainSql,
      empId,
      monthStart,
    );

    for (const row of monthResult) {
      outputLines.push(row['QUERY PLAN']);
    }
    outputLines.push('\n');

    // 2. Day Detail Query
    outputLines.push('---------------------------------------------------------------');
    outputLines.push('2. DAY DETAIL QUERY (attendance_days + attendance_breaks for date)');
    outputLines.push('Target Execution Time: < 20ms');
    outputLines.push('---------------------------------------------------------------');

    const dayDetailExplainSql = `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      SELECT 
        ad.attendance_id,
        ad.emp_id,
        ad.work_date,
        ad.check_in_at,
        ad.check_out_at,
        ad.break_minutes,
        ad.production_minutes,
        ad.day_status,
        ad.source,
        ad.worked_on_non_working_day,
        ad.note,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'break_id', ab.break_id,
                'started_at', ab.started_at,
                'ended_at', ab.ended_at
              ) ORDER BY ab.started_at ASC
            )
            FROM attendance_breaks ab
            WHERE ab.attendance_id = ad.attendance_id
              AND ab.deleted_at IS NULL
          ),
          '[]'::json
        ) AS breaks
      FROM attendance_days ad
      WHERE ad.emp_id = $1
        AND ad.work_date = $2::date
        AND ad.deleted_at IS NULL;
    `;

    const dayResult = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
      dayDetailExplainSql,
      empId,
      dayDate,
    );

    for (const row of dayResult) {
      outputLines.push(row['QUERY PLAN']);
    }

    const logPath = path.resolve(__dirname, '../../../logs/query-explain.log');
    fs.writeFileSync(logPath, outputLines.join('\n'), 'utf8');
    console.log(`Saved EXPLAIN ANALYZE benchmark to ${logPath}`);
    console.log(outputLines.join('\n'));
  } finally {
    await prisma.$disconnect();
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
