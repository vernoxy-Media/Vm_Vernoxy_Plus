import {
  ProjectEntity,
  ProjectStatus,
  ProjectType,
  ProjectCategory,
  SprintEntity,
  SprintStatus,
  ProjectTaskEntity,
} from '../entities/project.entity';

export const PROJECT_TOKENS = {
  ProjectRepository: Symbol('ProjectRepositoryPort'),
};

export interface CreateProjectInput {
  project_name: string;
  project_type: ProjectType;
  category: ProjectCategory;
  other_category?: string;
  start_date: string;
  deadline: string;
  project_manager_id: number;
  project_status?: ProjectStatus;
  member_ids: number[];
  client_name?: string;
  lead_received_date?: string;
  project_approved_date?: string;
  tech_frontend?: string;
  tech_backend?: string;
  tech_cloud?: string;
  // Deployment details
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
  // Admin credentials
  credentials?: Array<{
    admin_label?: string;
    admin_id: string;
    admin_password: string;
  }>;
  created_by: number;
}

export interface UpdateProjectInput {
  project_name?: string;
  project_type?: ProjectType;
  category?: ProjectCategory;
  other_category?: string;
  start_date?: string;
  deadline?: string;
  project_manager_id?: number;
  project_status?: ProjectStatus;
  member_ids?: number[];
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
    admin_label?: string;
    admin_id: string;
    admin_password: string;
  }>;
}

export interface ProjectsFilter {
  status?: string;
  project_manager_id?: number;
  project_type?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  employee_id?: number; // for non-admin scope
  is_admin?: boolean;
}

export interface AssignableEmployee {
  emp_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
  role_name?: string | null;
}

export interface CreateSprintInput {
  project_id: number;
  sprint_name: string;
  start_date: string;
  end_date: string;
  sprint_goal?: string;
  status?: SprintStatus;
  created_by: number;
}

export interface UpdateSprintInput {
  sprint_name?: string;
  start_date?: string;
  end_date?: string;
  sprint_goal?: string;
  status?: SprintStatus;
  updated_by: number;
}

export interface CreateProjectTaskInput {
  project_id: number;
  sprint_id?: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
  allocated_minutes?: number;
  assignee_ids: number[];
  created_by: number;
}

export interface ProjectRepositoryPort {
  createProject(input: CreateProjectInput): Promise<ProjectEntity>;
  getProjects(filter: ProjectsFilter): Promise<ProjectEntity[]>;
  getProjectById(projectId: number, requestingEmpId: number, isAdmin: boolean): Promise<ProjectEntity | null>;
  updateProjectStatus(
    projectId: number,
    status: ProjectStatus,
    reason: string | undefined,
    actorId: number,
  ): Promise<ProjectEntity>;
  getAssignableEmployees(): Promise<AssignableEmployee[]>;
  // Sprints & Project Tasks
  createSprint(input: CreateSprintInput): Promise<SprintEntity>;
  getSprints(projectId: number): Promise<SprintEntity[]>;
  updateSprint(sprintId: number, input: UpdateSprintInput): Promise<SprintEntity>;
  createProjectTask(input: CreateProjectTaskInput): Promise<ProjectTaskEntity>;
  getSprintTasks(projectId: number, sprintId?: number): Promise<ProjectTaskEntity[]>;
  updateProject(projectId: number, input: UpdateProjectInput, actorEmpId: number): Promise<ProjectEntity>;
  getDiscussions(projectId: number): Promise<any[]>;
  createDiscussion(projectId: number, senderEmpId: number, message: string, attachments?: any): Promise<any>;
  getActivityLogs(projectId: number): Promise<any[]>;
  getBugs(projectId: number): Promise<any[]>;
  getBugDetail(bugId: number): Promise<any>;
  createBug(projectId: number, reporterEmpId: number, input: any): Promise<any>;
  updateBugStatus(bugId: number, actorEmpId: number, newStatus: string, note?: string): Promise<any>;
  addBugComment(bugId: number, empId: number, comment: string): Promise<any>;
}
