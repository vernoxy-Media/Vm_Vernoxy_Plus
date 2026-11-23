import { SheetDefinition, SpreadsheetWriterPort } from '../../../data-transfer/public-api';
import { EMPLOYEE_IMPORT_COLUMNS, EMPLOYEE_IMPORT_REQUIRED } from '../../domain/services/employee-import-rules';

export interface EmployeeTemplateLists {
  genders: string[];
  employmentTypes: string[];
  departments: string[];
  designations: string[];
  leavePolicies: string[];
  shifts: string[];
}

/**
 * Excel writes a dropdown as one inline text of at most 255 characters, split at commas. A longer list, or a name
 * with a comma in it, makes Excel call the file corrupt, so such a column gets no dropdown (its names are still on the
 * Lists sheet).
 */
export function fitsInlineDropdown(d: { values: string[] }): boolean {
  if (d.values.length === 0) return false;
  if (d.values.some((v) => v.includes(',') || v.includes('"'))) return false;
  return d.values.join(',').length <= 250;
}

export class DownloadEmployeeTemplateUseCase {
  constructor(
    private readonly writer: SpreadsheetWriterPort,
    private readonly lists: () => Promise<EmployeeTemplateLists>,
  ) {}

  async execute(format: 'xlsx' | 'csv'): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const lists = await this.lists();

    const sheets: SheetDefinition[] = [];
    if (format === 'xlsx') {
      sheets.push({
        name: 'Instructions',
        headers: [],
        instructionsRows: [
          ['Vernoxy Pulse - Employee Import Instructions', null],
          ['Rule', 'Details'],
          ['Employee ID', 'Do not fill it. The system gives every employee a new Employee ID (EMP-0001...). The report you download after the import lists them.'],
          ['Required columns', EMPLOYEE_IMPORT_REQUIRED.map((k) => EMPLOYEE_IMPORT_COLUMNS[k]).join(', ')],
          ['Status', 'Only rows with Status = Active are imported. Any other status is skipped.'],
          ['Dates', 'Write dates like 20-Nov-2026. A number date is read day first (05-06-2026 is 5 June).'],
          ['Master data', 'Gender, Employment Type, Departments, Designation, Leave Policy and Assigned Shift must already exist in the system. Write them exactly as they are named there.'],
          ['Several departments', 'Separate them with ; (for example: Admin; Finance & Accounts).'],
          ['Several designations', 'Separate them with ; too (for example: Admin; Accountant; Finance Manager). The first one is the main designation. Each designation must belong to one of the departments in the same row. Write only designation names here, and department names in the Departments column.'],
          ['Several emergency contacts', 'Up to 5. Put them side by side in the three Emergency Contacts columns, separated by ; : Name "Meena Sharma; Suresh Sharma", Relationship "Mother; Father", Phone number "9000000201; 9000000202". The first name goes with the first relationship and the first phone number, and so on, so each column must have the same number of entries (the relationship may be left empty for all).'],
          ['Reporting Manager', 'Not imported. Set it on each employee after the import.'],
          ['Sign in', 'Nobody sees a password: the employee sets their own. If "Send welcome email" is ticked on the import page, every Active employee that is created gets an email (to the office email and the personal email) with a link to set their password. If it is not ticked, no email is sent and the employee cannot sign in until they get that link (the report has it).'],
          ['OT Rate Calculation', 'Use Multiplier, and fill OT Multiplier.'],
          ['Disbursement Method', 'Bank Transfer, Cheque or Cash.'],
          ['Limits', 'Up to 100 rows per file. For more employees, import several files. Excel (.xlsx) or CSV.'],
        ],
      });
    }

    sheets.push({
      name: 'Employees',
      headers: (Object.keys(EMPLOYEE_IMPORT_COLUMNS) as Array<keyof typeof EMPLOYEE_IMPORT_COLUMNS>).map((key) => ({
        key,
        header: EMPLOYEE_IMPORT_COLUMNS[key],
        width: 20,
        isPhone: key === 'phone' || key === 'emergency_phone',
      })),
      dropdowns: [
        { column: 'gender', values: lists.genders },
        { column: 'employment_type', values: lists.employmentTypes },
        { column: 'leave_policy', values: lists.leavePolicies },
        { column: 'shift', values: lists.shifts },
        { column: 'ot_rate_calculation', values: ['Multiplier'] },
        { column: 'payment_mode', values: ['Bank Transfer', 'Cheque', 'Cash'] },
        { column: 'status', values: ['Active'] },
      ].filter(fitsInlineDropdown),
    });

    if (format === 'xlsx') {
      const rows = Math.max(lists.departments.length, lists.designations.length);
      sheets.push({
        name: 'Lists',
        headers: [
          { key: 'departments', header: 'Departments', width: 28 },
          { key: 'designations', header: 'Designations', width: 28 },
        ],
        instructionsRows: [
          ['Departments', 'Designations'],
          ...Array.from({ length: rows }, (_, i) => [lists.departments[i] ?? null, lists.designations[i] ?? null]),
        ],
      });
    }

    const buffer = await this.writer.buildTemplateBuffer(sheets, format);
    return {
      buffer,
      filename: `employees-template.${format}`,
      contentType:
        format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
    };
  }
}

