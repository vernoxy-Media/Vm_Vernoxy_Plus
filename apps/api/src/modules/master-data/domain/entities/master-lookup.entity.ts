export interface MasterLookupProps {
  lookup_id: number;
  lookup_type: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export class MasterLookup {
  constructor(public readonly props: MasterLookupProps) {}

  get lookup_id(): number {
    return this.props.lookup_id;
  }

  get lookup_type(): string {
    return this.props.lookup_type;
  }

  get code(): string {
    return this.props.code;
  }

  get label(): string {
    return this.props.label;
  }

  get sort_order(): number {
    return this.props.sort_order;
  }

  get is_active(): boolean {
    return this.props.is_active;
  }
}
