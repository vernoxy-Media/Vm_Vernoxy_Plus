import React, { useState } from 'react';
import { AlertCircle, CalendarClock, Pencil, PlusCircle, Upload, X } from 'lucide-react';
import {
  SoftwareDetailsResponse,
  useAddSeatsMutation,
  useCorrectTermMutation,
  useUpdateSoftwareMutation,
} from '../hooks/use-licenses';
import { useLicenseCategoriesQuery, useLicenseVendorsQuery } from '../hooks/use-license-settings';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useUploadAttachmentMutation } from '@/shared/hooks/use-attachments';

/**
 * BFD 5 Part 2 "What can be changed after saving":
 *  - Edit: name, vendor, category, owner, License Key, Bought from, auto-renew; fewer seats with a reason;
 *    License Type (Admin only, to a type that keeps the assignments valid).
 *  - Add Seats: more seats in the middle of a term, with cost, date and invoice.
 *  - Correct term: dates or cost of the current term, only to correct a mistake, with a reason.
 */

const LICENSE_TYPES = [
  'Subscription · Per User',
  'Subscription · Organisation',
  'Perpetual · Per User',
  'Perpetual · Organisation',
  'Free / Open Source',
  'Trial',
];
const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Yearly', 'Multi-year', 'One-time'];
const input = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
const label = 'block text-xs font-medium text-slate-700 mb-1';
const today = () => new Date().toISOString().slice(0, 10);
const errText = (e: any, fallback: string) => e?.detail || e?.message || fallback;
const seatsCounted = (t: string) => t.endsWith('Per User') || t === 'Trial';

const Shell: React.FC<{ title: string; icon: React.ReactNode; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  icon,
  subtitle,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ErrorBox: React.FC<{ msg: string }> = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{msg}</span>
    </div>
  ) : null;

const Footer: React.FC<{ onClose: () => void; busy: boolean; text: string }> = ({ onClose, busy, text }) => (
  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition">
      Cancel
    </button>
    <button
      type="submit"
      disabled={busy}
      className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
    >
      {busy ? 'Saving...' : text}
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------
export const EditSoftwareModal: React.FC<{ software: SoftwareDetailsResponse; isAdmin: boolean; onClose: () => void }> = ({
  software,
  isAdmin,
  onClose,
}) => {
  const { data: categories = [] } = useLicenseCategoriesQuery();
  const { data: vendors = [] } = useLicenseVendorsQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const update = useUpdateSoftwareMutation();

  const [name, setName] = useState(software.software_name);
  const [vendorId, setVendorId] = useState<number>(software.vendor_id);
  const [categoryId, setCategoryId] = useState<number>(software.category_id);
  const [ownerId, setOwnerId] = useState<number>(software.software_owner_id);
  const [boughtFrom, setBoughtFrom] = useState(software.bought_from || '');
  const [autoRenews, setAutoRenews] = useState(software.auto_renews);
  const [newKey, setNewKey] = useState('');
  const [type, setType] = useState(software.license_type);
  const [seats, setSeats] = useState<number | ''>(software.total_seats ?? '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const assigned = software.stats.assigned_seats;
  const counted = seatsCounted(type);
  const typeChanged = type !== software.license_type;
  const reducing = counted && !typeChanged && seats !== '' && software.total_seats !== null && Number(seats) < software.total_seats;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const n = name.trim();
    if (n.length < 2 || n.length > 100) return setErr('Software Name must be 2 to 100 characters.');
    if (counted && seats !== '' && Number(seats) < assigned) return setErr(`${assigned} seats are assigned. Total Seats cannot be lower than ${assigned}.`);
    if (counted && !typeChanged && seats !== '' && software.total_seats !== null && Number(seats) > software.total_seats) {
      return setErr('To add seats use "Add Seats", with the cost and the invoice.');
    }
    if (reducing && reason.trim().length < 10) return setErr('Please give the reason for reducing seats (at least 10 characters).');
    try {
      await update.mutateAsync({
        id: software.software_id,
        dto: {
          software_name: n,
          vendor_id: vendorId,
          category_id: categoryId,
          software_owner_id: ownerId,
          bought_from: boughtFrom.trim(),
          auto_renews: autoRenews,
          // Blank keeps the stored key; the key is never sent to the screen.
          ...(newKey.trim() ? { license_key: newKey.trim() } : {}),
          ...(typeChanged ? { license_type: type } : {}),
          ...(counted && seats !== '' ? { total_seats: Number(seats) } : {}),
          ...(reducing ? { reason: reason.trim() } : {}),
        },
      });
      onClose();
    } catch (e2) {
      setErr(errText(e2, 'Failed to save the changes.'));
    }
  };

  return (
    <Shell title={`Edit ${software.software_code}`} icon={<Pencil className="w-5 h-5 text-blue-600" />} subtitle="Old and new values are written in the History." onClose={onClose}>
      <form onSubmit={submit} className="p-6 space-y-4">
        <ErrorBox msg={err} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>Software Name *</label>
            <input className={input} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={label}>Vendor / Publisher *</label>
            <select className={input} value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))}>
              {vendors.map((v: any) => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Category *</label>
            <select className={input} value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {categories.map((c: any) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Software Owner *</label>
            <select className={input} value={ownerId} onChange={(e) => setOwnerId(Number(e.target.value))}>
              {employees.map((emp: any) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Bought from / Order No.</label>
            <input className={input} value={boughtFrom} maxLength={100} onChange={(e) => setBoughtFrom(e.target.value)} />
          </div>
          <div>
            <label className={label}>License Type {isAdmin ? '' : '(Admin only)'}</label>
            <select className={input} value={type} disabled={!isAdmin} onChange={(e) => setType(e.target.value)}>
              {LICENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Total Seats</label>
            {counted ? (
              <input
                className={input}
                type="number"
                min={assigned}
                max={10000}
                value={seats}
                onChange={(e) => setSeats(e.target.value ? parseInt(e.target.value, 10) : '')}
              />
            ) : (
              <div className={`${input} bg-slate-50 text-slate-500`}>No limit</div>
            )}
            {counted && <span className="mt-0.5 block text-[10.5px] text-slate-400">{assigned} assigned. Use "Add Seats" for more.</span>}
          </div>
          {reducing && (
            <div className="sm:col-span-2">
              <label className={label}>Reason for fewer seats *</label>
              <input className={input} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 2 seats unused for over 90 days" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={label}>New License Key / Admin account</label>
            <input
              className={`${input} font-mono`}
              type="password"
              autoComplete="off"
              value={newKey}
              maxLength={500}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={software.has_license_key ? 'Leave blank to keep the current key' : 'No key stored'}
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={autoRenews} onChange={(e) => setAutoRenews(e.target.checked)} className="w-4 h-4 rounded-sm border-slate-300" />
            Auto-renews with vendor
          </label>
        </div>
        <Footer onClose={onClose} busy={update.isPending} text="Save Changes" />
      </form>
    </Shell>
  );
};

// ---------------------------------------------------------------------------
// Add Seats
// ---------------------------------------------------------------------------
export const AddSeatsModal: React.FC<{ software: SoftwareDetailsResponse; onClose: () => void }> = ({ software, onClose }) => {
  const add = useAddSeatsMutation(software.software_id);
  const upload = useUploadAttachmentMutation();
  const termStart = software.current_term?.start_date?.slice(0, 10);
  const [seats, setSeats] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');
  const [addedOn, setAddedOn] = useState(today());
  const [invoiceNo, setInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');

  const before = software.stats.total_seats ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (seats === '' || !Number.isInteger(Number(seats)) || Number(seats) < 1) return setErr('Please enter the number of seats added.');
    if (before + Number(seats) > 10000) return setErr('Total Seats cannot be more than 10,000.');
    if (cost === '' || Number(cost) < 0) return setErr('Please enter the amount paid for the added seats.');
    if (addedOn > today()) return setErr('The date cannot be in the future.');
    if (termStart && addedOn < termStart) return setErr('The date cannot be before the current term started.');
    if (file && (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      return setErr('Only PDF, JPG or PNG up to 10 MB.');
    }
    try {
      const ids: number[] = [];
      if (file) {
        const up = await upload.mutateAsync({ entityType: 'TEMP_LICENSE_TERM', file, displayOrder: 1 });
        if (up?.attachment_id) ids.push(up.attachment_id);
      }
      await add.mutateAsync({
        seats: Number(seats),
        cost: Number(cost),
        added_on: addedOn,
        invoice_order_no: invoiceNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        attachment_ids: ids.length ? ids : undefined,
      });
      onClose();
    } catch (e2) {
      setErr(errText(e2, 'Failed to add seats.'));
    }
  };

  return (
    <Shell
      title="Add Seats"
      icon={<PlusCircle className="w-5 h-5 text-emerald-600" />}
      subtitle={`${software.software_name} · ${before} seats now · the term keeps its dates`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="p-6 space-y-4">
        <ErrorBox msg={err} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Seats added *</label>
            <input className={input} type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value ? parseInt(e.target.value, 10) : '')} />
            {seats !== '' && <span className="mt-0.5 block text-[10.5px] text-slate-500">New Total Seats: {before + Number(seats)}</span>}
          </div>
          <div>
            <label className={label}>Cost of the added seats (₹) *</label>
            <input className={input} type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')} />
          </div>
          <div>
            <label className={label}>Date *</label>
            <input className={input} type="date" min={termStart} max={today()} value={addedOn} onChange={(e) => setAddedOn(e.target.value)} />
          </div>
          <div>
            <label className={label}>Invoice / Order No.</label>
            <input className={input} value={invoiceNo} maxLength={100} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Remarks</label>
            <input className={input} value={remarks} maxLength={500} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Invoice</label>
            <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              {file ? file.name : 'Choose file (PDF, JPG or PNG, up to 10 MB)'}
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
        <Footer onClose={onClose} busy={add.isPending || upload.isPending} text="Add Seats" />
      </form>
    </Shell>
  );
};

// ---------------------------------------------------------------------------
// Correct the current term
// ---------------------------------------------------------------------------
export const CorrectTermModal: React.FC<{ software: SoftwareDetailsResponse; onClose: () => void }> = ({ software, onClose }) => {
  const term = software.current_term!;
  const correct = useCorrectTermMutation(software.software_id);
  const [purchase, setPurchase] = useState(term.purchase_date?.slice(0, 10) || '');
  const [start, setStart] = useState(term.start_date.slice(0, 10));
  const [expiry, setExpiry] = useState(term.expiry_date?.slice(0, 10) || '');
  const [cycle, setCycle] = useState(term.billing_cycle || '');
  const [cost, setCost] = useState<number | ''>(Number(term.cost));
  const [invoiceNo, setInvoiceNo] = useState(term.invoice_order_no || '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const needsExpiry = software.license_type.startsWith('Subscription') || software.license_type === 'Trial';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (purchase > today()) return setErr('The purchase date cannot be in the future.');
    if (needsExpiry && !expiry) return setErr('Please fill the Expiry Date.');
    if (expiry && expiry <= start) return setErr('The expiry date must be after the start date.');
    if (reason.trim().length < 10 || reason.trim().length > 500) return setErr('Please give the reason for the correction (10 to 500 characters).');
    try {
      await correct.mutateAsync({
        purchase_date: purchase,
        start_date: start,
        expiry_date: needsExpiry ? expiry : undefined,
        billing_cycle: cycle || undefined,
        cost: cost === '' ? undefined : Number(cost),
        invoice_order_no: invoiceNo,
        reason: reason.trim(),
      });
      onClose();
    } catch (e2) {
      setErr(errText(e2, 'Failed to correct the term.'));
    }
  };

  return (
    <Shell
      title={`Correct Term ${term.term_number}`}
      icon={<CalendarClock className="w-5 h-5 text-amber-600" />}
      subtitle="Only to correct a mistake. The History keeps the old values."
      onClose={onClose}
    >
      <form onSubmit={submit} className="p-6 space-y-4">
        <ErrorBox msg={err} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Purchase Date</label>
            <input className={input} type="date" max={today()} value={purchase} onChange={(e) => setPurchase(e.target.value)} />
          </div>
          <div>
            <label className={label}>Start Date</label>
            <input className={input} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          {needsExpiry && (
            <div>
              <label className={label}>Expiry Date</label>
              <input className={input} type="date" min={start} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          )}
          {cycle !== '' && (
            <div>
              <label className={label}>Billing Cycle</label>
              <select className={input} value={cycle} onChange={(e) => setCycle(e.target.value)}>
                {BILLING_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={label}>Cost for the cycle (₹)</label>
            <input className={input} type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')} />
          </div>
          <div>
            <label className={label}>Invoice / Order No.</label>
            <input className={input} value={invoiceNo} maxLength={100} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <label className={label}>Reason *</label>
            <input className={input} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Expiry date typed wrongly; the invoice says 09 Nov 2026" />
          </div>
        </div>
        <Footer onClose={onClose} busy={correct.isPending} text="Save Correction" />
      </form>
    </Shell>
  );
};
