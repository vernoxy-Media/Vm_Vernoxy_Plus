import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  BadgeCheck,
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
  leadStageData,
  priorityData,
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
const StatTile: React.FC<{ label: string; value: React.ReactNode; tone: keyof typeof STAT_TILE_TONE }> = ({ label, value, tone }) => (
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
        <SectionTitle title="Organisation Overview" hint="All modules · Admin access" />
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
            hint={a.payroll ? `${payrollLabel} · ${a.payroll.total_employees} employees` : payrollLabel} />
          <KpiLink to="/expense?tab=claims" label="Pending Expense Claims" value={a.expenses.pending_review} icon={Receipt} tone="rose"
            hint={`${a.expenses.approved_unpaid} approved, unpaid · ${a.expenses.reimbursed} reimbursed`} />
          <KpiLink to="/admin/complaints" label="Active Complaints" value={a.complaints.new + a.complaints.in_progress} icon={ShieldAlert} tone="rose"
            hint={`${a.complaints.new} new · ${a.complaints.overdue} overdue · ${a.complaints.awaiting_confirmation} resolved`} />
        </div>
      </section>

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
          <KpiLink to="/sales/leads" label="My Open Leads" value={s.open_leads} icon={Target} tone="amber"
            hint={`${stage('New')} new · ${stage('Contacted')} contacted · ${stage('Qualified')} qualified`} />
          <KpiLink to="/sales/leads" label="My Total Leads" value={s.my_leads} icon={Briefcase} tone="purple"
            hint={`${stage('On Hold')} on hold · ${stage('Converted')} won · ${stage('Lost')} lost`} />
          <KpiLink to="/sales/follow-ups?tab=today" label="Follow-ups Due Today" value={s.follow_ups_today} icon={PhoneCall} tone="emerald" />
          <KpiLink to="/sales/follow-ups?tab=overdue" label="Overdue Follow-ups" value={s.follow_ups_overdue} icon={CalendarX} tone="rose" />
          <KpiLink to="/sales/clients" label="My Clients" value={s.my_clients} icon={Handshake} tone="emerald"
            hint={`${s.won_this_month} won this month · ${s.won_this_year} this year`} />
          <KpiLink to="/sales/leads" label="Converted to Client" value={s.converted} icon={BadgeCheck} tone="blue" hint="Your leads won" />
        </div>
      </section>
      <div className={THREE_COL}>
        <ChartCard
          title="My Lead Stages"
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
                        {[l.contact, l.lead_source].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone="indigo">{l.lead_stage ?? '—'}</Pill>
                      <span className="text-[10px] text-slate-400">{l.next_follow_up_at ? fmtDate(l.next_follow_up_at) : 'No follow-up'}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Follow-ups" icon={PhoneCall} subtitle="Open follow-ups, earliest first" to="/sales/follow-ups">
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
      <div className={kpiGrid(5)}>
        <KpiLink to="/projects" label="Managed Projects" value={pm.counts.managed} icon={FolderKanban} tone="blue"
          hint={`${pm.counts.in_progress} in progress · ${pm.counts.delivered} delivered · ${pm.counts.on_hold} on hold`} />
        <KpiLink to="/projects" label="Project Tasks" value={pm.project_tasks} icon={ListChecks} tone="emerald" />
        <KpiLink to="/projects" label="Overdue Tasks" value={pm.overdue_tasks} icon={AlertOctagon} tone="rose" />
        <KpiLink to="/projects" label="Awaiting Approval" value={pm.awaiting_approval} icon={Hourglass} tone="purple" />
        <KpiLink to="/projects" label="Average Progress" value={pm.average_progress === null ? '—' : `${pm.average_progress}%`} icon={Gauge} tone="slate"
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
      <Panel title="Managed Projects" icon={FolderKanban} subtitle="Recently updated" to="/projects">
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
