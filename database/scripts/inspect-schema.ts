import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

async function main() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    console.error('DIRECT_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: directUrl });
  await client.connect();

  console.log('=== COLUMNS IN companies ===');
  const compCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies'
    ORDER BY ordinal_position;
  `);
  for (const row of compCols.rows) {
    console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
  }

  console.log('\n=== INDEXES ON companies ===');
  const compIdx = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'companies'
    ORDER BY indexname;
  `);
  for (const row of compIdx.rows) {
    console.log(`- ${row.indexname}: ${row.indexdef}`);
  }

  console.log('\n=== COLUMNS IN persons ===');
  const persCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persons'
    ORDER BY ordinal_position;
  `);
  for (const row of persCols.rows) {
    console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
  }

  console.log('\n=== INDEXES ON persons ===');
  const persIdx = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'persons'
    ORDER BY indexname;
  `);
  for (const row of persIdx.rows) {
    console.log(`- ${row.indexname}: ${row.indexdef}`);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
