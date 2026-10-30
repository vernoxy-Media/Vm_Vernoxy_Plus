import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Client } from 'pg';

const envConfig = dotenv.parse(fs.readFileSync('.env.test'));
const directUrl = envConfig.DIRECT_URL || envConfig.DATABASE_URL;

async function check() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'dbmate')
    ORDER BY table_schema, table_name;
  `);
  console.log('Tables found on test branch:', tables.rows);
  await client.end();
}

check().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
