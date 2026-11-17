import React, { useState } from 'react';
import { Clock3, Loader2 } from 'lucide-react';
import { errorText, useOtApprovals, usePayrollMe } from '../hooks/use-payroll';
import { OtHoursTable } from '../components/OtHoursTable';
import { Banner, FilterField, MONTHS, filterCls } from '../components/payroll-ui';

/**
 * BFD Section 9: Reporting Managers approve, reduce or reject the OT hours of their
 * team for the month. No salary amounts are shown to them.
 */
export const OtApprovalsPage: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: me } = usePayrollMe();
  const { data, isLoading, error } = useOtApprovals(year, month);
  const showAmounts = Boolean(me?.can_use_payroll);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-600/25">
          <Clock3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">OT Approvals</h1>
          <p className="text-[13px] text-slate-500">Approve, reduce or reject the OT hours of your team. Only approved hours are paid.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <FilterField label="Month">
            <select className={`${filterCls} w-36`} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Year">
            <select className={`${filterCls} w-24`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </FilterField>
        </div>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4">
            <Banner>{errorText(error)}</Banner>
          </div>
        ) : !data?.run ? (
          <p className="px-4 py-12 text-center text-[13px] text-slate-500">Payroll for this month has not been started, so there are no OT entries yet.</p>
        ) : (
          <>
            {data.run.status !== 'DRAFT' && (
              <div className="px-4 pt-3">
                <Banner tone="info">Payroll {data.run.month_label} is locked. OT entries can no longer change.</Banner>
              </div>
            )}
            <OtHoursTable entries={data.entries} showAmounts={showAmounts} locked={data.run.status !== 'DRAFT'} />
          </>
        )}
      </div>
    </div>
  );
};
