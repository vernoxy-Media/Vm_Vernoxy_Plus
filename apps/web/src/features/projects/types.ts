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

export interface AssignableEmployee {
  emp_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
  role_name?: string | null;
}

export interface ProjectMember {
  member_id: number;
  project_id: number;
  employee_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
  role_in_project: string;
}

export interface ProjectDeployment {
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

export interface ProjectCredential {
  credential_id: number;
  project_id: number;
  admin_label: string;
  admin_id: string;
  admin_password_encrypted?: string | null;
}

export interface ProjectItem {
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
  members: ProjectMember[];
  deployment?: ProjectDeployment | null;
  credentials: ProjectCredential[];
  total_tasks_count: number;
  completed_tasks_count: number;
  progress_percentage: number;
  total_estimated_minutes?: number;
  actual_work_minutes?: number;
  created_at: string;
  created_by?: number | null;
}

export interface CreateProjectPayload {
  project_name: string;
  project_type: ProjectType;
  category: ProjectCategory;
  other_category?: string;
  project_status?: ProjectStatus;
  start_date: string;
  deadline: string;
  project_manager_id: number;
  member_ids: number[];
  client_name?: string;
  lead_received_date?: string;
  project_approved_date?: string;
  tech_frontend?: string;
  tech_backend?: string;
  tech_cloud?: string;
  deployment?: {
    vercel_account?: string;
    vercel_link?: string;
    domain_link?: string;
    storage_account?: string;
    deployment_date?: string;
    go_live_date?: string;
    deployment_done_by?: number;
    admin_login_link?: string;
  };
  credentials?: Array<{
    admin_label: string;
    admin_id: string;
    admin_password: string;
  }>;
}

export interface ProjectsFilterParams {
  status?: string;
  project_type?: string;
  project_manager_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export type SprintStatus = 'planned' | 'in_progress' | 'completed';

export interface SprintItem {
  sprint_id: number;
  project_id: number;
  sprint_name: string;
  start_date: string;
  end_date: string;
  sprint_goal?: string | null;
  status: SprintStatus;
  total_tasks_count: number;
  completed_tasks_count: number;
  progress_percentage: number;
  created_at: string;
}

export interface CreateSprintPayload {
  sprint_name: string;
  start_date: string;
  end_date: string;
  sprint_goal?: string;
  status?: SprintStatus;
}

export interface ProjectTaskItem {
  task_id: number;
  task_code?: string;
  title: string;
  description?: string | null;
  priority?: string;
  stage?: string;
  status?: string;
  due_date?: string | null;
  allocated_minutes?: number | null;
  sprint_id?: number | null;
  project_id: number;
  assignees: Array<{
    emp_id: number;
    name: string;
    email: string;
    profile_picture?: string | null;
  }>;
  progress_percentage: number;
  created_at: string;
}

export interface CreateProjectTaskPayload {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  allocated_minutes?: number;
  sprint_id?: number;
  assignee_ids: number[];
}

export interface ProjectDiscussionItem {
  message_id: string;
  project_id: number;
  sender_emp_id: number;
  sender_name: string;
  sender_avatar?: string | null;
  message: string;
  created_at: string;
}

export interface ProjectActivityLogItem {
  log_id: string;
  project_id: number;
  actor_emp_id: number;
  actor_name: string;
  actor_avatar?: string | null;
  action_type: string;
  description: string;
  created_at: string;
}

export type BugStatus =
  | 'new'
  | 'open'
  | 'ready_for_dev'
  | 'dev_in_progress'
  | 'ready_for_qa'
  | 'qa_in_progress'
  | 'done'
  | 'not_a_bug';

export type BugPriority = 'low' | 'medium' | 'high';

export type BugType = 'frontend' | 'backend' | 'ui' | 'database' | 'other';

export interface BugCommentItem {
  comment_id: number;
  bug_id: number;
  emp_id: number;
  author_name: string;
  author_avatar?: string | null;
  comment: string;
  created_at: string;
}

export interface BugHistoryItem {
  history_id: string;
  bug_id: number;
  actor_emp_id: number;
  actor_name: string;
  from_status?: string | null;
  to_status: BugStatus;
  note?: string | null;
  created_at: string;
}

export interface ProjectBugItem {
  bug_id: number;
  bug_code: string;
  project_id: number;
  task_id?: number | null;
  title: string;
  description: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  assigned_to: number;
  assigned_to_name?: string;
  assigned_to_avatar?: string | null;
  reported_by: number;
  reported_by_name?: string;
  reported_by_avatar?: string | null;
  priority: BugPriority;
  status: BugStatus;
  bug_type: BugType;
  other_bug_type?: string | null;
  attachment_url?: string | null;
  dev_started_at?: string | null;
  dev_ended_at?: string | null;
  qa_started_at?: string | null;
  qa_ended_at?: string | null;
  total_time_minutes: number;
  created_at: string;
  comments?: BugCommentItem[];
  history?: BugHistoryItem[];
}

export interface CreateProjectBugPayload {
  title: string;
  description: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  assigned_to: number;
  priority?: BugPriority;
  bug_type: BugType;
  other_bug_type?: string;
  attachment_url?: string;
  task_id?: number;
}

