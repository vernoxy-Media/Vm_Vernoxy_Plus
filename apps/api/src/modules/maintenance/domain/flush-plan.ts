/**
 * Which tables a data flush empties and which rows it must keep.
 * Pure: it only decides; the service runs the SQL.
 */

/** Setup data: the lists and policies the Admin configures in Settings. Emptied only when the Admin also asks for master data. */
export const MASTER_TABLES: ReadonlySet<string> = new Set([
  'master_lookup',
  'industries',
  'customer_types',
  'pipeline_stages',
  'app_settings',
  'attendance_statuses',
  'attendance_shifts',
  'attendance_punch_locations',
  'company_holidays',
  'employee_pay_policies',
  'payroll_settings',
  'document_templates',
  'leave_general_settings',
  'leave_policies',
  'leave_policy_rules',
  'leave_types',
  'expense_authorised_approvers',
  'expense_categories',
  'expense_general_settings',
  'expense_types',
  'complaint_types',
  'complaint_settings',
  'software_license_categories',
  'software_license_vendors',
  'software_license_settings',
  'software_license_terms',
  'kb_categories',
]);

/** Rows of these tables that belong to a kept Admin (matched on the employee id). */
export const ADMIN_OWNED_TABLES = ['employee_credentials', 'auth_sessions', 'employee_departments', 'sales_user_rights'] as const;

export interface KeepIds {
  /** Active employees whose role is an admin role. They are never deleted. */
  adminIds: number[];
  /** The departments and roles those admins need to exist. */
  departmentIds: number[];
  roleIds: number[];
}

export interface PartialKeep {
  table: string;
  /** The column that identifies the row (the primary key, or emp_id for rows owned by an Admin). */
  keyCol: string;
  /** Only rows with these values stay. */
  ids: number[];
}

export interface FlushPlan {
  /** Every row goes. */
  deleteAll: string[];
  /** Some rows stay. */
  partial: PartialKeep[];
  /** Untouched (master data when it is not being flushed). */
  keptWhole: string[];
}

/** A foreign key as read from the catalog. */
export interface ForeignKey {
  child: string;
  parent: string;
  childCols: string[];
  parentCols: string[];
  /** True when every child column is NOT NULL. */
  childNotNull: boolean;
}

export type FkFix = { kind: 'null'; sql: string } | { kind: 'delete'; sql: string };

export const q = (ident: string): string => `"${ident.replace(/"/g, '""')}"`;

export function planFlush(allTables: string[], keep: KeepIds, includeMasterData: boolean): FlushPlan {
  const present = new Set(allTables);
  const partial: PartialKeep[] = [{ table: 'employees', keyCol: 'emp_id', ids: keep.adminIds }];
  if (includeMasterData) {
    partial.push({ table: 'departments', keyCol: 'dep_id', ids: keep.departmentIds });
    partial.push({ table: 'roles', keyCol: 'role_id', ids: keep.roleIds });
  }
  for (const t of ADMIN_OWNED_TABLES) if (present.has(t)) partial.push({ table: t, keyCol: 'emp_id', ids: keep.adminIds });

  const partialNames = new Set(partial.map((p) => p.table));
  // Departments and roles are organisation structure: they stay whole unless master data is flushed too
  const structure = includeMasterData ? new Set<string>() : new Set(['departments', 'roles']);

  const deleteAll: string[] = [];
  const keptWhole: string[] = [];
  for (const t of allTables) {
    if (partialNames.has(t)) continue;
    if (structure.has(t) || (!includeMasterData && MASTER_TABLES.has(t))) keptWhole.push(t);
    else deleteAll.push(t);
  }
  return { deleteAll: deleteAll.sort(), partial, keptWhole: keptWhole.sort() };
}

const idList = (ids: number[]) => (ids.length ? `ARRAY[${ids.map((n) => Math.trunc(n)).join(',')}]::int[]` : `ARRAY[]::int[]`);

/**
 * A row that stays must not point at a row that goes. For every single-column foreign key of a kept table:
 * the column is cleared when it may be empty, otherwise the row itself goes.
 */
export function foreignKeyFixes(plan: FlushPlan, fks: ForeignKey[]): FkFix[] {
  const deleteAll = new Set(plan.deleteAll);
  const partial = new Map(plan.partial.map((p) => [p.table, p]));
  const fixes: FkFix[] = [];

  for (const fk of fks) {
    if (deleteAll.has(fk.child)) continue; // the whole table goes anyway
    if (fk.childCols.length !== 1 || fk.parentCols.length !== 1) continue; // composite keys point at rows that are kept together
    const col = q(fk.childCols[0]!);

    let invalid: string | null = null;
    if (deleteAll.has(fk.parent)) {
      invalid = `${col} IS NOT NULL`;
    } else {
      const p = partial.get(fk.parent);
      if (p && p.keyCol === fk.parentCols[0]) invalid = `${col} IS NOT NULL AND ${col} <> ALL(${idList(p.ids)})`;
    }
    if (!invalid) continue;

    fixes.push(
      fk.childNotNull
        ? { kind: 'delete', sql: `DELETE FROM ${q(fk.child)} WHERE ${invalid}` }
        : { kind: 'null', sql: `UPDATE ${q(fk.child)} SET ${col} = NULL WHERE ${invalid}` },
    );
  }
  return fixes;
}

/** The statements that empty the tables and trim the partly kept ones, in no particular order (the runner retries around foreign keys). */
export function deleteStatements(plan: FlushPlan): string[] {
  return [
    ...plan.deleteAll.map((t) => `DELETE FROM ${q(t)}`),
    ...plan.partial.map((p) => `DELETE FROM ${q(p.table)} WHERE ${q(p.keyCol)} <> ALL(${idList(p.ids)})`),
  ];
}
