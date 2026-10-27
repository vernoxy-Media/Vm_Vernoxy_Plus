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
  findMany(
    filter: EmployeeListFilter,
    tx?: unknown,
  ): Promise<{ items: Employee[]; next_cursor: string | null; stats?: { total: number; active: number; inactive: number } }>;
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
      department_ids?: number[];
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date: Date;
      gender_id?: number | null;
      personal_email?: string | null;
      office_email?: string | null;
      birth_date?: Date | null;
      blood_group?: string | null;
      address?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_number?: string | null;
      emergency_contact_relation?: string | null;
      employment_type_id?: number | null;
      salary?: number;
      pf?: number;
      created_by: number;
    },
    tx?: unknown,
  ): Promise<Employee>;
  update(
    id: number,
    data: {
      name?: string;
      email?: string;
      mob?: string;
      dep_id?: number;
      department_ids?: number[];
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date?: Date;
      exit_date?: Date | null;
      status?: 'Active' | 'Inactive';
      profile_picture?: string | null;
      gender_id?: number | null;
      personal_email?: string | null;
      office_email?: string | null;
      birth_date?: Date | null;
      blood_group?: string | null;
      address?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_number?: string | null;
      emergency_contact_relation?: string | null;
      employment_type_id?: number | null;
      salary?: number;
      pf?: number;
      termination_date?: Date | null;
      deactivation_reason?: string | null;
      deactivation_notes?: string | null;
      updated_by: number;
    },
    tx?: unknown,
  ): Promise<Employee>;
  deactivate(
    id: number,
    data: {
      termination_date: Date;
      reason: string;
      notes?: string;
      deactivated_by: number;
    },
    tx?: unknown,
  ): Promise<Employee>;
  getDirectReports(empId: number, tx?: unknown): Promise<Array<{ emp_id: number; name: string; email: string }>>;
  getHistory(empId: number, tx?: unknown): Promise<Array<{
    history_id: number;
    emp_id: number;
    event_type: string;
    title: string;
    department_ids: number[];
    departments?: Array<{ dep_id: number; name: string }>;
    role_id: number | null;
    role?: { role_id: number; role_name: string } | null;
    manager_id: number | null;
    manager?: { emp_id: number; name: string } | null;
    employment_type: string | null;
    salary: number | null;
    effective_date: Date;
    reason: string | null;
    notes: string | null;
    created_at: Date;
    created_by: number | null;
  }>>;
  addHistory(
    data: {
      emp_id: number;
      event_type: string;
      title: string;
      department_ids?: number[];
      role_id?: number | null;
      manager_id?: number | null;
      employment_type?: string | null;
      salary?: number | null;
      effective_date: Date;
      reason?: string | null;
      notes?: string | null;
      created_by?: number | null;
    },
    tx?: unknown,
  ): Promise<void>;
  softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void>;
  countActiveAdmins(excludeEmpId?: number, tx?: unknown): Promise<number>;
  checkReportingCycle(empId: number, prospectiveManagerId: number, tx?: unknown): Promise<boolean>;
}

export const EMPLOYEE_REPOSITORY_TOKEN = Symbol('EmployeeRepositoryPort');

