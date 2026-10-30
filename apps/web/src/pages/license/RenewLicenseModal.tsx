import React, { useState } from 'react';
import {
 X,
 RefreshCw,
 Upload,
 AlertCircle,
 TrendingUp,
 TrendingDown,
 Equal,
} from 'lucide-react';
import { useRenewLicenseMutation } from '../../hooks/use-licenses';
import { useUploadAttachmentMutation } from '../../hooks/use-attachments';

interface RenewLicenseModalProps {
 isOpen: boolean;
 softwareId: number;
 softwareName: string;
 previousTerm?: {
 term_number: number;
 billing_cycle?: string | null;
 cost: number;
 expiry_date?: string | null;
 total_seats?: number | null;
 } | null;
 onClose: () => void;
 onSuccess?: () => void;
}

const BILLING_CYCLES = [
 'Monthly',
 'Quarterly',
 'Yearly',
 'Multi-year',
 'One-time',
];

export const RenewLicenseModal: React.FC<RenewLicenseModalProps> = ({
 isOpen,
 softwareId,
 softwareName,
 previousTerm,
 onClose,
 onSuccess,
}) => {
 const renewMutation = useRenewLicenseMutation();
 const uploadAttachmentMutation = useUploadAttachmentMutation();

 // Compute default start date (day after previous expiry or today)
 let defaultStart = new Date().toISOString().split('T')[0];
 if (previousTerm?.expiry_date) {
 const exp = new Date(previousTerm.expiry_date);
 exp.setDate(exp.getDate() + 1);
 defaultStart = exp.toISOString().split('T')[0];
 }

 // Compute default expiry date (1 year later)
 const computeNextYear = (startDateStr: string) => {
 const s = new Date(startDateStr);
 s.setFullYear(s.getFullYear() + 1);
 return s.toISOString().split('T')[0];
 };

 const [startDate, setStartDate] = useState(defaultStart);
 const [expiryDate, setExpiryDate] = useState(computeNextYear(defaultStart));
 const [billingCycle, setBillingCycle] = useState(previousTerm?.billing_cycle || 'Annual');
 const [cost, setCost] = useState<number | ''>(previousTerm?.cost ?? '');
 const [totalSeats, setTotalSeats] = useState<number | ''>(previousTerm?.total_seats ?? '');
 const [invoiceOrderNo, setInvoiceOrderNo] = useState('');
 const [expenseClaimNo, setExpenseClaimNo] = useState('');
 const [remarks, setRemarks] = useState('');
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [errorMsg, setErrorMsg] = useState('');

 if (!isOpen) return null;

 const prevCost = Number(previousTerm?.cost || 0);
 const currentCostNum = Number(cost || 0);
 const costDiff = currentCostNum - prevCost;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg('');

 if (!startDate) {
 setErrorMsg('Start date is required');
 return;
 }
 if (expiryDate && new Date(expiryDate) <= new Date(startDate)) {
 setErrorMsg('Expiry date must be after start date');
 return;
 }

 try {
 const attachmentIds: number[] = [];
 if (selectedFile) {
 const uploaded = await uploadAttachmentMutation.mutateAsync({
 entityType: 'TEMP_LICENSE_TERM',
 file: selectedFile,
 displayOrder: 1,
 });
 if (uploaded?.attachment_id) {
 attachmentIds.push(uploaded.attachment_id);
 }
 }

 await renewMutation.mutateAsync({
 id: softwareId,
 dto: {
 start_date: startDate,
 expiry_date: expiryDate || undefined,
 billing_cycle: billingCycle,
 cost: cost !== '' ? Number(cost) : undefined,
 total_seats: totalSeats !== '' ? Number(totalSeats) : undefined,
 invoice_order_no: invoiceOrderNo.trim() || undefined,
 expense_claim_no: expenseClaimNo.trim() || undefined,
 remarks: remarks.trim() || undefined,
 attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
 },
 });

 onSuccess?.();
 onClose();
 } catch (err: any) {
 setErrorMsg(err?.message || 'Failed to renew license');
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 ">
 <div>
 <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <RefreshCw className="w-5 h-5 text-emerald-600" />
 Renew License: {softwareName}
 </h2>
 <p className="text-xs text-slate-500">
 Create Term {(previousTerm?.term_number || 0) + 1} with updated duration, seat capacity & billing.
 </p>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form Body */}
 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {errorMsg && (
 <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{errorMsg}</span>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Start Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 New Term Start Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={startDate}
 onChange={(e) => {
 setStartDate(e.target.value);
 setExpiryDate(computeNextYear(e.target.value));
 }}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Expiry Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 New Expiry Date
 </label>
 <input
 type="date"
 value={expiryDate}
 onChange={(e) => setExpiryDate(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Billing Cycle */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Billing Cycle
 </label>
 <select
 value={billingCycle}
 onChange={(e) => setBillingCycle(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 >
 {BILLING_CYCLES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>

 {/* Cost with Comparison Badge */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Renewal Cost (₹)
 </label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={cost}
 onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')}
 placeholder="0.00"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 {previousTerm && prevCost > 0 && cost !== '' && (
 <div className="flex items-center gap-1.5 mt-1 text-[11px]">
 {costDiff > 0 ? (
 <span className="flex items-center gap-1 text-red-600 font-medium">
 <TrendingUp className="w-3.5 h-3.5" /> +₹{costDiff.toFixed(2)} (increased)
 </span>
 ) : costDiff < 0 ? (
 <span className="flex items-center gap-1 text-emerald-600 font-medium">
 <TrendingDown className="w-3.5 h-3.5" /> -₹{Math.abs(costDiff).toFixed(2)} (savings)
 </span>
 ) : (
 <span className="flex items-center gap-1 text-slate-500">
 <Equal className="w-3.5 h-3.5" /> Same as previous term
 </span>
 )}
 </div>
 )}
 </div>

 {/* Seat Capacity */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Total Seats Capacity
 </label>
 <input
 type="number"
 min="1"
 value={totalSeats}
 onChange={(e) => setTotalSeats(e.target.value ? parseInt(e.target.value, 10) : '')}
 placeholder="Seats (e.g. 25)"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Invoice / PO No */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Invoice / PO No.
 </label>
 <input
 type="text"
 value={invoiceOrderNo}
 onChange={(e) => setInvoiceOrderNo(e.target.value)}
 placeholder="INV-..."
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Expense Claim No */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Expense Claim No.
 </label>
 <input
 type="text"
 value={expenseClaimNo}
 onChange={(e) => setExpenseClaimNo(e.target.value)}
 placeholder="EXP-..."
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Remarks */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Remarks
 </label>
 <input
 type="text"
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 placeholder="Renewal notes or discounts"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Document Upload */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Attach Renewal Invoice / Contract
 </label>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 cursor-pointer transition">
 <Upload className="w-4 h-4 text-slate-500" />
 <span>Choose File</span>
 <input
 type="file"
 className="hidden"
 onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
 />
 </label>
 {selectedFile ? (
 <span className="text-xs text-emerald-600 font-medium truncate">
 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
 </span>
 ) : (
 <span className="text-xs text-slate-400">PDF, PNG, JPG up to 10MB</span>
 )}
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={renewMutation.isPending}
 className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
 >
 {renewMutation.isPending ? 'Renewing...' : 'Renew License Term'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};
