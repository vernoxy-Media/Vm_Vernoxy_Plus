export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preset: 'all' | 'today' | 'this_month' | 'this_year' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';
}

export interface EmployeeDashboardFilters {
  department: string; // dep_id as string or 'All'
  designation: string; // role_id as string or 'All'
  employmentType: string; // lookup_id as string or 'All'
  gender: string; // lookup_id as string or 'All'
  joiningDate: DateRangeFilter;
  reportingManager: string; // emp_id as string or 'All'
  employeeStatus: 'All' | 'Active' | 'Inactive';
  search: string;
}

export const INITIAL_DASHBOARD_FILTERS: EmployeeDashboardFilters = {
  department: 'All',
  designation: 'All',
  employmentType: 'All',
  gender: 'All',
  joiningDate: {
    startDate: '',
    endDate: '',
    preset: 'all',
  },
  reportingManager: 'All',
  employeeStatus: 'All',
  search: '',
};

export const PREDEFINED_DEPARTMENTS = [
  'Management',
  'Human Resources',
  'Administration',
  'Finance & Accounts',
  'Sales & Business Development',
  'Software Development',
  'Quality Assurance',
  'Project Management',
  'UI/UX & Design',
] as const;

export type PredefinedDepartment = typeof PREDEFINED_DEPARTMENTS[number];

export interface DepartmentDistributionItem {
  departmentName: string;
  depId?: number;
  count: number;
  percentage: number;
}

export interface MultipleDepartmentCategoryItem {
  key: 'one' | 'two' | 'three_or_more';
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ManagerSpanItem {
  managerId: number;
  managerName: string;
  isInactive?: boolean;
  directReportsCount: number;
}

export interface MonthlyMovementItem {
  monthIndex: number; // 0 to 11
  monthName: string; // 'Jan', 'Feb', etc.
  joinedCount: number;
  leftCount: number;
  netChange: number;
}

export interface TenureCategoryItem {
  key: 'below_1_year' | '1_to_3_years' | '3_to_5_years' | 'above_5_years';
  label: string;
  count: number;
  percentage: number;
}
