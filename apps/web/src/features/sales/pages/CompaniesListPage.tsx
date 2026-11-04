import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Upload,
  Download,
  
  
  
  Building2,
  
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  useSalesCompanyControllerList,
  useSalesCompanyControllerRemove,
  
} from '@vernoxy-pulse/api-client';

import { CompanyCounters } from '../components/companies/CompanyCounters';
import { CompanyToolbar } from '../components/companies/CompanyToolbar';
import { CompanyFilterDrawer } from '../components/companies/CompanyFilterDrawer';
import { CompanyRow } from '../components/companies/CompanyRow';
import { ConvertToLeadModal } from '../components/companies/ConvertToLeadModal';
import { ExportModal } from '../components/export/ExportModal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

import { useDebounce } from '../hooks/useDebounce';
import { useSalesRights } from '../hooks/useSalesRights';
import type { BlockerItem } from '../components/common/ConfirmDialog';
import { parseApiError } from '../utils/error';
import type {
  SalesCompanyListResponse,
  SalesCompanyListItem,
  SalesCompanyLeadFilter,
  SalesCompanyControllerListParams,
} from '../types/sales.types';
import { usePersistentState } from '../hooks/usePersistentState';

export interface CompaniesListPageProps {
  /** Start on this filter (the Clients menu opens the list on "client"). */
  initialLead?: SalesCompanyLeadFilter;
  title?: string;
  subtitle?: string;
}

export const CompaniesListPage: React.FC<CompaniesListPageProps> = ({
  initialLead = 'all',
  title = 'Company Database',
  subtitle = 'Target companies, their profiles, and the ones ready to become leads.',
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canImport, canExport } = useSalesRights();

  // Search and debounce
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'city'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Lead status filter (from counters or drawer)
  const [leadStatusFilter, setLeadStatusFilter] = useState<SalesCompanyLeadFilter>(initialLead);

  // Filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = usePersistentState<SalesCompanyControllerListParams>(`companies:${initialLead}:filters`, {});

  // Selection for bulk export
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Table or cards (remembered); the card grid is used on every screen size when chosen
  const [view, setView] = usePersistentState<'table' | 'cards'>('companies:view', 'table');

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [convertToLeadTarget, setConvertToLeadTarget] = useState<SalesCompanyListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesCompanyListItem | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<BlockerItem[]>([]);

  // Construct query parameters
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      ...filters,
      q: debouncedSearch.trim() || undefined,
      lead: leadStatusFilter !== 'all' ? leadStatusFilter : filters.lead,
      sort: sortBy,
      order: sortOrder,
      page,
      limit: pageSize,
    };
    Object.keys(params).forEach((k) => {
      if (params[k] === undefined || params[k] === '' || params[k] === null) delete params[k];
    });
    return params as SalesCompanyControllerListParams;
  }, [page, pageSize, debouncedSearch, sortBy, sortOrder, leadStatusFilter, filters]);

  // Fetch list of companies
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSalesCompanyControllerList(queryParams);

  const listData: SalesCompanyListResponse = (
    (rawData as unknown as { data?: SalesCompanyListResponse })?.data ??
    (rawData as unknown as SalesCompanyListResponse) ?? {
      items: [],
      total: 0,
      page: 1,
      limit: pageSize,
      total_pages: 1,
      counters: {
        total: 0,
        not_a_lead: 0,
        open_leads: 0,
        converted_to_client: 0,
      },
    }
  );

  const companies = listData.items || [];
  const counters = listData.counters || {
    total: 0,
    not_a_lead: 0,
    open_leads: 0,
    converted_to_client: 0,
  };
  const totalItems = listData.total || 0;
  const totalPages = Math.max(1, listData.total_pages || Math.ceil(totalItems / pageSize));

  // Count active drawer filters
  const activeDrawerFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) =>
          !['page', 'limit', 'sort', 'order', 'q'].includes(key) && value !== undefined && value !== '' && value !== null,
      ).length,
    [filters],
  );

  // Delete mutation
  const deleteMutation = useSalesCompanyControllerRemove({
    mutation: {
      onSuccess: () => {
        setDeleteTarget(null);
        setDeleteErrorMessage(null);
        setDeleteBlockers([]);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
      },
      onError: (err: unknown) => {
        const parsed = parseApiError(err);
        setDeleteErrorMessage(parsed.message || 'Failed to delete company');
        setDeleteBlockers(parsed.blockers || []);
      },
    },
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteErrorMessage(null);
    setDeleteBlockers([]);
    await deleteMutation.mutateAsync({ id: deleteTarget.company_id });
  };

  // Toggle single row selection
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Select/Deselect all rows on current page
  const handleToggleSelectAll = () => {
    const pageIds = companies.map((c) => c.company_id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const isAllCurrentPageSelected =
    companies.length > 0 && companies.every((c) => selectedIds.includes(c.company_id));

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          <p className="mt-0.5 hidden text-sm text-gray-500 2xl:block">{subtitle}</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            disabled={!canExport}
            title={!canExport ? 'You do not have permission to export' : 'Export company records'}
            aria-label="Export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span className="hidden sm:inline">Export</span>
            {selectedIds.length > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{selectedIds.length}</span>}
          </button>

          <Link
            to="/sales/import"
            aria-disabled={!canImport}
            aria-label="Import"
            onClick={(e) => {
              if (!canImport) e.preventDefault();
            }}
            title={!canImport ? 'You do not have permission to import' : 'Import companies via Excel/CSV'}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-2xs transition hover:bg-gray-50 sm:px-3.5 ${
              !canImport ? 'pointer-events-none cursor-not-allowed opacity-50' : ''
            }`}
          >
            <Upload className="h-4 w-4 text-gray-500" />
            <span className="hidden sm:inline">Import</span>
          </Link>

          <Link
            to="/sales/companies/new"
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            <span>Add Company</span>
          </Link>
        </div>
      </div>

      {/* Counter Cards */}
      <CompanyCounters
        counters={counters}
        selectedFilter={leadStatusFilter}
        onSelectFilter={(selected) => {
          setLeadStatusFilter(selected);
          setPage(1);
        }}
      />

      <CompanyToolbar
        search={searchInput}
        onSearch={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        filterCount={activeDrawerFiltersCount}
        onOpenFilters={() => setIsFilterOpen(true)}
        sort={`${sortBy}-${sortOrder}`}
        onSort={(value) => {
          const [field, order] = value.split('-') as ['name' | 'created_at' | 'city', 'asc' | 'desc'];
          setSortBy(field);
          setSortOrder(order);
          setPage(1);
        }}
        onRefresh={() => refetch()}
        refreshing={isFetching}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onExportSelected={() => setExportModalOpen(true)}
        canExport={canExport}
        view={view}
        onViewChange={setView}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : isError ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-2xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Failed to load companies</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
            {parseApiError(error).message || 'An unexpected error occurred while fetching company data.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={
            searchInput || activeDrawerFiltersCount > 0 || leadStatusFilter !== 'all'
              ? 'No matching companies found'
              : 'No companies yet'
          }
          description={
            searchInput || activeDrawerFiltersCount > 0 || leadStatusFilter !== 'all'
              ? 'Try adjusting your search query or clearing some active filters to find what you are looking for.'
              : 'Get started by creating your first company record or importing existing records via Excel or CSV.'
          }
          actionLabel={
            searchInput || activeDrawerFiltersCount > 0 || leadStatusFilter !== 'all'
              ? 'Reset All Filters'
              : 'Add Company'
          }
          onAction={
            searchInput || activeDrawerFiltersCount > 0 || leadStatusFilter !== 'all'
              ? () => {
                  setSearchInput('');
                  setLeadStatusFilter('all');
                  setFilters({});
                  setPage(1);
                }
              : () => navigate('/sales/companies/new')
          }
          secondaryActionLabel={
            !searchInput && activeDrawerFiltersCount === 0 && leadStatusFilter === 'all' && canImport
              ? 'Import Companies'
              : undefined
          }
          onSecondaryAction={
            !searchInput && activeDrawerFiltersCount === 0 && leadStatusFilter === 'all' && canImport
              ? () => navigate('/sales/import')
              : undefined
          }
        />
      ) : (
        <div className={view === 'table' ? 'lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-200/80 lg:bg-white lg:shadow-2xs' : ''}>
          {/* Card grid: 1 column on phones up to 4 on wide screens */}
          {view === 'cards' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {companies.map((company) => (
                <CompanyRow
                  variant="grid"
                  key={company.company_id}
                  company={company}
                  isSelected={selectedIds.includes(company.company_id)}
                  onToggleSelect={handleToggleSelect}
                  onConvertToLead={(c) => setConvertToLeadTarget(c)}
                  onDelete={(c) => {
                    setDeleteTarget(c);
                    setDeleteErrorMessage(null);
                    setDeleteBlockers([]);
                  }}
                />
              ))}
            </div>
          )}

          {/* Desktop Table View (Hidden on mobile) */}
          <div className={`${view === 'table' ? 'hidden lg:block' : 'hidden'} overflow-x-auto`}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="w-12 py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      title="Select all on this page"
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Industry</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Website</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((company) => (
                  <CompanyRow
                    key={company.company_id}
                    company={company}
                    isSelected={selectedIds.includes(company.company_id)}
                    onToggleSelect={handleToggleSelect}
                    onConvertToLead={(c) => setConvertToLeadTarget(c)}
                    onDelete={(c) => {
                      setDeleteTarget(c);
                      setDeleteErrorMessage(null);
                      setDeleteBlockers([]);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Stacked Card View (Hidden on desktop) */}
          <div className={`space-y-3 lg:hidden ${view === 'cards' ? '!hidden' : ''}`}>
            {companies.map((company) => (
              <CompanyRow variant="card"
                key={company.company_id}
                company={company}
                isSelected={selectedIds.includes(company.company_id)}
                onToggleSelect={handleToggleSelect}
                onConvertToLead={(c) => setConvertToLeadTarget(c)}
                onDelete={(c) => {
                  setDeleteTarget(c);
                  setDeleteErrorMessage(null);
                  setDeleteBlockers([]);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className={`px-1 py-3 ${view === 'table' ? 'lg:border-t lg:border-gray-200 lg:px-4' : 'mt-2'}`}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      <CompanyFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setLeadStatusFilter((newFilters.lead as SalesCompanyLeadFilter | undefined) ?? 'all');
          setPage(1);
        }}
        onReset={() => {
          setFilters({});
          setLeadStatusFilter('all');
          setPage(1);
        }}
      />

      {/* Convert to Lead Modal */}
      <ConvertToLeadModal
        isOpen={Boolean(convertToLeadTarget)}
        onClose={() => setConvertToLeadTarget(null)}
        companyId={convertToLeadTarget?.company_id ?? null}
        companyName={convertToLeadTarget?.name}
        onSuccess={(leadId) => {
          setConvertToLeadTarget(null);
          queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
          navigate(`/sales/leads/${leadId}`);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        type="companies"
        selectedIds={selectedIds}
        currentFilters={queryParams as Record<string, unknown>}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
            setDeleteErrorMessage(null);
            setDeleteBlockers([]);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deleteTarget?.name || 'Company'}"?`}
        message={
          deleteErrorMessage ?? 'Are you sure you want to delete this company? This action can only be completed if the company has no associated leads, client records, or communications.'
        }
        confirmLabel="Delete Company"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
        blockers={deleteBlockers}
      />
    </div>
  );
};
