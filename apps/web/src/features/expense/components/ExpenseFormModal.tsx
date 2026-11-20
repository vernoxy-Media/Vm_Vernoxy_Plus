import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Building2, Check, ChevronDown, FileText, FolderKanban, Loader2, Paperclip, Search, Trash2, UploadCloud, User, X } from 'lucide-react';
import {
  ClaimFlag,
  ProjectOption,
  ReceiptItem,
  errorText,
  fieldErrors,
  flagsToConfirm,
  uploadReceipt,
  useClaimDetails,
  useFormOptions,
  useSaveClaim,
} from '../hooks/use-expenses';
import { Banner, FieldError, Modal, inr } from './expense-ui';

/** Jira look: flat 3px corners, grey field that turns white with a blue border on focus. */
const inputCls =
  'h-9 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2.5 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] transition hover:bg-[#EBECF0] focus:border-[#4C9AFF] focus:bg-white focus:outline-hidden';
const btn = {
  primary: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[#0052CC] px-3 text-[14px] font-medium text-white transition hover:bg-[#0065FF] disabled:cursor-not-allowed disabled:bg-[#F4F5F7] disabled:text-[#A5ADBA]',
  secondary: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[rgba(9,30,66,0.04)] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-50',
  danger: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[#DE350B] px-3 text-[14px] font-medium text-white transition hover:bg-[#BF2600] disabled:cursor-not-allowed disabled:opacity-50',
};

const OFFICE = 'Office Expense';
const PERSONAL = 'Personal Expense';
const PROJECT = 'Project Expense';

/** Which Expense Types a category allows. A Project Expense is a company expense, so it follows Office. */
const choicesFor = (allowed?: 'OFFICE' | 'PERSONAL' | 'BOTH'): string[] =>
  !allowed || allowed === 'BOTH' ? [OFFICE, PERSONAL, PROJECT] : allowed === 'OFFICE' ? [OFFICE, PROJECT] : [PERSONAL];

const TYPE_META: Record<string, { icon: React.ElementType; hint: string }> = {
  [OFFICE]: { icon: Building2, hint: 'Day-to-day running of the office' },
  [PERSONAL]: { icon: User, hint: 'Personal needs allowed by policy' },
  [PROJECT]: { icon: FolderKanban, hint: 'Charged directly to one project' },
};
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const FILE_RULE = 'Only PDF, JPG or PNG up to 5 MB, up to 5 files.';

interface FormState {
  expense_date: string;
  category_id: string;
  expense_type: string;
  project_id: string;
  amount: string;
  merchant_name: string;
  description: string;
}

const EMPTY: FormState = { expense_date: '', category_id: '', expense_type: '', project_id: '', amount: '', merchant_name: '', description: '' };

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
        project_id: claim.project_id ? String(claim.project_id) : '',
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
  const typeChoices = choicesFor(cat?.allowed_type);
  const projects = useMemo(() => {
    const list = opts?.projects || [];
    if (claim?.project && !list.some((p) => p.project_id === claim.project!.project_id)) return [...list, claim.project];
    return list;
  }, [opts, claim]);
  const amount = Number(form.amount);
  const dirty = JSON.stringify([form, receipts.map((r) => r.attachment_id)]) !== initial;

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'category_id') {
        const c = categories.find((x) => String(x.category_id) === v);
        // Category decides the Expense Type when it allows only one.
        const choices = choicesFor(c?.allowed_type);
        if (c && next.expense_type && !choices.includes(next.expense_type)) next.expense_type = choices.length === 1 ? choices[0] : '';
        else if (c && !next.expense_type && choices.length === 1) next.expense_type = choices[0];
      }
      // The project belongs to a Project Expense only: any other type clears it.
      if (next.expense_type !== PROJECT) next.project_id = '';
      return next;
    });
    setErrors((e) => ({ ...e, [k]: '', ...(k === 'expense_type' ? { project_id: '' } : {}) }));
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
    if (form.expense_type === PROJECT && !form.project_id) e.project_id = 'Please select a project.';
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
          project_id: form.expense_type === PROJECT && form.project_id ? Number(form.project_id) : null,
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
        jira
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
            <div className="grid grid-cols-2 gap-3 rounded-[3px] bg-[#F4F5F7] px-4 py-3 text-[13px]">
              <div>
                <p className="text-[11px] font-semibold text-[#6B778C]">Employee</p>
                <p className="font-medium text-[#172B4D]">
                  {(claim?.employee || opts?.employee)?.name} <span className="font-normal text-[#6B778C]">· {(claim?.employee || opts?.employee)?.emp_code}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6B778C]">Department</p>
                <p className="font-medium text-[#172B4D]">{(claim?.employee || opts?.employee)?.department_name || '—'}</p>
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
                  <p className="mt-1 text-[12px] text-[#6B778C]">
                    {cat.limit_per_claim ? `Limit ${inr(cat.limit_per_claim)} per claim. ` : 'No limit. '}
                    {cat.receipt_rule === 'ALWAYS' ? 'Receipt always needed.' : `Receipt needed above ${inr(cat.receipt_threshold_amount)}.`}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label text="Expense Type" required />
                <div className="grid gap-2 sm:grid-cols-3">
                  {[OFFICE, PERSONAL, PROJECT].map((t) => {
                    const allowed = typeChoices.includes(t);
                    const active = form.expense_type === t;
                    const Icon = TYPE_META[t].icon;
                    return (
                      <label
                        key={t}
                        title={allowed ? undefined : `${cat?.name} does not allow ${t}.`}
                        className={`group relative flex items-start gap-2.5 rounded-[3px] border-2 px-3 py-2.5 transition ${
                          active ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0]'
                        } ${allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                      >
                        <input type="radio" name="expense_type" className="sr-only" disabled={!allowed} checked={active} onChange={() => set('expense_type', t)} />
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] ${active ? 'bg-[#0052CC] text-white' : 'bg-[#DFE1E6] text-[#42526E]'}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[12.5px] font-semibold ${active ? 'text-[#0747A6]' : 'text-[#172B4D]'}`}>{t}</span>
                          <span className="block text-[11px] leading-snug text-[#6B778C]">{TYPE_META[t].hint}</span>
                        </span>
                        {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-[#0052CC]" />}
                      </label>
                    );
                  })}
                </div>
                <FieldError msg={errors.expense_type} />
              </div>

              {form.expense_type === PROJECT && (
                <div className="sm:col-span-2">
                  <Label text="Project" required />
                  <ProjectPicker projects={projects} value={form.project_id} invalid={!!errors.project_id} onChange={(v) => set('project_id', v)} />
                  <FieldError msg={errors.project_id} />
                  {!errors.project_id && <p className="mt-1 text-[12px] text-[#6B778C]">Once approved, this amount is added to the actual expense of the project.</p>}
                </div>
              )}

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
                  <span className="ml-auto mt-1 text-[11px] text-[#6B778C]">{form.description.length}/500</span>
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
                className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[3px] border-2 border-dashed px-4 py-5 text-center transition ${
                  drag ? 'border-[#4C9AFF] bg-[#DEEBFF]' : 'border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0]'
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
                    <li key={r.attachment_id} className="flex items-center gap-2 rounded-[3px] border border-[#DFE1E6] px-3 py-1.5 text-[13px]">
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
  <label className="mb-1 block text-[12px] font-semibold text-[#6B778C]">
    {text}
    {required && <span className="ml-0.5 text-[#DE350B]">*</span>}
  </label>
);

/** Searchable single-select of projects. */
const ProjectPicker: React.FC<{ projects: ProjectOption[]; value: string; invalid?: boolean; onChange: (v: string) => void }> = ({ projects, value, invalid, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const selected = projects.find((p) => String(p.project_id) === value) || null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const needle = q.trim().toLowerCase();
  const list = needle ? projects.filter((p) => `${p.project_name} ${p.project_no} ${p.client_name || ''}`.toLowerCase().includes(needle)) : projects;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 w-full items-center gap-2 rounded-[3px] border-2 px-2.5 text-left text-[14px] transition focus:outline-hidden ${
          invalid ? 'border-[#DE350B] bg-white' : open ? 'border-[#4C9AFF] bg-white' : 'border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0]'
        }`}
      >
        <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
        {selected ? (
          <span className="min-w-0 flex-1 truncate font-medium text-[#172B4D]">
            {selected.project_name} <span className="font-normal text-slate-400">· {selected.project_no}</span>
          </span>
        ) : (
          <span className="flex-1 text-slate-400">Search and select a project</span>
        )}
        {selected && (
          <span
            role="button"
            aria-label="Clear project"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[3px] bg-white shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
          <div className="flex items-center gap-2 border-b border-[#DFE1E6] px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by project, number or client" className="w-full bg-transparent text-[14px] text-[#172B4D] outline-none placeholder:text-[#7A869A]" />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {list.length === 0 ? (
              <li className="px-3 py-4 text-center text-[12.5px] text-slate-400">{projects.length === 0 ? 'No projects available.' : 'No project matches your search.'}</li>
            ) : (
              list.map((p) => {
                const on = String(p.project_id) === value;
                return (
                  <li key={p.project_id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(String(p.project_id));
                        setOpen(false);
                        setQ('');
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[#F4F5F7] ${on ? 'bg-[#DEEBFF]' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[#172B4D]">{p.project_name}</span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {p.project_no}
                          {p.client_name ? ` · ${p.client_name}` : ''}
                        </span>
                      </span>
                      {on && <Check className="h-4 w-4 text-[#0052CC]" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
