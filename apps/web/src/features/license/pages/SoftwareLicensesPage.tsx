import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, KeyRound, Laptop, UserCheck } from 'lucide-react';
import { SoftwareRegisterView } from '../components/SoftwareRegisterView';
import { MySoftwareView } from '../components/MySoftwareView';
import { LicenseReportsView } from '../components/LicenseReportsView';

type Tab = 'register' | 'my' | 'reports';

const TABS: Array<{ key: Tab; id: string; label: string; icon: React.ElementType; color: string }> = [
  { key: 'register', id: 'tab-license-register', label: 'Software Register', icon: KeyRound, color: 'text-blue-500' },
  { key: 'my', id: 'tab-my-software', label: 'My Software', icon: UserCheck, color: 'text-violet-500' },
  { key: 'reports', id: 'tab-license-reports', label: 'Reports & Analytics', icon: BarChart3, color: 'text-emerald-500' },
];

export const SoftwareLicensesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const activeTab: Tab = currentTab === 'my' ? 'my' : currentTab === 'reports' ? 'reports' : 'register';

  const handleTabChange = (tab: Tab) => {
    if (tab === 'register') setSearchParams({});
    else setSearchParams({ tab });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Laptop className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">Software License Management</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Software register, seat allocation, license keys, renewals and cost tracking in one place.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = activeTab === t.key;
            return (
              <button
                key={t.key}
                id={t.id}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                  on
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${on ? 'text-white' : t.color}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'register' ? <SoftwareRegisterView /> : activeTab === 'my' ? <MySoftwareView /> : <LicenseReportsView />}
    </div>
  );
};
