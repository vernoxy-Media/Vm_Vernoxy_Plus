import React from 'react';
import { Award, ChevronRight } from 'lucide-react';
import { useMyReviewsListQuery } from '../hooks/use-performance';
import { CycleStatusBadge, StarsValue, fmtDateTime, windowLabel } from './perf-ui';

const SELF_STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: 'Submitted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DRAFT: { label: 'Draft saved', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REOPENED: { label: 'Opened again', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PENDING: { label: 'Not started', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

/**
 * Self Review, first view: one row per cycle. Clicking a row (or its title) opens the full review.
 */
export const MyReviewsList: React.FC<{ onOpen: (cycleId: number) => void }> = ({ onOpen }) => {
  const { data: rows = [], isLoading } = useMyReviewsListQuery();
  const sorted = [...rows].sort((a, b) => (b.cycle.start_date || '').localeCompare(a.cycle.start_date || ''));

  if (isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading…</div>;
  if (sorted.length === 0) {
    return (
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <Award className="mx-auto h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">You have no reviews yet.</p>
        <p className="text-xs text-slate-500">A review appears here when a review cycle opens for you.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Review</th>
            <th className="hidden px-4 py-3 md:table-cell">Review window</th>
            <th className="px-4 py-3">My review</th>
            <th className="hidden px-4 py-3 sm:table-cell">My average</th>
            <th className="px-4 py-3">Final Rating</th>
            <th className="w-8 px-2 py-3" aria-hidden />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((r) => {
            const st = SELF_STATUS[r.self_status] || SELF_STATUS.PENDING;
            return (
              <tr key={r.review_id} onClick={() => onOpen(r.cycle.cycle_id)} className="cursor-pointer transition hover:bg-blue-50/40">
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r.cycle.cycle_id);
                    }}
                    className="flex items-center gap-2 text-left font-semibold text-slate-900 hover:text-blue-700 hover:underline"
                  >
                    {r.cycle.cycle_name}
                    <CycleStatusBadge status={r.cycle.status} />
                  </button>
                  <div className="mt-0.5 text-[11px] text-slate-500">Period: {windowLabel(r.cycle.start_date, r.cycle.end_date)}</div>
                </td>
                <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">{windowLabel(r.cycle.review_start_date, r.cycle.review_end_date)}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  {r.self_submitted_at && <div className="mt-0.5 text-[10px] text-slate-400">{fmtDateTime(r.self_submitted_at)}</div>}
                </td>
                <td className="hidden px-4 py-3.5 sm:table-cell">{r.self_avg_rating !== null ? <StarsValue value={r.self_avg_rating} /> : <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-3.5">
                  {r.final_rating !== null ? <StarsValue value={r.final_rating} /> : <span className="font-semibold text-amber-700">Pending</span>}
                </td>
                <td className="px-2 py-3.5 text-slate-400">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
