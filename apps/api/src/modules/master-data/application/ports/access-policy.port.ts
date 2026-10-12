export interface MasterDataAccessPolicyPort {
  canManageOrganization(empId: number): Promise<boolean>;
  canManageCompanies(empId: number): Promise<boolean>;
}

export const MASTER_DATA_ACCESS_POLICY_PORT_TOKEN = Symbol('MasterDataAccessPolicyPort');
