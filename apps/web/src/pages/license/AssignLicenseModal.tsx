import React, { useState } from 'react';
import { X, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { useAssignLicenseMutation } from '../../hooks/use-licenses';
import { useEmployeeOptionsQuery } from '../../hooks/use-organization';

interface AssignLicenseModalProps {
 isOpen: boolean;
 softwareId: number;
 softwareName: string;
 totalSeats: number | null;
 assignedSeats: number;
 onClose: () => void;
 onSuccess?: () => void;
}

interface AssigneeRow {
 emp_id: number | '';
 login_account_id: string;
 remarks: string;
}

export const AssignLicenseModal: React.FC<AssignLicenseModalProps> = ({
 isOpen,
 softwareId,
 softwareName,
 totalSeats,
 assignedSeats,
 onClose,
 onSuccess,
}) => {
 const { data: employeeOptions = [] } = useEmployeeOptionsQuery();
 const assignMutation = useAssignLicenseMutation();

 const availableSeats = totalSeats !== null ? Math.max(0, totalSeats - assignedSeats) : null;
 const todayStr = new Date().toISOString().split('T')[0];

 const [assignedFrom, setAssignedFrom] = useState(todayStr);
 const [rows, setRows] = useState<AssigneeRow[]>([
 { emp_id: '', login_account_id: '', remarks: '' },
 ]);
 const [errorMsg, setErrorMsg] = useState('');

 if (!isOpen) return null;

 const handleAddRow = () => {
 if (availableSeats !== null && rows.length >= availableSeats) {
 setErrorMsg(`Cannot assign more than ${availableSeats} available seat(s)`);
 return;
 }
 setRows([...rows, { emp_id: '', login_account_id: '', remarks: '' }]);
 };

 const handleRemoveRow = (index: number) => {
 if (rows.length === 1) return;
 setRows(rows.filter((_, i) => i !== index));
 };

 const handleRowChange = (index: number, field: keyof AssigneeRow, value: any) => {
 const updated = [...rows];
 updated[index] = { ...updated[index], [field]: value };
 setRows(updated);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg('');

 // Check valid emp_ids
 const empIds = rows.map((r) => r.emp_id).filter((id) => id !== '');
 if (empIds.length === 0) {
 setErrorMsg('Please select at least one employee');
 return;
 }

 // Check duplicate in same batch
 const uniqueIds = new Set(empIds);
 if (uniqueIds.size !== empIds.length) {
 setErrorMsg('Duplicate employees selected in the assignment list');
 return;
 }

 // Capacity check
 if (availableSeats !== null && empIds.length > availableSeats) {
 setErrorMsg(`Only ${availableSeats} seat(s) available, but ${empIds.length} requested.`);
 return;
 }

 try {
 await assignMutation.mutateAsync({
 id: softwareId,
 dto: {
 assigned_from: assignedFrom,
 assignments: rows
 .filter((r) => r.emp_id !== '')
 .map((r) => ({
 emp_id: Number(r.emp_id),
 login_account_id: r.login_account_id.trim() || undefined,
 remarks: r.remarks.trim() || undefined,
 })),
 },
 });

 onSuccess?.();
 onClose();
 } catch (err: any) {
 setErrorMsg(err?.message || 'Failed to assign seats');
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 ">
 <div>
 <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <UserPlus className="w-5 h-5 text-blue-600" />
 Assign Seats: {softwareName}
 </h2>
 <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
 <span>
 Total Seats: <strong>{totalSeats ?? 'Unlimited'}</strong>
 </span>
 <span>•</span>
 <span>
 Active: <strong>{assignedSeats}</strong>
 </span>
 <span>•</span>
 <span className={availableSeats !== null && availableSeats <= 1 ? 'text-amber-600 font-bold' : ''}>
 Available:{' '}
 <strong>{availableSeats !== null ? availableSeats : 'Unlimited'}</strong>
 </span>
 </div>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <form onSubmit={handleSubmit} className="p-6 space-y-5">
 {errorMsg && (
 <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{errorMsg}</span>
 </div>
 )}

 {/* Assigned From Date */}
 <div className="w-full sm:w-1/2">
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Assigned From Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={assignedFrom}
 onChange={(e) => setAssignedFrom(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 "
 />
 </div>

 {/* Assignees Table / List */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-semibold text-slate-700 ">
 Employees to Assign ({rows.length})
 </label>
 <button
 type="button"
 onClick={handleAddRow}
 className="text-xs font-semibold text-blue-600 hover:underline"
 >
 + Add Another Employee
 </button>
 </div>

 <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
 {rows.map((row, idx) => (
 <div
 key={idx}
 className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 "
 >
 {/* Employee Dropdown */}
 <div className="w-full sm:w-5/12">
 <select
 required
 value={row.emp_id}
 onChange={(e) =>
 handleRowChange(
 idx,
 'emp_id',
 e.target.value ? Number(e.target.value) : '',
 )
 }
 className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 "
 >
 <option value="">Select Employee</option>
 {employeeOptions.map((emp: any) => (
 <option key={emp.emp_id} value={emp.emp_id}>
 {emp.name} ({emp.email})
 </option>
 ))}
 </select>
 </div>

 {/* Login Account ID */}
 <div className="w-full sm:w-3/12">
 <input
 type="text"
 placeholder="Login ID / Email (optional)"
 value={row.login_account_id}
 onChange={(e) => handleRowChange(idx, 'login_account_id', e.target.value)}
 className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 "
 />
 </div>

 {/* Remarks */}
 <div className="w-full sm:w-3/12">
 <input
 type="text"
 placeholder="Remarks / Note"
 value={row.remarks}
 onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
 className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 "
 />
 </div>

 {/* Remove Button */}
 {rows.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveRow(idx)}
 className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition"
 title="Remove row"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 ))}
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
 disabled={assignMutation.isPending}
 className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
 >
 {assignMutation.isPending ? 'Assigning...' : `Assign Seats (${rows.length})`}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};
