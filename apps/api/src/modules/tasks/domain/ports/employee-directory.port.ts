export interface ActiveEmployeeSummary {
  emp_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role_name: string;
  department_name: string;
}

export interface EmployeeDirectoryPort {
  listActiveEmployees(): Promise<ActiveEmployeeSummary[]>;
  validateActiveEmployees(empIds: number[]): Promise<boolean>;
}
