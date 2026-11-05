import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProjects,
  computeProjectStatusOverview,
  computeProjectProgress,
  computeProjectsByCategory,
  computeUpcomingDeadlines,
  computeEstimatedVsActualHours,
  computePersonWiseWorkHours,
  computeBugResolutionTime,
  computeActualExpenses,
  computeProjectProfitability,
  formatDateDDMMYYYY,
  formatLakh,
} from './project-dashboard.utils';
import {
  EnrichedProjectItem,
  INITIAL_PROJECT_DASHBOARD_FILTERS,
} from './project-dashboard.types';

// Mock test dataset for US01 - US10 validation
const MOCK_PROJECTS: EnrichedProjectItem[] = [
  {
    project_id: 1,
    project_no: 'VM-MN001',
    project_name: 'Retail ERP Rollout',
    project_type: 'maintenance',
    category: 'erp',
    project_status: 'planning',
    start_date: '2026-08-01',
    deadline: '2026-10-28',
    project_manager_id: 10,
    project_manager_name: 'Krishna',
    client_name: 'RetailCorp',
    members: [
      { employee_id: 101, name: 'Aarav Shah' },
      { employee_id: 102, name: 'Diya Patel' },
    ],
    total_tasks_count: 20,
    completed_tasks_count: 7,
    progress_percentage: 35,
    estimated_hours: 1500,
    actual_hours: 1810,
    tasks: [
      { task_id: 1, title: 'Database setup', stage: 'completed', allocated_hours: 185, actual_hours: 210, assigned_employee_id: 101, assigned_employee_name: 'Aarav Shah' },
      { task_id: 2, title: 'POS integration', stage: 'in_progress', allocated_hours: 150, actual_hours: 140, assigned_employee_id: 102, assigned_employee_name: 'Diya Patel' },
      { task_id: 3, title: 'Legacy export', stage: 'cancelled', allocated_hours: 50, actual_hours: 0, assigned_employee_id: 101, assigned_employee_name: 'Aarav Shah' },
    ],
    financials: { revenue: 900000, approved_expenses: 980000 },
    bugs: [
      { bug_id: 1, project_id: 1, title: 'Invoice rounding mismatch', status: 'done', dev_hours: 16.5, qa_hours: 8.5, done_date: '2026-10-15' },
      { bug_id: 2, project_id: 1, title: 'POS sync latency', status: 'done', dev_hours: 14.2, qa_hours: 7.1, done_date: '2026-09-20' },
      { bug_id: 3, project_id: 1, title: 'Ignore this', status: 'not_a_bug', dev_hours: 5.0, qa_hours: 2.0, done_date: '2026-09-15' },
    ],
  },
  {
    project_id: 2,
    project_no: 'VM-PR001',
    project_name: 'HRMS Portal',
    project_type: 'product',
    category: 'crm',
    project_status: 'in_progress',
    start_date: '2026-07-15',
    deadline: '2026-11-06',
    project_manager_id: 10,
    project_manager_name: 'Krishna',
    client_name: 'Internal HR',
    members: [
      { employee_id: 103, name: 'Kabir Mehta' },
      { employee_id: 104, name: 'Meera Nair' },
    ],
    total_tasks_count: 36,
    completed_tasks_count: 22,
    progress_percentage: 61,
    estimated_hours: 1200,
    actual_hours: 1340,
    tasks: [
      { task_id: 4, title: 'Attendance logs', stage: 'completed', allocated_hours: 200, actual_hours: 248, assigned_employee_id: 103, assigned_employee_name: 'Kabir Mehta' },
      { task_id: 5, title: 'Payroll tax table', stage: 'completed', allocated_hours: 140, actual_hours: 132, assigned_employee_id: 104, assigned_employee_name: 'Meera Nair' },
    ],
    financials: { revenue: 1100000, approved_expenses: 840000 },
    bugs: [
      { bug_id: 4, project_id: 2, title: 'Biometric sync failure', status: 'done', dev_hours: 18.2, qa_hours: 9.0, done_date: '2026-08-14' },
      { bug_id: 5, project_id: 2, title: 'Leave balance overflow', status: 'done', dev_hours: 15.0, qa_hours: 7.5, done_date: '2026-07-12' },
    ],
  },
  {
    project_id: 3,
    project_no: 'VM-CL001',
    project_name: 'Acme CRM Suite',
    project_type: 'client',
    category: 'crm',
    project_status: 'delivered',
    start_date: '2026-06-01',
    deadline: '2026-12-05',
    project_manager_id: 20,
    project_manager_name: 'Sarah Connor',
    client_name: 'Acme Corp',
    members: [{ employee_id: 105, name: 'Rohan Desai' }],
    total_tasks_count: 10,
    completed_tasks_count: 10,
    progress_percentage: 100,
    estimated_hours: 800,
    actual_hours: 750,
    tasks: [],
    financials: { revenue: 950000, approved_expenses: 610000 },
    bugs: [],
  },
  {
    project_id: 4,
    project_no: 'VM-CL002',
    project_name: 'Cancelled Project Alpha',
    project_type: 'client',
    category: 'ecom_website',
    project_status: 'cancelled',
    start_date: '2026-09-01',
    deadline: '2026-11-30',
    project_manager_id: 20,
    project_manager_name: 'Sarah Connor',
    client_name: 'Alpha Ltd',
    members: [],
    total_tasks_count: 5,
    completed_tasks_count: 1,
    progress_percentage: 20,
    estimated_hours: 300,
    actual_hours: 100,
    tasks: [],
    financials: { revenue: 0, approved_expenses: 50000 },
    bugs: [],
  },
];

describe('Project Management Dashboard: US01 - US10 Acceptance Criteria', () => {
  describe('US01: Overall Dashboard Design and Functionality', () => {
    it('Defaults all global filters to All and empty search', () => {
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.project, 'All');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.category, 'All');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.status, 'All');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.projectType, 'All');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.projectManager, 'All');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.search, '');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.dateRange.startDate, '');
      assert.equal(INITIAL_PROJECT_DASHBOARD_FILTERS.dateRange.endDate, '');
    });

    it('Filters projects by Category with exact match', () => {
      const filtered = filterProjects(MOCK_PROJECTS, {
        ...INITIAL_PROJECT_DASHBOARD_FILTERS,
        category: 'crm',
      });
      assert.equal(filtered.length, 2);
      assert.ok(filtered.every((p) => p.category === 'crm'));
    });

    it('Filters projects by Project Manager', () => {
      const filtered = filterProjects(MOCK_PROJECTS, {
        ...INITIAL_PROJECT_DASHBOARD_FILTERS,
        projectManager: '10',
      });
      assert.equal(filtered.length, 2);
      assert.ok(filtered.every((p) => p.project_manager_id === 10));
    });

    it('Searches across Project No, Name, Manager, Category and Member names case-insensitively', () => {
      // Search by member name
      const byMember = filterProjects(MOCK_PROJECTS, {
        ...INITIAL_PROJECT_DASHBOARD_FILTERS,
        search: 'aarav',
      });
      assert.equal(byMember.length, 1);
      assert.equal(byMember[0].project_name, 'Retail ERP Rollout');

      // Search by project no
      const byNo = filterProjects(MOCK_PROJECTS, {
        ...INITIAL_PROJECT_DASHBOARD_FILTERS,
        search: 'vm-pr',
      });
      assert.equal(byNo.length, 1);
      assert.equal(byNo[0].project_name, 'HRMS Portal');
    });

    it('Formats dates as DD-MM-YYYY and amounts in ₹ Lakh', () => {
      assert.equal(formatDateDDMMYYYY('2026-10-28'), '28-10-2026');
      assert.equal(formatLakh(980000), '₹9.8L');
      assert.equal(formatLakh(1500000), '₹15.0L');
    });
  });

  describe('US02: Project Status Overview (Donut Chart)', () => {
    it('Counts projects across all 8 statuses and returns total count', () => {
      const result = computeProjectStatusOverview(MOCK_PROJECTS, 'All');
      assert.equal(result.total, 4);
      assert.equal(result.items.length, 8);

      const planning = result.items.find((i) => i.key === 'planning');
      assert.equal(planning?.count, 1);
      assert.equal(planning?.percentage, 25);

      const delivered = result.items.find((i) => i.key === 'delivered');
      assert.equal(delivered?.count, 1);
    });

    it('Displays only selected status when Status filter is active', () => {
      const result = computeProjectStatusOverview(MOCK_PROJECTS, 'planning');
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].key, 'planning');
    });
  });

  describe('US03: Project Progress by Project (Horizontal Progress Bar)', () => {
    it('Excludes cancelled projects unless cancelled status is selected', () => {
      const list = computeProjectProgress(MOCK_PROJECTS, 'All');
      assert.ok(!list.some((p) => p.projectName === 'Cancelled Project Alpha'));

      const cancelledOnly = computeProjectProgress(MOCK_PROJECTS, 'cancelled');
      assert.equal(cancelledOnly.length, 1);
      assert.equal(cancelledOnly[0].projectName, 'Cancelled Project Alpha');
    });

    it('Calculates progress percentage excluding cancelled tasks', () => {
      const list = computeProjectProgress(MOCK_PROJECTS, 'All');
      const erp = list.find((p) => p.projectName === 'Retail ERP Rollout');
      assert.ok(erp);
      // Retail ERP tasks: 1 completed, 1 in_progress, 1 cancelled. Non-cancelled tasks = 2. Completed = 1.
      // Progress = (1 / 2) * 100 = 50%
      assert.equal(erp.progressPercentage, 50);
    });

    it('Sorts projects with lowest progress first', () => {
      const list = computeProjectProgress(MOCK_PROJECTS, 'All');
      assert.ok(list[0].progressPercentage <= list[list.length - 1].progressPercentage);
    });
  });

  describe('US04: Projects by Category (Vertical Bar Chart)', () => {
    it('Aggregates project counts for all 8 categories and sorts descending', () => {
      const categories = computeProjectsByCategory(MOCK_PROJECTS);
      assert.equal(categories.length, 8);
      // Top category should be crm with count 2
      assert.equal(categories[0].key, 'crm');
      assert.equal(categories[0].count, 2);
      assert.equal(categories[0].percentage, 50);
    });
  });

  describe('US05: Upcoming Project Deadlines (Timeline Chart)', () => {
    it('Excludes delivered and cancelled projects from deadlines', () => {
      const deadlines = computeUpcomingDeadlines(MOCK_PROJECTS, 180);
      assert.ok(!deadlines.some((d) => d.status === 'delivered'));
      assert.ok(!deadlines.some((d) => d.status === 'cancelled'));
    });

    it('Identifies overdue projects and sorts earliest deadline first', () => {
      const deadlines = computeUpcomingDeadlines(MOCK_PROJECTS, 180);
      assert.ok(deadlines.length > 0);
      assert.ok(deadlines[0].daysRemaining <= deadlines[deadlines.length - 1].daysRemaining);
    });
  });

  describe('US06: Estimated vs Actual Work Hours by Project (Clustered Column Chart)', () => {
    it('Compares estimated and actual hours and calculates variance', () => {
      const comparisons = computeEstimatedVsActualHours(MOCK_PROJECTS);
      const erp = comparisons.find((c) => c.projectName === 'Retail ERP Rollout');
      assert.ok(erp);
      assert.equal(erp.estimatedHours, 1500);
      assert.equal(erp.actualHours, 1810);
      assert.equal(erp.varianceHours, 310);
      assert.equal(erp.isOverEstimate, true);
      assert.equal(erp.actualColor, '#ef4444'); // Red because actual > estimated
    });

    it('Marks actual hours as green when within estimate', () => {
      const comparisons = computeEstimatedVsActualHours(MOCK_PROJECTS);
      const acme = comparisons.find((c) => c.projectName === 'Acme CRM Suite');
      assert.ok(acme);
      assert.equal(acme.isOverEstimate, false);
      assert.equal(acme.actualColor, '#22c55e'); // Green
    });
  });

  describe('US07: Person-wise Work Hours (Dumbbell Chart)', () => {
    it('Calculates employee estimated vs actual hours on selected project', () => {
      const persons = computePersonWiseWorkHours(MOCK_PROJECTS, '1');
      assert.equal(persons.length, 2);
      const aarav = persons.find((p) => p.employeeName === 'Aarav Shah');
      assert.ok(aarav);
      assert.equal(aarav.estimatedHours, 185);
      assert.equal(aarav.actualHours, 210);
      assert.equal(aarav.diffLabel, '+25 h');
      assert.equal(aarav.isOverEstimate, true);
    });

    it('Aggregates across all projects when All is selected', () => {
      const allPersons = computePersonWiseWorkHours(MOCK_PROJECTS, 'All');
      assert.ok(allPersons.length >= 4);
    });
  });

  describe('US08: Bug Resolution Time: Development vs QA (Line Chart)', () => {
    it('Includes only Done bugs and excludes Not a Bug', () => {
      const monthly = computeBugResolutionTime(MOCK_PROJECTS, 6);
      assert.equal(monthly.length, 6);
      const sept = monthly.find((m) => m.monthKey === '2026-09');
      assert.ok(sept);
      // In Sept 2026, 1 Done bug (POS sync latency: dev 14.2, qa 7.1). The 'not_a_bug' record is excluded!
      assert.equal(sept.completedBugsCount, 1);
      assert.equal(sept.avgDevHours, 14.2);
      assert.equal(sept.avgQaHours, 7.1);
    });
  });

  describe('US09: Actual Expenses by Project (Lollipop Chart)', () => {
    it('Sums approved expenses and calculates share of total', () => {
      const result = computeActualExpenses(MOCK_PROJECTS);
      assert.ok(result.totalExpense > 0);
      assert.equal(result.items[0].projectName, 'Retail ERP Rollout'); // Highest expense 9.8L
      assert.equal(result.items[0].expenseInLakh, '₹9.8L');
    });
  });

  describe('US10: Project Profitability (Diverging Bar Chart)', () => {
    it('Calculates Profit = Revenue - Expenses and identifies profit vs loss', () => {
      const list = computeProjectProfitability(MOCK_PROJECTS);
      // Projects with revenue: Retail ERP (rev 9L, exp 9.8L => loss -0.8L), HRMS (rev 11L, exp 8.4L => profit +2.6L), Acme (rev 9.5L, exp 6.1L => profit +3.4L)
      assert.equal(list.length, 3);

      const acme = list.find((p) => p.projectName === 'Acme CRM Suite');
      assert.ok(acme);
      assert.equal(acme.profitOrLoss, 340000);
      assert.equal(acme.isProfit, true);
      assert.equal(acme.profitOrLossLakh, '+₹3.4L');

      const erp = list.find((p) => p.projectName === 'Retail ERP Rollout');
      assert.ok(erp);
      assert.equal(erp.profitOrLoss, -80000);
      assert.equal(erp.isProfit, false);
      assert.equal(erp.profitOrLossLakh, '-₹0.8L');
    });

    it('Sorts projects from highest profit to highest loss', () => {
      const list = computeProjectProfitability(MOCK_PROJECTS);
      assert.ok(list[0].profitOrLoss >= list[list.length - 1].profitOrLoss);
    });
  });
});
