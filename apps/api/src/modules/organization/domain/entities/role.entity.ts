export interface Role {
  role_id: number;
  role_name: string;
  dep_id: number;
  description: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: Date;
  created_by: number | null;
  updated_at: Date | null;
  updated_by: number | null;
  deleted_at: Date | null;
  deleted_by: number | null;
}
