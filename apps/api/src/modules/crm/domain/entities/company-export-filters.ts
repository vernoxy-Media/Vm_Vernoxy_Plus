export interface CompanyExportFilters {
  q?: string;
  customer_type_id?: number;
  industry_id?: number;
  owner_id?: number;
  owner?: 'unassigned';
  is_active?: boolean;
}
