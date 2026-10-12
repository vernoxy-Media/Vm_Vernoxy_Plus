import * as path from 'path';
import * as dotenv from 'dotenv';
import { runFunctionalTests } from './sql_tests';
import { runPerfTest } from './perf_test';
import { assertTestEnvironment } from '../utils/env-guard';

// Load .env.test ONLY
dotenv.config({ path: path.resolve(__dirname, '../../.env.test'), override: true });

async function main() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    console.error('DIRECT_URL or DATABASE_URL must be defined');
    process.exit(1);
  }

  // Abort unless connected to pulse:test environment
  await assertTestEnvironment(directUrl);

  const args = process.argv.slice(2);
  const includePerf = args.includes('--perf') || args.includes('--all');

  const ok = await runFunctionalTests(directUrl);
  if (!ok) {
    process.exit(1);
  }

  if (includePerf) {
    await runPerfTest(directUrl);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
