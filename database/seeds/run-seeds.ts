import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runSeeds() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    console.error('Error: DIRECT_URL or DATABASE_URL must be set in the environment');
    process.exit(1);
  }

  const client = new Client({
    connectionString: directUrl,
  });

  try {
    await client.connect();
    console.log('Connected to database for seeding...');

    const seedSqlPath = path.resolve(__dirname, '01_baseline_seeds.sql');
    const sqlContent = fs.readFileSync(seedSqlPath, 'utf-8');

    await client.query(sqlContent);
    console.log('Baseline seeds SQL executed successfully.');

    // Report seeded counts
    const tables = [
      'roles',
      'departments',
      'customer_types',
      'pipeline_stages',
      'master_lookup',
      'industries',
    ];

    for (const table of tables) {
      const res = await client.query(`SELECT count(*)::int as count FROM ${table} WHERE deleted_at IS NULL`);
      console.log(`- ${table}: ${res.rows[0].count} active records`);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error running seeds:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeeds();
