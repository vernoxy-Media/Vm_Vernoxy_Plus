import { Employee } from '../../domain/entities/employee.entity';

export interface EmployeeListFilter {
  q?: string;
  dep_id?: number;
  role_id?: number;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface EmployeeRepositoryPort {
  findMany(filter: EmployeeListFilter, tx?: unknown): Promise<{ items: Employee[]; next_cursor: string | null }>;
  findActiveOptions(q?: string, tx?: unknown): Promise<Array<{ emp_id: number; name: string; email: string }>>;
  findById(id: number, tx?: unknown): Promise<Employee | null>;
  findByEmail(email: string, tx?: unknown): Promise<Employee | null>;
  findByMobile(mobile: string, tx?: unknown): Promise<Employee | null>;
  create(
    data: {
      name: string;
      email: string;
      mob: string;
      dep_id: number;
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date: Date;
      created_by: number;
    },
    tx?: unknown,
  ): Promise<Employee>;
  update(
    id: number,
    data: {
      name?: string;
      mob?: string;
      dep_id?: number;
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date?: Date;
      exit_date?: Date | null;
      status?: 'Active' | 'Inactive';
      profile_picture?: string | null;
      updated_by: number;
    },
    tx?: unknown,
  ): Promise<Employee>;
  softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void>;
  countActiveAdmins(excludeEmpId?: number, tx?: unknown): Promise<number>;
  checkReportingCycle(empId: number, prospectiveManagerId: number, tx?: unknown): Promise<boolean>;
}

export const EMPLOYEE_REPOSITORY_TOKEN = Symbol('EmployeeRepositoryPort');
