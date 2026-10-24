export interface LookupOption {
  id: number;
  code: string;
  label: string;
}

export interface MasterLookupItem {
  id: number;
  lookup_type: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateMasterLookupInput {
  lookup_type: string;
  code?: string;
  label: string;
  sort_order?: number;
  is_active?: boolean;
  actor_id?: number;
}

export interface UpdateMasterLookupInput {
  id: number;
  code?: string;
  label?: string;
  sort_order?: number;
  is_active?: boolean;
  actor_id?: number;
}

export interface MasterLookupRepositoryPort {
  getOptions(lookupType: string): Promise<LookupOption[]>;
  getAll(lookupType?: string): Promise<MasterLookupItem[]>;
  getById(id: number): Promise<MasterLookupItem | null>;
  create(input: CreateMasterLookupInput): Promise<MasterLookupItem>;
  update(input: UpdateMasterLookupInput): Promise<MasterLookupItem>;
  delete(id: number, actorId?: number): Promise<void>;
}

export const MASTER_LOOKUP_REPOSITORY_PORT = Symbol('MasterLookupRepositoryPort');

