export interface Department {
  dep_id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  created_by: number | null;
  updated_at: Date | null;
  updated_by: number | null;
  deleted_at: Date | null;
  deleted_by: number | null;
}
