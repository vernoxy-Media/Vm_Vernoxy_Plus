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
        <div className="flex max-w-full gap-1 overflow-x-auto border-b-2 border-[#DFE1E6] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setParams(t.key === 'my-expenses' ? {} : { tab: t.key })}
                className={`-mb-0.5 inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  on ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
                }`}
              >
                <Icon className="h-4 w-4" />
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
