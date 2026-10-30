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
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            id="tab-my-expenses"
            onClick={() => handleTabChange('my-expenses')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'my-expenses'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 text-blue-500" />
            <span>My Expenses</span>
          </button>

          <button
            type="button"
            id="tab-expense-claims"
            onClick={() => handleTabChange('claims')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'claims'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
            <span>Expense Claims</span>
          </button>

          <button
            type="button"
            id="tab-expense-reports"
            onClick={() => handleTabChange('reports')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
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

