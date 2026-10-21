import React from 'react';
import { NavLink, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AdminLayout } from '../../../components/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';
import { getVisibleSettingsSections } from './settings.registry';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { sectionId } = useParams<{ sectionId: string }>();

  const visibleSections = getVisibleSettingsSections(user);

  // If sectionId is missing or invalid, redirect to first visible section (departments)
  const currentSection = visibleSections.find((s) => s.id === sectionId);

  if (!sectionId || !currentSection) {
    const defaultSection = visibleSections[0];
    if (defaultSection) {
      return <Navigate to={defaultSection.path} replace />;
    }
  }

  const ActiveComponent = currentSection?.component || visibleSections[0]?.component;

  return (
    <AdminLayout title="Settings" fluid>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Settings"
          description="Configure system master data, organization hierarchy, and access models."
        />

        {/* Master Data Card Layout */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          {/* Left section list (horizontal scrollable row below 768px) */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-50/50 p-3 sm:p-4 shrink-0">
            <span className="hidden md:block text-xs font-bold uppercase tracking-wider text-slate-400 px-3 pb-3">
              Master Data
            </span>

            <nav
              className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-none"
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
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span>{section.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area for Active Section */}
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
