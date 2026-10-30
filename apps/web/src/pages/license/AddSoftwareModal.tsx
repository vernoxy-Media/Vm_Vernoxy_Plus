import React, { useState } from 'react';
import {
 X,
 Plus,
 Eye,
 EyeOff,
 Upload,
 AlertCircle,
} from 'lucide-react';
import { useCreateSoftwareMutation } from '../../hooks/use-licenses';
import {
 useLicenseCategoriesQuery,
 useLicenseVendorsQuery,
 useCreateLicenseVendorMutation,
} from '../../hooks/use-license-settings';
import { useEmployeeOptionsQuery } from '../../hooks/use-organization';
import { useUploadAttachmentMutation } from '../../hooks/use-attachments';

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

const BILLING_CYCLES = [
 'Monthly',
 'Quarterly',
 'Yearly',
 'Multi-year',
 'One-time',
];

export const AddSoftwareModal: React.FC<AddSoftwareModalProps> = ({
 isOpen,
 onClose,
 onSuccess,
}) => {
 const { data: categories = [] } = useLicenseCategoriesQuery();
 const { data: vendors = [] } = useLicenseVendorsQuery();
 const { data: employeeOptions = [] } = useEmployeeOptionsQuery();

 const createSoftwareMutation = useCreateSoftwareMutation();
 const createVendorMutation = useCreateLicenseVendorMutation();
 const uploadAttachmentMutation = useUploadAttachmentMutation();

 // Form states
 const [softwareName, setSoftwareName] = useState('');
 const [vendorId, setVendorId] = useState<number | ''>('');
 const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
 const [newVendorName, setNewVendorName] = useState('');
 const [categoryId, setCategoryId] = useState<number | ''>('');
 const [licenseType, setLicenseType] = useState('Subscription · Per User');
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
 const [billingCycle, setBillingCycle] = useState('Yearly');
 const [cost, setCost] = useState<number | ''>('');
 const [invoiceOrderNo, setInvoiceOrderNo] = useState('');
 const [expenseClaimNo, setExpenseClaimNo] = useState('');
 const [remarks, setRemarks] = useState('');

 // Uploaded files
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [errorMsg, setErrorMsg] = useState('');

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg('');

 if (!softwareName.trim()) {
 setErrorMsg('Please enter a software name');
 return;
 }
 if (!categoryId) {
 setErrorMsg('Please select a category');
 return;
 }
 if (!ownerId) {
 setErrorMsg('Please select a software owner');
 return;
 }
 if (!vendorId && !newVendorName.trim()) {
 setErrorMsg('Please select or specify a vendor');
 return;
 }
 const isExpiringType = licenseType.startsWith('Subscription') || licenseType === 'Trial';
 if (isExpiringType && !expiryDate) {
 setErrorMsg(`Expiry date is required for ${licenseType} licenses`);
 return;
 }

 try {
 let finalVendorId = vendorId;
 if (isAddingNewVendor && newVendorName.trim()) {
 const createdVen = await createVendorMutation.mutateAsync({
 name: newVendorName.trim(),
 });
 finalVendorId = createdVen.vendor_id;
 }

 // 1. Pre-upload file if selected
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

 // 2. Create Software + Term
 await createSoftwareMutation.mutateAsync({
 software_name: softwareName.trim(),
 vendor_id: typeof finalVendorId === 'number' ? finalVendorId : undefined,
 vendor_name: isAddingNewVendor ? newVendorName.trim() : undefined,
 category_id: Number(categoryId),
 license_type: licenseType,
 total_seats: totalSeats !== '' ? Number(totalSeats) : undefined,
 software_owner_id: Number(ownerId),
 bought_from: boughtFrom.trim() || undefined,
 license_key: licenseKey.trim() || undefined,
 auto_renews: autoRenews,
 purchase_date: purchaseDate || undefined,
 start_date: startDate,
 expiry_date: expiryDate || undefined,
 billing_cycle: billingCycle,
 cost: cost !== '' ? Number(cost) : 0,
 invoice_order_no: invoiceOrderNo.trim() || undefined,
 expense_claim_no: expenseClaimNo.trim() || undefined,
 remarks: remarks.trim() || undefined,
 attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
 });

 onSuccess?.();
 onClose();
 } catch (err: any) {
 setErrorMsg(err?.message || 'Failed to register software license');
 }
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
 onClick={onClose}
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
 {LICENSE_TYPES.map((t) => (
 <option key={t} value={t}>
 {t}
 </option>
 ))}
 </select>
 </div>

 {/* Total Seats */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Total Licensed Seats
 </label>
 <input
 type="number"
 min="1"
 value={totalSeats}
 onChange={(e) => setTotalSeats(e.target.value ? parseInt(e.target.value, 10) : '')}
 placeholder="Leave blank for unlimited"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
 />
 </div>

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
 Purchase Date
 </label>
 <input
 type="date"
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

 {/* Expiry Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Expiry Date {(licenseType.startsWith('Subscription') || licenseType === 'Trial') && <span className="text-red-500">*</span>}
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

 {/* Cost */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Term Cost (₹)
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
 className="hidden"
 onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
 />
 </label>
 {selectedFile ? (
 <span className="text-xs text-emerald-600 font-medium truncate">
 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
 </span>
 ) : (
 <span className="text-xs text-slate-400">PDF, image, or doc up to 10MB</span>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={createSoftwareMutation.isPending}
 className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
 >
 {createSoftwareMutation.isPending ? 'Registering...' : 'Register Software'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};
