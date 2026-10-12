export interface EmployeeDirectoryItem {
  emp_id: number;
  full_name: string;
  status: string;
  is_admin: boolean;
}

export interface EmployeeDirectoryPort {
  findEmployeeById(id: number): Promise<EmployeeDirectoryItem | null>;
}

export const EMPLOYEE_DIRECTORY_PORT_TOKEN = Symbol('EmployeeDirectoryPort');
