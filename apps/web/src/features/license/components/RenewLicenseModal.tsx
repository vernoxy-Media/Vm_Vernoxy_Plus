import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Upload, X } from 'lucide-react';
import { useRenewLicenseMutation } from '../hooks/use-licenses';
import { useBillingCyclesQuery } from '../hooks/use-license-settings';
import { cycleOptions, suggestExpiry } from '../billing-cycles';
import { useUploadAttachmentMutation } from '@/shared/hooks/use-attachments';

interface RenewLicenseModalProps {
  isOpen: boolean;
  softwareId: number;
  softwareName: string;
  softwareCode?: string;
  licenseType?: string;
  /** Seats assigned today: Total Seats cannot go below this (marker 3, 6). */
  assignedSeats?: number;
  /** A Discontinued software is reopened by recording a new term (Admin). */
  reopening?: boolean;
  previousTerm?: {
    term_number: number;
    billing_cycle?: string | null;
    cost: number;
    start_date?: string | null;
    expiry_date?: string | null;
    total_seats?: number | null;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => iso(new Date());
const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** BFD 7 Part 2 - Reference Screen 5: Renew License. */
export const RenewLicenseModal: React.FC<RenewLicenseModalProps> = ({
  isOpen,
  softwareId,
  softwareName,
  softwareCode,
  licenseType,
  assignedSeats = 0,
  reopening = false,
  previousTerm,
  onClose,
  onSuccess,
}) => {
  const renewMutation = useRenewLicenseMutation();
  const uploadAttachmentMutation = useUploadAttachmentMutation();

  // New Start Date: the day after the current Expiry Date (marker 2)
  const defaultStart = useMemo(() => {
    if (!reopening && previousTerm?.expiry_date) {
      const exp = new Date(previousTerm.expiry_date);
      exp.setDate(exp.getDate() + 1);
      return iso(exp);
    }
    return todayIso();
  }, [previousTerm?.expiry_date, reopening]);

  // Billing Cycles from Settings -> License Settings; the new term starts on the previous term's cycle.
  const { data: allCycles = [] } = useBillingCyclesQuery();
  const previousCycle = previousTerm?.billing_cycle ?? null;
  const cycles = cycleOptions(allCycles, previousCycle);
  const counted = !licenseType || licenseType.endsWith('Per User') || licenseType === 'Trial';
  const [startDate, setStartDate] = useState(defaultStart);
  const [billingCycle, setBillingCycle] = useState(previousCycle ?? '');
  const [expiryDate, setExpiryDate] = useState('');
  const selectedCycle = allCycles.find((c) => c.name === billingCycle) ?? null;
  const oneTime = selectedCycle?.kind === 'ONE_TIME';

  // Once the list has loaded: pick a cycle if none yet, and suggest the expiry from it.
  const cyclesReady = allCycles.length > 0;
  useEffect(() => {
    if (!cyclesReady) return;
    const name = billingCycle || cycles[0]?.name || '';
    if (name !== billingCycle) setBillingCycle(name);
    setExpiryDate((cur) => cur || suggestExpiry(defaultStart, allCycles.find((c) => c.name === name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cyclesReady]);
  const [cost, setCost] = useState<number | ''>(previousTerm?.cost ?? '');
  const [totalSeats, setTotalSeats] = useState<number | ''>(previousTerm?.total_seats ?? '');
  const [renewalDate, setRenewalDate] = useState(todayIso());
  const [invoiceOrderNo, setInvoiceOrderNo] = useState('');
  const [expenseClaimNo, setExpenseClaimNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const nextTerm = (previousTerm?.term_number || 0) + 1;
  const prevCost = Number(previousTerm?.cost || 0);
  const costNum = cost === '' ? null : Number(cost);
  const seatsNum = totalSeats === '' ? null : Number(totalSeats);
  const perSeat = costNum !== null && seatsNum ? costNum / seatsNum : null;
  const changePct = costNum !== null && prevCost > 0 ? ((costNum - prevCost) / prevCost) * 100 : null;
  // Seat warning (marker 6): Save is disabled until seats are revoked or the number is raised
  const seatsTooLow = counted && seatsNum !== null && seatsNum < assignedSeats;
  const currentStart = previousTerm?.start_date?.slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!startDate) return setErrorMsg('Please fill the New Start Date.');
    if (currentStart && startDate <= currentStart) {
      return setErrorMsg(`Terms cannot overlap: the new term must start after ${fmt(currentStart)}.`);
    }
    if (!billingCycle) return setErrorMsg('Please choose the Billing Cycle.');
    if (!oneTime && !expiryDate) return setErrorMsg('Please fill the New Expiry Date.');
    if (expiryDate && expiryDate <= startDate) return setErrorMsg('The expiry date must be after the start date.');
    if (counted && (seatsNum === null || seatsNum < 1)) return setErrorMsg('Please enter the Total Seats.');
    if (seatsTooLow) return setErrorMsg(`${assignedSeats} seats are assigned. Total Seats cannot be lower than ${assignedSeats}.`);
    if (costNum === null || costNum < 0) return setErrorMsg('Please enter the amount paid for one cycle.');
    if (!renewalDate) return setErrorMsg('Please fill the Renewal Date (paid on).');
    if (renewalDate > todayIso()) return setErrorMsg('The renewal date cannot be in the future.');
    if (selectedFile && (!['application/pdf', 'image/jpeg', 'image/png'].includes(selectedFile.type) || selectedFile.size > 10 * 1024 * 1024)) {
      return setErrorMsg('Only PDF, JPG or PNG up to 10 MB.');
    }

    try {
      const attachmentIds: number[] = [];
      if (selectedFile) {
        const uploaded = await uploadAttachmentMutation.mutateAsync({ entityType: 'TEMP_LICENSE_TERM', file: selectedFile, displayOrder: 1 });
        if (uploaded?.attachment_id) attachmentIds.push(uploaded.attachment_id);
      }
      await renewMutation.mutateAsync({
        id: softwareId,
        dto: {
          start_date: startDate,
          expiry_date: expiryDate || undefined,
          billing_cycle: billingCycle,
          cost: costNum,
          total_seats: counted && seatsNum !== null ? seatsNum : undefined,
          renewal_date: renewalDate,
          invoice_order_no: invoiceOrderNo.trim() || undefined,
          expense_claim_no: expenseClaimNo.trim() || undefined,
          remarks: remarks.trim() || undefined,
          attachment_ids: attachmentIds.length ? attachmentIds : undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.detail || err?.message || 'Failed to renew license');
    }
  };

  const input = 'w-full h-10 px-3 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const label = 'block text-xs font-semibold text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              {reopening ? 'Reopen License' : 'Renew License'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {softwareName}
              {softwareCode ? ` · ${softwareCode}` : ''} · Term {nextTerm}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Current term (marker 1), read-only */}
          {previousTerm ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-700">
              <span className="font-semibold text-slate-900">Current term:</span>{' '}
              {fmt(previousTerm.start_date)} – {previousTerm.expiry_date ? fmt(previousTerm.expiry_date) : 'No expiry'}
              {' · '}
              {previousTerm.billing_cycle || '—'}
              {previousTerm.total_seats !== null && previousTerm.total_seats !== undefined ? ` · ${previousTerm.total_seats} seats` : ''}
              {' · '}
              {inr(prevCost)}
              {' · '}
              {assignedSeats} seat{assignedSeats === 1 ? '' : 's'} used
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-500">No term recorded yet.</div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* marker 2 */}
            <div>
              <label className={label}>
                New Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                className={input}
                value={startDate}
                min={currentStart || undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setExpiryDate(suggestExpiry(e.target.value, selectedCycle));
                }}
              />
            </div>
            <div>
              <label className={label}>
                New Expiry Date {!oneTime && <span className="text-red-500">*</span>}
              </label>
              <input type="date" className={input} value={expiryDate} min={startDate || undefined} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div>
              <label className={label}>
                Billing Cycle <span className="text-red-500">*</span>
              </label>
              <select
                className={input}
                value={billingCycle}
                onChange={(e) => {
                  setBillingCycle(e.target.value);
                  setExpiryDate(suggestExpiry(startDate, allCycles.find((c) => c.name === e.target.value)));
                }}
              >
                {!billingCycle && <option value="">Choose…</option>}
                {cycles.map((c) => (
                  <option key={c.cycle_id} value={c.name}>
                    {c.name}
                    {!c.is_active ? ' (no longer offered)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* marker 3 */}
            <div>
              <label className={label}>Total Seats {counted && <span className="text-red-500">*</span>}</label>
              {counted ? (
                <input
                  type="number"
                  min={Math.max(1, assignedSeats)}
                  max={10000}
                  className={input}
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value ? parseInt(e.target.value, 10) : '')}
                />
              ) : (
                <div className={`${input} flex items-center bg-slate-50 text-slate-500`}>No limit</div>
              )}
            </div>

            {/* marker 4 */}
            <div>
              <label className={label}>
                Cost for the cycle (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={input}
                value={cost}
                onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')}
              />
              {(perSeat !== null || changePct !== null) && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {perSeat !== null && <>{inr(perSeat)} per seat</>}
                  {perSeat !== null && changePct !== null && ' · '}
                  {changePct !== null && (
                    <span className={changePct > 0 ? 'text-red-600' : changePct < 0 ? 'text-emerald-600' : ''}>
                      {changePct === 0
                        ? `Same as Term ${previousTerm?.term_number}`
                        : `${Math.abs(changePct).toFixed(1)}% ${changePct > 0 ? 'higher' : 'lower'} than Term ${previousTerm?.term_number}`}
                      {costNum !== null && changePct !== 0 && ` (${costNum - prevCost > 0 ? '+' : '−'}${inr(Math.abs(costNum - prevCost))})`}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div>
              <label className={label}>
                Renewal Date (paid on) <span className="text-red-500">*</span>
              </label>
              <input type="date" className={input} value={renewalDate} max={todayIso()} onChange={(e) => setRenewalDate(e.target.value)} />
            </div>
          </div>

          {/* marker 5 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Invoice / Order No.</label>
              <input type="text" className={input} maxLength={100} value={invoiceOrderNo} onChange={(e) => setInvoiceOrderNo(e.target.value)} />
            </div>
            <div>
              <label className={label}>Invoice</label>
              <label className="flex h-10 items-center gap-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer transition">
                <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">
                  {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024).toFixed(0)} KB` : 'PDF, JPG or PNG, up to 10 MB'}
                </span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label className={label}>Expense Claim No.</label>
              <input
                type="text"
                className={input}
                maxLength={50}
                value={expenseClaimNo}
                onChange={(e) => setExpenseClaimNo(e.target.value)}
                placeholder="If an employee paid and claimed it"
              />
            </div>
            <div>
              <label className={label}>Remarks</label>
              <input type="text" className={input} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Reduced from 25 to 23 seats" />
            </div>
          </div>

          {/* marker 6 */}
          {seatsTooLow && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800">
              {assignedSeats} seats are assigned. Total Seats cannot be lower than {assignedSeats}.
            </div>
          )}

          {/* marker 7 */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={renewMutation.isPending || uploadAttachmentMutation.isPending || seatsTooLow}
              className="h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {renewMutation.isPending ? 'Saving...' : reopening ? 'Save and Reopen' : 'Save Renewal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
