import { Industry } from '../../domain/entities/industry.entity';

export interface IndustryWithCounts {
  industry: Industry;
  parent: { id: number; name: string } | null;
  sub_count: number;
  company_count: number;
}

export interface ListIndustriesParams {
  q?: string;
  parent_id?: number;
  level?: 'top' | 'sub';
  is_active?: boolean;
  limit?: number;
  cursor?: number;
}

export interface IndustryOption {
  id: number;
  name: string;
  is_default: boolean;
}

export interface IndustryRepositoryPort {
  findById(id: number): Promise<Industry | null>;
  findByName(name: string, parentId?: number | null): Promise<Industry | null>;
  list(params: ListIndustriesParams): Promise<{ items: IndustryWithCounts[]; next_cursor: number | null }>;
  getOptions(parentId?: number): Promise<IndustryOption[]>;
  create(data: { name: string; parent_id?: number | null; is_default?: boolean; created_by: number }): Promise<Industry>;
  update(id: number, data: { name?: string; is_active?: boolean; updated_by: number }): Promise<Industry>;
  softDelete(id: number, deleted_by: number): Promise<void>;
}

export const INDUSTRY_REPOSITORY_PORT = Symbol('IndustryRepositoryPort');
