import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Trash2, UploadCloud } from 'lucide-react';
import {
  ClaimFlag,
  ReceiptItem,
  errorText,
  fieldErrors,
  flagsToConfirm,
  uploadReceipt,
  useClaimDetails,
  useFormOptions,
  useSaveClaim,
} from '../hooks/use-expenses';
import { Banner, FieldError, Modal, btn, inputCls, inr } from './expense-ui';

const OFFICE = 'Office Expense';
const PERSONAL = 'Personal Expense';
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const FILE_RULE = 'Only PDF, JPG or PNG up to 5 MB, up to 5 files.';

interface FormState {
  expense_date: string;
  category_id: string;
  expense_type: string;
  amount: string;
  merchant_name: string;
  description: string;
}

const EMPTY: FormState = { expense_date: '', category_id: '', expense_type: '', amount: '', merchant_name: '', description: '' };

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** Screen 2: Add Expense (BFD 4). Fields in BFD order. */
export const ExpenseFormModal: React.FC<{
  open: boolean;
  claimId: number | null;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ open, claimId, onClose, onDone }) => {
  const { data: opts, isLoading: optsLoading } = useFormOptions(open);
  const { data: claim, isLoading: claimLoading } = useClaimDetails(open ? claimId : null);
  const save = useSaveClaim();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [initial, setInitial] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const [confirmFlags, setConfirmFlags] = useState<ClaimFlag[] | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setBanner(null);
    setConfirmFlags(null);
    setConfirmDiscard(false);
    if (claimId && claim) {
      const f: FormState = {
        expense_date: claim.expense_date || '',
        category_id: claim.category_id ? String(claim.category_id) : '',
        expense_type: claim.expense_type || '',
        amount: claim.amount != null ? String(claim.amount) : '',
        merchant_name: claim.merchant_name || '',
        description: claim.description || '',
      };
      setForm(f);
      setReceipts(claim.receipts);
      setInitial(JSON.stringify([f, claim.receipts.map((r) => r.attachment_id)]));
    } else if (!claimId) {
      setForm(EMPTY);
      setReceipts([]);
      setInitial(JSON.stringify([EMPTY, []]));
    }
  }, [open, claimId, claim]);

  const today = opts?.today || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  // A category switched off stays visible on a Draft that already uses it.
  const categories = useMemo(() => {
    const list = opts?.categories || [];
    if (claim?.category && !list.some((c) => c.category_id === claim.category!.category_id)) return [...list, claim.category];
    return list;
  }, [opts, claim]);
  const cat = categories.find((c) => String(c.category_id) === form.category_id) || null;
  const typeChoices = !cat ? [OFFICE, PERSONAL] : cat.allowed_type === 'BOTH' ? [OFFICE, PERSONAL] : cat.allowed_type === 'OFFICE' ? [OFFICE] : [PERSONAL];
  const amount = Number(form.amount);
  const dirty = JSON.stringify([form, receipts.map((r) => r.attachment_id)]) !== initial;

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'category_id') {
        const c = categories.find((x) => String(x.category_id) === v);
        // Category decides the Expense Type when it allows only one.
        if (c && c.allowed_type !== 'BOTH') next.expense_type = c.allowed_type === 'OFFICE' ? OFFICE : PERSONAL;
        else if (c && next.expense_type && ![OFFICE, PERSONAL].includes(next.expense_type)) next.expense_type = '';
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  // Live notes under fields (BFD 4 Part 2).
  const lateNote =
    form.expense_date && opts && form.expense_date <= today && daysBetween(form.expense_date, today) > opts.claim_window_days
      ? opts.after_claim_window_action === 'STOP_SUBMISSION'
        ? `This expense is older than ${opts.claim_window_days} days and can no longer be claimed.`
        : `This expense is older than ${opts.claim_window_days} days. Your approver will see this.`
      : null;
  const limitNote = cat?.limit_per_claim && amount > cat.limit_per_claim ? `This amount is above the ${inr(cat.limit_per_claim)} limit for this category. Your approver will see this.` : null;
  const receiptNeeded = !!cat && amount > 0 && (cat.receipt_rule === 'ALWAYS' || amount > cat.receipt_threshold_amount);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    if (receipts.length + list.length > MAX_FILES) {
      setErrors((e) => ({ ...e, receipts: FILE_RULE }));
      return;
    }
    for (const f of list) {
      const okType = /^(application\/pdf|image\/jpe?g|image\/png)$/i.test(f.type) || /\.(pdf|jpe?g|png)$/i.test(f.name);
      if (!okType || f.size > MAX_BYTES) {
        setErrors((e) => ({ ...e, receipts: FILE_RULE }));
        return;
      }
    }
    setErrors((e) => ({ ...e, receipts: '' }));
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        const r = await uploadReceipt(f);
        setReceipts((prev) => [...prev, r]);
      } catch (err) {
        setErrors((e) => ({ ...e, receipts: errorText(err, 'Upload failed. Please try again.') }));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  /** Client copy of the "Stops" so the employee sees errors before the round trip. */
  const validate = (submit: boolean): Record<string, string> => {
    const e: Record<string, string> = {};
    const need = 'Please fill this field.';
    if (!form.expense_date) e.expense_date = need;
    else if (form.expense_date > today) e.expense_date = 'The expense date cannot be in the future.';
    if (form.amount && (!(amount > 0) || amount > 1000000 || !/^\d+(\.\d{1,2})?$/.test(form.amount))) e.amount = 'Please enter an amount more than 0.';
    if (form.description.length > 500) e.description = 'The description can be up to 500 characters.';
    if (!submit) return e;
    if (!form.category_id) e.category_id = need;
    if (!form.expense_type) e.expense_type = need;
    else if (cat && !typeChoices.includes(form.expense_type)) e.expense_type = `${cat.name} allows only ${typeChoices[0]}.`;
    if (!form.amount) e.amount = need;
    const d = form.description.trim();
    if (!d) e.description = need;
    else if (d.length < 10) e.description = 'Please write at least 10 characters about the purpose.';
    if (receiptNeeded && receipts.length === 0) {
      e.receipts = cat!.receipt_rule === 'ALWAYS' ? 'A receipt is required for this category.' : `A receipt is required for this category above ${inr(cat!.receipt_threshold_amount)}.`;
    }
    if (lateNote && opts?.after_claim_window_action === 'STOP_SUBMISSION') e.expense_date = lateNote;
    return e;
  };

  const run = async (submit: boolean, confirm = false) => {
    setBanner(null);
    const e = validate(submit);
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      return;
    }
    try {
      const res = await save.mutateAsync({
        id: claimId,
        payload: {
          expense_date: form.expense_date,
          category_id: form.category_id ? Number(form.category_id) : null,
          expense_type: form.expense_type || null,
          amount: form.amount ? Number(form.amount) : null,
          merchant_name: form.merchant_name.trim() || null,
          description: form.description.trim() || null,
          attachment_ids: receipts.map((r) => r.attachment_id),
          submit,
          confirm_flags: confirm || undefined,
        },
      });
      setConfirmFlags(null);
      onDone(submit ? `Claim ${res.claim_no} submitted.` : 'Saved as Draft.');
    } catch (err: any) {
      const flags = flagsToConfirm(err);
      if (flags) {
        setConfirmFlags(flags);
        return;
      }
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else setBanner(errorText(err));
    }
  };

  const close = () => {
    if (dirty && !save.isPending) setConfirmDiscard(true);
    else onClose();
  };

  const loading = optsLoading || (!!claimId && claimLoading);
  const busy = save.isPending || uploading > 0;

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        width="max-w-2xl"
        title={claimId ? `Edit Expense${claim?.claim_no ? ` · ${claim.claim_no}` : ''}` : 'Add Expense'}
        subtitle={claim?.copied_from_claim_id ? 'Copied from a rejected claim' : 'Save as Draft needs only the Expense Date.'}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={close} disabled={save.isPending}>
              Cancel
            </button>
            <button type="button" className={btn.secondary} onClick={() => run(false)} disabled={busy || loading}>
              Save as Draft
            </button>
            <button type="button" className={btn.primary} onClick={() => run(true)} disabled={busy || loading}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit Claim
            </button>
          </>
        }
      >
        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {banner && <Banner>{banner}</Banner>}

            {/* Part 1: who is claiming (read only) */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-4 py-3 text-[12.5px]">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Employee</p>
                <p className="font-semibold text-slate-800">
                  {(claim?.employee || opts?.employee)?.name} <span className="font-normal text-slate-400">· {(claim?.employee || opts?.employee)?.emp_code}</span>
                </p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Department</p>
                <p className="font-semibold text-slate-800">{(claim?.employee || opts?.employee)?.department_name || '—'}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Expense Date" required />
                <input type="date" max={today} className={inputCls} value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} />
                <FieldError msg={errors.expense_date} />
                {!errors.expense_date && lateNote && <p className="mt-1 text-[11.5px] font-medium text-amber-600">{lateNote}</p>}
              </div>

              <div>
                <Label text="Category" required />
                <select className={inputCls} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.category_id} />
                {cat && (
                  <p className="mt-1 text-[11.5px] text-slate-500">
                    {cat.limit_per_claim ? `Limit ${inr(cat.limit_per_claim)} per claim. ` : 'No limit. '}
                    {cat.receipt_rule === 'ALWAYS' ? 'Receipt always needed.' : `Receipt needed above ${inr(cat.receipt_threshold_amount)}.`}
                  </p>
                )}
              </div>

              <div>
                <Label text="Expense Type" required />
                <div className="flex gap-2">
                  {[OFFICE, PERSONAL].map((t) => {
                    const allowed = typeChoices.includes(t);
                    return (
                      <label
                        key={t}
                        className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-semibold ${
                          form.expense_type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                        } ${allowed ? '' : 'cursor-not-allowed opacity-40'}`}
                      >
                        <input type="radio" className="sr-only" disabled={!allowed} checked={form.expense_type === t} onChange={() => set('expense_type', t)} />
                        {t}
                      </label>
                    );
                  })}
                </div>
                <FieldError msg={errors.expense_type} />
              </div>

              <div>
                <Label text="Amount (₹)" required />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                />
                <FieldError msg={errors.amount} />
                {!errors.amount && limitNote && <p className="mt-1 text-[11.5px] font-medium text-amber-600">{limitNote}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label text="Merchant / Paid to" />
                <input className={inputCls} maxLength={100} placeholder="e.g. Uber India" value={form.merchant_name} onChange={(e) => set('merchant_name', e.target.value)} />
                <FieldError msg={errors.merchant_name} />
              </div>

              <div className="sm:col-span-2">
                <Label text="Description / Purpose" required />
                <textarea
                  rows={3}
                  maxLength={500}
                  className={`${inputCls} h-auto py-2`}
                  placeholder="What was this for? (at least 10 characters)"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
                <div className="flex justify-between">
                  <FieldError msg={errors.description} />
                  <span className="ml-auto mt-1 text-[11px] text-slate-400">{form.description.length}/500</span>
                </div>
              </div>
            </div>

            {/* Receipts */}
            <div>
              <Label text={`Receipts${receiptNeeded ? '' : ' (optional)'}`} required={receiptNeeded} />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                  drag ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="h-6 w-6 text-slate-400" />
                <p className="text-[12.5px] font-semibold text-slate-600">Drag files here or click to choose</p>
                <p className="text-[11px] text-slate-400">{FILE_RULE}</p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
              <FieldError msg={errors.receipts} />
              {(receipts.length > 0 || uploading > 0) && (
                <ul className="mt-2 space-y-1.5">
                  {receipts.map((r) => (
                    <li key={r.attachment_id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px]">
                      {/^image\//.test(r.mime_type || '') ? <Paperclip className="h-3.5 w-3.5 text-blue-500" /> : <FileText className="h-3.5 w-3.5 text-rose-500" />}
                      <span className="min-w-0 flex-1 truncate text-slate-700">{r.file_name}</span>
                      <span className="text-[11px] text-slate-400">{(r.file_size_bytes / 1024).toFixed(0)} KB</span>
                      <button type="button" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => setReceipts((p) => p.filter((x) => x.attachment_id !== r.attachment_id))} aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                  {uploading > 0 && (
                    <li className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* "Submit anyway?" for flags (BFD 4 Part 3) */}
      <Modal
        open={!!confirmFlags}
        onClose={() => setConfirmFlags(null)}
        title="Submit anyway?"
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setConfirmFlags(null)}>
              Go back
            </button>
            <button type="button" className={btn.primary} disabled={save.isPending} onClick={() => run(true, true)}>
              Submit anyway
            </button>
          </>
        }
      >
        <ul className="space-y-2">
          {(confirmFlags || []).map((f) => (
            <li key={f.code} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
              {f.message}
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this expense?"
        subtitle="Your changes will not be saved."
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </button>
            <button
              type="button"
              className={btn.danger}
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Discard
            </button>
          </>
        }
      >
        <p className="text-[13px] text-slate-600">Anything you entered here will be lost.</p>
      </Modal>
    </>
  );
};

const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
    {text}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </label>
);
