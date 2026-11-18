import React, { useEffect, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { useAssignCompanies, useCampaignWorkload, useSetTargets } from '../../hooks/useCampaigns';
import { parseApiError } from '../../utils/error';
import { ProgressBar, cardCls, inputCls, primaryBtn, secondaryBtn } from './campaign-ui';

interface Props {
  campaignId: number;
  disabled?: boolean;
  onShowUnassigned: () => void;
}

export const AssignPanel: React.FC<Props> = ({ campaignId, disabled, onShowUnassigned }) => {
  const { data, isLoading, isError, error } = useCampaignWorkload(campaignId);
  const setTargets = useSetTargets(campaignId);
  const assign = useAssignCompanies(campaignId);
  const [targets, setTargetState] = useState<Record<number, string>>({});
  const [picked, setPicked] = useState<number[]>([]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const rows = data?.workload ?? [];
  const unassigned = data?.unassigned_companies ?? 0;

  // Start the inputs from what is saved, and again whenever the saved numbers change.
  useEffect(() => {
    setTargetState(Object.fromEntries(rows.map((r) => [r.emp_id, String(r.daily_target)])));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = rows.filter((r) => {
    const v = targets[r.emp_id];
    return v !== undefined && v !== '' && Number(v) !== r.daily_target;
  });
  const invalid = Object.values(targets).some((v) => v !== '' && (!/^\d+$/.test(v) || Number(v) > 1000));
  const totalTarget = rows.reduce((n, r) => n + (Number(targets[r.emp_id] ?? r.daily_target) || 0), 0);

  const saveTargets = () => {
    setMessage(null);
    setTargets.mutate(
      changed.map((r) => ({ emp_id: r.emp_id, daily_target: Number(targets[r.emp_id]) })),
      {
        onSuccess: () => setMessage({ tone: 'ok', text: 'Daily targets saved.' }),
        onError: (e) => setMessage({ tone: 'error', text: parseApiError(e).message }),
      },
    );
  };

  const share = () => {
    setMessage(null);
    assign.mutate(
      { mode: 'equal', emp_ids: picked },
      {
        onSuccess: (r) => {
          setMessage({ tone: 'ok', text: `${r.assigned} ${r.assigned === 1 ? 'company' : 'companies'} shared equally.` });
          setPicked([]);
        },
        onError: (e) => setMessage({ tone: 'error', text: parseApiError(e).message }),
      },
    );
  };

  const togglePick = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (isLoading) return <p className="py-8 text-center text-sm text-gray-500">Loading…</p>;
  if (isError) return <p role="alert" className="py-8 text-center text-sm text-rose-600">{parseApiError(error).message}</p>;

  return (
    <div className="space-y-4">
      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-3 py-2 text-sm ${message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          {message.text}
        </div>
      )}

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Share companies equally</h3>
            <p className="text-sm text-gray-500">
              {unassigned > 0 ? (
                <>
                  <span className="font-semibold text-amber-700">{unassigned.toLocaleString('en-IN')}</span> {unassigned === 1 ? 'company is' : 'companies are'} not assigned.{' '}
                  <button type="button" className="text-blue-600 underline" onClick={onShowUnassigned}>
                    View them
                  </button>
                </>
              ) : (
                'Every company is assigned.'
              )}
            </p>
          </div>
          <button type="button" className={primaryBtn} onClick={share} disabled={disabled || picked.length === 0 || unassigned === 0 || assign.isPending}>
            <Users className="h-4 w-4" />
            {picked.length > 0 && unassigned > 0 ? `Share ${unassigned} between ${picked.length}` : 'Share equally'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">Tick the employees in the table below, then share. To pick companies by hand, select them in the Companies tab and use "Assign to".</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-10 px-3 py-3"><span className="sr-only">Share with</span></th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Assigned</th>
              <th className="px-3 py-3">Called</th>
              <th className="px-3 py-3">Pending</th>
              <th className="px-3 py-3">Calls per day</th>
              <th className="px-3 py-3">Today</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No Sales employees found.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.emp_id}>
                  <td className="px-3 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" aria-label={`Share with ${r.name}`} checked={picked.includes(r.emp_id)} onChange={() => togglePick(r.emp_id)} disabled={disabled} />
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900">{r.name}</td>
                  <td className="px-3 py-3 text-gray-700">{r.assigned}</td>
                  <td className="px-3 py-3 text-gray-700">{r.called}</td>
                  <td className="px-3 py-3 text-gray-700">{r.pending}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      className={`${inputCls} !h-9 w-24`}
                      aria-label={`Daily call target of ${r.name}`}
                      value={targets[r.emp_id] ?? ''}
                      onChange={(e) => setTargetState((t) => ({ ...t, [r.emp_id]: e.target.value }))}
                    />
                  </td>
                  <td className="w-40 px-3 py-3">
                    <div className="text-xs text-gray-600">
                      {r.calls_today} / {r.daily_target}
                    </div>
                    <ProgressBar done={r.calls_today} total={r.daily_target} className="mt-1" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 text-sm font-semibold text-gray-800">
              <tr>
                <td className="px-3 py-3" />
                <td className="px-3 py-3">Total</td>
                <td className="px-3 py-3">{rows.reduce((n, r) => n + r.assigned, 0)}</td>
                <td className="px-3 py-3">{rows.reduce((n, r) => n + r.called, 0)}</td>
                <td className="px-3 py-3">{rows.reduce((n, r) => n + r.pending, 0)}</td>
                <td className="px-3 py-3">{totalTarget}</td>
                <td className="px-3 py-3">{rows.reduce((n, r) => n + r.calls_today, 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center justify-end gap-3">
        {invalid && <span className="text-sm text-rose-600">Enter whole numbers from 0 to 1000.</span>}
        <button type="button" className={secondaryBtn} onClick={saveTargets} disabled={changed.length === 0 || invalid || setTargets.isPending}>
          <Save className="h-4 w-4" /> Save targets{changed.length > 0 ? ` (${changed.length})` : ''}
        </button>
      </div>
    </div>
  );
};
