export type ProjectType = 'client' | 'internal' | 'product' | 'maintenance';
export type ProjectCategory =
  | 'ecom_website'
  | 'portfolio_website'
  | 'seo'
  | 'social_media'
  | 'crm'
  | 'erp'
  | 'brochure'
  | 'other';
export type ProjectStatus =
  | 'new'
  | 'planning'
  | 'in_progress'
  | 'pending'
  | 'review'
  | 'delivered'
  | 'on_hold'
  | 'cancelled';

export interface ProjectMemberEntity {
  member_id: number;
  project_id: number;
  employee_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
  role_in_project: string;
}

export interface ProjectDeploymentEntity {
  deployment_id: number;
  project_id: number;
  vercel_account?: string | null;
  vercel_link?: string | null;
  domain_link?: string | null;
  storage_account?: string | null;
  deployment_date?: string | null;
  go_live_date?: string | null;
  deployment_done_by?: number | null;
  deployment_done_by_name?: string | null;
  admin_login_link?: string | null;
}

export interface ProjectCredentialEntity {
  credential_id: number;
  project_id: number;
  admin_label?: string | null;
  admin_id: string;
  admin_password_encrypted: string;
}

export interface ProjectEntity {
  project_id: number;
  project_no: string;
  project_name: string;
  project_type: ProjectType;
  category: ProjectCategory;
  other_category?: string | null;
  project_status: ProjectStatus;
  start_date: string;
  deadline: string;
  actual_end_date?: string | null;
  project_manager_id: number;
  project_manager_name: string;
  project_manager_email: string;
  project_manager_avatar?: string | null;
  status_change_reason?: string | null;
  client_name?: string | null;
  lead_received_date?: string | null;
  project_approved_date?: string | null;
  tech_frontend?: string | null;
  tech_backend?: string | null;
  tech_cloud?: string | null;
  members: ProjectMemberEntity[];
  deployment?: ProjectDeploymentEntity | null;
  credentials?: ProjectCredentialEntity[];
  total_tasks_count: number;
  completed_tasks_count: number;
  progress_percentage: number;
  total_estimated_minutes?: number;
  actual_work_minutes?: number;
  created_at: string;
  created_by?: number | null;
}

export interface ProjectSummaryStats {
  total_projects: number;
  in_progress_projects: number;
  planning_projects: number;
  completed_projects: number;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface SprintEntity {
  sprint_id: number;
  project_id: number;
  sprint_name: string;
  start_date: string;
  end_date: string;
  sprint_goal?: string | null;
  status: SprintStatus;
  total_tasks_count: number;
  completed_tasks_count: number;
  created_at: string;
  created_by?: number | null;
}

export interface ProjectTaskEntity {
  task_id: number;
  task_code: string;
  project_id: number;
  sprint_id?: number | null;
  sprint_name?: string | null;
  title: string;
  description?: string | null;
  priority: string;
  stage: string;
  status?: string;
  progress_percentage: number;
  due_date?: string | null;
  allocated_minutes?: number | null;
  assignees: Array<{
    emp_id: number;
    name: string;
    email: string;
    profile_picture?: string | null;
  }>;
  created_at: string;
}
