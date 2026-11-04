import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CalendarDays,
  Eye,
  Globe,
  HandCoins,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Trophy,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import { ConvertToLeadModal } from '../components/companies/ConvertToLeadModal';
import { EmptyState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { SortMenu } from '../components/leads/SortMenu';
import { useClientList, type ClientListItem } from '../hooks/useClientList';
import { useDebounce } from '../hooks/useDebounce';
import { usePersistentState } from '../hooks/usePersistentState';
import { getAvatarColor, getInitials } from '../utils/formatters';
import { parseApiError } from '../utils/error';

const PAGE_SIZE = 12;

const SORTS = [
  { value: 'won_on-desc', label: 'Recently won', hint: 'Newest clients on top' },
  { value: 'won_on-asc', label: 'Oldest clients', hint: 'Longest clients on top' },
  { value: 'name-asc', label: 'Name A–Z', hint: 'Alphabetical' },
  { value: 'name-desc', label: 'Name Z–A', hint: 'Reverse alphabetical' },
];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const Dash = () => <span className="text-slate-300">—</span>;

/** Everything about the clients: who they are, who talks to them, when they were won and who owns them. */
export const ClientsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [sort, setSort] = usePersistentState<string>('clients:sort', 'won_on-desc');
  const [view, setView] = usePersistentState<'table' | 'cards'>('clients:view', 'cards');
  const [newLeadFor, setNewLeadFor] = useState<ClientListItem | null>(null);

  const params = useMemo(() => {
    const [field, order] = sort.split('-') as ['won_on' | 'name' | 'created_at', 'asc' | 'desc'];
    return { q: search.trim() || undefined, sort: field, order, page, limit: PAGE_SIZE };
  }, [search, sort, page]);

  const { data, isLoading, isError, error, refetch, isFetching } = useClientList(params);
  const clients = data?.items ?? [];
  const counters = data?.counters ?? { total: 0, this_month: 0, this_year: 0 };

  const menuFor = (c: ClientListItem): ActionMenuItem[] => [
    { key: 'view', label: 'View client', icon: Eye, onSelect: () => navigate(`/sales/clients/${c.client_id}`) },
    { key: 'company', label: 'View company', icon: Building2, onSelect: () => navigate(`/sales/companies/${c.company.company_id}`) },
    { key: 'lead', label: 'New lead for more work', icon: UserPlus, onSelect: () => setNewLeadFor(c) },
  ];

  const stats = [
    { label: 'Total clients', value: counters.total, icon: Users, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Won this month', value: counters.this_month, icon: CalendarCheck, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Won this year', value: counters.this_year, icon: CalendarDays, tone: 'bg-violet-50 text-violet-600' },
  ];

  const ContactLines = ({ c }: { c: ClientListItem }) =>
    c.contact ? (
      <div className="min-w-0 space-y-1 text-sm text-slate-600">
        <p className="flex items-center gap-1.5 font-medium text-slate-800">
          <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{c.contact.name}</span>
          {c.contact.designation && <span className="truncate text-xs font-normal text-slate-400">· {c.contact.designation}</span>}
        </p>
        {c.contact.mobile && (
          <a href={`tel:${c.contact.mobile}`} className="flex items-center gap-1.5 hover:text-blue-600">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{c.contact.mobile}</span>
          </a>
        )}
        {c.contact.email && (
          <a href={`mailto:${c.contact.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{c.contact.email}</span>
          </a>
        )}
      </div>
    ) : (
      <Dash />
    );

  const Identity = ({ c, size = 'md' }: { c: ClientListItem; size?: 'md' | 'lg' }) => (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`flex shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-2xs ${getAvatarColor(c.company.name)} ${size === 'lg' ? 'h-11 w-11 text-sm' : 'h-10 w-10 text-xs'}`}>
        {getInitials(c.company.name)}
      </div>
      <div className="min-w-0">
        <Link to={`/sales/clients/${c.client_id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-600 sm:text-[15px]" title={c.company.name}>
          {c.company.name}
        </Link>
        <span className="mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
          <Trophy className="h-3 w-3" />
          {c.client_code}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Clients</h1>
          <p className="text-sm text-slate-500">Companies that bought from us. Start a new lead when they need more.</p>
        </div>
        <Link
          to="/sales/leads"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <HandCoins className="h-4 w-4" />
          Lead Pipeline
        </Link>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold leading-none text-slate-900">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:min-w-[16rem] sm:flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search client, company, Client ID or city"
              aria-label="Search clients"
              className="h-10 w-full rounded-xl border border-transparent bg-gray-100/70 pl-10 pr-9 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-primary/40 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-primary/10"
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-200/60 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <SortMenu
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
              value={sort}
              onChange={(v) => {
                setSort(v);
                setPage(1);
              }}
              options={SORTS}
            />

            <div role="group" aria-label="View" className="hidden shrink-0 items-center gap-0.5 rounded-xl bg-gray-100 p-1 sm:inline-flex">
              {([['table', List, 'Table'], ['cards', LayoutGrid, 'Cards']] as const).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  title={`${label} view`}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition ${view === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
              aria-label="Refresh"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-2xs">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">Failed to load clients</h3>
          <p className="mx-auto mb-4 mt-1 max-w-md text-sm text-gray-500">{parseApiError(error).message || 'An unexpected error occurred.'}</p>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={searchInput ? 'No matching clients' : 'No clients yet'}
          description={searchInput ? 'Try a different name, Client ID or city.' : 'A company becomes a client when you mark its lead as Won.'}
          actionLabel={searchInput ? 'Clear search' : 'Open Lead Pipeline'}
          onAction={searchInput ? () => setSearchInput('') : () => navigate('/sales/leads')}
        />
      ) : (
        <div>
          {view === 'cards' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => (
                <article key={c.client_id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-2 p-4 pb-3">
                    <div className="min-w-0 flex-1">
                      <Identity c={c} size="lg" />
                    </div>
                    <ActionMenu items={menuFor(c)} label={`Actions for ${c.company.name}`} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 text-xs">
                    {c.company.industry && <span className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700">{c.company.industry}</span>}
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {[c.company.city, c.company.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 px-4 py-3">
                    <ContactLines c={c} />
                  </div>

                  {c.win_note && (
                    <p className="mx-4 mb-3 line-clamp-2 rounded-lg bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900/80" title={c.win_note}>
                      <span className="font-semibold">Win note: </span>
                      {c.win_note}
                    </p>
                  )}

                  <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-400">Won on</dt>
                      <dd className="mt-0.5 truncate font-semibold text-slate-800">{formatDate(c.won_on)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-400">Owner</dt>
                      <dd className="mt-0.5 truncate font-semibold text-slate-800">{c.owner?.name ?? '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-400">Leads won</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800">{c.leads_count}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <>
              {/* Table (laptop and wider) */}
              <div className="hidden overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3">Client</th>
                        <th className="px-3 py-3">Contact</th>
                        <th className="px-3 py-3">Location</th>
                        <th className="px-3 py-3">Industry</th>
                        <th className="px-3 py-3">Owner</th>
                        <th className="px-3 py-3">Won on</th>
                        <th className="px-3 py-3 text-center">Leads</th>
                        <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clients.map((c) => (
                        <tr key={c.client_id} className="transition-colors hover:bg-slate-50/80">
                          <td className="px-5 py-3.5">
                            <Identity c={c} />
                          </td>
                          <td className="px-3 py-3.5">
                            <ContactLines c={c} />
                          </td>
                          <td className="px-3 py-3.5 text-sm text-slate-600">{[c.company.city, c.company.state].filter(Boolean).join(', ') || <Dash />}</td>
                          <td className="px-3 py-3.5 text-sm">
                            {c.company.industry ? <span className="inline-block max-w-[11rem] truncate rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{c.company.industry}</span> : <Dash />}
                          </td>
                          <td className="px-3 py-3.5 text-sm text-slate-700">{c.owner?.name ?? <Dash />}</td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-sm text-slate-700">{formatDate(c.won_on)}</td>
                          <td className="px-3 py-3.5 text-center text-sm font-semibold text-slate-700">{c.leads_count}</td>
                          <td className="py-3.5 pl-3 pr-4">
                            <div className="flex items-center justify-end gap-1">
                              {c.company.website && (
                                <a href={c.company.website.startsWith('http') ? c.company.website : `https://${c.company.website}`} target="_blank" rel="noreferrer" title="Open website" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                                  <Globe className="h-4 w-4" />
                                </a>
                              )}
                              <ActionMenu items={menuFor(c)} label={`Actions for ${c.company.name}`} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compact cards on smaller screens */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {clients.map((c) => (
                  <article key={c.client_id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Identity c={c} size="lg" />
                      </div>
                      <ActionMenu items={menuFor(c)} label={`Actions for ${c.company.name}`} />
                    </div>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <ContactLines c={c} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Won {formatDate(c.won_on)} · {c.owner?.name ?? 'No owner'} · {c.leads_count} lead{c.leads_count === 1 ? '' : 's'}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs">
            <Pagination currentPage={data?.page ?? page} totalPages={data?.total_pages ?? 1} totalItems={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}

      <ConvertToLeadModal
        isOpen={Boolean(newLeadFor)}
        onClose={() => setNewLeadFor(null)}
        companyId={newLeadFor?.company.company_id ?? null}
        companyName={newLeadFor?.company.name}
        onSuccess={(leadId) => {
          setNewLeadFor(null);
          queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
          navigate(`/sales/leads/${leadId}`);
        }}
      />
    </div>
  );
};
