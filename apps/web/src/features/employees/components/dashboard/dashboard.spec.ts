import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EmployeeResponseDto } from '@vernoxy-pulse/api-client';
import {
  INITIAL_DASHBOARD_FILTERS,
  PREDEFINED_DEPARTMENTS,
  EmployeeDashboardFilters,
} from './dashboard.types';
import {
  matchesSearchKeyword,
  filterEmployeesByCommonCriteria,
  computeActiveEmployeeCount,
  computeDepartmentDistribution,
  computeMultipleDepartmentAssignments,
  computeReportingManagerSpan,
  computeMonthlyEmployeeMovement,
  computeEmployeeTenureDistribution,
  formatDDMMYYYY,
} from './dashboard.utils';

// Helper mock employee builder
function createMockEmployee(overrides: Partial<EmployeeResponseDto>): EmployeeResponseDto {
  return {
    emp_id: 1,
    employee_code: 'EMP-0001',
    name: 'Krishna Sharma',
    email: 'krishna@vernoxy.com',
    mob: '+919876543210',
    dep_id: 6,
    status: 'Active',
    joining_date: '2024-01-15' as any,
    exit_date: null,
    termination_date: null,
    created_at: '2024-01-15T00:00:00.000Z' as any,
    created_by: null,
    updated_at: null,
    updated_by: null,
    department: { dep_id: 6, name: 'Software Development' },
    departments: [{ dep_id: 6, name: 'Software Development', is_primary: true }],
    role_id: 10,
    role: { role_id: 10, role_name: 'Software Engineer' },
    reporting_manager: null,
    manager: null,
    gender_id: 1,
    gender: { lookup_id: 1, code: 'male', label: 'Male' },
    employment_type_id: 1,
    employment_type: { lookup_id: 1, code: 'full_time', label: 'Full Time' },
    office_email: 'krishna@vernoxy.com',
    personal_email: 'krishna.personal@gmail.com',
    ...overrides,
  };
}

describe('Employee Management Dashboard: US01 - US07 Business Logic & Acceptance Criteria', () => {
  // Test Dataset
  const sampleEmployees: EmployeeResponseDto[] = [
    // Emp 1: Active, Manager A, 1 Dept (Software Development), joined Jan 2024 (2+ years)
    createMockEmployee({
      emp_id: 1,
      employee_code: 'EMP-0001',
      name: 'Manager A',
      status: 'Active',
      dep_id: 6,
      department: { dep_id: 6, name: 'Software Development' },
      departments: [{ dep_id: 6, name: 'Software Development' }],
      role: { role_id: 1, role_name: 'Engineering Director' },
      joining_date: '2024-01-10' as any,
      reporting_manager: null,
      manager: null,
    }),
    // Emp 2: Active, reports to Manager A (Emp 1), 2 Depts (Software Development + Quality Assurance), joined Feb 2026 (<1 year)
    createMockEmployee({
      emp_id: 2,
      employee_code: 'EMP-0002',
      name: 'Rohan Patel',
      status: 'Active',
      dep_id: 6,
      department: { dep_id: 6, name: 'Software Development' },
      departments: [
        { dep_id: 6, name: 'Software Development' },
        { dep_id: 7, name: 'Quality Assurance' },
      ],
      role_id: 2,
      role: { role_id: 2, role_name: 'QA Engineer' },
      reporting_manager: 1,
      manager: { emp_id: 1, name: 'Manager A' },
      joining_date: '2026-02-15' as any,
    }),
    // Emp 3: Active, reports to Manager A (Emp 1), 3 Depts (Management + HR + Finance), joined Mar 2022 (4 years)
    createMockEmployee({
      emp_id: 3,
      employee_code: 'EMP-0003',
      name: 'Priya Nair',
      status: 'Active',
      dep_id: 1,
      department: { dep_id: 1, name: 'Management' },
      departments: [
        { dep_id: 1, name: 'Management' },
        { dep_id: 2, name: 'Human Resources' },
        { dep_id: 4, name: 'Finance & Accounts' },
      ],
      role_id: 3,
      role: { role_id: 3, role_name: 'HR Director' },
      reporting_manager: 1,
      manager: { emp_id: 1, name: 'Manager A' },
      joining_date: '2022-03-01' as any,
    }),
    // Emp 4: Active, reports to Inactive Manager B (Emp 5), 1 Dept (UI/UX & Design), joined Jun 2020 (6 years)
    createMockEmployee({
      emp_id: 4,
      employee_code: 'EMP-0004',
      name: 'Arjun Das',
      status: 'Active',
      dep_id: 9,
      department: { dep_id: 9, name: 'UI/UX & Design' },
      departments: [{ dep_id: 9, name: 'UI/UX & Design' }],
      role_id: 4,
      role: { role_id: 4, role_name: 'Lead Designer' },
      reporting_manager: 5,
      manager: { emp_id: 5, name: 'Manager B (Former Lead)' },
      joining_date: '2020-06-15' as any,
    }),
    // Emp 5: INACTIVE, former manager, left in April 2026
    createMockEmployee({
      emp_id: 5,
      employee_code: 'EMP-0005',
      name: 'Manager B (Former Lead)',
      status: 'Inactive',
      dep_id: 9,
      department: { dep_id: 9, name: 'UI/UX & Design' },
      departments: [{ dep_id: 9, name: 'UI/UX & Design' }],
      joining_date: '2019-01-01' as any,
      termination_date: '2026-04-30' as any,
      exit_date: '2026-04-30' as any,
    }),
    // Emp 6: INACTIVE, left in February 2026
    createMockEmployee({
      emp_id: 6,
      employee_code: 'EMP-0006',
      name: 'Vikram Joshi',
      status: 'Inactive',
      dep_id: 6,
      department: { dep_id: 6, name: 'Software Development' },
      departments: [{ dep_id: 6, name: 'Software Development' }],
      joining_date: '2025-02-01' as any,
      termination_date: '2026-02-28' as any,
      exit_date: '2026-02-28' as any,
    }),
  ];

  // =======================================================================
  // US01: Overall Dashboard Design and Functionality
  // =======================================================================
  describe('US01: Overall Dashboard Design & Search', () => {
    test('Default filters have All and empty search', () => {
      assert.equal(INITIAL_DASHBOARD_FILTERS.department, 'All');
      assert.equal(INITIAL_DASHBOARD_FILTERS.designation, 'All');
      assert.equal(INITIAL_DASHBOARD_FILTERS.employmentType, 'All');
      assert.equal(INITIAL_DASHBOARD_FILTERS.gender, 'All');
      assert.equal(INITIAL_DASHBOARD_FILTERS.reportingManager, 'All');
      assert.equal(INITIAL_DASHBOARD_FILTERS.employeeStatus, 'All');
      assert.equal(INITIAL_DASHBOARD_FILTERS.search, '');
      assert.equal(INITIAL_DASHBOARD_FILTERS.joiningDate.preset, 'all');
    });

    test('Date formatting follows DD-MM-YYYY', () => {
      const formatted = formatDDMMYYYY('2026-11-05T00:00:00.000Z');
      assert.equal(formatted, '05-11-2026');
    });

    test('Search matches across all 8 fields case-insensitively', () => {
      const emp = sampleEmployees[0];

      // 1. Employee ID / Code
      assert.equal(matchesSearchKeyword(emp, 'EMP-0001'), true);
      assert.equal(matchesSearchKeyword(emp, 'emp-0001'), true);

      // 2. Name
      assert.equal(matchesSearchKeyword(emp, 'Manager A'), true);
      assert.equal(matchesSearchKeyword(emp, 'manager a'), true);

      // 3. Office email
      assert.equal(matchesSearchKeyword(emp, 'krishna@vernoxy.com'), true);

      // 4. Personal email
      assert.equal(matchesSearchKeyword(emp, 'krishna.personal'), true);

      // 5. Phone number
      assert.equal(matchesSearchKeyword(emp, '9876543210'), true);

      // 6. Department
      assert.equal(matchesSearchKeyword(emp, 'Software Development'), true);

      // 7. Designation
      assert.equal(matchesSearchKeyword(emp, 'Engineering Director'), true);

      // 8. Reporting manager
      const emp2 = sampleEmployees[1];
      assert.equal(matchesSearchKeyword(emp2, 'Manager A'), true);
    });

    test('Search and multiple filters work together with AND logic', () => {
      const filters: EmployeeDashboardFilters = {
        ...INITIAL_DASHBOARD_FILTERS,
        department: '6', // Software Development
        search: 'Rohan',
      };
      const result = filterEmployeesByCommonCriteria(sampleEmployees, filters);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Rohan Patel');
    });
  });

  // =======================================================================
  // US02: Active Employee Count
  // =======================================================================
  describe('US02: Active Employee Count', () => {
    test('Counts only Active employees and ignores Inactive records', () => {
      const count = computeActiveEmployeeCount(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      assert.equal(count, 4);
    });

    test('Never counts an employee with multiple departments twice', () => {
      const count = computeActiveEmployeeCount(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      assert.equal(count, 4);
    });

    test('Returns 0 if Employee Status filter is set to Inactive', () => {
      const filters: EmployeeDashboardFilters = {
        ...INITIAL_DASHBOARD_FILTERS,
        employeeStatus: 'Inactive',
      };
      const count = computeActiveEmployeeCount(sampleEmployees, filters);
      assert.equal(count, 0);
    });

    test('Returns correct filtered count when department filter applied', () => {
      const filters: EmployeeDashboardFilters = {
        ...INITIAL_DASHBOARD_FILTERS,
        department: '6', // Software Development
      };
      const count = computeActiveEmployeeCount(sampleEmployees, filters);
      assert.equal(count, 2);
    });
  });

  // =======================================================================
  // US03: Department-wise Employee Distribution
  // =======================================================================
  describe('US03: Department-wise Employee Distribution', () => {
    test('Displays all 9 predefined departments in exact Department Master order', () => {
      const result = computeDepartmentDistribution(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      assert.equal(result.length, 9);
      assert.deepEqual(
        result.map((r) => r.departmentName),
        [...PREDEFINED_DEPARTMENTS],
      );
    });

    test('Departments with 0 employees remain visible with count 0', () => {
      const result = computeDepartmentDistribution(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      const adminDept = result.find((d) => d.departmentName === 'Administration');
      assert.ok(adminDept);
      assert.equal(adminDept.count, 0);
    });

    test('Employees with multiple department assignments are counted once in each assigned department', () => {
      const result = computeDepartmentDistribution(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      const swDev = result.find((d) => d.departmentName === 'Software Development');
      const qa = result.find((d) => d.departmentName === 'Quality Assurance');

      assert.equal(swDev?.count, 2);
      assert.equal(qa?.count, 1);
    });
  });

  // =======================================================================
  // US04: Employees with Multiple Department Assignments
  // =======================================================================
  describe('US04: Employees with Multiple Department Assignments', () => {
    test('Classifies employees into One, Two, and Three or More departments', () => {
      const { categories, totalEligible } = computeMultipleDepartmentAssignments(
        sampleEmployees,
        INITIAL_DASHBOARD_FILTERS,
      );
      assert.equal(totalEligible, 4);

      const one = categories.find((c) => c.key === 'one');
      const two = categories.find((c) => c.key === 'two');
      const three = categories.find((c) => c.key === 'three_or_more');

      assert.equal(one?.count, 2);
      assert.equal(two?.count, 1);
      assert.equal(three?.count, 1);

      assert.equal(one?.percentage, 50);
      assert.equal(two?.percentage, 25);
      assert.equal(three?.percentage, 25);
    });

    test('Department filter: classifies employee using their TOTAL department assignments', () => {
      const filters: EmployeeDashboardFilters = {
        ...INITIAL_DASHBOARD_FILTERS,
        department: '7',
      };
      const { categories, totalEligible } = computeMultipleDepartmentAssignments(
        sampleEmployees,
        filters,
      );
      assert.equal(totalEligible, 1);

      const one = categories.find((c) => c.key === 'one');
      const two = categories.find((c) => c.key === 'two');

      assert.equal(one?.count, 0);
      assert.equal(two?.count, 1);
      assert.equal(two?.percentage, 100);
    });
  });

  // =======================================================================
  // US05: Reporting Manager Span of Control
  // =======================================================================
  describe('US05: Reporting Manager Span of Control', () => {
    test('Groups active direct reports by manager and counts only direct reports', () => {
      const managers = computeReportingManagerSpan(sampleEmployees, INITIAL_DASHBOARD_FILTERS);

      assert.equal(managers.length, 2);

      const mgrA = managers.find((m) => m.managerId === 1);
      assert.ok(mgrA);
      assert.equal(mgrA.directReportsCount, 2);
    });

    test('Inactive manager can appear if they have active direct reports', () => {
      const managers = computeReportingManagerSpan(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      const mgrB = managers.find((m) => m.managerId === 5);
      assert.ok(mgrB);
      assert.equal(mgrB.isInactive, true);
      assert.equal(mgrB.directReportsCount, 1);
    });

    test('Managers with zero direct reports are omitted', () => {
      const managers = computeReportingManagerSpan(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      const emp2AsMgr = managers.find((m) => m.managerId === 2);
      assert.equal(emp2AsMgr, undefined);
    });

    test('Sorts descending by direct reports count', () => {
      const managers = computeReportingManagerSpan(sampleEmployees, INITIAL_DASHBOARD_FILTERS);
      assert.equal(managers[0].directReportsCount >= managers[1].directReportsCount, true);
    });
  });

  // =======================================================================
  // US06: Monthly Employee Movement
  // =======================================================================
  describe('US06: Monthly Employee Movement', () => {
    test('Displays all 12 months in chronological order', () => {
      const movement = computeMonthlyEmployeeMovement(sampleEmployees, INITIAL_DASHBOARD_FILTERS, 2026);
      assert.equal(movement.length, 12);
      assert.equal(movement[0].monthName, 'Jan');
      assert.equal(movement[11].monthName, 'Dec');
    });

    test('Calculates Joined, Left, and Net Workforce Change accurately for 2026', () => {
      const movement = computeMonthlyEmployeeMovement(sampleEmployees, INITIAL_DASHBOARD_FILTERS, 2026);

      const feb = movement[1];
      assert.equal(feb.joinedCount, 1);
      assert.equal(feb.leftCount, 1);
      assert.equal(feb.netChange, 0);

      const apr = movement[3];
      assert.equal(apr.joinedCount, 0);
      assert.equal(apr.leftCount, 1);
      assert.equal(apr.netChange, -1);
    });

    test('Inactive employees are retained in the leaving count', () => {
      const movement = computeMonthlyEmployeeMovement(sampleEmployees, INITIAL_DASHBOARD_FILTERS, 2026);
      const totalLeft = movement.reduce((acc, m) => acc + m.leftCount, 0);
      assert.equal(totalLeft, 2);
    });
  });

  // =======================================================================
  // US07: Employee Tenure Distribution
  // =======================================================================
  describe('US07: Employee Tenure Distribution', () => {
    test('Classifies active employees into 4 predefined ascending categories', () => {
      const evalDate = new Date('2026-11-05T00:00:00.000Z');
      const { categories, totalActive } = computeEmployeeTenureDistribution(
        sampleEmployees,
        INITIAL_DASHBOARD_FILTERS,
        evalDate,
      );

      assert.equal(totalActive, 4);
      assert.equal(categories.length, 4);

      const below1 = categories.find((c) => c.key === 'below_1_year');
      const oneTo3 = categories.find((c) => c.key === '1_to_3_years');
      const threeTo5 = categories.find((c) => c.key === '3_to_5_years');
      const above5 = categories.find((c) => c.key === 'above_5_years');

      assert.equal(below1?.count, 1);
      assert.equal(oneTo3?.count, 1);
      assert.equal(threeTo5?.count, 1);
      assert.equal(above5?.count, 1);

      assert.equal(below1?.percentage, 25);
      assert.equal(oneTo3?.percentage, 25);
      assert.equal(threeTo5?.percentage, 25);
      assert.equal(above5?.percentage, 25);
    });

    test('Zero-count categories remain visible', () => {
      const filters: EmployeeDashboardFilters = {
        ...INITIAL_DASHBOARD_FILTERS,
        search: 'Rohan',
      };
      const { categories, totalActive } = computeEmployeeTenureDistribution(
        sampleEmployees,
        filters,
        new Date('2026-11-05T00:00:00.000Z'),
      );
      assert.equal(totalActive, 1);

      const below1 = categories.find((c) => c.key === 'below_1_year');
      const above5 = categories.find((c) => c.key === 'above_5_years');

      assert.equal(below1?.count, 1);
      assert.equal(above5?.count, 0);
    });
  });
});
