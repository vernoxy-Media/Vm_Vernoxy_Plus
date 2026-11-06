import React, { useMemo, useState } from 'react';
import { Bug, ChevronDown, ChevronRight, Clock, Download, GitBranch, Check } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import type { ProjectBugItem, ProjectTaskItem, SprintItem } from '../types';

/* ─────────────────────────────── helpers ─────────────────────────────── */

/** 1h 05m: hours and minutes, never a fraction. */
const dur = (sec: number) => {
  const total = Math.max(0, Math.round(sec / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

const STAGE: Record<string, { label: string; cls: string }> = {
  assigned: { label: 'To Do', cls: 'bg-[#DFE1E6] text-[#42526E]' },
  in_progress: { label: 'In Progress', cls: 'bg-[#DEEBFF] text-[#0747A6]' },
  hold: { label: 'On Hold', cls: 'bg-[#FFF0B3] text-[#172B4D]' },
  requested: { label: 'In Review', cls: 'bg-[#EAE6FF] text-[#403294]' },
  completed: { label: 'Done', cls: 'bg-[#E3FCEF] text-[#006644]' },
};

const CARD = 'rounded-[3px] border border-[#DFE1E6] bg-white';
const CARD_TITLE = 'flex items-center justify-between gap-2 border-b border-[#DFE1E6] px-4 py-3 text-[14px] font-semibold text-[#172B4D]';

/** Logged against estimate: blue while within it, red once over. */
const Bar: React.FC<{ logged: number; estimate: number }> = ({ logged, estimate }) => {
  const over = estimate > 0 && logged > estimate;
  const pct = estimate > 0 ? Math.min(100, Math.round((logged / estimate) * 100)) : logged > 0 ? 100 : 0;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[#DFE1E6]" role="img" aria-label={`${pct}% of the estimate`}>
      <span className={`block h-full rounded-full ${over ? 'bg-[#DE350B]' : 'bg-[color:var(--ac-main,#0052CC)]'}`} style={{ width: `${pct}%` }} />
    </span>
  );
};

const Variance: React.FC<{ logged: number; estimate: number }> = ({ logged, estimate }) => {
  if (!estimate) return <span className="text-[#7A869A]">—</span>;
  const diff = logged - estimate;
  if (Math.abs(diff) < 60) return <span className="text-[#42526E]">On estimate</span>;
  return diff > 0 ? <span className="font-medium text-[#BF2600]">+{dur(diff)} over</span> : <span className="text-[#006644]">{dur(-diff)} left</span>;
};

/* ───────────────────────────────── view ───────────────────────────────── */

interface ProjectTimeReportProps {
  projectName: string;
  sprints: SprintItem[];
  tasks: ProjectTaskItem[];
  bugs: ProjectBugItem[];
  onOpenIssue: (taskId: number) => void;
}

/**
 * The admin's time log for a project, from the first task to delivery: what was estimated, what was logged,
 * by whom, in which sprint and on which issue. Every number comes from the work logs of the tasks.
 */
export const ProjectTimeReport: React.FC<ProjectTimeReportProps> = ({ projectName, sprints, tasks, bugs, onOpenIssue }) => {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const model = useMemo(() => {
    const roots = tasks.filter((t) => !t.parent_task_id);
    const kids = new Map<number, ProjectTaskItem[]>();
    tasks.forEach((t) => {
      if (t.parent_task_id) kids.set(t.parent_task_id, [...(kids.get(t.parent_task_id) ?? []), t]);
    });
    const own = (t: ProjectTaskItem) => t.logged_seconds ?? 0;
    const rolled = (t: ProjectTaskItem) => own(t) + (kids.get(t.task_id) ?? []).reduce((n, k) => n + own(k), 0);
    const estimate = (t: ProjectTaskItem) => t.allocated_minutes ?? 0;

    const rows = roots.map((t) => ({ task: t, logged: rolled(t), estimate: estimate(t) * 60, children: kids.get(t.task_id) ?? [] }));
    const estimated = rows.reduce((n, r) => n + r.estimate, 0);
    const logged = rows.reduce((n, r) => n + r.logged, 0);

    const people = new Map<number, { id: number; name: string; seconds: number; issues: number }>();
    tasks.forEach((t) =>
      (t.time_by_employee ?? []).forEach((e) => {
        const p = people.get(e.employee_id) ?? { id: e.employee_id, name: e.employee_name, seconds: 0, issues: 0 };
        p.seconds += e.seconds;
        p.issues += 1;
        people.set(e.employee_id, p);
      }),
    );

    const bySprint = [
      ...sprints.map((s) => ({ key: String(s.sprint_id), name: s.sprint_name, status: s.status, rows: rows.filter((r) => r.task.sprint_id === s.sprint_id) })),
      { key: 'backlog', name: 'Backlog', status: '', rows: rows.filter((r) => !r.task.sprint_id || !sprints.some((s) => s.sprint_id === r.task.sprint_id)) },
    ]
      .filter((g) => g.rows.length > 0)
      .map((g) => ({
        ...g,
        issues: g.rows.length,
        done: g.rows.filter((r) => r.task.stage === 'completed').length,
        estimate: g.rows.reduce((n, r) => n + r.estimate, 0),
        logged: g.rows.reduce((n, r) => n + r.logged, 0),
      }));

    return {
      rows: [...rows].sort((a, b) => b.logged - a.logged),
      estimated,
      logged,
      people: [...people.values()].sort((a, b) => b.seconds - a.seconds),
      bySprint,
      bugSeconds: bugs.reduce((n, b) => n + (b.total_time_minutes || 0) * 60, 0),
    };
  }, [tasks, bugs, sprints]);

  const topPerson = model.people[0]?.seconds || 0;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Key', 'Issue', 'Parent', 'Stage', 'Assignees', 'Estimate (min)', 'Logged (min)'].map(esc).join(',')];
    const add = (t: ProjectTaskItem, parent: string, logged: number) =>
      lines.push([t.task_code ?? '', t.title, parent, STAGE[t.stage ?? 'assigned']?.label ?? t.stage ?? '', (t.assignees ?? []).map((a) => a.name).join('; '), t.allocated_minutes ?? 0, Math.round(logged / 60)].map(esc).join(','));
    model.rows.forEach((r) => {
      add(r.task, '', r.logged);
      r.children.forEach((c) => add(c, r.task.task_code ?? '', c.logged_seconds ?? 0));
    });
    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName.replace(/[^\w-]+/g, '_')}_time_log.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const remaining = model.estimated - model.logged;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[20px] font-medium text-[#172B4D]">Time log</h3>
        <button type="button" onClick={exportCsv} disabled={model.rows.length === 0} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] bg-[rgba(9,30,66,0.04)] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Estimated', value: dur(model.estimated), tone: '' },
          { label: 'Logged', value: dur(model.logged), tone: 'text-[color:var(--ac-main,#0052CC)]' },
          { label: remaining < 0 ? 'Over the estimate' : 'Remaining', value: dur(Math.abs(remaining)), tone: remaining < 0 ? 'text-[#BF2600]' : 'text-[#006644]' },
          { label: 'Time on bugs', value: dur(model.bugSeconds), tone: '' },
        ].map((t) => (
          <div key={t.label} className={`${CARD} p-3.5`}>
            <p className="text-[12px] font-semibold text-[#5E6C84]">{t.label}</p>
            <p className={`mt-1 text-[20px] font-medium leading-7 tabular-nums ${t.tone || 'text-[#172B4D]'}`}>{t.value}</p>
          </div>
        ))}
      </div>
      <Bar logged={model.logged} estimate={model.estimated} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* By person */}
        <section className={CARD} aria-label="Time by person">
          <h4 className={CARD_TITLE}>Time by person <span className="text-[12px] font-normal text-[#5E6C84]">{model.people.length}</span></h4>
          {model.people.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#5E6C84]">Nobody has logged time yet.</p>
          ) : (
            <ul className="divide-y divide-[#DFE1E6]">
              {model.people.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <JiraAvatar name={p.name} id={p.id} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-[#172B4D]">{p.name}</p>
                    <p className="text-[12px] text-[#5E6C84]">{p.issues} issue{p.issues === 1 ? '' : 's'}</p>
                  </div>
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-[#DFE1E6] sm:block">
                    <span className="block h-full rounded-full bg-[color:var(--ac-main,#0052CC)]" style={{ width: `${topPerson ? Math.max(4, Math.round((p.seconds / topPerson) * 100)) : 0}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right text-[14px] font-medium tabular-nums text-[#172B4D]">{dur(p.seconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* By sprint */}
        <section className={CARD} aria-label="Time by sprint">
          <h4 className={CARD_TITLE}>Time by sprint</h4>
          {model.bySprint.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#5E6C84]">No issues yet.</p>
          ) : (
            <ul className="divide-y divide-[#DFE1E6]">
              {model.bySprint.map((g) => (
                <li key={g.key} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[14px] font-medium text-[#172B4D]">{g.name}</p>
                    <p className="shrink-0 text-[13px] tabular-nums text-[#42526E]"><b className="font-semibold text-[#172B4D]">{dur(g.logged)}</b> / {dur(g.estimate)}</p>
                  </div>
                  <div className="mt-1.5"><Bar logged={g.logged} estimate={g.estimate} /></div>
                  <p className="mt-1 text-[12px] text-[#5E6C84]">{g.done} of {g.issues} issue{g.issues === 1 ? '' : 's'} done · <Variance logged={g.logged} estimate={g.estimate} /></p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* By issue */}
      <section className={CARD} aria-label="Time by issue">
        <h4 className={CARD_TITLE}>Time by issue <span className="text-[12px] font-normal text-[#5E6C84]">{model.rows.length}</span></h4>
        {model.rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[#5E6C84]">No issues yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b-2 border-[#DFE1E6] text-[12px] font-semibold text-[#5E6C84]">
                  <th className="px-4 py-2">Issue</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Assignee</th>
                  <th className="px-3 py-2 text-right">Estimate</th>
                  <th className="px-3 py-2 text-right">Logged</th>
                  <th className="w-44 px-4 py-2">Against estimate</th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map((r) => {
                  const t = r.task;
                  const isOpen = open.has(t.task_id);
                  const st = STAGE[t.stage ?? 'assigned'] ?? STAGE.assigned;
                  return (
                    <React.Fragment key={t.task_id}>
                      <tr className="border-b border-[#DFE1E6] hover:bg-[#F4F5F7]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {r.children.length > 0 ? (
                              <button type="button" aria-label={isOpen ? 'Hide sub-tasks' : 'Show sub-tasks'} onClick={() => setOpen((cur) => { const n = new Set(cur); if (n.has(t.task_id)) n.delete(t.task_id); else n.add(t.task_id); return n; })} className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            ) : <span className="w-5 shrink-0" />}
                            <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#4BADE8] text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>
                            <button type="button" onClick={() => onOpenIssue(t.task_id)} className="min-w-0 cursor-pointer text-left">
                              <span className="block max-w-[260px] truncate text-[#172B4D] hover:text-[color:var(--ac-main,#0052CC)] hover:underline">{t.title}</span>
                              <span className="block text-[12px] text-[#5E6C84]">{t.task_code}</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5"><span className={`rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase ${st.cls}`}>{st.label}</span></td>
                        <td className="px-3 py-2.5">
                          <div className="flex -space-x-1.5">
                            {(t.assignees ?? []).slice(0, 3).map((a) => <JiraAvatar key={a.emp_id} name={a.name} id={a.emp_id} src={a.profile_picture} size={24} ring />)}
                            {(t.assignees ?? []).length === 0 && <span className="text-[#7A869A]">—</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#42526E]">{r.estimate ? dur(r.estimate) : '—'}</td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-[#172B4D]">{dur(r.logged)}</td>
                        <td className="px-4 py-2.5">
                          <Bar logged={r.logged} estimate={r.estimate} />
                          <p className="mt-1 text-[12px]"><Variance logged={r.logged} estimate={r.estimate} /></p>
                        </td>
                      </tr>
                      {isOpen &&
                        r.children.map((c) => {
                          const cs = STAGE[c.stage ?? 'assigned'] ?? STAGE.assigned;
                          return (
                            <tr key={c.task_id} className="border-b border-[#DFE1E6] bg-[#FAFBFC]">
                              <td className="py-2 pl-14 pr-3">
                                <div className="flex items-center gap-2">
                                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-[#5E6C84]" />
                                  <button type="button" onClick={() => onOpenIssue(c.task_id)} className="min-w-0 cursor-pointer text-left">
                                    <span className="block max-w-[240px] truncate text-[13px] text-[#172B4D] hover:text-[color:var(--ac-main,#0052CC)] hover:underline">{c.title}</span>
                                    <span className="block text-[12px] text-[#5E6C84]">{c.task_code}</span>
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2"><span className={`rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase ${cs.cls}`}>{cs.label}</span></td>
                              <td className="px-3 py-2">
                                <div className="flex -space-x-1.5">{(c.assignees ?? []).slice(0, 3).map((a) => <JiraAvatar key={a.emp_id} name={a.name} id={a.emp_id} src={a.profile_picture} size={22} ring />)}</div>
                              </td>
                              <td className="px-3 py-2 text-right text-[13px] tabular-nums text-[#42526E]">{c.allocated_minutes ? dur(c.allocated_minutes * 60) : '—'}</td>
                              <td className="px-3 py-2 text-right text-[13px] font-medium tabular-nums text-[#172B4D]">{dur(c.logged_seconds ?? 0)}</td>
                              <td className="px-4 py-2"><Bar logged={c.logged_seconds ?? 0} estimate={(c.allocated_minutes ?? 0) * 60} /></td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[12px] text-[#5E6C84]">
        <Clock className="h-3.5 w-3.5" /> Time comes from the Start, Pause and Finish work logs of each issue.
        {bugs.length > 0 && <span className="inline-flex items-center gap-1"><Bug className="h-3.5 w-3.5" /> Bug time is the time spent in development and QA.</span>}
      </p>
    </div>
  );
};
