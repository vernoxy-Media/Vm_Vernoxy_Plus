import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  BadgeCheck,
  CalendarClock,
  CircleDot,
  Layers,
  PauseCircle,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarX,
  ClipboardCheck,
  FolderKanban,
  Gauge,
  Handshake,
  Inbox,
  ListChecks,
  PhoneCall,
  Receipt,
  ShieldAlert,
  Target,
  UserPlus,
  Users,
  Wallet,
  TrendingUp,
  Hourglass,
} from 'lucide-react';
import type {
  AdminSection,
  AssignedComplaintsSection,
  ExpenseApprovalsSection,
  ManagedProjectsSection,
  SalesSection,
} from '../types';
import {
  BarChartList,
  ChartCard,
  Donut,
  MonthlyColumns,
  leadStageData,
  priorityData,
  projectProgressData,
  projectStatusData,
  recruitmentStageData,
  taskStageData,
} from './charts';
import {
  DataTable,
  EmptyLine,
  kpiGrid,
  KpiLink,
  Panel,
  Pill,
  ProgressBar,
  PROJECT_STATUS_LABEL,
  SectionHeading,
  TASK_STAGE_LABEL,
  fmtDate,
  fmtDay,
  fmtMoney,
  fmtTime,
  priorityTone,
  stageTone,
  titleCase,
} from './dashboard-ui';

const SectionTitle = SectionHeading;

const STAT_TILE_TONE = {
  blue: 'border-blue-100 bg-blue-50/70 text-blue-700',
  rose: 'border-rose-100 bg-rose-50/70 text-rose-700',
  emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50/80 text-amber-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

/** A small figure inside a card: tinted tile, large number, clear label. */
export const StatTile: React.FC<{ label: string; value: React.ReactNode; tone: keyof typeof STAT_TILE_TONE }> = ({ label, value, tone }) => (
  <div className={`min-w-0 rounded-xl border px-3 py-3 text-center ${STAT_TILE_TONE[tone]}`}>
    <p className="truncate text-2xl font-black leading-none tabular-nums">{value}</p>
    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
  </div>
);

const TWO_COL ='grid grid-cols-1 gap-4 lg:grid-cols-2';
const THREE_COL = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------------------
// 01. System Admin Dashboard
// ---------------------------------------------------------------------------

export const AdminOverview: React.FC<{ admin: AdminSection }> = ({ admin: a }) => {
  const payrollLabel = a.payroll ? `${MONTHS[a.payroll.payroll_month - 1]} ${a.payroll.payroll_year}` : 'Not started';
  return (
    <div className="space-y-5">
      <section aria-label="Organisation KPIs" className="space-y-3">
        <SectionTitle title="KPI Cards" hint="All modules · Admin access" />
        <div className={kpiGrid(9)}>
          <KpiLink to="/admin/employees" label="Total Employees" value={a.employees.total} icon={Users} tone="blue"
            hint={`${a.employees.active} active · ${a.employees.inactive} inactive · ${a.employees.onboarding} onboarding`} />
          <KpiLink to="/admin/recruitment" label="Recruitment Pipeline" value={a.recruitment.open} icon={UserPlus} tone="purple"
            hint={`${a.recruitment.total} candidates in total`} />
          <KpiLink to="/projects" label="Total Projects" value={a.projects.total} icon={FolderKanban} tone="blue"
            hint={`${a.projects.in_progress} in progress · ${a.projects.delivered} delivered · ${a.projects.on_hold} on hold`} />
          <KpiLink to="/admin/tasks" label="Task Overview" value={a.tasks.total} icon={ListChecks} tone="emerald"
            hint={`${a.tasks.overdue} overdue · ${a.tasks.due_today} due today`} />
          <KpiLink to="/sales/leads" label="Sales Overview" value={a.sales.open_leads} icon={Target} tone="amber"
            hint={`${a.sales.companies} companies · ${a.sales.leads} leads`} />
          <KpiLink to="/leave?tab=requests" label="Pending Leave Requests" value={a.leave.pending} icon={CalendarCheck} tone="amber"
            hint={`${a.leave.cancellation_requests} cancellation requests`} />
          <KpiLink to="/admin/payroll" label="Payroll Run Status" value={a.payroll ? titleCase(a.payroll.status) : '—'} icon={Wallet} tone="slate"
            hint={a.payroll ? `${payrollLabel} · ${a.payroll.total_employees} included · ${a.payroll.processed} processed · ${a.payroll.warnings} warnings` : payrollLabel} />
          <KpiLink to="/expense?tab=claims" label="Pending Expense Claims" value={a.expenses.pending_review} icon={Receipt} tone="rose"
            hint={`${a.expenses.approved_unpaid} approved, unpaid · ${a.expenses.reimbursed} reimbursed`} />
          <KpiLink to="/admin/complaints" label="Active Complaints" value={a.complaints.new + a.complaints.in_progress} icon={ShieldAlert} tone="rose"
            hint={`${a.complaints.new} new · ${a.complaints.overdue} overdue · ${a.complaints.awaiting_confirmation} resolved`} />
        </div>
      </section>

      <section aria-label="Organisation Overview" className="space-y-3">
        <SectionTitle title="Organisation Overview" hint="Employees and recruitment" />
        <div className={THREE_COL}>
          <ChartCard
            title="Department-wise Employees"
            subtitle="Active employees by department"
            icon={Building2}
            tone="indigo"
            info="Active employees in each department, largest first. Click a bar to open the Employees list for that department."
            footer={<>Active employees: <strong className="text-slate-700">{a.employees.active}</strong></>}
            to="/admin/employees?status=Active"
          >
            <BarChartList
              unit="active"
              max={10}
              data={a.department_distribution.map((d) => ({
                key: d.key,
                label: d.key,
                value: d.count,
                to: d.id ? `/admin/employees?dep_id=${d.id}&status=Active` : '/admin/employees?status=Active',
              }))}
            />
          </ChartCard>
          <ChartCard
            title="Employee Status"
            subtitle="All employee records"
            icon={Users}
            info="Employees by status: Active, Inactive and Onboarding (not yet activated). Click a segment to open the Employees list for that status."
            footer={<>Total employees: <strong className="text-slate-700">{a.employees.total}</strong></>}
            to="/admin/employees"
          >
            <Donut
              centerLabel="Employees"
              unit="employees"
              data={[
                { key: 'Active', label: 'Active', value: a.employees.active, color: '#22c55e', to: '/admin/employees?status=Active' },
                { key: 'Onboarding', label: 'Onboarding', value: a.employees.onboarding, color: '#f59e0b', to: '/admin/employees?status=Onboarding' },
                { key: 'Inactive', label: 'Inactive', value: a.employees.inactive, color: '#64748b', to: '/admin/employees?status=Inactive' },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="Recruitment Pipeline"
            subtitle="Candidates by stage"
            icon={UserPlus}
            tone="purple"
            info="Candidates in each recruitment stage, with the colours used on the Recruitment dashboard. Open stages are New to Onboarding."
            footer={<><strong className="text-slate-700">{a.recruitment.open}</strong> open of {a.recruitment.total} candidates</>}
            to="/admin/recruitment"
          >
            <BarChartList unit="candidates" data={recruitmentStageData(a.recruitment.stages, '/admin/recruitment')} />
          </ChartCard>
          <ChartCard
            title="Monthly Candidate Movement"
            subtitle="Last six months"
            icon={UserPlus}
            tone="purple"
            info="Candidates added to Recruitment each month, next to the candidates who joined that month (counted by the joining date of the employee they became)."
            footer={<><strong className="text-slate-700">{a.recruitment.open}</strong> candidates in open stages</>}
            to="/admin/recruitment"
          >
            <MonthlyColumns data={a.recruitment.monthly.map((m) => ({ month: m.month, a: m.added, b: m.joined }))} aLabel="Added" bLabel="Joined" />
          </ChartCard>
        </div>
      </section>

      <section aria-label="Project & Task Overview" className="space-y-3">
        <SectionTitle title="Project & Task Overview" hint="Portfolio and work in flight" />
        <div className={THREE_COL}>
          <ChartCard
            title="Project Status Overview"
            subtitle="Portfolio distribution by status"
            icon={FolderKanban}
            info="Number of projects in each of the eight statuses. The centre shows the total project count."
            footer={<>Showing 8 statuses</>}
            to="/projects"
          >
            <Donut centerLabel="Total Projects" unit="projects" data={projectStatusData(a.projects.statuses)} />
          </ChartCard>
          <ChartCard
            title="Project Progress"
            subtitle="Open projects, furthest behind first"
            icon={Gauge}
            tone="blue"
            info="Share of top-level tasks that are done, the same calculation as the Projects page. Red is under 40%, amber 40 to 69%, green 70% and over."
            footer={<>Showing {a.project_progress.length} open projects</>}
            to="/projects"
          >
            <BarChartList unit="done" suffix="%" scaleMax={100} showShare={false} max={8} data={projectProgressData(a.project_progress)} />
          </ChartCard>
          <ChartCard
            title="Task Stages"
            subtitle="Top-level tasks by stage"
            icon={ListChecks}
            tone="emerald"
            info="All top-level tasks by stage, the same set as the Admin task board. Sub tasks are counted under their parent."
            footer={<><strong className="text-slate-700">{a.tasks.overdue}</strong> overdue · <strong className="text-slate-700">{a.tasks.awaiting_review}</strong> awaiting review</>}
            to="/admin/tasks"
          >
            <Donut centerLabel="Total Tasks" unit="tasks" data={taskStageData(a.tasks.stages, '/admin/tasks')} />
          </ChartCard>
          <ChartCard
            title="Open Tasks by Priority"
            subtitle="Tasks not yet done"
            icon={AlertOctagon}
            tone="rose"
            info="Open top-level tasks by priority, critical first."
            footer={<><strong className="text-slate-700">{a.tasks.due_today}</strong> due today · <strong className="text-rose-600">{a.tasks.overdue}</strong> overdue</>}
            to="/admin/tasks"
          >
            <BarChartList unit="tasks" data={priorityData(a.tasks.priorities, '/admin/tasks')} />
          </ChartCard>
        </div>
      </section>

      <section aria-label="Sales Overview" className="space-y-3">
        <SectionTitle title="Sales Overview" hint="Pipeline and conversion" />
        <div className={THREE_COL}>
          <ChartCard
            title="Sales Pipeline"
            subtitle="Leads by stage"
            icon={Target}
            tone="amber"
            info="All leads by stage, using the lead-stage colours of the Sales dashboard."
            footer={<><strong className="text-slate-700">{a.sales.follow_ups_today}</strong> follow-ups today · <strong className="text-rose-600">{a.sales.follow_ups_overdue}</strong> overdue</>}
            to="/sales/leads"
          >
            <Donut centerLabel="Total Leads" unit="leads" data={leadStageData(a.sales.stages, '/sales/leads')} />
          </ChartCard>
          <ChartCard
            title="Lead Source"
            subtitle="Where leads come from"
            icon={Target}
            tone="amber"
            info="All leads grouped by their lead source, most common first."
            footer={<>Total leads: <strong className="text-slate-700">{a.sales.leads}</strong></>}
            to="/sales/leads"
          >
            <BarChartList unit="leads" data={a.sales.lead_sources.map((x) => ({ key: x.key, label: x.key, value: x.count, to: '/sales/leads' }))} />
          </ChartCard>
          <ChartCard
            title="Client Conversion"
            subtitle="Leads turned into clients"
            icon={Handshake}
            tone="emerald"
            info="Clients won, with the companies converted to clients and the clients won this month and this year."
            footer={<>{a.sales.leads} leads · {a.sales.open_leads} still open</>}
            to="/sales/clients"
          >
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile label="Clients" value={a.sales.clients} tone="emerald" />
              <StatTile label="Companies converted" value={a.sales.companies_converted} tone="blue" />
              <StatTile label="Won this month" value={a.sales.won_this_month} tone="amber" />
              <StatTile label="Won this year" value={a.sales.won_this_year} tone="slate" />
            </div>
          </ChartCard>
        </div>
      </section>

      <section aria-label="People Operations" className="space-y-3">
        <SectionTitle title="People Operations" hint="Today and the weeks ahead" />
        <div className={THREE_COL}>
          <ChartCard
            title="Attendance Today"
            subtitle="All active employees"
            icon={CalendarCheck}
            tone="emerald"
            info="Today in India time: employees who have checked in, employees on approved leave, and those who have not checked in yet."
            footer={<><strong className="text-slate-700">{a.attendance_today.still_working}</strong> still working</>}
            to="/attendance"
          >
            <Donut
              centerLabel="Active staff"
              unit="employees"
              data={[
                { key: 'in', label: 'Checked in', value: a.attendance_today.checked_in, color: '#22c55e', to: '/attendance' },
                { key: 'leave', label: 'On leave', value: a.attendance_today.on_leave, color: '#f59e0b', to: '/leave?tab=calendar' },
                { key: 'not', label: 'Not checked in', value: a.attendance_today.not_yet_in, color: '#94a3b8', to: '/attendance' },
              ]}
            />
          </ChartCard>
          <Panel title="Upcoming Leave" icon={CalendarCheck} subtitle="Approved leave from today, earliest first" to="/leave?tab=calendar" linkLabel="Leave calendar">
            <DataTable
              rows={a.upcoming_leave}
              rowKey={(r) => r.request_id}
              rowTo={() => '/leave?tab=calendar'}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name}</span> },
                { header: 'Department', render: (r) => r.department_name ?? '—' },
                { header: 'Leave type', render: (r) => r.leave_type_name ?? '—' },
                { header: 'From', render: (r) => fmtDate(r.from_date) },
                { header: 'To', render: (r) => fmtDate(r.to_date) },
                { header: 'Days', render: (r) => r.days },
              ]}
            />
          </Panel>
          <Panel title="Onboarding Activity" icon={UserPlus} subtitle="Employees not activated yet" to="/admin/employees?status=Onboarding">
            <DataTable
              rows={a.onboarding}
              rowKey={(r) => r.emp_id}
              rowTo={(r) => `/admin/employees/${r.emp_id}`}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
                { header: 'Designation', render: (r) => r.role_name ?? '—' },
                { header: 'Department', render: (r) => r.department_name ?? '—' },
                { header: 'Joining date', render: (r) => fmtDate(r.joining_date) },
                { header: 'Status', render: () => <Pill tone="amber">Onboarding</Pill> },
              ]}
            />
          </Panel>
        </div>
      </section>

      <section aria-label="Tables, Queues and Lists" className="space-y-3">
        <SectionTitle title="Tables, Queues and Lists" hint="Items that need attention" />
        <div className={TWO_COL}>
          <Panel title="Pending Reviews & Approvals" icon={ClipboardCheck} subtitle="Oldest first">
            <DataTable
              rows={a.pending_approvals}
              rowKey={(r) => `${r.module}-${r.record_id}`}
              rowTo={(r) => (r.module === 'Leave' ? '/leave?tab=requests' : r.module === 'Expense' ? '/expense?tab=claims' : '/admin/tasks')}
              columns={[
                { header: 'Module', render: (r) => <Pill tone="indigo">{r.module}</Pill> },
                { header: 'Request', render: (r) => <span className="font-semibold text-slate-800">{r.reference}</span> },
                { header: 'Owner', render: (r) => r.owner },
                { header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
                { header: 'Due', render: (r) => fmtDate(r.due_date) },
                { header: 'Status', render: (r) => titleCase(r.status) },
              ]}
            />
          </Panel>
          <Panel title="Projects Requiring Attention" icon={FolderKanban} subtitle="Past deadline, pending or on hold" to="/projects">
            <DataTable
              rows={a.projects_attention}
              rowKey={(r) => r.project_id}
              rowTo={(r) => `/projects/${r.project_id}`}
              columns={[
                { header: 'Project', render: (r) => <span className="font-semibold text-slate-800">{r.project_name}</span> },
                { header: 'Manager', render: (r) => r.manager_name ?? '—' },
                { header: 'Status', render: (r) => PROJECT_STATUS_LABEL[r.project_status] ?? titleCase(r.project_status) },
                { header: 'Progress', className: 'w-32', render: (r) => <ProgressBar value={r.progress} /> },
                { header: 'Deadline', render: (r) => fmtDate(r.deadline) },
                { header: 'Last updated', render: (r) => fmtDate(r.updated_at) },
              ]}
            />
          </Panel>
          <Panel title="Overdue Tasks" icon={AlertOctagon} to="/admin/tasks">
            <DataTable
              rows={a.overdue_tasks}
              rowKey={(r) => r.task_id}
              rowTo={(r) => (r.project_id ? `/projects/${r.project_id}` : '/admin/tasks')}
              columns={[
                { header: 'Task', render: (r) => <span className="font-semibold text-slate-800">{r.title}</span> },
                { header: 'Project', render: (r) => r.project_name ?? '—' },
                { header: 'Assignee', render: (r) => r.assignees ?? '—' },
                { header: 'Priority', render: (r) => <Pill tone={priorityTone(r.priority)}>{titleCase(r.priority)}</Pill> },
                { header: 'Due', render: (r) => <span className="text-rose-600">{fmtDate(r.due_date)}</span> },
                { header: 'Stage', render: (r) => <Pill tone={stageTone(r.stage)}>{TASK_STAGE_LABEL[r.stage] ?? r.stage}</Pill> },
              ]}
            />
          </Panel>
          <Panel title="Recent Leads & Follow-ups" icon={Target} to="/sales/leads">
            <DataTable
              rows={a.recent_leads}
              rowKey={(r) => r.lead_id}
              rowTo={(r) => `/sales/leads/${r.lead_id}`}
              columns={[
                { header: 'Company', render: (r) => <span className="font-semibold text-slate-800">{r.company ?? '—'}</span> },
                { header: 'Lead owner', render: (r) => r.owner_name ?? '—' },
                { header: 'Stage', render: (r) => r.lead_stage ?? '—' },
                { header: 'Next follow-up', render: (r) => (r.next_follow_up_at ? fmtDate(r.next_follow_up_at) : '—') },
                { header: 'Last conversation', render: (r) => (r.last_conversation_at ? fmtDate(r.last_conversation_at) : '—') },
              ]}
            />
          </Panel>
          <Panel title="Payroll Warnings" icon={Wallet} subtitle="Checks on the current payroll run" to="/admin/payroll" className="lg:col-span-2">
            <DataTable
              rows={a.payroll_warnings}
              rowKey={(r) => `${r.employee_code}-${r.warning_type}`}
              rowTo={() => '/admin/payroll'}
              columns={[
                { header: 'Payroll run', render: (r) => `${MONTHS[r.payroll_month - 1]} ${r.payroll_year}` },
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name} <span className="font-normal text-slate-400">({r.employee_code})</span></span> },
                { header: 'Warning', render: (r) => <span className="block max-w-[420px] truncate" title={r.warning_type}>{r.warning_type}</span> },
                { header: 'Status', render: (r) => titleCase(r.run_status) },
              ]}
            />
          </Panel>
          <Panel title="Complaint Queue" icon={ShieldAlert} subtitle="Open complaints, nearest target date first" to="/admin/complaints" className="lg:col-span-2">
            <DataTable
              rows={a.complaint_queue}
              rowKey={(r) => r.complaint_id}
              rowTo={() => '/admin/complaints'}
              columns={[
                { header: 'Number', render: (r) => <span className="font-semibold text-slate-800">{r.complaint_no}</span> },
                { header: 'Subject', render: (r) => <span className="block max-w-[260px] truncate" title={r.subject}>{r.subject}</span> },
                { header: 'Department', render: (r) => r.department_name ?? '—' },
                { header: 'Handler', render: (r) => r.handler_name ?? 'Unassigned' },
                { header: 'Priority', render: (r) => (r.priority ? <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill> : '—') },
                { header: 'Target', render: (r) => fmtDate(r.target_date) },
                { header: 'Status', render: (r) => r.status },
              ]}
            />
          </Panel>
        </div>
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 09. Sales Dashboard
// ---------------------------------------------------------------------------

export const SalesOverview: React.FC<{ sales: SalesSection }> = ({ sales: s }) => {
  const stage = (k: string) => s.stages.find((x) => x.key === k)?.count ?? 0;
  return (
    <div className="space-y-5">
      <section aria-label="Sales KPIs" className="space-y-3">
        <SectionTitle title="Sales Overview" hint="Company Database counters · your own leads, follow-ups and clients" />
        <div className={kpiGrid(8)}>
          <KpiLink to="/sales/companies" label="Total Companies" value={s.companies} icon={Building2} tone="blue" />
          <KpiLink to="/sales/companies" label="Not Yet a Lead" value={s.not_yet_lead} icon={Inbox} tone="slate" />
          <KpiLink to="/sales/leads" label="Open Leads" value={s.open_leads} icon={Target} tone="amber"
            hint={`${stage('New')} new · ${stage('Contacted')} contacted · ${stage('Qualified')} qualified`} />
          <KpiLink to="/sales/leads" label="Total Leads" value={s.my_leads} icon={Briefcase} tone="purple"
            hint={`${stage('On Hold')} on hold · ${stage('Converted')} won · ${stage('Lost')} lost`} />
          <KpiLink to="/sales/follow-ups?tab=today" label="Follow-ups Due Today" value={s.follow_ups_today} icon={PhoneCall} tone="emerald" />
          <KpiLink to="/sales/follow-ups?tab=overdue" label="Overdue Follow-ups" value={s.follow_ups_overdue} icon={CalendarX} tone="rose" />
          <KpiLink to="/sales/clients" label="My Clients" value={s.my_clients} icon={Handshake} tone="emerald"
            hint={`${s.won_this_month} won this month · ${s.won_this_year} this year`} />
          <KpiLink to="/sales/companies" label="Converted to Client" value={s.companies_converted} icon={BadgeCheck} tone="blue" hint={`Companies that became clients · ${s.converted} of your leads won`} />
        </div>
      </section>
      <div className={THREE_COL}>
        <ChartCard
          title="Sales Pipeline"
          subtitle="Your leads by stage"
          icon={TrendingUp}
          tone="amber"
          info="Your own leads by stage, using the lead-stage colours of the Sales dashboard."
          footer={<><strong className="text-slate-700">{s.open_leads}</strong> open of {s.my_leads} leads</>}
          to="/sales/leads"
        >
          <Donut centerLabel="My Leads" unit="leads" data={leadStageData(s.stages, '/sales/leads')} />
        </ChartCard>
        <Panel title="My Leads" icon={Target} subtitle="Open leads, next follow-up first" to="/sales/leads">
          {s.leads.length === 0 ? (
            <EmptyLine />
          ) : (
            <ul className="divide-y divide-slate-100">
              {s.leads.map((l) => (
                <li key={l.lead_id}>
                  <Link to={`/sales/leads/${l.lead_id}`} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{l.company ?? 'Lead'}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {[l.contact, l.lead_source, l.service_fit].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {l.last_conversation_at ? `Last conversation ${fmtDate(l.last_conversation_at)}` : 'No conversation yet'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone="indigo">{l.lead_stage ?? '—'}</Pill>
                      <span className="text-[10px] text-slate-400">{l.next_follow_up_at ? `Next ${fmtDate(l.next_follow_up_at)}` : 'No follow-up'}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Follow-ups" icon={PhoneCall} subtitle="Open follow-ups, earliest first" to="/sales/follow-ups">
          <div className="mb-3 grid grid-cols-5 gap-1.5">
            {([
              ['today', 'Today', s.follow_up_counts.today, 'text-emerald-700 bg-emerald-50 border-emerald-100'],
              ['overdue', 'Overdue', s.follow_up_counts.overdue, 'text-rose-700 bg-rose-50 border-rose-100'],
              ['upcoming', 'Upcoming', s.follow_up_counts.upcoming, 'text-blue-700 bg-blue-50 border-blue-100'],
              ['completed', 'Done', s.follow_up_counts.completed, 'text-slate-700 bg-slate-50 border-slate-200'],
              ['cancelled', 'Cancelled', s.follow_up_counts.cancelled, 'text-slate-500 bg-slate-50 border-slate-200'],
            ] as const).map(([tab, label, n, cls]) => (
              <Link key={tab} to={`/sales/follow-ups?tab=${tab}`} className={`rounded-lg border px-1 py-1.5 text-center transition hover:shadow-xs ${cls}`}>
                <p className="text-base font-black leading-none tabular-nums">{n}</p>
                <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
              </Link>
            ))}
          </div>
          {s.follow_ups.length === 0 ? (
            <EmptyLine text="No open follow-ups." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {s.follow_ups.map((f) => (
                <li key={f.follow_up_id}>
                  <Link
                    to={f.lead_id ? `/sales/leads/${f.lead_id}` : '/sales/follow-ups'}
                    className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{f.company ?? f.contact ?? 'Follow-up'}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {f.type}
                        {f.purpose ? ` · ${f.purpose}` : ''}
                        {f.assigned_to_name ? ` · ${f.assigned_to_name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone={f.status === 'Overdue' ? 'rose' : 'blue'}>{f.status}</Pill>
                      <span className="text-[10px] text-slate-400">
                        {fmtDay(f.follow_up_on)} {fmtTime(f.follow_up_on)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Company Database" icon={Building2} subtitle="Most recent company records" to="/sales/companies">
          <DataTable
            rows={s.recent_companies}
            rowKey={(r) => r.company_id}
            rowTo={(r) => `/sales/companies/${r.company_id}`}
            columns={[
              { header: 'Company', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
              { header: 'ID', render: (r) => r.company_code ?? '—' },
              { header: 'Location', render: (r) => r.city ?? '—' },
              { header: 'Industry', render: (r) => r.industry ?? '—' },
              { header: 'Contact', render: (r) => r.contact ?? '—' },
              { header: 'Status', render: (r) => <Pill tone={r.status === 'Client' ? 'emerald' : r.status === 'Open lead' ? 'amber' : 'slate'}>{r.status}</Pill> },
            ]}
          />
        </Panel>
        <Panel title="My Clients" icon={Handshake} subtitle="Recently won, your own clients" to="/sales/clients">
          <div className="mb-3 grid grid-cols-3 gap-2.5">
            <StatTile label="Clients" value={s.my_clients} tone="emerald" />
            <StatTile label="Won this month" value={s.won_this_month} tone="amber" />
            <StatTile label="Won this year" value={s.won_this_year} tone="blue" />
          </div>
          <DataTable
            rows={s.recent_clients}
            rowKey={(r) => r.client_id}
            minWidth={320}
            rowTo={(r) => `/sales/clients/${r.client_id}`}
            columns={[
              { header: 'Client', render: (r) => <span className="font-semibold text-slate-800">{r.company_name}</span> },
              { header: 'Code', render: (r) => r.client_code ?? '—' },
              { header: 'Won on', render: (r) => fmtDate(r.won_on) },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Assignment-based sections (added only when the assignment exists)
// ---------------------------------------------------------------------------

export const ManagedProjectsOverview: React.FC<{ pm: ManagedProjectsSection }> = ({ pm }) => (
  <div className="space-y-5">
    <section aria-label="Managed Projects KPIs" className="space-y-3">
      <SectionTitle title="Managed Projects & Delivery" hint="Projects where you are the Project Manager" />
      <div className={kpiGrid(8)}>
        <KpiLink to="/projects" label="Managed Projects" value={pm.counts.managed} icon={FolderKanban} tone="blue" hint="Projects you manage" />
        <KpiLink to="/projects" label="In Progress" value={pm.counts.in_progress} icon={CircleDot} tone="blue" hint="Managed projects" />
        <KpiLink to="/projects" label="Delivered" value={pm.counts.delivered} icon={BadgeCheck} tone="emerald" hint="Managed projects" />
        <KpiLink to="/projects" label="On Hold" value={pm.counts.on_hold} icon={PauseCircle} tone="amber" hint="Managed projects" />
        <KpiLink to="/projects" label="Project Tasks" value={pm.project_tasks} icon={ListChecks} tone="emerald" />
        <KpiLink to="/projects" label="Overdue Tasks" value={pm.overdue_tasks} icon={AlertOctagon} tone="rose" />
        <KpiLink to="/projects" label="Tasks Awaiting Approval" value={pm.awaiting_approval} icon={Hourglass} tone="purple" />
        <KpiLink to="/projects" label="Average Project Progress" value={pm.average_progress === null ? '—' : `${pm.average_progress}%`} icon={Gauge} tone="slate"
          hint="Done / all top-level tasks" />
      </div>
    </section>
    <div className={THREE_COL}>
      <ChartCard
        title="Task Stage Summary"
        subtitle="Tasks in your managed projects"
        icon={ListChecks}
        tone="emerald"
        info="Top-level tasks of the projects you manage, by stage."
        footer={<><strong className="text-slate-700">{pm.awaiting_approval}</strong> awaiting approval · <strong className="text-rose-600">{pm.overdue_tasks}</strong> overdue</>}
        to="/projects"
      >
        <Donut centerLabel="Total Tasks" unit="tasks" data={taskStageData(pm.task_stages, '/projects')} />
      </ChartCard>
      <Panel title="Managed Project Listing" icon={FolderKanban} subtitle="Recently updated" to="/projects">
        {pm.projects.length === 0 ? (
          <EmptyLine />
        ) : (
          <ul className="space-y-3">
            {pm.projects.map((p) => (
              <li key={p.project_id}>
                <Link to={`/projects/${p.project_id}`} className="-mx-2 block rounded-lg px-2 py-1 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-slate-800">{p.project_name}</p>
                    <span className="shrink-0 text-[10px] text-slate-400">{fmtDate(p.deadline)}</span>
                  </div>
                  <p className="mb-1 text-[11px] text-slate-500">
                    {PROJECT_STATUS_LABEL[p.project_status] ?? titleCase(p.project_status)} · {p.task_count} tasks
                  </p>
                  <ProgressBar value={p.progress} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Team Workload" icon={Users} subtitle="Open tasks per team member">
        {pm.workload.length === 0 ? (
          <EmptyLine />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pm.workload.map((w) => (
              <li key={w.emp_id} className="flex items-center gap-2 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{w.name}</span>
                <span className="tabular-nums text-slate-600" title="Open / assigned">{w.pending}/{w.assigned}</span>
                {w.overdue > 0 && <Pill tone="rose">{w.overdue} overdue</Pill>}
                <span className="w-14 text-right tabular-nums text-[11px] text-slate-400">{Math.round(w.allocated_minutes / 60)} h</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
    <div className={THREE_COL}>
      <ChartCard
        title="Task Priority"
        subtitle="Open tasks in your projects"
        icon={AlertOctagon}
        tone="rose"
        info="Open top-level tasks of the projects you manage, by priority, critical first."
        footer={<><strong className="text-slate-700">{pm.project_tasks}</strong> tasks in total</>}
        to="/projects"
      >
        <BarChartList unit="tasks" data={priorityData(pm.priorities, '/projects')} />
      </ChartCard>
      <Panel title="Tasks Awaiting Approval" icon={Hourglass} subtitle="Submitted, oldest first" to="/projects">
        {pm.awaiting_list.length === 0 ? (
          <EmptyLine text="Nothing is waiting for your approval." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pm.awaiting_list.map((t) => (
              <li key={t.task_id}>
                <Link to={`/projects/${t.project_id}`} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{t.title}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {t.assignees ?? 'Unassigned'} · {t.project_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={stageTone(t.stage)}>{TASK_STAGE_LABEL[t.stage] ?? t.stage}</Pill>
                    <span className="text-[10px] text-slate-400">
                      {t.submitted_at ? `Submitted ${fmtDate(t.submitted_at)}` : 'Submitted'}
                      {t.due_date ? ` · Due ${fmtDate(t.due_date)}` : ''}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Upcoming Deadlines" icon={CalendarClock} subtitle="Tasks and projects, soonest first" to="/projects">
        {pm.upcoming.length === 0 ? (
          <EmptyLine text="No upcoming deadlines." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pm.upcoming.map((u) => (
              <li key={`${u.kind}-${u.id}`}>
                <Link to={`/projects/${u.project_id}`} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{u.title}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {u.kind === 'project' ? 'Project' : 'Task'} · {u.owner ?? 'No owner'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={fmtDay(u.date) === 'Today' ? 'amber' : 'blue'}>{fmtDay(u.date)}</Pill>
                    <span className="text-[10px] text-slate-400">
                      {u.kind === 'task' ? TASK_STAGE_LABEL[u.status] ?? titleCase(u.status) : PROJECT_STATUS_LABEL[u.status] ?? titleCase(u.status)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
    <Panel title="Sprints & Delivery" icon={Layers} subtitle="Current and upcoming sprints of your projects" to="/projects">
      <DataTable
        rows={pm.sprints}
        rowKey={(r) => r.sprint_id}
        rowTo={(r) => `/projects/${r.project_id}`}
        columns={[
          { header: 'Sprint', render: (r) => <span className="font-semibold text-slate-800">{r.sprint_name}</span> },
          { header: 'Project', render: (r) => r.project_name },
          { header: 'Start', render: (r) => fmtDate(r.start_date) },
          { header: 'End', render: (r) => fmtDate(r.end_date) },
          { header: 'Tasks', render: (r) => `${r.done_count} / ${r.task_count} done` },
          { header: 'Progress', className: 'w-32', render: (r) => <ProgressBar value={r.task_count ? Math.round((r.done_count / r.task_count) * 100) : 0} /> },
        ]}
      />
    </Panel>
    <Panel title="Overdue Project Tasks" icon={AlertOctagon} to="/projects">
      <DataTable
        rows={pm.overdue_list}
        rowKey={(r) => r.task_id}
        rowTo={(r) => `/projects/${r.project_id}`}
        columns={[
          { header: 'Task', render: (r) => <span className="font-semibold text-slate-800">{r.title}</span> },
          { header: 'Assignee', render: (r) => r.assignees ?? '—' },
          { header: 'Priority', render: (r) => <Pill tone={priorityTone(r.priority)}>{titleCase(r.priority)}</Pill> },
          { header: 'Due', render: (r) => <span className="text-rose-600">{fmtDate(r.due_date)}</span> },
          { header: 'Project', render: (r) => r.project_name },
        ]}
      />
    </Panel>
  </div>
);

export const ExpenseApprovalsCard: React.FC<{ section: ExpenseApprovalsSection }> = ({ section: e }) => (
  <Panel title="Expense Approvals" icon={Receipt} subtitle="Claims waiting for your decision" to="/expense?tab=claims" linkLabel="Open claims">
    <div className="mb-4 grid grid-cols-3 gap-2.5">
      <StatTile label="Waiting" value={e.waiting_count} tone="amber" />
      <StatTile label="Amount" value={fmtMoney(e.waiting_amount)} tone="blue" />
      <StatTile label="Oldest" value={`${e.oldest_waiting_days}d`} tone={e.oldest_waiting_days > 3 ? 'rose' : 'slate'} />
    </div>
    {e.items.length === 0 ? (
      <EmptyLine text="No claims are waiting for you." />
    ) : (
      <ul className="divide-y divide-slate-100">
        {e.items.map((c) => (
          <li key={c.claim_id}>
            <Link to="/expense?tab=claims" className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{c.employee_name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {c.claim_no ?? 'Claim'}
                  {c.department_name ? ` · ${c.department_name}` : ''}
                </p>
              </div>
              <span className="text-xs font-bold tabular-nums text-slate-900">{fmtMoney(c.amount)}</span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);

export const AssignedComplaintsCard: React.FC<{ section: AssignedComplaintsSection }> = ({ section: c }) => (
  <Panel title="Assigned Complaints" icon={ShieldAlert} subtitle="Complaints you handle" to="/complaints?tab=manage" linkLabel="Open queue">
    <div className="mb-4 grid grid-cols-3 gap-2.5">
      <StatTile label="Open" value={c.open} tone="blue" />
      <StatTile label="Overdue" value={c.overdue} tone="rose" />
      <StatTile label="Resolved" value={c.awaiting_confirmation} tone="emerald" />
    </div>
    {c.items.length === 0 ? (
      <EmptyLine text="No open complaints are assigned to you." />
    ) : (
      <ul className="divide-y divide-slate-100">
        {c.items.map((x) => (
          <li key={x.complaint_id}>
            <Link to="/complaints?tab=manage" className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{x.subject}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {x.complaint_no} · {x.status}
                </p>
              </div>
              {x.priority && <Pill tone={priorityTone(x.priority)}>{x.priority}</Pill>}
              <span className={`w-14 shrink-0 text-right text-[11px] ${x.overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                {x.target_date ? fmtDate(x.target_date) : '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);
