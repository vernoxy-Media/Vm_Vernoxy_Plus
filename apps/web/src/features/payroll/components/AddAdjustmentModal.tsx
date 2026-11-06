import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';
import { errorText, fieldErrors, uploadAdjustmentFile, useAddAdjustmentMutation, usePayrollSettingsQuery } from '../hooks/use-payroll';
import { Banner, FieldError, Modal, btn, inputCls, money } from './payroll-ui';

const MAX_BYTES = 5 * 1024 * 1024;

/** Screen 7: Add Adjustment pop-up (BFD 8 Part 2). Categories come from Payroll Settings. */
export const AddAdjustmentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  payrollEmployeeId: number;
  employeeLabel: string;
  totalSalary: number;
  monthStart: string;
  monthEnd: string;
}> = ({ open, onClose, payrollEmployeeId, employeeLabel, totalSalary, monthStart, monthEnd }) => {
  const { data: settings } = usePayrollSettingsQuery(open);
  const add = useAddAdjustmentMutation();
  const [kind, setKind] = useState<'ADDITION' | 'DEDUCTION'>('ADDITION');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [relatedDate, setRelatedDate] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind('ADDITION');
    setCategoryId('');
    setAmount('');
    setRelatedDate('');
    setReference('');
    setReason('');
    setFile(null);
    setErrs({});
    setBanner(null);
  }, [open]);

  const cats = (settings?.adjustment_categories || []).filter((c) => c.kind === kind && c.is_active);
  const cat = cats.find((c) => String(c.category_id) === categoryId);
  const amt = Number(amount);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!categoryId) e.category_id = 'Please fill this field.';
    if (!amount) e.amount = 'Please fill this field.';
    else if (!(amt > 0) || !/^\d+(\.\d{1,2})?$/.test(amount)) e.amount = 'Please enter an amount more than 0.';
    else if (kind === 'DEDUCTION' && totalSalary - amt < 0) e.amount = 'Total Salary cannot be less than 0. Reduce the deduction.';
    if (reason.trim().length < 10) e.reason = reason.trim() ? 'Please write at least 10 characters.' : 'Please fill this field.';
    if (Object.keys(e).length) return setErrs(e);
    setBanner(null);
    try {
      await add.mutateAsync({
        peId: payrollEmployeeId,
        data: {
          kind,
          category_id: Number(categoryId),
          amount: amt,
          related_date: relatedDate || undefined,
          reference_number: reference.trim() || undefined,
          reason: reason.trim(),
          attachment_url: file?.url,
        },
      });
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else setBanner(errorText(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Adjustment"
      subtitle={employeeLabel}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.primary} disabled={add.isPending || uploading} onClick={submit}>
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        {banner && <Banner>{banner}</Banner>}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Kind<span className="text-rose-500">*</span>
          </p>
          <div className="flex gap-2">
            {(['ADDITION', 'DEDUCTION'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setCategoryId('');
                }}
                className={`rounded-xl border px-3 py-2 text-[12.5px] font-semibold ${kind === k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {k === 'ADDITION' ? 'Addition' : 'Deduction'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Category<span className="text-rose-500">*</span>
            </p>
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {cats.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.label}
                </option>
              ))}
            </select>
            <FieldError msg={errs.category_id} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Amount (₹)<span className="text-rose-500">*</span>
            </p>
            <input type="number" min="0.01" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <FieldError msg={errs.amount} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Related date</p>
            <input type="date" className={inputCls} min={monthStart} max={monthEnd} value={relatedDate} onChange={(e) => setRelatedDate(e.target.value)} />
            <FieldError msg={errs.related_date} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reference</p>
            <input className={inputCls} maxLength={80} placeholder="Candidate ID, advance or bill no." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Reason<span className="text-rose-500">*</span>
          </p>
          <textarea rows={2} maxLength={250} className={`${inputCls} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
          <FieldError msg={errs.reason} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Attachment</p>
          {file ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[12.5px]">
              <Paperclip className="h-3.5 w-3.5 text-blue-500" />
              <span className="flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-600" aria-label="Remove file">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" className={btn.secondary} disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Upload PDF, JPG or PNG up to 5 MB
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (!/\.(pdf|jpe?g|png)$/i.test(f.name) || f.size > MAX_BYTES) return setErrs((x) => ({ ...x, file: 'Only PDF, JPG or PNG up to 5 MB.' }));
              setErrs((x) => ({ ...x, file: '' }));
              setUploading(true);
              try {
                setFile({ url: await uploadAdjustmentFile(f), name: f.name });
              } catch (err) {
                setErrs((x) => ({ ...x, file: errorText(err) }));
              } finally {
                setUploading(false);
              }
            }}
          />
          <FieldError msg={errs.file} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Shown on the Salary Slip as</p>
          <div className={`${inputCls} flex items-center bg-slate-50 text-slate-600`}>
            {cat ? `${kind === 'ADDITION' ? 'Earnings' : 'Deductions'} · ${cat.label} · ${money(amt || 0)}` : '—'}
          </div>
        </div>
      </div>
    </Modal>
  );
};
