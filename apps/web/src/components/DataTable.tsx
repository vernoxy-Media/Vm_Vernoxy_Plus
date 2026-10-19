import React from 'react';
import { Loader2 } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  maxHeight?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyText = 'No records found',
  onRowClick,
  className = '',
  maxHeight = 'max-h-[600px]',
}: DataTableProps<T>) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs ${className}`}>
      <div className={`overflow-x-auto overflow-y-auto ${maxHeight}`}>
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.headerClassName || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-xs">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={(row.id as any) || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className || ''}`}>
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
