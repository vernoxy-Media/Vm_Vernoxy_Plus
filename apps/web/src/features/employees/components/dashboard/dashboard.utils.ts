import { EmployeeResponseDto } from '@vernoxy-pulse/api-client';
import {
  EmployeeDashboardFilters,
  PREDEFINED_DEPARTMENTS,
  DepartmentDistributionItem,
  MultipleDepartmentCategoryItem,
  ManagerSpanItem,
  MonthlyMovementItem,
  TenureCategoryItem,
} from './dashboard.types';

/**
 * Format a Date or date string to DD-MM-YYYY format
 */
export function formatDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Calculate percentage with 1 decimal place or integer
 */
export function calculatePercentage(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  const pct = (part / total) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Normalizes department name matching between database names and predefined Department Master names
 */
export function matchDepartmentName(deptName: string, predefinedName: string): boolean {
  const d = (deptName || '').toLowerCase().trim();
  const p = predefinedName.toLowerCase().trim();
  if (d === p) return true;

  // Aliases matching predefined master order
  if (p === 'management' && (d === 'mgmt' || d === 'executive' || d === 'management')) return true;
  if (p === 'human resources' && (d === 'hr' || d === 'human resource' || d === 'human resources' || d === 'people ops')) return true;
  if (p === 'administration' && (d === 'admin' || d === 'administration' || d === 'ops admin')) return true;
  if (p === 'finance & accounts' && (d.includes('finan') || d.includes('account') || d === 'finance')) return true;
  if (p === 'sales & business development' && (d.includes('sales') || d.includes('business dev') || d.includes('biz dev') || d === 'bd')) return true;
  if (p === 'software development' && (d.includes('software') || d.includes('develop') || d.includes('engineer') || d === 'tech' || d === 'it')) return true;
  if (p === 'quality assurance' && (d.includes('quality') || d.includes('qa') || d === 'testing')) return true;
  if (p === 'project management' && (d.includes('project') || d === 'pm' || d === 'program management')) return true;
  if (p === 'ui/ux & design' && (d.includes('design') || d.includes('ui') || d.includes('ux'))) return true;

  return false;
}

/**
 * Check if an employee matches the global search text across 8 fields:
 * - Employee ID
 * - Employee Name
 * - Office Email
 * - Personal Email
 * - Phone Number
 * - Department
 * - Designation
 * - Reporting Manager
 */
export function matchesSearchKeyword(emp: EmployeeResponseDto, search: string): boolean {
  if (!search || !search.trim()) return true;
  const q = search.trim().toLowerCase();

  // 1. Employee ID / Code
  const empIdStr = String(emp.emp_id || '');
  const empCode = (emp.employee_code || '').toLowerCase();
  if (empIdStr.includes(q) || empCode.includes(q)) return true;

  // 2. Employee Name
  if ((emp.name || '').toLowerCase().includes(q)) return true;

  // 3. Office Email
  const officeEmail = (emp.office_email || emp.email || '').toLowerCase();
  if (officeEmail.includes(q)) return true;

  // 4. Personal Email
  if ((emp.personal_email || '').toLowerCase().includes(q)) return true;

  // 5. Phone Number
  if ((emp.mob || '').toLowerCase().includes(q)) return true;

  // 6. Department(s)
  if ((emp.department?.name || '').toLowerCase().includes(q)) return true;
  if (emp.departments && emp.departments.some((d) => (d.name || '').toLowerCase().includes(q))) {
    return true;
  }

  // 7. Designation
  if ((emp.role?.role_name || '').toLowerCase().includes(q)) return true;

  // 8. Reporting Manager
  if ((emp.manager?.name || '').toLowerCase().includes(q)) return true;

  return false;
}

/**
 * Check if employee matches the selected Joining Date filter
 */
export function matchesJoiningDate(emp: EmployeeResponseDto, dateFilter: EmployeeDashboardFilters['joiningDate']): boolean {
  if (!dateFilter || dateFilter.preset === 'all') return true;
  if (!emp.joining_date) return false;

  const joinDate = new Date(emp.joining_date);
  if (isNaN(joinDate.getTime())) return false;

  const joinYMD = joinDate.toISOString().slice(0, 10);

  if (dateFilter.startDate && joinYMD < dateFilter.startDate) {
    return false;
  }
  if (dateFilter.endDate && joinYMD > dateFilter.endDate) {
    return false;
  }
  return true;
}

/**
 * Filter employees based on all common global filters
 * Note: employeeStatus filter is applied conditionally based on chart eligibility
 */
export function filterEmployeesByCommonCriteria(
  employees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
  options?: {
    ignoreStatusFilter?: boolean;
    ignoreJoiningDateFilter?: boolean;
  },
): EmployeeResponseDto[] {
  return employees.filter((emp) => {
    // 1. Search keyword
    if (!matchesSearchKeyword(emp, filters.search)) {
      return false;
    }

    // 2. Department filter
    if (filters.department !== 'All') {
      const targetDepId = Number(filters.department);
      const isPrimaryMatch = emp.dep_id === targetDepId || emp.department?.dep_id === targetDepId;
      const isAssignedMatch = emp.departments?.some((d) => d.dep_id === targetDepId) ?? false;
      if (!isPrimaryMatch && !isAssignedMatch) {
        return false;
      }
    }

    // 3. Designation filter
    if (filters.designation !== 'All') {
      const targetRoleId = Number(filters.designation);
      if (emp.role_id !== targetRoleId && emp.role?.role_id !== targetRoleId) {
        return false;
      }
    }

    // 4. Employment Type filter
    if (filters.employmentType !== 'All') {
      const targetTypeId = Number(filters.employmentType);
      if (emp.employment_type_id !== targetTypeId && emp.employment_type?.lookup_id !== targetTypeId) {
        return false;
      }
    }

    // 5. Gender filter
    if (filters.gender !== 'All') {
      const targetGenderId = Number(filters.gender);
      if (emp.gender_id !== targetGenderId && emp.gender?.lookup_id !== targetGenderId) {
        return false;
      }
    }

    // 6. Joining Date filter
    if (!options?.ignoreJoiningDateFilter) {
      if (!matchesJoiningDate(emp, filters.joiningDate)) {
        return false;
      }
    }

    // 7. Reporting Manager filter
    if (filters.reportingManager !== 'All') {
      const targetManagerId = Number(filters.reportingManager);
      if (emp.reporting_manager !== targetManagerId && emp.manager?.emp_id !== targetManagerId) {
        return false;
      }
    }

    // 8. Employee Status filter
    if (!options?.ignoreStatusFilter) {
      if (filters.employeeStatus === 'Active' && emp.status !== 'Active') {
        return false;
      }
      if (filters.employeeStatus === 'Inactive' && emp.status !== 'Inactive') {
        return false;
      }
    }

    return true;
  });
}

// =========================================================================
// CHART 1: Active Employee Count (US02)
// =========================================================================
export function computeActiveEmployeeCount(
  allEmployees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
): number {
  // If user selected 'Inactive' status filter, Active count is 0
  if (filters.employeeStatus === 'Inactive') {
    return 0;
  }

  // Active employees only + common filters
  const filtered = filterEmployeesByCommonCriteria(allEmployees, filters, {
    ignoreStatusFilter: true, // We explicitly handle active below
  }).filter((emp) => emp.status === 'Active');

  // Unique employee count by emp_id
  const uniqueIds = new Set(filtered.map((e) => e.emp_id));
  return uniqueIds.size;
}

// =========================================================================
// CHART 2: Department-wise Employee Distribution (US03)
// =========================================================================
export function computeDepartmentDistribution(
  allEmployees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
  departmentMasterList?: Array<{ dep_id: number; name: string }>,
): DepartmentDistributionItem[] {
  // If user selected 'Inactive' status filter, Active count is 0 for all departments
  const isInactiveFilter = filters.employeeStatus === 'Inactive';

  // Active employees only
  const activeEmployees = isInactiveFilter
    ? []
    : filterEmployeesByCommonCriteria(allEmployees, filters, {
        ignoreStatusFilter: true,
      }).filter((emp) => emp.status === 'Active');

  // Build department list based on predefined master order
  const result: DepartmentDistributionItem[] = PREDEFINED_DEPARTMENTS.map((deptName) => {
    // Check if department master has a matching record for ID
    const masterMatch = departmentMasterList?.find((d) => matchDepartmentName(d.name, deptName));

    // Count active employees assigned to this department
    // Note: Multiple department assignment means employee is counted under each assigned department
    let count = 0;
    if (!isInactiveFilter) {
      activeEmployees.forEach((emp) => {
        let isAssigned = false;
        if (emp.department?.name && matchDepartmentName(emp.department.name, deptName)) {
          isAssigned = true;
        } else if (emp.departments && emp.departments.some((d) => matchDepartmentName(d.name, deptName))) {
          isAssigned = true;
        } else if (masterMatch && (emp.dep_id === masterMatch.dep_id || emp.departments?.some((d) => d.dep_id === masterMatch.dep_id))) {
          isAssigned = true;
        }
        if (isAssigned) {
          count += 1;
        }
      });
    }

    return {
      departmentName: deptName,
      depId: masterMatch?.dep_id,
      count,
      percentage: 0,
    };
  });

  // Calculate percentages
  const totalDepartmentAssignments = result.reduce((acc, curr) => acc + curr.count, 0);
  result.forEach((item) => {
    item.percentage = calculatePercentage(item.count, totalDepartmentAssignments);
  });

  // If a specific department filter is applied, filter the display to that department
  if (filters.department !== 'All') {
    const selectedDeptId = Number(filters.department);
    const selectedDeptObj = departmentMasterList?.find((d) => d.dep_id === selectedDeptId);
    if (selectedDeptObj) {
      return result.filter((item) => matchDepartmentName(selectedDeptObj.name, item.departmentName));
    }
  }

  return result;
}

// =========================================================================
// CHART 3: Employees with Multiple Department Assignments (US04)
// =========================================================================
export function computeMultipleDepartmentAssignments(
  allEmployees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
): {
  categories: MultipleDepartmentCategoryItem[];
  totalEligible: number;
} {
  const isInactiveFilter = filters.employeeStatus === 'Inactive';

  // Active employees only
  const activeEmployees = isInactiveFilter
    ? []
    : filterEmployeesByCommonCriteria(allEmployees, filters, {
        ignoreStatusFilter: true,
      }).filter((emp) => emp.status === 'Active');

  let oneCount = 0;
  let twoCount = 0;
  let threeOrMoreCount = 0;

  activeEmployees.forEach((emp) => {
    // Count total distinct departments assigned to this employee across the organization
    const deptIds = new Set<number>();
    if (emp.dep_id) deptIds.add(emp.dep_id);
    if (emp.departments) {
      emp.departments.forEach((d) => {
        if (d.dep_id) deptIds.add(d.dep_id);
      });
    }

    const deptCount = Math.max(1, deptIds.size);
    if (deptCount === 1) {
      oneCount += 1;
    } else if (deptCount === 2) {
      twoCount += 1;
    } else {
      threeOrMoreCount += 1;
    }
  });

  const totalEligible = activeEmployees.length;

  const categories: MultipleDepartmentCategoryItem[] = [
    {
      key: 'one',
      label: 'One department',
      count: oneCount,
      percentage: calculatePercentage(oneCount, totalEligible),
      color: '#2563eb', // Blue
    },
    {
      key: 'two',
      label: 'Two departments',
      count: twoCount,
      percentage: calculatePercentage(twoCount, totalEligible),
      color: '#f97316', // Orange / Amber
    },
    {
      key: 'three_or_more',
      label: 'Three or more',
      count: threeOrMoreCount,
      percentage: calculatePercentage(threeOrMoreCount, totalEligible),
      color: '#10b981', // Emerald / Green
    },
  ];

  return { categories, totalEligible };
}

// =========================================================================
// CHART 4: Reporting Manager Span of Control (US05)
// =========================================================================
export function computeReportingManagerSpan(
  allEmployees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
): ManagerSpanItem[] {
  const isInactiveFilter = filters.employeeStatus === 'Inactive';
  if (isInactiveFilter) return [];

  // Active direct reports only
  const activeDirectReports = filterEmployeesByCommonCriteria(allEmployees, filters, {
    ignoreStatusFilter: true,
  }).filter((emp) => emp.status === 'Active' && emp.reporting_manager !== null && emp.reporting_manager !== undefined);

  // Group active reports by manager
  const managerMap = new Map<number, { name: string; count: number; isInactive: boolean }>();

  activeDirectReports.forEach((emp) => {
    const mgrId = emp.reporting_manager!;
    const mgrName = emp.manager?.name || `Manager #${mgrId}`;

    // Find manager record in allEmployees to check their active/inactive status
    const mgrRecord = allEmployees.find((e) => e.emp_id === mgrId);
    const isInactive = mgrRecord ? mgrRecord.status === 'Inactive' : false;

    const existing = managerMap.get(mgrId);
    if (existing) {
      existing.count += 1;
    } else {
      managerMap.set(mgrId, {
        name: mgrName,
        count: 1,
        isInactive,
      });
    }
  });

  // Only managers with directReportsCount > 0 are retained
  let items: ManagerSpanItem[] = Array.from(managerMap.entries()).map(([managerId, info]) => ({
    managerId,
    managerName: info.name,
    isInactive: info.isInactive,
    directReportsCount: info.count,
  }));

  // If reportingManager filter is applied, show only the selected manager(s)
  if (filters.reportingManager !== 'All') {
    const targetManagerId = Number(filters.reportingManager);
    items = items.filter((m) => m.managerId === targetManagerId);
  }

  // Sorting rules:
  // 1. Descending order of Active direct report count
  // 2. Alphabetical manager name for equal counts
  items.sort((a, b) => {
    if (b.directReportsCount !== a.directReportsCount) {
      return b.directReportsCount - a.directReportsCount;
    }
    return a.managerName.localeCompare(b.managerName, undefined, { sensitivity: 'base' });
  });

  return items;
}

// =========================================================================
// CHART 5: Monthly Employee Movement (US06)
// =========================================================================
export function computeMonthlyEmployeeMovement(
  allEmployees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
  calendarYear: number = new Date().getFullYear(),
): MonthlyMovementItem[] {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize all 12 months with 0 movement
  const months: MonthlyMovementItem[] = MONTH_NAMES.map((name, index) => ({
    monthIndex: index,
    monthName: name,
    joinedCount: 0,
    leftCount: 0,
    netChange: 0,
  }));

  // Filter employees based on department, designation, employment type, gender, manager, search
  // Special rules:
  // - Joining Date filter applies to joining count only
  // - Employee Status filter does not exclude inactive employees from leaving count
  const eligibleEmployees = allEmployees.filter((emp) => {
    // Search
    if (!matchesSearchKeyword(emp, filters.search)) return false;

    // Department
    if (filters.department !== 'All') {
      const depId = Number(filters.department);
      const match = emp.dep_id === depId || emp.departments?.some((d) => d.dep_id === depId);
      if (!match) return false;
    }

    // Designation
    if (filters.designation !== 'All') {
      const roleId = Number(filters.designation);
      if (emp.role_id !== roleId && emp.role?.role_id !== roleId) return false;
    }

    // Employment type
    if (filters.employmentType !== 'All') {
      const typeId = Number(filters.employmentType);
      if (emp.employment_type_id !== typeId && emp.employment_type?.lookup_id !== typeId) return false;
    }

    // Gender
    if (filters.gender !== 'All') {
      const genderId = Number(filters.gender);
      if (emp.gender_id !== genderId && emp.gender?.lookup_id !== genderId) return false;
    }

    // Reporting manager
    if (filters.reportingManager !== 'All') {
      const mgrId = Number(filters.reportingManager);
      if (emp.reporting_manager !== mgrId && emp.manager?.emp_id !== mgrId) return false;
    }

    return true;
  });

  // Calculate Joining Count per month
  eligibleEmployees.forEach((emp) => {
    // If user filtered by Employee Status = 'Inactive', joining count is only for inactive employees
    if (filters.employeeStatus === 'Inactive' && emp.status !== 'Inactive') return;
    if (filters.employeeStatus === 'Active' && emp.status !== 'Active') return;

    // Check if Joining Date matches the Joining Date filter
    if (!matchesJoiningDate(emp, filters.joiningDate)) return;

    if (emp.joining_date) {
      const d = new Date(emp.joining_date);
      if (!isNaN(d.getTime()) && d.getFullYear() === calendarYear) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          months[m].joinedCount += 1;
        }
      }
    }
  });

  // Calculate Leaving Count per month
  eligibleEmployees.forEach((emp) => {
    // Termination / exit date check
    const exitDateStr = emp.termination_date || emp.exit_date;
    if (!exitDateStr) return;

    const d = new Date(exitDateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() === calendarYear) {
      const m = d.getMonth();
      if (m >= 0 && m < 12) {
        months[m].leftCount += 1;
      }
    }
  });

  // Calculate Net Workforce Change = Joined - Left
  months.forEach((item) => {
    item.netChange = item.joinedCount - item.leftCount;
  });

  return months;
}

// =========================================================================
// CHART 6: Employee Tenure Distribution (US07)
// =========================================================================
export function computeEmployeeTenureDistribution(
  allEmployees: EmployeeResponseDto[],
  filters: EmployeeDashboardFilters,
  currentDate: Date = new Date(),
): {
  categories: TenureCategoryItem[];
  totalActive: number;
} {
  const isInactiveFilter = filters.employeeStatus === 'Inactive';

  // Active employees only
  const activeEmployees = isInactiveFilter
    ? []
    : filterEmployeesByCommonCriteria(allEmployees, filters, {
        ignoreStatusFilter: true,
      }).filter((emp) => emp.status === 'Active');

  let below1Year = 0;
  let oneTo3Years = 0;
  let threeTo5Years = 0;
  let above5Years = 0;
  let validTenureCount = 0;

  activeEmployees.forEach((emp) => {
    if (!emp.joining_date) return;
    const joinDate = new Date(emp.joining_date);
    if (isNaN(joinDate.getTime())) return;

    // Completed service duration in years
    const diffTime = currentDate.getTime() - joinDate.getTime();
    if (diffTime < 0) return; // Future joining date excluded

    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const diffYears = diffDays / 365.25;

    validTenureCount += 1;

    if (diffYears < 1) {
      below1Year += 1;
    } else if (diffYears >= 1 && diffYears < 3) {
      oneTo3Years += 1;
    } else if (diffYears >= 3 && diffYears < 5) {
      threeTo5Years += 1;
    } else {
      above5Years += 1;
    }
  });

  const categories: TenureCategoryItem[] = [
    {
      key: 'below_1_year',
      label: 'Below 1 Year',
      count: below1Year,
      percentage: calculatePercentage(below1Year, validTenureCount),
    },
    {
      key: '1_to_3_years',
      label: '1–3 Years',
      count: oneTo3Years,
      percentage: calculatePercentage(oneTo3Years, validTenureCount),
    },
    {
      key: '3_to_5_years',
      label: '3–5 Years',
      count: threeTo5Years,
      percentage: calculatePercentage(threeTo5Years, validTenureCount),
    },
    {
      key: 'above_5_years',
      label: 'Above 5 Years',
      count: above5Years,
      percentage: calculatePercentage(above5Years, validTenureCount),
    },
  ];

  return { categories, totalActive: validTenureCount };
}
