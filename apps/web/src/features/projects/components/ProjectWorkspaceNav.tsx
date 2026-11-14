import React from 'react';

export interface WorkspaceNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export interface WorkspaceNavGroup {
  title: string;
  items: WorkspaceNavItem[];
}

interface ProjectWorkspaceNavProps {
  projectName: string;
  projectKey: string;
  subtitle?: string;
  groups: WorkspaceNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Jira's project navigation: a left sidebar with grouped sections on large
 * screens, and a row of scrollable tabs on phones and tablets.
 */
export const ProjectWorkspaceNav: React.FC<ProjectWorkspaceNavProps> = ({ projectName, projectKey, subtitle, groups, activeId, onSelect }) => {
  const all = groups.flatMap((g) => g.items);

  return (
    <>
      {/* Large screens: sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-[#DFE1E6] bg-[#FAFBFC] px-2 py-4 lg:flex" aria-label="Project navigation">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[color:var(--ac-main,#0052CC)] text-[15px] font-bold text-white">
            {(projectName.trim()[0] || 'P').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-[#172B4D]" title={projectName}>{projectName}</p>
            <p className="truncate text-[12px] text-[#5E6C84]">{subtitle || projectKey}</p>
          </div>
        </div>

        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const on = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[3px] px-2 text-left text-[14px] font-medium transition ${on ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`rounded-full px-1.5 text-[12px] font-semibold ${on ? 'bg-white/70 text-[color:var(--ac-main,#0052CC)]' : 'bg-[#DFE1E6] text-[#42526E]'}`}>{item.badge}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </aside>

      {/* Phones and tablets: tabs */}
      <nav className="shrink-0 border-b-2 border-[#DFE1E6] bg-white px-2 lg:hidden" aria-label="Project navigation">
        <div className="-mb-0.5 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {all.map((item) => {
            const Icon = item.icon;
            const on = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[14px] font-medium transition ${on ? 'border-[color:var(--ac-main,#0052CC)] text-[color:var(--ac-main,#0052CC)]' : 'border-transparent text-[#42526E] hover:bg-[rgba(9,30,66,0.04)]'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.badge !== undefined && <span className="rounded-full bg-[#DFE1E6] px-1.5 text-[12px] font-semibold text-[#42526E]">{item.badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
