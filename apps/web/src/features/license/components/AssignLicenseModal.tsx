import React, { useState } from 'react';
import { X, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { useAssignLicenseMutation } from '../hooks/use-licenses';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';

interface AssignLicenseModalProps {
 isOpen: boolean;
 softwareId: number;
 softwareName: string;
 totalSeats: number | null;
 assignedSeats: number;
 /** Employees who already hold a seat: not offered (BFD 6 Part 1, marker 1). */
 heldEmpIds?: number[];
 /** Assigned From cannot be before the Start Date of Term 1. */
 firstTermStart?: string | null;
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
 heldEmpIds = [],
 firstTermStart,
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
 const [doneNote, setDoneNote] = useState<string | null>(null);

 if (!isOpen) return null;

 const minDate = firstTermStart ? firstTermStart.slice(0, 10) : undefined;
 const picked = rows.map((r) => r.emp_id).filter((id) => id !== '') as number[];
 const optionsFor = (current: number | '') =>
 employeeOptions
 .filter((emp: any) => !heldEmpIds.includes(emp.emp_id) && (emp.emp_id === current || !picked.includes(emp.emp_id)))
 .map((emp: any) => ({ value: emp.emp_id, label: emp.name, sublabel: emp.email }));
 // Seat check (marker 4)
 const notEnough = availableSeats !== null && picked.length > availableSeats;
 const seatNote =
 availableSeats === null
 ? 'This software has no seat limit.'
 : notEnough
 ? `Only ${availableSeats} seat${availableSeats === 1 ? ' is' : 's are'} free.`
 : `${picked.length} of the ${availableSeats} free seat${availableSeats === 1 ? '' : 's'} will be used. ${availableSeats - picked.length} seat${availableSeats - picked.length === 1 ? '' : 's'} will stay free.`;

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
 setErrorMsg(`Only ${availableSeats} seat${availableSeats === 1 ? ' is' : 's are'} free.`);
 return;
 }
 if (assignedFrom > todayStr) {
 setErrorMsg('The Assigned From date cannot be in the future.');
 return;
 }
 if (minDate && assignedFrom < minDate) {
 setErrorMsg('The date cannot be before the Start Date of Term 1.');
 return;
 }
 if (rows.some((r) => r.login_account_id.trim().length > 100)) {
 setErrorMsg('A Login / Account ID can be up to 100 characters.');
 return;
 }

 try {
 const res: any = await assignMutation.mutateAsync({
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
 // Someone deactivated meanwhile is skipped; the others are assigned (BFD 15).
 if (res?.skipped?.length) {
 setDoneNote(`Assigned ${res.count}. ${res.skipped.join('. ')}.`);
 return;
 }
 onClose();
 } catch (err: any) {
 setErrorMsg(err?.detail || err?.message || 'Failed to assign seats');
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl">
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
 {doneNote && (
 <div className="flex items-center gap-2 p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{doneNote}</span>
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
 min={minDate}
 max={todayStr}
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

 <div className="space-y-3">
 {rows.map((row, idx) => (
 <div
 key={idx}
 className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 "
 >
 {/* Employee Dropdown */}
 <div className="w-full sm:w-1/2">
 <SearchableSelect
                        placeholder="Select Employee"
                        searchPlaceholder="Search by employee name or email..."
                        value={row.emp_id}
                        onChange={(val) => {
                          const id = val ? Number(val) : '';
                          const emp: any = employeeOptions.find((e: any) => e.emp_id === id);
                          const updated = [...rows];
                          updated[idx] = {
                            ...updated[idx],
                            emp_id: id,
                            // The office email is filled in and can be changed (marker 3).
                            login_account_id: updated[idx].login_account_id || emp?.office_email || emp?.email || '',
                          };
                          setRows(updated);
                        }}
                        options={optionsFor(row.emp_id)}
                      />
 </div>

 {/* Login Account ID */}
 <div className="w-full sm:flex-1 sm:min-w-0">
 <input
 type="text"
 placeholder="Login / Account ID"
 maxLength={100}
 value={row.login_account_id}
 onChange={(e) => handleRowChange(idx, 'login_account_id', e.target.value)}
 className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 "
 />
 </div>

 {/* Remarks */}
 <div className="w-full sm:flex-1 sm:min-w-0">
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

 <div className={`p-3 text-xs rounded-xl border ${notEnough ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
 {seatNote}
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition"
 >
 {doneNote ? 'Close' : 'Cancel'}
 </button>
 <button
 type="submit"
 disabled={assignMutation.isPending || notEnough || Boolean(doneNote)}
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
