import React from 'react';
import { CalendarDays, CheckCircle2, Circle, Clock, Pencil, Rocket, Users } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import { useContainerWidth } from '@/shared/ui/useContainerWidth';
import { STATUS_LOZENGE } from './ProjectStatusMenu';
import type { DeliveryReadiness, ProjectItem, ProjectTaskItem } from '../types';

interface WorkloadRow {
  emp_id: number;
  name: string;
  email: string;
  role: string;
  totalTasks: number;
  completedTasks: number;
  actHours: string | number;
  completionRate: number;
}

interface ProjectSummaryViewProps {
  project: ProjectItem;
  tasks: ProjectTaskItem[];
  kpi: { estHours: number | string; actHours: number | string; startDate: string; deadline: string };
  workload: WorkloadRow[];
  /** Admin: may edit the project. */
  canEdit: boolean;
  /** Admin or project manager: may change the team. */
  canManageTeam: boolean;
  onEdit: () => void;
  /** What is still open before the project can be delivered (admin and project manager). */
  delivery?: DeliveryReadiness | null;
  onDeliver?: () => void;
}

const STAGES = [
  { stage: 'assigned', label: 'To Do', bar: 'bg-[#97A0AF]' },
  { stage: 'in_progress', label: 'In Progress', bar: 'bg-[color:var(--ac-main,#0052CC)]' },
  { stage: 'hold', label: 'On Hold', bar: 'bg-[#FF991F]' },
  { stage: 'requested', label: 'In Review', bar: 'bg-[#6554C0]' },
  { stage: 'completed', label: 'Done', bar: 'bg-[#36B37E]' },
] as const;

const CARD = 'rounded-[3px] border border-[#DFE1E6] bg-white';
const CARD_TITLE = 'border-b border-[#DFE1E6] px-4 py-3 text-[14px] font-semibold text-[#172B4D]';
const BTN_SUBTLE = 'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-[rgba(9,30,66,0.04)] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)]';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3">
    <dt className="pt-0.5 text-[12px] font-semibold text-[#5E6C84]">{label}</dt>
    <dd className="min-w-0 text-[14px] text-[#172B4D]">{children}</dd>
  </div>
);

/** Project summary in Jira's layout: key numbers, a status overview and workload, with details and team beside them. */
export const ProjectSummaryView: React.FC<ProjectSummaryViewProps> = ({ project, tasks, kpi, workload, canEdit, canManageTeam, onEdit, delivery, onDeliver }) => {
  const [box, width] = useContainerWidth<HTMLDivElement>();
  const wide = width >= 760;
  const mid = width >= 520;
  const total = tasks.length;
  const counts = STAGES.map((s) => ({ ...s, n: tasks.filter((t) => (t.stage ?? 'assigned') === s.stage).length }));
  const doneCount = counts.find((c) => c.stage === 'completed')?.n ?? 0;
  const donePct = total ? Math.round((doneCount / total) * 100) : 0;
  const status = STATUS_LOZENGE[project.project_status] ?? STATUS_LOZENGE.new;
  const overdue =
    Boolean(project.deadline) && !['delivered', 'cancelled'].includes(project.project_status) && new Date(project.deadline as string).getTime() < Date.now();
  const team = Array.from(new Map((project.members ?? []).map((m) => [m.employee_id, m])).values());

  return (
    <div ref={box} className="space-y-4">
      {/* Key numbers */}
      <div className={`grid gap-3 ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {[
          { icon: Clock, label: 'Estimated', value: `${kpi.estHours} hrs`, tone: '' },
          { icon: Clock, label: 'Logged', value: `${kpi.actHours} hrs`, tone: 'text-[#006644]' },
          { icon: CalendarDays, label: 'Start date', value: kpi.startDate, tone: '' },
          { icon: CalendarDays, label: 'Deadline', value: kpi.deadline, tone: overdue ? 'text-[#BF2600]' : '' },
        ].map((k) => (
          <div key={k.label} className={`${CARD} p-3.5`}>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5E6C84]">
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </p>
            <p className={`mt-1 text-[20px] font-medium leading-7 text-[#172B4D] ${k.tone}`}>{k.value}</p>
            {k.label === 'Deadline' && overdue && <p className="text-[12px] font-semibold text-[#BF2600]">Overdue</p>}
          </div>
        ))}
      </div>

      <div className={`grid gap-4 ${wide ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <div className="min-w-0 space-y-4">
          {/* Delivery */}
          {project.project_status !== 'cancelled' && (project.project_status === 'delivered' || delivery) && (
            <section className={CARD} aria-label="Delivery">
              <h3 className={`${CARD_TITLE} flex items-center justify-between`}>
                Delivery
                {project.project_status !== 'delivered' && onDeliver && (
                  <button type="button" onClick={onDeliver} className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-2.5 text-[13px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)]">
                    <Rocket className="h-3.5 w-3.5" /> Deliver project
                  </button>
                )}
              </h3>
              <div className="space-y-3 p-4">
                {project.project_status === 'delivered' ? (
                  <p className="flex items-center gap-2 rounded-[3px] bg-[#E3FCEF] px-3 py-2.5 text-[14px] text-[#006644] shadow-[inset_3px_0_0_#36B37E]">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    Delivered{project.actual_end_date ? ` on ${new Date(project.actual_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                ) : (
                  delivery && (
                    <>
                      <ul className="divide-y divide-[#DFE1E6] rounded-[3px] border border-[#DFE1E6]">
                        {delivery.checks.map((c) => (
                          <li key={c.key} className="flex items-center gap-3 px-3 py-2">
                            {c.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#36B37E]" /> : <Circle className="h-5 w-5 shrink-0 text-[#DE350B]" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] text-[#172B4D]">{c.label}</p>
                              <p className={`text-[12px] ${c.done ? 'text-[#5E6C84]' : 'font-medium text-[#BF2600]'}`}>{c.detail}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[13px] text-[#5E6C84]">
                        {delivery.ready ? 'Ready: nothing is left open.' : 'Not ready yet.'}
                        {delivery.counts.overdueIssues > 0 && <span className="ml-1.5 font-medium text-[#BF2600]">{delivery.counts.overdueIssues} overdue issue{delivery.counts.overdueIssues === 1 ? '' : 's'}.</span>}
                      </p>
                    </>
                  )
                )}
              </div>
            </section>
          )}

          {/* Status overview */}
          <section className={CARD} aria-label="Status overview">
            <h3 className={CARD_TITLE}>Status overview</h3>
            <div className="space-y-4 p-4">
              {total === 0 ? (
                <p className="rounded-[3px] bg-[#F4F5F7] px-3 py-6 text-center text-[13px] text-[#5E6C84]">No issues yet. Create one from the board to see progress here.</p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[14px] text-[#42526E]"><b className="text-[20px] font-medium text-[#172B4D]">{total}</b> issue{total === 1 ? '' : 's'}</p>
                    <p className="text-[14px] text-[#42526E]"><b className="font-semibold text-[#172B4D]">{donePct}%</b> done</p>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-[#DFE1E6]" role="img" aria-label={counts.map((c) => `${c.label} ${c.n}`).join(', ')}>
                    {counts.filter((c) => c.n > 0).map((c) => (
                      <span key={c.stage} className={`${c.bar} transition-all`} style={{ width: `${(c.n / total) * 100}%` }} title={`${c.label}: ${c.n}`} />
                    ))}
                  </div>
                  <ul className={`grid gap-x-6 gap-y-2 ${mid ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {counts.map((c) => (
                      <li key={c.stage} className="flex items-center gap-2 text-[14px]">
                        <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${c.bar}`} />
                        <span className="text-[#42526E]">{c.label}</span>
                        <span className="ml-auto font-semibold tabular-nums text-[#172B4D]">{c.n}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          {/* Workload */}
          <section className={CARD} aria-label="Workload">
            <h3 className={`${CARD_TITLE} flex items-center justify-between`}>
              Workload
              <span className="rounded-full bg-[#DFE1E6] px-2 py-0.5 text-[12px] font-semibold text-[#42526E]">{workload.length} {workload.length === 1 ? 'member' : 'members'}</span>
            </h3>
            {workload.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#5E6C84]">No team members yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="border-b-2 border-[#DFE1E6] text-[12px] font-semibold text-[#5E6C84]">
                      <th className="px-4 py-2">Member</th>
                      <th className="px-3 py-2 text-center">Issues</th>
                      <th className="px-3 py-2 text-center">Done</th>
                      <th className="px-3 py-2 text-center">Logged</th>
                      <th className="px-4 py-2 text-right">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workload.map((w) => (
                      <tr key={w.emp_id} className="border-b border-[#DFE1E6] last:border-b-0 hover:bg-[#F4F5F7]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <JiraAvatar name={w.name} id={w.emp_id} size={28} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[#172B4D]">{w.name}</p>
                              <p className="truncate text-[12px] capitalize text-[#5E6C84]">{w.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{w.totalTasks}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-[#006644]">{w.completedTasks}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-[#42526E]">{w.actHours}h</td>
                        <td className="px-4 py-2.5">
                          <div className="ml-auto flex w-36 items-center justify-end gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#DFE1E6]">
                              <span className={`block h-full rounded-full ${w.completionRate === 100 ? 'bg-[#36B37E]' : 'bg-[color:var(--ac-main,#0052CC)]'}`} style={{ width: `${w.completionRate}%` }} />
                            </span>
                            <span className="w-9 text-right text-[12px] font-semibold tabular-nums text-[#42526E]">{w.completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Details */}
          <section className={CARD} aria-label="Project details">
            <h3 className={`${CARD_TITLE} flex items-center justify-between`}>
              Details
              {canEdit && (
                <button type="button" onClick={onEdit} className={`${BTN_SUBTLE} !h-7 !px-2.5 !text-[13px]`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </h3>
            <dl className="space-y-3.5 p-4">
              <Row label="Key">{project.project_no}</Row>
              <Row label="Status"><span className={`inline-block rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase ${status.cls}`}>{status.label}</span></Row>
              <Row label="Type"><span className="capitalize">{project.project_type.replace(/_/g, ' ')}</span></Row>
              <Row label="Category"><span className="capitalize">{project.category.replace(/_/g, ' ')}</span></Row>
              <Row label="Client">{project.client_name || 'Internal'}</Row>
              <Row label="Lead">
                {project.project_manager_name ? (
                  <span className="flex items-center gap-2"><JiraAvatar name={project.project_manager_name} id={project.project_manager_id ?? 0} size={24} />{project.project_manager_name}</span>
                ) : <span className="text-[#7A869A]">Unassigned</span>}
              </Row>
              <Row label="Description">
                {project.description ? <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words leading-6">{project.description}</p> : <span className="text-[#7A869A]">No description yet.</span>}
              </Row>
            </dl>
          </section>

          {/* Team */}
          <section className={CARD} aria-label="Team">
            <h3 className={`${CARD_TITLE} flex items-center justify-between`}>
              Team
              {canManageTeam && (
                <button type="button" onClick={onEdit} className={`${BTN_SUBTLE} !h-7 !px-2.5 !text-[13px]`}>
                  <Users className="h-3.5 w-3.5" /> Manage
                </button>
              )}
            </h3>
            {team.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[#5E6C84]">No team members yet.</p>
            ) : (
              <ul className="divide-y divide-[#DFE1E6]">
                {team.map((m) => (
                  <li key={m.employee_id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <JiraAvatar name={m.name} id={m.employee_id} src={m.profile_picture} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-[#172B4D]">
                        {m.name}
                        {m.employee_id === project.project_manager_id && <span className="rounded-[3px] bg-[#EAE6FF] px-1 py-px text-[11px] font-bold uppercase text-[#403294]">Lead</span>}
                      </p>
                      <p className="truncate text-[12px] text-[#5E6C84]">{m.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
