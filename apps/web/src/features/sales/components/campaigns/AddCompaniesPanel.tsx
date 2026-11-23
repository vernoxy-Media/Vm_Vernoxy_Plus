import React, { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../common/EmptyState';
import { TableSkeleton } from '../common/SkeletonLoader';
import { useDebounce } from '../../hooks/useDebounce';
import { useAddCompanies, useCampaignMasters, useCompanySearch } from '../../hooks/useCampaigns';
import { parseApiError } from '../../utils/error';
import { LEAD_STATUS_FILTERS, type CompanySearchFilters } from '../../types/campaign.types';
import { inputCls, labelCls, primaryBtn, secondaryBtn } from './campaign-ui';

const PAGE_SIZE = 20;

interface Props {
  campaignId: number;
  disabled?: boolean;
  /** Filters to start from, for example the campaign's own city and industry. */
  defaults?: { city?: string; industry_id?: number | null; state?: string | null };
}

/** The filters that decide which companies match. Page and campaign are added by the panel. */
type Filters = Omit<CompanySearchFilters, 'page' | 'limit' | 'campaign_id'>;

export const AddCompaniesPanel: React.FC<Props> = ({ campaignId, disabled, defaults }) => {
  const { data: masters } = useCampaignMasters();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState(defaults?.city ?? '');
  const [state, setState] = useState(defaults?.state ?? '');
  const [industry, setIndustry] = useState(defaults?.industry_id ? String(defaults.industry_id) : '');
  const [category, setCategory] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [contacted, setContacted] = useState('');
  const [hideAdded, setHideAdded] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const q = useDebounce(search.trim(), 300);

  const filters: Filters = useMemo(
    () => ({
      q: q || undefined,
      cities: city ? [city] : undefined,
      state: state || undefined,
      industry_ids: industry ? [Number(industry)] : undefined,
      customer_type_id: category ? Number(category) : undefined,
      lead_status: leadStatus || undefined,
      contacted: (contacted || undefined) as 'yes' | 'no' | undefined,
      hide_added: hideAdded || undefined,
    }),
    [q, city, state, industry, category, leadStatus, contacted, hideAdded],
  );

  const { data, isLoading, isFetching, isError, error } = useCompanySearch({ ...filters, campaign_id: campaignId, page, limit: PAGE_SIZE });
  const add = useAddCompanies(campaignId);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectable = items.filter((c) => !c.in_campaign).map((c) => c.company_id);
  const allOnPage = selectable.length > 0 && selectable.every((id) => selected.includes(id));

  const change = (fn: () => void) => {
    fn();
    setPage(1);
    setSelected([]);
    setMessage(null);
  };

  const finish = (r: { added: number; skipped: number }) => {
    setSelected([]);
    setMessage({
      tone: 'ok',
      text: `${r.added} ${r.added === 1 ? 'company' : 'companies'} added.${r.skipped > 0 ? ` ${r.skipped} were already in the campaign.` : ''}`,
    });
  };
  const fail = (e: unknown) => setMessage({ tone: 'error', text: parseApiError(e).message });

  const addSelected = () => {
    setMessage(null);
    add.mutate({ company_ids: selected }, { onSuccess: finish, onError: fail });
  };

  const addAllFiltered = () => {
    const count = Math.min(total, 5000).toLocaleString('en-IN');
    const capped = total > 5000 ? ' Only the first 5,000 are added at a time.' : '';
    if (!window.confirm(`Add ${count} ${total === 1 ? 'company' : 'companies'} that match these filters? Companies already in the campaign are skipped.${capped}`)) return;
    setMessage(null);
    const { hide_added: _h, ...filter } = filters;
    add.mutate({ filter }, { onSuccess: finish, onError: fail });
  };

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (allOnPage ? s.filter((id) => !selectable.includes(id)) : [...new Set([...s, ...selectable])]));

  const clearFilters = () =>
    change(() => {
      setSearch('');
      setCity('');
      setState('');
      setIndustry('');
      setCategory('');
      setLeadStatus('');
      setContacted('');
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2 xl:col-span-1">
          <label className={labelCls} htmlFor="cs-q">Company name</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input id="cs-q" className={`${inputCls} pl-9`} placeholder="Name or code" value={search} onChange={(e) => change(() => setSearch(e.target.value))} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="cs-city">City</label>
          <input id="cs-city" className={inputCls} list="cs-cities" placeholder="Any city" value={city} onChange={(e) => change(() => setCity(e.target.value))} />
          <datalist id="cs-cities">
            {(masters?.cities ?? []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls} htmlFor="cs-state">State</label>
          <select id="cs-state" className={inputCls} value={state} onChange={(e) => change(() => setState(e.target.value))}>
            <option value="">Any state</option>
            {(masters?.states ?? []).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cs-industry">Industry</label>
          <select id="cs-industry" className={inputCls} value={industry} onChange={(e) => change(() => setIndustry(e.target.value))}>
            <option value="">Any industry</option>
            {(masters?.industries ?? []).map((i) => (
              <option key={i.industry_id} value={i.industry_id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cs-category">Company category</label>
          <select id="cs-category" className={inputCls} value={category} onChange={(e) => change(() => setCategory(e.target.value))}>
            <option value="">Any category</option>
            {(masters?.customer_types ?? []).map((t) => (
              <option key={t.customer_type_id} value={t.customer_type_id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cs-lead">Existing lead status</label>
          <select id="cs-lead" className={inputCls} value={leadStatus} onChange={(e) => change(() => setLeadStatus(e.target.value))}>
            <option value="">Any</option>
            {LEAD_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cs-contacted">Contacted before</label>
          <select id="cs-contacted" className={inputCls} value={contacted} onChange={(e) => change(() => setContacted(e.target.value))}>
            <option value="">Either</option>
            <option value="yes">Previously contacted</option>
            <option value="no">Not contacted</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={hideAdded} onChange={(e) => change(() => setHideAdded(e.target.checked))} />
            Hide companies already added
          </label>
          <button type="button" className="mb-2.5 text-sm text-gray-500 underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700" aria-live="polite">
          <span className="font-semibold">{total.toLocaleString('en-IN')}</span> {total === 1 ? 'company matches' : 'companies match'}
          {selected.length > 0 && <span> · <span className="font-semibold text-blue-700">{selected.length} selected</span></span>}
          {isFetching && <span className="text-gray-400"> · updating…</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={addSelected} disabled={disabled || selected.length === 0 || add.isPending}>
            <Plus className="h-4 w-4" /> Add selected ({selected.length})
          </button>
          <button type="button" className={primaryBtn} onClick={addAllFiltered} disabled={disabled || total === 0 || add.isPending}>
            <Check className="h-4 w-4" /> Add all {total.toLocaleString('en-IN')} filtered
          </button>
        </div>
      </div>

      {disabled && <p className="text-sm text-amber-700">This campaign is completed, so companies can no longer be added.</p>}

      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-3 py-2 text-sm ${message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          {message.text}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : isError ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-white p-6 text-center text-sm text-rose-600">{parseApiError(error).message}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Search} title="No companies found" description="Change the filters to see more companies from the Company Database." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" aria-label="Select all on this page" className="h-4 w-4 rounded border-gray-300" checked={allOnPage} onChange={toggleAll} disabled={disabled || selectable.length === 0} />
                </th>
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">City</th>
                <th className="px-3 py-3">Industry</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Lead status</th>
                <th className="px-3 py-3">Contacted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.company_id} className={c.in_campaign ? 'bg-gray-50/70 text-gray-400' : 'hover:bg-gray-50/60'}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.name}`}
                      className="h-4 w-4 rounded border-gray-300"
                      checked={c.in_campaign || selected.includes(c.company_id)}
                      disabled={disabled || c.in_campaign}
                      onChange={() => toggle(c.company_id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className={`font-semibold ${c.in_campaign ? '' : 'text-gray-900'}`}>{c.name}</div>
                    <div className="text-xs">{[c.company_code, c.contact_person, c.mobile].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="px-3 py-3">{[c.city, c.state].filter(Boolean).join(', ') || '-'}</td>
                  <td className="px-3 py-3">{c.industry ?? '-'}</td>
                  <td className="px-3 py-3">{c.category ?? '-'}</td>
                  <td className="px-3 py-3">{c.lead_status}</td>
                  <td className="px-3 py-3">{c.in_campaign ? <span className="font-medium text-emerald-600">In campaign</span> : c.contacted ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(p)} />
        </div>
      )}
    </div>
  );
};
