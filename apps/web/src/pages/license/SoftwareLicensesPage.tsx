import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Laptop } from 'lucide-react';
import { SoftwareRegisterView } from './SoftwareRegisterView';
import { MySoftwareView } from './MySoftwareView';
import { LicenseReportsView } from './LicenseReportsView';

export const SoftwareLicensesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  let activeTab: 'register' | 'my' | 'reports' = 'register';
  if (currentTab === 'my') {
    activeTab = 'my';
  } else if (currentTab === 'reports') {
    activeTab = 'reports';
  }

  const handleTabChange = (tab: 'register' | 'my' | 'reports') => {
    if (tab === 'register') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Navigation Hub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
            <Laptop className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Software License Management</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Centralized software register, seat allocation, license keys, renewals, and cost tracking.
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-semibold shadow-2xs">
          <button
            type="button"
            id="tab-license-register"
            onClick={() => handleTabChange('register')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Software Register
          </button>

          <button
            type="button"
            id="tab-my-software"
            onClick={() => handleTabChange('my')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'my'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Software
          </button>

          <button
            type="button"
            id="tab-license-reports"
            onClick={() => handleTabChange('reports')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reports & Analytics
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'register' ? (
        <SoftwareRegisterView />
      ) : activeTab === 'my' ? (
        <MySoftwareView />
      ) : (
        <LicenseReportsView />
      )}
    </div>
  );
};
