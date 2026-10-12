import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { z } from 'zod';

// Automatically load .env from workspace root or current directory if not already set
const envFileName = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'test' ? '.env.test' : '.env');
const candidatePaths = [
  path.resolve(process.cwd(), envFileName),
  path.resolve(__dirname, `../../../../${envFileName}`),
  path.resolve(__dirname, `../../../../../${envFileName}`),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  JWT_KEY_ID: z.string().min(1, 'JWT_KEY_ID is required'),
  JWT_ISSUER: z.string().min(1).default('pulse-api'),
  JWT_AUDIENCE: z.string().min(1).default('pulse-web'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),
  OTP_HMAC_SECRET: z.string().min(32, 'OTP_HMAC_SECRET must be at least 32 characters'),
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().positive().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().min(1).default('no-reply@vernoxy.com'),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  COOKIE_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('storage'),
  FILE_URL_SECRET: z.string().min(32, 'FILE_URL_SECRET must be at least 32 characters'),
  FILE_URL_TTL_SECONDS: z.coerce.number().positive().default(3600),
  MAX_UPLOAD_BYTES: z.coerce.number().positive().default(5242880),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return result.data;
}
