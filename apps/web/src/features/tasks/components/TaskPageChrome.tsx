import React from 'react';
import { KanbanSquare, List } from 'lucide-react';

/** Page heading in Jira's style: a small breadcrumb, a 24px title, and the page's actions on the right. */
export const TaskPageHeader: React.FC<{ crumbs: string[]; title: string; children?: React.ReactNode }> = ({ crumbs, title, children }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-[12px] text-[#5E6C84]">
        {crumbs.map((c, i) => (
          <React.Fragment key={c}>
            {i > 0 && <span aria-hidden>/</span>}
            <span>{c}</span>
          </React.Fragment>
        ))}
      </nav>
      <h1 className="text-[24px] font-medium leading-8 text-[#172B4D]">{title}</h1>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2 self-start">{children}</div>}
  </div>
);

/** Board / List, as the small switch Jira puts in the corner of a board. */
export const ViewSwitch: React.FC<{ value: 'kanban' | 'list'; onChange: (v: 'kanban' | 'list') => void }> = ({ value, onChange }) => (
  <div role="tablist" aria-label="View" className="inline-flex rounded-[3px] bg-[rgba(9,30,66,0.04)] p-0.5">
    {([['kanban', 'Board', KanbanSquare], ['list', 'List', List]] as const).map(([id, label, Icon]) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={value === id}
        onClick={() => onChange(id)}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-3 text-[14px] font-medium transition ${value === id ? 'bg-white text-[color:var(--ac-main,#0052CC)] shadow-[0_1px_1px_rgba(9,30,66,0.25)]' : 'text-[#42526E] hover:text-[#172B4D]'}`}
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    ))}
  </div>
);

export const PRIMARY_BUTTON =
  'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-3 text-[14px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)] active:bg-[#0747A6]';

/** The counts above a board, as one slim line instead of five large cards. */
export const TaskStatStrip: React.FC<{ items: Array<{ label: string; value: number; dot: string }> }> = ({ items }) => (
  <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] text-[#42526E]">
    {items.map((i) => (
      <li key={i.label} className="inline-flex items-center gap-1.5">
        <span aria-hidden className={`h-2 w-2 rounded-full ${i.dot}`} />
        <b className="font-semibold text-[#172B4D]">{i.value}</b> {i.label}
      </li>
    ))}
  </ul>
);

/** Tabs with an underline, like the ones above a Jira board (My tasks, Task management). */
export const UnderlineTabs: React.FC<{ tabs: Array<{ id: string; label: string; icon: React.ElementType }>; value: string; onChange: (id: string) => void }> = ({ tabs, value, onChange }) => (
  <div role="tablist" className="flex border-b-2 border-[#DFE1E6]">
    {tabs.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        type="button"
        role="tab"
        id={`tab-${id}`}
        aria-selected={value === id}
        onClick={() => onChange(id)}
        className={`-mb-0.5 inline-flex cursor-pointer items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-[14px] font-medium transition ${value === id ? 'border-[color:var(--ac-main,#0052CC)] text-[color:var(--ac-main,#0052CC)]' : 'border-transparent text-[#42526E] hover:bg-[rgba(9,30,66,0.04)]'}`}
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    ))}
  </div>
);
