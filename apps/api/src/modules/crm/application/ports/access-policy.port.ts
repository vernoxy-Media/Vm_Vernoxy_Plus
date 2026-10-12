export interface CompanyAccessPolicyPort {
  canManageCompanies(empId: number): Promise<boolean>;
}

export const COMPANY_ACCESS_POLICY_PORT_TOKEN = Symbol('CompanyAccessPolicyPort');
