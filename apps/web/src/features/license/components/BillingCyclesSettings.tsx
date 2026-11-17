import React, { useState } from 'react';
import { Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import {
  useBillingCyclesQuery,
  useCreateBillingCycleMutation,
  useDeleteBillingCycleMutation,
  useUpdateBillingCycleMutation,
} from '../hooks/use-license-settings';
import { BillingCycle, BillingCycleKind, cycleLengthLabel } from '../billing-cycles';

const input =
  'w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';

const KINDS: Array<{ value: BillingCycleKind; label: string; hint: string }> = [
  { value: 'FIXED', label: 'Fixed number of months', hint: 'Every term lasts the same number of months (e.g. 1, 3, 8, 12).' },
  { value: 'TERM', label: 'From the term dates (whole years)', hint: 'The start and expiry dates give the length: 2 years, 3 years ... (Multi-year).' },
  { value: 'ONE_TIME', label: 'One-time (no renewal)', hint: 'Bought once: no expiry and not part of the yearly cost.' },
];

const errorText = (err: unknown) => {
  const e = err as { message?: string; body?: { message?: string } } | undefined;
  return e?.body?.message || e?.message || 'Could not save the Billing Cycle.';
};

/**
 * Settings -> License Settings -> Billing Cycles (Admin). Each cycle says how long one term lasts,
 * which drives the "term and cycle" check, the suggested expiry and the yearly cost.
 */
export const BillingCyclesSettings: React.FC = () => {
  const { data: cycles = [], isLoading } = useBillingCyclesQuery();
  const create = useCreateBillingCycleMutation();
  const update = useUpdateBillingCycleMutation();
  const remove = useDeleteBillingCycleMutation();

  const [editing, setEditing] = useState<BillingCycle | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<BillingCycleKind>('FIXED');
  const [months, setMonths] = useState<number | ''>('');
  const [order, setOrder] = useState(1);
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');

  const lengthLocked = Boolean(editing && editing.in_use > 0);
  const busy = create.isPending || update.isPending;

  const openForm = (c: BillingCycle | null) => {
    setEditing(c);
    setName(c?.name ?? '');
    setKind(c?.kind ?? 'FIXED');
    setMonths(c?.months ?? '');
    setOrder(c?.display_order ?? cycles.length + 1);
    setActive(c?.is_active ?? true);
    setError('');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please fill the name.');
    if (kind === 'FIXED' && (months === '' || !Number.isInteger(months) || months < 1 || months > 120)) {
      return setError('Enter the length in whole months, from 1 to 120.');
    }
    const dto = { name: name.trim(), kind, months: kind === 'FIXED' ? Number(months) : null, display_order: order, is_active: active };
    try {
      if (editing) await update.mutateAsync({ id: editing.cycle_id, dto });
      else await create.mutateAsync(dto);
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const toggleActive = async (c: BillingCycle) => {
    try {
      await update.mutateAsync({ id: c.cycle_id, dto: { is_active: !c.is_active } });
    } catch (err) {
      window.alert(errorText(err));
    }
  };

  const onDelete = async (c: BillingCycle) => {
    if (!window.confirm(`Delete the Billing Cycle "${c.name}"?`)) return;
    try {
      await remove.mutateAsync(c.cycle_id);
    } catch (err) {
      window.alert(errorText(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          How long one term lasts. It suggests the expiry date, checks the term against the cycle and works out the yearly cost
          (cost × 12 ÷ months).
        </p>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Billing Cycle
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">One term lasts</th>
              <th className="px-4 py-3" title="Software licenses that have a term on this cycle">Licenses using it</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">Loading Billing Cycles...</td>
              </tr>
            ) : cycles.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">No Billing Cycles yet. Click "Add Billing Cycle".</td>
              </tr>
            ) : (
              cycles.map((c) => (
                <tr key={c.cycle_id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-slate-500">{c.display_order}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{cycleLengthLabel(c)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.licenses ? `${c.licenses} license${c.licenses === 1 ? '' : 's'}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.is_active ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <RowActionsMenu
                        label={`Actions for ${c.name}`}
                        actions={[
                          { label: 'Edit', icon: Pencil, onClick: () => openForm(c) },
                          { label: c.is_active ? 'Deactivate' : 'Activate', icon: Power, onClick: () => toggleActive(c) },
                          {
                            label: 'Delete',
                            icon: Trash2,
                            danger: true,
                            disabled: c.in_use > 0,
                            hint: 'Licenses use this cycle, so it cannot be deleted. Deactivate it instead.',
                            onClick: () => onDelete(c),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">{editing ? 'Edit Billing Cycle' : 'Add Billing Cycle'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 transition hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input className={input} maxLength={30} placeholder="e.g. Half-yearly, 8 Months" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">How long one term lasts</label>
                <select className={input} value={kind} disabled={lengthLocked} onChange={(e) => setKind(e.target.value as BillingCycleKind)}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">{KINDS.find((k) => k.value === kind)?.hint}</p>
              </div>

              {kind === 'FIXED' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Months <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={input}
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    disabled={lengthLocked}
                    value={months}
                    onChange={(e) => setMonths(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              )}
              {lengthLocked && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {editing!.licenses} license{editing!.licenses === 1 ? '' : 's'} use this cycle, so its length is locked. Add a new cycle for a
                  different length.
                </p>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Display Order</label>
                <input className={input} type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} />
              </div>

              <label className="flex cursor-pointer items-center gap-2 pt-1">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded-md border-slate-300 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">Offered for new licenses</span>
              </label>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Save Billing Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
