import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { RowActionsMenu, type RowAction } from '@/shared/ui/RowActionsMenu';
import { Pagination, CursorPager } from '@/shared/ui/Pagination';

export interface MasterDataColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (item: T) => React.ReactNode;
}

export interface MasterDataFilterOption {
  value: string;
  label: string;
}

export interface MasterDataPageProps<T> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  addLabel: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  statusFilter?: boolean;
  onStatusFilterChange?: (val: boolean | undefined) => void;
  extraFilters?: React.ReactNode;
  columns: MasterDataColumn<T>[];
  items: T[];
  getItemKey: (item: T) => string | number;
  isLoading: boolean;
  error?: string | null;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  nextCursor?: string | number | null;
  onNextPage?: () => void;
  /** Only for lists the server pages with a cursor. */
  onPrevPage?: () => void;
  page?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onAdd: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  canDelete?: (item: T) => boolean;
  canEdit?: (item: T) => boolean;
  extraActions?: (item: T) => React.ReactNode;
  tableId?: string;
}

export function MasterDataPage<T>({
  title,
  description,
  icon,
  addLabel,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  extraFilters,
  columns,
  items,
  getItemKey,
  isLoading,
  error,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyDescription = 'Get started by creating your first entry.',
  nextCursor,
  onNextPage,
  onPrevPage,
  page: serverPage = 1,
  pageSize: serverPageSize,
  onPageSizeChange: onServerPageSizeChange,
  onAdd,
  onEdit,
  onDelete,
  canDelete = () => true,
  canEdit = () => true,
  extraActions,
  tableId = 'master-data-table',
}: MasterDataPageProps<T>) {
  const hasActions = Boolean(onEdit || onDelete || extraActions);

  // A list the server pages with a cursor is shown as it comes; a full list is paged here
  const serverPaged = Boolean(onNextPage);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [searchValue, statusFilter, pageSize]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = serverPaged ? items : items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const actionsFor = (item: T) => {
    const actions: RowAction[] = [];
    if (onEdit && canEdit(item)) actions.push({ label: 'Edit', icon: Edit2, onClick: () => onEdit(item) });
    if (onDelete && canDelete(item)) actions.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(item) });
    return (
      <>
        {extraActions?.(item)}
        <RowActionsMenu actions={actions} label="Row actions" />
      </>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">{icon}</span>}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-hidden focus:ring-4 focus:ring-blue-600/20 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {addLabel}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          {extraFilters}
        </div>

        {onStatusFilterChange && (
          <div role="group" aria-label="Status" className="inline-flex self-start rounded-xl bg-slate-100 p-1 text-[13px] font-semibold md:self-auto">
            {([['All', undefined, 'text-blue-700'], ['Active', true, 'text-emerald-700'], ['Inactive', false, 'text-slate-800']] as const).map(([label, value, on]) => (
              <button
                key={label}
                type="button"
                onClick={() => onStatusFilterChange(value)}
                className={`rounded-lg px-3.5 py-1.5 transition ${statusFilter === value ? `bg-white shadow-sm ${on}` : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-500">Loading {title.toLowerCase()}...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-14 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-800">Failed to load data</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-16 text-center">
            {emptyIcon && <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">{emptyIcon}</div>}
            <h3 className="text-base font-semibold text-slate-800">{emptyTitle}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{emptyDescription}</p>
          </div>
        ) : (
          <>
            {/* Small screens: one card per row */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((item) => (
                <li key={getItemKey(item)} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{columns[0]?.render(item)}</div>
                    {hasActions && <div className="flex shrink-0 items-center gap-1">{actionsFor(item)}</div>}
                  </div>
                  {columns.length > 1 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      {columns.slice(1).map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{col.header}</dt>
                          <dd className="mt-0.5 text-sm text-slate-700">{col.render(item)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>

            <div className="hidden max-h-[calc(100vh-380px)] min-h-[320px] overflow-auto md:block">
              <table className="relative w-full min-w-[560px] text-left text-sm" id={tableId}>
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {columns.map((col) => (
                      <th key={col.key} className={`whitespace-nowrap px-5 py-3 ${col.align === 'right' ? 'text-right' : ''}`}>
                        {col.header}
                      </th>
                    ))}
                    {hasActions && <th className="w-px whitespace-nowrap px-5 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((item) => {
                    const key = getItemKey(item);
                    return (
                      <tr key={key} id={`row-${key}`} className="transition-colors hover:bg-blue-50/30">
                        {columns.map((col) => (
                          <td key={col.key} className={`px-5 py-3.5 text-slate-600 ${col.align === 'right' ? 'text-right' : ''}`}>
                            {col.render(item)}
                          </td>
                        ))}
                        {hasActions && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">{actionsFor(item)}</div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!isLoading && !error && items.length > 0 &&
          (serverPaged ? (
            <CursorPager
              page={serverPage}
              shown={items.length}
              hasPrev={serverPage > 1}
              hasNext={Boolean(nextCursor)}
              onPrev={() => onPrevPage?.()}
              onNext={() => onNextPage?.()}
              pageSize={serverPageSize}
              onPageSizeChange={onServerPageSizeChange}
            />
          ) : (
            <Pagination page={safePage} pageSize={pageSize} total={items.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          ))}
      </div>
    </div>
  );
}
