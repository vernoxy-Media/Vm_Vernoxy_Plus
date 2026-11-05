export interface SalesRights {
  can_import: boolean;
  can_export: boolean;
}

export interface SalesUserRights extends SalesRights {
  emp_id: number;
  name: string;
  is_admin: boolean;
}

export interface SalesRightsRepositoryPort {
  get(empId: number): Promise<SalesRights>;
  /** Every active Sales user and Admin with their rights (the Admin has both by role). */
  listUsers(): Promise<SalesUserRights[]>;
  /** Only a Sales user or Admin can be given rights; returns false for anyone else. */
  set(empId: number, rights: Partial<SalesRights>, actorEmpId: number): Promise<SalesUserRights | null>;
}

export const SALES_RIGHTS_REPOSITORY_PORT_TOKEN = Symbol('SalesRightsRepositoryPort');
