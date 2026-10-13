import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CompanyListItemDto, customFetch, IndustryOptionDto } from '@vernoxy-pulse/api-client';
import {
  useCompaniesQuery,
  useDeleteCompanyMutation,
} from '../api/companies.api';
import { useCustomerTypeOptionsQuery, useIndustryOptionsQuery } from '../../../hooks/use-master-data';
import { useEmployeesQuery } from '../../../hooks/use-organization';
import { useAuthenticatedDownload } from '../../../hooks/use-authenticated-download';
import { DependentSelect } from '../../../components/DependentSelect';
import { LinkValue } from '../../../components/LinkValue';
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
  ChevronRight,
  Users,
  Download,
  Upload,
} from 'lucide-react';

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customerTypeId, setCustomerTypeId] = useState<number | undefined>(undefined);
  const [industryId, setIndustryId] = useState<number | undefined>(undefined);
  const [subIndustryId, setSubIndustryId] = useState<number | undefined>(undefined);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

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
    limit: 20,
    cursor,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your CRM client accounts, subsidiaries, communication channels, and contacts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs shrink-0 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              Export
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
                >
                  Export as Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
                >
                  Export as CSV (.csv)
                </button>
              </div>
            )}
          </div>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => navigate('/companies/import')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import
          </button>

          {/* Add Company Button */}
          <button
            type="button"
            onClick={() => navigate('/companies/new')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCursor(undefined);
              }}
              placeholder="Search companies by name..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <select
            value={customerTypeId ?? ''}
            onChange={(e) => {
              setCustomerTypeId(e.target.value ? Number(e.target.value) : undefined);
              setCursor(undefined);
            }}
            className="px-3 py-2 rounded-lg text-xs border border-slate-200 bg-white font-medium"
          >
            <option value="">All Customer Types</option>
            {customerTypeOptions?.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setCursor(undefined);
            }}
            className="px-3 py-2 rounded-lg text-xs border border-slate-200 bg-white font-medium"
          >
            <option value="all">All Owners</option>
            <option value="unassigned">Unassigned</option>
            {employeesData?.items?.map((emp) => (
              <option key={emp.emp_id} value={emp.emp_id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Second Row: DependentSelect (Industry -> Sub-industry) & Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2 flex-1">
            <select
              value={industryId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setIndustryId(val);
                setSubIndustryId(undefined);
                setCursor(undefined);
              }}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white font-medium flex-1 sm:flex-initial"
            >
              <option value="">All Industries</option>
              {topIndustries?.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>

            <div className="flex-1 sm:w-48">
              <DependentSelect
                id="filter-sub-industry"
                parentId={industryId}
                value={subIndustryId}
                onChange={(val) => {
                  setSubIndustryId(val ? Number(val) : undefined);
                  setCursor(undefined);
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

          <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200 text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setStatusFilter(undefined);
                setCursor(undefined);
              }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === undefined ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(true);
                setCursor(undefined);
              }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === true ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(false);
                setCursor(undefined);
              }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === false ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading companies...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-rose-600 bg-white rounded-2xl border border-slate-200 px-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="font-semibold text-xs">Failed to load companies</p>
          <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Unknown error'}</p>
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 px-4">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No companies found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? `No companies match "${search}". Try adjusting your filters.`
              : 'Get started by creating your first company record.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile View: Stacked Cards (<640px) */}
          <div className="sm:hidden space-y-3">
            {data?.items.map((c) => (
              <CompanyCard key={c.company_id} company={c} onDelete={handleDelete} />
            ))}
          </div>

          {/* Desktop View: Full Data Table (>=640px) */}
          <div className="hidden sm:block rounded-xl border border-slate-200 overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" id="companies-table">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Company</th>
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5">Industry</th>
                    <th className="py-3 px-5">Primary Contact Info</th>
                    <th className="py-3 px-5">Contacts</th>
                    <th className="py-3 px-5">Owner</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.items.map((company) => (
                    <tr
                      key={company.company_id}
                      id={`company-row-${company.company_id}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <Link
                          to={`/companies/${company.company_id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block"
                        >
                          {company.name}
                        </Link>
                        <span className="text-xs text-slate-400">
                          {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-700">
                        {company.customer_type?.name}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        <div>{company.industry?.name}</div>
                        {company.sub_industry && (
                          <div className="text-xs text-slate-400">↳ {company.sub_industry.name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 space-y-1">
                        {company.primary_email && (
                          <div>
                            <LinkValue type="email" value={company.primary_email} className="text-xs" />
                          </div>
                        )}
                        {company.primary_phone && (
                          <div>
                            <LinkValue type="phone" value={company.primary_phone} className="text-xs" />
                          </div>
                        )}
                        {!company.primary_email && !company.primary_phone && (
                          <span className="text-slate-300 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {company.contact_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium">
                        {company.owner?.name || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            company.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              company.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {company.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/companies/${company.company_id}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/companies/${company.company_id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Company"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(company)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.next_cursor && (
              <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setCursor(data.next_cursor || undefined)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-100 transition-colors"
                >
                  Next Page
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
