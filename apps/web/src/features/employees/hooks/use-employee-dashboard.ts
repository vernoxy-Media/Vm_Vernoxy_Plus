import { useQuery } from '@tanstack/react-query';
import { customFetch, EmployeeListResponseDto, EmployeeResponseDto } from '@vernoxy-pulse/api-client';
import {
  useDepartmentOptionsQuery,
  useRoleOptionsQuery,
} from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';

export interface ManagerDropdownOption {
  emp_id: number;
  name: string;
  is_active: boolean;
  employee_code?: string;
}

/**
 * Fetch all employees for the dashboard across pages using keyset pagination
 */
async function fetchAllEmployeesForDashboard(): Promise<EmployeeResponseDto[]> {
  const allEmployees: EmployeeResponseDto[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;
  let safetyPageLimit = 20; // safety ceiling (up to 2000 employees)

  while (hasMore && safetyPageLimit > 0) {
    safetyPageLimit -= 1;
    const q = new URLSearchParams();
    q.set('limit', '100');
    if (cursor) q.set('cursor', cursor);

    const res = await customFetch<EmployeeListResponseDto>(`/api/v1/employees?${q.toString()}`);
    const items = res?.items || [];
    allEmployees.push(...items);

    if (res?.next_cursor && items.length > 0) {
      cursor = res.next_cursor;
    } else {
      hasMore = false;
    }
  }

  return allEmployees;
}

export function useEmployeeDashboardData() {
  // 1. Employees query
  const employeesQuery = useQuery({
    queryKey: ['employee-dashboard', 'all-employees'],
    queryFn: fetchAllEmployeesForDashboard,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // 2. Department master options
  const departmentsQuery = useDepartmentOptionsQuery();

  // 3. Designation / Role options
  const rolesQuery = useRoleOptionsQuery();

  // 4. Lookups: Gender & Employment Type
  const genderQuery = useLookupsQuery('gender');
  const employmentTypeQuery = useLookupsQuery('employment_type');

  // Extract unique managers from the loaded employee list (including their active/inactive status)
  const allEmployees = employeesQuery.data || [];
  const managerMap = new Map<number, ManagerDropdownOption>();

  allEmployees.forEach((emp) => {
    // If an employee is referenced as reporting manager by someone
    if (emp.reporting_manager) {
      const mgrId = emp.reporting_manager;
      const mgrRecord = allEmployees.find((e) => e.emp_id === mgrId);
      const name = emp.manager?.name || mgrRecord?.name || `Manager #${mgrId}`;
      const isActive = mgrRecord ? mgrRecord.status === 'Active' : true;

      managerMap.set(mgrId, {
        emp_id: mgrId,
        name,
        is_active: isActive,
        employee_code: mgrRecord?.employee_code,
      });
    }

    // Also include any employee whose role or designation indicates manager or admin
    if (emp.name) {
      const isMgr = emp.role?.role_name?.toLowerCase().includes('manager') ||
                    emp.role?.role_name?.toLowerCase().includes('lead') ||
                    emp.role?.role_name?.toLowerCase().includes('admin');
      if (isMgr && !managerMap.has(emp.emp_id)) {
        managerMap.set(emp.emp_id, {
          emp_id: emp.emp_id,
          name: emp.name,
          is_active: emp.status === 'Active',
          employee_code: emp.employee_code,
        });
      }
    }
  });

  const managerOptions = Array.from(managerMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  return {
    employees: allEmployees,
    isLoading: employeesQuery.isLoading,
    isFetching: employeesQuery.isFetching,
    isError: employeesQuery.isError,
    error: employeesQuery.error,
    refetch: employeesQuery.refetch,
    departments: departmentsQuery.data || [],
    roles: rolesQuery.data || [],
    genderLookups: genderQuery.data || [],
    employmentTypeLookups: employmentTypeQuery.data || [],
    managerOptions,
  };
}
