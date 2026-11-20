import { fallbackEmployeeCode, loadEmployeeCodes } from './employee-code';

const prismaWith = (rows: Array<{ emp_id: number; employee_code: string | null }>) => ({
  employees: { findMany: jest.fn().mockResolvedValue(rows) },
});

describe('employee codes', () => {
  it('writes the old form only as a last resort', () => {
    expect(fallbackEmployeeCode(7)).toBe('EMP-0007');
    expect(fallbackEmployeeCode(1234)).toBe('EMP-1234');
  });

  it('looks up the stored code of every employee in one query', async () => {
    const prisma = prismaWith([
      { emp_id: 29, employee_code: 'EMP-0013' },
      { emp_id: 14, employee_code: 'EMP-0004' },
    ]);
    const codes = await loadEmployeeCodes(prisma, [29, 14, 29]);
    expect(codes.get(29)).toBe('EMP-0013');
    expect(codes.get(14)).toBe('EMP-0004');
    expect(prisma.employees.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.employees.findMany.mock.calls[0][0].where.emp_id.in).toEqual([29, 14]);
  });

  it('does not ask the database when there is nobody to look up', async () => {
    const prisma = prismaWith([]);
    expect((await loadEmployeeCodes(prisma, [])).size).toBe(0);
    expect((await loadEmployeeCodes(prisma, [0, -1, NaN])).size).toBe(0);
    expect(prisma.employees.findMany).not.toHaveBeenCalled();
  });

  it('falls back for an employee whose code is not stored yet', async () => {
    const codes = await loadEmployeeCodes(prismaWith([{ emp_id: 5, employee_code: null }]), [5]);
    expect(codes.get(5)).toBe('EMP-0005');
  });
});
