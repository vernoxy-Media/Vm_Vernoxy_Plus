import * as fs from 'fs';
import * as path from 'path';
import { generateVapidKeys } from '../modules/push/domain/web-push.crypto';

/**
 * Makes the key pair that desktop notifications are signed with and adds it to the local .env files.
 * Nothing is printed except the public key; the private key never leaves the .env file.
 * Existing keys are kept (changing them would cut off every browser that already subscribed).
 *
 *   pnpm push:gen-keys            adds the keys to the local .env if missing
 *   pnpm push:gen-keys --print    also prints both keys once, to copy into Render / Vercel settings
 */
const rootDir = path.resolve(__dirname, '../../../../');
const envPaths = [path.join(rootDir, 'apps/api/.env'), path.join(rootDir, '.env')].filter((p) => fs.existsSync(p));
const print = process.argv.includes('--print');

function readValue(file: string, key: string): string | null {
  const m = fs.readFileSync(file, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : null;
}

let keys: { publicKey: string; privateKey: string } | null = null;
for (const p of envPaths) {
  const pub = readValue(p, 'VAPID_PUBLIC_KEY');
  const priv = readValue(p, 'VAPID_PRIVATE_KEY');
  if (pub && priv) {
    keys = { publicKey: pub, privateKey: priv };
    break;
  }
}

if (keys) {
  console.log('✓ VAPID keys already present in the local .env. Nothing changed.');
} else {
  const { publicKey, privateKey } = generateVapidKeys();
  keys = { publicKey, privateKey };
  for (const p of envPaths) {
    let content = fs.readFileSync(p, 'utf8');
    if (!content.endsWith('\n')) content += '\n';
    content += `\n# Desktop notifications (Web Push)\nVAPID_PUBLIC_KEY="${publicKey}"\nVAPID_PRIVATE_KEY="${privateKey}"\nVAPID_SUBJECT="mailto:admin@vernoxy.com"\n`;
    fs.writeFileSync(p, content, 'utf8');
  }
  console.log(`✓ VAPID keys added to ${envPaths.length} local .env file(s). The private key was not printed.`);
}

if (print) {
  console.log(`\nCopy these three into the Render environment of the API (QA and production):\n`);
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:admin@vernoxy.com`);
}
