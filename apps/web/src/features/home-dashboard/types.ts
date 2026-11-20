/** Response of GET /api/v1/home-dashboard (Main User Dashboard, BFD VM-004). */

export type DashboardProfile =
  | 'system_admin'
  | 'leadership'
  | 'hr_manager'
  | 'hr_executive'
  | 'recruiter'
  | 'finance_manager'
  | 'accountant'
  | 'payroll_executive'
  | 'sales'
  | 'business_analyst'
  | 'engineering'
  | 'qa'
  | 'design'
  | 'general';

export interface CountByKey {
  key: string;
  count: number;
  id?: number | null;
}

export interface TaskKpis {
  total: number;
  todo_in_progress: number;
  on_hold: number;
  in_review: number;
  done: number;
  overdue: number;
  due_today: number;
}

export interface DashboardTaskItem {
  task_id: number;
  task_code: string;
  title: string;
  project_id: number | null;
  project_name: string | null;
  priority: string;
  stage: string;
  due_date: string | null;
  start_date: string | null;
  allocated_minutes: number | null;
  bucket: 'today' | 'overdue' | 'upcoming' | 'no_date';
}

export interface DashboardProjectItem {
  project_id: number;
  project_no: string;
  project_name: string;
  project_status: string;
  deadline: string | null;
  progress: number;
  task_count: number;
  updated_at: string | null;
}

export interface DashboardDeadlineItem {
  kind: 'task' | 'project' | 'event';
  id: number;
  title: string;
  context: string | null;
  date: string;
}

export interface DashboardAttendance {
  checked_in: boolean;
  check_in_at: string | null;
  check_out_at: string | null;
  break_minutes: number;
  production_minutes: number;
  day_status: string | null;
}

export interface DashboardLeaveRequests {
  total: number;
  pending: number;
  latest: {
    request_id: number;
    request_no: string;
    leave_type_name: string | null;
    from_date: string;
    to_date: string;
    leave_days: number;
    status: string;
  } | null;
}

export interface DashboardExpenses {
  total: number;
  draft: number;
  waiting_approval: number;
  approved_unpaid: number;
  latest: { claim_id: number; claim_no: string | null; amount: number | null; status: string; expense_date: string } | null;
}

export interface DashboardComplaints {
  total: number;
  active: number;
  latest: { complaint_id: number; complaint_no: string; subject: string; status: string; updated_at: string } | null;
}

export interface DashboardActivityItem {
  log_id: string;
  entity_type: string;
  entity_id: number;
  event: string;
  summary: string;
  performed_by_name: string | null;
  performed_at: string;
}

export interface DashboardMessageItem {
  conversation_id: number;
  kind: string;
  title: string;
  preview: string | null;
  sender_name: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface DashboardKbItem {
  article_id: number;
  article_code: string;
  title: string;
  summary: string | null;
  category_name: string | null;
  updated_at: string;
}

export interface ManagedProjectsSection {
  counts: { managed: number; in_progress: number; delivered: number; on_hold: number };
  project_tasks: number;
  overdue_tasks: number;
  awaiting_approval: number;
  average_progress: number | null;
  task_stages: CountByKey[];
  projects: DashboardProjectItem[];
  overdue_list: Array<{ task_id: number; title: string; project_id: number; project_name: string; assignees: string | null; priority: string; due_date: string }>;
  workload: Array<{ emp_id: number; name: string; assigned: number; pending: number; overdue: number; allocated_minutes: number }>;
  priorities: CountByKey[];
  awaiting_list: Array<{ task_id: number; title: string; assignees: string | null; project_id: number; project_name: string; submitted_at: string | null; stage: string; due_date: string | null }>;
  upcoming: Array<{ kind: 'task' | 'project'; id: number; title: string; project_id: number; owner: string | null; date: string; status: string }>;
  sprints: Array<{ sprint_id: number; sprint_name: string; project_id: number; project_name: string; start_date: string; end_date: string; task_count: number; done_count: number }>;
}

export interface ExpenseApprovalsSection {
  waiting_count: number;
  waiting_amount: number;
  oldest_waiting_days: number;
  items: Array<{ claim_id: number; claim_no: string | null; employee_name: string; department_name: string | null; amount: number | null; submitted_at: string | null }>;
}

export interface AssignedComplaintsSection {
  open: number;
  overdue: number;
  awaiting_confirmation: number;
  items: Array<{ complaint_id: number; complaint_no: string; subject: string; priority: string | null; status: string; target_date: string | null; overdue: boolean }>;
}

export interface AdminSection {
  employees: { total: number; active: number; inactive: number; onboarding: number };
  department_distribution: CountByKey[];
  recruitment: { total: number; open: number; stages: CountByKey[]; monthly: Array<{ month: string; added: number; joined: number }> };
  projects: { total: number; in_progress: number; delivered: number; on_hold: number; statuses: CountByKey[] };
  tasks: { total: number; overdue: number; due_today: number; awaiting_review: number; stages: CountByKey[]; priorities: CountByKey[] };
  sales: { companies: number; not_yet_lead: number; leads: number; open_leads: number; clients: number; stages: CountByKey[]; follow_ups_today: number; follow_ups_overdue: number; lead_sources: CountByKey[]; companies_converted: number; won_this_month: number; won_this_year: number };
  leave: { pending: number; cancellation_requests: number };
  payroll: { payroll_month: number; payroll_year: number; status: string; total_employees: number; processed: number; warnings: number; total_salary: number; attendance_locked: boolean } | null;
  expenses: { pending_review: number; approved_unpaid: number; reimbursed: number };
  complaints: { new: number; in_progress: number; overdue: number; awaiting_confirmation: number };
  pending_approvals: Array<{ module: 'Leave' | 'Expense' | 'Task'; record_id: number; reference: string; owner: string; submitted_at: string | null; due_date: string | null; status: string }>;
  overdue_tasks: Array<{ task_id: number; title: string; project_id: number | null; project_name: string | null; assignees: string | null; priority: string; due_date: string; stage: string }>;
  projects_attention: Array<{ project_id: number; project_name: string; manager_name: string | null; project_status: string; progress: number; deadline: string; updated_at: string | null }>;
  recent_leads: Array<{ lead_id: number; company: string | null; owner_name: string | null; lead_stage: string | null; next_follow_up_at: string | null; last_conversation_at: string | null; updated_at: string | null }>;
  project_progress: Array<{ project_id: number; project_name: string; project_status: string; progress: number; deadline: string | null }>;
  attendance_today: { active: number; checked_in: number; still_working: number; on_leave: number; not_yet_in: number };
  upcoming_leave: Array<{ request_id: number; employee_name: string; department_name: string | null; leave_type_name: string | null; from_date: string; to_date: string; days: number }>;
  onboarding: Array<{ emp_id: number; name: string; role_name: string | null; department_name: string | null; joining_date: string | null }>;
  payroll_warnings: Array<{ payroll_month: number; payroll_year: number; run_status: string; employee_code: string; employee_name: string; warning_type: string }>;
  complaint_queue: Array<{ complaint_id: number; complaint_no: string; subject: string; department_name: string | null; handler_name: string | null; priority: string | null; target_date: string | null; status: string }>;
}

export interface SalesSection {
  companies: number;
  not_yet_lead: number;
  my_leads: number;
  open_leads: number;
  converted: number;
  stages: CountByKey[];
  follow_ups_today: number;
  follow_ups_overdue: number;
  my_clients: number;
  companies_converted: number;
  won_this_month: number;
  won_this_year: number;
  follow_up_counts: { today: number; overdue: number; upcoming: number; completed: number; cancelled: number };
  leads: Array<{ lead_id: number; company: string | null; contact: string | null; lead_stage: string | null; lead_source: string | null; service_fit: string | null; next_follow_up_at: string | null; last_conversation_at: string | null }>;
  follow_ups: Array<{ follow_up_id: number; lead_id: number | null; company: string | null; contact: string | null; type: string; follow_up_on: string; purpose: string | null; status: string; assigned_to_name: string | null }>;
  recent_companies: Array<{ company_id: number; name: string; company_code: string | null; city: string | null; industry: string | null; contact: string | null; status: 'Client' | 'Open lead' | 'Not a lead' }>;
  recent_clients: Array<{ client_id: number; company_name: string; client_code: string | null; won_on: string }>;
}

export interface PeopleSection {
  employees: null | {
    total: number;
    active: number;
    inactive: number;
    onboarding: number;
    new_joiners: number;
    departments: CountByKey[];
    designations: CountByKey[];
    monthly_joining: Array<{ month: string; joined: number }>;
    recent: Array<{ emp_id: number; name: string; role_name: string | null; department_name: string | null; joining_date: string | null; status: string }>;
  };
  candidates: null | {
    total: number;
    new: number;
    interviewing: number;
    selected: number;
    on_hold: number;
    in_process: number;
    requiring_action: number;
    overdue_review: number;
    stages: CountByKey[];
    by_position: CountByKey[];
    by_source: CountByKey[];
    recent: Array<{ candidate_id: number; name: string; position: string | null; source: string | null; stage: string; updated_at: string | null }>;
    decisions: Array<{ candidate_id: number; name: string; position: string | null; stage: string; review_date: string | null }>;
  };
  attendance: null | {
    active: number;
    present_today: number;
    still_working: number;
    on_leave: number;
    not_yet_in: number;
    regularization_pending: number;
    regularizations: Array<{ correction_id: number; employee_name: string; work_date: string; reason: string; submitted_at: string | null }>;
  };
  leave: null | {
    pending: number;
    rows: Array<{ request_id: number; employee_name: string; department_name: string | null; leave_type_name: string | null; from_date: string; to_date: string; days: number; submitted_at: string | null; status: string }>;
  };
  onboarding: null | Array<{ emp_id: number; name: string; role_name: string | null; department_name: string | null; joining_date: string | null; missing_documents: number }>;
  documents: null | { missing_total: number; queue: Array<{ emp_id: number; employee_name: string; document_type: string; status: string; updated_at: string | null }> };
}

export interface PayrollRunSummary {
  payroll_month: number;
  payroll_year: number;
  status: string;
  included: number;
  processed: number;
  warnings: number;
  total_salary: number;
  attendance_locked: boolean;
}

export interface PayrollSection {
  current: PayrollRunSummary | null;
  runs: PayrollRunSummary[];
  exceptions: Array<{ employee_code: string; employee_name: string; issue: string; run_status: string }>;
  shift_issues: Array<{ employee_code: string; employee_name: string; issue: string; run_status: string }>;
}

export interface HomeDashboardData {
  generated_at: string;
  viewer: { emp_id: number; name: string; role_name: string | null; department_name: string | null };
  profile: DashboardProfile;
  assignments: { project_manager: boolean; expense_approver: boolean; complaint_handler: boolean };
  task_kpis: TaskKpis;
  my_tasks: DashboardTaskItem[];
  recent_projects: DashboardProjectItem[];
  upcoming_deadlines: DashboardDeadlineItem[];
  attendance: DashboardAttendance;
  leave_requests: DashboardLeaveRequests;
  expenses: DashboardExpenses | null;
  complaints: DashboardComplaints | null;
  recent_activities: DashboardActivityItem[];
  messages: { unread_conversations: number; items: DashboardMessageItem[] };
  knowledge_base: DashboardKbItem[];
  managed_projects: ManagedProjectsSection | null;
  expense_approvals: ExpenseApprovalsSection | null;
  assigned_complaints: AssignedComplaintsSection | null;
  admin: AdminSection | null;
  sales: SalesSection | null;
  people: PeopleSection | null;
  payroll: PayrollSection | null;
}
