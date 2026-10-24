import React from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

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
  onAdd,
  onEdit,
  onDelete,
  canDelete = () => true,
  canEdit = () => true,
  extraActions,
  tableId = 'master-data-table',
}: MasterDataPageProps<T>) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </button>
      </div>

      {/* Filter Row (stitched / sticky to top) */}
      <div className="sticky top-16 lg:top-0 z-20 bg-[#f4f6fa]/95 backdrop-blur-xs py-1">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
          {extraFilters}
        </div>

        {onStatusFilterChange && (
          <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200 text-xs font-medium self-start md:self-auto">
            <button
              type="button"
              onClick={() => onStatusFilterChange(undefined)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === undefined ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange(true)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === true ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange(false)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === false ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>
        )}
      </div>
    </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading {title.toLowerCase()}...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-600 px-4">
            <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold text-xs">Failed to load data</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center px-4">
            {emptyIcon && <div className="text-slate-300 mx-auto mb-2 flex justify-center">{emptyIcon}</div>}
            <h3 className="text-sm font-semibold text-slate-800">{emptyTitle}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{emptyDescription}</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] min-h-[350px]">
            <table className="w-full text-left text-xs relative" id={tableId}>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider shadow-2xs">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={`py-3 px-5 ${col.align === 'right' ? 'text-right' : ''}`}>
                      {col.header}
                    </th>
                  ))}
                  {(onEdit || onDelete || extraActions) && <th className="py-3 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const key = getItemKey(item);
                  return (
                    <tr key={key} id={`row-${key}`} className="hover:bg-slate-50/60 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={`py-3.5 px-5 ${col.align === 'right' ? 'text-right' : ''}`}>
                          {col.render(item)}
                        </td>
                      ))}
                      {(onEdit || onDelete || extraActions) && (
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {extraActions?.(item)}
                            {onEdit && canEdit(item) && (
                              <button
                                type="button"
                                onClick={() => onEdit(item)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDelete && canDelete(item) && (
                              <button
                                type="button"
                                onClick={() => onDelete(item)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Keyset Pagination */}
        {nextCursor && onNextPage && (
          <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end">
            <button
              type="button"
              onClick={onNextPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-100 transition-colors"
            >
              Next Page
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
