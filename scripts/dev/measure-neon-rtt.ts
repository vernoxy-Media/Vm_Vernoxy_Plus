import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await client.query('SELECT 1');
    times.push(performance.now() - start);
  }
  await client.end();
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const out = `Neon RTT measurements (ms):
Individual runs: ${times.map((t) => t.toFixed(2)).join(', ')} ms
Average RTT: ${avg.toFixed(2)} ms
Min: ${min.toFixed(2)} ms, Max: ${max.toFixed(2)} ms
`;
  console.log(out);
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
  }
  fs.writeFileSync('logs/neon_rtt.txt', out);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
