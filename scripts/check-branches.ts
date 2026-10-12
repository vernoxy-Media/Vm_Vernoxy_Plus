import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

async function testConnection(envPath: string, label: string) {
  console.log(`\n--- Testing ${label} (${envPath}) ---`);
  const env = dotenv.config({ path: path.resolve(process.cwd(), envPath), override: true }).parsed;
  if (!env) {
    console.error(`Failed to load ${envPath}`);
    return;
  }

  const directUrl = env.DIRECT_URL;
  const dbUrl = env.DATABASE_URL;
  console.log(`DIRECT_URL host:`, new URL(directUrl).host);
  console.log(`DATABASE_URL host:`, new URL(dbUrl).host);

  // Test direct
  const clientDirect = new Client({ connectionString: directUrl });
  try {
    await clientDirect.connect();
    const res = await clientDirect.query(
      `SELECT current_database() as db, shobj_description(oid, 'pg_database') AS comment FROM pg_database WHERE datname = current_database();`
    );
    console.log(`[DIRECT_URL SUCCESS] DB: ${res.rows[0].db}, Comment: ${res.rows[0].comment}`);
    await clientDirect.end();
  } catch (err: any) {
    console.error(`[DIRECT_URL FAIL]`, err.message);
  }

  // Test pooler
  const clientPooler = new Client({ connectionString: dbUrl });
  try {
    await clientPooler.connect();
    const res = await clientPooler.query(
      `SELECT current_database() as db, shobj_description(oid, 'pg_database') AS comment FROM pg_database WHERE datname = current_database();`
    );
    console.log(`[DATABASE_URL (Pooler) SUCCESS] DB: ${res.rows[0].db}, Comment: ${res.rows[0].comment}`);
    await clientPooler.end();
  } catch (err: any) {
    console.error(`[DATABASE_URL (Pooler) FAIL]`, err.message);
  }
}

async function main() {
  await testConnection('.env', 'DEV Branch');
  await testConnection('.env.test', 'TEST Branch');
}

main().catch(console.error);
