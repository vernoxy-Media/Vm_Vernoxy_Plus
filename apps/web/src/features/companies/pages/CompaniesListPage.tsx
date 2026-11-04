import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CompanyListItemDto, customFetch, IndustryOptionDto } from '@vernoxy-pulse/api-client';
import {
  useCompaniesQuery,
  useDeleteCompanyMutation,
} from '../api/companies.api';
import { useCustomerTypeOptionsQuery, useIndustryOptionsQuery } from '@/features/organization/hooks/use-master-data';
import { useEmployeesQuery } from '@/features/organization/hooks/use-organization';
import { useAuthenticatedDownload } from '@/shared/hooks/use-authenticated-download';
import { CursorPager } from '@/shared/ui/Pagination';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { useCursorPaging } from '@/features/settings/useCursorPaging';
import { DependentSelect } from '../components/DependentSelect';
import { LinkValue } from '../components/LinkValue';
import { CompanyCard } from '../components/CompanyCard';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Users,
  Download,
  Upload,
  MapPin,
  FileSpreadsheet,
  FileText,
  FilterX,
} from 'lucide-react';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

/** Lead-ish types read amber, won customers green, anything else neutral. */
const typeTone = (name?: string) => {
  const n = (name ?? '').toLowerCase();
  if (n.includes('lead') || n.includes('prospect')) return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (n.includes('client') || n.includes('customer')) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const FilterSelect: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
  <label className="relative block min-w-0">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full cursor-pointer appearance-none truncate rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </label>
);

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customerTypeId, setCustomerTypeId] = useState<number | undefined>(undefined);
  const [industryId, setIndustryId] = useState<number | undefined>(undefined);
  const [subIndustryId, setSubIndustryId] = useState<number | undefined>(undefined);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const paging = useCursorPaging<string>();

  const { data: customerTypeOptions } = useCustomerTypeOptionsQuery();
  const { data: topIndustries } = useIndustryOptionsQuery();
  const { data: employeesData } = useEmployeesQuery({ limit: 50, status: 'Active' });

  const ownerParam = ownerFilter === 'unassigned' ? 'unassigned' : undefined;
  const ownerIdParam =
    ownerFilter !== 'all' && ownerFilter !== 'unassigned' ? Number(ownerFilter) : undefined;
  const effectiveIndustryId = subIndustryId || industryId;

  const { data, isLoading, error } = useCompaniesQuery({
    q: search || undefined,
    customer_type_id: customerTypeId,
    industry_id: effectiveIndustryId,
    owner: ownerParam,
    owner_id: ownerIdParam,
    is_active: statusFilter,
    limit: paging.limit,
    cursor: paging.cursor,
  });

  const deleteMutation = useDeleteCompanyMutation();

  const handleDelete = async (company: CompanyListItemDto) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${company.name}"? This soft-deletes the company, channels, and associated company links.`
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(company.company_id);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Cannot delete company: in use by child companies or active leads');
    }
  };

  const { download, isDownloading: isExporting } = useAuthenticatedDownload();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setShowExportMenu(false);
    const params = new URLSearchParams();
    params.set('format', format);
    if (search.trim()) params.set('q', search.trim());
    if (customerTypeId) params.set('customer_type_id', String(customerTypeId));
    if (effectiveIndustryId) params.set('industry_id', String(effectiveIndustryId));
    if (ownerParam === 'unassigned') params.set('owner', 'unassigned');
    else if (ownerIdParam) params.set('owner_id', String(ownerIdParam));
    if (statusFilter !== undefined) params.set('is_active', String(statusFilter));

    try {
      await download(`/api/v1/companies/export?${params.toString()}`, `companies.${format}`);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const hasFilters =
    Boolean(search) || customerTypeId !== undefined || industryId !== undefined || subIndustryId !== undefined || ownerFilter !== 'all' || statusFilter !== undefined;
  const clearFilters = () => {
    setSearch('');
    setCustomerTypeId(undefined);
    setIndustryId(undefined);
    setSubIndustryId(undefined);
    setOwnerFilter('all');
    setStatusFilter(undefined);
    paging.reset();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Building2 className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Companies</h1>
            <p className="mt-0.5 text-sm text-slate-500">Leads and clients, their contacts and who owns them.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export */}
          <div className="relative">
            <button
              type="button"
              disabled={isExporting}
              aria-haspopup="menu"
              aria-expanded={showExportMenu}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-500" />}
              Export
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} aria-hidden />
                <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-100">
                  <button type="button" role="menuitem" onClick={() => handleExport('xlsx')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    Excel (.xlsx)
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleExport('csv')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
                    <FileText className="h-4 w-4 text-sky-500" />
                    CSV (.csv)
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/companies/import')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            Import
          </button>

          <button
            type="button"
            onClick={() => navigate('/companies/new')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-hidden focus:ring-4 focus:ring-blue-600/20 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add Company
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                paging.reset();
              }}
              placeholder="Search companies by name..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div role="group" aria-label="Status" className="inline-flex self-start rounded-xl bg-slate-100 p-1 text-[13px] font-semibold sm:self-auto">
            {([['All', undefined, 'text-blue-700'], ['Active', true, 'text-emerald-700'], ['Inactive', false, 'text-slate-800']] as const).map(([label, value, on]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setStatusFilter(value);
                  paging.reset();
                }}
                className={`rounded-lg px-3.5 py-1.5 transition ${statusFilter === value ? `bg-white shadow-sm ${on}` : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Customer type"
            value={customerTypeId ?? ''}
            onChange={(v) => {
              setCustomerTypeId(v ? Number(v) : undefined);
              paging.reset();
            }}
          >
            <option value="">All Customer Types</option>
            {customerTypeOptions?.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Owner"
            value={ownerFilter}
            onChange={(v) => {
              setOwnerFilter(v);
              paging.reset();
            }}
          >
            <option value="all">All Owners</option>
            <option value="unassigned">Unassigned</option>
            {employeesData?.items?.map((emp) => (
              <option key={emp.emp_id} value={emp.emp_id}>
                {emp.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Industry"
            value={industryId ?? ''}
            onChange={(v) => {
              setIndustryId(v ? Number(v) : undefined);
              setSubIndustryId(undefined);
              paging.reset();
            }}
          >
            <option value="">All Industries</option>
            {topIndustries?.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </FilterSelect>

          <div className="[&_select]:h-10 [&_select]:rounded-xl [&_select]:border-slate-200 [&_select]:py-0 [&_select]:text-[13px] [&_select]:font-medium [&_select]:shadow-none">
            <DependentSelect
              id="filter-sub-industry"
              parentId={industryId}
              value={subIndustryId}
              onChange={(val) => {
                setSubIndustryId(val ? Number(val) : undefined);
                paging.reset();
              }}
              fetchOptions={async (pid: number | string) => {
                const json = await customFetch<IndustryOptionDto[]>(`/api/v1/industries/options?parent_id=${pid}`);
                return json.map((x) => ({ value: x.id, label: x.name }));
              }}
              placeholder="Sub-industry"
              noParentMessage="Select industry first"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <FilterX className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Loading companies...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-800">Failed to load companies</p>
          <p className="mt-1 text-sm text-slate-500">{(error as any)?.message || 'Unknown error'}</p>
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
            <Building2 className="h-7 w-7" />
          </span>
          <h3 className="text-base font-semibold text-slate-800">No companies found</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {hasFilters ? 'Nothing matches these filters. Try changing or clearing them.' : 'Get started by creating your first company record.'}
          </p>
          <div className="mt-5">
            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                <FilterX className="h-4 w-4" /> Clear filters
              </button>
            ) : (
              <button type="button" onClick={() => navigate('/companies/new')} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Add Company
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Mobile: stacked cards */}
          <div className="space-y-3 p-3 sm:hidden">
            {data?.items.map((c) => (
              <CompanyCard key={c.company_id} company={c} onDelete={handleDelete} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden max-h-[calc(100vh-430px)] min-h-[360px] overflow-auto sm:block">
            <table className="relative w-full min-w-[980px] text-left text-sm" id="companies-table">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-5 py-3">Company</th>
                  <th className="whitespace-nowrap px-5 py-3">Type</th>
                  <th className="whitespace-nowrap px-5 py-3">Industry</th>
                  <th className="whitespace-nowrap px-5 py-3">Primary Contact</th>
                  <th className="whitespace-nowrap px-5 py-3">Contacts</th>
                  <th className="whitespace-nowrap px-5 py-3">Owner</th>
                  <th className="whitespace-nowrap px-5 py-3">Status</th>
                  <th className="w-px whitespace-nowrap px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((company) => {
                  const place = [company.city, company.state].filter(Boolean).join(', ');
                  const industry = company.industry?.name;
                  return (
                    <tr key={company.company_id} id={`company-row-${company.company_id}`} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-[13px] font-bold text-blue-600 ring-1 ring-blue-100">
                            {initials(company.name)}
                          </span>
                          <div className="min-w-0">
                            <Link to={`/companies/${company.company_id}`} className="block truncate font-semibold text-slate-900 transition-colors hover:text-blue-600">
                              {company.name}
                            </Link>
                            {place && (
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{place}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {company.customer_type?.name ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${typeTone(company.customer_type.name)}`}>{company.customer_type.name}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className={industry && industry !== 'Unclassified' ? 'font-medium text-slate-700' : 'text-slate-400'}>{industry || '—'}</div>
                        {company.sub_industry && <div className="mt-0.5 text-xs text-slate-400">↳ {company.sub_industry.name}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        {company.primary_email || company.primary_phone ? (
                          <div className="space-y-0.5">
                            {company.primary_email && <LinkValue type="email" value={company.primary_email} className="block text-[13px]" />}
                            {company.primary_phone && <LinkValue type="phone" value={company.primary_phone} className="block text-[13px]" />}
                          </div>
                        ) : (
                          <span className="text-slate-300">No contact info</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {company.contact_count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {company.owner?.name ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">{initials(company.owner.name)}</span>
                            <span className="truncate font-medium text-slate-700">{company.owner.name}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                            company.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${company.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {company.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          <RowActionsMenu
                            id={`company-actions-${company.company_id}`}
                            label={`Actions for ${company.name}`}
                            actions={[
                              { label: 'View details', icon: Eye, onClick: () => navigate(`/companies/${company.company_id}`) },
                              { label: 'Edit company', icon: Edit2, onClick: () => navigate(`/companies/${company.company_id}/edit`) },
                              { label: 'Delete company', icon: Trash2, danger: true, onClick: () => handleDelete(company) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(
            <CursorPager
              page={paging.page}
              shown={data?.items.length ?? 0}
              hasPrev={paging.hasPrev}
              hasNext={Boolean(data?.next_cursor)}
              onPrev={paging.prev}
              onNext={() => paging.next(data?.next_cursor)}
              pageSize={paging.limit}
              onPageSizeChange={paging.setLimit}
            />
          )}
        </div>
      )}
    </div>
  );
};
