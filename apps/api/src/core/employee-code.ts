/**
 * Employee IDs (EMP-0001 ...) are stored on the employee and handed out by the database one by one (see the
 * employee_code migration). Places that only hold an emp_id look the code up here.
 */

/** What the code looked like before it was stored: only a last resort when a row cannot be found. */
export function fallbackEmployeeCode(empId: number): string {
  return `EMP-${String(empId).padStart(4, '0')}`;
}

interface EmployeeCodeSource {
  employees: {
    findMany(args: { where: { emp_id: { in: number[] } }; select: { emp_id: true; employee_code: true } }): Promise<Array<{ emp_id: number; employee_code: string | null }>>;
  };
}

/** emp_id -> "EMP-0007" for every employee asked about (one query for the whole list). */
export async function loadEmployeeCodes(prisma: EmployeeCodeSource, empIds: number[]): Promise<Map<number, string>> {
  const ids = Array.from(new Set(empIds.filter((n) => Number.isInteger(n) && n > 0)));
  if (ids.length === 0) return new Map();
  const rows = await prisma.employees.findMany({ where: { emp_id: { in: ids } }, select: { emp_id: true, employee_code: true } });
  return new Map(rows.map((r) => [r.emp_id, r.employee_code ?? fallbackEmployeeCode(r.emp_id)]));
}
