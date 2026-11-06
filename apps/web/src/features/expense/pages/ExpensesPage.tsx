import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Banknote, CheckCircle2, Receipt } from 'lucide-react';
import { useExpenseMe } from '../hooks/use-expenses';
import { MyExpensesPage } from './MyExpensesPage';
import { ExpenseClaimsPage } from './ExpenseClaimsPage';
import { ExpenseReportsPage } from './ExpenseReportsPage';
import { ReimbursementsPage } from './ReimbursementsPage';

type Tab = 'my-expenses' | 'claims' | 'reimbursement' | 'reports';

/**
 * Expenses hub. Tabs follow the BFD roles: everyone has My Expenses; Authorised
 * Approvers, Accounts and the Admin have Expense Claims and Reports; Accounts
 * and the Admin also have Reimbursement.
 */
export const ExpensesPage: React.FC = () => {
  const { data: me } = useExpenseMe();
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab');

  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType; color: string }> = [{ key: 'my-expenses', label: 'My Expenses', icon: Receipt, color: 'text-blue-500' }];
  if (me?.can_use_claims) tabs.push({ key: 'claims', label: 'Expense Claims', icon: CheckCircle2, color: 'text-purple-500' });
  if (me?.can_reimburse) tabs.push({ key: 'reimbursement', label: 'Reimbursement', icon: Banknote, color: 'text-amber-500' });
  if (me?.can_use_claims) tabs.push({ key: 'reports', label: 'Expense Reports', icon: BarChart3, color: 'text-emerald-500' });

  const alias: Record<string, Tab> = { approvals: 'claims', management: 'claims' };
  const wanted = (alias[asked || ''] || asked || 'my-expenses') as Tab;
  const active: Tab = tabs.some((t) => t.key === wanted) ? wanted : 'my-expenses';

  return (
    <div className="space-y-6">
      {tabs.length > 1 && (
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex">
          {tabs.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setParams(t.key === 'my-expenses' ? {} : { tab: t.key })}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 ${
                  on ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${on ? 'text-white' : t.color}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {active === 'claims' ? <ExpenseClaimsPage /> : active === 'reimbursement' ? <ReimbursementsPage /> : active === 'reports' ? <ExpenseReportsPage /> : <MyExpensesPage />}
    </div>
  );
};
