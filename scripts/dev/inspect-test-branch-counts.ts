import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Client } from 'pg';

const envConfig = dotenv.parse(fs.readFileSync('.env.test'));
const directUrl = envConfig.DIRECT_URL || envConfig.DATABASE_URL;

async function check() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  const r = await client.query('SELECT count(*)::int as rc FROM roles');
  const e = await client.query('SELECT count(*)::int as ec FROM employees');
  const d = await client.query('SELECT count(*)::int as dc FROM departments');
  console.log('roles:', r.rows[0].rc, 'employees:', e.rows[0].ec, 'departments:', d.rows[0].dc);
  await client.end();
}

check().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
