import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  BookOpen,
  Cake,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  FolderKanban,
  ListTodo,
  MessageSquare,
  PauseCircle,
  Plane,
  Receipt,
  ShieldAlert,
  Sparkles,
  Timer,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { Avatar } from '@/shared/ui/Avatar';
import { useLeaveDashboardQuery } from '@/features/leave/hooks/use-leave';
import { useOfficeHolidays, useUpcomingBirthdays } from '../hooks/use-home-dashboard';
import type { HomeDashboardData, DashboardActivityItem } from '../types';
import {
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
  fmtMinutes,
  fmtMoney,
  fmtTime,
  priorityTone,
  relTime,
  stageTone,
  titleCase,
} from './dashboard-ui';

// ---------------------------------------------------------------------------
// KPI cards: own and assigned tasks (VM-004 sections 11 to 15; also the work KPIs of every other dashboard)
// ---------------------------------------------------------------------------

export const WorkOverview: React.FC<{ data: HomeDashboardData }> = ({ data }) => {
  const k = data.task_kpis;
  return (
    <section aria-label="My Work Overview" className="space-y-3">
      <SectionHeading title="My Work Overview" />
      <div className={kpiGrid(6)}>
        <KpiLink to="/my-tasks" label="My Total Tasks" value={k.total} icon={ListTodo} tone="blue" hint="Own and assigned tasks" />
        <KpiLink to="/my-tasks" label="To Do / In Progress" value={k.todo_in_progress} icon={CircleDot} tone="blue" />
        <KpiLink to="/my-tasks" label="On Hold" value={k.on_hold} icon={PauseCircle} tone="amber" />
        <KpiLink to="/my-tasks" label="In Review" value={k.in_review} icon={Eye} tone="purple" />
        <KpiLink to="/my-tasks" label="Overdue" value={k.overdue} icon={AlertOctagon} tone="rose" hint="Past due, not done" />
        <KpiLink to="/my-tasks" label="Due Today" value={k.due_today} icon={CalendarClock} tone="emerald" hint={`${k.done} done in total`} />
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Work lists
// ---------------------------------------------------------------------------

const BUCKET_LABEL = { today: 'Today', overdue: 'Overdue', upcoming: '', no_date: 'No date' } as const;

/** VM-004 rule 2: up to 5 tasks, due today, then overdue (oldest first), then upcoming; no completed tasks. */
export const MyTasksCard: React.FC<{ data: HomeDashboardData; className?: string }> = ({ data, className }) => (
  <Panel title="My Tasks" icon={ClipboardList} to="/my-tasks" linkLabel="View all tasks" className={className}>
    {data.my_tasks.length === 0 ? (
      <EmptyLine text="No open tasks. You are all caught up." />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.my_tasks.map((t) => (
          <li key={t.task_id}>
            <Link to="/my-tasks" className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-800">{t.title}</p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {t.task_code}
                  {t.project_name ? ` · ${t.project_name}` : ''}
                </p>
              </div>
              <Pill tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Pill>
              <span className={`hidden w-16 shrink-0 text-right text-[11px] font-semibold sm:block ${t.bucket === 'overdue' ? 'text-rose-600' : 'text-slate-600'}`}>
                {t.bucket === 'today' ? 'Today' : t.due_date ? fmtDate(t.due_date) : BUCKET_LABEL[t.bucket]}
              </span>
              <Pill tone={stageTone(t.stage)}>{TASK_STAGE_LABEL[t.stage] ?? titleCase(t.stage)}</Pill>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);

/** VM-004 rule 3: up to 5 accessible projects, nearest deadline first. */
export const RecentProjectsCard: React.FC<{ data: HomeDashboardData; className?: string }> = ({ data, className }) => (
  <Panel title="Recent Projects" icon={FolderKanban} to="/projects" className={className}>
    {data.recent_projects.length === 0 ? (
      <EmptyLine />
    ) : (
      <ul className="space-y-3">
        {data.recent_projects.map((p) => (
          <li key={p.project_id}>
            <Link to={`/projects/${p.project_id}`} className="-mx-2 block rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-semibold text-slate-800">{p.project_name}</p>
                <span className="shrink-0 text-[10px] text-slate-400">{p.project_no}</span>
              </div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                {PROJECT_STATUS_LABEL[p.project_status] ?? titleCase(p.project_status)} · Deadline {fmtDate(p.deadline)}
              </p>
              <ProgressBar value={p.progress} />
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);

/** VM-004 rule 4: up to 5 upcoming task, project and calendar dates; overdue items are not shown. */
export const UpcomingDeadlinesCard: React.FC<{ data: HomeDashboardData; className?: string }> = ({ data, className }) => {
  const to = (kind: string, id: number) => (kind === 'project' ? `/projects/${id}` : kind === 'task' ? '/my-tasks' : '/calendar');
  return (
    <Panel title="Upcoming Deadlines" icon={CalendarDays} to="/calendar" linkLabel="Calendar" className={className}>
      {data.upcoming_deadlines.length === 0 ? (
        <EmptyLine text="Nothing due soon." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.upcoming_deadlines.map((d) => {
            const label = fmtDay(d.date);
            return (
              <li key={`${d.kind}-${d.id}`}>
                <Link to={to(d.kind, d.id)} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{d.title}</p>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {d.kind === 'task' ? 'Task' : d.kind === 'project' ? 'Project deadline' : 'Event'}
                      {d.context ? ` · ${d.context}` : ''}
                      {d.kind === 'event' ? ` · ${fmtTime(d.date)}` : ''}
                    </p>
                  </div>
                  <Pill tone={label === 'Today' ? 'amber' : 'blue'}>{label}</Pill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// People & Office Updates (VM-004 rules 5 and 6)
// ---------------------------------------------------------------------------

export const BirthdaysCard: React.FC = () => {
  const { data = [] } = useUpcomingBirthdays();
  // Rule 5: hide the whole card when nobody has a birthday in the next 10 days
  if (data.length === 0) return null;
  const sorted = [...data].sort((a, b) => a.days_until - b.days_until);
  return (
    <Panel title="Birthdays" icon={Cake} subtitle="Next 10 days">
      <p className="mb-2 text-2xl font-black tabular-nums text-slate-900">{sorted.length}</p>
      <ul className="space-y-2">
        {sorted.slice(0, 3).map((b) => (
          <li key={b.emp_id} className="flex items-center gap-2.5">
            <Avatar name={b.name} src={b.photo_url} size={28} className="shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-800">{b.name}</p>
              <p className="text-xs font-medium text-slate-500">{fmtDate(b.date)}</p>
            </div>
            <Pill tone={b.days_until === 0 ? 'rose' : 'emerald'}>{b.days_until === 0 ? 'Today' : `In ${b.days_until} day${b.days_until === 1 ? '' : 's'}`}</Pill>
          </li>
        ))}
      </ul>
      {sorted.length > 3 && <p className="mt-2 text-xs text-slate-500">+{sorted.length - 3} more</p>}
    </Panel>
  );
};

export const HolidaysCard: React.FC = () => {
  const { data = [] } = useOfficeHolidays();
  const upcoming = [...data].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  // Rule 6: hide only when no future holiday is scheduled (this year or next)
  if (upcoming.length === 0) return null;
  const next = upcoming[0];
  const year = String(new Date().getFullYear());
  const remainingThisYear = upcoming.filter((h) => h.holiday_date.startsWith(year)).length;
  const d = new Date(`${next.holiday_date}T00:00:00`);
  const days = Math.round((d.getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
  return (
    <Panel title="Office Holidays" icon={Plane} to="/calendar" linkLabel="Calendar">
      <p className="text-2xl font-black tabular-nums text-slate-900">{remainingThisYear}</p>
      <p className="mb-3 text-xs font-medium text-slate-500">Holidays left in {year}</p>
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-center shadow-2xs">
          <span className="text-sm font-black leading-none text-slate-900">{d.getDate()}</span>
          <span className="text-[9px] font-bold uppercase text-slate-400">{d.toLocaleString('en', { month: 'short' })}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next holiday</p>
          <p className="truncate text-[13px] font-semibold text-slate-800">{next.name}</p>
          <p className="text-[11px] text-emerald-600">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days to go`}</p>
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Personal services (VM-004 rules 7 to 10)
// ---------------------------------------------------------------------------

export const AttendanceCard: React.FC<{ data: HomeDashboardData }> = ({ data }) => {
  const a = data.attendance;
  const open = a.checked_in && !a.check_out_at && a.check_in_at;
  const worked = open
    ? Math.max(0, Math.floor((Date.now() - new Date(a.check_in_at!).getTime()) / 60_000) - a.break_minutes)
    : a.production_minutes;
  return (
    <Panel title="My Attendance" icon={Timer} to="/attendance" linkLabel="View">
      {a.checked_in ? (
        <>
          <Pill tone={open ? 'emerald' : 'slate'}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> {open ? 'Checked in' : 'Checked out'}
          </Pill>
          <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{fmtTime(a.check_in_at)}</p>
          <p className="text-xs font-medium text-slate-500">
            Working: {fmtMinutes(worked)}
            {a.check_out_at ? ` · Out ${fmtTime(a.check_out_at)}` : ''}
          </p>
        </>
      ) : (
        <>
          <Pill tone="amber">
            <Clock className="mr-1 h-3 w-3" /> Not checked in
          </Pill>
          <p className="mt-2 text-xs font-medium text-slate-500">No attendance recorded for today yet.</p>
        </>
      )}
    </Panel>
  );
};

export const LeaveCard: React.FC<{ data: HomeDashboardData }> = ({ data }) => {
  // The balance comes from the Leave module itself, so it always matches the Leave page
  const { data: leave } = useLeaveDashboardQuery();
  const tracked = leave?.employee.balances.filter((b) => b.balance_tracked) ?? [];
  const available = tracked.reduce((s, b) => s + (b.available ?? 0), 0);
  const r = data.leave_requests;
  return (
    <Panel title="My Leave" icon={Plane} to={r.total > 0 ? '/leave' : undefined} linkLabel="View requests">
      {!leave ? (
        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
      ) : !leave.employee.has_policy ? (
        <p className="text-xs text-amber-700">No leave policy is assigned to you yet.</p>
      ) : (
        <>
          <p className="text-3xl font-black tabular-nums text-slate-900">
            {tracked.length ? `${Math.round(available * 10) / 10} Days` : 'No limit'}
          </p>
          <p className="text-xs font-medium text-slate-500">Available balance</p>
        </>
      )}
      {/* Rule 8: request details only once the person has submitted a request */}
      {r.total > 0 && (
        <p className="mt-3 truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
          {r.pending > 0 ? `${r.pending} pending request${r.pending === 1 ? '' : 's'}` : 'No pending requests'}
          {r.latest ? ` · Latest ${titleCase(r.latest.status)}` : ''}
        </p>
      )}
    </Panel>
  );
};

/** Rule 9: only rendered when the person has raised a claim (the server sends null otherwise). */
export const ExpensesCard: React.FC<{ data: HomeDashboardData }> = ({ data }) => {
  const e = data.expenses;
  if (!e) return null;
  return (
    <Panel title="My Expenses" icon={Receipt} to="/expense" linkLabel="View">
      <p className="text-3xl font-black tabular-nums text-slate-900">{e.waiting_approval}</p>
      <p className="text-xs font-medium text-slate-500">Waiting for approval</p>
      {e.latest && (
        <p className="mt-3 truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
          Latest {e.latest.claim_no ?? 'claim'} · {fmtMoney(e.latest.amount)} · {titleCase(e.latest.status)}
        </p>
      )}
    </Panel>
  );
};

/** Rule 10: only rendered when the person has raised a complaint. */
export const ComplaintsCard: React.FC<{ data: HomeDashboardData }> = ({ data }) => {
  const c = data.complaints;
  if (!c) return null;
  return (
    <Panel title="My Complaints" icon={ShieldAlert} to="/complaints" linkLabel="View">
      <p className="text-3xl font-black tabular-nums text-slate-900">{c.active}</p>
      <p className="text-xs font-medium text-slate-500">Active complaint{c.active === 1 ? '' : 's'}</p>
      {c.latest && (
        <p className="mt-3 truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600" title={c.latest.subject}>
          {c.latest.complaint_no} · {c.latest.status}
        </p>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Activity, messages, knowledge base (VM-004 rules 11 to 13)
// ---------------------------------------------------------------------------

/** Where an activity opens. The destination page re-checks access on the server. */
function activityLink(a: DashboardActivityItem, data: HomeDashboardData): string | null {
  switch (a.entity_type) {
    case 'TASK':
      return '/my-tasks';
    case 'PROJECT':
      return `/projects/${a.entity_id}`;
    case 'LEAD':
      return data.admin || data.sales ? `/sales/leads/${a.entity_id}` : null;
    case 'COMPLAINT':
      return '/complaints';
    case 'EXPENSE_CLAIM':
      return '/expense';
    case 'LEAVE_REQUEST':
      return '/leave';
    case 'KB_ARTICLE':
      return `/knowledge-base/articles/${a.entity_id}`;
    case 'CANDIDATE':
      return data.admin ? `/recruitment/${a.entity_id}` : null;
    default:
      return null;
  }
}

export const RecentActivitiesCard: React.FC<{ data: HomeDashboardData; className?: string }> = ({ data, className }) => (
  <Panel title="Recent Activities" icon={Activity} className={className}>
    {data.recent_activities.length === 0 ? (
      <EmptyLine />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.recent_activities.map((a) => {
          const to = activityLink(a, data);
          const body = (
            <>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Sparkles className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] text-slate-800">{a.summary}</p>
                <p className="text-xs text-slate-500">
                  {a.performed_by_name ? `${a.performed_by_name} · ` : ''}
                  {relTime(a.performed_at)}
                </p>
              </div>
            </>
          );
          return (
            <li key={a.log_id}>
              {to ? (
                <Link to={to} className="-mx-2 flex gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50">
                  {body}
                </Link>
              ) : (
                <div className="flex gap-2.5 py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </Panel>
);

export const MessagesCard: React.FC<{ data: HomeDashboardData; className?: string }> = ({ data, className }) => (
  <Panel
    title="Recent Messages"
    icon={MessageSquare}
    subtitle={data.messages.unread_conversations ? `${data.messages.unread_conversations} unread conversation${data.messages.unread_conversations === 1 ? '' : 's'}` : undefined}
    to="/messenger"
    linkLabel="Open Messenger"
    className={className}
  >
    {data.messages.items.length === 0 ? (
      <EmptyLine text="No conversations yet." />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.messages.items.map((m) => {
          const unread = m.unread_count > 0;
          return (
            <li key={m.conversation_id}>
              <Link to="/messenger" className={`-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 ${unread ? 'bg-blue-50/50' : ''}`}>
                <Avatar name={m.title} size={28} className="shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs ${unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{m.title}</p>
                  <p className={`truncate text-[11px] ${unread ? 'text-slate-700' : 'text-slate-500'}`}>
                    {m.sender_name && m.kind === 'group' ? `${m.sender_name}: ` : ''}
                    {m.preview ?? ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-400">{relTime(m.last_message_at)}</span>
                  {unread && <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">{m.unread_count}</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    )}
  </Panel>
);

export const KnowledgeBaseCard: React.FC<{ data: HomeDashboardData; className?: string }> = ({ data, className }) => (
  <Panel title="Knowledge Base" icon={BookOpen} subtitle="Recently published or updated" to="/knowledge-base" className={className}>
    {data.knowledge_base.length === 0 ? (
      <EmptyLine />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.knowledge_base.map((k) => (
          <li key={k.article_id}>
            <Link to={`/knowledge-base/articles/${k.article_code}`} className="-mx-2 block rounded-lg px-2 py-2 hover:bg-slate-50">
              <p className="truncate text-[13px] font-semibold text-slate-800">{k.title}</p>
              <p className="truncate text-xs font-medium text-slate-500">
                {k.category_name ? `${k.category_name} · ` : ''}Updated {fmtDate(k.updated_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);
