import React from 'react';
import { NavLink, useParams, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { SettingsJumpMenu } from '../components/SettingsJumpMenu';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import {
  getVisibleSettingsSections,
  getSettingsSectionGroups,
  SETTINGS_MAIN_GROUPS,
} from '../settings.registry';

/** Tab strip that scrolls with arrow buttons, the mouse wheel or touch when the tabs do not fit. */
const ScrollableTabs: React.FC<{ label: string; watch?: string; children: React.ReactNode }> = ({ label, watch, children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ left: false, right: false });

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Turn the vertical wheel into sideways scrolling, only while there is room to scroll
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, [update, children]);

  React.useEffect(() => {
    document.getElementById(`settings-subtab-${watch}`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [watch]);

  const nudge = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * Math.max(200, ref.current.clientWidth * 0.6), behavior: 'smooth' });
  const arrow =
    'absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer';

  return (
    <div className="relative border-b border-slate-200 px-4 sm:px-6">
      {edge.left && (
        <button type="button" aria-label="Scroll tabs left" onClick={() => nudge(-1)} className={`${arrow} left-2`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div ref={ref} onScroll={update} role="tablist" aria-label={label} className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {edge.right && (
        <button type="button" aria-label="Scroll tabs right" onClick={() => nudge(1)} className={`${arrow} right-2`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sectionId } = useParams<{ sectionId: string }>();

  const visibleSections = getVisibleSettingsSections(user);
  const sectionGroups = getSettingsSectionGroups(user);

  // If sectionId is missing or invalid, redirect to first visible section
  const currentSection = visibleSections.find((s) => s.id === sectionId);

  if (!sectionId || !currentSection) {
    const defaultSection = visibleSections[0];
    if (defaultSection) {
      return <Navigate to={defaultSection.path} replace />;
    }
  }

  const ActiveComponent = currentSection?.component || visibleSections[0]?.component;
  const currentGroup = currentSection?.group || 'Employee';
  const currentGroupSections = sectionGroups[currentGroup] || [];
  const groups = SETTINGS_MAIN_GROUPS.filter((g) => (sectionGroups[g.name] || []).length > 0);

  const jumpGroups = groups.map((g) => ({ id: g.id, name: g.name, icon: g.icon, sections: sectionGroups[g.name] }));

  return (
    <AdminLayout title="Settings" fluid>
      <div className="mx-auto w-full max-w-[1400px] space-y-5 sm:space-y-6">
        {/* Page header with the quick jump to any master-data screen */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
              <Settings className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Settings</h1>
              <p className="mt-0.5 text-sm text-slate-500">Manage master data and organisation-wide configuration.</p>
            </div>
          </div>

          <SettingsJumpMenu groups={jumpGroups} current={currentSection} onSelect={(path) => navigate(path)} />
        </div>

        {/* Categories */}
        <nav
          role="tablist"
          aria-label="Settings Categories"
          className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {groups.map((group) => {
            const active = currentGroup === group.name;
            const GroupIcon = group.icon;
            const count = sectionGroups[group.name].length;
            return (
              <NavLink
                key={group.id}
                to={sectionGroups[group.name][0].path}
                id={`settings-group-${group.id.toLowerCase()}`}
                role="tab"
                aria-selected={active}
                aria-label={group.name}
                title={group.name}
                className={`group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-200 min-[1830px]:px-3.5 ${
                  active
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <GroupIcon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {/* Narrow screens keep the label only on the open tab; the rest are icons */}
                <span className={active ? '' : 'hidden min-[1450px]:inline'}>{group.name}</span>
                <span className={`hidden rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none min-[1830px]:inline-block ${active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}>
                  {count}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Pages of the chosen category */}
          {currentGroupSections.length > 1 && (
            <ScrollableTabs label={`${currentGroup} settings`} watch={sectionId}>
                {currentGroupSections.map((subSection) => {
                  const SubIcon = subSection.icon;
                  const active = currentSection?.id === subSection.id;
                  return (
                    <NavLink
                      key={subSection.id}
                      to={subSection.path}
                      id={`settings-subtab-${subSection.id}`}
                      role="tab"
                      aria-selected={active}
                      className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 py-3.5 text-[13.5px] font-semibold transition ${
                        active ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      <SubIcon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                      {subSection.label}
                    </NavLink>
                  );
                })}
            </ScrollableTabs>
          )}

          <div className="min-h-[480px] p-4 sm:p-6 lg:p-8">
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              }
            >
              {ActiveComponent && <ActiveComponent />}
            </React.Suspense>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
