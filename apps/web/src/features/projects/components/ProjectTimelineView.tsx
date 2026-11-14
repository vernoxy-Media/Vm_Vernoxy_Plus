import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, CalendarDays, Check, ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import type { ProjectBugItem, ProjectItem, ProjectTaskItem, SprintItem } from '../types';

/* ─────────────────────────── Date helpers (whole days) ─────────────────────────── */

const DAY = 86_400_000;

/** Day number of a YYYY-MM-DD date (or the date part of an ISO time), so a timezone never moves a date. */
const dayOf = (iso?: string | null): number | null => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY) : null;
};
const todayDay = () => {
  const n = new Date();
  return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / DAY);
};
const fmt = (d: number, year = false) =>
  new Date(d * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });

/* ───────────────────────── Project dates, for the header ───────────────────────── */

/** "6 Nov 2026 – 30 Nov 2026 · 24 days left": the project's dates and where it stands against them. */
export const ProjectDateRange: React.FC<{ project: ProjectItem }> = ({ project }) => {
  const start = dayOf(project.start_date);
  const end = dayOf(project.deadline);
  const delivered = project.project_status === 'delivered';
  const cancelled = project.project_status === 'cancelled';
  const left = end !== null ? end - todayDay() : null;

  let pill: { text: string; cls: string } | null = null;
  if (delivered) {
    const at = dayOf(project.actual_end_date);
    pill = { text: at !== null ? `Delivered ${fmt(at, true)}` : 'Delivered', cls: 'bg-[#E3FCEF] text-[#006644]' };
  } else if (!cancelled && left !== null) {
    pill =
      left < 0
        ? { text: `${-left} day${left === -1 ? '' : 's'} overdue`, cls: 'bg-[#FFEBE6] text-[#BF2600]' }
        : left === 0
          ? { text: 'Due today', cls: 'bg-[#FFF0B3] text-[#172B4D]' }
          : { text: `${left} day${left === 1 ? '' : 's'} left`, cls: left <= 7 ? 'bg-[#FFF0B3] text-[#172B4D]' : 'bg-[rgba(9,30,66,0.08)] text-[#42526E]' };
  }

  if (start === null && end === null) return <p className="mt-1 text-[13px] text-[#7A869A]">No dates set</p>;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-[#42526E]">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4 text-[#5E6C84]" />
        {start !== null ? fmt(start, true) : '—'} <span className="text-[#97A0AF]">→</span> {end !== null ? fmt(end, true) : '—'}
      </span>
      {pill && <span className={`rounded-[3px] px-1.5 py-px text-[12px] font-semibold ${pill.cls}`}>{pill.text}</span>}
    </p>
  );
};

/* ─────────────────────────────────── Timeline ─────────────────────────────────── */

const STAGE_BAR: Record<string, string> = {
  assigned: 'bg-[#97A0AF]',
  in_progress: 'bg-[color:var(--ac-main,#0052CC)]',
  hold: 'bg-[#FF991F]',
  requested: 'bg-[#6554C0]',
  completed: 'bg-[#36B37E]',
};
const STAGE_LABEL: Record<string, string> = { assigned: 'To Do', in_progress: 'In Progress', hold: 'On Hold', requested: 'In Review', completed: 'Done' };
const SPRINT_BAR: Record<string, string> = { planned: 'bg-[#B3BAC5]', active: 'bg-[color:var(--ac-400,#4C9AFF)]', completed: 'bg-[#79F2C0]' };

const SCALES = { day: 28, week: 12, month: 4 } as const;
type Scale = keyof typeof SCALES;
const LABEL_W = 'w-44 sm:w-60';
const ROW_H = 40;

interface Bar {
  start: number;
  end: number;
}

interface ProjectTimelineViewProps {
  project: ProjectItem;
  sprints: SprintItem[];
  tasks: ProjectTaskItem[];
  bugs?: ProjectBugItem[];
  onOpenIssue: (taskId: number) => void;
  onOpenBug?: (bugId: number) => void;
}

/**
 * Jira's Timeline: the project, its sprints and their issues as bars on one calendar.
 * A sprint's issues sit under it, and an issue's bar runs from its sprint's start to its due date.
 */
export const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({ project, sprints, tasks, bugs = [], onOpenIssue, onOpenBug }) => {
  const today = todayDay();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<Scale | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const projectBar: Bar | null = useMemo(() => {
    const s = dayOf(project.start_date);
    const e = dayOf(project.deadline);
    return s !== null && e !== null ? { start: Math.min(s, e), end: Math.max(s, e) } : null;
  }, [project.start_date, project.deadline]);

  const sprintBar = (s: SprintItem): Bar | null => {
    const a = dayOf(s.start_date);
    const b = dayOf(s.end_date);
    return a !== null && b !== null ? { start: Math.min(a, b), end: Math.max(a, b) } : null;
  };

  /** An issue runs from its own start date (else its sprint's start, else the day it was created) to its due date (else its sprint's end). */
  const issueBar = (t: ProjectTaskItem, sprint?: SprintItem): Bar | null => {
    const sb = sprint ? sprintBar(sprint) : null;
    const own = dayOf(t.start_date);
    const end = dayOf(t.due_date) ?? sb?.end ?? own;
    if (end === null) return null;
    const start = own ?? sb?.start ?? dayOf(t.created_at) ?? end;
    return { start: Math.min(start, end), end };
  };

  /** A bug runs from its start date (else the day it was reported) to its due date. */
  const bugBar = (b: ProjectBugItem): Bar | null => {
    const st = dayOf(b.start_date);
    const due = dayOf(b.due_date);
    if (st === null && due === null) return null;
    const start = st ?? dayOf(b.created_at) ?? due!;
    const end = due ?? st!;
    return { start: Math.min(start, end), end: Math.max(start, end) };
  };

  const groups = useMemo(() => {
    const top = tasks.filter((t) => !t.parent_task_id);
    const sorted = [...sprints].sort((a, b) => (dayOf(a.start_date) ?? 0) - (dayOf(b.start_date) ?? 0));
    const out = sorted.map((s) => ({ key: String(s.sprint_id), sprint: s as SprintItem | undefined, issues: top.filter((t) => t.sprint_id === s.sprint_id) }));
    const loose = top.filter((t) => !t.sprint_id || !sprints.some((s) => s.sprint_id === t.sprint_id));
    if (loose.length) out.push({ key: 'backlog', sprint: undefined, issues: loose });
    return out;
  }, [sprints, tasks]);

  /* The calendar covers every date on show, with a little room on both sides */
  const { min, max } = useMemo(() => {
    const days: number[] = [];
    if (projectBar) days.push(projectBar.start, projectBar.end);
    sprints.forEach((s) => { const b = sprintBar(s); if (b) days.push(b.start, b.end); });
    groups.forEach((g) => g.issues.forEach((t) => { const b = issueBar(t, g.sprint); if (b) days.push(b.start, b.end); }));
    bugs.forEach((b) => { const x = bugBar(b); if (x) days.push(x.start, x.end); });
    if (!days.length) return { min: today - 7, max: today + 21 };
    let lo = Math.min(...days, today);
    let hi = Math.max(...days, today);
    if (hi - lo < 21) hi = lo + 21;
    return { min: lo - 2, max: hi + 3 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBar, sprints, groups, bugs, today]);

  const total = max - min + 1;
  const scale: Scale = chosen ?? (total <= 45 ? 'day' : total <= 150 ? 'week' : 'month');
  const px = SCALES[scale];
  const width = total * px;
  const x = (d: number) => (d - min) * px;

  const hasAnyDate = projectBar !== null || sprints.some((s) => sprintBar(s)) || groups.some((g) => g.issues.some((t) => issueBar(t, g.sprint))) || bugs.some((b) => bugBar(b));

  const goToday = () => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.max(0, x(today) - el.clientWidth / 3), behavior: 'smooth' });
  };
  // Start at the first date, so the project's beginning is in view; only jump to today when it is far off screen
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const tx = x(today);
    el.scrollLeft = tx > el.clientWidth * 0.7 ? Math.max(0, tx - el.clientWidth / 3) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, min]);

  /* Month bands and day / week ticks for the header */
  const months = useMemo(() => {
    const out: Array<{ label: string; from: number; to: number }> = [];
    for (let d = min; d <= max; d++) {
      const dt = new Date(d * DAY);
      const label = dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const last = out[out.length - 1];
      if (last && last.label === label) last.to = d;
      else out.push({ label, from: d, to: d });
    }
    return out;
  }, [min, max]);

  const ticks = useMemo(() => {
    const out: Array<{ d: number; text: string; weekend: boolean }> = [];
    for (let d = min; d <= max; d++) {
      const dow = new Date(d * DAY).getUTCDay();
      if (scale === 'day') out.push({ d, text: String(new Date(d * DAY).getUTCDate()), weekend: dow === 0 || dow === 6 });
      else if (scale === 'week' && dow === 1) out.push({ d, text: String(new Date(d * DAY).getUTCDate()), weekend: false });
    }
    return out;
  }, [min, max, scale]);

  const grid: React.CSSProperties = {
    width,
    backgroundImage: scale === 'month' ? undefined : `linear-gradient(to right, #EBECF0 1px, transparent 1px)`,
    backgroundSize: scale === 'day' ? `${px}px 100%` : `${px * 7}px 100%`,
    backgroundPosition: scale === 'day' ? '0 0' : `${((8 - (new Date(min * DAY).getUTCDay() || 7)) % 7) * px}px 0`,
  };

  const todayLine = today >= min && today <= max && (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-[#DE350B]" style={{ left: x(today) + px / 2 }} />
  );

  const Cell: React.FC<{ children?: React.ReactNode; h?: number }> = ({ children, h = ROW_H }) => (
    <div className="relative" style={{ ...grid, height: h }}>
      {todayLine}
      {children}
    </div>
  );

  const BarEl: React.FC<{ bar: Bar; color: string; label?: string; title: string; progress?: number; overdue?: boolean; onClick?: () => void }> = ({ bar, color, label, title, progress, overdue, onClick }) => {
    const w = (bar.end - bar.start + 1) * px;
    const common = {
      title,
      className: `absolute top-1/2 z-[2] flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-[3px] px-2 text-left text-[12px] font-medium ${color} ${overdue ? 'ring-2 ring-[#DE350B]/50' : ''} ${onClick ? 'cursor-pointer hover:brightness-95' : ''}`,
      style: { left: x(bar.start), width: Math.max(w, 10) } as React.CSSProperties,
    };
    const inner = (
      <>
        {progress !== undefined && progress > 0 && <span aria-hidden className="absolute inset-y-0 left-0 bg-black/15" style={{ width: `${progress}%` }} />}
        {w > 70 && <span className={`relative truncate ${color.includes('#79F2C0') || color.includes('#B3BAC5') ? 'text-[#172B4D]' : 'text-white'}`}>{label}</span>}
      </>
    );
    const el = onClick ? <button type="button" onClick={onClick} {...common}>{inner}</button> : <div {...common}>{inner}</div>;
    // A bar too short to hold its name gets the name beside it
    return (
      <>
        {el}
        {w <= 70 && label && (
          <span className="pointer-events-none absolute top-1/2 z-[2] -translate-y-1/2 truncate text-[12px] font-medium text-[#42526E]" style={{ left: x(bar.start) + Math.max(w, 10) + 6, maxWidth: 240 }}>
            {label}
          </span>
        )}
      </>
    );
  };

  if (!hasAnyDate) {
    return (
      <div className="rounded-[3px] bg-[#F4F5F7] px-4 py-14 text-center">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-[#97A0AF]" />
        <h4 className="text-[16px] font-medium text-[#172B4D]">Nothing to plan on a calendar yet</h4>
        <p className="mx-auto mt-1 max-w-sm text-[14px] text-[#5E6C84]">Give the project a start and end date, and create sprints with dates, to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[20px] font-medium text-[#172B4D]">Timeline</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToday} className="h-8 cursor-pointer rounded-[3px] bg-[rgba(9,30,66,0.04)] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)]">Today</button>
          <div role="tablist" aria-label="Timeline scale" className="inline-flex rounded-[3px] bg-[rgba(9,30,66,0.04)] p-0.5">
            {(['day', 'week', 'month'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                role="tab"
                aria-selected={scale === sc}
                onClick={() => setChosen(sc)}
                className={`h-7 cursor-pointer rounded-[3px] px-3 text-[13px] font-medium capitalize transition ${scale === sc ? 'bg-white text-[color:var(--ac-main,#0052CC)] shadow-[0_1px_1px_rgba(9,30,66,0.25)]' : 'text-[#42526E] hover:text-[#172B4D]'}`}
              >
                {sc === 'day' ? 'Days' : sc === 'week' ? 'Weeks' : 'Months'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[3px] border border-[#DFE1E6] bg-white">
        <div ref={scroller} className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header: months and days */}
            <div className="flex border-b border-[#DFE1E6] bg-[#FAFBFC]">
              <div className={`sticky left-0 z-10 flex shrink-0 items-end border-r border-[#DFE1E6] bg-[#FAFBFC] px-3 py-2 text-[12px] font-semibold text-[#5E6C84] ${LABEL_W}`}>Work</div>
              <div className="relative" style={{ width, height: 52 }}>
                {months.map((m) => (
                  <div key={m.label + m.from} className="absolute top-0 flex h-6 items-center overflow-hidden whitespace-nowrap border-l border-[#DFE1E6] px-2 text-[12px] font-semibold text-[#42526E]" style={{ left: x(m.from), width: (m.to - m.from + 1) * px }}>
                    {(m.to - m.from + 1) * px > 70 ? m.label : ''}
                  </div>
                ))}
                {ticks.map((t) => (
                  <span key={t.d} className={`absolute top-7 flex h-5 items-center justify-center text-[11px] ${t.weekend ? 'text-[#97A0AF]' : 'text-[#5E6C84]'} ${t.d === today ? 'rounded-full bg-[#DE350B] font-bold !text-white' : ''}`} style={{ left: x(t.d), width: scale === 'day' ? px : px * 3, ...(t.d === today && scale === 'day' ? { left: x(t.d) + 2, width: px - 4 } : {}) }}>
                    {t.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Project */}
            <div className="flex border-b border-[#DFE1E6]">
              <div className={`sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-[#DFE1E6] bg-white px-3 ${LABEL_W}`} style={{ height: ROW_H }}>
                <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-[color:var(--ac-main,#0052CC)] text-[11px] font-bold text-white">{(project.project_name.trim()[0] || 'P').toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#172B4D]" title={project.project_name}>{project.project_name}</span>
              </div>
              <Cell>
                {projectBar ? (
                  <BarEl bar={projectBar} color="bg-[color:var(--ac-main,#0052CC)]" label={`${fmt(projectBar.start)} – ${fmt(projectBar.end)}`} title={`Project: ${fmt(projectBar.start, true)} – ${fmt(projectBar.end, true)}`} />
                ) : (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#7A869A]">No project dates</span>
                )}
              </Cell>
            </div>

            {/* Sprints and their issues */}
            {groups.map((g) => {
              const shut = collapsed.has(g.key);
              const sb = g.sprint ? sprintBar(g.sprint) : null;
              const done = g.issues.filter((t) => t.stage === 'completed').length;
              const pct = g.issues.length ? Math.round((done / g.issues.length) * 100) : 0;
              return (
                <React.Fragment key={g.key}>
                  <div className="flex border-b border-[#DFE1E6] bg-[#FAFBFC]">
                    <button
                      type="button"
                      aria-expanded={!shut}
                      onClick={() => setCollapsed((cur) => { const n = new Set(cur); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}
                      className={`sticky left-0 z-10 flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-[#DFE1E6] bg-[#FAFBFC] px-2.5 text-left hover:bg-[#F4F5F7] ${LABEL_W}`}
                      style={{ height: ROW_H }}
                    >
                      {shut ? <ChevronRight className="h-4 w-4 shrink-0 text-[#42526E]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#42526E]" />}
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#172B4D]">{g.sprint ? g.sprint.sprint_name : 'Backlog'}</span>
                      <span className="shrink-0 text-[12px] text-[#5E6C84]">{g.issues.length}</span>
                    </button>
                    <Cell>
                      {sb && g.sprint ? (
                        <BarEl bar={sb} color={SPRINT_BAR[g.sprint.status] ?? SPRINT_BAR.planned} progress={pct} label={`${g.sprint.sprint_name} · ${fmt(sb.start)} – ${fmt(sb.end)}`} title={`${g.sprint.sprint_name} (${g.sprint.status}): ${fmt(sb.start, true)} – ${fmt(sb.end, true)} · ${done} of ${g.issues.length} done`} />
                      ) : (
                        !g.sprint && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#7A869A]">Issues with a due date are shown below</span>
                      )}
                    </Cell>
                  </div>

                  {!shut && g.issues.length === 0 && (
                    <div className="flex border-b border-[#DFE1E6]">
                      <div className={`sticky left-0 z-10 shrink-0 border-r border-[#DFE1E6] bg-white px-3 py-2.5 pl-9 text-[12px] text-[#7A869A] ${LABEL_W}`}>No issues</div>
                      <Cell h={36} />
                    </div>
                  )}

                  {!shut &&
                    g.issues.map((t) => {
                      const bar = issueBar(t, g.sprint);
                      const overdue = Boolean(bar) && t.stage !== 'completed' && bar!.end < today;
                      return (
                        <div key={t.task_id} className="flex border-b border-[#DFE1E6] last:border-b-0 hover:bg-[#F4F5F7]/60">
                          <button
                            type="button"
                            onClick={() => onOpenIssue(t.task_id)}
                            className={`sticky left-0 z-10 flex shrink-0 cursor-pointer items-center gap-2 border-r border-[#DFE1E6] bg-white py-0 pl-8 pr-3 text-left hover:bg-[#F4F5F7] ${LABEL_W}`}
                            style={{ height: ROW_H }}
                            title={`${t.task_code} · ${t.title}`}
                          >
                            <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#4BADE8] text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>
                            <span className={`min-w-0 flex-1 truncate text-[13px] text-[#172B4D] ${t.stage === 'completed' ? 'line-through opacity-70' : ''}`}>{t.title}</span>
                          </button>
                          <Cell>
                            {bar ? (
                              <BarEl
                                bar={bar}
                                color={STAGE_BAR[t.stage ?? 'assigned'] ?? STAGE_BAR.assigned}
                                label={t.title}
                                overdue={overdue}
                                title={`${t.task_code} · ${t.title}\n${STAGE_LABEL[t.stage ?? 'assigned'] ?? t.stage} · ${fmt(bar.start)} – ${fmt(bar.end, true)}${overdue ? ' · overdue' : ''}`}
                                onClick={() => onOpenIssue(t.task_id)}
                              />
                            ) : (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#7A869A]">No due date</span>
                            )}
                          </Cell>
                        </div>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {/* Bugs */}
            {bugs.length > 0 && (
              <>
                <div className="flex border-b border-[#DFE1E6] bg-[#FAFBFC]">
                  <button
                    type="button"
                    aria-expanded={!collapsed.has('bugs')}
                    onClick={() => setCollapsed((cur) => { const n = new Set(cur); if (n.has('bugs')) n.delete('bugs'); else n.add('bugs'); return n; })}
                    className={`sticky left-0 z-10 flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-[#DFE1E6] bg-[#FAFBFC] px-2.5 text-left hover:bg-[#F4F5F7] ${LABEL_W}`}
                    style={{ height: ROW_H }}
                  >
                    {collapsed.has('bugs') ? <ChevronRight className="h-4 w-4 shrink-0 text-[#42526E]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#42526E]" />}
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#172B4D]">Bugs</span>
                    <span className="shrink-0 text-[12px] text-[#5E6C84]">{bugs.length}</span>
                  </button>
                  <Cell />
                </div>
                {!collapsed.has('bugs') &&
                  bugs.map((b) => {
                    const bar = bugBar(b);
                    const finished = b.status === 'done' || b.status === 'not_a_bug';
                    const overdue = Boolean(bar) && !finished && bar!.end < today;
                    return (
                      <div key={b.bug_id} className="flex border-b border-[#DFE1E6] last:border-b-0 hover:bg-[#F4F5F7]/60">
                        <button
                          type="button"
                          onClick={() => onOpenBug?.(b.bug_id)}
                          className={`sticky left-0 z-10 flex shrink-0 cursor-pointer items-center gap-2 border-r border-[#DFE1E6] bg-white py-0 pl-8 pr-3 text-left hover:bg-[#F4F5F7] ${LABEL_W}`}
                          style={{ height: ROW_H }}
                          title={`${b.bug_code} · ${b.title}`}
                        >
                          <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#E5493A] text-white"><Bug className="h-2.5 w-2.5" strokeWidth={3} /></span>
                          <span className={`min-w-0 flex-1 truncate text-[13px] text-[#172B4D] ${finished ? 'line-through opacity-70' : ''}`}>{b.title}</span>
                        </button>
                        <Cell>
                          {bar ? (
                            <BarEl
                              bar={bar}
                              color={finished ? 'bg-[#36B37E]' : 'bg-[#E5493A]'}
                              label={b.title}
                              overdue={overdue}
                              title={`${b.bug_code} · ${b.title}\n${fmt(bar.start)} – ${fmt(bar.end, true)}${overdue ? ' · overdue' : ''}`}
                              onClick={onOpenBug ? () => onOpenBug(b.bug_id) : undefined}
                            />
                          ) : (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#7A869A]">No dates</span>
                          )}
                        </Cell>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#5E6C84]">
        <li className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-4 rounded-[2px] bg-[color:var(--ac-main,#0052CC)]" />Project</li>
        {bugs.length > 0 && <li className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-4 rounded-[2px] bg-[#E5493A]" />Bug</li>}
        {Object.entries(STAGE_LABEL).map(([k, label]) => (
          <li key={k} className="inline-flex items-center gap-1.5"><span aria-hidden className={`h-2.5 w-4 rounded-[2px] ${STAGE_BAR[k]}`} />{label}</li>
        ))}
        <li className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-px bg-[#DE350B]" />Today</li>
        <li className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-4 rounded-[2px] ring-2 ring-[#DE350B]/50" />Overdue</li>
      </ul>
    </div>
  );
};
