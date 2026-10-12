export interface CustomerTypeProps {
  customer_type_id: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
  created_by?: number | null;
  updated_at?: Date | null;
  updated_by?: number | null;
  deleted_at?: Date | null;
  deleted_by?: number | null;
}

export class CustomerType {
  constructor(public readonly props: CustomerTypeProps) {}

  get customer_type_id(): number {
    return this.props.customer_type_id;
  }

  get name(): string {
    return this.props.name;
  }

  get is_active(): boolean {
    return this.props.is_active;
  }

  get is_default(): boolean {
    return this.props.is_default;
  }

  get deleted_at(): Date | null | undefined {
    return this.props.deleted_at;
  }
}
