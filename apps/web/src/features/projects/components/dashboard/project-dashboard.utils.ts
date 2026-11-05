import {
  EnrichedProjectItem,
  ProjectDashboardFilters,
  ALL_PROJECT_STATUSES,
  ALL_PROJECT_CATEGORIES,
} from './project-dashboard.types';

// ==========================================
// Centralized Project Filtering Engine (US01)
// ==========================================

export function filterProjects(
  projects: EnrichedProjectItem[],
  filters: ProjectDashboardFilters
): EnrichedProjectItem[] {
  return projects.filter((proj) => {
    // 1. Specific Project Filter
    if (filters.project !== 'All' && String(proj.project_id) !== String(filters.project)) {
      return false;
    }

    // 2. Category Filter
    if (filters.category !== 'All' && proj.category !== filters.category) {
      return false;
    }

    // 3. Status Filter
    if (filters.status !== 'All' && proj.project_status !== filters.status) {
      return false;
    }

    // 4. Project Type Filter
    if (filters.projectType !== 'All' && proj.project_type !== filters.projectType) {
      return false;
    }

    // 5. Project Manager Filter
    if (
      filters.projectManager !== 'All' &&
      String(proj.project_manager_id) !== String(filters.projectManager)
    ) {
      return false;
    }

    // 6. Date Range Filter (Applied to Project Start Date)
    if (filters.dateRange.startDate) {
      const projStart = new Date(proj.start_date).getTime();
      const filterStart = new Date(filters.dateRange.startDate).getTime();
      if (!isNaN(projStart) && !isNaN(filterStart) && projStart < filterStart) {
        return false;
      }
    }
    if (filters.dateRange.endDate) {
      const projStart = new Date(proj.start_date).getTime();
      const filterEnd = new Date(filters.dateRange.endDate).getTime();
      if (!isNaN(projStart) && !isNaN(filterEnd) && projStart > filterEnd) {
        return false;
      }
    }

    // 7. Global Search (Project No, Name, Manager, Category, Team Member Name)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchNo = proj.project_no?.toLowerCase().includes(q);
      const matchName = proj.project_name?.toLowerCase().includes(q);
      const matchPM = proj.project_manager_name?.toLowerCase().includes(q);
      const matchCat = proj.category?.toLowerCase().includes(q);
      const matchMembers = proj.members?.some((m) => m.name?.toLowerCase().includes(q));

      if (!matchNo && !matchName && !matchPM && !matchCat && !matchMembers) {
        return false;
      }
    }

    return true;
  });
}

// Format date to DD-MM-YYYY
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format currency in Lakh: ₹X.XL
export function formatLakh(amountInRupees: number): string {
  const lakh = amountInRupees / 100000;
  return `₹${lakh.toFixed(1)}L`;
}

// ==========================================
// Chart 1: Project Status Overview (US02)
// Donut Chart across all 8 predefined statuses
// ==========================================

export interface ProjectStatusItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ProjectStatusOverviewResult {
  total: number;
  items: ProjectStatusItem[];
}

export function computeProjectStatusOverview(
  projects: EnrichedProjectItem[],
  statusFilter: string
): ProjectStatusOverviewResult {
  const total = projects.length;

  const items = ALL_PROJECT_STATUSES.map((statusDef) => {
    const count = projects.filter((p) => p.project_status === statusDef.key).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      key: statusDef.key,
      label: statusDef.label,
      count,
      percentage,
      color: statusDef.color,
    };
  });

  // When status filter is applied, show only the selected status
  const filteredItems =
    statusFilter !== 'All' ? items.filter((i) => i.key === statusFilter) : items;

  return {
    total,
    items: filteredItems,
  };
}

// ==========================================
// Chart 2: Project Progress by Project (US03)
// Horizontal Progress Bar Chart
// ==========================================

export interface ProjectProgressItem {
  projectId: number;
  projectNo: string;
  projectName: string;
  completedTasks: number;
  totalTasks: number;
  progressPercentage: number;
  color: string; // red < 40%, amber 40-69%, green >= 70%
  tooltipText: string;
}

export function computeProjectProgress(
  projects: EnrichedProjectItem[],
  statusFilter: string
): ProjectProgressItem[] {
  // Cancelled projects are not shown unless the Admin selects the Cancelled status
  const eligibleProjects = projects.filter((p) => {
    if (statusFilter === 'cancelled') {
      return p.project_status === 'cancelled';
    }
    if (statusFilter !== 'All') {
      return p.project_status === statusFilter;
    }
    // Default: exclude cancelled projects
    return p.project_status !== 'cancelled';
  });

  const progressList = eligibleProjects.map((p) => {
    // Exclude cancelled tasks from calculation
    const validTasks = p.tasks ? p.tasks.filter((t) => t.stage !== 'cancelled') : [];
    const total = validTasks.length > 0 ? validTasks.length : p.total_tasks_count;
    const completed =
      validTasks.length > 0
        ? validTasks.filter((t) => t.stage === 'completed').length
        : p.completed_tasks_count;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    let color = '#ef4444'; // < 40% red
    if (percentage >= 70) {
      color = '#22c55e'; // >= 70% green
    } else if (percentage >= 40) {
      color = '#f59e0b'; // 40-69% amber
    }

    const tooltipText = total === 0 ? 'No tasks added' : `${completed} of ${total} tasks completed (${percentage}%)`;

    return {
      projectId: p.project_id,
      projectNo: p.project_no,
      projectName: p.project_name,
      completedTasks: completed,
      totalTasks: total,
      progressPercentage: percentage,
      color,
      tooltipText,
    };
  });

  // Sorted with the lowest progress first (projects needing attention at the top)
  progressList.sort((a, b) => a.progressPercentage - b.progressPercentage);

  return progressList;
}

// ==========================================
// Chart 3: Projects by Category (US04)
// Vertical Bar Chart
// ==========================================

export interface ProjectsByCategoryItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export function computeProjectsByCategory(
  projects: EnrichedProjectItem[]
): ProjectsByCategoryItem[] {
  const total = projects.length;

  const items = ALL_PROJECT_CATEGORIES.map((cat) => {
    const count = projects.filter((p) => p.category === cat.key).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      key: cat.key,
      label: cat.label,
      count,
      percentage,
      color: cat.color,
    };
  });

  // Sorted from highest project count to lowest
  items.sort((a, b) => b.count - a.count);

  return items;
}

// ==========================================
// Chart 4: Upcoming Project Deadlines (US05)
// Timeline Chart
// ==========================================

export interface DeadlineProjectItem {
  projectId: number;
  projectNo: string;
  projectName: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryDateFormatted: string; // DD-MM-YYYY
  daysRemaining: number;
  isOverdue: boolean;
  status: string;
  progressPercentage: number;
  color: string; // red if overdue or <=7d, amber 8-30d, green >30d
}

export function computeUpcomingDeadlines(
  projects: EnrichedProjectItem[],
  windowDays: number = 90
): DeadlineProjectItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Delivered and Cancelled projects are not shown
  const activeProjects = projects.filter(
    (p) => p.project_status !== 'delivered' && p.project_status !== 'cancelled'
  );

  const list: DeadlineProjectItem[] = [];

  for (const p of activeProjects) {
    if (!p.deadline) continue;
    const deadlineDate = new Date(p.deadline);
    if (isNaN(deadlineDate.getTime())) continue;
    deadlineDate.setHours(0, 0, 0, 0);

    const diffMs = deadlineDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;

    // Include if overdue OR deadline is within window
    if (isOverdue || daysRemaining <= windowDays) {
      let color = '#22c55e'; // > 30 days = green
      if (isOverdue || daysRemaining <= 7) {
        color = '#ef4444'; // overdue or due within 7 days = red
      } else if (daysRemaining <= 30) {
        color = '#f59e0b'; // 8 to 30 days = amber
      }

      list.push({
        projectId: p.project_id,
        projectNo: p.project_no,
        projectName: p.project_name,
        deliveryDate: p.deadline,
        deliveryDateFormatted: formatDateDDMMYYYY(p.deadline),
        daysRemaining,
        isOverdue,
        status: p.project_status,
        progressPercentage: p.progress_percentage || 0,
        color,
      });
    }
  }

  // Ordered by deadline (earliest first / overdue first)
  list.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return list;
}

// ==========================================
// Chart 5: Estimated vs Actual Work Hours (US06)
// Clustered Column Chart
// ==========================================

export interface ProjectHoursComparisonItem {
  projectId: number;
  projectName: string;
  estimatedHours: number;
  actualHours: number;
  varianceHours: number;
  variancePercentage: string; // e.g. "+15%" or "N/A"
  isOverEstimate: boolean;
  actualColor: string; // red if actual > estimated, green if actual <= estimated
}

export function computeEstimatedVsActualHours(
  projects: EnrichedProjectItem[]
): ProjectHoursComparisonItem[] {
  const comparisons: ProjectHoursComparisonItem[] = projects.map((p) => {
    const estimated = p.estimated_hours || 0;
    const actual = p.actual_hours || 0;
    const variance = actual - estimated;
    const isOver = actual > estimated;

    let variancePercentage = 'N/A';
    if (estimated > 0) {
      const pct = Math.round((variance / estimated) * 100);
      variancePercentage = pct >= 0 ? `+${pct}%` : `${pct}%`;
    }

    return {
      projectId: p.project_id,
      projectName: p.project_name,
      estimatedHours: estimated,
      actualHours: actual,
      varianceHours: variance,
      variancePercentage,
      isOverEstimate: isOver,
      actualColor: isOver ? '#ef4444' : '#22c55e',
    };
  });

  // First 8 projects with highest actual hours shown
  comparisons.sort((a, b) => b.actualHours - a.actualHours);

  return comparisons;
}

// ==========================================
// Chart 6: Person-wise Work Hours (US07)
// Dumbbell Chart
// ==========================================

export interface PersonWorkHoursItem {
  employeeId: number;
  employeeName: string;
  estimatedHours: number;
  actualHours: number;
  differenceHours: number; // actual - estimated
  diffLabel: string; // e.g. "+25 h" or "-10 h"
  isOverEstimate: boolean;
  color: string; // red if actual > estimated, green if actual <= estimated
}

export function computePersonWiseWorkHours(
  projects: EnrichedProjectItem[],
  selectedProjectId: string // 'All' or specific project_id
): PersonWorkHoursItem[] {
  const targetProjects =
    selectedProjectId === 'All'
      ? projects
      : projects.filter((p) => String(p.project_id) === String(selectedProjectId));

  const personMap = new Map<
    number,
    { name: string; estimated: number; actual: number }
  >();

  for (const proj of targetProjects) {
    if (proj.tasks && proj.tasks.length > 0) {
      for (const t of proj.tasks) {
        if (!t.assigned_employee_id || t.stage === 'cancelled') continue;
        const empId = t.assigned_employee_id;
        const empName = t.assigned_employee_name || 'Team Member';
        const curr = personMap.get(empId) || { name: empName, estimated: 0, actual: 0 };
        curr.estimated += t.allocated_hours || 0;
        curr.actual += t.actual_hours || 0;
        personMap.set(empId, curr);
      }
    } else {
      // Fallback from members
      for (const m of proj.members) {
        const empId = m.employee_id;
        const empName = m.name;
        const curr = personMap.get(empId) || { name: empName, estimated: 0, actual: 0 };
        curr.estimated += Math.round((proj.estimated_hours || 0) / (proj.members.length || 1));
        curr.actual += Math.round((proj.actual_hours || 0) / (proj.members.length || 1));
        personMap.set(empId, curr);
      }
    }
  }

  const result: PersonWorkHoursItem[] = [];
  personMap.forEach((val, id) => {
    const diff = val.actual - val.estimated;
    const isOver = val.actual > val.estimated;
    result.push({
      employeeId: id,
      employeeName: val.name,
      estimatedHours: val.estimated,
      actualHours: val.actual,
      differenceHours: diff,
      diffLabel: diff >= 0 ? `+${diff} h` : `${diff} h`,
      isOverEstimate: isOver,
      color: isOver ? '#ef4444' : '#22c55e',
    });
  });

  // Sorted by actual hours, highest first
  result.sort((a, b) => b.actualHours - a.actualHours);

  return result;
}

// ==========================================
// Chart 7: Bug Resolution Time: Dev vs QA (US08)
// Line Chart across last N months
// ==========================================

export interface MonthlyBugResolutionItem {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "May", "Jun"
  avgDevHours: number;
  avgQaHours: number;
  completedBugsCount: number;
}

export function computeBugResolutionTime(
  projects: EnrichedProjectItem[],
  periodMonths: number = 6
): MonthlyBugResolutionItem[] {
  // Generate the last N months ending in current month
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = periodMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    months.push({ key, label });
  }

  // Aggregate bugs from all filtered projects
  const allBugs = projects.flatMap((p) => p.bugs || []);
  // Only bugs with status Done, exclude Not a Bug
  const doneBugs = allBugs.filter((b) => b.status === 'done');

  return months.map((m) => {
    const bugsInMonth = doneBugs.filter((b) => {
      if (!b.done_date) return false;
      return b.done_date.startsWith(m.key);
    });

    const count = bugsInMonth.length;
    let avgDev = 0;
    let avgQa = 0;

    if (count > 0) {
      const totalDev = bugsInMonth.reduce((acc, b) => acc + (b.dev_hours || 0), 0);
      const totalQa = bugsInMonth.reduce((acc, b) => acc + (b.qa_hours || 0), 0);
      avgDev = Number((totalDev / count).toFixed(1));
      avgQa = Number((totalQa / count).toFixed(1));
    }

    return {
      monthKey: m.key,
      monthLabel: m.label,
      avgDevHours: avgDev,
      avgQaHours: avgQa,
      completedBugsCount: count,
    };
  });
}

// ==========================================
// Chart 8: Actual Expenses by Project (US09)
// Lollipop Chart
// ==========================================

export interface ProjectExpenseItem {
  projectId: number;
  projectName: string;
  actualExpense: number; // in ₹
  expenseInLakh: string; // e.g. "₹9.8L"
  shareOfTotal: number; // percentage
}

export interface ActualExpensesResult {
  totalExpense: number; // in ₹
  totalExpenseFormatted: string; // in ₹ Lakh
  items: ProjectExpenseItem[];
}

export function computeActualExpenses(
  projects: EnrichedProjectItem[]
): ActualExpensesResult {
  const itemsWithExpenses = projects.map((p) => {
    const expense = p.financials?.approved_expenses || 0;
    return {
      projectId: p.project_id,
      projectName: p.project_name,
      actualExpense: expense,
      expenseInLakh: formatLakh(expense),
      shareOfTotal: 0,
    };
  });

  // Total expense of all filtered projects
  const totalExpense = itemsWithExpenses.reduce((sum, item) => sum + item.actualExpense, 0);

  // Calculate percentage share
  const items = itemsWithExpenses.map((item) => ({
    ...item,
    shareOfTotal: totalExpense > 0 ? Math.round((item.actualExpense / totalExpense) * 100) : 0,
  }));

  // Sort from highest expense to lowest
  items.sort((a, b) => b.actualExpense - a.actualExpense);

  return {
    totalExpense,
    totalExpenseFormatted: formatLakh(totalExpense),
    items,
  };
}

// ==========================================
// Chart 9: Project Profitability (US10)
// Diverging Bar Chart
// ==========================================

export interface ProjectProfitabilityItem {
  projectId: number;
  projectName: string;
  revenue: number; // in ₹
  actualExpenses: number; // in ₹
  profitOrLoss: number; // in ₹
  profitOrLossLakh: string; // e.g. "+₹3.4L" or "-₹0.8L"
  isProfit: boolean;
  profitMarginPercentage: number;
}

export function computeProjectProfitability(
  projects: EnrichedProjectItem[]
): ProjectProfitabilityItem[] {
  // Only projects that have a project revenue recorded are shown
  const eligible = projects.filter((p) => (p.financials?.revenue ?? 0) > 0);

  const items: ProjectProfitabilityItem[] = eligible.map((p) => {
    const rev = p.financials.revenue || 0;
    const exp = p.financials.approved_expenses || 0;
    const diff = rev - exp;
    const isProfit = diff >= 0;
    const margin = rev > 0 ? Math.round((diff / rev) * 100) : 0;
    const lakhFormatted = isProfit ? `+${formatLakh(diff)}` : `-${formatLakh(Math.abs(diff))}`;

    return {
      projectId: p.project_id,
      projectName: p.project_name,
      revenue: rev,
      actualExpenses: exp,
      profitOrLoss: diff,
      profitOrLossLakh: lakhFormatted,
      isProfit,
      profitMarginPercentage: margin,
    };
  });

  // Sorted from highest profit to highest loss
  items.sort((a, b) => b.profitOrLoss - a.profitOrLoss);

  return items;
}
