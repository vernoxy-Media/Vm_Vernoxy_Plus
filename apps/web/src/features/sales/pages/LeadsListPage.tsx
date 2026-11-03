import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import {
  
  
  
  Download,
  
  
  RefreshCw,
  X,
  AlertCircle,
  Plus,
  Users,
} from 'lucide-react';
import {
  useSalesLeadControllerList,
  useSalesLeadControllerBoard,
  
  useSalesLeadStatusControllerReopen,
} from '@vernoxy-pulse/api-client';

import { LeadQuickPanel } from '../components/leads/LeadQuickPanel';
import type { LeadCardAction } from '../components/leads/LeadKanbanCard';
import { LeadFilterDrawer, LeadFilterState } from '../components/leads/LeadFilterDrawer';
import { LeadRow } from '../components/leads/LeadRow';
import { LeadKanbanBoard } from '../components/leads/LeadKanbanBoard';
import { LeadSummaryStrip } from '../components/leads/LeadSummaryStrip';
import { LeadToolbar } from '../components/leads/LeadToolbar';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { QualifyModal } from '../components/leads/QualifyModal';
import { PutOnHoldModal } from '../components/leads/PutOnHoldModal';
import { MarkLostModal } from '../components/leads/MarkLostModal';
import { ExportModal } from '../components/export/ExportModal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

import { useDebounce } from '../hooks/useDebounce';
import { useSalesRights } from '../hooks/useSalesRights';
import { parseApiError } from '../utils/error';
import type {
  LeadListResponse,
  LeadListItem,
  LeadStatusType,
  LeadCounters,
  SalesLeadControllerListParams,
  SalesLeadControllerBoardParams,
  LeadBoardResponse,
} from '../types/sales.types';

export const LeadsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canExport } = useSalesRights();

  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const refreshAll = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/leads') });
  // Cards fetched per board column; grows as the user scrolls a column to its end (API limit: 100).
  const [perColumn, setPerColumn] = useState(30);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 3500);
  };

  // View mode (List vs Kanban)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  // Search
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Status Tab Filter
  const [activeTab, setActiveTab] = useState<LeadStatusType | 'All'>('All');
  // On a phone the board shows one status at a time, so "All Leads" is a plain list of every lead.
  const showBoard = viewMode === 'kanban' && !(isMobile && activeTab === 'All');

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState<'next_follow_up' | 'date_added' | 'company'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LeadFilterState>({
    lead_by: '',
    source: '',
    service_fit: '',
    city: '',
    industry: '',
    follow_up_filter: '',
    date_after: '',
    date_before: '',
    inactive_days: '',
  });

  // Row selection for Export
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals for status moves
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [qualifyTarget, setQualifyTarget] = useState<LeadListItem | null>(null);
  const [holdTarget, setHoldTarget] = useState<LeadListItem | null>(null);
  const [lostTarget, setLostTarget] = useState<LeadListItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** New -> Contacted is automatic: guide the user to log the first conversation instead. */
  const [logHint, setLogHint] = useState<LeadListItem | null>(null);

  // Reopen mutation
  const reopenMutation = useSalesLeadStatusControllerReopen({
    mutation: {
      onSuccess: () => {
        refreshAll();
        showToast('Lead reopened');
      },
      onError: (err: unknown) => {
        const parsed = parseApiError(err);
        setActionError(parsed.message || 'Failed to reopen lead');
      },
    },
  });

  // Construct query parameters
  const queryParams = useMemo(() => {
    const params: SalesLeadControllerListParams = {
      page: showBoard ? 1 : page,
      limit: showBoard ? 100 : pageSize, // the board loads more cards
      q: debouncedSearch.trim() || undefined,
      status: activeTab === 'All' ? 'all' : (activeTab as SalesLeadControllerListParams['status']),
      sort: sortBy,
      order: sortOrder,
      lead_by: filters.lead_by || undefined,
      lead_source: filters.source || undefined,
      service_fit: filters.service_fit || undefined,
      city: filters.city || undefined,
      industry_ids: filters.industry || undefined,
      follow_up: (filters.follow_up_filter || undefined) as SalesLeadControllerListParams['follow_up'],
      added_from: filters.date_after || undefined,
      added_to: filters.date_before || undefined,
      no_conversation_days: (filters.inactive_days ? Number(filters.inactive_days) : undefined) as SalesLeadControllerListParams['no_conversation_days'],
    };
    return params;
  }, [page, pageSize, showBoard, debouncedSearch, activeTab, sortBy, sortOrder, filters]);

  // Query leads
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSalesLeadControllerList(queryParams, { query: { enabled: !showBoard } });

  // The board has its own endpoint: every column gets its own cards and its own total.
  const boardParams = useMemo(() => {
    const { page: _p, limit: _l, status: _s, ...rest } = queryParams;
    void _p; void _l; void _s;
    return { ...rest, per_column: perColumn } as SalesLeadControllerBoardParams;
  }, [queryParams, perColumn]);
  const { data: boardRaw, isLoading: isBoardLoading, isError: isBoardError, error: boardError, refetch: refetchBoard, isFetching: isBoardFetching } =
    useSalesLeadControllerBoard(boardParams, {
      // Keep showing the current cards while more are fetched; otherwise the board is replaced by a loader and jumps back to the top.
      query: { enabled: showBoard, queryKey: ['/api/v1/sales/leads', 'board', boardParams], placeholderData: keepPreviousData },
    });
  const boardData = ((boardRaw as unknown as { data?: LeadBoardResponse })?.data ?? (boardRaw as unknown as LeadBoardResponse | undefined)) ?? null;

  const listData: LeadListResponse = (
    (rawData as unknown as { data?: LeadListResponse })?.data ??
    (rawData as unknown as LeadListResponse) ?? {
      items: [],
      total: 0,
      page: 1,
      page_size: pageSize,
      counters: {
        by_status: {
          New: 0,
          Contacted: 0,
          Qualified: 0,
          'On Hold': 0,
          Converted: 0,
          Lost: 0,
        },
        follow_ups_due_today: 0,
      },
    }
  );

  const leads = listData.items || [];
  const listCounters: LeadCounters = listData.counters || {
    by_status: {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      'On Hold': 0,
      Converted: 0,
      Lost: 0,
    },
    follow_ups_due_today: 0,
  };
  const counters: LeadCounters = showBoard && boardData?.counters ? boardData.counters : listCounters;
  const boardTotal = boardData ? boardData.columns.reduce((n, c) => n + c.count, 0) : 0;
  const totalItems = showBoard ? boardTotal : listData.total || 0;
  const loading = showBoard ? isBoardLoading : isLoading;
  const failed = showBoard ? isBoardError : isError;
  const failure = showBoard ? boardError : error;
  const fetching = showBoard ? isBoardFetching : isFetching;
  const reload = () => (showBoard ? refetchBoard() : refetch());
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const phoneBoard = showBoard && isMobile;
  const effectiveTab: LeadStatusType | 'All' = activeTab;
  const anyFilter = Object.values(filters).some(Boolean) || Boolean(searchInput);
  const clearAllFilters = () => {
    setFilters({ lead_by: '', source: '', service_fit: '', city: '', industry: '', follow_up_filter: '', date_after: '', date_before: '', inactive_days: '' });
    setSearchInput('');
    setPage(1);
  };

  // Count active drawer filters
  const activeDrawerFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.lead_by) count++;
    if (filters.source) count++;
    if (filters.service_fit) count++;
    if (filters.city) count++;
    if (filters.industry) count++;
    if (filters.follow_up_filter) count++;
    if (filters.date_after || filters.date_before) count++;
    if (filters.inactive_days) count++;
    return count;
  }, [filters]);

  // Toggle single row selection
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Toggle all on current page
  const handleToggleSelectAll = () => {
    const pageIds = leads.map((l) => l.lead_id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const isAllCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedIds.includes(l.lead_id));

  // Handle status drag move from Kanban
  const handleMoveLead = async (lead: LeadListItem, targetStatus: LeadStatusType) => {
    setActionError(null);
    setLogHint(null);

    if (lead.status === 'Converted') {
      setActionError('A converted lead is locked. It is now a client.');
    } else if (targetStatus === 'New') {
      setActionError('A lead cannot go back to New.');
    } else if (targetStatus === 'Contacted' && lead.status === 'New') {
      setLogHint(lead);
    } else if (targetStatus === 'Qualified' && lead.status === 'New') {
      setActionError('Log a conversation first. A lead has to be Contacted before it can be Qualified.');
    } else if (targetStatus === 'Qualified' && lead.status !== 'Contacted') {
      setActionError('Only a Contacted lead can be Qualified.');
    } else if (targetStatus === 'Qualified') {
      setQualifyTarget(lead);
    } else if (targetStatus === 'On Hold') {
      if (lead.status === 'Contacted' || lead.status === 'Qualified') setHoldTarget(lead);
      else setActionError('Only a Contacted or Qualified lead can be put on hold.');
    } else if (targetStatus === 'Lost') {
      if (lead.status === 'Lost') return;
      setLostTarget(lead);
    } else if (targetStatus === 'Converted') {
      if (lead.status === 'Qualified') navigate(`/sales/leads/${lead.lead_id}?action=won`);
      else setActionError('Only a Qualified lead can be marked as Won.');
    } else if ((lead.status === 'Lost' || lead.status === 'On Hold') && targetStatus === 'Contacted') {
      await reopenMutation.mutateAsync({ id: lead.lead_id });
    } else {
      setActionError(`A lead cannot move from ${lead.status} to ${targetStatus}.`);
    }
  };

  const handleCardAction = async (lead: LeadListItem, action: LeadCardAction) => {
    setActionError(null);
    setLogHint(null);
    if (action === 'open') navigate(`/sales/leads/${lead.lead_id}`);
    else if (action === 'log') navigate(`/sales/leads/${lead.lead_id}?action=log`);
    else if (action === 'won') navigate(`/sales/leads/${lead.lead_id}?action=won`);
    else if (action === 'qualify') setQualifyTarget(lead);
    else if (action === 'hold') setHoldTarget(lead);
    else if (action === 'lost') setLostTarget(lead);
    else if (action === 'reopen') await reopenMutation.mutateAsync({ id: lead.lead_id });
  };

  const dockedPanel = isDesktop && showBoard;

  return (
    <div className={showBoard ? 'flex h-[calc(100dvh-6rem)] min-h-[520px] flex-col gap-2.5' : 'space-y-4 pb-12'}>
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Sales Pipeline</h1>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-2.5">
          {/* Export Button (Rights Aware) */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            disabled={!canExport}
            title={!canExport ? 'You do not have permission to export' : 'Export sales lead records'}
            className="inline-flex flex-1 items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-all h-10 sm:flex-none"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export</span>
            {selectedIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                {selectedIds.length}
              </span>
            )}
          </button>

          {/* Add Company / Lead CTA */}
          <Link
            to="/sales/companies"
            className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all h-10 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            <span className="sm:hidden">New lead</span>
            <span className="hidden sm:inline">New Lead from Company</span>
          </Link>
        </div>
      </div>

      <LeadSummaryStrip
        counters={counters}
        isLoading={loading}
        active={activeTab}
        onSelect={(stage) => {
          setActiveTab(stage);
          setPage(1);
        }}
      />

      {/* Guide: New -> Contacted happens by itself */}
      {logHint && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">{logHint.company?.name} moves to Contacted by itself</p>
              <p className="mt-0.5 text-blue-800">Log the first conversation with them and the lead will move to Contacted automatically.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/sales/leads/${logHint.lead_id}?action=log`)}
              className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Log conversation
            </button>
            <button type="button" onClick={() => setLogHint(null)} className="rounded p-1 text-blue-500 hover:text-blue-800" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Error Alert */}
      {actionError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-start justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">This move is not possible</p>
              <p className="mt-0.5">{actionError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-800 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <LeadToolbar
        search={searchInput}
        onSearch={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        quick={{ lead_by: filters.lead_by, follow_up_filter: filters.follow_up_filter }}
        onQuickChange={(patch) => {
          setFilters((f) => ({ ...f, ...patch }));
          setPage(1);
        }}
        onClearAll={clearAllFilters}
        hasAnyFilter={anyFilter}
        drawerFilterCount={activeDrawerFiltersCount}
        onOpenFilters={() => setIsFilterOpen(true)}
        sort={`${sortBy}-${sortOrder}`}
        onSort={(value) => {
          const [field, order] = value.split('-') as ['next_follow_up' | 'date_added' | 'company', 'asc' | 'desc'];
          setSortBy(field);
          setSortOrder(order);
          setPage(1);
        }}
        onRefresh={() => reload()}
        refreshing={fetching}
        viewMode={viewMode}
        onViewMode={setViewMode}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onExportSelected={() => setExportModalOpen(true)}
        canExport={canExport}
      />

      {/* Main Content Area */}
      {loading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : failed ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-2xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Failed to load leads</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
            {parseApiError(failure).message || 'An error occurred while loading leads data.'}
          </p>
          <button
            type="button"
            onClick={() => reload()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : totalItems === 0 && (showBoard || leads.length === 0) ? (
        <EmptyState
          icon={Users}
          title={
            searchInput || activeDrawerFiltersCount > 0 || activeTab !== 'All'
              ? 'No matching leads found'
              : 'No leads in this stage'
          }
          description={
            searchInput || activeDrawerFiltersCount > 0 || activeTab !== 'All'
              ? 'Try adjusting your search criteria or resetting active filters.'
              : 'Convert target companies to active leads to start nurturing sales pipeline opportunities.'
          }
          actionLabel={
            searchInput || activeDrawerFiltersCount > 0 || activeTab !== 'All'
              ? 'Reset All Filters'
              : 'Browse Companies'
          }
          onAction={
            searchInput || activeDrawerFiltersCount > 0 || activeTab !== 'All'
              ? () => {
                  setSearchInput('');
                  setActiveTab('All');
                  setFilters({
                    lead_by: '',
                    source: '',
                    service_fit: '',
                    city: '',
                    industry: '',
                    follow_up_filter: '',
                    date_after: '',
                    date_before: '',
                    inactive_days: '',
                  });
                  setPage(1);
                }
              : () => navigate('/sales/companies')
          }
        />
      ) : showBoard ? (
        /* Kanban Board View, with the lead panel docked beside it on large screens */
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="min-h-0 min-w-0 flex-1">
            <LeadKanbanBoard
              columns={boardData?.columns ?? []}
              onlyStatus={effectiveTab === 'All' ? null : effectiveTab}
              onMoveLead={handleMoveLead}
              selectedLeadId={selectedLeadId}
              onView={(l) => setSelectedLeadId(l.lead_id)}
              onAction={handleCardAction}
              single={phoneBoard}
              canLoadMore={perColumn < 100}
              loadingMore={isBoardFetching}
              onLoadMore={() => {
                if (!isBoardFetching) setPerColumn((p) => Math.min(p + 30, 100));
              }}
            />
          </div>
          {dockedPanel && selectedLeadId !== null && (
            <>
              {/* Makes room for the panel, which sits on the window edge */}
              <div className="hidden w-[26rem] shrink-0 lg:block xl:w-[30rem] 2xl:w-[34rem]" aria-hidden="true" />
              <div className="fixed bottom-0 right-0 top-16 z-20 hidden w-[28rem] lg:block xl:w-[32rem] 2xl:w-[36rem]">
                <LeadQuickPanel key={selectedLeadId} leadId={selectedLeadId} docked onClose={() => setSelectedLeadId(null)} onAction={handleCardAction} />
              </div>
            </>
          )}
        </div>
      ) : (
        /* List Table View */
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-gray-300 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="py-3 px-4">Lead Code</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Lead By</th>
                  <th className="py-3 px-4">Service Fit</th>
                  <th className="py-3 px-4">Date Added</th>
                  <th className="py-3 px-4">Next Follow-up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <LeadRow
                    key={lead.lead_id}
                    lead={lead}
                    isSelected={selectedIds.includes(lead.lead_id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Stacked Card View */}
          <div className="lg:hidden divide-y divide-gray-100">
            {leads.map((lead) => (
              <LeadRow variant="card"
                key={lead.lead_id}
                lead={lead}
                isSelected={selectedIds.includes(lead.lead_id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 px-4 py-3">
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
      <LeadFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        onReset={() => {
          setFilters({
            lead_by: '',
            source: '',
            service_fit: '',
            city: '',
            industry: '',
            follow_up_filter: '',
            date_after: '',
            date_before: '',
            inactive_days: '',
          });
          setPage(1);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        type="leads"
        selectedIds={selectedIds}
        currentFilters={queryParams as Record<string, unknown>}
      />

      {/* Qualify Modal */}
      {qualifyTarget && (
        <QualifyModal
          isOpen={Boolean(qualifyTarget)}
          onClose={() => setQualifyTarget(null)}
          leadId={qualifyTarget.lead_id}
          leadCode={qualifyTarget.lead_code || undefined}
          companyName={qualifyTarget.company?.name}
          initialServiceFit={qualifyTarget.service_fit}
          onSuccess={() => {
            setQualifyTarget(null);
            refreshAll();
            showToast('Lead moved to Qualified');
          }}
        />
      )}

      {/* Put on Hold Modal */}
      {holdTarget && (
        <PutOnHoldModal
          isOpen={Boolean(holdTarget)}
          onClose={() => setHoldTarget(null)}
          leadId={holdTarget.lead_id}
          leadCode={holdTarget.lead_code || undefined}
          companyName={holdTarget.company?.name}
          onSuccess={() => {
            setHoldTarget(null);
            refreshAll();
            showToast('Lead put on hold');
          }}
        />
      )}

      {/* Mark Lost Modal */}
      {lostTarget && (
        <MarkLostModal
          isOpen={Boolean(lostTarget)}
          onClose={() => setLostTarget(null)}
          leadId={lostTarget.lead_id}
          leadCode={lostTarget.lead_code || undefined}
          companyName={lostTarget.company?.name}
          onSuccess={() => {
            setLostTarget(null);
            refreshAll();
            showToast('Lead marked as Lost');
          }}
        />
      )}
      {!dockedPanel && selectedLeadId !== null && (
        <LeadQuickPanel key={selectedLeadId} leadId={selectedLeadId} docked={false} onClose={() => setSelectedLeadId(null)} onAction={handleCardAction} />
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};
