import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const btn =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] font-semibold transition disabled:pointer-events-none disabled:opacity-35';

/** Page numbers around the current page, with gaps shown as null. */
function pageWindow(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
}

/** Numbered pagination for lists that are already fully loaded. */
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50] }) => {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          Showing <b className="font-semibold text-slate-800">{from}–{to}</b> of <b className="font-semibold text-slate-800">{total}</b>
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {count > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1 self-start sm:self-auto">
          <button type="button" className={`${btn} text-slate-500 hover:bg-white hover:shadow-sm`} disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" className={`${btn} text-slate-500 hover:bg-white hover:shadow-sm`} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, count).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} ${p === page ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" className={`${btn} text-slate-500 hover:bg-white hover:shadow-sm`} disabled={page >= count} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className={`${btn} text-slate-500 hover:bg-white hover:shadow-sm`} disabled={page >= count} onClick={() => onPageChange(count)} aria-label="Last page">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
};

interface CursorPagerProps {
  /** 1-based number of the page being shown. */
  page: number;
  shown: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
  prevId?: string;
  nextId?: string;
}

/** Previous / Next for lists the server pages with a cursor (no total, so no page numbers). */
export const CursorPager: React.FC<CursorPagerProps> = ({ page, shown, hasPrev, hasNext, onPrev, onNext, pageSize, onPageSizeChange, pageSizes = [10, 25, 50], prevId, nextId }) => (
  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span>
        <b className="font-semibold text-slate-800">{shown}</b> {shown === 1 ? 'item' : 'items'} on this page
      </span>
      {pageSize !== undefined && onPageSizeChange && (
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15"
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>

    <nav aria-label="Pagination" className="flex items-center gap-1 self-start sm:self-auto">
      <button id={prevId} type="button" disabled={!hasPrev} onClick={onPrev} aria-label="Previous page" className={`${btn} gap-1 pr-3 text-slate-600 hover:bg-white hover:shadow-sm`}>
        <ChevronLeft className="h-4 w-4" /> Previous
      </button>
      <span className={`${btn} bg-blue-600 text-white shadow-sm shadow-blue-600/30`} aria-current="page">
        {page}
      </span>
      <button id={nextId} type="button" disabled={!hasNext} onClick={onNext} aria-label="Next page" className={`${btn} gap-1 pl-3 text-slate-600 hover:bg-white hover:shadow-sm`}>
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  </div>
);
