import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUp, Equal, Inbox, Loader2, Search, X } from 'lucide-react';
import { fetchMyBugs, type MyBugItem } from '@/features/projects/api/projects.api';
import { useAuth } from '@/features/auth/context/AuthContext';
import { EmployeeFilter, type FilterPerson } from '@/features/projects/components/EmployeeFilter';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import { TaskPageHeader, TaskStatStrip } from './TaskPageChrome';

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-[#FFEBE6] text-[#BF2600]' },
  open: { label: 'Open', cls: 'bg-[#FFEBE6] text-[#BF2600]' },
  ready_for_dev: { label: 'Ready for dev', cls: 'bg-[#FFF0B3] text-[#172B4D]' },
  dev_in_progress: { label: 'In dev', cls: 'bg-[#DEEBFF] text-[#0747A6]' },
  ready_for_qa: { label: 'Ready for QA', cls: 'bg-[#EAE6FF] text-[#403294]' },
  qa_in_progress: { label: 'In QA', cls: 'bg-[#EAE6FF] text-[#403294]' },
  done: { label: 'Done', cls: 'bg-[#E3FCEF] text-[#006644]' },
  not_a_bug: { label: 'Not a bug', cls: 'bg-[#DFE1E6] text-[#42526E]' },
};

const PRIORITY: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  critical: { label: 'Highest', icon: ChevronsUp, color: 'text-[#CD1317]' },
  high: { label: 'High', icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { label: 'Medium', icon: Equal, color: 'text-[#E97F33]' },
  low: { label: 'Low', icon: ChevronDown, color: 'text-[#2D8738]' },
};

const GROUPS = [
  { id: 'all', label: 'All', has: (s: string) => s !== '' },
  { id: 'open', label: 'Open', has: (s: string) => s === 'new' || s === 'open' },
  { id: 'dev', label: 'In dev', has: (s: string) => s === 'ready_for_dev' || s === 'dev_in_progress' },
  { id: 'qa', label: 'In QA', has: (s: string) => s === 'ready_for_qa' || s === 'qa_in_progress' },
  { id: 'done', label: 'Done', has: (s: string) => s === 'done' || s === 'not_a_bug' },
] as const;

const PAGE_SIZE = 10;
const CONTROL =
  'h-8 rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2 text-[14px] text-[#172B4D] transition-colors hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none';

const today = () => new Date().toISOString().slice(0, 10);
const niceDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Bugs from every project, as a Jira issue list. An employee sees theirs; an admin picks an employee or looks at everyone's. */
export const MyBugsView: React.FC<{ isAdmin?: boolean; people?: FilterPerson[] }> = ({ isAdmin = false, people = [] }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bugs, setBugs] = useState<MyBugItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<(typeof GROUPS)[number]['id']>('all');
  const [role, setRole] = useState<'any' | 'assigned' | 'reported'>('any');
  const [project, setProject] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [employee, setEmployee] = useState('all');

  useEffect(() => {
    let live = true;
    setError(null);
    setBugs(null);
    fetchMyBugs(isAdmin ? employee : undefined)
      .then((b) => live && setBugs(b))
      .catch(() => live && setError('Could not load the bugs.'));
    return () => {
      live = false;
    };
  }, [isAdmin, employee]);

  const projects = useMemo(() => {
    const m = new Map<number, string>();
    (bugs ?? []).forEach((b) => m.set(b.project_id, `${b.project_no ? `${b.project_no} · ` : ''}${b.project_name ?? 'Project'}`));
    return [...m.entries()];
  }, [bugs]);

  // Counts follow the project, search and role filters but not the status buttons, so every button shows what it would reveal
  const base = useMemo(() => {
    const me = user?.emp_id;
    const q = search.trim().toLowerCase();
    return (bugs ?? []).filter(
      (b) =>
        (project === 'all' || String(b.project_id) === project) &&
        (isAdmin || role === 'any' || (role === 'assigned' ? b.assigned_to === me : b.reported_by === me)) &&
        (!q || b.title.toLowerCase().includes(q) || b.bug_code.toLowerCase().includes(q)),
    );
  }, [bugs, project, role, search, isAdmin, user?.emp_id]);

  const counts = useMemo(() => Object.fromEntries(GROUPS.map((g) => [g.id, base.filter((b) => g.has(b.status)).length])) as Record<string, number>, [base]);
  const rows = useMemo(() => base.filter((b) => GROUPS.find((g) => g.id === group)!.has(b.status)), [base, group]);

  useEffect(() => setPage(1), [group, role, project, search, employee]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = group !== 'all' || role !== 'any' || project !== 'all' || search !== '';
  const clear = () => {
    setGroup('all');
    setRole('any');
    setProject('all');
    setSearch('');
  };

  return (
    <div className="space-y-4">
      <TaskPageHeader crumbs={['Tasks', 'Bugs']} title={isAdmin ? 'Bugs' : 'My bugs'} />

      <TaskStatStrip
        items={[
          { label: 'Bugs', value: counts.all, dot: 'bg-[#42526E]' },
          { label: 'Open', value: counts.open, dot: 'bg-[#DE350B]' },
          { label: 'In dev', value: counts.dev, dot: 'bg-[color:var(--ac-main,#0052CC)]' },
          { label: 'In QA', value: counts.qa, dot: 'bg-[#6554C0]' },
          { label: 'Done', value: counts.done, dot: 'bg-[#36B37E]' },
        ]}
      />

      {isAdmin && people.length > 0 && <EmployeeFilter people={people} value={employee} onChange={setEmployee} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6C84]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by key or summary" aria-label="Search bugs" className={`${CONTROL} w-full pl-7 placeholder:text-[#7A869A]`} />
        </div>
        <select value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project" className={`${CONTROL} max-w-[220px] truncate`}>
          <option value="all">All projects</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        {!isAdmin && (
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="My part" className={CONTROL}>
            <option value="any">Assigned or reported by me</option>
            <option value="assigned">Assigned to me</option>
            <option value="reported">Reported by me</option>
          </select>
        )}
        <div role="tablist" aria-label="Bug status" className="flex flex-wrap items-center gap-1">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              onClick={() => setGroup(g.id)}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-3 text-[14px] font-medium transition-colors ${group === g.id ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
            >
              {g.label}
              <span className={`rounded-full px-1.5 text-[11px] font-semibold ${group === g.id ? 'bg-white/70' : 'bg-[rgba(9,30,66,0.08)]'}`}>{counts[g.id]}</span>
            </button>
          ))}
        </div>
        {filtered && (
          <button type="button" onClick={clear} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[3px] px-2 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {error ? (
        <p className="rounded-[3px] bg-[#FFEBE6] p-3 text-[14px] text-[#BF2600]">{error}</p>
      ) : !bugs ? (
        <div className="flex h-48 items-center justify-center gap-2 rounded-[3px] border border-[#DFE1E6] bg-white text-[14px] text-[#5E6C84]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading bugs…
        </div>
      ) : (
        <div className="overflow-hidden rounded-[3px] border border-[#DFE1E6] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#DFE1E6] text-[12px] font-semibold text-[#5E6C84]">
                  <th className="px-3 py-2">Bug</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Assignee</th>
                  <th className="px-3 py-2">Reporter</th>
                  <th className="px-3 py-2">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE1E6] text-[#172B4D]">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-14 text-center">
                      <Inbox className="mx-auto h-8 w-8 text-[#C1C7D0]" />
                      <p className="mt-2 font-medium text-[#172B4D]">No bugs here</p>
                      <p className="text-[#5E6C84]">{filtered ? 'Nothing matches these filters.' : isAdmin ? 'No bug has been reported yet.' : 'No bug is assigned to you or reported by you.'}</p>
                    </td>
                  </tr>
                ) : (
                  visible.map((b) => {
                    const st = STATUS[b.status] ?? STATUS.new;
                    const p = PRIORITY[b.priority] ?? PRIORITY.medium;
                    const PIcon = p.icon;
                    const closed = b.status === 'done' || b.status === 'not_a_bug';
                    const overdue = !closed && b.due_date !== null && b.due_date < today();
                    return (
                      <tr
                        key={b.bug_id}
                        tabIndex={0}
                        onClick={() => navigate(`/projects/${b.project_id}?bug=${b.bug_id}`)}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${b.project_id}?bug=${b.bug_id}`)}
                        className="cursor-pointer transition-colors hover:bg-[#F4F5F7] focus:bg-[#F4F5F7] focus:outline-none"
                      >
                        <td className="max-w-[340px] px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#E5493A]">
                              <Bug className="h-3 w-3 text-white" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[#172B4D]" title={b.title}>
                                {b.title}
                              </p>
                              <p className={`text-[12px] ${closed ? 'text-[#7A869A] line-through' : 'text-[#5E6C84]'}`}>{b.bug_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2.5 text-[#42526E]" title={b.project_name ?? ''}>
                          {b.project_no && <span className="text-[#5E6C84]">{b.project_no} · </span>}
                          {b.project_name}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block whitespace-nowrap rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <PIcon className={`h-4 w-4 ${p.color}`} strokeWidth={3} /> {p.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {b.assigned_to ? (
                            <span className="inline-flex items-center gap-2">
                              <JiraAvatar name={b.assigned_to_name} id={b.assigned_to} size={22} /> <span className="max-w-[110px] truncate">{b.assigned_to_name}</span>
                            </span>
                          ) : (
                            <span className="text-[#7A869A]">Unassigned</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {b.reported_by ? (
                            <span className="inline-flex items-center gap-2">
                              <JiraAvatar name={b.reported_by_name} id={b.reported_by} size={22} /> <span className="max-w-[110px] truncate">{b.reported_by_name}</span>
                            </span>
                          ) : (
                            <span className="text-[#7A869A]">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {b.due_date ? (
                            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-[#BF2600]' : 'text-[#42526E]'}`}>
                              <CalendarDays className="h-3.5 w-3.5" /> {niceDate(b.due_date)}
                            </span>
                          ) : (
                            <span className="text-[#7A869A]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {rows.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DFE1E6] px-3 py-2 text-[13px] text-[#5E6C84]">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
                  .map((n, i, arr) => (
                    <React.Fragment key={n}>
                      {i > 0 && n - arr[i - 1]! > 1 && <span className="px-1">…</span>}
                      <button type="button" onClick={() => setPage(n)} aria-current={n === page} className={`h-8 min-w-8 cursor-pointer rounded-[3px] px-2 font-medium ${n === page ? 'bg-[color:var(--ac-main,#0052CC)] text-white' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}>
                        {n}
                      </button>
                    </React.Fragment>
                  ))}
                <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
