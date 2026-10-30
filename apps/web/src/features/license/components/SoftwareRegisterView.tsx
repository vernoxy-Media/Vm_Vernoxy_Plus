import React, { useState } from 'react';
import {
 Search,
 Plus,
 RefreshCw,
 Clock,
 ShieldAlert,
 DollarSign,
 Ban,
 Layers,
} from 'lucide-react';
import {
 useSoftwareListQuery,
 useLicensesToRecoverQuery,
 useSyncLicensesMutation,
} from '../hooks/use-licenses';
import {
 useLicenseCategoriesQuery,
 useLicenseVendorsQuery,
} from '../hooks/use-license-settings';
import { AddSoftwareModal } from './AddSoftwareModal';
import { SoftwareDetailsModal } from './SoftwareDetailsModal';
import { AssignLicenseModal } from './AssignLicenseModal';
import { RenewLicenseModal } from './RenewLicenseModal';
import { DiscontinueSoftwareModal } from './DiscontinueSoftwareModal';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';

const LICENSE_TYPES = [
 'All',
 'Subscription · Per User',
 'Subscription · Organisation',
 'Perpetual · Per User',
 'Perpetual · Organisation',
 'Free / Open Source',
 'Trial',
];

const STATUSES = ['All', 'Active', 'Expiring Soon', 'Expired', 'Discontinued'];

export const SoftwareRegisterView: React.FC = () => {
 const [search, setSearch] = useState('');
 const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
 const [vendorId, setVendorId] = useState<number | undefined>(undefined);
 const [status, setStatus] = useState('All');
 const [licenseType, setLicenseType] = useState('All');
 const [page, setPage] = useState(1);

 // Queries
 const { data: listData, isLoading, refetch } = useSoftwareListQuery({
 search: search || undefined,
 category_id: categoryId,
 vendor_id: vendorId,
 status: status !== 'All' ? status : undefined,
 license_type: licenseType !== 'All' ? licenseType : undefined,
 page,
 limit: 15,
 });

 const { data: categories = [] } = useLicenseCategoriesQuery();
 const { data: vendors = [] } = useLicenseVendorsQuery();
 const { data: licensesToRecover = [] } = useLicensesToRecoverQuery();
 const syncMutation = useSyncLicensesMutation();

 // Modals state
 const [isAddOpen, setIsAddOpen] = useState(false);
 const [selectedSoftwareId, setSelectedSoftwareId] = useState<number | null>(null);

 // Quick Action modals
 const [quickAssignSoftware, setQuickAssignSoftware] = useState<any | null>(null);
 const [quickRenewSoftware, setQuickRenewSoftware] = useState<any | null>(null);
 const [quickDiscontinueSoftware, setQuickDiscontinueSoftware] = useState<any | null>(null);
 const [recoveryRevokeTarget, setRecoveryRevokeTarget] = useState<any | null>(null);

 const summary = listData?.summary || {
 activeLicenses: 0,
 expiringSoon: 0,
 expired: 0,
 discontinued: 0,
 licensesToRecover: 0,
 approxMonthlySpend: 0,
 approxAnnualSpend: 0,
 };

 const getStatusBadge = (s: string) => {
 switch (s) {
 case 'Active':
 return 'bg-emerald-50 text-emerald-700 border-emerald-200 ';
 case 'Expiring Soon':
 return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
 case 'Expired':
 return 'bg-rose-50 text-rose-700 border-rose-200 ';
 case 'Discontinued':
 return 'bg-slate-100 text-slate-600 border-slate-200 ';
 case 'Trial':
 return 'bg-blue-50 text-blue-700 border-blue-200 ';
 default:
 return 'bg-slate-50 text-slate-700 border-slate-200';
 }
 };

 return (
 <div className="space-y-6">
 {/* Top Banner: Licenses To Recover (Resigned/Relieved/Inactive employees) */}
 {licensesToRecover.length > 0 && (
 <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-2xl shadow-xs">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-red-100 text-red-600 rounded-xl">
 <ShieldAlert className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-xs font-bold text-red-900 ">
 Licenses to Recover ({licensesToRecover.length})
 </h3>
 <p className="text-[11px] text-red-700 ">
 Active software seats assigned to departed or non-active team members. Reclaim or transfer them to prevent license wastage.
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
 {licensesToRecover.slice(0, 3).map((item) => (
 <button
 key={item.assignment_id}
 type="button"
 onClick={() =>
 setRecoveryRevokeTarget({
 assignmentId: item.assignment_id,
 softwareName: item.software_name,
 employeeName: item.employee.name,
 })
 }
 className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-red-700 bg-white border border-red-300 rounded-lg shadow-2xs hover:bg-red-50 transition shrink-0"
 >
 <span>{item.employee.name}</span>
 <span className="text-slate-400">({item.software_name})</span>
 <span className="text-red-500 font-bold ml-1">Reclaim</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Top Metric Cards (Matching Screen 1) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Card 1: Active Licenses & Spend */}
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold text-slate-500 ">
 Active Software Assets
 </span>
 <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
 <Layers className="w-4 h-4" />
 </div>
 </div>
 <div className="text-2xl font-bold text-slate-900 ">
 {summary.activeLicenses}
 </div>
 <div className="text-[11px] text-slate-500 mt-1">
 Approx. monthly spend: <strong>₹{summary.approxMonthlySpend.toLocaleString('en-IN')}</strong>
 </div>
 </div>

 {/* Card 2: Expiring Soon */}
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold text-slate-500 ">
 Expiring in 30 Days
 </span>
 <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
 <Clock className="w-4 h-4" />
 </div>
 </div>
 <div className="text-2xl font-bold text-amber-600 ">
 {summary.expiringSoon}
 </div>
 <div className="text-[11px] text-slate-500 mt-1">
 {summary.expiringSoon > 0 ? 'Requires renewal review' : 'No renewals due soon'}
 </div>
 </div>

 {/* Card 3: Expired & Discontinued */}
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold text-slate-500 ">
 Expired & Inactive
 </span>
 <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
 <Ban className="w-4 h-4" />
 </div>
 </div>
 <div className="text-2xl font-bold text-slate-900 ">
 {summary.expired + summary.discontinued}
 </div>
 <div className="text-[11px] text-slate-500 mt-1">
 {summary.expired} expired • {summary.discontinued} discontinued
 </div>
 </div>

 {/* Card 4: Annual Spend Projection */}
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold text-slate-500 ">
 Projected Annual Spend
 </span>
 <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
 <DollarSign className="w-4 h-4" />
 </div>
 </div>
 <div className="text-2xl font-bold text-slate-900 ">
 ₹{summary.approxAnnualSpend.toLocaleString('en-IN')}
 </div>
 <div className="text-[11px] text-slate-500 mt-1">Across all active terms</div>
 </div>
 </div>

 {/* Action & Filter Bar */}
 <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 {/* Search Box */}
 <div className="relative flex-1">
 <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
 <input
 type="text"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 placeholder="Search software name, code (SW-...), or vendor..."
 className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
 />
 </div>

 {/* Action Buttons */}
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => syncMutation.mutate()}
 disabled={syncMutation.isPending}
 className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
 title="Sync status and scan departures"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
 <span>Sync Status</span>
 </button>

 <button
 type="button"
 onClick={() => setIsAddOpen(true)}
 className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>Add Software</span>
 </button>
 </div>
 </div>

 {/* Filter Dropdowns */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
 {/* Category */}
 <select
 value={categoryId ?? ''}
 onChange={(e) => {
 setCategoryId(e.target.value ? Number(e.target.value) : undefined);
 setPage(1);
 }}
 className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 "
 >
 <option value="">All Categories</option>
 {categories.map((c) => (
 <option key={c.category_id} value={c.category_id}>
 {c.name}
 </option>
 ))}
 </select>

 {/* Vendor */}
 <select
 value={vendorId ?? ''}
 onChange={(e) => {
 setVendorId(e.target.value ? Number(e.target.value) : undefined);
 setPage(1);
 }}
 className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 "
 >
 <option value="">All Vendors</option>
 {vendors.map((v) => (
 <option key={v.vendor_id} value={v.vendor_id}>
 {v.name}
 </option>
 ))}
 </select>

 {/* Status */}
 <select
 value={status}
 onChange={(e) => {
 setStatus(e.target.value);
 setPage(1);
 }}
 className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 "
 >
 {STATUSES.map((s) => (
 <option key={s} value={s}>
 Status: {s}
 </option>
 ))}
 </select>

 {/* License Type */}
 <select
 value={licenseType}
 onChange={(e) => {
 setLicenseType(e.target.value);
 setPage(1);
 }}
 className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 "
 >
 {LICENSE_TYPES.map((t) => (
 <option key={t} value={t}>
 Type: {t}
 </option>
 ))}
 </select>

 {(search || categoryId || vendorId || status !== 'All' || licenseType !== 'All') && (
 <button
 type="button"
 onClick={() => {
 setSearch('');
 setCategoryId(undefined);
 setVendorId(undefined);
 setStatus('All');
 setLicenseType('All');
 setPage(1);
 }}
 className="text-xs text-blue-600 font-medium hover:underline ml-2 whitespace-nowrap"
 >
 Reset Filters
 </button>
 )}
 </div>
 </div>

 {/* Software Table */}
 <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs text-slate-600 ">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-3 px-4">Code</th>
 <th className="py-3 px-4">Software Name</th>
 <th className="py-3 px-4">Vendor & Category</th>
 <th className="py-3 px-4">Type</th>
 <th className="py-3 px-4">Seat Utilization</th>
 <th className="py-3 px-4">Cost / Cycle</th>
 <th className="py-3 px-4">Expiry Date</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {isLoading ? (
 <tr>
 <td colSpan={9} className="py-12 text-center text-slate-400">
 Loading software licenses...
 </td>
 </tr>
 ) : !listData || listData.items.length === 0 ? (
 <tr>
 <td colSpan={9} className="py-12 text-center text-slate-400">
 No software licenses found matching your filters.
 </td>
 </tr>
 ) : (
 listData.items.map((item) => (
 <tr
 key={item.software_id}
 className="hover:bg-slate-50/70 transition"
 >
 {/* Code */}
 <td className="py-3 px-4 font-mono font-bold text-slate-800 ">
 {item.software_code}
 </td>

 {/* Name */}
 <td className="py-3 px-4">
 <button
 type="button"
 onClick={() => setSelectedSoftwareId(item.software_id)}
 className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left block"
 >
 {item.software_name}
 </button>
 <span className="text-[10px] text-slate-400">
 Owner: {item.owner?.name || 'Unassigned'}
 </span>
 </td>

 {/* Vendor & Category */}
 <td className="py-3 px-4">
 <div className="font-medium text-slate-800 ">
 {item.vendor}
 </div>
 <div className="text-[10px] text-slate-400">{item.category}</div>
 </td>

 {/* License Type */}
 <td className="py-3 px-4 text-slate-700 ">
 {item.license_type}
 </td>

 {/* Seat Utilization */}
 <td className="py-3 px-4">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-semibold text-slate-800 ">
 {item.assigned_seats} / {item.total_seats ?? '∞'}
 </span>
 {item.seat_utilization_pct !== null && (
 <span className="text-[10px] text-slate-400">
 ({item.seat_utilization_pct}%)
 </span>
 )}
 </div>
 <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full ${
 (item.seat_utilization_pct || 0) >= 100
 ? 'bg-rose-500'
 : (item.seat_utilization_pct || 0) >= 80
 ? 'bg-amber-500'
 : 'bg-blue-600'
 }`}
 style={{
 width: `${Math.min(100, item.seat_utilization_pct || (item.assigned_seats > 0 ? 100 : 0))}%`,
 }}
 />
 </div>
 </td>

 {/* Cost / Cycle */}
 <td className="py-3 px-4">
 {item.latest_term ? (
 <>
 <div className="font-bold text-slate-900 ">
 ₹{item.latest_term.cost.toLocaleString('en-IN')}
 </div>
 <div className="text-[10px] text-slate-400">
 {item.latest_term.billing_cycle || 'Annual'}
 </div>
 </>
 ) : (
 <span className="text-slate-400">—</span>
 )}
 </td>

 {/* Expiry Date */}
 <td className="py-3 px-4 text-slate-600 ">
 {item.latest_term?.expiry_date
 ? new Date(item.latest_term.expiry_date).toLocaleDateString()
 : 'No Expiry'}
 </td>

 {/* Status Badge */}
 <td className="py-3 px-4">
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
 item.status,
 )}`}
 >
 {item.status}
 </span>
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 type="button"
 onClick={() => setSelectedSoftwareId(item.software_id)}
 className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
 >
 View
 </button>
 {item.status !== 'Discontinued' && (
 <>
 <button
 type="button"
 onClick={() => setQuickAssignSoftware(item)}
 className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
 title="Assign seats"
 >
 Assign
 </button>
 <button
 type="button"
 onClick={() => setQuickRenewSoftware(item)}
 className="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
 title="Renew license"
 >
 Renew
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {listData && listData.meta.totalPages > 1 && (
 <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
 <span>
 Showing {(page - 1) * listData.meta.limit + 1} to{' '}
 {Math.min(page * listData.meta.limit, listData.meta.total)} of {listData.meta.total} licenses
 </span>
 <div className="flex items-center gap-1">
 <button
 type="button"
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 className="px-2.5 py-1 rounded-lg border border-slate-300 disabled:opacity-40"
 >
 Previous
 </button>
 <span className="px-2">
 Page {page} of {listData.meta.totalPages}
 </span>
 <button
 type="button"
 disabled={page >= listData.meta.totalPages}
 onClick={() => setPage(page + 1)}
 className="px-2.5 py-1 rounded-lg border border-slate-300 disabled:opacity-40"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Modals */}
 <AddSoftwareModal
 isOpen={isAddOpen}
 onClose={() => setIsAddOpen(false)}
 onSuccess={() => refetch()}
 />

 {selectedSoftwareId && (
 <SoftwareDetailsModal
 isOpen={Boolean(selectedSoftwareId)}
 softwareId={selectedSoftwareId}
 onClose={() => setSelectedSoftwareId(null)}
 canManage={true}
 />
 )}

 {quickAssignSoftware && (
 <AssignLicenseModal
 isOpen={Boolean(quickAssignSoftware)}
 softwareId={quickAssignSoftware.software_id}
 softwareName={quickAssignSoftware.software_name}
 totalSeats={quickAssignSoftware.total_seats}
 assignedSeats={quickAssignSoftware.assigned_seats}
 onClose={() => setQuickAssignSoftware(null)}
 onSuccess={() => refetch()}
 />
 )}

 {quickRenewSoftware && (
 <RenewLicenseModal
 isOpen={Boolean(quickRenewSoftware)}
 softwareId={quickRenewSoftware.software_id}
 softwareName={quickRenewSoftware.software_name}
 previousTerm={
 quickRenewSoftware.latest_term
 ? {
 term_number: quickRenewSoftware.latest_term.term_number,
 billing_cycle: quickRenewSoftware.latest_term.billing_cycle,
 cost: quickRenewSoftware.latest_term.cost,
 expiry_date: quickRenewSoftware.latest_term.expiry_date,
 total_seats: quickRenewSoftware.total_seats,
 }
 : null
 }
 onClose={() => setQuickRenewSoftware(null)}
 onSuccess={() => refetch()}
 />
 )}

 {quickDiscontinueSoftware && (
 <DiscontinueSoftwareModal
 isOpen={Boolean(quickDiscontinueSoftware)}
 softwareId={quickDiscontinueSoftware.software_id}
 softwareName={quickDiscontinueSoftware.software_name}
 activeSeats={quickDiscontinueSoftware.assigned_seats}
 onClose={() => setQuickDiscontinueSoftware(null)}
 onSuccess={() => refetch()}
 />
 )}

 {recoveryRevokeTarget && (
 <RevokeAssignmentModal
 isOpen={Boolean(recoveryRevokeTarget)}
 assignmentId={recoveryRevokeTarget.assignmentId}
 softwareName={recoveryRevokeTarget.softwareName}
 employeeName={recoveryRevokeTarget.employeeName}
 onClose={() => setRecoveryRevokeTarget(null)}
 onSuccess={() => refetch()}
 />
 )}
 </div>
 );
};
