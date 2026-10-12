import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

export interface DbQueryable {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

export async function checkDatabaseEnvironment(client: DbQueryable): Promise<string | null> {
  const res = await client.query(
    "SELECT shobj_description(oid, 'pg_database') AS environment FROM pg_database WHERE datname = current_database();"
  );
  return res.rows[0]?.environment ?? null;
}

export async function assertTestEnvironment(clientOrUrl: DbQueryable | string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ABORT: Test execution rejected because NODE_ENV=production');
  }

  let client: DbQueryable;
  let shouldClose = false;
  let pgClient: Client | null = null;

  if (typeof clientOrUrl === 'string') {
    pgClient = new Client({ connectionString: clientOrUrl });
    try {
      await pgClient.connect();
    } catch (err: any) {
      throw new Error(`ABORT: Database environment guard check failed due to connection error: ${err.message}`);
    }
    client = pgClient;
    shouldClose = true;
  } else {
    client = clientOrUrl;
  }

  try {
    let envMarker: string | null = null;
    try {
      envMarker = await checkDatabaseEnvironment(client);
    } catch (err: any) {
      throw new Error(`ABORT: Database environment guard check failed due to connection error: ${err.message}`);
    }

    if (envMarker !== 'pulse:test') {
      throw new Error(
        `ABORT: Database environment guard check failed! Expected 'pulse:test' but found '${envMarker ?? 'none'}'. Target database is NOT a designated test database.`
      );
    }
  } finally {
    if (shouldClose && pgClient) {
      await pgClient.end().catch(() => {});
    }
  }
}

export function loadTestEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.test');
  const result = dotenv.config({ path: envPath, override: true });
  if (result.error) {
    // Also try root if running from inside apps/api or apps/web
    const parentEnvPath = path.resolve(process.cwd(), '../../.env.test');
    dotenv.config({ path: parentEnvPath, override: true });
  }
}
