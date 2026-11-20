import React from 'react';
import {
  AlertOctagon,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarClock,
  FileWarning,
  Lock,
  PauseCircle,
  Receipt,
  Timer,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  CircleDot,
  ClipboardCheck,
  Hourglass,
  Briefcase,
  Banknote,
} from 'lucide-react';
import type { DashboardProfile, PayrollSection, PeopleSection } from '../types';
import { BarChartList, ChartCard, Donut, MonthlyColumns, recruitmentStageData } from './charts';
import { DataTable, Panel, Pill, SectionHeading, fmtDate, fmtMoney, kpiGrid, KpiLink, titleCase } from './dashboard-ui';

const TWO_COL = 'grid grid-cols-1 gap-4 lg:grid-cols-2';
const THREE_COL = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------------------
// 02 Leadership, 03 HR Manager, 04 HR Executive, 05 Recruiter
// ---------------------------------------------------------------------------

const SECTION_HINT: Partial<Record<DashboardProfile, string>> = {
  leadership: 'Read-only · employee records',
  hr_manager: 'Employees, recruitment, attendance and leave',
  hr_executive: 'Operational view · salary and PF fields are not shown',
  recruiter: 'Candidates and interviews only',
};

export const PeopleOverview: React.FC<{ people: PeopleSection; profile: DashboardProfile }> = ({ people: p, profile }) => {
  const e = p.employees;
  const c = p.candidates;
  const a = p.attendance;
  const isRecruiter = profile === 'recruiter';
  const isExec = profile === 'hr_executive';
  const isLeader = profile === 'leadership';

  return (
    <div className="space-y-5">
      <section aria-label="People KPIs" className="space-y-3">
        <SectionHeading title={isRecruiter ? 'Recruitment Overview' : isLeader ? 'Employee Overview' : 'HR Overview'} hint={SECTION_HINT[profile]} />
        <div className={kpiGrid()}>
          {e && (
            <>
              <KpiLink to="/admin/employees" label={isExec ? 'Employee Records' : 'Total Employees'} value={e.total} icon={Users} tone="blue" hint="All employee records" />
              <KpiLink to="/admin/employees?status=Active" label="Active Employees" value={e.active} icon={UserCheck} tone="emerald" />
              {!isExec && <KpiLink to="/admin/employees?status=Inactive" label="Inactive Employees" value={e.inactive} icon={UserMinus} tone="slate" />}
              {(profile === 'hr_manager') && <KpiLink to="/admin/employees" label="New Joiners" value={e.new_joiners} icon={UserPlus} tone="purple" hint="Joined this month" />}
            </>
          )}
          {c && profile === 'hr_manager' && (
            <>
              <KpiLink to="/admin/recruitment" label="Total Candidates" value={c.total} icon={Briefcase} tone="blue" />
              <KpiLink to="/admin/recruitment" label="Candidates Requiring Action" value={c.requiring_action} icon={ClipboardCheck} tone="amber" hint="Interview, decision or onboarding" />
            </>
          )}
          {c && isExec && <KpiLink to="/admin/recruitment" label="Candidates in Process" value={c.in_process} icon={Briefcase} tone="blue" />}
          {isExec && p.documents && <KpiLink to="/admin/employees?status=Onboarding" label="Pending Onboarding Items" value={p.documents.missing_total} icon={FileWarning} tone="amber" hint="Required documents not received" />}
          {c && isRecruiter && (
            <>
              <KpiLink to="/admin/recruitment" label="Total Candidates" value={c.total} icon={Briefcase} tone="blue" />
              <KpiLink to="/admin/recruitment" label="New Candidates" value={c.new} icon={UserPlus} tone="blue" />
              <KpiLink to="/admin/recruitment" label="Interviewing" value={c.interviewing} icon={CircleDot} tone="purple" />
              <KpiLink to="/admin/recruitment" label="Selected" value={c.selected} icon={BadgeCheck} tone="emerald" />
              <KpiLink to="/admin/recruitment" label="On Hold" value={c.on_hold} icon={PauseCircle} tone="amber" />
              <KpiLink to="/admin/recruitment" label="Overdue Follow-up / Review" value={c.overdue_review} icon={AlertOctagon} tone="rose" hint="Review date passed" />
            </>
          )}
          {a && (
            <>
              <KpiLink to="/attendance" label="Present Today" value={a.present_today} icon={Timer} tone="emerald" hint={`${a.active} active employees`} />
              <KpiLink to="/leave?tab=requests" label={isExec ? 'Pending Leave Actions' : 'Pending Leave Requests'} value={p.leave?.pending ?? 0} icon={CalendarCheck} tone="amber" />
              <KpiLink to="/attendance" label={isExec ? 'Attendance Regularization' : 'Attendance Exceptions'} value={a.regularization_pending} icon={CalendarClock} tone="rose" hint="Pending regularization" />
            </>
          )}
        </div>
      </section>

      <div className={THREE_COL}>
        {e && (
          <ChartCard
            title="Department-wise Employees"
            subtitle="Active employees by department"
            icon={Building2}
            tone="indigo"
            info="Active employees in each department, largest first."
            footer={<>Active employees: <strong className="text-slate-700">{e.active}</strong></>}
            to="/admin/employees?status=Active"
          >
            <BarChartList unit="active" max={10} data={e.departments.map((d) => ({ key: d.key, label: d.key, value: d.count, to: d.id ? `/admin/employees?dep_id=${d.id}&status=Active` : undefined }))} />
          </ChartCard>
        )}
        {e && !isLeader && (
          <ChartCard
            title="Designation-wise Employees"
            subtitle="Active employees by designation"
            icon={Briefcase}
            tone="blue"
            info="Active employees for each designation, largest first."
            footer={<>Active employees: <strong className="text-slate-700">{e.active}</strong></>}
            to="/admin/employees?status=Active"
          >
            <BarChartList unit="active" max={10} data={e.designations.map((d) => ({ key: d.key, label: d.key, value: d.count }))} />
          </ChartCard>
        )}
        {e && !isLeader && !isExec && (
          <ChartCard
            title="Monthly Joining Trend"
            subtitle="Last six months"
            icon={UserPlus}
            tone="purple"
            info="Employees who joined in each of the last six months, by joining date."
            footer={<><strong className="text-slate-700">{e.new_joiners}</strong> joined this month</>}
            to="/admin/employees"
          >
            <MonthlyColumns data={e.monthly_joining.map((m) => ({ month: m.month, a: m.joined, b: 0 }))} aLabel="Joined" />
          </ChartCard>
        )}
        {e && (
          <ChartCard
            title="Employee Status"
            subtitle="All employee records"
            icon={Users}
            info="Employees by status: Active, Onboarding (not yet activated) and Inactive."
            footer={<>Total employees: <strong className="text-slate-700">{e.total}</strong></>}
            to="/admin/employees"
          >
            <Donut
              centerLabel="Employees"
              unit="employees"
              data={[
                { key: 'Active', label: 'Active', value: e.active, color: '#22c55e', to: '/admin/employees?status=Active' },
                { key: 'Onboarding', label: 'Onboarding', value: e.onboarding, color: '#f59e0b', to: '/admin/employees?status=Onboarding' },
                { key: 'Inactive', label: 'Inactive', value: e.inactive, color: '#64748b', to: '/admin/employees?status=Inactive' },
              ]}
            />
          </ChartCard>
        )}
        {c && (
          <ChartCard
            title="Candidate Pipeline"
            subtitle="Candidates by stage"
            icon={Briefcase}
            tone="purple"
            info="Candidates in each recruitment stage, with the colours of the Recruitment dashboard."
            footer={<><strong className="text-slate-700">{c.in_process}</strong> open of {c.total} candidates</>}
            to="/admin/recruitment"
          >
            <BarChartList unit="candidates" data={recruitmentStageData(c.stages, '/admin/recruitment')} />
          </ChartCard>
        )}
        {c && isRecruiter && (
          <>
            <ChartCard title="Candidates by Position" subtitle="Position applied for" icon={Briefcase} tone="blue" info="Candidates grouped by the position they applied for." to="/admin/recruitment">
              <BarChartList unit="candidates" data={c.by_position.map((d) => ({ key: d.key, label: d.key, value: d.count }))} />
            </ChartCard>
            <ChartCard title="Candidates by Source" subtitle="Where candidates come from" icon={UserPlus} tone="amber" info="Candidates grouped by source." to="/admin/recruitment">
              <BarChartList unit="candidates" data={c.by_source.map((d) => ({ key: d.key, label: titleCase(d.key), value: d.count }))} />
            </ChartCard>
          </>
        )}
        {a && (
          <ChartCard
            title="Attendance Today"
            subtitle="All active employees"
            icon={CalendarCheck}
            tone="emerald"
            info="Today in India time: employees who checked in, employees on approved leave and those who have not checked in yet."
            footer={<><strong className="text-slate-700">{a.still_working}</strong> still working</>}
            to="/attendance"
          >
            <Donut
              centerLabel="Active staff"
              unit="employees"
              data={[
                { key: 'in', label: 'Checked in', value: a.present_today, color: '#22c55e', to: '/attendance' },
                { key: 'leave', label: 'On leave', value: a.on_leave, color: '#f59e0b', to: '/leave?tab=calendar' },
                { key: 'not', label: 'Not checked in', value: a.not_yet_in, color: '#94a3b8', to: '/attendance' },
              ]}
            />
          </ChartCard>
        )}
      </div>

      <div className={TWO_COL}>
        {p.leave && (
          <Panel title="Pending Leave Requests" icon={CalendarCheck} subtitle="Awaiting action, oldest first" to="/leave?tab=requests" linkLabel="Leave requests">
            <DataTable
              rows={p.leave.rows}
              rowKey={(r) => r.request_id}
              rowTo={() => '/leave?tab=requests'}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name}</span> },
                { header: 'Department', render: (r) => r.department_name ?? '—' },
                { header: 'Leave type', render: (r) => r.leave_type_name ?? '—' },
                { header: 'From', render: (r) => fmtDate(r.from_date) },
                { header: 'To', render: (r) => fmtDate(r.to_date) },
                { header: 'Days', render: (r) => r.days },
                { header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
                { header: 'Status', render: (r) => titleCase(r.status) },
              ]}
            />
          </Panel>
        )}
        {a && (
          <Panel title="Attendance Regularization" icon={CalendarClock} subtitle="Pending requests, oldest first" to="/attendance" linkLabel="Attendance">
            <DataTable
              rows={a.regularizations}
              rowKey={(r) => r.correction_id}
              rowTo={() => '/attendance'}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name}</span> },
                { header: 'Date', render: (r) => fmtDate(r.work_date) },
                { header: 'Reason', render: (r) => <span className="block max-w-[220px] truncate" title={r.reason}>{r.reason}</span> },
                { header: 'Submitted', render: (r) => fmtDate(r.submitted_at) },
                { header: 'Status', render: () => <Pill tone="amber">Pending</Pill> },
              ]}
            />
          </Panel>
        )}
        {c && (
          <Panel title={isRecruiter ? 'Candidate Decision Queue' : 'Candidate Decisions'} icon={ClipboardCheck} subtitle="Interview, selected or on hold: decision pending" to="/admin/recruitment">
            <DataTable
              rows={c.decisions}
              rowKey={(r) => r.candidate_id}
              rowTo={(r) => `/admin/recruitment/${r.candidate_id}`}
              columns={[
                { header: 'Candidate', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
                { header: 'Position', render: (r) => r.position ?? '—' },
                { header: 'Stage', render: (r) => titleCase(r.stage.replace(/_/g, ' ')) },
                { header: 'Review date', render: (r) => fmtDate(r.review_date) },
              ]}
            />
          </Panel>
        )}
        {c && isRecruiter && (
          <Panel title="Recent Candidate Updates" icon={Briefcase} subtitle="Most recently changed" to="/admin/recruitment">
            <DataTable
              rows={c.recent}
              rowKey={(r) => r.candidate_id}
              rowTo={(r) => `/admin/recruitment/${r.candidate_id}`}
              columns={[
                { header: 'Candidate', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
                { header: 'Position', render: (r) => r.position ?? '—' },
                { header: 'Source', render: (r) => (r.source ? titleCase(r.source) : '—') },
                { header: 'Stage', render: (r) => titleCase(r.stage.replace(/_/g, ' ')) },
                { header: 'Last updated', render: (r) => fmtDate(r.updated_at) },
              ]}
            />
          </Panel>
        )}
        {p.onboarding && (
          <Panel title="Onboarding Pending Items" icon={FileWarning} subtitle="Employees not activated yet" to="/admin/employees?status=Onboarding">
            <DataTable
              rows={p.onboarding}
              rowKey={(r) => r.emp_id}
              rowTo={(r) => `/admin/employees/${r.emp_id}`}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
                { header: 'Joining date', render: (r) => fmtDate(r.joining_date) },
                { header: 'Outstanding documents', render: (r) => (r.missing_documents > 0 ? <Pill tone="amber">{r.missing_documents} missing</Pill> : <Pill tone="emerald">Complete</Pill>) },
                { header: 'Status', render: () => <Pill tone="amber">Onboarding</Pill> },
              ]}
            />
          </Panel>
        )}
        {p.documents && isExec && (
          <Panel title="Employee Document Queue" icon={FileWarning} subtitle="Required documents not yet received" to="/admin/employees">
            <DataTable
              rows={p.documents.queue}
              rowKey={(r) => `${r.emp_id}-${r.document_type}`}
              rowTo={(r) => `/admin/employees/${r.emp_id}`}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name}</span> },
                { header: 'Document', render: (r) => titleCase(r.document_type) },
                { header: 'Status', render: (r) => titleCase(r.status) },
                { header: 'Last updated', render: (r) => fmtDate(r.updated_at) },
              ]}
            />
          </Panel>
        )}
        {e && (
          <Panel
            title={isLeader ? 'Employee Directory' : 'Recent Employee Records'}
            icon={Users}
            subtitle={isLeader ? 'Read-only, most recently joined' : 'Most recently joined'}
            to="/admin/employees"
            className={isLeader ? 'lg:col-span-2' : ''}
          >
            <DataTable
              rows={e.recent}
              rowKey={(r) => r.emp_id}
              rowTo={(r) => `/admin/employees/${r.emp_id}`}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
                { header: 'Designation', render: (r) => r.role_name ?? '—' },
                { header: 'Department', render: (r) => r.department_name ?? '—' },
                { header: 'Joining date', render: (r) => fmtDate(r.joining_date) },
                { header: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'emerald' : r.status === 'Onboarding' ? 'amber' : 'slate'}>{r.status}</Pill> },
              ]}
            />
          </Panel>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 06 Finance Manager, 07 Accountant, 08 Payroll Executive
// ---------------------------------------------------------------------------

const RUN_TONE = (status: string) => (status === 'PAID' ? 'emerald' : status === 'LOCKED' ? 'blue' : 'amber') as 'emerald' | 'blue' | 'amber';

export const PayrollOverview: React.FC<{ payroll: PayrollSection; profile: DashboardProfile }> = ({ payroll: f, profile }) => {
  const cur = f.current;
  const label = cur ? `${MONTHS[cur.payroll_month - 1]} ${cur.payroll_year}` : 'No payroll run yet';
  return (
    <div className="space-y-5">
      <section aria-label="Payroll KPIs" className="space-y-3">
        <SectionHeading title="Payroll Processing" hint="Payroll data only · employee profile fields are not shown" />
        {!cur ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-6 text-center text-xs font-medium text-slate-500">No payroll run has been started yet.</p>
        ) : (
          <div className={kpiGrid()}>
            <KpiLink to="/admin/payroll" label="Current Payroll Month" value={label} icon={CalendarClock} tone="blue" />
            <KpiLink to="/admin/payroll" label={profile === 'payroll_executive' ? 'Current Run Status' : 'Payroll Run Status'} value={titleCase(cur.status)} icon={Wallet} tone="slate" />
            <KpiLink to="/admin/payroll" label="Employees Included" value={cur.included} icon={Users} tone="blue" />
            <KpiLink to="/admin/payroll" label="Employees Processed" value={cur.processed} icon={UserCheck} tone="emerald" />
            <KpiLink to="/admin/payroll" label="Total Net Salary" value={fmtMoney(cur.total_salary)} icon={Banknote} tone="emerald" />
            <KpiLink to="/admin/payroll" label={profile === 'payroll_executive' ? 'Warnings / Alerts' : 'Payroll Warnings'} value={cur.warnings} icon={AlertOctagon} tone="rose" />
            {profile === 'finance_manager' && (
              <KpiLink to="/admin/payroll" label="Attendance Lock Status" value={cur.attendance_locked ? 'Locked' : 'Open'} icon={Lock} tone={cur.attendance_locked ? 'emerald' : 'amber'} />
            )}
          </div>
        )}
      </section>

      <div className={TWO_COL}>
        <Panel title="Payroll Runs" icon={Wallet} subtitle="Latest runs" to="/admin/payroll">
          <DataTable
            rows={f.runs}
            rowKey={(r) => `${r.payroll_year}-${r.payroll_month}`}
            rowTo={(r) => `/admin/payroll/${r.payroll_year}/${r.payroll_month}`}
            columns={[
              { header: 'Month', render: (r) => <span className="font-semibold text-slate-800">{MONTHS[r.payroll_month - 1]} {r.payroll_year}</span> },
              { header: 'Status', render: (r) => <Pill tone={RUN_TONE(r.status)}>{titleCase(r.status)}</Pill> },
              { header: 'Included', render: (r) => r.included },
              { header: 'Processed', render: (r) => r.processed },
              { header: 'Net salary', render: (r) => fmtMoney(r.total_salary) },
              { header: 'Warnings', render: (r) => (r.warnings > 0 ? <Pill tone="rose">{r.warnings}</Pill> : '0') },
            ]}
          />
        </Panel>
        <Panel title="Payroll Exceptions" icon={AlertOctagon} subtitle="Checks on the current run" to="/admin/payroll">
          <DataTable
            rows={f.exceptions}
            rowKey={(r) => `${r.employee_code}-${r.issue}`}
            rowTo={() => '/admin/payroll'}
            columns={[
              { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name} <span className="font-normal text-slate-400">({r.employee_code})</span></span> },
              { header: 'Issue', render: (r) => <span className="block max-w-[260px] truncate" title={r.issue}>{r.issue}</span> },
              { header: 'Status', render: (r) => titleCase(r.run_status) },
            ]}
          />
        </Panel>
        {profile !== 'payroll_executive' && (
          <Panel title="Attendance / Shift Issues" icon={Hourglass} subtitle="Missing punches affecting the current run" to="/admin/payroll" className="lg:col-span-2">
            <DataTable
              rows={f.shift_issues}
              rowKey={(r) => `${r.employee_code}-${r.issue}`}
              rowTo={() => '/admin/payroll'}
              columns={[
                { header: 'Employee', render: (r) => <span className="font-semibold text-slate-800">{r.employee_name} <span className="font-normal text-slate-400">({r.employee_code})</span></span> },
                { header: 'Issue', render: (r) => r.issue },
                { header: 'Affected run', render: () => label },
                { header: 'Resolution', render: (r) => titleCase(r.run_status) },
              ]}
            />
          </Panel>
        )}
      </div>
      <ExpenseNote />
    </div>
  );
};

/** A one-line reminder that expense payment processing is not shown (marked "Proposed" in the matrix). */
const ExpenseNote: React.FC = () => (
  <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
    <Receipt className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    Accounts expense and reimbursement processing is not shown here until its access is confirmed. Your own claims are under My Expenses.
  </p>
);
