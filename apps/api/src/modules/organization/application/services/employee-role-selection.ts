/**
 * An employee can hold several designations (one or more per selected department).
 * The PRIMARY designation is still stored in employees.role_id (and its department in employees.dep_id)
 * so older code keeps working; the full list lives in employee_roles.
 *
 * - role_ids omitted      -> only the single role_id (old clients)
 * - role_ids given        -> that list; the primary is role_id when it is in the list, else the first one
 */
export function resolveRoleSelection(
  roleId: number | null | undefined,
  roleIds: number[] | undefined,
): { primary: number | null; all: number[] } {
  if (roleIds === undefined) {
    return { primary: roleId ?? null, all: roleId ? [roleId] : [] };
  }
  const all = Array.from(new Set(roleIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)));
  if (roleId && !all.includes(roleId)) all.unshift(roleId);
  const primary = roleId && all.includes(roleId) ? roleId : (all[0] ?? null);
  return { primary, all };
}
