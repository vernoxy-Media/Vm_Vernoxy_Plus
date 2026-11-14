import { deleteStatements, foreignKeyFixes, planFlush, type ForeignKey } from './flush-plan';

const TABLES = ['employees', 'departments', 'roles', 'employee_credentials', 'auth_sessions', 'tasks', 'projects', 'master_lookup', 'leave_types', 'entity_counters'];
const KEEP = { adminIds: [1], departmentIds: [5], roleIds: [2] };

describe('planFlush', () => {
  it('keeps master data and the organisation structure unless asked to flush them', () => {
    const plan = planFlush(TABLES, KEEP, false);
    expect(plan.deleteAll).toEqual(['entity_counters', 'projects', 'tasks']);
    expect(plan.keptWhole).toEqual(['departments', 'leave_types', 'master_lookup', 'roles']);
    expect(plan.partial.map((p) => p.table)).toEqual(['employees', 'employee_credentials', 'auth_sessions']);
  });

  it('with master data, only what the admin needs stays', () => {
    const plan = planFlush(TABLES, KEEP, true);
    expect(plan.deleteAll).toEqual(['entity_counters', 'leave_types', 'master_lookup', 'projects', 'tasks']);
    expect(plan.keptWhole).toEqual([]);
    expect(plan.partial).toEqual(
      expect.arrayContaining([
        { table: 'departments', keyCol: 'dep_id', ids: [5] },
        { table: 'roles', keyCol: 'role_id', ids: [2] },
        { table: 'employees', keyCol: 'emp_id', ids: [1] },
      ]),
    );
  });

  it('never plans to delete every employee: the admin ids are always the keep list', () => {
    const sql = deleteStatements(planFlush(TABLES, KEEP, false));
    expect(sql).toContain('DELETE FROM "employees" WHERE "emp_id" <> ALL(ARRAY[1]::int[])');
    expect(sql).not.toContain('DELETE FROM "employees"');
  });
});

describe('foreignKeyFixes', () => {
  const fk = (child: string, parent: string, col: string, notNull: boolean, parentCol = 'emp_id'): ForeignKey => ({ child, parent, childCols: [col], parentCols: [parentCol], childNotNull: notNull });

  it('clears a nullable column that points at a deleted employee and deletes rows whose column cannot be empty', () => {
    const plan = planFlush(TABLES, KEEP, false);
    const fixes = foreignKeyFixes(plan, [fk('leave_types', 'employees', 'created_by', false), fk('master_lookup', 'employees', 'owner_id', true)]);
    expect(fixes).toEqual([
      { kind: 'null', sql: 'UPDATE "leave_types" SET "created_by" = NULL WHERE "created_by" IS NOT NULL AND "created_by" <> ALL(ARRAY[1]::int[])' },
      { kind: 'delete', sql: 'DELETE FROM "master_lookup" WHERE "owner_id" IS NOT NULL AND "owner_id" <> ALL(ARRAY[1]::int[])' },
    ]);
  });

  it('clears references to a table that is emptied, and ignores tables that are emptied themselves', () => {
    const plan = planFlush(TABLES, KEEP, false);
    const fixes = foreignKeyFixes(plan, [fk('employees', 'master_lookup', 'gender_id', false, 'lookup_id'), fk('tasks', 'employees', 'created_by', false)]);
    // master_lookup is kept whole here, so employees.gender_id is fine; tasks goes anyway
    expect(fixes).toEqual([]);
    const flushed = foreignKeyFixes(planFlush(TABLES, KEEP, true), [fk('employees', 'master_lookup', 'gender_id', false, 'lookup_id')]);
    expect(flushed).toEqual([{ kind: 'null', sql: 'UPDATE "employees" SET "gender_id" = NULL WHERE "gender_id" IS NOT NULL' }]);
  });
});
