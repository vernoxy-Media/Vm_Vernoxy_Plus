export interface Employee {
  emp_id: number;
  name: string;
  email: string;
  mob: string;
  dep_id: number;
  role_id: number | null;
  reporting_manager: number | null;
  profile_picture?: string | null;
  profile_picture_url?: string | null;
  status: 'Active' | 'Inactive';
  joining_date: Date;
  exit_date: Date | null;
  created_at: Date;
  created_by: number | null;
  updated_at: Date | null;
  updated_by: number | null;
  deleted_at: Date | null;
  deleted_by: number | null;
  department?: {
    dep_id: number;
    name: string;
  };
  role?: {
    role_id: number;
    role_name: string;
  } | null;
  manager?: {
    emp_id: number;
    name: string;
  } | null;
}
