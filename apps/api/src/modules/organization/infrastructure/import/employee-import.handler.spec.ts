import { EmployeeImportHandler, MAX_IMPORT_ROWS } from './employee-import.handler';
import { ConflictDomainError } from '../../domain/errors/organization.errors';
import {
  EMPLOYEE_IMPORT_COLUMNS,
  EmployeeImportColumnKey,
  normalizeHeaderKey,
} from '../../domain/services/employee-import-rules';

const buf = Buffer.from('');

function row(rowNumber: number, values: Partial<Record<EmployeeImportColumnKey, string>>) {
  const cells: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) cells[normalizeHeaderKey(EMPLOYEE_IMPORT_COLUMNS[k as EmployeeImportColumnKey])] = v as string;
  return { rowNumber, cells, warnings: [] as any[] };
}

const validRow = (overrides: Partial<Record<EmployeeImportColumnKey, string>> = {}) => ({
  full_name: 'Asha Rao',
  gender: 'Female',
  phone: '9876543210',
  personal_email: 'asha.p@gmail.com',
  office_email: 'asha@vernoxy.com',
  birth_date: '12-Mar-1995',
  departments: 'Engineering',
  designation: 'Developer',
  employment_type: 'Full-time',
  joining_date: '01-Apr-2024',
  status: 'Active',
  ...overrides,
});

function build(rows: ReturnType<typeof row>[], opts: { existingEmails?: string[]; existingMobiles?: string[] } = {}) {
  const parseWorkbook = jest.fn().mockResolvedValue({
    sheets: new Map([['Employees', rows]]),
    fileErrors: [],
    fileWarnings: [],
  });
  const prisma: any = {
    master_lookup: {
      findMany: jest.fn().mockResolvedValue([
        { lookup_id: 1, lookup_type: 'gender', code: 'female', label: 'Female' },
        { lookup_id: 2, lookup_type: 'gender', code: 'male', label: 'Male' },
        { lookup_id: 10, lookup_type: 'employment_type', code: 'full_time', label: 'Full-time' },
      ]),
    },
    departments: {
      findMany: jest.fn().mockResolvedValue([
        { dep_id: 5, name: 'Engineering', is_active: true },
        { dep_id: 6, name: 'Sales', is_active: true },
        { dep_id: 7, name: 'Old Dept', is_active: false },
        { dep_id: 8, name: 'Admin', is_active: true },
        { dep_id: 9, name: 'Finance & Accounts', is_active: true },
      ]),
    },
    roles: {
      findMany: jest.fn().mockResolvedValue([
        { role_id: 50, role_name: 'Developer', dep_id: 5, is_active: true },
        { role_id: 60, role_name: 'Sales Executive', dep_id: 6, is_active: true },
        { role_id: 80, role_name: 'Admin', dep_id: 8, is_active: true },
        { role_id: 90, role_name: 'Accountant', dep_id: 9, is_active: true },
        { role_id: 91, role_name: 'Finance Manager', dep_id: 9, is_active: true },
      ]),
    },
    leave_policies: { findMany: jest.fn().mockResolvedValue([{ policy_id: 3, name: 'Standard' }]) },
    attendance_shifts: { findMany: jest.fn().mockResolvedValue([{ shift_id: 9, shift_code: 'SHF-001', shift_name: 'General Shift' }]) },
    employees: {
      findMany: jest.fn().mockResolvedValue([
        ...(opts.existingEmails ?? []).map((e) => ({ email: e, mob: '0000000000' })),
        ...(opts.existingMobiles ?? []).map((m) => ({ email: `x${m}@x.com`, mob: m })),
      ]),
    },
    app_settings: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const createEmployee = { execute: jest.fn().mockResolvedValue({ emp_id: 77, employee_code: 'EMP-0077' }) };
  const handler = new EmployeeImportHandler(prisma, { parseWorkbook } as any, { parseWorkbook } as any, createEmployee as any);
  return { handler, prisma, createEmployee, parseWorkbook };
}

const codes = (r: { issues: Array<{ code: string }> }) => r.issues.map((i) => i.code);

describe('EmployeeImportHandler', () => {
  describe('previewFile (nothing is saved)', () => {
    it('accepts a good row and reports one employee to create', async () => {
      const { handler, createEmployee } = build([row(2, validRow())]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.willCreate).toBe(1);
      expect(r.errorRows).toBe(0);
      expect(r.canImport).toBe(true);
      expect(createEmployee.execute).not.toHaveBeenCalled();
    });

    it('skips a row whose status is not Active, with a warning', async () => {
      const { handler } = build([row(2, validRow({ status: 'Inactive' })), row(3, validRow({ office_email: 'b@vernoxy.com', phone: '9876543211' }))]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.willSkip).toBe(1);
      expect(r.willCreate).toBe(1);
      expect(r.issues.find((i) => i.code === 'NOT_ACTIVE_SKIPPED')?.row).toBe(2);
      expect(r.errorRows).toBe(0);
    });

    it('reports every missing required column of a row', async () => {
      // A real sheet has every header, with the cells left empty
      const blank = Object.fromEntries(Object.keys(EMPLOYEE_IMPORT_COLUMNS).map((k) => [k, ''])) as Record<EmployeeImportColumnKey, string>;
      const { handler } = build([row(2, { ...blank, full_name: 'Asha Rao', status: 'Active' })]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.issues.filter((i) => i.code === 'REQUIRED').length).toBeGreaterThanOrEqual(8);
      expect(r.canImport).toBe(false);
    });

    it('rejects an office email or phone already in the system', async () => {
      const { handler } = build([row(2, validRow())], { existingEmails: ['asha@vernoxy.com'], existingMobiles: ['9876543210'] });
      expect(codes(await handler.previewFile('xlsx', buf, false))).toEqual(expect.arrayContaining(['EMAIL_EXISTS', 'MOBILE_EXISTS']));
    });

    it('rejects the second of two rows with the same email in the file', async () => {
      const { handler } = build([row(2, validRow()), row(3, validRow({ phone: '9876543299' }))]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.issues.find((i) => i.code === 'DUPLICATE_IN_FILE')?.row).toBe(3);
      expect(r.willCreate).toBe(1);
    });

    it('rejects a designation that is not in the row departments', async () => {
      const { handler } = build([row(2, validRow({ designation: 'Sales Executive' }))]);
      expect(codes(await handler.previewFile('xlsx', buf, false))).toContain('DESIGNATION_DEPARTMENT_MISMATCH');
    });

    it('accepts several departments and several designations separated by ;', async () => {
      const { handler, createEmployee } = build([
        row(2, validRow({ departments: 'Admin; Finance & Accounts', designation: 'Admin; Accountant; Finance Manager' })),
      ]);
      expect((await handler.previewFile('xlsx', buf, false)).willCreate).toBe(1);

      await handler.importFile('xlsx', buf, 1, false);
      const cmd = createEmployee.execute.mock.calls[0][0];
      expect(cmd.department_ids).toEqual([8, 9]);
      expect(cmd.dep_id).toBe(8);
      // The first designation is the main one, like the first chosen in the form
      expect(cmd.role_id).toBe(80);
      expect(cmd.role_ids).toEqual([80, 90, 91]);
    });

    it('rejects the row when one of several designations is not in the departments given', async () => {
      const { handler } = build([row(2, validRow({ departments: 'Admin', designation: 'Admin; Accountant' }))]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.issues.find((i) => i.code === 'DESIGNATION_DEPARTMENT_MISMATCH')?.message).toContain('Accountant');
      expect(r.willCreate).toBe(0);
    });

    it('rejects a department name written in the Designation column', async () => {
      const { handler } = build([row(2, validRow({ departments: 'Engineering; Finance & Accounts', designation: 'Developer; Finance & Accounts' }))]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.issues.find((i) => i.code === 'UNKNOWN_DESIGNATION')?.message).toContain('Finance & Accounts');
      expect(r.willCreate).toBe(0);
    });

    it('counts a repeated designation once', async () => {
      const { handler, createEmployee } = build([row(2, validRow({ departments: 'Finance & Accounts', designation: 'Accountant; Accountant' }))]);
      await handler.importFile('xlsx', buf, 1, false);
      expect(createEmployee.execute.mock.calls[0][0].role_ids).toEqual([90]);
    });

    it('rejects unknown master data by name', async () => {
      const { handler } = build([
        row(2, validRow({ gender: 'Robot', departments: 'Nowhere', employment_type: 'Eternal', leave_policy: 'Ghost', shift: 'Night?' })),
      ]);
      expect(codes(await handler.previewFile('xlsx', buf, false))).toEqual(
        expect.arrayContaining(['UNKNOWN_GENDER', 'UNKNOWN_DEPARTMENT', 'UNKNOWN_EMPLOYMENT_TYPE', 'UNKNOWN_LEAVE_POLICY', 'UNKNOWN_SHIFT']),
      );
    });

    it('rejects an inactive department and an under-age employee', async () => {
      const { handler } = build([row(2, validRow({ departments: 'Old Dept', birth_date: '01-Jan-2015' }))]);
      expect(codes(await handler.previewFile('xlsx', buf, false))).toEqual(expect.arrayContaining(['DEPARTMENT_INACTIVE', 'UNDERAGE']));
    });

    it('warns that the reporting manager is ignored, without failing the row', async () => {
      const { handler } = build([row(2, validRow({ reporting_manager: 'Someone' }))]);
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.issues.find((i) => i.code === 'REPORTING_MANAGER_IGNORED')?.severity).toBe('warning');
      expect(r.willCreate).toBe(1);
    });

    it('rejects a fixed OT rate, which the template cannot carry', async () => {
      const { handler } = build([row(2, validRow({ ot_rate_calculation: 'Fixed' }))]);
      expect(codes(await handler.previewFile('xlsx', buf, false))).toContain('OT_FIXED_NEEDS_AMOUNT');
    });

    it('lets valid rows through only when invalid rows may be skipped', async () => {
      const rows = [row(2, validRow()), row(3, validRow({ office_email: 'bad', phone: '9876543288' }))];
      expect((await build(rows).handler.previewFile('xlsx', buf, false)).canImport).toBe(false);
      expect((await build(rows).handler.previewFile('xlsx', buf, true)).canImport).toBe(true);
    });

    it('reads a sheet that is not named Employees (Sheet1)', async () => {
      const { handler, parseWorkbook } = build([]);
      parseWorkbook.mockResolvedValueOnce({ sheets: new Map([['Sheet1', [row(2, validRow())]]]), fileErrors: [], fileWarnings: [] });
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.fileErrors).toEqual([]);
      expect(r.willCreate).toBe(1);
    });

    it('names the required columns that a differently named sheet is missing', async () => {
      const { handler, parseWorkbook } = build([]);
      const { phone: _p, birth_date: _b, ...withoutTwo } = validRow();
      parseWorkbook.mockResolvedValueOnce({ sheets: new Map([['Sheet1', [row(2, withoutTwo)]]]), fileErrors: [], fileWarnings: [] });
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.canImport).toBe(false);
      expect(r.fileErrors[0]).toMatch(/Phone Number.*Birth Date|Birth Date.*Phone Number/);
    });

    it('returns file errors without reading any row', async () => {
      const { handler, parseWorkbook } = build([]);
      parseWorkbook.mockResolvedValueOnce({ sheets: new Map(), fileErrors: [{ code: 'MISSING_COLUMNS', message: 'missing' }], fileWarnings: [] });
      const r = await handler.previewFile('xlsx', buf, false);
      expect(r.fileErrors).toEqual(['missing']);
      expect(r.canImport).toBe(false);
    });

    it(`refuses a file of more than ${MAX_IMPORT_ROWS} rows`, async () => {
      const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) =>
        row(i + 2, validRow({ office_email: `p${i}@vernoxy.com`, phone: `98765${String(10000 + i)}` })),
      );
      const r = await build(rows).handler.previewFile('xlsx', buf, false);
      expect(r.canImport).toBe(false);
      expect(r.fileErrors[0]).toMatch(/at most 100 rows/);
    });
  });

  describe('importFile', () => {
    it('sends the welcome email to a created employee when asked to', async () => {
      const { handler, createEmployee } = build([row(2, validRow())]);
      const r = await handler.importFile('xlsx', buf, 1, false, true);
      expect(createEmployee.execute.mock.calls[0][0].skip_welcome_email).toBe(false);
      expect(r).toMatchObject({ welcomeEmailRequested: true, welcomeEmailCount: 1 });
      expect(r.rows[0].welcomeEmail).toBe('requested');
    });

    it('says in the result that no email was requested when it is switched off', async () => {
      const { handler } = build([row(2, validRow())]);
      const r = await handler.importFile('xlsx', buf, 1, false, false);
      expect(r).toMatchObject({ welcomeEmailRequested: false, welcomeEmailCount: 0 });
      expect(r.rows[0].welcomeEmail).toBe('not_requested');
    });

    it('counts the welcome email only for the employees that were created', async () => {
      const { handler, createEmployee } = build([
        row(2, validRow()),
        row(3, validRow({ office_email: 'b@vernoxy.com', phone: '9876543231' })),
        row(4, validRow({ status: 'Resigned', office_email: 'c@vernoxy.com', phone: '9876543232' })),
      ]);
      createEmployee.execute
        .mockResolvedValueOnce({ emp_id: 77, employee_code: 'EMP-0077' })
        .mockRejectedValueOnce(new ConflictDomainError('EMAIL_EXISTS', 'This email already belongs to EMP-0001.', 'email'));
      const r = await handler.importFile('xlsx', buf, 1, true, true);
      expect(r).toMatchObject({ created: 1, failed: 1, skipped: 1, welcomeEmailCount: 1 });
      // Only the created row carries a welcome email status
      expect(r.rows.filter((x) => x.welcomeEmail).map((x) => x.rowNumber)).toEqual([2]);
    });

    it('mails only the employees that are created: not a skipped (not Active) row, not a failed one', async () => {
      const { handler, createEmployee } = build([
        row(2, validRow()),
        row(3, validRow({ status: 'Resigned', office_email: 'gone@vernoxy.com', phone: '9876543201' })),
        row(4, validRow({ office_email: 'c@vernoxy.com', phone: '9876543202' })),
      ]);
      createEmployee.execute
        .mockResolvedValueOnce({ emp_id: 77, employee_code: 'EMP-0077' })
        .mockRejectedValueOnce(new ConflictDomainError('MOBILE_EXISTS', 'An employee with this mobile number already exists', 'mob'));

      const r = await handler.importFile('xlsx', buf, 1, true, true);

      // Only rows 2 and 4 reach the create step (the Resigned row never does), and row 4 fails there
      expect(createEmployee.execute).toHaveBeenCalledTimes(2);
      expect(createEmployee.execute.mock.calls.map((c) => c[0].office_email)).toEqual(['asha@vernoxy.com', 'c@vernoxy.com']);
      expect(r).toMatchObject({ created: 1, skipped: 1, failed: 1 });
    });

    it('does not put the temporary password in the result', async () => {
      const { handler, createEmployee } = build([row(2, validRow())]);
      const r = await handler.importFile('xlsx', buf, 1, false, true);
      const password = createEmployee.execute.mock.calls[0][0].password as string;
      expect(JSON.stringify(r)).not.toContain(password);
    });

    it('creates the employee without a welcome email (the default) and with a one-time password', async () => {
      const { handler, createEmployee } = build([row(2, validRow({ shift: 'General Shift', leave_policy: 'Standard' }))]);
      const r = await handler.importFile('xlsx', buf, 1, false);

      expect(r).toMatchObject({ imported: true, created: 1, failed: 0, skipped: 0 });
      const cmd = createEmployee.execute.mock.calls[0][0];
      expect(cmd.skip_welcome_email).toBe(true);
      expect(cmd.acting_admin_id).toBe(1);
      expect(cmd.password).toHaveLength(14);
      expect(cmd.dep_id).toBe(5);
      expect(cmd.role_id).toBe(50);
      expect(cmd.leave_policy_id).toBe(3);
      expect(cmd.reporting_manager).toBeNull();
      expect(r.rows[0]).toMatchObject({ status: 'created', employeeCode: 'EMP-0077' });
    });

    it('assigns the shift through the attendance setting', async () => {
      const { handler, prisma } = build([row(2, validRow({ shift: 'General Shift' }))]);
      await handler.importFile('xlsx', buf, 1, false);
      const saved = prisma.app_settings.create.mock.calls[0][0].data;
      expect(saved.setting_key).toBe('attendance_employee_shifts');
      expect(JSON.parse(saved.setting_value)).toEqual({ '77': 9 });
    });

    it('creates nobody when the file has errors and invalid rows may not be skipped', async () => {
      const { handler, createEmployee } = build([row(2, validRow()), row(3, validRow({ office_email: 'bad', phone: '9876543288' }))]);
      const r = await handler.importFile('xlsx', buf, 1, false);
      expect(r.imported).toBe(false);
      expect(r.reason).toMatch(/errors/);
      expect(createEmployee.execute).not.toHaveBeenCalled();
    });

    it('creates the valid rows and reports the invalid ones when invalid rows may be skipped', async () => {
      const { handler, createEmployee } = build([row(2, validRow()), row(3, validRow({ office_email: 'bad', phone: '9876543288' }))]);
      const r = await handler.importFile('xlsx', buf, 1, true);
      expect(createEmployee.execute).toHaveBeenCalledTimes(1);
      expect(r).toMatchObject({ imported: true, created: 1, failed: 1 });
      expect(r.rows.find((x) => x.rowNumber === 3)?.status).toBe('failed');
    });

    it('does not create or mail anything for a skipped (not Active) row, and still reports it', async () => {
      const { handler, createEmployee } = build([row(2, validRow({ status: 'Resigned' })), row(3, validRow({ office_email: 'b@vernoxy.com', phone: '9876543266' }))]);
      const r = await handler.importFile('xlsx', buf, 1, false);
      expect(createEmployee.execute).toHaveBeenCalledTimes(1);
      expect(r.skipped).toBe(1);
      expect(r.rows.find((x) => x.rowNumber === 2)).toMatchObject({ status: 'skipped', code: 'NOT_ACTIVE_SKIPPED' });
    });

    it('imports nothing from a file that only has skipped rows', async () => {
      const { handler, createEmployee } = build([row(2, validRow({ status: 'Resigned' }))]);
      const r = await handler.importFile('xlsx', buf, 1, false);
      expect(r.imported).toBe(false);
      expect(createEmployee.execute).not.toHaveBeenCalled();
    });

    it('reports a failure of one row and carries on with the next', async () => {
      const { handler, createEmployee } = build([
        row(2, validRow()),
        row(3, validRow({ office_email: 'b@vernoxy.com', phone: '9876543277' })),
      ]);
      createEmployee.execute
        .mockRejectedValueOnce(new ConflictDomainError('EMAIL_EXISTS', 'This email already belongs to EMP-0001.', 'email'))
        .mockResolvedValueOnce({ emp_id: 78, employee_code: 'EMP-0078' });
      const r = await handler.importFile('xlsx', buf, 1, false);
      expect(r).toMatchObject({ created: 1, failed: 1 });
      expect(r.rows.find((x) => x.rowNumber === 2)).toMatchObject({ status: 'failed', code: 'EMAIL_EXISTS' });
    });

    it('keeps the text of an unexpected error out of the result', async () => {
      const { handler, createEmployee } = build([row(2, validRow())]);
      createEmployee.execute.mockRejectedValueOnce(new Error('insert into employees ... account 123456789012'));
      const r = await handler.importFile('xlsx', buf, 1, false);
      expect(r.rows[0].code).toBe('INTERNAL_ERROR');
      expect(r.rows[0].message).not.toContain('123456789012');
    });

    it('lists every created employee with the new Employee ID', async () => {
      const { handler } = build([row(2, validRow())]);
      const r = await handler.importFile('xlsx', buf, 1, false);
      expect(r.rows[0].employeeCode).toBe('EMP-0077');
      expect(r.rows[0].message).toContain('asha@vernoxy.com');
    });

    it('refuses a file of more than the row limit and creates nobody', async () => {
      const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) =>
        row(i + 2, validRow({ office_email: `p${i}@vernoxy.com`, phone: `98765${String(10000 + i)}` })),
      );
      const { handler, createEmployee } = build(rows);
      const r = await handler.importFile('xlsx', buf, 1, true);
      expect(r.imported).toBe(false);
      expect(createEmployee.execute).not.toHaveBeenCalled();
    });
  });
});
