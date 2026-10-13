import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    EXPLAIN SELECT * FROM company_channels 
    WHERE deleted_at IS NULL 
      AND channel_type = 'email' 
      AND lower(value) = ANY(ARRAY['test@example.com', 'admin@example.com'])
  `);
  console.log('Query Plan:');
  console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));
  await client.end();
}

check().catch(console.error);
