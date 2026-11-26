import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Download, Loader2, Search } from 'lucide-react';
import {
  companyCallExportUrl,
  useCompanyCalls,
  type CompanyCallRow,
  type CompanyCallSort,
  type CompanyCallView,
  type SalesReportFilters,
} from '../../hooks/useSalesReport';
import { downloadSalesFile } from '../../utils/download';
import { parseApiError } from '../../utils/error';
import { CompanyCallHistoryModal } from './CompanyCallHistoryModal';
import { fmtCallDate } from './format';

const PAGE_SIZE = 20;

const COLUMNS: Array<{ id: CompanyCallSort; label: string; numeric?: boolean }> = [
  { id: 'company_name', label: 'Company name' },
  { id: 'contact_person', label: 'Contact person' },
  { id: 'total', label: 'Total calls', numeric: true },
  { id: 'received', label: 'Received', numeric: true },
  { id: 'not_received', label: 'Not received', numeric: true },
  { id: 'latest_outcome', label: 'Latest outcome' },
  { id: 'last_call_date', label: 'Last call date' },
  { id: 'last_remark', label: 'Last call remark' },
];

export const CompanyCallReport: React.FC<{ filters: SalesReportFilters; isAdmin: boolean }> = ({ filters, isAdmin }) => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<CompanyCallView>({ q: '', sort: 'last_call_date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [openCompany, setOpenCompany] = useState<CompanyCallRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Search once the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setView((v) => (v.q === search ? v : { ...v, q: search })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [view, filters.from, filters.to, filters.leadBy, filters.campaignId]);

  const { data, isLoading, isError, error, isFetching } = useCompanyCalls(filters, isAdmin, view);
  const rows = data?.items ?? [];
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const sortBy = (id: CompanyCallSort) =>
    setView((v) => ({ ...v, sort: id, dir: v.sort === id ? (v.dir === 'asc' ? 'desc' : 'asc') : id === 'last_call_date' ? 'desc' : 'asc' }));

  const exportExcel = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadSalesFile(companyCallExportUrl(filters, isAdmin, { ...view, q: search }), { fallbackFilename: 'company-wise-calls.xlsx' });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export the report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-slate-900">Company-wise Detailed Report (Received Calls)</h2>
            <p className="text-xs text-slate-500">Companies with at least one received call. Click a company to see its call history.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-[480px]:flex-row">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              maxLength={200}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search company or contact person"
              placeholder="Search company or contact"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-[480px]:w-64"
            />
          </label>
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting || rows.length === 0}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Excel
          </button>
        </div>
      </div>

      {exportError && (
        <p role="alert" className="mb-3 text-sm text-rose-600">
          {exportError}
        </p>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
      ) : isError ? (
        <p role="alert" className="py-10 text-center text-sm text-rose-600">
          {parseApiError(error).message}
        </p>
      ) : (
        <div className={`-mx-4 overflow-x-auto px-4 transition-opacity sm:-mx-5 sm:px-5 ${isFetching ? 'opacity-70' : ''}`}>
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {COLUMNS.map((c) => {
                  const active = view.sort === c.id;
                  const Icon = !active ? ArrowUpDown : view.dir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <th key={c.id} aria-sort={active ? (view.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-2 py-2 ${c.numeric ? 'text-right' : ''}`}>
                      <button
                        type="button"
                        onClick={() => sortBy(c.id)}
                        className={`inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        {c.label}
                        <Icon className="h-3 w-3" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-10 text-center text-sm text-slate-500">
                    {view.q.trim() ? 'No company matches your search.' : 'No received calls for these filters.'}
                  </td>
                </tr>
              ) : (
                shown.map((r) => (
                  <tr key={r.key} className="transition-colors hover:bg-blue-50/30">
                    <td className="px-2 py-2.5 font-medium">
                      {r.company_id !== null ? (
                        <button type="button" onClick={() => setOpenCompany(r)} className="cursor-pointer text-left font-semibold text-blue-700 hover:underline">
                          {r.company_name}
                        </button>
                      ) : (
                        <span className="text-slate-800">{r.company_name}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-slate-700">{r.contact_person ?? '-'}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-slate-900">{r.total}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-emerald-600">{r.received}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-rose-600">{r.not_received}</td>
                    <td className="px-2 py-2.5 text-slate-700">{r.latest_outcome ?? '-'}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">{fmtCallDate(r.last_call_date)}</td>
                    <td className="max-w-[260px] px-2 py-2.5 text-slate-700">
                      <span className="line-clamp-2 break-words" title={r.last_remark ?? undefined}>
                        {r.last_remark || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {rows.length} {rows.length === 1 ? 'company' : 'companies'}
          </span>
          {pages > 1 && (
            <span className="flex items-center gap-3">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="cursor-pointer font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300">
                Previous
              </button>
              Page {current} of {pages}
              <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="cursor-pointer font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300">
                Next
              </button>
            </span>
          )}
        </div>
      )}

      <CompanyCallHistoryModal company={openCompany} isAdmin={isAdmin} onClose={() => setOpenCompany(null)} />
    </section>
  );
};
