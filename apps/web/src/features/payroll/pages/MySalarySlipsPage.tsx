import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { errorText, useMySlips, useSlipById } from '../hooks/use-payroll';
import { SalarySlipModal } from '../components/SalarySlipModal';
import { Banner, btn, fmtDate, money } from '../components/payroll-ui';

/** BFD Section 1: employees see their own released Salary Slips. */
export const MySalarySlipsPage: React.FC = () => {
  const { data = [], isLoading, error } = useMySlips();
  const [openId, setOpenId] = useState<number | null>(null);
  const slip = useSlipById(openId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Salary Slips</h1>
          <p className="text-[13px] text-slate-500">Your released Salary Slips. They are also sent to your office email.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4">
            <Banner>{errorText(error)}</Banner>
          </div>
        ) : !data.length ? (
          <p className="px-4 py-14 text-center text-[13px] text-slate-500">No Salary Slips have been released to you yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((s) => (
              <li key={s.payroll_slip_id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${s.status === 'REPLACED' ? 'opacity-60' : ''}`}>
                <div>
                  <p className="font-bold text-slate-900">{s.month_label}</p>
                  <p className="text-[12px] text-slate-500">
                    {s.slip_number} · Released {fmtDate(s.released_at)}
                    {s.status === 'REPLACED' ? ' · Replaced by a corrected slip' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[14px] font-bold text-slate-900">{money(s.total_salary, 0)}</span>
                  <button type="button" className={btn.secondary} onClick={() => setOpenId(s.payroll_slip_id)}>
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SalarySlipModal open={!!openId} onClose={() => setOpenId(null)} slip={slip.data} loading={slip.isLoading} error={slip.error} />
    </div>
  );
};
