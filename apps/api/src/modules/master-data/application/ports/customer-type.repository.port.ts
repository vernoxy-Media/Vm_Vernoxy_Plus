import { CustomerType } from '../../domain/entities/customer-type.entity';

export interface ListCustomerTypesParams {
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: number;
}

export interface CustomerTypeOption {
  id: number;
  name: string;
  is_default: boolean;
}

export interface CustomerTypeRepositoryPort {
  findById(id: number): Promise<CustomerType | null>;
  findByName(name: string): Promise<CustomerType | null>;
  findDefault(): Promise<CustomerType | null>;
  list(params: ListCustomerTypesParams): Promise<{ items: CustomerType[]; next_cursor: number | null }>;
  getOptions(): Promise<CustomerTypeOption[]>;
  create(data: { name: string; is_default?: boolean; created_by: number }): Promise<CustomerType>;
  update(id: number, data: { name?: string; is_active?: boolean; updated_by: number }): Promise<CustomerType>;
  switchDefault(newDefaultId: number, updated_by: number, data?: { name?: string; is_active?: boolean }): Promise<CustomerType>;
  softDelete(id: number, deleted_by: number): Promise<void>;
}

export const CUSTOMER_TYPE_REPOSITORY_PORT = Symbol('CustomerTypeRepositoryPort');
