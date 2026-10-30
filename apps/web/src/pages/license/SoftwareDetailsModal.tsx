import React, { useState } from 'react';
import {
 X,
 Key,
 Users,
 Calendar,
 FileText,
 Clock,
 UserPlus,
 RefreshCw,
 Ban,
 Copy,
 Check,
 Eye,
 EyeOff,
 Download,
 Building,
 User,
} from 'lucide-react';
import { useSoftwareDetailsQuery } from '../../hooks/use-licenses';
import { AssignLicenseModal } from './AssignLicenseModal';
import { RenewLicenseModal } from './RenewLicenseModal';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';
import { DiscontinueSoftwareModal } from './DiscontinueSoftwareModal';

interface SoftwareDetailsModalProps {
 isOpen: boolean;
 softwareId: number | null;
 onClose: () => void;
 canManage?: boolean;
}

export const SoftwareDetailsModal: React.FC<SoftwareDetailsModalProps> = ({
 isOpen,
 softwareId,
 onClose,
 canManage = true,
}) => {
 const { data: software, isLoading } = useSoftwareDetailsQuery(softwareId || 0);

 const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'terms' | 'documents' | 'history'>('overview');
 const [showKey, setShowKey] = useState(false);
 const [copiedKey, setCopiedKey] = useState(false);

 // Sub-modal triggers
 const [isAssignOpen, setIsAssignOpen] = useState(false);
 const [isRenewOpen, setIsRenewOpen] = useState(false);
 const [isDiscontinueOpen, setIsDiscontinueOpen] = useState(false);
 const [selectedAssignmentToRevoke, setSelectedAssignmentToRevoke] = useState<{
 id: number;
 empName: string;
 } | null>(null);

 if (!isOpen || !softwareId) return null;

 const handleCopyKey = () => {
 if (software?.license_key) {
 navigator.clipboard.writeText(software.license_key);
 setCopiedKey(true);
 setTimeout(() => setCopiedKey(false), 2000);
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
 <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[90vh]">
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
 <div>
 <div className="flex items-center gap-2.5 flex-wrap">
 <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 ">
 {software?.software_code || 'SW-....'}
 </span>
 <h2 className="text-lg font-bold text-slate-900 ">
 {software?.software_name || 'Software Details'}
 </h2>
 {software?.status && (
 <span
 className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
 software.status,
 )}`}
 >
 {software.status}
 </span>
 )}
 {software?.auto_renews && (
 <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
 Auto-Renews
 </span>
 )}
 </div>
 <p className="text-xs text-slate-500 mt-1">
 Vendor: <strong>{software?.software_license_vendors?.name}</strong> • Category:{' '}
 <strong>{software?.software_license_categories?.name}</strong> • Type:{' '}
 <strong>{software?.license_type}</strong>
 </p>
 </div>

 <div className="flex items-center gap-2 self-end sm:self-center">
 {canManage && software && software.status !== 'Discontinued' && (
 <>
 <button
 type="button"
 onClick={() => setIsAssignOpen(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-2xs"
 >
 <UserPlus className="w-3.5 h-3.5" />
 <span>Assign</span>
 </button>
 <button
 type="button"
 onClick={() => setIsRenewOpen(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span>Renew</span>
 </button>
 <button
 type="button"
 onClick={() => setIsDiscontinueOpen(true)}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
 title="Discontinue software"
 >
 <Ban className="w-3.5 h-3.5" />
 </button>
 </>
 )}
 <button
 type="button"
 onClick={onClose}
 className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {isLoading ? (
 <div className="p-12 text-center text-xs text-slate-400">Loading license details...</div>
 ) : !software ? (
 <div className="p-12 text-center text-xs text-red-500">Software license not found</div>
 ) : (
 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 {/* Current Term Overview Card */}
 {software.current_term && (
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/80 ">
 {/* Cost & Cycle */}
 <div>
 <span className="text-[11px] font-medium text-slate-500 block">Current Cost & Billing</span>
 <div className="text-base font-bold text-slate-900 mt-0.5">
 ₹{Number(software.current_term.cost).toLocaleString('en-IN')}
 </div>
 <span className="text-xs text-slate-500">{software.current_term.billing_cycle || 'Annual'}</span>
 </div>

 {/* Term Dates */}
 <div>
 <span className="text-[11px] font-medium text-slate-500 block">Term Duration</span>
 <div className="text-xs font-semibold text-slate-800 mt-1">
 {new Date(software.current_term.start_date).toLocaleDateString()} —{' '}
 {software.current_term.expiry_date
 ? new Date(software.current_term.expiry_date).toLocaleDateString()
 : 'No Expiry'}
 </div>
 {software.current_term.expiry_date && (
 <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 ">
 Term #{software.current_term.term_number}
 </span>
 )}
 </div>

 {/* Seat Utilization Bar */}
 <div className="sm:col-span-2">
 <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1.5">
 <span>Seat Allocation</span>
 <span className="font-bold text-slate-900 ">
 {software.stats.assigned_seats} / {software.stats.total_seats ?? '∞'} seats
 {software.stats.seat_utilization_pct !== null && (
 <span className="ml-1 text-slate-500 font-normal">
 ({software.stats.seat_utilization_pct}% used)
 </span>
 )}
 </span>
 </div>
 <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all duration-300 ${
 (software.stats.seat_utilization_pct || 0) >= 100
 ? 'bg-rose-500'
 : (software.stats.seat_utilization_pct || 0) >= 80
 ? 'bg-amber-500'
 : 'bg-blue-600'
 }`}
 style={{
 width: `${Math.min(100, software.stats.seat_utilization_pct || (software.stats.assigned_seats > 0 ? 100 : 0))}%`,
 }}
 />
 </div>
 <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
 <span>Available: {software.stats.available_seats ?? 'Unlimited'}</span>
 {software.stats.assigned_seats === 0 && <span className="text-amber-500 font-medium">Unused tool</span>}
 </div>
 </div>
 </div>
 )}

 {/* Navigation Tabs */}
 <div className="flex items-center gap-1 border-b border-slate-200 ">
 <button
 type="button"
 onClick={() => setActiveTab('overview')}
 className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
 activeTab === 'overview'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-slate-500 hover:text-slate-900 '
 }`}
 >
 Overview & Key
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('assignments')}
 className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
 activeTab === 'assignments'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-slate-500 hover:text-slate-900 '
 }`}
 >
 <Users className="w-3.5 h-3.5" />
 <span>Assigned Employees ({software.stats.active_assignments_count})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('terms')}
 className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
 activeTab === 'terms'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-slate-500 hover:text-slate-900 '
 }`}
 >
 <Calendar className="w-3.5 h-3.5" />
 <span>Terms & Renewals ({software.stats.total_terms_count})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('documents')}
 className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
 activeTab === 'documents'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-slate-500 hover:text-slate-900 '
 }`}
 >
 <FileText className="w-3.5 h-3.5" />
 <span>Documents ({software.stats.documents_count})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('history')}
 className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
 activeTab === 'history'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-slate-500 hover:text-slate-900 '
 }`}
 >
 <Clock className="w-3.5 h-3.5" />
 <span>Activity History</span>
 </button>
 </div>

 {/* Tab 1: Overview & License Key */}
 {activeTab === 'overview' && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 ">
 <span className="text-[11px] text-slate-400 block mb-1">Software Owner / Lead</span>
 <div className="flex items-center gap-2">
 <User className="w-4 h-4 text-slate-500" />
 <span className="text-xs font-semibold text-slate-800 ">
 {software.employees_software_licenses_software_owner_idToemployees?.name || 'Unassigned'}
 </span>
 </div>
 <span className="text-[11px] text-slate-500 ml-6 block">
 {software.employees_software_licenses_software_owner_idToemployees?.email}
 </span>
 </div>

 <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 ">
 <span className="text-[11px] text-slate-400 block mb-1">Procured From</span>
 <div className="flex items-center gap-2">
 <Building className="w-4 h-4 text-slate-500" />
 <span className="text-xs font-semibold text-slate-800 ">
 {software.bought_from || 'Direct Vendor Purchase'}
 </span>
 </div>
 </div>
 </div>

 {/* License Key Box */}
 <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 ">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
 <Key className="w-4 h-4 text-amber-500" />
 License Key / Serial
 </span>
 {software.license_key && (
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setShowKey(!showKey)}
 className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
 >
 {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 <span>{showKey ? 'Hide' : 'Reveal'}</span>
 </button>
 <button
 type="button"
 onClick={handleCopyKey}
 className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
 >
 {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
 <span>{copiedKey ? 'Copied' : 'Copy'}</span>
 </button>
 </div>
 )}
 </div>
 <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 truncate select-all">
 {software.license_key ? (
 showKey ? (
 software.license_key
 ) : (
 '••••••••••••••••••••••••••••••••'
 )
 ) : (
 <span className="text-slate-400 font-sans italic">No license key stored</span>
 )}
 </div>
 </div>

 {/* Discontinue Details (If Discontinued) */}
 {software.status === 'Discontinued' && (
 <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
 <div className="font-bold flex items-center gap-1.5">
 <Ban className="w-4 h-4 text-red-600" />
 Software Discontinued on{' '}
 {software.discontinue_date ? new Date(software.discontinue_date).toLocaleDateString() : ''}
 </div>
 <p>
 Reason: <strong>{software.software_license_discontinue_reasons?.name || 'Unspecified'}</strong>
 </p>
 {software.discontinue_remarks && <p>Remarks: {software.discontinue_remarks}</p>}
 {software.software_licenses && (
 <p>
 Replaced by:{' '}
 <strong>
 {software.software_licenses.software_code} - {software.software_licenses.software_name}
 </strong>
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

 <div className="overflow-x-auto rounded-xl border border-slate-200 ">
 <table className="w-full text-left text-xs text-slate-600 ">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
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
 <td colSpan={6} className="py-8 text-center text-slate-400">
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
 {term.billing_cycle || 'Annual'}
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
 {activeTab === 'history' && (
 <div className="space-y-3">
 <span className="text-xs font-medium text-slate-500 block">
 Complete audit trail from unified activity logs
 </span>

 <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 ">
 {software.activity_logs.map((log) => (
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
 )}
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
 onClose={() => setIsAssignOpen(false)}
 />

 <RenewLicenseModal
 isOpen={isRenewOpen}
 softwareId={software.software_id}
 softwareName={software.software_name}
 previousTerm={
 software.current_term
 ? {
 term_number: software.current_term.term_number,
 billing_cycle: software.current_term.billing_cycle,
 cost: Number(software.current_term.cost),
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
 onClose={() => setIsDiscontinueOpen(false)}
 />

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
