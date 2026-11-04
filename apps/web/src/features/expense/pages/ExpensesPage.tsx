import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, CheckCircle2, BarChart3 } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { MyExpensesPage } from './MyExpensesPage';
import { ExpenseApprovalsPage } from './ExpenseApprovalsPage';
import { ExpenseReportsPage } from './ExpenseReportsPage';

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.access?.can_manage_organization;
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  let activeTab: 'my-expenses' | 'claims' | 'reports' = 'my-expenses';
  if (isAdmin && (currentTab === 'claims' || currentTab === 'approvals' || currentTab === 'management')) {
    activeTab = 'claims';
  } else if (isAdmin && currentTab === 'reports') {
    activeTab = 'reports';
  }

  const handleTabChange = (tab: 'my-expenses' | 'claims' | 'reports') => {
    if (tab === 'claims') {
      setSearchParams({ tab: 'claims' });
    } else if (tab === 'reports') {
      setSearchParams({ tab: 'reports' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs (Single Expenses Hub - matching Tasks, Complaints & Leave) */}
      {isAdmin && (
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex">
          <button
            type="button"
            id="tab-my-expenses"
            onClick={() => handleTabChange('my-expenses')}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'my-expenses'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Receipt className={`h-4 w-4 ${activeTab === 'my-expenses' ? 'text-white' : 'text-blue-500'}`} />
            <span>My Expenses</span>
          </button>

          <button
            type="button"
            id="tab-expense-claims"
            onClick={() => handleTabChange('claims')}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'claims'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 ${activeTab === 'claims' ? 'text-white' : 'text-purple-500'}`} />
            <span>Expense Claims</span>
          </button>

          <button
            type="button"
            id="tab-expense-reports"
            onClick={() => handleTabChange('reports')}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 className={`h-4 w-4 ${activeTab === 'reports' ? 'text-white' : 'text-emerald-500'}`} />
            <span>Expense Reports</span>
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'claims' && isAdmin ? (
        <ExpenseApprovalsPage />
      ) : activeTab === 'reports' && isAdmin ? (
        <ExpenseReportsPage />
      ) : (
        <MyExpensesPage />
      )}
    </div>
  );
};

