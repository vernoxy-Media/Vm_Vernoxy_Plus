export interface LookupOption {
  id: number;
  code: string;
  label: string;
}

export interface MasterLookupRepositoryPort {
  getOptions(lookupType: string): Promise<LookupOption[]>;
}

export const MASTER_LOOKUP_REPOSITORY_PORT = Symbol('MasterLookupRepositoryPort');
