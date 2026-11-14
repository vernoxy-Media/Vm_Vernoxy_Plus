import { ForbiddenException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AppLogger } from '../../../core/logging/logger.service';
import { FkFix, ForeignKey, deleteStatements, foreignKeyFixes, planFlush, q } from '../domain/flush-plan';

export interface FlushResult {
  deleted_rows: number;
  tables_emptied: number;
  kept_admins: Array<{ emp_id: number; name: string; email: string }>;
  master_data_flushed: boolean;
}

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const MAX_PASSES = 40;

/**
 * Empties the database for a fresh QA round and keeps only the Admin user(s).
 * It really deletes rows (the no-hard-delete triggers are switched off for the length of one transaction),
 * so it is double-locked: the server must be started with ALLOW_DATA_FLUSH=true, and only an Admin may call it.
 */
@Injectable()
export class DataFlushService {
  private readonly log = new AppLogger('DataFlush');

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return process.env.ALLOW_DATA_FLUSH === 'true';
  }

  async isAdmin(empId: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
        WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL
      ) AS ok;
    `;
    return Boolean(rows[0]?.ok);
  }

  async flush(actorEmpId: number, includeMasterData: boolean): Promise<FlushResult> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Data flush is switched off on this server. It is meant for the test (QA) server only.');
    }
    if (!(await this.isAdmin(actorEmpId))) throw new ForbiddenException('Only an Admin can flush the data.');

    this.log.warn(`DATA FLUSH started by employee #${actorEmpId} (master data: ${includeMasterData ? 'yes' : 'no'})`);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const admins = await tx.$queryRawUnsafe<Array<{ emp_id: number; name: string; email: string; dep_id: number; role_id: number }>>(
          `SELECT e.emp_id, e.name, e.email, e.dep_id, e.role_id
             FROM employees e JOIN roles r ON r.role_id = e.role_id
            WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL`,
        );
        if (admins.length === 0) throw new UnprocessableEntityException('There is no active Admin to keep, so nothing was deleted.');

        const adminIds = admins.map((a) => a.emp_id);
        const roleIds = [...new Set(admins.map((a) => a.role_id))];
        const roleDeps = await tx.$queryRawUnsafe<Array<{ dep_id: number }>>(`SELECT dep_id FROM roles WHERE role_id = ANY($1::int[])`, roleIds);
        const extraDeps = await tx.$queryRawUnsafe<Array<{ dep_id: number }>>(`SELECT dep_id FROM employee_departments WHERE emp_id = ANY($1::int[])`, adminIds);
        const departmentIds = [...new Set([...admins.map((a) => a.dep_id), ...roleDeps.map((r) => r.dep_id), ...extraDeps.map((d) => d.dep_id)])];

        const tables = (await tx.$queryRawUnsafe<Array<{ tablename: string }>>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)).map((t) => t.tablename);
        const plan = planFlush(tables, { adminIds, departmentIds, roleIds }, includeMasterData);
        const fks = await this.readForeignKeys(tx);
        const fixes = foreignKeyFixes(plan, fks);

        // The no-hard-delete and audit triggers are switched off for this transaction only (it rolls back with it)
        for (const t of tables) await tx.$executeRawUnsafe(`ALTER TABLE ${q(t)} DISABLE TRIGGER USER`);

        // 1. kept rows stop pointing at rows that are about to go
        for (const f of fixes.filter((x) => x.kind === 'null')) await tx.$executeRawUnsafe(f.sql);

        // 2. the deletes; a table that is still referenced is retried after the ones that reference it
        const before = await this.countRows(tx, tables);
        const statements = [...fixes.filter((x: FkFix) => x.kind === 'delete').map((x) => x.sql), ...deleteStatements(plan)];
        await this.runUntilDone(tx, statements);
        const after = await this.countRows(tx, tables);

        for (const t of tables) await tx.$executeRawUnsafe(`ALTER TABLE ${q(t)} ENABLE TRIGGER USER`);

        const gone = Math.max(0, before - after);
        return {
          deleted_rows: gone,
          tables_emptied: plan.deleteAll.length + plan.partial.length,
          kept_admins: admins.map((a) => ({ emp_id: a.emp_id, name: a.name, email: a.email })),
          master_data_flushed: includeMasterData,
        } satisfies FlushResult;
      },
      { timeout: 300_000, maxWait: 20_000 },
    );

    this.log.warn(`DATA FLUSH finished: ${result.deleted_rows} rows removed, ${result.kept_admins.length} admin(s) kept`);
    return result;
  }

  private async readForeignKeys(tx: Tx): Promise<ForeignKey[]> {
    const rows = await tx.$queryRawUnsafe<
      Array<{ child: string; parent: string; child_cols: string[]; parent_cols: string[]; child_not_null: boolean }>
    >(`
      SELECT child.relname AS child, parent.relname AS parent,
             (SELECT array_agg(a.attname ORDER BY k.ord) FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS child_cols,
             (SELECT array_agg(a.attname ORDER BY k.ord) FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS parent_cols,
             (SELECT bool_and(a.attnotnull) FROM unnest(c.conkey) AS k(attnum)
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS child_not_null
        FROM pg_constraint c
        JOIN pg_class child ON child.oid = c.conrelid
        JOIN pg_class parent ON parent.oid = c.confrelid
        JOIN pg_namespace n ON n.oid = child.relnamespace
       WHERE c.contype = 'f' AND n.nspname = 'public'
    `);
    return rows.map((r) => ({ child: r.child, parent: r.parent, childCols: r.child_cols, parentCols: r.parent_cols, childNotNull: Boolean(r.child_not_null) }));
  }

  private async countRows(tx: Tx, tables: string[]): Promise<number> {
    const sql = tables.map((t) => `SELECT count(*)::bigint AS n FROM ${q(t)}`).join(' UNION ALL ');
    const rows = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(sql);
    return rows.reduce((sum, r) => sum + Number(r.n), 0);
  }

  /** Runs every statement; one that fails on a foreign key is put back and tried again after the others. */
  private async runUntilDone(tx: Tx, statements: string[]): Promise<void> {
    let pending = statements;
    for (let pass = 0; pass < MAX_PASSES && pending.length > 0; pass++) {
      const failed: string[] = [];
      let lastError = '';
      for (const sql of pending) {
        await tx.$executeRawUnsafe('SAVEPOINT flush_step');
        try {
          await tx.$executeRawUnsafe(sql);
          await tx.$executeRawUnsafe('RELEASE SAVEPOINT flush_step');
        } catch (err) {
          await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT flush_step');
          failed.push(sql);
          lastError = err instanceof Error ? err.message : String(err);
        }
      }
      if (failed.length === pending.length) {
        throw new UnprocessableEntityException(`The data could not be flushed, nothing was deleted. ${lastError.split('\n').pop() ?? lastError}`);
      }
      pending = failed;
    }
    if (pending.length > 0) throw new UnprocessableEntityException('The data could not be flushed, nothing was deleted (tables depend on each other in a loop).');
  }
}
