import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Star } from 'lucide-react';
import {
  PerfSummaryItem,
  ReviewPart,
  perfErrMessage,
  perfFieldErrors,
  usePerfSummaryQuery,
  useReopenReviewMutation,
} from '../hooks/use-performance';
import { Banner, ErrorNote, PerfModal, StarsValue, btn, inputCls, one } from './perf-ui';

/** BFD Screen 7: Rating Summary (Admin). */
export const RatingSummaryTab: React.FC<{
  cycleId?: number;
  departments: Array<{ dep_id: number; name: string }>;
  onRate: (empId: number) => void;
}> = ({ cycleId, departments, onRate }) => {
  const [depId, setDepId] = useState<number | undefined>();
  const { data, isLoading, error } = usePerfSummaryQuery({ cycle_id: cycleId, department_id: depId });
  const [reopenFor, setReopenFor] = useState<PerfSummaryItem | null>(null);

  const closed = data?.cycle?.status === 'CLOSED';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Department</label>
          <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} className={`${inputCls} min-w-[180px]`}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.dep_id} value={d.dep_id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-6 ml-auto">
          <Count label="Employees" value={data?.counts.employees} />
          <Count label="Completed" value={data?.counts.completed} tone="text-emerald-700" />
          <Count label="Pending" value={data?.counts.pending} tone="text-amber-600" />
        </div>
      </div>

      {error && <Banner tone="error">{perfErrMessage(error)}</Banner>}
      {data && data.missing_manager_employees.length > 0 && (
        <Banner tone="warn">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
          {data.missing_manager_employees.length} employee(s) have no Reporting Manager:{' '}
          {data.missing_manager_employees.map((m) => m.name).join(', ')}. Please set one in Employee Details.
        </Banner>
      )}
      {data && data.departments_without_form.length > 0 && (
        <Banner tone="warn">
          No form is available for these departments: {data.departments_without_form.join(', ')}. Add a form or choose All departments.
        </Banner>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[860px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Employee</th>
              <th className="text-left px-3 py-3">Dept</th>
              <th className="text-left px-3 py-3">Self</th>
              <th className="text-left px-3 py-3">Manager</th>
              <th className="text-left px-3 py-3">Admin</th>
              <th className="text-left px-3 py-3">Final Rating</th>
              <th className="text-left px-3 py-3">Project</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  No employees in this cycle.
                </td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr key={r.emp_id} className="hover:bg-slate-50/60 align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800">{r.name}</div>
                  <div className="text-[10px] text-slate-500">{r.emp_code}</div>
                </td>
                <td className="px-3 py-3 text-slate-600">{r.department_name}</td>
                <td className="px-3 py-3">{one(r.self_avg)}</td>
                <td className="px-3 py-3">{one(r.manager_avg)}</td>
                <td className="px-3 py-3">{one(r.admin_avg)}</td>
                <td className="px-3 py-3">{r.final_rating !== null ? <StarsValue value={r.final_rating} /> : <span className="text-slate-500">Pending</span>}</td>
                <td className="px-3 py-3">{one(r.project_avg)}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      r.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {r.status === 'COMPLETE' ? 'Complete' : 'Pending'}
                  </span>
                  {r.pending_by.length > 0 && <div className="text-[10px] text-slate-500 mt-1">Waiting for: {r.pending_by.join(', ')}</div>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                  {r.has_form && r.admin_status !== 'SUBMITTED' && (
                    <button type="button" className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5" onClick={() => onRate(r.emp_id)}>
                      <Star className="w-3 h-3" /> Rate
                    </button>
                  )}
                  {r.review_id && (closed || r.self_status === 'SUBMITTED' || r.manager_status === 'SUBMITTED' || r.admin_status === 'SUBMITTED') && (
                    <button type="button" className="text-[11px] font-semibold text-violet-600 hover:underline inline-flex items-center gap-0.5 ml-2" onClick={() => setReopenFor(r)}>
                      <RotateCcw className="w-3 h-3" /> Open again
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2.5 text-[11px] text-slate-500 border-t border-slate-100">
          Final Rating = (Self + Manager + Admin) ÷ 3. Project rating is shown separately.
        </p>
      </div>

      {reopenFor && <ReopenModal item={reopenFor} closed={closed} onClose={() => setReopenFor(null)} />}
    </div>
  );
};

const Count: React.FC<{ label: string; value?: number; tone?: string }> = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="text-right">
    <div className="text-[11px] text-slate-500">{label}</div>
    <div className={`text-xl font-extrabold ${tone}`}>{value ?? '—'}</div>
  </div>
);

/** BFD 5 / 15.3: only Admin can open a submitted (or missed) review again, for one person. */
const ReopenModal: React.FC<{ item: PerfSummaryItem; closed: boolean; onClose: () => void }> = ({ item, closed, onClose }) => {
  const reopen = useReopenReviewMutation();
  const options: Array<{ part: ReviewPart; label: string; status: string }> = [
    { part: 'SELF', label: `Self review (${item.name})`, status: item.self_status },
    { part: 'MANAGER', label: `Reporting Manager review${item.manager_name ? ` (${item.manager_name})` : ''}`, status: item.manager_status },
    { part: 'ADMIN', label: 'Admin review', status: item.admin_status },
  ].filter((o) => o.status === 'SUBMITTED' || (closed && o.status === 'PENDING')) as any;
  const [part, setPart] = useState<ReviewPart | ''>(options[0]?.part || '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const go = async () => {
    const e: Record<string, string> = {};
    if (!part) e.part = 'Please choose which review to open again.';
    if (!reason.trim()) e.reason = 'Please enter the reason.';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await reopen.mutateAsync({ reviewId: item.review_id!, part: part as ReviewPart, reason: reason.trim() });
      onClose();
    } catch (err) {
      setErrors(perfFieldErrors(err));
      setError(perfErrMessage(err));
    }
  };

  return (
    <PerfModal
      title={`Open review again — ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.primary} disabled={reopen.isPending || !options.length} onClick={go}>
            Open again
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {options.length === 0 ? (
          <p className="text-xs text-slate-600">There is nothing to open again for this employee yet.</p>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Review *</label>
              <div className="space-y-1.5">
                {options.map((o) => (
                  <label key={o.part} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="radio" checked={part === o.part} onChange={() => setPart(o.part)} />
                    {o.label}
                  </label>
                ))}
              </div>
              <ErrorNote text={errors.part} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Reason *</label>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={inputCls} />
              <ErrorNote text={errors.reason} />
            </div>
            {error && !Object.keys(errors).length && <Banner tone="error">{error}</Banner>}
          </>
        )}
      </div>
    </PerfModal>
  );
};
