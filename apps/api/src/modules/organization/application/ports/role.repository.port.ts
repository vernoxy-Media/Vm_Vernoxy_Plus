import { Role } from '../../domain/entities/role.entity';

export interface RoleListFilter {
  dep_id?: number;
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
}

export interface RoleRepositoryPort {
  findMany(filter: RoleListFilter, tx?: unknown): Promise<{ items: Role[]; next_cursor: string | null }>;
  findActiveOptionsByDepartment(depId: number, tx?: unknown): Promise<Array<{ role_id: number; role_name: string }>>;
  findById(id: number, tx?: unknown): Promise<Role | null>;
  findByDepAndName(depId: number, name: string, tx?: unknown): Promise<Role | null>;
  create(data: { role_name: string; dep_id: number; description?: string | null; created_by: number }, tx?: unknown): Promise<Role>;
  update(id: number, data: { role_name?: string; description?: string | null; is_active?: boolean; updated_by: number }, tx?: unknown): Promise<Role>;
  softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void>;
  hasActiveEmployees(id: number, tx?: unknown): Promise<boolean>;
}

export const ROLE_REPOSITORY_TOKEN = Symbol('RoleRepositoryPort');
