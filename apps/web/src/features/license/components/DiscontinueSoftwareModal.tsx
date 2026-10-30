import React, { useState } from 'react';
import { X, Ban, AlertTriangle } from 'lucide-react';
import { useDiscontinueLicenseMutation, useSoftwareListQuery } from '../hooks/use-licenses';
import { useLicenseDiscontinueReasonsQuery } from '../hooks/use-license-settings';

interface DiscontinueSoftwareModalProps {
 isOpen: boolean;
 softwareId: number;
 softwareName: string;
 activeSeats: number;
 onClose: () => void;
 onSuccess?: () => void;
}

export const DiscontinueSoftwareModal: React.FC<DiscontinueSoftwareModalProps> = ({
 isOpen,
 softwareId,
 softwareName,
 activeSeats,
 onClose,
 onSuccess,
}) => {
 const { data: reasons = [] } = useLicenseDiscontinueReasonsQuery();
 const { data: softwareListData } = useSoftwareListQuery({ limit: 100, status: 'Active' });
 const discontinueMutation = useDiscontinueLicenseMutation();

 const todayStr = new Date().toISOString().split('T')[0];
 const [discontinueDate, setDiscontinueDate] = useState(todayStr);
 const [reasonId, setReasonId] = useState<number | ''>('');
 const [replacedBySoftwareId, setReplacedBySoftwareId] = useState<number | ''>('');
 const [remarks, setRemarks] = useState('');
 const [errorMsg, setErrorMsg] = useState('');

 if (!isOpen) return null;

 const otherSoftwareOptions = (softwareListData?.items || []).filter(
 (s) => s.software_id !== softwareId,
 );

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg('');

 if (!reasonId) {
 setErrorMsg('Please select a discontinuation reason');
 return;
 }

 try {
 await discontinueMutation.mutateAsync({
 id: softwareId,
 dto: {
 discontinue_date: discontinueDate,
 discontinue_reason_id: Number(reasonId),
 discontinue_remarks: remarks.trim() || undefined,
 replaced_by_software_id:
 replacedBySoftwareId !== '' ? Number(replacedBySoftwareId) : undefined,
 },
 });

 onSuccess?.();
 onClose();
 } catch (err: any) {
 setErrorMsg(err?.message || 'Failed to discontinue software');
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50/50 ">
 <div>
 <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
 <Ban className="w-5 h-5 text-red-600" />
 Discontinue Software: {softwareName}
 </h2>
 <p className="text-xs text-red-700/80 ">
 Permanently marks software as discontinued and revokes all active seats.
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
 <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
 {errorMsg}
 </div>
 )}

 {activeSeats > 0 && (
 <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 ">
 <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
 <div>
 <strong>Warning:</strong> {activeSeats} employee seat(s) are currently active.
 Discontinuing this software will automatically revoke all of them.
 </div>
 </div>
 )}

 {/* Effective Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Effective Discontinuation Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={discontinueDate}
 onChange={(e) => setDiscontinueDate(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Reason */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Discontinuation Reason <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={reasonId}
 onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : '')}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 >
 <option value="">Select Reason</option>
 {reasons.map((r) => (
 <option key={r.reason_id} value={r.reason_id}>
 {r.name}
 </option>
 ))}
 </select>
 </div>

 {/* Replaced By Software (Optional) */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Replaced By Alternative Software (Optional)
 </label>
 <select
 value={replacedBySoftwareId}
 onChange={(e) =>
 setReplacedBySoftwareId(e.target.value ? Number(e.target.value) : '')
 }
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 >
 <option value="">None (No replacement software)</option>
 {otherSoftwareOptions.map((s) => (
 <option key={s.software_id} value={s.software_id}>
 {s.software_code} - {s.software_name} ({s.vendor})
 </option>
 ))}
 </select>
 </div>

 {/* Remarks */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Remarks
 </label>
 <textarea
 rows={2}
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 placeholder="e.g. Migration completed to Canva Pro; old accounts closed"
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
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
 disabled={discontinueMutation.isPending}
 className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition disabled:opacity-50"
 >
 {discontinueMutation.isPending ? 'Discontinuing...' : 'Confirm Discontinue'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

