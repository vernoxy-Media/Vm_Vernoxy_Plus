export class Company {
  constructor(
    public readonly company_id: number,
    public readonly name: string,
    public readonly customer_type_id: number,
    public readonly industry_id: number,
    public readonly sub_industry_id: number | null,
    public readonly parent_company_id: number | null,
    public readonly address: string | null,
    public readonly city: string | null,
    public readonly state: string | null,
    public readonly country: string | null,
    public readonly owner_id: number | null,
    public readonly is_active: boolean,
    public readonly created_at: Date,
    public readonly created_by: number,
    public readonly updated_at: Date | null,
    public readonly updated_by: number | null,
    public readonly deleted_at: Date | null,
    public readonly deleted_by: number | null,
  ) {}
}
