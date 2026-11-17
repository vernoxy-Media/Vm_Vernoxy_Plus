import React, { useEffect, useState } from 'react';
import {
 X,
 Plus,
 Eye,
 EyeOff,
 Upload,
 AlertCircle,
} from 'lucide-react';
import { useCreateSoftwareMutation } from '../hooks/use-licenses';
import { cycleOptions } from '../billing-cycles';
import {
 useBillingCyclesQuery,
 useLicenseCategoriesQuery,
 useLicenseVendorsQuery,
 useLicenseSettingsQuery,
} from '../hooks/use-license-settings';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useUploadAttachmentMutation } from '@/shared/hooks/use-attachments';

interface AddSoftwareModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess?: () => void;
}

const LICENSE_TYPES = [
 'Subscription · Per User',
 'Subscription · Organisation',
 'Perpetual · Per User',
 'Perpetual · Organisation',
 'Free / Open Source',
 'Trial',
];

export const AddSoftwareModal: React.FC<AddSoftwareModalProps> = ({
 isOpen,
 onClose,
 onSuccess,
}) => {
 const { data: categories = [] } = useLicenseCategoriesQuery();
 const { data: vendors = [] } = useLicenseVendorsQuery();
 const { data: employeeOptions = [] } = useEmployeeOptionsQuery();
 // Types switched off in License Settings are not offered (BFD 11).
 const { data: licenseSettings } = useLicenseSettingsQuery();
 const typeOptions = LICENSE_TYPES.filter((t) => !(licenseSettings?.disabled_license_types || []).includes(t));

 const createSoftwareMutation = useCreateSoftwareMutation();
 const uploadAttachmentMutation = useUploadAttachmentMutation();

 // Form states
 const [softwareName, setSoftwareName] = useState('');
 const [vendorId, setVendorId] = useState<number | ''>('');
 const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
 const [newVendorName, setNewVendorName] = useState('');
 const [categoryId, setCategoryId] = useState<number | ''>('');
 const [licenseType, setLicenseType] = useState('Subscription · Per User');
 useEffect(() => {
 if (typeOptions.length && !typeOptions.includes(licenseType)) setLicenseType(typeOptions[0]);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [licenseSettings]);
 const [totalSeats, setTotalSeats] = useState<number | ''>('');
 const [ownerId, setOwnerId] = useState<number | ''>('');
 const [boughtFrom, setBoughtFrom] = useState('');
 const [licenseKey, setLicenseKey] = useState('');
 const [showKey, setShowKey] = useState(false);
 const [autoRenews, setAutoRenews] = useState(false);

 // Term 1 states
 const todayStr = new Date().toISOString().split('T')[0];
 const [purchaseDate, setPurchaseDate] = useState(todayStr);
 const [startDate, setStartDate] = useState(todayStr);
 const [expiryDate, setExpiryDate] = useState('');
 // Billing Cycles from Settings -> License Settings; the first active one is preselected.
 const { data: allCycles = [] } = useBillingCyclesQuery();
 const cycles = cycleOptions(allCycles);
 const [billingCycle, setBillingCycle] = useState('');
 useEffect(() => {
 if (!billingCycle && cycles[0]) setBillingCycle(cycles[0].name);
 }, [billingCycle, cycles]);
 const [cost, setCost] = useState<number | ''>('');
 const [invoiceOrderNo, setInvoiceOrderNo] = useState('');
 const [expenseClaimNo, setExpenseClaimNo] = useState('');
 const [remarks, setRemarks] = useState('');

 // Uploaded files (BFD 4 Part 1, marker 11: up to 5 files, PDF/JPG/PNG, 10 MB each)
 const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
 const [uploadedIds, setUploadedIds] = useState<number[] | null>(null);
 const [errorMsg, setErrorMsg] = useState('');
 // "Confirm" checks from the server (term vs cycle, possible duplicate, already expired)
 const [confirmMsgs, setConfirmMsgs] = useState<string[] | null>(null);
 const [confirmDiscard, setConfirmDiscard] = useState(false);

 // What the License Type needs (BFD 4 Part 2)
 const seatsCounted = licenseType.endsWith('Per User') || licenseType === 'Trial';
 const needsExpiry = licenseType.startsWith('Subscription') || licenseType === 'Trial';
 const needsCycle = licenseType.startsWith('Subscription') || licenseType.startsWith('Perpetual');
 const isFree = licenseType === 'Free / Open Source' || licenseType === 'Trial';

 if (!isOpen) return null;

 const dirty = Boolean(
 softwareName.trim() || vendorId || newVendorName.trim() || categoryId || totalSeats !== '' || ownerId ||
 boughtFrom.trim() || licenseKey.trim() || expiryDate || cost !== '' || invoiceOrderNo.trim() ||
 expenseClaimNo.trim() || remarks.trim() || selectedFiles.length,
 );
 const requestClose = () => {
 if (dirty && !createSoftwareMutation.isPending) setConfirmDiscard(true);
 else onClose();
 };

 const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
 const pickFiles = (list: FileList | null) => {
 const files = Array.from(list || []);
 const all = [...selectedFiles, ...files];
 if (all.length > 5 || files.some((f) => !ALLOWED.includes(f.type) || f.size > 10 * 1024 * 1024)) {
 setErrorMsg('Only PDF, JPG or PNG up to 10 MB, up to 5 files.');
 return;
 }
 setErrorMsg('');
 setSelectedFiles(all);
 setUploadedIds(null);
 };

 /** The same "Stops" checks as the server (BFD 4 Part 4), so most mistakes show before saving. */
 const checkForm = (): string | null => {
 const name = softwareName.trim();
 if (name.length < 2 || name.length > 100) return 'Software Name must be 2 to 100 characters.';
 if (!vendorId && !newVendorName.trim()) return 'Please choose the Vendor / Publisher.';
 if (!categoryId) return 'Please choose the Category.';
 if (seatsCounted && (totalSeats === '' || !Number.isInteger(Number(totalSeats)) || Number(totalSeats) < 1 || Number(totalSeats) > 10000)) {
 return 'Please enter the number of seats bought, from 1 to 10,000.';
 }
 if (!isFree) {
 const c = Number(cost);
 if (cost === '' || !Number.isFinite(c) || c < 0 || c > 10000000 || Math.abs(c * 100 - Math.round(c * 100)) > 1e-6) {
 return 'Please enter the amount paid for one cycle.';
 }
 }
 if (!purchaseDate) return 'Please fill the Purchase Date.';
 if (purchaseDate > todayStr) return 'The purchase date cannot be in the future.';
 if (!startDate) return 'Please fill the Start Date.';
 if (needsExpiry) {
 if (!expiryDate) return 'Please fill the Expiry Date.';
 if (expiryDate <= startDate) return 'The expiry date must be after the start date.';
 }
 if (!ownerId) return 'Please choose an active employee as owner.';
 return null;
 };

 const save = async (confirm: boolean) => {
 setErrorMsg('');
 const problem = checkForm();
 if (problem) {
 setErrorMsg(problem);
 return;
 }
 try {
 // Upload the documents once; a "Save anyway?" retry reuses them.
 let attachmentIds = uploadedIds;
 if (!attachmentIds) {
 attachmentIds = [];
 for (let k = 0; k < selectedFiles.length; k++) {
 const uploaded = await uploadAttachmentMutation.mutateAsync({
 entityType: 'TEMP_LICENSE_TERM',
 file: selectedFiles[k],
 displayOrder: k + 1,
 });
 if (uploaded?.attachment_id) attachmentIds.push(uploaded.attachment_id);
 }
 setUploadedIds(attachmentIds);
 }

 await createSoftwareMutation.mutateAsync({
 software_name: softwareName.trim(),
 // A new vendor is created by the server only after every check passes.
 vendor_id: !isAddingNewVendor && typeof vendorId === 'number' ? vendorId : undefined,
 vendor_name: isAddingNewVendor ? newVendorName.trim() : undefined,
 category_id: Number(categoryId),
 license_type: licenseType,
 total_seats: seatsCounted ? Number(totalSeats) : undefined,
 software_owner_id: Number(ownerId),
 bought_from: boughtFrom.trim() || undefined,
 license_key: licenseKey.trim() || undefined,
 auto_renews: autoRenews,
 purchase_date: purchaseDate,
 start_date: startDate,
 expiry_date: needsExpiry ? expiryDate : undefined,
 billing_cycle: needsCycle ? billingCycle : undefined,
 cost: isFree ? 0 : Number(cost),
 invoice_order_no: invoiceOrderNo.trim() || undefined,
 expense_claim_no: expenseClaimNo.trim() || undefined,
 remarks: remarks.trim() || undefined,
 attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
 confirm,
 });

 setConfirmMsgs(null);
 onSuccess?.();
 onClose();
 } catch (err: any) {
 if (err?.code === 'CONFIRM_REQUIRED') {
 const msgs = Array.isArray(err?.errors) ? err.errors.map((x: any) => x.message) : [err?.detail || err?.message];
 setConfirmMsgs(msgs.filter(Boolean));
 return;
 }
 setConfirmMsgs(null);
 setErrorMsg(err?.detail || err?.message || 'Failed to register software license');
 }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 void save(false);
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 ">
 <div>
 <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <Plus className="w-5 h-5 text-blue-600" />
 Register New Software License
 </h2>
 <p className="text-xs text-slate-500 ">
 Add software asset metadata, procurement owner, seats, and initial term.
 </p>
 </div>
 <button
 type="button"
 onClick={requestClose}
 className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form Body */}
 <form onSubmit={handleSubmit} className="p-6 space-y-6">
 {errorMsg && (
 <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{errorMsg}</span>
 </div>
 )}

 {/* Section 1: Software Master Details */}
 <div>
 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
 1. Software Metadata
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Software Name */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Software Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={softwareName}
 onChange={(e) => setSoftwareName(e.target.value)}
 placeholder="e.g. Figma Enterprise, JetBrains All Products, Slack Pro"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 />
 </div>

 {/* Vendor */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Vendor / Publisher <span className="text-red-500">*</span>
 </label>
 {!isAddingNewVendor ? (
 <div className="space-y-1">
 <select
 value={vendorId}
 onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : '')}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 >
 <option value="">Select Vendor</option>
 {vendors.map((v) => (
 <option key={v.vendor_id} value={v.vendor_id}>
 {v.name}
 </option>
 ))}
 </select>
 <button
 type="button"
 onClick={() => {
 setIsAddingNewVendor(true);
 setVendorId('');
 }}
 className="text-[11px] text-blue-600 hover:underline"
 >
 + Add New Vendor
 </button>
 </div>
 ) : (
 <div className="space-y-1">
 <input
 type="text"
 placeholder="Enter new vendor name"
 value={newVendorName}
 onChange={(e) => setNewVendorName(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 <button
 type="button"
 onClick={() => setIsAddingNewVendor(false)}
 className="text-[11px] text-slate-500 hover:underline"
 >
 Cancel (choose existing)
 </button>
 </div>
 )}
 </div>

 {/* Category */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Category <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={categoryId}
 onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 >
 <option value="">Select Category</option>
 {categories.map((c) => (
 <option key={c.category_id} value={c.category_id}>
 {c.name}
 </option>
 ))}
 </select>
 </div>

 {/* License Type */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 License Type <span className="text-red-500">*</span>
 </label>
 <select
 value={licenseType}
 onChange={(e) => setLicenseType(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 >
 {typeOptions.map((t) => (
 <option key={t} value={t}>
 {t}
 </option>
 ))}
 </select>
 </div>

 {/* Total Seats: Per User and Trial only; Organisation and Free have no limit */}
 {seatsCounted ? (
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Total Seats <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 min="1"
 max="10000"
 step="1"
 value={totalSeats}
 onChange={(e) => setTotalSeats(e.target.value ? parseInt(e.target.value, 10) : '')}
 placeholder="1 to 10,000"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 />
 </div>
 ) : (
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">Total Seats</label>
 <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500">No limit</div>
 </div>
 )}

 {/* Software Owner */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Software Owner <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={ownerId}
 onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : '')}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 >
 <option value="">Select Responsible Owner</option>
 {employeeOptions.map((emp: any) => (
 <option key={emp.emp_id} value={emp.emp_id}>
 {emp.name} ({emp.email})
 </option>
 ))}
 </select>
 </div>

 {/* Bought From */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Bought From
 </label>
 <input
 type="text"
 value={boughtFrom}
 onChange={(e) => setBoughtFrom(e.target.value)}
 placeholder="e.g. Direct, Reseller, AWS Marketplace"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 />
 </div>

 {/* License Key */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 License Key / Activation Code
 </label>
 <div className="relative">
 <input
 type={showKey ? 'text' : 'password'}
 value={licenseKey}
 onChange={(e) => setLicenseKey(e.target.value)}
 placeholder="Enter serial or license key"
 className="w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
 />
 <button
 type="button"
 onClick={() => setShowKey(!showKey)}
 className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 "
 >
 {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>

 {/* Auto-Renews Checkbox */}
 <div className="flex items-center gap-2 pt-6">
 <input
 type="checkbox"
 id="auto_renews"
 checked={autoRenews}
 onChange={(e) => setAutoRenews(e.target.checked)}
 className="w-4 h-4 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500 cursor-pointer"
 />
 <label
 htmlFor="auto_renews"
 className="text-xs font-medium text-slate-700 cursor-pointer select-none"
 >
 Auto-renews subscription automatically
 </label>
 </div>
 </div>
 </div>

 <hr className="border-slate-200 " />

 {/* Section 2: Initial Term Details */}
 <div>
 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
 2. Term 1 Procurement & Dates
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Purchase Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Purchase Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 max={todayStr}
 value={purchaseDate}
 onChange={(e) => setPurchaseDate(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Start Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Start Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Expiry Date: Subscription and Trial only */}
 {needsExpiry && (
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Expiry Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 min={startDate || undefined}
 value={expiryDate}
 onChange={(e) => setExpiryDate(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>
 )}

 {/* Billing Cycle: Subscription and Perpetual only */}
 {needsCycle && (
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Billing Cycle
 </label>
 <select
 value={billingCycle}
 onChange={(e) => setBillingCycle(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 >
 {cycles.length === 0 && <option value="">No Billing Cycles: add them in License Settings</option>}
 {cycles.map((c) => (
 <option key={c.cycle_id} value={c.name}>
 {c.name}
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Cost for the cycle: must be 0 for Free and Trial */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Cost for the cycle (₹) {!isFree && <span className="text-red-500">*</span>}
 </label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="10000000"
 disabled={isFree}
 value={isFree ? 0 : cost}
 onChange={(e) => setCost(e.target.value ? parseFloat(e.target.value) : '')}
 placeholder="0.00"
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
 placeholder="e.g. INV-2026-9901"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Expense Claim No */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Expense Claim No.
 </label>
 <input
 type="text"
 value={expenseClaimNo}
 onChange={(e) => setExpenseClaimNo(e.target.value)}
 placeholder="e.g. EXP-0045"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Remarks */}
 <div className="sm:col-span-2">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Term Remarks / Notes
 </label>
 <input
 type="text"
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 placeholder="Any procurement notes, discount terms or tier details"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Document Attachment */}
 <div className="sm:col-span-3">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Attach Invoice / Contract / License Certificate
 </label>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 cursor-pointer transition">
 <Upload className="w-4 h-4 text-slate-500" />
 <span>Choose File</span>
 <input
 type="file"
 multiple
 accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
 className="hidden"
 onChange={(e) => {
 pickFiles(e.target.files);
 e.target.value = '';
 }}
 />
 </label>
 <span className="text-xs text-slate-400">PDF, JPG or PNG, up to 10 MB each, up to 5 files</span>
 </div>
 {selectedFiles.length > 0 && (
 <ul className="mt-2 space-y-1">
 {selectedFiles.map((f, k) => (
 <li key={`${f.name}-${k}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-xs">
 <span className="truncate text-slate-700">{f.name} · {(f.size / 1024).toFixed(0)} KB</span>
 <button
 type="button"
 className="text-red-600 hover:underline"
 onClick={() => {
 setSelectedFiles(selectedFiles.filter((_, x) => x !== k));
 setUploadedIds(null);
 }}
 >
 Remove
 </button>
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={requestClose}
 className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={createSoftwareMutation.isPending}
 className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
 >
 {createSoftwareMutation.isPending || uploadAttachmentMutation.isPending ? 'Saving...' : 'Save Software'}
 </button>
 </div>
 </form>
 </div>

 {/* "Save anyway?" (BFD 4 Part 4: Confirm checks) */}
 {confirmMsgs && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
 <h3 className="text-sm font-bold text-slate-900">Please confirm</h3>
 <ul className="mt-3 space-y-2">
 {confirmMsgs.map((m) => (
 <li key={m} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
 <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
 <span>{m}</span>
 </li>
 ))}
 </ul>
 <div className="mt-4 flex justify-end gap-2">
 <button type="button" onClick={() => setConfirmMsgs(null)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
 Go back
 </button>
 <button
 type="button"
 disabled={createSoftwareMutation.isPending}
 onClick={() => void save(true)}
 className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
 >
 Save anyway
 </button>
 </div>
 </div>
 </div>
 )}

 {/* "Discard this software?" (BFD 4 Part 1, marker 12) */}
 {confirmDiscard && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
 <h3 className="text-sm font-bold text-slate-900">Discard this software?</h3>
 <p className="mt-1 text-xs text-slate-500">Nothing you typed will be saved.</p>
 <div className="mt-4 flex justify-end gap-2">
 <button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
 Keep editing
 </button>
 <button
 type="button"
 onClick={() => {
 setConfirmDiscard(false);
 onClose();
 }}
 className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
 >
 Discard
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
