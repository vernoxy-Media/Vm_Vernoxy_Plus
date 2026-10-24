import React from 'react';
import { NavLink, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AdminLayout } from '../../../components/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';
import { getVisibleSettingsSections, getSettingsSectionGroups } from './settings.registry';

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

  const GROUP_ORDER = ['Organization', 'CRM', 'Tasks', 'Projects', 'HR'];

  return (
    <AdminLayout title="Settings" fluid>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Settings"
          description="Configure system master data, organization hierarchy, and access models."
        />

        {/* Master Data Card Layout */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          {/* Left section list (horizontal scrollable on mobile, grouped on desktop) */}
          <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/40 shrink-0">
            {/* Mobile: horizontal scroll */}
            <nav
              className="flex md:hidden gap-1 overflow-x-auto p-3 scrollbar-none"
              aria-label="Settings Sections"
            >
              {visibleSections.map((section) => {
                const Icon = section.icon;
                const isActive = currentSection?.id === section.id;
                return (
                  <NavLink
                    key={section.id}
                    to={section.path}
                    id={`settings-tab-${section.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{section.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Desktop: grouped vertical nav */}
            <nav className="hidden md:flex flex-col p-3 gap-0.5" aria-label="Settings Sections">
              {GROUP_ORDER.map((group) => {
                const sections = sectionGroups[group];
                if (!sections?.length) return null;
                return (
                  <div key={group} className="mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2.5 py-1.5">
                      {group}
                    </p>
                    {sections.map((section) => {
                      const Icon = section.icon;
                      const isActive = currentSection?.id === section.id;
                      return (
                        <NavLink
                          key={section.id}
                          to={section.path}
                          id={`settings-tab-${section.id}`}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`}
                        >
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                          />
                          <span>{section.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
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
