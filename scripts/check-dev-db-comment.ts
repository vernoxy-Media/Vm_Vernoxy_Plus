import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Client } from 'pg';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const directUrl = envConfig.DIRECT_URL || envConfig.DATABASE_URL;

async function check() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  const res = await client.query(
    "SELECT datname, shobj_description(oid, 'pg_database') AS environment FROM pg_database WHERE datname = current_database();"
  );
  console.log('Database name:', res.rows[0].datname);
  console.log('Environment comment:', res.rows[0].environment);
  await client.end();
}

check().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
