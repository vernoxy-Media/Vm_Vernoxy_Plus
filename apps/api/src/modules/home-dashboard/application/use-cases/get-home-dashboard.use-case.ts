import {
  DeferredProfile,
  DashboardProfile,
  resolveDashboardProfile,
} from '../../domain/dashboard-profile';
import {
  AdminSection,
  AssignedComplaintsSection,
  DashboardActivityItem,
  DashboardAttendance,
  DashboardComplaints,
  DashboardDeadlineItem,
  DashboardExpenses,
  DashboardKbItem,
  DashboardLeaveRequests,
  DashboardMessages,
  DashboardProjectItem,
  DashboardTaskItem,
  ExpenseApprovalsSection,
  HomeDashboardRepositoryPort,
  ManagedProjectsSection,
  SalesSection,
  TaskKpis,
} from '../ports/home-dashboard.repository.port';

/** VM-004 global rules: lists show at most five records. */
export const DASHBOARD_LIST_LIMIT = 5;

export class DashboardViewerNotFoundError extends Error {
  constructor() {
    super('Your employee record is not active, so the dashboard cannot be shown.');
    this.name = 'DashboardViewerNotFoundError';
  }
}

export interface HomeDashboardResult {
  generated_at: string;
  viewer: { emp_id: number; name: string; role_name: string | null; department_name: string | null };
  profile: DashboardProfile;
  /** The VM-004 dashboard this designation will get once its access is agreed; null when none is pending. */
  deferred_profile: DeferredProfile | null;
  assignments: { project_manager: boolean; expense_approver: boolean; complaint_handler: boolean };
  task_kpis: TaskKpis;
  my_tasks: DashboardTaskItem[];
  recent_projects: DashboardProjectItem[];
  upcoming_deadlines: DashboardDeadlineItem[];
  attendance: DashboardAttendance;
  leave_requests: DashboardLeaveRequests;
  /** Null when the person never raised a claim: the card is hidden (VM-004 rule 9). */
  expenses: DashboardExpenses | null;
  /** Null when the person never raised a complaint: the card is hidden (VM-004 rule 10). */
  complaints: DashboardComplaints | null;
  recent_activities: DashboardActivityItem[];
  messages: DashboardMessages;
  knowledge_base: DashboardKbItem[];
  managed_projects: ManagedProjectsSection | null;
  expense_approvals: ExpenseApprovalsSection | null;
  assigned_complaints: AssignedComplaintsSection | null;
  admin: AdminSection | null;
  sales: SalesSection | null;
}

export class GetHomeDashboardUseCase {
  constructor(private readonly repo: HomeDashboardRepositoryPort) {}

  async execute(empId: number): Promise<HomeDashboardResult> {
    const viewer = await this.repo.getViewer(empId);
    if (!viewer) throw new DashboardViewerNotFoundError();

    const { profile, deferred } = resolveDashboardProfile({
      isAdmin: viewer.is_admin,
      isSales: viewer.is_sales,
      roleName: viewer.role_name,
    });
    const assignments = await this.repo.getAssignments(empId);
    const isApprover = assignments.expense_approver_dept_ids.length > 0;
    const n = DASHBOARD_LIST_LIMIT;

    const [
      task_kpis,
      my_tasks,
      recent_projects,
      upcoming_deadlines,
      attendance,
      leave_requests,
      expenses,
      complaints,
      recent_activities,
      messages,
      knowledge_base,
      managed_projects,
      expense_approvals,
      assigned_complaints,
      admin,
      sales,
    ] = await Promise.all([
      this.repo.getTaskKpis(empId),
      this.repo.getMyTasks(empId, n),
      this.repo.getRecentProjects(viewer, n),
      this.repo.getUpcomingDeadlines(viewer, n),
      this.repo.getAttendanceToday(empId),
      this.repo.getLeaveRequests(empId),
      this.repo.getExpenses(empId),
      this.repo.getComplaints(empId),
      this.repo.getRecentActivities(viewer, n),
      this.repo.getMessages(empId, n),
      this.repo.getKnowledgeBase(viewer, n),
      // Assignment-based sections: added only when the assignment exists, never from the designation alone
      assignments.project_manager ? this.repo.getManagedProjects(empId) : Promise.resolve(null),
      isApprover ? this.repo.getExpenseApprovals(empId, assignments.expense_approver_dept_ids) : Promise.resolve(null),
      assignments.complaint_handler ? this.repo.getAssignedComplaints(empId) : Promise.resolve(null),
      // Role sections: decided on the server from the same access the modules use
      profile === 'system_admin' && viewer.is_admin ? this.repo.getAdminSection() : Promise.resolve(null),
      profile === 'sales' && viewer.is_sales ? this.repo.getSalesSection(empId) : Promise.resolve(null),
    ]);

    return {
      generated_at: new Date().toISOString(),
      viewer: { emp_id: viewer.emp_id, name: viewer.name, role_name: viewer.role_name, department_name: viewer.department_name },
      profile,
      deferred_profile: deferred,
      assignments: {
        project_manager: assignments.project_manager,
        expense_approver: isApprover,
        complaint_handler: assignments.complaint_handler,
      },
      task_kpis,
      my_tasks,
      recent_projects,
      upcoming_deadlines,
      attendance,
      leave_requests,
      expenses: expenses.total > 0 ? expenses : null,
      complaints: complaints.total > 0 ? complaints : null,
      recent_activities,
      messages,
      knowledge_base,
      managed_projects,
      expense_approvals,
      assigned_complaints,
      admin,
      sales,
    };
  }
}
