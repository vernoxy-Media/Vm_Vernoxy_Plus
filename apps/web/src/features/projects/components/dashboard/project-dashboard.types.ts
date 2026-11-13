import { ProjectCategory, ProjectStatus, ProjectType } from '../../types';

export interface ProjectDashboardFilters {
  project: string; // 'All' or project_id
  category: string; // 'All' or ProjectCategory
  status: string; // 'All' or ProjectStatus
  projectType: string; // 'All' or ProjectType
  projectManager: string; // 'All' or emp_id
  client: string; // 'All' or client name (Page 4 wireframe)
  dateRangePreset: string; // 'all_time' | 'this_month' | 'this_year' | 'last_30_days' | 'last_90_days' | 'custom'
  dateRange: {
    startDate: string;
    endDate: string;
  };
  search: string;
}

export const INITIAL_PROJECT_DASHBOARD_FILTERS: ProjectDashboardFilters = {
  project: 'All',
  category: 'All',
  status: 'All',
  projectType: 'All',
  projectManager: 'All',
  client: 'All',
  dateRangePreset: 'all_time',
  dateRange: {
    startDate: '',
    endDate: '',
  },
  search: '',
};

export const ALL_PROJECT_CATEGORIES: { key: ProjectCategory; label: string; color: string }[] = [
  { key: 'ecom_website', label: 'E-com Website', color: '#6366f1' },
  { key: 'crm', label: 'CRM', color: '#8b5cf6' },
  { key: 'erp', label: 'ERP', color: '#3b82f6' },
  { key: 'seo', label: 'SEO', color: '#14b8a6' },
  { key: 'portfolio_website', label: 'Portfolio Website', color: '#06b6d4' },
  { key: 'social_media', label: 'Social Media', color: '#ec4899' },
  { key: 'brochure', label: 'Brochure', color: '#f59e0b' },
  { key: 'other', label: 'Other', color: '#64748b' },
];

export const ALL_PROJECT_STATUSES: { key: ProjectStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#38bdf8' },
  { key: 'planning', label: 'Planning', color: '#c084fc' },
  { key: 'in_progress', label: 'In Progress', color: '#2563eb' },
  { key: 'pending', label: 'Pending', color: '#f97316' },
  { key: 'review', label: 'Review', color: '#14b8a6' },
  { key: 'delivered', label: 'Delivered', color: '#22c55e' },
  { key: 'on_hold', label: 'On-hold', color: '#64748b' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export interface ProjectTaskDetail {
  task_id: number;
  title: string;
  stage: string; // 'completed' | 'in_progress' | 'assigned' | 'cancelled' | etc.
  allocated_hours: number;
  actual_hours: number;
  assigned_employee_id?: number;
  assigned_employee_name?: string;
}

export interface ProjectFinancials {
  revenue?: number; // in ₹ (e.g. 500000 = 5.0L)
  approved_expenses?: number; // in ₹
}

export interface ProjectBugDetail {
  bug_id: number;
  project_id: number;
  title: string;
  status: string; // 'done', 'dev_in_progress', 'qa_in_progress', 'not_a_bug', etc.
  dev_hours: number;
  qa_hours: number;
  done_date?: string; // ISO date string
}

export interface EnrichedProjectItem {
  project_id: number;
  project_no: string;
  project_name: string;
  project_type: ProjectType;
  category: ProjectCategory;
  project_status: ProjectStatus;
  start_date: string;
  deadline: string;
  actual_end_date?: string | null;
  project_manager_id: number;
  project_manager_name: string;
  client_name?: string | null;
  members: Array<{
    employee_id: number;
    name: string;
    role_in_project?: string;
  }>;
  total_tasks_count: number;
  completed_tasks_count: number;
  progress_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  tasks: ProjectTaskDetail[];
  financials: ProjectFinancials;
  bugs: ProjectBugDetail[];
}
