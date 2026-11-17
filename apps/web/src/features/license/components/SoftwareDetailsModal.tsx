import React, { useState } from 'react';
import {
 X,
 FileText,
 UserPlus,
 RefreshCw,
 Ban,
 Download,
} from 'lucide-react';
import { useRevealLicenseKeyMutation, useSoftwareDetailsQuery } from '../hooks/use-licenses';
import { AssignLicenseModal } from './AssignLicenseModal';
import { RenewLicenseModal } from './RenewLicenseModal';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';
import { DiscontinueSoftwareModal } from './DiscontinueSoftwareModal';
import { AddSeatsModal, CorrectTermModal, EditSoftwareModal } from './SoftwareChangeModals';
import { ExportMenu } from '@/shared/ui/ExportMenu';
import { dmy } from '@/shared/utils/table-export';

interface SoftwareDetailsModalProps {
 isOpen: boolean;
 softwareId: number | null;
 onClose: () => void;
 /** Ignored when the server sends the viewer's rights with the details. */
 canManage?: boolean;
}

export const SoftwareDetailsModal: React.FC<SoftwareDetailsModalProps> = ({
 isOpen,
 softwareId,
 onClose,
 canManage: canManageProp = false,
}) => {
 const { data: software, isLoading } = useSoftwareDetailsQuery(softwareId || 0);
 // Rights come from the server (BFD 13); keys are fetched on Show/Copy and logged (BFD 4 Part 3).
 const canManage = software?.viewer ? software.viewer.can_manage : canManageProp;
 const canViewKey = Boolean(software?.viewer?.can_view_keys);
 const canReopen = Boolean(software?.viewer?.can_reopen);
 const todayIso = new Date().toISOString().slice(0, 10);
 // A future Effective Date: "Discontinues on 09 Nov 2026" until then (BFD 7 Part 3).
 const scheduledEnd =
 software && software.status !== 'Discontinued' && software.discontinue_date && software.discontinue_date.slice(0, 10) > todayIso
 ? software.discontinue_date.slice(0, 10).split('-').reverse().join('-')
 : null;
 const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
 const inr = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
 const btnOutline = 'h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-[12.5px] font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50';
 const expiryIso = software?.current_term?.expiry_date?.slice(0, 10);
 const daysLeft = expiryIso ? Math.round((Date.parse(`${expiryIso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000) : null;
 const activeSeats = (software?.software_license_assignments || []).filter((a) => a.status === 'Active');
 const toRecover = activeSeats
 .filter((a) => a.is_flagged_to_recover)
 .map((a) => a.employees_software_license_assignments_emp_idToemployees?.name || `Emp #${a.emp_id}`);
 const perSeat =
 software?.current_term && software.stats.total_seats ? Number(software.current_term.cost) / software.stats.total_seats : null;
 const revealKey = useRevealLicenseKeyMutation(softwareId || 0);
 const [revealedKey, setRevealedKey] = useState<string | null>(null);

 const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'terms' | 'documents' | 'history'>('overview');
 const [showKey, setShowKey] = useState(false);
 const [copiedKey, setCopiedKey] = useState(false);

 // Sub-modal triggers
 const [isAssignOpen, setIsAssignOpen] = useState(false);
 const [isRenewOpen, setIsRenewOpen] = useState(false);
 const [isDiscontinueOpen, setIsDiscontinueOpen] = useState(false);
 // "Revoke several" (BFD 6 Part 2)
 const [selectedIds, setSelectedIds] = useState<number[]>([]);
 const [isBulkRevokeOpen, setIsBulkRevokeOpen] = useState(false);
 // BFD 5 Part 2: Edit, Add Seats, Correct the current term
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [isAddSeatsOpen, setIsAddSeatsOpen] = useState(false);
 const [isCorrectOpen, setIsCorrectOpen] = useState(false);
 // History filters (BFD 8: by date range, event and person)
 const [histFrom, setHistFrom] = useState('');
 const [histTo, setHistTo] = useState('');
 const [histEvent, setHistEvent] = useState('');
 const [histPerson, setHistPerson] = useState('');
 const [selectedAssignmentToRevoke, setSelectedAssignmentToRevoke] = useState<{
 id: number;
 empName: string;
 } | null>(null);

 if (!isOpen || !softwareId) return null;

 const handleToggleKey = async () => {
 if (showKey) {
 setShowKey(false);
 return;
 }
 try {
 const res = await revealKey.mutateAsync('VIEWED');
 setRevealedKey(res.license_key);
 setShowKey(true);
 } catch {
 /* the server refuses users without rights */
 }
 };

 const handleCopyKey = async () => {
 try {
 const res = await revealKey.mutateAsync('COPIED');
 if (res.license_key) {
 await navigator.clipboard.writeText(res.license_key);
 setCopiedKey(true);
 setTimeout(() => setCopiedKey(false), 2000);
 }
 } catch {
 /* ignore */
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'Active':
 return 'bg-emerald-100 text-emerald-700 border-emerald-200 ';
 case 'Expiring Soon':
 return 'bg-amber-100 text-amber-700 border-amber-200 ';
 case 'Expired':
 return 'bg-rose-100 text-rose-700 border-rose-200 ';
 case 'Discontinued':
 return 'bg-slate-200 text-slate-700 border-slate-300 ';
 case 'Trial':
 return 'bg-blue-100 text-blue-700 border-blue-200 ';
 default:
 return 'bg-slate-100 text-slate-700 border-slate-200';
 }
 };

 return (
 <>
 <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
 <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[92vh]">
 {/* Header (BFD 5 marker 1): name, status with days left, Software ID · vendor · category · owner */}
 <div className="px-6 pt-5 pb-0 border-b border-slate-200 bg-white shrink-0">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2.5">
 <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
 {software?.software_name || 'Software Details'}
 </h2>
 {software?.status && (
 <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(software.status)}`}>
 {software.status}
 {daysLeft !== null && software.status !== 'Discontinued' && (
 <> · {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'}` : `expired ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`}</>
 )}
 </span>
 )}
 {scheduledEnd && (
 <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
 Discontinues on {scheduledEnd}
 </span>
 )}
 </div>
 <p className="mt-1 text-[12.5px] text-slate-500">
 <span className="font-mono font-semibold text-slate-600">{software?.software_code || 'SW-....'}</span>
 {software && (
 <>
 {' · '}
 {software.software_license_vendors?.name}
 {' · '}
 {software.software_license_categories?.name}
 {' · '}Owner: <span className="font-medium text-slate-700">{software.employees_software_licenses_software_owner_idToemployees?.name || '—'}</span>
 </>
 )}
 </p>
 </div>

 {/* Edit, Assign, Renew, Discontinue (marker 2): Admin and License Managers only */}
 <div className="flex shrink-0 items-center gap-2">
 {canManage && software && software.status !== 'Discontinued' && (
 <>
 <button type="button" onClick={() => setIsEditOpen(true)} className={btnOutline}>
 Edit
 </button>
 {software.status !== 'Expired' && (
 <button type="button" onClick={() => setIsAssignOpen(true)} className={btnOutline}>
 Assign
 </button>
 )}
 <button
 type="button"
 onClick={() => setIsRenewOpen(true)}
 className="h-9 rounded-xl bg-blue-600 px-4 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
 >
 Renew
 </button>
 {!scheduledEnd && (
 <button
 type="button"
 onClick={() => setIsDiscontinueOpen(true)}
 className="h-9 rounded-xl border border-red-300 bg-white px-3.5 text-[12.5px] font-semibold text-red-600 transition hover:bg-red-50"
 >
 Discontinue
 </button>
 )}
 </>
 )}
 {/* Discontinued software shows no buttons, except "Reopen" for the Admin */}
 {canReopen && software?.status === 'Discontinued' && (
 <button
 type="button"
 onClick={() => setIsRenewOpen(true)}
 className="h-9 rounded-xl bg-blue-600 px-4 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
 >
 Reopen
 </button>
 )}
 <button type="button" onClick={onClose} aria-label="Close" className="ml-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
 <X className="h-5 w-5" />
 </button>
 </div>
 </div>

 {/* Tabs (marker 3) */}
 {software && (
 <div className="mt-4 flex items-center gap-5 overflow-x-auto [scrollbar-width:none]">
 {(
 [
 ['overview', 'Overview'],
 ['assignments', `Assignments (${software.stats.active_assignments_count})`],
 ['terms', `Terms & Renewals (${software.stats.total_terms_count})`],
 ['documents', `Documents (${software.stats.documents_count})`],
 ['history', 'History'],
 ] as const
 ).map(([key, label]) => (
 <button
 key={key}
 type="button"
 onClick={() => setActiveTab(key)}
 className={`shrink-0 border-b-2 pb-2.5 text-[13px] font-semibold transition ${
 activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 )}
 </div>

 {isLoading ? (
 <div className="p-12 text-center text-xs text-slate-400">Loading license details...</div>
 ) : !software ? (
 <div className="p-12 text-center text-xs text-red-500">Software license not found</div>
 ) : (
 <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-5">
 {/* Tab 1: Overview */}
 {activeTab === 'overview' && (
 <div className="space-y-5">
 <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
 {/* Current term (marker 4) */}
 <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-[13.5px] font-bold text-slate-900">
 Current term{software.current_term ? ` (Term ${software.current_term.term_number})` : ''}
 </h3>
 {canManage && software.current_term && software.status !== 'Discontinued' && (
 <button type="button" onClick={() => setIsCorrectOpen(true)} className="text-[11.5px] font-semibold text-amber-700 hover:underline">
 Correct term
 </button>
 )}
 </div>
 {software.current_term ? (
 <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[12.5px]">
 <dt className="text-slate-500">License Type</dt>
 <dd className="font-semibold text-slate-800">{software.license_type}</dd>
 <dt className="text-slate-500">Billing Cycle</dt>
 <dd className="font-semibold text-slate-800">
 {software.current_term.billing_cycle || '—'}
 {software.auto_renews ? ' · auto-renews' : ''}
 </dd>
 <dt className="text-slate-500">Term</dt>
 <dd className="font-semibold text-slate-800">
 {fmt(software.current_term.start_date)} – {software.current_term.expiry_date ? fmt(software.current_term.expiry_date) : 'No expiry'}
 </dd>
 <dt className="text-slate-500">Cost</dt>
 <dd className="font-semibold text-slate-800">
 {inr(software.current_term.cost)}
 {perSeat !== null && <span className="font-normal text-slate-500"> ({inr(perSeat)} per seat)</span>}
 </dd>
 <dt className="text-slate-500">Purchased</dt>
 <dd className="font-semibold text-slate-800">
 {fmt(software.current_term.purchase_date)}
 {(software.current_term.invoice_order_no || software.bought_from) && (
 <span className="font-normal text-slate-500"> · {software.current_term.invoice_order_no || software.bought_from}</span>
 )}
 </dd>
 {canViewKey && (
 <>
 <dt className="text-slate-500">License Key</dt>
 <dd className="flex min-w-0 items-center gap-2">
 {software.has_license_key ? (
 <>
 <span className="truncate font-mono text-slate-800">{showKey && revealedKey ? revealedKey : '••••••••••••••••'}</span>
 <button type="button" disabled={revealKey.isPending} onClick={handleToggleKey} className="shrink-0 text-[12px] font-semibold text-blue-600 hover:underline">
 {showKey ? 'Hide' : 'Show'}
 </button>
 <button type="button" onClick={handleCopyKey} className="shrink-0 text-[12px] font-semibold text-slate-500 hover:text-slate-800">
 {copiedKey ? 'Copied' : 'Copy'}
 </button>
 </>
 ) : (
 <span className="italic text-slate-400">No license key stored</span>
 )}
 </dd>
 </>
 )}
 </dl>
 ) : (
 <p className="text-[12.5px] text-slate-400">No term recorded.</p>
 )}
 </div>

 {/* Seats (marker 5) */}
 <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-[13.5px] font-bold text-slate-900">Seats</h3>
 {canManage && software.stats.total_seats !== null && !['Discontinued', 'Expired'].includes(software.status) && (
 <button type="button" onClick={() => setIsAddSeatsOpen(true)} className="text-[11.5px] font-semibold text-emerald-700 hover:underline">
 + Add Seats
 </button>
 )}
 </div>
 <div className="flex items-baseline gap-1.5">
 <span className="text-3xl font-extrabold text-slate-900">{software.stats.assigned_seats}</span>
 <span className="text-[12.5px] text-slate-500">
 {software.stats.total_seats !== null
 ? `of ${software.stats.total_seats} used · ${software.stats.available_seats ?? 0} free`
 : 'used · No limit'}
 </span>
 </div>
 {software.stats.total_seats !== null && (
 <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
 <div
 className={`h-full rounded-full ${
 (software.stats.seat_utilization_pct || 0) >= 100 ? 'bg-rose-500' : (software.stats.seat_utilization_pct || 0) >= 80 ? 'bg-amber-500' : 'bg-blue-600'
 }`}
 style={{ width: `${Math.min(100, software.stats.seat_utilization_pct || 0)}%` }}
 />
 </div>
 )}
 <dl className="mt-4 grid grid-cols-[130px_1fr] gap-y-2 text-[12.5px]">
 {software.stats.unused_seats_long !== null && software.stats.unused_seats_long !== undefined && (
 <>
 <dt className="text-slate-500">Unused {software.stats.unused_seat_flag_days ?? 90}+ days</dt>
 <dd className="font-semibold text-slate-800">
 {software.stats.unused_seats_long} seat{software.stats.unused_seats_long === 1 ? '' : 's'}
 </dd>
 </>
 )}
 <dt className="text-slate-500">To recover</dt>
 <dd className={`font-semibold ${toRecover.length ? 'text-red-600' : 'text-slate-800'}`}>
 {toRecover.length ? `${toRecover.length} (${toRecover.join(', ')})` : 'None'}
 </dd>
 </dl>
 </div>
 </div>

 {/* Assignments (markers 6 and 7) */}
 <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
 <div className="flex items-center justify-between px-5 pt-4">
 <h3 className="text-[13.5px] font-bold text-slate-900">Assignments</h3>
 {canManage && software.status !== 'Discontinued' && software.status !== 'Expired' && (
 <button type="button" onClick={() => setIsAssignOpen(true)} className="text-[12px] font-semibold text-blue-600 hover:underline">
 + Assign
 </button>
 )}
 </div>
 {activeSeats.length === 0 ? (
 <p className="px-5 py-8 text-center text-[12.5px] text-slate-400">No active assignments.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="mt-2 w-full text-left text-[12.5px]">
 <thead className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
 <tr>
 <th className="px-5 py-2">Employee</th>
 <th className="px-3 py-2">Login / Account ID</th>
 <th className="px-3 py-2">Assigned From</th>
 <th className="px-3 py-2">Flag</th>
 {canManage && <th className="px-5 py-2 text-right">Action</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {activeSeats.map((a) => {
 const emp = a.employees_software_license_assignments_emp_idToemployees;
 return (
 <tr key={a.assignment_id}>
 <td className="px-5 py-2.5">
 <div className="font-semibold text-slate-900">{emp?.name || `Emp #${a.emp_id}`}</div>
 <div className="text-[11px] text-slate-400">
 EMP-{String(a.emp_id).padStart(4, '0')}
 {emp?.departments_employees_dep_idTodepartments?.name ? ` · ${emp.departments_employees_dep_idTodepartments.name}` : ''}
 </div>
 </td>
 <td className="px-3 py-2.5 text-slate-700">{a.login_account_id || '—'}</td>
 <td className="px-3 py-2.5 text-slate-700">{fmt(a.assigned_from)}</td>
 <td className="px-3 py-2.5">
 {a.is_flagged_to_recover ? (
 <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">Deactivated · Recover</span>
 ) : software.status === 'Expired' ? (
 <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">Software expired</span>
 ) : null}
 </td>
 {canManage && (
 <td className="px-5 py-2.5 text-right">
 <button
 type="button"
 onClick={() => setSelectedAssignmentToRevoke({ id: a.assignment_id, empName: emp?.name || `Emp #${a.emp_id}` })}
 className="font-semibold text-blue-600 hover:underline"
 >
 Revoke
 </button>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 <div className="h-2" />
 </div>

 {/* Discontinued details */}
 {software.status === 'Discontinued' && (
 <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[12.5px] text-red-900 space-y-1">
 <div className="flex items-center gap-1.5 font-bold">
 <Ban className="h-4 w-4 text-red-600" />
 Discontinued on {software.discontinue_date ? fmt(software.discontinue_date) : '—'}
 </div>
 <p>
 Reason: <strong>{(software.software_license_discontinue_reasons as any)?.label || software.software_license_discontinue_reasons?.name || 'Unspecified'}</strong>
 </p>
 {software.discontinue_remarks && <p>Remarks: {software.discontinue_remarks}</p>}
 {software.software_licenses && (
 <p>
 Replaced by: <strong>{software.software_licenses.software_code} {software.software_licenses.software_name}</strong>
 </p>
 )}
 </div>
 )}
 </div>
 )}

 {/* Tab 2: Assigned Employees */}
 {activeTab === 'assignments' && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium text-slate-500">
 Active and past assignments for this license
 </span>
 {canManage && software.status !== 'Discontinued' && (
 <button
 type="button"
 onClick={() => setIsAssignOpen(true)}
 className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
 >
 <UserPlus className="w-3.5 h-3.5" />
 <span>Assign Seats</span>
 </button>
 )}
 </div>

 <div className="flex justify-end">
 <ExportMenu
 formats={['excel', 'pdf', 'csv']}
 build={() => ({
 title: `Assignments · ${software.software_code} ${software.software_name}`,
 sheet: `Assignments ${software.software_code}`,
 columns: [
 { header: 'Employee', key: 'emp' },
 { header: 'Login / Account', key: 'login' },
 { header: 'Assigned From', key: 'from' },
 { header: 'Status', key: 'status' },
 { header: 'Revoked on', key: 'revoked' },
 { header: 'Reason / Remarks', key: 'reason' },
 ],
 rows: software.software_license_assignments.map((a: any) => ({
 emp: a.employees_software_license_assignments_emp_idToemployees?.name || `Emp #${a.emp_id}`,
 login: a.login_account_id || '',
 from: dmy(a.assigned_from),
 status: a.status,
 revoked: dmy(a.revoked_on),
 reason: a.revoke_remarks || '',
 })),
 })}
 />
 </div>

 {canManage && selectedIds.length > 0 && (
 <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs">
 <span className="font-semibold text-red-800">{selectedIds.length} seat{selectedIds.length === 1 ? '' : 's'} selected</span>
 <div className="flex items-center gap-3">
 <button type="button" className="text-slate-600 hover:underline" onClick={() => setSelectedIds([])}>
 Clear
 </button>
 <button
 type="button"
 className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
 onClick={() => setIsBulkRevokeOpen(true)}
 >
 Revoke selected
 </button>
 </div>
 </div>
 )}

 <div className="overflow-x-auto rounded-xl border border-slate-200 ">
 <table className="w-full text-left text-xs text-slate-600 ">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 {canManage && (
 <th className="py-2.5 pl-3 w-8">
 {(() => {
 const activeIds = software.software_license_assignments.filter((a) => a.status === 'Active').map((a) => a.assignment_id);
 const all = activeIds.length > 0 && activeIds.every((id) => selectedIds.includes(id));
 return (
 <input
 type="checkbox"
 aria-label="Select all active seats"
 disabled={activeIds.length === 0}
 checked={all}
 onChange={() => setSelectedIds(all ? [] : activeIds)}
 className="h-3.5 w-3.5 rounded border-slate-300"
 />
 );
 })()}
 </th>
 )}
 <th className="py-2.5 px-3">Employee</th>
 <th className="py-2.5 px-3">Department</th>
 <th className="py-2.5 px-3">Account / Login</th>
 <th className="py-2.5 px-3">Assigned On</th>
 <th className="py-2.5 px-3">Status</th>
 {canManage && <th className="py-2.5 px-3 text-right">Actions</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {software.software_license_assignments.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-8 text-center text-slate-400">
 No employees assigned to this software yet.
 </td>
 </tr>
 ) : (
 software.software_license_assignments.map((item) => {
 const emp = item.employees_software_license_assignments_emp_idToemployees;
 const isActive = item.status === 'Active';
 return (
 <tr
 key={item.assignment_id}
 className={`hover:bg-slate-50/50 ${
 item.is_flagged_to_recover ? 'bg-red-50/30 ' : ''
 }`}
 >
 {canManage && (
 <td className="py-2.5 pl-3 w-8">
 {isActive && (
 <input
 type="checkbox"
 aria-label={`Select ${emp?.name || item.emp_id}`}
 checked={selectedIds.includes(item.assignment_id)}
 onChange={() =>
 setSelectedIds((prev) =>
 prev.includes(item.assignment_id) ? prev.filter((x) => x !== item.assignment_id) : [...prev, item.assignment_id],
 )
 }
 className="h-3.5 w-3.5 rounded border-slate-300"
 />
 )}
 </td>
 )}
 <td className="py-2.5 px-3">
 <div className="font-semibold text-slate-900 ">
 {emp?.name || `Emp #${item.emp_id}`}
 </div>
 <div className="text-[10px] text-slate-400">{emp?.email}</div>
 {item.is_flagged_to_recover && (
 <span className="inline-block mt-0.5 text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded-xs">
 Flagged to Recover (Departed)
 </span>
 )}
 </td>
 <td className="py-2.5 px-3 text-slate-500">
 {emp?.departments_employees_dep_idTodepartments?.name || '—'}
 </td>
 <td className="py-2.5 px-3 font-mono text-[11px]">
 {item.login_account_id || '—'}
 </td>
 <td className="py-2.5 px-3 text-slate-500">
 {new Date(item.assigned_from).toLocaleDateString()}
 </td>
 <td className="py-2.5 px-3">
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
 isActive
 ? 'bg-emerald-100 text-emerald-700'
 : 'bg-slate-100 text-slate-600'
 }`}
 >
 {item.status}
 </span>
 {item.revoked_on && (
 <div className="text-[9px] text-slate-400 mt-0.5">
 Revoked {new Date(item.revoked_on).toLocaleDateString()}
 </div>
 )}
 </td>
 {canManage && (
 <td className="py-2.5 px-3 text-right">
 {isActive && (
 <button
 type="button"
 onClick={() =>
 setSelectedAssignmentToRevoke({
 id: item.assignment_id,
 empName: emp?.name || `Emp #${item.emp_id}`,
 })
 }
 className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
 >
 Revoke / Transfer
 </button>
 )}
 </td>
 )}
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Tab 3: Terms & Renewals History */}
 {activeTab === 'terms' && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium text-slate-500">
 Lifecycle terms history (procurement and renewal agreements)
 </span>
 {canManage && software.status !== 'Discontinued' && (
 <button
 type="button"
 onClick={() => setIsRenewOpen(true)}
 className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span>Renew New Term</span>
 </button>
 )}
 </div>

 <div className="space-y-3">
 {software.software_license_terms.map((term) => (
 <div
 key={term.term_id}
 className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
 >
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
 Term {term.term_number}
 </span>
 <span className="text-xs font-semibold text-slate-900 ">
 {term.billing_cycle || '—'}
 </span>
 <span className="text-xs text-slate-400">•</span>
 <span className="text-xs font-bold text-slate-800 ">
 ₹{Number(term.cost).toLocaleString('en-IN')}
 </span>
 </div>
 <div className="text-xs text-slate-500 mt-1">
 {new Date(term.start_date).toLocaleDateString()} —{' '}
 {term.expiry_date ? new Date(term.expiry_date).toLocaleDateString() : 'No Expiry'}
 </div>
 {(term.invoice_order_no || term.expense_claim_no) && (
 <div className="text-[11px] text-slate-400 mt-1 flex gap-3">
 {term.invoice_order_no && <span>Invoice: {term.invoice_order_no}</span>}
 {term.expense_claim_no && <span>Claim: {term.expense_claim_no}</span>}
 </div>
 )}
 {term.remarks && (
 <p className="text-xs text-slate-600 italic mt-1.5">{term.remarks}</p>
 )}
 </div>

 <div className="text-right text-[11px] text-slate-400">
 <div>Recorded by: {term.employees?.name}</div>
 <div>{new Date(term.created_at).toLocaleDateString()}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Tab 4: Unified Documents */}
 {activeTab === 'documents' && (
 <div className="space-y-3">
 <span className="text-xs font-medium text-slate-500 block">
 All contracts, invoices, and certificates associated with terms
 </span>

 {software.documents.length === 0 ? (
 <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 ">
 No documents attached to any term yet.
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {software.documents.map((doc) => (
 <div
 key={doc.attachment_id}
 className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 "
 >
 <div className="flex items-center gap-2.5 overflow-hidden">
 <FileText className="w-5 h-5 text-blue-500 shrink-0" />
 <div className="overflow-hidden">
 <span className="text-xs font-semibold text-slate-800 truncate block">
 {doc.file_name}
 </span>
 <span className="text-[10px] text-slate-400">
 {new Date(doc.created_at).toLocaleDateString()} • {(Number(doc.file_size_bytes) / 1024).toFixed(1)} KB
 </span>
 </div>
 </div>
 <a
 href={doc.file_url}
 target="_blank"
 rel="noopener noreferrer"
 className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition"
 title="Download/view file"
 >
 <Download className="w-4 h-4" />
 </a>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Tab 5: Unified Activity History */}
 {activeTab === 'history' && (() => {
 const eventLabel = (e: string) => e.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
 const events = Array.from(new Set(software.activity_logs.map((l) => l.event))).sort();
 const people = Array.from(new Set(software.activity_logs.map((l) => l.performer?.name || 'System'))).sort();
 const logs = software.activity_logs.filter((l) => {
 const day = String(l.performed_at).slice(0, 10);
 return (
 (!histFrom || day >= histFrom) &&
 (!histTo || day <= histTo) &&
 (!histEvent || l.event === histEvent) &&
 (!histPerson || (l.performer?.name || 'System') === histPerson)
 );
 });
 const fieldCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700';
 return (
 <div className="space-y-3">
 <div className="flex flex-wrap items-end gap-2">
 <label className="text-[10.5px] font-semibold uppercase text-slate-500">
 From
 <input type="date" className={`${fieldCls} mt-0.5 block`} value={histFrom} onChange={(e) => setHistFrom(e.target.value)} />
 </label>
 <label className="text-[10.5px] font-semibold uppercase text-slate-500">
 To
 <input type="date" className={`${fieldCls} mt-0.5 block`} value={histTo} min={histFrom || undefined} onChange={(e) => setHistTo(e.target.value)} />
 </label>
 <label className="text-[10.5px] font-semibold uppercase text-slate-500">
 Event
 <select className={`${fieldCls} mt-0.5 block w-44`} value={histEvent} onChange={(e) => setHistEvent(e.target.value)}>
 <option value="">All events</option>
 {events.map((ev) => (
 <option key={ev} value={ev}>{eventLabel(ev)}</option>
 ))}
 </select>
 </label>
 <label className="text-[10.5px] font-semibold uppercase text-slate-500">
 Person
 <select className={`${fieldCls} mt-0.5 block w-40`} value={histPerson} onChange={(e) => setHistPerson(e.target.value)}>
 <option value="">Anyone</option>
 {people.map((p) => (
 <option key={p} value={p}>{p}</option>
 ))}
 </select>
 </label>
 {(histFrom || histTo || histEvent || histPerson) && (
 <button type="button" className="h-9 px-2 text-xs font-semibold text-blue-600 hover:underline" onClick={() => { setHistFrom(''); setHistTo(''); setHistEvent(''); setHistPerson(''); }}>
 Reset
 </button>
 )}
 <div className="ml-auto">
 <ExportMenu
 formats={['excel', 'pdf']}
 build={() => ({
 title: `License History · ${software.software_code} ${software.software_name}`,
 sheet: `History ${software.software_code}`,
 columns: [
 { header: 'Date and time', key: 'when' },
 { header: 'Event', key: 'event' },
 { header: 'Details', key: 'summary' },
 { header: 'By', key: 'by' },
 ],
 rows: logs.map((l) => ({
 when: new Date(l.performed_at).toLocaleString('en-GB'),
 event: eventLabel(l.event),
 summary: l.summary,
 by: l.performer?.name || 'System',
 })),
 })}
 />
 </div>
 </div>
 <span className="text-xs font-medium text-slate-500 block">{logs.length} of {software.activity_logs.length} entries. Entries cannot be changed or deleted.</span>

 <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 ">
 {logs.map((log) => (
 <div key={log.log_id} className="relative">
 <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white " />
 <div>
 <div className="text-xs font-semibold text-slate-800 ">
 {log.summary}
 </div>
 <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
 <span>{new Date(log.performed_at).toLocaleString()}</span>
 <span>•</span>
 <span>By: {log.performer?.name || 'System'}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })()}
 </div>
 )}
 </div>
 </div>

 {/* Sub Modals */}
 {software && (
 <>
 <AssignLicenseModal
 isOpen={isAssignOpen}
 softwareId={software.software_id}
 softwareName={software.software_name}
 totalSeats={software.stats.total_seats}
 assignedSeats={software.stats.assigned_seats}
 heldEmpIds={software.software_license_assignments.filter((a) => a.status === 'Active').map((a) => a.emp_id)}
 firstTermStart={software.stats.first_term_start ?? null}
 onClose={() => setIsAssignOpen(false)}
 />

 {isEditOpen && (
 <EditSoftwareModal software={software} isAdmin={Boolean(software.viewer?.is_admin)} onClose={() => setIsEditOpen(false)} />
 )}
 {isAddSeatsOpen && <AddSeatsModal software={software} onClose={() => setIsAddSeatsOpen(false)} />}
 {isCorrectOpen && software.current_term && <CorrectTermModal software={software} onClose={() => setIsCorrectOpen(false)} />}

 <RenewLicenseModal
 isOpen={isRenewOpen}
 softwareId={software.software_id}
 softwareName={software.software_name}
 softwareCode={software.software_code}
 licenseType={software.license_type}
 assignedSeats={software.stats.assigned_seats}
 reopening={software.status === 'Discontinued'}
 previousTerm={
 software.current_term
 ? {
 term_number: software.current_term.term_number,
 billing_cycle: software.current_term.billing_cycle,
 cost: Number(software.current_term.cost),
 start_date: software.current_term.start_date,
 expiry_date: software.current_term.expiry_date,
 total_seats: software.stats.total_seats,
 }
 : null
 }
 onClose={() => setIsRenewOpen(false)}
 />

 <DiscontinueSoftwareModal
 isOpen={isDiscontinueOpen}
 softwareId={software.software_id}
 softwareName={software.software_name}
 activeSeats={software.stats.assigned_seats}
 termStart={software.current_term?.start_date ?? null}
 termExpiry={software.current_term?.expiry_date ?? null}
 onClose={() => setIsDiscontinueOpen(false)}
 />

 {isBulkRevokeOpen && selectedIds.length > 0 && (
 <RevokeAssignmentModal
 isOpen={isBulkRevokeOpen}
 assignmentId={selectedIds[0]}
 softwareName={software.software_name}
 employeeName=""
 bulk={{ softwareId: software.software_id, assignmentIds: selectedIds }}
 onClose={() => setIsBulkRevokeOpen(false)}
 onSuccess={() => setSelectedIds([])}
 />
 )}

 {selectedAssignmentToRevoke && (
 <RevokeAssignmentModal
 isOpen={Boolean(selectedAssignmentToRevoke)}
 assignmentId={selectedAssignmentToRevoke.id}
 softwareName={software.software_name}
 employeeName={selectedAssignmentToRevoke.empName}
 onClose={() => setSelectedAssignmentToRevoke(null)}
 />
 )}
 </>
 )}
 </>
 );
};
