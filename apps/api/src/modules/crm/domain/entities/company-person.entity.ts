export class CompanyPerson {
  constructor(
    public readonly company_person_id: number,
    public readonly company_id: number,
    public readonly person_id: number,
    public readonly designation: string | null,
    public readonly department_id: number | null,
    public readonly is_primary: boolean,
    public readonly reports_to_company_person_id: number | null,
    public readonly created_at: Date,
    public readonly created_by: number,
    public readonly updated_at: Date | null,
    public readonly updated_by: number | null,
    public readonly deleted_at: Date | null,
    public readonly deleted_by: number | null,
  ) {}
}
