export class Person {
  constructor(
    public readonly person_id: number,
    public readonly name: string,
    public readonly email: string | null,
    public readonly mobile: string | null,
    public readonly linkedin_url: string | null,
    public readonly created_at: Date,
    public readonly created_by: number,
    public readonly updated_at: Date | null,
    public readonly updated_by: number | null,
    public readonly deleted_at: Date | null,
    public readonly deleted_by: number | null,
  ) {}
}
