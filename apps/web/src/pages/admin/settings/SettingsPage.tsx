import React from 'react';
import { NavLink, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AdminLayout } from '../../../components/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';
import {
  getVisibleSettingsSections,
  getSettingsSectionGroups,
  SETTINGS_MAIN_GROUPS,
} from './settings.registry';

export const SettingsPage: React.FC = () => {
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
  const currentGroup = currentSection?.group || 'Organization';
  const currentGroupSections = sectionGroups[currentGroup] || [];

  return (
    <AdminLayout title="Settings" fluid>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader title="Settings" />

        {/* Master Data Card Layout */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          {/* Left sidebar: ONLY Main Fields (Organization, CRM, Tasks, Projects, HR) */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/50 shrink-0">
            {/* Mobile: horizontal scroll of main categories */}
            <nav
              className="flex md:hidden gap-1.5 overflow-x-auto p-3 scrollbar-none"
              aria-label="Settings Categories"
            >
              {SETTINGS_MAIN_GROUPS.map((group) => {
                const sections = sectionGroups[group.name] || [];
                if (sections.length === 0) return null;
                const isGroupActive = currentGroup === group.name;
                const firstPath = sections[0]?.path || '#';
                const GroupIcon = group.icon;

                return (
                  <NavLink
                    key={group.id}
                    to={firstPath}
                    id={`mobile-settings-group-${group.id.toLowerCase()}`}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isGroupActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <GroupIcon className={`w-3.5 h-3.5 shrink-0 ${isGroupActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{group.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Desktop: vertical list of main fields */}
            <nav className="hidden md:flex flex-col p-3 gap-1" aria-label="Settings Categories">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-2">
                Categories
              </p>
              {SETTINGS_MAIN_GROUPS.map((group) => {
                const sections = sectionGroups[group.name] || [];
                if (sections.length === 0) return null;
                const isGroupActive = currentGroup === group.name;
                const firstPath = sections[0]?.path || '#';
                const GroupIcon = group.icon;

                return (
                  <NavLink
                    key={group.id}
                    to={firstPath}
                    id={`settings-group-${group.id.toLowerCase()}`}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isGroupActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90'
                    }`}
                  >
                    <GroupIcon
                      className={`w-4 h-4 shrink-0 ${isGroupActive ? 'text-white' : 'text-slate-500'}`}
                    />
                    <span>{group.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            {/* Top row of sub-tabs for the selected main field */}
            {currentGroupSections.length > 0 && (
              <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-none">
                {currentGroupSections.map((subSection) => {
                  const SubIcon = subSection.icon;
                  const isSubActive = currentSection?.id === subSection.id;
                  return (
                    <NavLink
                      key={subSection.id}
                      to={subSection.path}
                      id={`settings-subtab-${subSection.id}`}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        isSubActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <SubIcon
                        className={`w-3.5 h-3.5 ${isSubActive ? 'text-blue-400' : 'text-slate-500'}`}
                      />
                      <span>{subSection.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}

            <React.Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
