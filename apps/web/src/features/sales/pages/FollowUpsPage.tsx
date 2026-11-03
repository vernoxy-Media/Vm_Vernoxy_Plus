import React, { useState, useMemo } from 'react';
import {
  Calendar,
  
  
  
  Download,
  Plus,
  RefreshCw,
  
  AlertCircle,
  
} from 'lucide-react';
import { useSalesFollowUpControllerList } from '@vernoxy-pulse/api-client';

import { FollowUpToolbar } from '../components/follow-ups/FollowUpToolbar';
import { FollowUpRow } from '../components/follow-ups/FollowUpRow';
import { FollowUpFilterDrawer, FollowUpFilterState } from '../components/follow-ups/FollowUpFilterDrawer';
import { CompleteFollowUpModal } from '../components/follow-ups/CompleteFollowUpModal';
import { RescheduleFollowUpModal } from '../components/follow-ups/RescheduleFollowUpModal';
import { CancelFollowUpModal } from '../components/follow-ups/CancelFollowUpModal';
import { ScheduleFollowUpModal } from '../components/follow-ups/ScheduleFollowUpModal';
import { ExportModal } from '../components/export/ExportModal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

import { useDebounce } from '../hooks/useDebounce';
import { useSalesRights } from '../hooks/useSalesRights';
import { parseApiError } from '../utils/error';
import type {
  FollowUpListResponse,
  
  FollowUpTabType,
  SalesFollowUpItem,
  SalesFollowUpControllerListParams,
} from '../types/sales.types';

const TAB_TONES: Record<string, { dot: string; ring: string; badge: string }> = {
  today: { dot: 'bg-amber-500', ring: 'ring-amber-200', badge: 'bg-amber-100 text-amber-700' },
  overdue: { dot: 'bg-rose-500', ring: 'ring-rose-200', badge: 'bg-rose-100 text-rose-700' },
  upcoming: { dot: 'bg-blue-500', ring: 'ring-blue-200', badge: 'bg-blue-100 text-blue-700' },
  completed: { dot: 'bg-emerald-500', ring: 'ring-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  cancelled: { dot: 'bg-slate-400', ring: 'ring-slate-200', badge: 'bg-slate-200 text-slate-600' },
};

export const FollowUpsPage: React.FC = () => {
  const { canExport } = useSalesRights();

  // Tab: today | overdue | upcoming | completed | cancelled
  const [activeTab, setActiveTab] = useState<FollowUpTabType>('today');

  // Search
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FollowUpFilterState>({
    assigned_to: '',
    type: '',
    city: '',
    industry: '',
    date_after: '',
    date_before: '',
  });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<SalesFollowUpItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<SalesFollowUpItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesFollowUpItem | null>(null);

  // Query parameters
  const queryParams = useMemo(() => {
    const params: SalesFollowUpControllerListParams = {
      tab: activeTab,
      page,
      limit: pageSize,
      q: debouncedSearch.trim() || undefined,
      assigned_to: filters.assigned_to || undefined,
      type: filters.type || undefined,
      city: filters.city || undefined,
      industry_ids: filters.industry || undefined,
      date_from: filters.date_after || undefined,
      date_to: filters.date_before || undefined,
    };
    return params;
  }, [activeTab, page, pageSize, debouncedSearch, filters]);

  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSalesFollowUpControllerList(queryParams);

  const listData: FollowUpListResponse = (
    (rawData as unknown as { data?: FollowUpListResponse })?.data ??
    (rawData as unknown as FollowUpListResponse) ?? {
      items: [],
      total: 0,
      page: 1,
      limit: pageSize,
      total_pages: 1,
      tab_counts: {
        today: 0,
        upcoming: 0,
        overdue: 0,
        completed: 0,
        cancelled: 0,
      },
    }
  );

  const followUps = listData.items || [];
  const tabCounts = listData.tab_counts || {
    today: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
    cancelled: 0,
  };
  const totalItems = listData.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Count active drawer filters
  const activeDrawerFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.assigned_to) count++;
    if (filters.type) count++;
    if (filters.city) count++;
    if (filters.industry) count++;
    if (filters.date_after || filters.date_before) count++;
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
    const pageIds = followUps.map((f) => f.follow_up_id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const isAllCurrentPageSelected =
    followUps.length > 0 && followUps.every((f) => selectedIds.includes(f.follow_up_id));

  const tabs: Array<{ id: FollowUpTabType; label: string; count: number; color?: string }> = [
    { id: 'today', label: 'Due Today', count: tabCounts.today || 0, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { id: 'overdue', label: 'Overdue', count: tabCounts.overdue || 0, color: 'text-red-700 bg-red-50 border-red-200' },
    { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming || 0, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { id: 'completed', label: 'Completed', count: tabCounts.completed || 0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled || 0, color: 'text-gray-700 bg-gray-50 border-gray-200' },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Follow-ups</h1>
          <p className="mt-0.5 hidden text-sm text-gray-500 2xl:block">Calls, visits, emails and meetings that are planned, due or done.</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            disabled={!canExport}
            title={!canExport ? 'You do not have permission to export' : 'Export follow-up schedule'}
            aria-label="Export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span className="hidden sm:inline">Export</span>
            {selectedIds.length > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{selectedIds.length}</span>}
          </button>

          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>

      {/* Tabs: each has its own colour */}
      <div role="tablist" aria-label="Follow-up status" className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl bg-gray-100/80 p-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const tone = TAB_TONES[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-semibold transition-all ${
                isActive ? `bg-white shadow-sm ring-1 ${tone.ring} text-gray-900` : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? tone.badge : 'bg-white text-gray-500'}`}>{tab.count.toLocaleString('en-IN')}</span>
            </button>
          );
        })}
      </div>

      <FollowUpToolbar
        search={searchInput}
        onSearch={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        filterCount={activeDrawerFiltersCount}
        onOpenFilters={() => setIsFilterOpen(true)}
        onRefresh={() => refetch()}
        refreshing={isFetching}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onExportSelected={() => setExportModalOpen(true)}
        canExport={canExport}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : isError ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-2xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Failed to load follow-ups</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
            {parseApiError(error).message || 'An error occurred while loading follow-up schedule.'}
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
      ) : followUps.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={
            searchInput || activeDrawerFiltersCount > 0
              ? 'No matching follow-ups found'
              : `No ${activeTab} follow-ups scheduled`
          }
          description={
            searchInput || activeDrawerFiltersCount > 0
              ? 'Try adjusting your search criteria or resetting active filters.'
              : 'You are all caught up! Schedule new follow-ups to maintain client relationship cadence.'
          }
          actionLabel="Schedule Follow-up"
          onAction={() => setScheduleModalOpen(true)}
        />
      ) : (
        <div className="lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-200/80 lg:bg-white lg:shadow-2xs">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="w-12 py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-3">Follow-up</th>
                  <th className="px-3 py-3">Company / Lead</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Due (IST)</th>
                  <th className="px-3 py-3">Assigned to</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((item) => (
                  <FollowUpRow
                    key={item.follow_up_id}
                    item={item}
                    isSelected={selectedIds.includes(item.follow_up_id)}
                    onToggleSelect={handleToggleSelect}
                    onComplete={(f) => setCompleteTarget(f)}
                    onReschedule={(f) => setRescheduleTarget(f)}
                    onCancel={(f) => setCancelTarget(f)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Stacked Card View */}
          <div className="space-y-3 lg:hidden">
            {followUps.map((item) => (
              <FollowUpRow variant="card"
                key={item.follow_up_id}
                item={item}
                isSelected={selectedIds.includes(item.follow_up_id)}
                onToggleSelect={handleToggleSelect}
                onComplete={(f) => setCompleteTarget(f)}
                onReschedule={(f) => setRescheduleTarget(f)}
                onCancel={(f) => setCancelTarget(f)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="px-1 py-3 lg:border-t lg:border-gray-200 lg:px-4">
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
      <FollowUpFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        onReset={() => {
          setFilters({
            assigned_to: '',
            type: '',
            city: '',
            industry: '',
            date_after: '',
            date_before: '',
          });
          setPage(1);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        type="follow_ups"
        selectedIds={selectedIds}
        currentFilters={queryParams as Record<string, unknown>}
      />

      {/* Schedule Modal */}
      <ScheduleFollowUpModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Complete Modal */}
      <CompleteFollowUpModal
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        followUp={completeTarget}
        onSuccess={() => refetch()}
      />

      {/* Reschedule Modal */}
      <RescheduleFollowUpModal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        followUp={rescheduleTarget}
        onSuccess={() => refetch()}
      />

      {/* Cancel Modal */}
      <CancelFollowUpModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        followUp={cancelTarget}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
