import { CsvSpreadsheetAdapter, ExcelJsSpreadsheetAdapter } from '../../../data-transfer/public-api';
import { DownloadEmployeeTemplateUseCase, fitsInlineDropdown } from './employee-import.use-cases';
import { EMPLOYEE_IMPORT_COLUMNS, EMPLOYEE_IMPORT_REQUIRED } from '../../domain/services/employee-import-rules';

const lists = {
  genders: ['Male', 'Female'],
  employmentTypes: ['Full-time', 'Part-time'],
  departments: ['Engineering', 'Sales'],
  designations: ['Developer', 'Sales Executive'],
  leavePolicies: ['Standard'],
  shifts: ['General Shift'],
};

describe('employee import template', () => {
  it('is read back by the importer with no missing column (xlsx)', async () => {
    const writer = new ExcelJsSpreadsheetAdapter();
    const { buffer } = await new DownloadEmployeeTemplateUseCase(writer, async () => lists).execute('xlsx');

    const parsed = await writer.parseWorkbook(buffer, 'xlsx', {
      requiredSheets: ['Employees'],
      requiredColumnsBySheet: { employees: EMPLOYEE_IMPORT_REQUIRED.map((k) => EMPLOYEE_IMPORT_COLUMNS[k]) },
    });

    expect(parsed.fileErrors).toEqual([]);
    expect(parsed.sheets.get('Employees')).toEqual([]);
    // The instruction and list sheets are not read as data
    expect([...parsed.sheets.keys()]).toEqual(['Employees']);
  });

  it('is read back by the importer with no missing column (csv)', async () => {
    const writer = new CsvSpreadsheetAdapter();
    const { buffer, filename } = await new DownloadEmployeeTemplateUseCase(writer, async () => lists).execute('csv');
    expect(filename).toBe('employees-template.csv');

    const parsed = await writer.parseWorkbook(buffer, 'csv', {
      requiredColumnsBySheet: { employees: EMPLOYEE_IMPORT_REQUIRED.map((k) => EMPLOYEE_IMPORT_COLUMNS[k]) },
    });
    expect(parsed.fileErrors).toEqual([]);
  });

  it('has no Employee ID column: the system gives the ID', () => {
    const headers = Object.values(EMPLOYEE_IMPORT_COLUMNS).map((h) => h.toLowerCase());
    expect(headers).not.toContain('emp id');
    expect(headers).not.toContain('employee id');
  });
});

describe('fitsInlineDropdown', () => {
  it('accepts a short list', () => {
    expect(fitsInlineDropdown({ values: ['Male', 'Female'] })).toBe(true);
  });
  it('rejects an empty list, a list over 250 characters, and a name with a comma', () => {
    expect(fitsInlineDropdown({ values: [] })).toBe(false);
    expect(fitsInlineDropdown({ values: Array.from({ length: 40 }, (_, i) => `Policy number ${i}`) })).toBe(false);
    expect(fitsInlineDropdown({ values: ['Sales, North', 'Sales, South'] })).toBe(false);
  });
});
