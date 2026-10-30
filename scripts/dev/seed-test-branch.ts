import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { assertTestEnvironment } from '../../database/utils/env-guard';

const envConfig = dotenv.parse(fs.readFileSync('.env.test'));
const directUrl = envConfig.DIRECT_URL || envConfig.DATABASE_URL;

async function seedTestBranch() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();

  try {
    await assertTestEnvironment(client);
    console.log('Seeding Neon test branch with baseline master data...');
    const seedSqlPath = path.resolve(__dirname, '../database/seeds/01_baseline_seeds.sql');
    const sqlContent = fs.readFileSync(seedSqlPath, 'utf-8');
    await client.query(sqlContent);
    console.log('Baseline master data seeded successfully on test branch.');
  } finally {
    await client.end();
  }
}

seedTestBranch().catch((err) => {
  console.error('Failed to seed test branch:', err);
  process.exit(1);
});
