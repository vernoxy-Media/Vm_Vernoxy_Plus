import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, Plus, Search } from 'lucide-react';
import { useSalesRights } from '../hooks/useSalesRights';
import { useDebounce } from '../hooks/useDebounce';
import { useAdminCampaignOverview, useCampaignList, useCampaignMasters, useMyCampaignDashboard } from '../hooks/useCampaigns';
import { Pagination } from '../components/common/Pagination';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { parseApiError } from '../utils/error';
import { CAMPAIGN_STATUSES } from '../types/campaign.types';
import { CampaignStatusPill, KpiCard, ProgressBar, cardCls, inputCls, primaryBtn, secondaryBtn } from '../components/campaigns/campaign-ui';

const PAGE_SIZE = 10;

export const CampaignsPage: React.FC = () => {
  const { isAdmin } = useSalesRights();
  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Campaign Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {isAdmin ? 'City-wise and industry-wise calling campaigns: who calls which company, and how it is going.' : 'The companies assigned to you for calling, and your progress.'}
          </p>
        </div>
        {isAdmin && (
          <Link to="/sales/campaigns/new" className={primaryBtn}>
            <Plus className="h-4 w-4" /> New Campaign
          </Link>
        )}
      </div>
      {isAdmin ? <AdminView /> : <EmployeeView />}
    </div>
  );
};

// ------------------------------------------------------------------ admin ----

const AdminView: React.FC = () => {
  const navigate = useNavigate();
  const { data: masters } = useCampaignMasters();
  const { data: overview, isLoading: overviewLoading } = useAdminCampaignOverview();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [emp, setEmp] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim(), 300);
  const cityQ = useDebounce(city.trim(), 300);

  const { data, isLoading, isError, error, refetch } = useCampaignList({
    q: q || undefined,
    type: type || undefined,
    city: cityQ || undefined,
    emp_id: emp ? Number(emp) : undefined,
    status: status || undefined,
    start_from: from || undefined,
    end_to: to || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const filtered = Boolean(q || type || cityQ || emp || status || from || to);
  const k = overview?.kpis;

  const change = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const clear = () =>
    change(() => {
      setSearch('');
      setType('');
      setCity('');
      setEmp('');
      setStatus('');
      setFrom('');
      setTo('');
    });

  return (
    <>
      <section aria-label="Campaign performance" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total campaigns" value={overviewLoading ? '…' : k?.total_campaigns ?? 0} />
        <KpiCard label="Active campaigns" value={overviewLoading ? '…' : k?.active_campaigns ?? 0} tone="good" />
        <KpiCard label="Companies in campaigns" value={overviewLoading ? '…' : k?.total_companies ?? 0} />
        <KpiCard label="Assigned companies" value={overviewLoading ? '…' : k?.assigned_companies ?? 0} />
        <KpiCard label="Pending calls" value={overviewLoading ? '…' : k?.pending_calls ?? 0} tone="warn" hint="Not called yet" />
        <KpiCard label="Call attempts" value={overviewLoading ? '…' : k?.total_call_attempts ?? 0} />
        <KpiCard label="Connected calls" value={overviewLoading ? '…' : k?.connected_calls ?? 0} />
        <KpiCard label="Meetings scheduled" value={overviewLoading ? '…' : k?.meetings_scheduled ?? 0} />
        <KpiCard label="Meetings completed" value={overviewLoading ? '…' : k?.meetings_completed ?? 0} />
        <KpiCard label="Interested companies" value={overviewLoading ? '…' : k?.interested_companies ?? 0} tone="good" />
      </section>

      <section className="space-y-3" aria-label="Campaigns">
        <h2 className="text-base font-semibold text-gray-900">Campaigns</h2>
        <div className={`${cardCls} grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8`}>
          <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className={`${inputCls} pl-9`} placeholder="Campaign name" aria-label="Campaign name" value={search} onChange={(e) => change(() => setSearch(e.target.value))} />
          </div>
          <select className={inputCls} aria-label="Campaign type" value={type} onChange={(e) => change(() => setType(e.target.value))}>
            <option value="">All types</option>
            {['Calling', 'Meeting', 'Email'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input className={inputCls} list="campaign-city-list" placeholder="City" aria-label="City" value={city} onChange={(e) => change(() => setCity(e.target.value))} />
          <datalist id="campaign-city-list">
            {(masters?.cities ?? []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <select className={inputCls} aria-label="Employee" value={emp} onChange={(e) => change(() => setEmp(e.target.value))}>
            <option value="">All employees</option>
            {(masters?.employees ?? []).map((e) => (
              <option key={e.emp_id} value={e.emp_id}>{e.name}</option>
            ))}
          </select>
          <select className={inputCls} aria-label="Status" value={status} onChange={(e) => change(() => setStatus(e.target.value))}>
            <option value="">All statuses</option>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-8 shrink-0">From</span>
            <input type="date" className={inputCls} aria-label="Starts on or after" value={from} onChange={(e) => change(() => setFrom(e.target.value))} />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-8 shrink-0">To</span>
            <input type="date" className={inputCls} aria-label="Ends on or before" value={to} onChange={(e) => change(() => setTo(e.target.value))} />
          </label>
          {filtered && (
            <button type="button" className="text-left text-sm text-gray-500 underline sm:col-span-2" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : isError ? (
          <div className="rounded-xl border border-rose-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-700">{parseApiError(error).message}</p>
            <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => refetch()}>Try again</button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={filtered ? 'No campaigns match' : 'No campaigns yet'}
            description={filtered ? 'Try changing or clearing the filters.' : 'Create a campaign, choose the companies to call and share them between your Sales team.'}
            actionLabel={filtered ? undefined : 'New Campaign'}
            onAction={filtered ? undefined : () => navigate('/sales/campaigns/new')}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Companies</th>
                  <th className="px-4 py-3" title="Companies that have been called at least once">Completed</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => (
                  <tr key={c.campaign_id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/sales/campaigns/${c.campaign_id}`} className="font-semibold text-gray-900 hover:text-blue-600">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.target_cities.length ? c.target_cities.join(', ') : '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{c.campaign_type}</td>
                    <td className="px-4 py-3 text-gray-700">{c.total_companies}</td>
                    <td className="px-4 py-3 text-gray-700">{c.called_companies}</td>
                    <td className="px-4 py-3"><CampaignStatusPill status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </section>

      <section className="space-y-3" aria-label="Employee-wise performance">
        <h2 className="text-base font-semibold text-gray-900">Employee-wise performance</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Calls</th>
                <th className="px-4 py-3">Meetings</th>
                <th className="px-4 py-3">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {overviewLoading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
              ) : !overview || overview.employees.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nothing is assigned yet.</td></tr>
              ) : (
                overview.employees.map((e) => (
                  <tr key={`${e.campaign_id}-${e.emp_id}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{e.employee}</td>
                    <td className="px-4 py-3"><Link to={`/sales/campaigns/${e.campaign_id}`} className="text-gray-700 hover:text-blue-600">{e.campaign}</Link></td>
                    <td className="px-4 py-3 text-gray-700">{e.assigned}</td>
                    <td className="px-4 py-3 text-gray-700">{e.calls}</td>
                    <td className="px-4 py-3 text-gray-700">{e.meetings}</td>
                    <td className="px-4 py-3 text-gray-700">{e.pending}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

// --------------------------------------------------------------- employee ----

const EmployeeView: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useMyCampaignDashboard();
  const k = data?.kpis;
  const v = (n: number | undefined) => (isLoading ? '…' : n ?? 0);

  return (
    <>
      <section aria-label="My calling dashboard" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active campaigns" value={v(k?.active_campaigns)} tone="good" />
        <KpiCard label="Total assigned companies" value={v(k?.total_assigned)} />
        <KpiCard label="Pending calls" value={v(k?.pending_calls)} tone="warn" hint="Not called yet" />
        <KpiCard label="Calls completed" value={v(k?.calls_completed)} hint="Companies called" />
        <KpiCard label="Calls attempted" value={v(k?.calls_attempted)} />
        <KpiCard label="Connected calls" value={v(k?.connected_calls)} />
        <KpiCard label="Not received" value={v(k?.not_received)} />
        <KpiCard label="Interested" value={v(k?.interested)} tone="good" />
        <KpiCard label="Follow-ups due" value={v(k?.follow_ups_due)} tone="warn" hint="Today or earlier" />
        <KpiCard label="Meetings scheduled" value={v(k?.meetings_scheduled)} />
        <KpiCard label="Meetings completed" value={v(k?.meetings_completed)} />
        <div className={`${cardCls} p-4`}>
          <p className="text-xs font-medium text-gray-500">Calls today</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {isLoading ? '…' : k?.calls_today ?? 0}
            <span className="text-base font-medium text-gray-400"> / {k?.daily_target ?? 0}</span>
          </p>
          <ProgressBar done={k?.calls_today ?? 0} total={k?.daily_target ?? 0} className="mt-2" />
        </div>
      </section>

      <section className="space-y-3" aria-label="My campaigns">
        <h2 className="text-base font-semibold text-gray-900">My campaigns</h2>
        {isLoading ? (
          <TableSkeleton rows={4} columns={6} />
        ) : isError ? (
          <div className="rounded-xl border border-rose-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-700">{parseApiError(error).message}</p>
            <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => refetch()}>Try again</button>
          </div>
        ) : !data || data.campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="No campaigns for you yet" description="When the Admin assigns you companies in a campaign, they appear here." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Called</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Meetings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.campaigns.map((c) => (
                  <tr key={c.campaign_id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3"><Link to={`/sales/campaigns/${c.campaign_id}`} className="font-semibold text-gray-900 hover:text-blue-600">{c.name}</Link></td>
                    <td className="px-4 py-3 text-gray-700">{c.assigned}</td>
                    <td className="px-4 py-3 text-gray-700">{c.called}</td>
                    <td className="px-4 py-3 text-gray-700">{c.pending}</td>
                    <td className="px-4 py-3 text-gray-700">{c.meetings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};
