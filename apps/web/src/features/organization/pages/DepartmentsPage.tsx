import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsDepartmentsSection } from '@/features/settings/sections/SettingsDepartmentsSection';
import { SettingsRolesSection } from '@/features/settings/sections/SettingsRolesSection';
import { Building2, Award } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'designations' ? 'designations' : 'departments';

  const setTab = (tab: 'departments' | 'designations') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Simple Tab Switcher */}
      <div className="flex items-center">
        <div className="inline-flex items-center p-1 bg-white rounded-xl border border-slate-300 shadow-xs">
          <button
            type="button"
            id="tab-departments-btn"
            onClick={() => setTab('departments')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
              currentTab === 'departments'
                ? 'bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 stroke-[2]" />
            <span>Departments</span>
          </button>

          <button
            type="button"
            id="tab-designations-btn"
            onClick={() => setTab('designations')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
              currentTab === 'designations'
                ? 'bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award className="w-4 h-4 stroke-[2]" />
            <span>Designations</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[22px] border border-slate-300 shadow-xs p-6">
        {currentTab === 'departments' ? (
          <SettingsDepartmentsSection />
        ) : (
          <SettingsRolesSection />
        )}
      </div>
    </div>
  );
};

