export interface SalesActor {
  emp_id: number;
  is_admin: boolean;
  is_sales: boolean;
}

export interface SalesAccessPolicyPort {
  /** Returns null for inactive / deleted / unknown employees. */
  getActor(empId: number): Promise<SalesActor | null>;
}

export const SALES_ACCESS_POLICY_PORT_TOKEN = Symbol('SalesAccessPolicyPort');
