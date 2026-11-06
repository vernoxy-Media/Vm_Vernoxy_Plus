import React, { useMemo, useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Clock, Equal, Inbox, Search } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';
import type { BugStatus, ProjectBugItem } from '../types';

const STATUS: Record<BugStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-[#FFEBE6] text-[#BF2600]' },
  open: { label: 'Open', cls: 'bg-[#FFEBE6] text-[#BF2600]' },
  ready_for_dev: { label: 'Ready for dev', cls: 'bg-[#FFF0B3] text-[#172B4D]' },
  dev_in_progress: { label: 'In dev', cls: 'bg-[#DEEBFF] text-[#0747A6]' },
  ready_for_qa: { label: 'Ready for QA', cls: 'bg-[#EAE6FF] text-[#403294]' },
  qa_in_progress: { label: 'In QA', cls: 'bg-[#EAE6FF] text-[#403294]' },
  done: { label: 'Done', cls: 'bg-[#E3FCEF] text-[#006644]' },
  not_a_bug: { label: 'Not a bug', cls: 'bg-[#DFE1E6] text-[#42526E]' },
};

const PRIORITY = {
  high: { label: 'High', icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { label: 'Medium', icon: Equal, color: 'text-[#E97F33]' },
  low: { label: 'Low', icon: ChevronDown, color: 'text-[#2D8738]' },
} as const;

const GROUPS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'open', label: 'Open', match: (b: ProjectBugItem) => b.status === 'new' || b.status === 'open' },
  { id: 'dev', label: 'In dev', match: (b: ProjectBugItem) => b.status === 'ready_for_dev' || b.status === 'dev_in_progress' },
  { id: 'qa', label: 'In QA', match: (b: ProjectBugItem) => b.status === 'ready_for_qa' || b.status === 'qa_in_progress' },
  { id: 'done', label: 'Done', match: (b: ProjectBugItem) => b.status === 'done' || b.status === 'not_a_bug' },
] as const;

const shortDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface ProjectBugsViewProps {
  bugs: ProjectBugItem[];
  onOpenBug: (bugId: number) => void;
  /** Shown when the list is limited to the viewer's own bugs. */
  scopeNote?: string;
}

/** Bugs as a Jira issue list: filter chips with counts, a search box and one row per bug. */
export const ProjectBugsView: React.FC<ProjectBugsViewProps> = ({ bugs, onOpenBug, scopeNote }) => {
  const [group, setGroup] = useState<(typeof GROUPS)[number]['id']>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const g = GROUPS.find((x) => x.id === group)!;
    return bugs.filter((b) => g.match(b) && (!q || `${b.bug_code} ${b.title}`.toLowerCase().includes(q)));
  }, [bugs, group, search]);

  return (
    <div className="space-y-3">
      {scopeNote && <p className="rounded-[3px] bg-[#DEEBFF] px-3 py-2 text-[13px] text-[#0747A6]">{scopeNote}</p>}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Filter bugs" className="flex flex-wrap gap-1.5">
          {GROUPS.map((g) => {
            const n = bugs.filter((b) => g.match(b)).length;
            const on = group === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setGroup(g.id)}
                className={`h-8 cursor-pointer rounded-[3px] px-3 text-[14px] font-medium transition ${on ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
              >
                {g.label} <span className="ml-0.5 opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6C84]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bugs"
            aria-label="Search bugs"
            className="h-8 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] pl-7 pr-2 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none sm:w-56"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[3px] bg-[#F4F5F7] px-4 py-12 text-center">
          <Inbox className="mx-auto mb-2 h-9 w-9 text-[#97A0AF]" />
          <p className="text-[14px] font-medium text-[#172B4D]">{bugs.length === 0 ? (scopeNote ? 'No bugs for you' : 'No bugs reported') : 'No bugs match your filters'}</p>
          <p className="mt-0.5 text-[13px] text-[#5E6C84]">{bugs.length === 0 ? (scopeNote ? 'Bugs assigned to you, or reported by you, will appear here.' : 'Use “Report bug” when something is not working as expected.') : 'Try another status or clear the search.'}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[3px] border border-[#DFE1E6]">
          {rows.map((b) => {
            const st = STATUS[b.status] ?? STATUS.new;
            const p = PRIORITY[b.priority as keyof typeof PRIORITY] ?? PRIORITY.medium;
            const PIcon = p.icon;
            return (
              <li key={b.bug_id} className="border-b border-[#DFE1E6] bg-white last:border-b-0">
                <button type="button" onClick={() => onOpenBug(b.bug_id)} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-left transition hover:bg-[#F4F5F7]">
                  <span title="Bug" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-[#E5493A] text-white"><Bug className="h-2.5 w-2.5" strokeWidth={3} /></span>
                  <span className={`w-[96px] shrink-0 truncate text-[13px] text-[#5E6C84] ${b.status === 'done' || b.status === 'not_a_bug' ? 'line-through' : ''}`}>{b.bug_code}</span>
                  <span className="min-w-0 flex-1 basis-48 truncate text-[14px] text-[#172B4D]">{b.title}</span>
                  {(b.start_date || b.due_date) && (
                    <span
                      title="Start and due date"
                      className={`inline-flex items-center gap-1 rounded-[3px] px-1 py-px text-[12px] font-medium ${b.due_date && b.status !== 'done' && b.status !== 'not_a_bug' && b.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10) ? 'bg-[#FFEBE6] text-[#BF2600]' : 'bg-[rgba(9,30,66,0.08)] text-[#42526E]'}`}
                    >
                      <Clock className="h-3 w-3" />
                      {b.start_date && b.due_date ? `${shortDay(b.start_date)} – ${shortDay(b.due_date)}` : b.due_date ? `Due ${shortDay(b.due_date)}` : `From ${shortDay(b.start_date!)}`}
                    </span>
                  )}
                  <PIcon className={`h-4 w-4 ${p.color}`} strokeWidth={3} aria-label={`${p.label} priority`} />
                  <span className={`rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase tracking-[0.01em] ${st.cls}`}>{st.label}</span>
                  {b.assigned_to_name ? (
                    <JiraAvatar name={b.assigned_to_name} id={b.assigned_to} src={b.assigned_to_avatar} size={24} />
                  ) : (
                    <span title="Unassigned" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DFE1E6] text-[10px] text-[#5E6C84]">?</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
