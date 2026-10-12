import * as fs from 'fs';

const content = fs.readFileSync('database/tests/sql_tests.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('roles') || line.includes('roles (')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
