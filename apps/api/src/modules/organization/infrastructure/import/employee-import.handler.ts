import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CsvSpreadsheetAdapter, ExcelJsSpreadsheetAdapter } from '../../../data-transfer/public-api';
import { CreateEmployeeCommand, CreateEmployeeUseCase } from '../../application/use-cases/create-employee.use-case';
import { DomainError } from '../../domain/errors/organization.errors';
import { OrganizationNormalizationService } from '../../domain/services/organization-normalization.service';
import { assertAmount, assertPersonName, normalizeEmergencyContacts } from '../../domain/services/employee-input-rules';
import {
  EMPLOYEE_IMPORT_COLUMNS,
  EMPLOYEE_IMPORT_REQUIRED,
  EmployeeImportColumnKey,
  classifyStatus,
  generateTemporaryPassword,
  mapOtRateType,
  mapPaymentMode,
  normalizeHeaderKey,
  parseAmountCell,
  parseImportDate,
  readCell,
  splitList,
} from '../../domain/services/employee-import-rules';

const SHEET = 'Employees';
/**
 * The import runs while the admin waits, so a file is kept small: every new employee gets a password that is hashed,
 * which takes a moment each. A bigger list is imported as several files.
 */
export const MAX_IMPORT_ROWS = 100;
const SHIFT_SETTING_KEY = 'attendance_employee_shifts';

type EmployeeCommandInput = Omit<CreateEmployeeCommand, 'password' | 'acting_admin_id' | 'skip_welcome_email'>;

export type ImportFileFormat = 'xlsx' | 'csv';

interface ImportIssue {
  row: number;
  sheet: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  field?: string;
}

export interface EmployeeImportPreview {
  totalRows: number;
  willCreate: number;
  willSkip: number;
  warningRows: number;
  errorRows: number;
  issues: Array<{ row: number; field: string; code: string; message: string; severity: 'error' | 'warning' }>;
  fileErrors: string[];
  /** The employees would be created if the file were imported now */
  canImport: boolean;
}

export interface EmployeeImportRowResult {
  rowNumber: number;
  status: 'created' | 'skipped' | 'failed';
  code?: string;
  message?: string;
  employeeCode?: string;
  /**
   * Set on a created row only. "requested" means the welcome email was handed to the mail server, the same call the
   * Add Employee form makes. Whether it arrives is up to the mail server, as it is for the form.
   */
  welcomeEmail?: 'requested' | 'not_requested';
}

export interface EmployeeImportOutcome {
  imported: boolean;
  /** Why nothing was imported, when imported is false */
  reason?: string;
  created: number;
  skipped: number;
  failed: number;
  /** Whether the admin asked for the welcome email, and for how many created employees it was requested */
  welcomeEmailRequested: boolean;
  welcomeEmailCount: number;
  rows: EmployeeImportRowResult[];
}

export interface PreparedEmployeeItem {
  rowNumber: number;
  displayName: string;
  officeEmail: string;
  shiftId: number | null;
  /** A row that will not be created: it is only carried so the final report lists it */
  preflight?: { status: 'skipped' | 'failed'; code: string; message: string };
  command?: EmployeeCommandInput;
}

interface Lookups {
  genders: Map<string, number>;
  employmentTypes: Map<string, number>;
  departments: Map<string, { id: number; active: boolean }>;
  rolesByName: Map<string, Array<{ id: number; depId: number; active: boolean }>>;
  leavePolicies: Map<string, number>;
  shifts: Map<string, number>;
  existingEmails: Set<string>;
  existingMobiles: Set<string>;
}

interface Analysis {
  fileErrors: Array<{ code: string; message: string }>;
  items: PreparedEmployeeItem[];
  issues: ImportIssue[];
  validCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
}

const lc = (s: string) => s.trim().toLowerCase();

function ageOn(birth: Date, today: Date): number {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

@Injectable()
export class EmployeeImportHandler {
  private readonly logger = new Logger(EmployeeImportHandler.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ExcelJsSpreadsheetAdapter) private readonly excelAdapter: ExcelJsSpreadsheetAdapter,
    @Inject(CsvSpreadsheetAdapter) private readonly csvAdapter: CsvSpreadsheetAdapter,
    @Inject(CreateEmployeeUseCase) private readonly createEmployee: CreateEmployeeUseCase,
  ) {}

  /** Reads and checks the file. Nothing is saved. */
  async previewFile(format: ImportFileFormat, fileBuffer: Buffer, skipInvalidRows: boolean): Promise<EmployeeImportPreview> {
    const a = await this.analyze(format, fileBuffer);

    if (a.fileErrors.length > 0) {
      return {
        totalRows: 0,
        willCreate: 0,
        willSkip: 0,
        warningRows: 0,
        errorRows: a.fileErrors.length,
        issues: [],
        fileErrors: a.fileErrors.map((e) => e.message),
        canImport: false,
      };
    }

    const tooMany = a.items.length > MAX_IMPORT_ROWS;
    return {
      totalRows: a.items.length,
      willCreate: a.validCount,
      willSkip: a.skippedCount,
      warningRows: a.warningCount,
      errorRows: a.errorCount,
      issues: a.issues.map((i) => ({ row: i.row, field: i.field ?? '', code: i.code, message: i.message, severity: i.severity })),
      fileErrors: tooMany ? [`The file has ${a.items.length} rows. Import at most ${MAX_IMPORT_ROWS} rows at a time: split it into smaller files`] : [],
      canImport: !tooMany && a.validCount > 0 && (a.errorCount === 0 || skipInvalidRows),
    };
  }

  /**
   * Reads the file and creates the employees in it, one by one. A row that fails does not stop the others.
   * With sendWelcomeEmail every employee that is created gets the welcome email with the one-time password. Only Active
   * rows are ever created, so only Active employees are mailed: a skipped or failed row gets nothing.
   */
  async importFile(
    format: ImportFileFormat,
    fileBuffer: Buffer,
    adminEmpId: number,
    skipInvalidRows: boolean,
    sendWelcomeEmail = false,
  ): Promise<EmployeeImportOutcome> {
    const none = (reason: string): EmployeeImportOutcome => ({
      imported: false,
      reason,
      created: 0,
      skipped: 0,
      failed: 0,
      welcomeEmailRequested: sendWelcomeEmail,
      welcomeEmailCount: 0,
      rows: [],
    });

    const a = await this.analyze(format, fileBuffer);
    if (a.fileErrors.length > 0) return none(a.fileErrors[0].message);
    if (a.items.length > MAX_IMPORT_ROWS) {
      return none(`The file has ${a.items.length} rows. Import at most ${MAX_IMPORT_ROWS} rows at a time: split it into smaller files`);
    }
    if (a.errorCount > 0 && !skipInvalidRows) {
      return none('The file has rows with errors. Fix them, or choose to import only the valid rows');
    }
    if (a.validCount === 0) return none('There is no valid Active employee to import in this file');

    const rows: EmployeeImportRowResult[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of a.items) {
      if (item.preflight) {
        rows.push({ rowNumber: item.rowNumber, status: item.preflight.status, code: item.preflight.code, message: item.preflight.message });
        if (item.preflight.status === 'skipped') skipped++;
        else failed++;
        continue;
      }

      try {
        const employee = await this.createEmployee.execute({
          ...(item.command as EmployeeCommandInput),
          // A one-time password, changed at the first sign in. It is only ever sent in the welcome email (when asked
          // for): it is not written to the report or the log
          password: generateTemporaryPassword(),
          skip_welcome_email: !sendWelcomeEmail,
          acting_admin_id: adminEmpId,
        });

        if (item.shiftId) await this.assignShift(employee.emp_id, item.shiftId, adminEmpId);

        const employeeCode =
          (employee as { employee_code?: string }).employee_code ?? `EMP-${String(employee.emp_id).padStart(4, '0')}`;
        rows.push({
          rowNumber: item.rowNumber,
          status: 'created',
          message: `${item.displayName} (${item.officeEmail})`,
          employeeCode,
          welcomeEmail: sendWelcomeEmail ? 'requested' : 'not_requested',
        });
        created++;
      } catch (err) {
        failed++;
        if (err instanceof DomainError) {
          rows.push({ rowNumber: item.rowNumber, status: 'failed', code: err.code, message: err.message });
        } else {
          // Anything unexpected is logged by type only: its text can hold personal data (salary, bank account), so it
          // stays out of the result and out of the log
          this.logger.error(`Employee import row ${item.rowNumber} failed with ${(err as Error)?.name ?? 'an unknown error'}`);
          rows.push({ rowNumber: item.rowNumber, status: 'failed', code: 'INTERNAL_ERROR', message: 'Could not be created because of an unexpected error' });
        }
      }
    }

    return {
      imported: created > 0,
      created,
      skipped,
      failed,
      welcomeEmailRequested: sendWelcomeEmail,
      welcomeEmailCount: sendWelcomeEmail ? created : 0,
      rows: rows.sort((x, y) => x.rowNumber - y.rowNumber),
    };
  }

  // ---------------------------------------------------------------------------------------------------------------

  /** Writes the shift the same way the Attendance settings screen does (one JSON map of employee id -> shift id). */
  private async assignShift(empId: number, shiftId: number, adminEmpId: number): Promise<void> {
    const existing = await this.prisma.app_settings.findFirst({
      where: { setting_key: { equals: SHIFT_SETTING_KEY, mode: 'insensitive' }, deleted_at: null },
    });
    let map: Record<string, number> = {};
    if (existing) {
      try {
        const parsed = JSON.parse(existing.setting_value);
        if (parsed && typeof parsed === 'object') map = parsed;
      } catch {
        map = {};
      }
    }
    map[String(empId)] = shiftId;

    if (existing) {
      await this.prisma.app_settings.update({
        where: { setting_id: existing.setting_id },
        data: { setting_value: JSON.stringify(map), updated_by: adminEmpId, updated_at: new Date() },
      });
    } else {
      await this.prisma.app_settings.create({
        data: { setting_key: SHIFT_SETTING_KEY, setting_value: JSON.stringify(map), created_by: adminEmpId },
      });
    }
  }

  private async loadLookups(): Promise<Lookups> {
    const [lookups, departments, roles, policies, shifts, employees] = await Promise.all([
      this.prisma.master_lookup.findMany({
        where: { lookup_type: { in: ['gender', 'employment_type'] }, deleted_at: null, is_active: true },
        select: { lookup_id: true, lookup_type: true, code: true, label: true },
      }),
      this.prisma.departments.findMany({ where: { deleted_at: null }, select: { dep_id: true, name: true, is_active: true } }),
      this.prisma.roles.findMany({ where: { deleted_at: null }, select: { role_id: true, role_name: true, dep_id: true, is_active: true } }),
      this.prisma.leave_policies.findMany({ where: { status: 'ACTIVE' }, select: { policy_id: true, name: true } }),
      this.prisma.attendance_shifts.findMany({
        where: { deleted_at: null, is_active: true },
        select: { shift_id: true, shift_code: true, shift_name: true },
      }),
      this.prisma.employees.findMany({ where: { deleted_at: null }, select: { email: true, mob: true } }),
    ]);

    const genders = new Map<string, number>();
    const employmentTypes = new Map<string, number>();
    for (const l of lookups) {
      const target = l.lookup_type === 'gender' ? genders : employmentTypes;
      target.set(lc(l.label), l.lookup_id);
      target.set(lc(l.code), l.lookup_id);
    }

    const departmentMap = new Map<string, { id: number; active: boolean }>();
    departments.forEach((d) => departmentMap.set(lc(d.name), { id: d.dep_id, active: d.is_active }));

    const rolesByName = new Map<string, Array<{ id: number; depId: number; active: boolean }>>();
    roles.forEach((r) => {
      const key = lc(r.role_name);
      if (!rolesByName.has(key)) rolesByName.set(key, []);
      rolesByName.get(key)!.push({ id: r.role_id, depId: r.dep_id, active: r.is_active });
    });

    const leavePolicies = new Map<string, number>();
    policies.forEach((p) => leavePolicies.set(lc(p.name), p.policy_id));

    const shiftMap = new Map<string, number>();
    shifts.forEach((s) => {
      shiftMap.set(lc(s.shift_name), s.shift_id);
      shiftMap.set(lc(s.shift_code), s.shift_id);
    });

    return {
      genders,
      employmentTypes,
      departments: departmentMap,
      rolesByName,
      leavePolicies,
      shifts: shiftMap,
      existingEmails: new Set(employees.map((e) => lc(e.email))),
      existingMobiles: new Set(employees.map((e) => e.mob)),
    };
  }

  private async analyze(format: ImportFileFormat, fileBuffer: Buffer): Promise<Analysis> {
    const adapter = format === 'csv' ? this.csvAdapter : this.excelAdapter;
    const requiredHeaders = EMPLOYEE_IMPORT_REQUIRED.map((k) => EMPLOYEE_IMPORT_COLUMNS[k]);
    const parsed = await adapter.parseWorkbook(fileBuffer, format, {
      phoneColumns: [EMPLOYEE_IMPORT_COLUMNS.phone, EMPLOYEE_IMPORT_COLUMNS.emergency_phone],
      // The sheet may carry any name (Sheet1, Employees...): the first one with data is read. The required columns of a
      // sheet named "Employees" are checked by the reader, those of any other sheet just below.
      requiredColumnsBySheet: { [SHEET.toLowerCase()]: requiredHeaders },
      maxRowsBySheet: { [SHEET.toLowerCase()]: 2000 },
      maxColumns: 60,
      maxCellLength: 500,
    });

    const empty: Analysis = { fileErrors: parsed.fileErrors, items: [], issues: [], validCount: 0, skippedCount: 0, errorCount: 0, warningCount: 0 };
    if (parsed.fileErrors.length > 0) return empty;

    const rows = parsed.sheets.get(SHEET) ?? [...parsed.sheets.values()][0] ?? [];
    if (rows.length === 0 && parsed.sheets.size === 0) {
      return { ...empty, fileErrors: [{ code: 'EMPTY_FILE', message: 'The file has no sheet with data' }] };
    }

    // Every header of the sheet is a key of every row, even when its cell is empty
    if (rows.length > 0) {
      const present = new Set(Object.keys(rows[0].cells));
      const missing = requiredHeaders.filter((h) => !present.has(normalizeHeaderKey(h)));
      if (missing.length > 0) {
        return { ...empty, fileErrors: [{ code: 'MISSING_COLUMNS', message: `The sheet is missing required columns: ${missing.join(', ')}` }] };
      }
    }

    const lookups = await this.loadLookups();
    const today = new Date();

    const seenEmails = new Set<string>();
    const seenMobiles = new Set<string>();
    const issues: ImportIssue[] = [];
    const items: PreparedEmployeeItem[] = [];
    let validCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (const row of rows) {
      const cell = (k: EmployeeImportColumnKey) => readCell(row.cells, k);
      const rowIssues: ImportIssue[] = [];
      const error = (code: string, message: string, field?: string) =>
        rowIssues.push({ row: row.rowNumber, sheet: SHEET, severity: 'error', code, message, field });
      const warn = (code: string, message: string, field?: string) =>
        rowIssues.push({ row: row.rowNumber, sheet: SHEET, severity: 'warning', code, message, field });

      for (const w of row.warnings) warn(w.code, w.message, w.field);

      const displayName = cell('full_name') || '(no name)';
      const officeEmailRaw = cell('office_email');

      // Only Active people are imported
      const status = classifyStatus(cell('status'));
      if (status === 'other') {
        const message = `Status is "${cell('status')}", only Active employees are imported`;
        issues.push(...rowIssues, { row: row.rowNumber, sheet: SHEET, severity: 'warning', code: 'NOT_ACTIVE_SKIPPED', message, field: 'status' });
        warningCount += rowIssues.filter((i) => i.severity === 'warning').length + 1;
        skippedCount++;
        items.push({
          rowNumber: row.rowNumber,
          displayName,
          officeEmail: officeEmailRaw,
          shiftId: null,
          preflight: { status: 'skipped', code: 'NOT_ACTIVE_SKIPPED', message },
        });
        continue;
      }

      const guard = <T>(fn: () => T): T | undefined => {
        try {
          return fn();
        } catch (e) {
          if (e instanceof DomainError) error(e.code, e.message, e.field);
          else throw e;
          return undefined;
        }
      };

      for (const key of EMPLOYEE_IMPORT_REQUIRED) {
        if (!cell(key)) error('REQUIRED', `${EMPLOYEE_IMPORT_COLUMNS[key]} is required`, normalizeHeaderKey(EMPLOYEE_IMPORT_COLUMNS[key]));
      }

      const name = cell('full_name') ? guard(() => assertPersonName(cell('full_name'), 'name', 'Full name')) : undefined;
      const email = officeEmailRaw ? guard(() => OrganizationNormalizationService.normalizeEmail(officeEmailRaw)) : undefined;
      const mob = cell('phone') ? guard(() => OrganizationNormalizationService.normalizeMobile(cell('phone'))) : undefined;

      if (email) {
        if (lookups.existingEmails.has(email)) error('EMAIL_EXISTS', 'An employee with this office email already exists', 'office_email');
        else if (seenEmails.has(email)) error('DUPLICATE_IN_FILE', 'This office email appears more than once in the file', 'office_email');
        seenEmails.add(email);
      }
      if (mob) {
        if (lookups.existingMobiles.has(mob)) error('MOBILE_EXISTS', 'An employee with this phone number already exists', 'phone');
        else if (seenMobiles.has(mob)) error('DUPLICATE_IN_FILE', 'This phone number appears more than once in the file', 'phone');
        seenMobiles.add(mob);
      }

      let personalEmail: string | undefined;
      if (cell('personal_email')) {
        personalEmail = guard(() => OrganizationNormalizationService.normalizeEmail(cell('personal_email')));
      }

      // Gender and employment type
      let genderId: number | undefined;
      if (cell('gender')) {
        genderId = lookups.genders.get(lc(cell('gender')));
        if (!genderId) error('UNKNOWN_GENDER', `Gender "${cell('gender')}" does not exist in the system`, 'gender');
      }
      let employmentTypeId: number | undefined;
      if (cell('employment_type')) {
        employmentTypeId = lookups.employmentTypes.get(lc(cell('employment_type')));
        if (!employmentTypeId) error('UNKNOWN_EMPLOYMENT_TYPE', `Employment type "${cell('employment_type')}" does not exist in the system`, 'employment_type');
      }

      // Dates
      let birthDate: Date | undefined;
      if (cell('birth_date')) {
        const d = parseImportDate(cell('birth_date'));
        if (!d) error('INVALID_DATE', `Birth date "${cell('birth_date')}" is not a valid date (use 20-Nov-1995)`, 'birth_date');
        else if (ageOn(d, today) < 18) error('UNDERAGE', 'Employees must be 18 or older', 'birth_date');
        else birthDate = d;
      }
      let joiningDate: Date | undefined;
      if (cell('joining_date')) {
        const d = parseImportDate(cell('joining_date'));
        if (!d) error('INVALID_DATE', `Joining date "${cell('joining_date')}" is not a valid date (use 20-Nov-2026)`, 'joining_date');
        else joiningDate = d;
      }

      // Departments and designation: the designation must belong to one of the row's departments
      const departmentIds: number[] = [];
      for (const dn of splitList(cell('departments'))) {
        const dep = lookups.departments.get(lc(dn));
        if (!dep) error('UNKNOWN_DEPARTMENT', `Department "${dn}" does not exist in the system`, 'departments');
        else if (!dep.active) error('DEPARTMENT_INACTIVE', `Department "${dn}" is not active`, 'departments');
        else if (!departmentIds.includes(dep.id)) departmentIds.push(dep.id);
      }
      // Several designations are separated by ; like the departments. The first one is the main designation, as the
      // first one chosen in the form. Each must belong to one of the row's departments.
      const roleIds: number[] = [];
      if (cell('designation')) {
        const designationNames = splitList(cell('designation'));
        if (designationNames.length === 0) error('REQUIRED', 'Designation is required', 'designation');
        for (const name of designationNames) {
          const candidates = lookups.rolesByName.get(lc(name)) ?? [];
          if (candidates.length === 0) {
            error('UNKNOWN_DESIGNATION', `Designation "${name}" does not exist in the system`, 'designation');
            continue;
          }
          const inDepartment = departmentIds.map((id) => candidates.find((c) => c.depId === id)).find(Boolean);
          if (!inDepartment) {
            if (departmentIds.length > 0) error('DESIGNATION_DEPARTMENT_MISMATCH', `Designation "${name}" does not belong to the department(s) given`, 'designation');
          } else if (!inDepartment.active) {
            error('DESIGNATION_INACTIVE', `Designation "${name}" is not active`, 'designation');
          } else if (!roleIds.includes(inDepartment.id)) {
            roleIds.push(inDepartment.id);
          }
        }
      }

      // Optional: leave policy, shift
      let leavePolicyId: number | null = null;
      if (cell('leave_policy')) {
        const id = lookups.leavePolicies.get(lc(cell('leave_policy')));
        if (!id) error('UNKNOWN_LEAVE_POLICY', `Leave policy "${cell('leave_policy')}" does not exist or is not active`, 'leave_policy');
        else leavePolicyId = id;
      }
      let shiftId: number | null = null;
      if (cell('shift')) {
        const id = lookups.shifts.get(lc(cell('shift')));
        if (!id) error('UNKNOWN_SHIFT', `Shift "${cell('shift')}" does not exist or is not active`, 'shift');
        else shiftId = id;
      }

      // Reporting manager is set by hand after the import
      if (cell('reporting_manager')) {
        warn('REPORTING_MANAGER_IGNORED', 'Reporting manager is not imported. Set it on the employee after the import', 'reporting_manager');
      }

      // Emergency contact (one)
      let emergencyContacts: Array<{ name: string; relation: string | null; number: string }> | undefined;
      if (cell('emergency_name') || cell('emergency_phone') || cell('emergency_relation')) {
        emergencyContacts = guard(() =>
          normalizeEmergencyContacts([{ name: cell('emergency_name'), relation: cell('emergency_relation'), number: cell('emergency_phone') }]),
        );
      }

      // Money, PF, OT, payment
      const money = (key: EmployeeImportColumnKey, label: string): number | undefined => {
        const n = parseAmountCell(cell(key));
        if (n === null) return undefined;
        if (Number.isNaN(n)) {
          error('INVALID_NUMBER', `${label} must be a positive number`, normalizeHeaderKey(EMPLOYEE_IMPORT_COLUMNS[key]));
          return undefined;
        }
        return guard(() => assertAmount(n, key, label));
      };
      const salary = money('salary', 'Salary');
      const pf = money('pf', 'PF amount');
      const otMultiplier = money('ot_multiplier', 'OT multiplier');
      const minOtMinutes = money('min_ot_minutes', 'Daily minimum OT threshold');

      let otRateType: 'FIXED' | 'MULTIPLIER' | null = null;
      const mappedOt = mapOtRateType(cell('ot_rate_calculation'));
      if (mappedOt === undefined) {
        error('UNKNOWN_OT_RATE', `OT rate calculation "${cell('ot_rate_calculation')}" is not known (use Multiplier)`, 'ot_rate_calculation');
      } else if (mappedOt === 'FIXED') {
        error('OT_FIXED_NEEDS_AMOUNT', 'A fixed OT rate needs an amount, and this template has no column for it. Use Multiplier, or set the rate on the employee', 'ot_rate_calculation');
      } else if (mappedOt === 'MULTIPLIER') {
        if (otMultiplier === undefined) error('OT_MULTIPLIER_REQUIRED', 'OT multiplier is required when the OT rate calculation is Multiplier', 'ot_multiplier');
        otRateType = 'MULTIPLIER';
      } else if (otMultiplier !== undefined) {
        warn('OT_MULTIPLIER_IGNORED', 'OT multiplier is ignored because OT rate calculation is empty', 'ot_multiplier');
      }

      const paymentMode = mapPaymentMode(cell('payment_mode'));
      if (paymentMode === undefined) {
        error('UNKNOWN_PAYMENT_MODE', `Disbursement method "${cell('payment_mode')}" is not known (Bank Transfer, Cheque or Cash)`, 'payment_mode');
      } else if (paymentMode === 'BANK_TRANSFER' && (!cell('account_number') || !cell('ifsc_code'))) {
        warn('BANK_DETAILS_MISSING', 'Bank Transfer is chosen but the account number or IFSC code is empty', 'account_number');
      }

      const rowHasError = rowIssues.some((i) => i.severity === 'error');
      warningCount += rowIssues.filter((i) => i.severity === 'warning').length;
      errorCount += rowIssues.filter((i) => i.severity === 'error').length;
      issues.push(...rowIssues);

      if (rowHasError) {
        const first = rowIssues.find((i) => i.severity === 'error')!;
        items.push({
          rowNumber: row.rowNumber,
          displayName,
          officeEmail: officeEmailRaw,
          shiftId: null,
          preflight: { status: 'failed', code: first.code, message: first.message },
        });
        continue;
      }

      validCount++;
      items.push({
        rowNumber: row.rowNumber,
        displayName: name!,
        officeEmail: email!,
        shiftId,
        command: {
          name: name!,
          email: email!,
          mob: mob!,
          dep_id: departmentIds[0],
          department_ids: departmentIds,
          role_id: roleIds[0],
          role_ids: roleIds,
          reporting_manager: null,
          joining_date: joiningDate!,
          gender_id: genderId!,
          personal_email: personalEmail ?? undefined,
          office_email: email!,
          birth_date: birthDate!,
          blood_group: cell('blood_group') || null,
          address: cell('address') || null,
          emergency_contacts: emergencyContacts,
          employment_type_id: employmentTypeId!,
          salary,
          pf,
          probation_period: cell('probation_period') || null,
          notice_period: cell('notice_period') || null,
          ot_eligible: otRateType !== null,
          ot_rate_type: otRateType,
          ot_multiplier: otRateType === 'MULTIPLIER' ? otMultiplier ?? null : null,
          minimum_ot_per_day: minOtMinutes,
          uan: cell('uan') || null,
          payment_mode: paymentMode ?? null,
          bank_name: cell('bank_name') || null,
          account_number: cell('account_number') || null,
          ifsc_code: cell('ifsc_code') || null,
          leave_policy_id: leavePolicyId,
        },
      });
    }

    return { fileErrors: [], items, issues, validCount, skippedCount, errorCount, warningCount };
  }
}
