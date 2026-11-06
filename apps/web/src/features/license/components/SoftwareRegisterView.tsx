import React, { useState } from 'react';
import {
 Search,
 Plus,
 RefreshCw,
 Clock,
 ShieldAlert,
 Ban,
 Layers,
 IndianRupee,
 RotateCcw,
 RotateCw,
 Package,
 CalendarDays,
 Eye,
 UserPlus,
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
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
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

 const STATUS_TONE: Record<string, { chip: string; dot: string }> = {
 Active: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
 'Expiring Soon': { chip: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500 animate-pulse' },
 Expired: { chip: 'bg-rose-50 text-rose-700 ring-rose-100', dot: 'bg-rose-500' },
 Discontinued: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
 Trial: { chip: 'bg-blue-50 text-blue-700 ring-blue-100', dot: 'bg-blue-500' },
 };
 const TILE_TONES = [
 'from-blue-500 to-indigo-500',
 'from-violet-500 to-fuchsia-500',
 'from-emerald-500 to-teal-500',
 'from-amber-500 to-orange-500',
 'from-rose-500 to-pink-500',
 'from-cyan-500 to-sky-500',
 ];
 const tileTone = (name: string) => TILE_TONES[[...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % TILE_TONES.length];
 const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
 const daysLeft = (d: string) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
 const filtersOn = Boolean(search || categoryId || vendorId || status !== 'All' || licenseType !== 'All');
 const filterCls =
 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 transition hover:border-slate-300 focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10';
 const labelCls = 'mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500';

 const kpis: Array<{
 label: string;
 value: string;
 hint: React.ReactNode;
 icon: React.ElementType;
 tone: string;
 tile: string;
 bar: string;
 onClick?: () => void;
 }> = [
 {
 label: 'Active Software Assets',
 value: String(summary.activeLicenses),
 hint: (
 <>
 Approx. monthly spend <strong className="text-slate-700">₹{summary.approxMonthlySpend.toLocaleString('en-IN')}</strong>
 </>
 ),
 icon: Layers,
 tone: 'text-blue-600',
 tile: 'bg-blue-50 text-blue-600 ring-blue-100',
 bar: 'from-blue-500 to-indigo-500',
 onClick: () => {
 setStatus('Active');
 setPage(1);
 },
 },
 {
 label: 'Expiring in 30 Days',
 value: String(summary.expiringSoon),
 hint: summary.expiringSoon > 0 ? 'Requires renewal review' : 'No renewals due soon',
 icon: Clock,
 tone: 'text-amber-600',
 tile: 'bg-amber-50 text-amber-600 ring-amber-100',
 bar: 'from-amber-400 to-orange-500',
 onClick: () => {
 setStatus('Expiring Soon');
 setPage(1);
 },
 },
 {
 label: 'Expired & Inactive',
 value: String(summary.expired + summary.discontinued),
 hint: `${summary.expired} expired · ${summary.discontinued} discontinued`,
 icon: Ban,
 tone: 'text-rose-600',
 tile: 'bg-rose-50 text-rose-600 ring-rose-100',
 bar: 'from-rose-400 to-pink-500',
 onClick: () => {
 setStatus('Expired');
 setPage(1);
 },
 },
 {
 label: 'Projected Annual Spend',
 value: `₹${summary.approxAnnualSpend.toLocaleString('en-IN')}`,
 hint: 'Across all active terms',
 icon: IndianRupee,
 tone: 'text-emerald-600',
 tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
 bar: 'from-emerald-400 to-teal-500',
 },
 ];

 return (
 <div className="space-y-5">
 {/* Licenses To Recover (departed or inactive team members) */}
 {licensesToRecover.length > 0 && (
 <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-4 shadow-sm">
 <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-500" aria-hidden />
 <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
 <ShieldAlert className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-[13px] font-bold text-rose-900">Licenses to Recover ({licensesToRecover.length})</h3>
 <p className="text-[12px] text-rose-700/90">Seats still assigned to departed or inactive team members. Reclaim them to avoid wasted licenses.</p>
 </div>
 </div>
 <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
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
 className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
 >
 <span>{item.employee.name}</span>
 <span className="font-normal text-slate-400">{item.software_name}</span>
 <span className="ml-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10.5px] font-bold text-white">Reclaim</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* KPI cards */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
 {kpis.map((k) => {
 const Icon = k.icon;
 const body = (
 <>
 <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.bar}`} aria-hidden />
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{k.label}</p>
 <p className={`mt-2 text-3xl font-extrabold leading-none tracking-tight ${k.tone}`}>{k.value}</p>
 </div>
 <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${k.tile}`}>
 <Icon className="h-5 w-5" />
 </span>
 </div>
 <p className="mt-3 text-[12px] text-slate-500">{k.hint}</p>
 </>
 );
 const cls = 'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition';
 return k.onClick ? (
 <button key={k.label} type="button" onClick={k.onClick} className={`${cls} cursor-pointer hover:-translate-y-0.5 hover:shadow-md`}>
 {body}
 </button>
 ) : (
 <div key={k.label} className={cls}>
 {body}
 </div>
 );
 })}
 </div>

 {/* Search, actions and filters */}
 <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
 <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
 <div className="relative flex-1">
 <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
 <input
 type="text"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 placeholder="Search software name, code (SW-...) or vendor"
 className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-[13px] text-slate-800 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
 />
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => syncMutation.mutate()}
 disabled={syncMutation.isPending}
 className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
 title="Sync status and scan departures"
 >
 <RefreshCw className={`h-4 w-4 text-slate-500 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
 Sync Status
 </button>
 <button
 type="button"
 onClick={() => setIsAddOpen(true)}
 className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 text-[13px] font-semibold text-white shadow-md shadow-blue-600/25 transition hover:from-blue-700 hover:to-indigo-700"
 >
 <Plus className="h-4 w-4" />
 Add Software
 </button>
 </div>
 </div>

 <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
 <div>
 <label className={labelCls}>Category</label>
 <select
 value={categoryId ?? ''}
 onChange={(e) => {
 setCategoryId(e.target.value ? Number(e.target.value) : undefined);
 setPage(1);
 }}
 className={`${filterCls} w-48`}
 >
 <option value="">All</option>
 {categories.map((c) => (
 <option key={c.category_id} value={c.category_id}>
 {c.name}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelCls}>Vendor</label>
 <select
 value={vendorId ?? ''}
 onChange={(e) => {
 setVendorId(e.target.value ? Number(e.target.value) : undefined);
 setPage(1);
 }}
 className={`${filterCls} w-44`}
 >
 <option value="">All</option>
 {vendors.map((v) => (
 <option key={v.vendor_id} value={v.vendor_id}>
 {v.name}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelCls}>Status</label>
 <select
 value={status}
 onChange={(e) => {
 setStatus(e.target.value);
 setPage(1);
 }}
 className={`${filterCls} w-40`}
 >
 {STATUSES.map((s) => (
 <option key={s} value={s}>
 {s}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelCls}>Type</label>
 <select
 value={licenseType}
 onChange={(e) => {
 setLicenseType(e.target.value);
 setPage(1);
 }}
 className={`${filterCls} w-56`}
 >
 {LICENSE_TYPES.map((t) => (
 <option key={t} value={t}>
 {t}
 </option>
 ))}
 </select>
 </div>
 {filtersOn && (
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
 className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-blue-600 transition hover:bg-blue-50"
 >
 <RotateCcw className="h-3.5 w-3.5" />
 Reset filters
 </button>
 )}
 </div>
 </div>

 {/* Software table */}
 <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
 <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
 <h2 className="text-[14px] font-bold text-slate-900">Software Register</h2>
 {listData && (
 <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600">
 {listData.meta.total} {listData.meta.total === 1 ? 'item' : 'items'}
 </span>
 )}
 </div>
 <div className="overflow-x-auto">
 <table className="w-full min-w-[1080px] text-left text-[12.5px] text-slate-600">
 <thead className="bg-slate-50/80 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
 <tr>
 <th className="px-5 py-3">Software</th>
 <th className="px-4 py-3">Vendor & Category</th>
 <th className="px-4 py-3">Type</th>
 <th className="px-4 py-3">Seat Utilization</th>
 <th className="px-4 py-3">Cost / Cycle</th>
 <th className="px-4 py-3">Expiry Date</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-5 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {isLoading ? (
 [0, 1, 2].map((i) => (
 <tr key={i}>
 <td colSpan={8} className="px-5 py-4">
 <div className="h-9 animate-pulse rounded-xl bg-slate-100" />
 </td>
 </tr>
 ))
 ) : !listData || listData.items.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-5 py-16 text-center">
 <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
 <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 ring-1 ring-blue-100">
 <Package className="h-6 w-6" />
 </span>
 <p className="text-[13.5px] font-semibold text-slate-700">{filtersOn ? 'No software matches your filters' : 'No software added yet'}</p>
 <p className="text-[12px] text-slate-400">
 {filtersOn ? 'Try clearing a filter.' : 'Add your first software to start tracking seats and renewals.'}
 </p>
 </div>
 </td>
 </tr>
 ) : (
 listData.items.map((item) => {
 const pct = item.seat_utilization_pct ?? (item.assigned_seats > 0 ? 100 : 0);
 const tone = STATUS_TONE[item.status] ?? STATUS_TONE.Discontinued;
 const expiry = item.latest_term?.expiry_date;
 const left = expiry ? daysLeft(expiry) : null;
 const [kind, scope] = String(item.license_type || '').split(' · ');
 return (
 <tr key={item.software_id} className="transition hover:bg-blue-50/30">
 {/* Software */}
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-3">
 <span
 className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[14px] font-extrabold text-white shadow-sm ${tileTone(item.software_name)}`}
 >
 {(item.software_name || '?').slice(0, 1).toUpperCase()}
 </span>
 <div className="min-w-0">
 <button
 type="button"
 onClick={() => setSelectedSoftwareId(item.software_id)}
 className="block truncate text-left text-[13.5px] font-bold text-slate-900 hover:text-blue-600"
 >
 {item.software_name}
 </button>
 <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
 <span className="rounded bg-slate-100 px-1.5 py-px font-mono font-semibold text-slate-600">{item.software_code}</span>
 <span>· {item.owner?.name || 'Unassigned'}</span>
 </div>
 </div>
 </div>
 </td>

 {/* Vendor & Category */}
 <td className="px-4 py-3.5">
 <div className="font-semibold text-slate-800">{item.vendor}</div>
 <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-semibold text-violet-700 ring-1 ring-violet-100">
 {item.category}
 </span>
 </td>

 {/* Type */}
 <td className="px-4 py-3.5">
 <div className="font-semibold text-slate-700">{kind}</div>
 {scope && <div className="text-[11px] text-slate-400">{scope}</div>}
 </td>

 {/* Seats */}
 <td className="px-4 py-3.5">
 <div className="mb-1.5 flex items-baseline gap-1.5">
 <span className="text-[13px] font-bold text-slate-800">
 {item.assigned_seats}
 <span className="font-medium text-slate-400"> / {item.total_seats ?? '∞'}</span>
 </span>
 {item.seat_utilization_pct !== null && (
 <span className="text-[10.5px] font-semibold text-slate-400">{item.seat_utilization_pct}%</span>
 )}
 </div>
 <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
 <div
 className={`h-full rounded-full bg-gradient-to-r ${
 pct >= 100 ? 'from-rose-500 to-pink-500' : pct >= 80 ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-500'
 }`}
 style={{ width: `${Math.max(pct > 0 ? 6 : 0, Math.min(100, pct))}%` }}
 />
 </div>
 </td>

 {/* Cost */}
 <td className="px-4 py-3.5">
 {item.latest_term ? (
 <>
 <div className="text-[13px] font-bold text-slate-900">₹{item.latest_term.cost.toLocaleString('en-IN')}</div>
 <div className="text-[11px] text-slate-400">{item.latest_term.billing_cycle || 'Annual'}</div>
 </>
 ) : (
 <span className="text-slate-300">—</span>
 )}
 </td>

 {/* Expiry */}
 <td className="px-4 py-3.5">
 {expiry && left !== null ? (
 <>
 <div className="flex items-center gap-1.5 font-semibold text-slate-700">
 <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
 {fmtDate(expiry)}
 </div>
 <div className={`mt-0.5 text-[11px] font-medium ${left < 0 ? 'text-rose-600' : left <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
 {left < 0
 ? `Expired ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} ago`
 : left === 0
 ? 'Expires today'
 : `${left} day${left === 1 ? '' : 's'} left`}
 </div>
 </>
 ) : (
 <span className="text-slate-400">No expiry</span>
 )}
 </td>

 {/* Status */}
 <td className="px-4 py-3.5">
 <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone.chip}`}>
 <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
 {item.status}
 </span>
 </td>

 {/* Actions */}
 <td className="px-5 py-3.5">
 <div className="flex items-center justify-end">
 <RowActionsMenu
 label={`More actions for ${item.software_name}`}
 actions={[
 { label: 'View details', icon: Eye, onClick: () => setSelectedSoftwareId(item.software_id) },
 ...(item.status !== 'Discontinued'
 ? [
 { label: 'Assign seats', icon: UserPlus, onClick: () => setQuickAssignSoftware(item) },
 { label: 'Renew license', icon: RotateCw, onClick: () => setQuickRenewSoftware(item) },
 ]
 : []),
 ]}
 />
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {listData && listData.meta.totalPages > 1 && (
 <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
 <span>
 Showing {(page - 1) * listData.meta.limit + 1}–{Math.min(page * listData.meta.limit, listData.meta.total)} of {listData.meta.total}
 </span>
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
 >
 Previous
 </button>
 <span className="px-2 font-semibold text-slate-600">
 {page} / {listData.meta.totalPages}
 </span>
 <button
 type="button"
 disabled={page >= listData.meta.totalPages}
 onClick={() => setPage(page + 1)}
 className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
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
