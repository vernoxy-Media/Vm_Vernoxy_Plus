export class CompanyChannel {
  constructor(
    public readonly channel_id: number,
    public readonly company_id: number,
    public readonly channel_type: string,
    public readonly value: string,
    public readonly label: string | null,
    public readonly is_primary: boolean,
    public readonly created_at: Date,
    public readonly created_by: number,
    public readonly updated_at: Date | null,
    public readonly updated_by: number | null,
    public readonly deleted_at: Date | null,
    public readonly deleted_by: number | null,
  ) {}
}
