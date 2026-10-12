import { Department } from '../../domain/entities/department.entity';

export interface DepartmentListFilter {
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
}

export interface DepartmentRepositoryPort {
  findMany(filter: DepartmentListFilter, tx?: unknown): Promise<{ items: Department[]; next_cursor: string | null }>;
  findActiveOptions(tx?: unknown): Promise<Array<{ dep_id: number; name: string }>>;
  findById(id: number, tx?: unknown): Promise<Department | null>;
  findByName(name: string, tx?: unknown): Promise<Department | null>;
  create(data: { name: string; created_by: number }, tx?: unknown): Promise<Department>;
  update(id: number, data: { name?: string; is_active?: boolean; updated_by: number }, tx?: unknown): Promise<Department>;
  softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void>;
  hasActiveRolesOrEmployees(id: number, tx?: unknown): Promise<{ hasActiveRoles: boolean; hasActiveEmployees: boolean }>;
}

export const DEPARTMENT_REPOSITORY_TOKEN = Symbol('DepartmentRepositoryPort');
