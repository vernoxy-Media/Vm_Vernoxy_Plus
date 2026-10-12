export interface AccessPolicyPort {
  canManageOrganization(empId: number): Promise<boolean>;
}

export const ACCESS_POLICY_PORT_TOKEN = Symbol('AccessPolicyPort');
