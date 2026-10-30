import React, { useState } from 'react';
import { X, UserMinus, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useRevokeAssignmentMutation } from '../../hooks/use-licenses';
import { useLicenseRevokeReasonsQuery } from '../../hooks/use-license-settings';
import { useEmployeeOptionsQuery } from '../../hooks/use-organization';

interface RevokeAssignmentModalProps {
 isOpen: boolean;
 assignmentId: number;
 softwareName: string;
 employeeName: string;
 onClose: () => void;
 onSuccess?: () => void;
}

export const RevokeAssignmentModal: React.FC<RevokeAssignmentModalProps> = ({
 isOpen,
 assignmentId,
 softwareName,
 employeeName,
 onClose,
 onSuccess,
}) => {
 const { data: reasons = [] } = useLicenseRevokeReasonsQuery();
 const { data: employeeOptions = [] } = useEmployeeOptionsQuery();
 const revokeMutation = useRevokeAssignmentMutation();

 const todayStr = new Date().toISOString().split('T')[0];
 const [revokedOn, setRevokedOn] = useState(todayStr);
 const [reasonId, setReasonId] = useState<number | ''>('');
 const [isTransferring, setIsTransferring] = useState(false);
 const [transferredToEmpId, setTransferredToEmpId] = useState<number | ''>('');
 const [remarks, setRemarks] = useState('');
 const [errorMsg, setErrorMsg] = useState('');

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg('');

 if (!reasonId) {
 setErrorMsg('Please select a revocation reason');
 return;
 }
 if (isTransferring && !transferredToEmpId) {
 setErrorMsg('Please select the employee to transfer the seat to');
 return;
 }

 try {
 await revokeMutation.mutateAsync({
 assignmentId,
 dto: {
 revoked_on: revokedOn,
 revoke_reason_id: Number(reasonId),
 revoke_remarks: remarks.trim() || undefined,
 transferred_to_emp_id: isTransferring && transferredToEmpId ? Number(transferredToEmpId) : undefined,
 },
 });

 onSuccess?.();
 onClose();
 } catch (err: any) {
 setErrorMsg(err?.message || 'Failed to revoke assignment');
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 ">
 <div>
 <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 {isTransferring ? (
 <ArrowRightLeft className="w-5 h-5 text-purple-600" />
 ) : (
 <UserMinus className="w-5 h-5 text-red-600" />
 )}
 {isTransferring ? 'Transfer License Seat' : 'Revoke License Seat'}
 </h2>
 <p className="text-xs text-slate-500">
 {softwareName} • Currently assigned to <strong>{employeeName}</strong>
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

 {/* Action Toggle */}
 <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
 <button
 type="button"
 onClick={() => setIsTransferring(false)}
 className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
 !isTransferring
 ? 'bg-white text-slate-900 shadow-xs'
 : 'text-slate-600 hover:text-slate-900'
 }`}
 >
 Revoke Only (Release Seat)
 </button>
 <button
 type="button"
 onClick={() => setIsTransferring(true)}
 className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
 isTransferring
 ? 'bg-white text-slate-900 shadow-xs'
 : 'text-slate-600 hover:text-slate-900'
 }`}
 >
 Transfer Seat to Another Colleague
 </button>
 </div>

 {/* Transfer Target (If Transferring) */}
 {isTransferring && (
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Transfer To Employee <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={transferredToEmpId}
 onChange={(e) => setTransferredToEmpId(e.target.value ? Number(e.target.value) : '')}
 className="w-full px-3 py-2 text-sm border border-purple-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-purple-500/20"
 >
 <option value="">Select Target Employee</option>
 {employeeOptions.map((emp: any) => (
 <option key={emp.emp_id} value={emp.emp_id}>
 {emp.name} ({emp.email})
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Revocation Date */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Effective Revoke / Transfer Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={revokedOn}
 onChange={(e) => setRevokedOn(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Reason */}
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Reason <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={reasonId}
 onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : '')}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 >
 <option value="">Select Revocation Reason</option>
 {reasons.map((r) => (
 <option key={r.reason_id} value={r.reason_id}>
 {r.name}
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
 placeholder="e.g. Employee relieved; handed over credentials"
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
 disabled={revokeMutation.isPending}
 className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition disabled:opacity-50 ${
 isTransferring ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'
 }`}
 >
 {revokeMutation.isPending
 ? 'Processing...'
 : isTransferring
 ? 'Transfer Seat'
 : 'Revoke Assignment'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

