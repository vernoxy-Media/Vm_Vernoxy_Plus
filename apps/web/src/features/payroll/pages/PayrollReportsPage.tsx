import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { downloadFile, errorText, reportUrl, usePayrollReport } from '../hooks/use-payroll';
import { Banner, FilterField, MONTHS, btn, filterCls, money } from '../components/payroll-ui';

const REPORTS = [
  { key: 'register', label: 'Payroll Register', hint: 'One row per employee for a month.' },
  { key: 'salary-summary', label: 'Salary Summary', hint: 'Totals per department for a month or a range of months.' },
  { key: 'pf', label: 'PF Report', hint: 'Employees with PF for a month.' },
  { key: 'ot', label: 'OT Report', hint: 'OT entries and amounts.' },
  { key: 'adjustments', label: 'Adjustments Report', hint: 'Every day adjustment, addition and deduction.' },
  { key: 'lop', label: 'LOP Report', hint: 'Unpaid days per employee.' },
  { key: 'bank', label: 'Bank Transfer Statement', hint: 'Bank-transfer employees of a locked run.' },
  { key: 'employee-history', label: 'Employee Salary History', hint: 'One employee across months.' },
];

/** BFD Section 13: Reports, on screen or exported as Excel or CSV. */
export const PayrollReportsPage: React.FC = () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [type, setType] = useState('register');
  const [year, setYear] = useState(prev.getFullYear());
  const [month, setMonth] = useState(prev.getMonth() + 1);
  const [toYm, setToYm] = useState('');
  const [empId, setEmpId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const { data: emps = [] } = useEmployeeOptionsQuery();
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const params: Record<string, any> =
    type === 'employee-history' ? { emp_id: empId || undefined } : type === 'salary-summary' ? { from: ym, to: toYm || ym } : { year, month };
  const ready = type !== 'employee-history' || Boolean(empId);
  const { data, isLoading, error } = usePayrollReport(type, params, ready);
  const meta = REPORTS.find((r) => r.key === type)!;

  const exportAs = async (format: 'xlsx' | 'csv') => {
    setErr(null);
    try {
      await downloadFile(reportUrl(type, { ...params, format }), `payroll-${type}.${format}`);
    } catch (e: any) {
      setErr(e?.message || 'Export failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/payroll" className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-3.5 w-3.5" /> Payroll
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Payroll Reports</h1>
        <p className="text-[13px] text-slate-500">Built from the run (Draft or Locked). The export matches the screen.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setType(r.key)}
            className={`rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition ${type === r.key ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-end gap-3">
            {type === 'employee-history' ? (
              <FilterField label="Employee">
                <select className={`${filterCls} w-60`} value={empId} onChange={(e) => setEmpId(e.target.value)}>
                  <option value="">Select employee</option>
                  {(emps as any[]).map((e) => (
                    <option key={e.emp_id ?? e.id} value={e.emp_id ?? e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </FilterField>
            ) : (
              <>
                <FilterField label={type === 'salary-summary' ? 'From month' : 'Payroll Month'}>
                  <div className="flex gap-2">
                    <select className={`${filterCls} w-36`} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select className={`${filterCls} w-24`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                      {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </FilterField>
                {type === 'salary-summary' && (
                  <FilterField label="To month">
                    <input type="month" className={`${filterCls} w-44`} value={toYm} min={ym} onChange={(e) => setToYm(e.target.value)} />
                  </FilterField>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} disabled={!data} onClick={() => exportAs('xlsx')}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button type="button" className={btn.secondary} disabled={!data} onClick={() => exportAs('csv')}>
              <Download className="h-4 w-4" /> CSV
            </button>
            <button type="button" className={btn.secondary} disabled={!data} onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>
        <p className="px-4 pt-3 text-[12px] text-slate-500">{meta.hint}</p>
        {err && (
          <div className="px-4 pt-3">
            <Banner>{err}</Banner>
          </div>
        )}
        {!ready ? (
          <p className="px-4 py-12 text-center text-[13px] text-slate-500">Choose an employee.</p>
        ) : isLoading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4">
            <Banner tone="warn">{errorText(error)}</Banner>
          </div>
        ) : data ? (
          <div className="p-4">
            <h2 className="mb-3 text-[14px] font-bold text-slate-900">{data.title}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12.5px]">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c.key} className={`px-3 py-2.5 ${c.money ? 'text-right' : ''}`}>
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r, i) => (
                    <tr key={i}>
                      {data.columns.map((c) => (
                        <td key={c.key} className={`px-3 py-2 ${c.money ? 'text-right font-medium text-slate-800' : 'text-slate-700'}`}>
                          {c.money ? money(r[c.key]) : r[c.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!data.rows.length && (
                    <tr>
                      <td colSpan={data.columns.length} className="px-3 py-10 text-center text-slate-500">
                        Nothing to show.
                      </td>
                    </tr>
                  )}
                </tbody>
                {data.totals && data.rows.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 font-bold">
                    <tr>
                      {data.columns.map((c, i) => (
                        <td key={c.key} className={`px-3 py-2 ${c.money ? 'text-right' : ''}`}>
                          {i === 0 ? 'Total' : data.totals![c.key] !== undefined ? (c.money ? money(data.totals![c.key]) : data.totals![c.key]) : ''}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
