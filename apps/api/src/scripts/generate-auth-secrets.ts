import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function parseEnvKeys(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        keys.add(trimmed.slice(0, eqIdx).trim());
      }
    }
  }
  return keys;
}

export function generateAuthSecrets() {
  const rootDir = path.resolve(__dirname, '../../../../');
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, 'apps/api/.env'),
  ];

  // Generate pair & secrets if needed
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const privKeyBase64 = Buffer.from(privateKey).toString('base64');
  const pubKeyBase64 = Buffer.from(publicKey).toString('base64');
  const keyId = `kid_${crypto.randomBytes(8).toString('hex')}`;
  const otpHmacSecret = crypto.randomBytes(32).toString('hex'); // 64 chars

  const defaultValues: Record<string, string> = {
    JWT_PRIVATE_KEY: `"${privKeyBase64}"`,
    JWT_PUBLIC_KEY: `"${pubKeyBase64}"`,
    JWT_KEY_ID: `"${keyId}"`,
    JWT_ISSUER: '"pulse-api"',
    JWT_AUDIENCE: '"pulse-web"',
    ACCESS_TOKEN_TTL_SECONDS: '900',
    REFRESH_TOKEN_TTL_DAYS: '7',
    OTP_HMAC_SECRET: `"${otpHmacSecret}"`,
    SMTP_HOST: '"localhost"',
    SMTP_PORT: '1025',
    SMTP_USER: '""',
    SMTP_PASS: '""',
    MAIL_FROM: '"no-reply@vernoxy.com"',
    WEB_ORIGIN: '"http://localhost:5173"',
    COOKIE_SECURE: 'false',
    STORAGE_DRIVER: '"local"',
    STORAGE_LOCAL_DIR: '"storage"',
    FILE_URL_SECRET: `"${crypto.randomBytes(32).toString('hex')}"`,
    FILE_URL_TTL_SECONDS: '3600',
    MAX_UPLOAD_BYTES: '5242880',
  };

  let appendedAny = false;

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }
    const existingKeys = parseEnvKeys(envPath);
    const linesToAdd: string[] = [];

    for (const [key, val] of Object.entries(defaultValues)) {
      if (!existingKeys.has(key)) {
        linesToAdd.push(`${key}=${val}`);
      }
    }

    if (linesToAdd.length > 0) {
      let currentContent = fs.readFileSync(envPath, 'utf8');
      if (!currentContent.endsWith('\n')) {
        currentContent += '\n';
      }
      const newBlock = `\n# Auth & Token Secrets (Generated)\n` + linesToAdd.join('\n') + '\n';
      fs.writeFileSync(envPath, currentContent + newBlock, 'utf8');
      appendedAny = true;
    }
  }

  if (appendedAny) {
    console.log('✓ Auth secrets and configuration appended to local .env (secrets redacted).');
  } else {
    console.log('✓ All auth configuration keys already present in .env. No changes made.');
  }
}

if (require.main === module) {
  generateAuthSecrets();
}
