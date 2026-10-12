export interface IndustryProps {
  industry_id: number;
  name: string;
  parent_id?: number | null;
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
  created_by?: number | null;
  updated_at?: Date | null;
  updated_by?: number | null;
  deleted_at?: Date | null;
  deleted_by?: number | null;
}

export class Industry {
  constructor(public readonly props: IndustryProps) {}

  get industry_id(): number {
    return this.props.industry_id;
  }

  get name(): string {
    return this.props.name;
  }

  get parent_id(): number | null | undefined {
    return this.props.parent_id;
  }

  get is_active(): boolean {
    return this.props.is_active;
  }

  get is_default(): boolean {
    return this.props.is_default;
  }

  get isTopLevel(): boolean {
    return !this.props.parent_id;
  }

  get deleted_at(): Date | null | undefined {
    return this.props.deleted_at;
  }
}
