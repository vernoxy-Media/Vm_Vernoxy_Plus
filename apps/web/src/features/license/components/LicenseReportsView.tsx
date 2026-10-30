import React, { useState } from 'react';
import {
 FileText,
 Calendar,
 Users,
 PieChart,
 DollarSign,
 Ban,
 Clock,
 Download,
} from 'lucide-react';
import {
 useLicenseRegisterReportQuery,
 useLicenseRenewalsReportQuery,
 useLicenseAssignmentsReportQuery,
 useLicenseSeatUtilizationReportQuery,
 useLicenseCostBreakdownReportQuery,
 useLicenseExpiredDiscontinuedReportQuery,
 useLicenseActivityLogsReportQuery,
} from '../hooks/use-license-reports';

type ReportTab =
 | 'register'
 | 'renewals'
 | 'assignments'
 | 'seat-use'
 | 'cost'
 | 'expired'
 | 'activity';

export const LicenseReportsView: React.FC = () => {
 const [activeReport, setActiveReport] = useState<ReportTab>('register');
 const [renewalDays, setRenewalDays] = useState(60);

 // Queries
 const registerQuery = useLicenseRegisterReportQuery();
 const renewalsQuery = useLicenseRenewalsReportQuery(renewalDays);
 const assignmentsQuery = useLicenseAssignmentsReportQuery();
 const seatUseQuery = useLicenseSeatUtilizationReportQuery();
 const costQuery = useLicenseCostBreakdownReportQuery();
 const expiredQuery = useLicenseExpiredDiscontinuedReportQuery();
 const activityQuery = useLicenseActivityLogsReportQuery(100);

 const exportCSV = (data: any[], filename: string) => {
 if (!data || data.length === 0) return;
 const headers = Object.keys(data[0]);
 const csvContent = [
 headers.join(','),
 ...data.map((row) =>
 headers
 .map((h) => {
 const val = row[h];
 if (val === null || val === undefined) return '';
 return `"${String(val).replace(/"/g, '""')}"`;
 })
 .join(','),
 ),
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.setAttribute('href', url);
 link.setAttribute('download', `${filename}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 return (
 <div className="space-y-6">
 {/* Report Selection Tabs */}
 <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 text-xs">
 <button
 type="button"
 onClick={() => setActiveReport('register')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'register'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <FileText className="w-3.5 h-3.5" />
 <span>Software Register</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveReport('renewals')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'renewals'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <Calendar className="w-3.5 h-3.5" />
 <span>Upcoming Renewals</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveReport('assignments')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'assignments'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <Users className="w-3.5 h-3.5" />
 <span>Assignments by Employee</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveReport('seat-use')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'seat-use'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <PieChart className="w-3.5 h-3.5" />
 <span>Seat Utilization & Wastage</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveReport('cost')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'cost'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <DollarSign className="w-3.5 h-3.5" />
 <span>Cost Breakdown</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveReport('expired')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'expired'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <Ban className="w-3.5 h-3.5" />
 <span>Expired & Discontinued</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveReport('activity')}
 className={`px-3 py-1.5 font-semibold rounded-xl transition flex items-center gap-1.5 ${
 activeReport === 'activity'
 ? 'bg-slate-900 text-white shadow-xs'
 : 'text-slate-600 hover:bg-slate-100 '
 }`}
 >
 <Clock className="w-3.5 h-3.5" />
 <span>Audit Log History</span>
 </button>
 </div>

 {/* 1. Software Register Report */}
 {activeReport === 'register' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Master Software Register
 </h3>
 <p className="text-xs text-slate-500">
 Complete list of all tracked software licenses, categories, owners, and costs.
 </p>
 </div>
 <button
 type="button"
 onClick={() => exportCSV(registerQuery.data || [], 'Software_Register_Report')}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export CSV</span>
 </button>
 </div>

 <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-2.5 px-3">Code</th>
 <th className="py-2.5 px-3">Software</th>
 <th className="py-2.5 px-3">Vendor</th>
 <th className="py-2.5 px-3">Category</th>
 <th className="py-2.5 px-3">Type</th>
 <th className="py-2.5 px-3">Seats (Assigned/Total)</th>
 <th className="py-2.5 px-3">Cost</th>
 <th className="py-2.5 px-3">Owner</th>
 <th className="py-2.5 px-3">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {(registerQuery.data || []).map((r) => (
 <tr key={r.software_id}>
 <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.software_code}</td>
 <td className="py-2.5 px-3 font-semibold text-slate-900">{r.software_name}</td>
 <td className="py-2.5 px-3 text-slate-600">{r.vendor}</td>
 <td className="py-2.5 px-3 text-slate-600">{r.category}</td>
 <td className="py-2.5 px-3 text-slate-600">{r.license_type}</td>
 <td className="py-2.5 px-3">
 {r.assigned_seats} / {r.total_seats ?? '∞'}
 </td>
 <td className="py-2.5 px-3 font-bold text-slate-800">
 ₹{r.cost.toLocaleString('en-IN')}
 </td>
 <td className="py-2.5 px-3 text-slate-600">{r.owner || '—'}</td>
 <td className="py-2.5 px-3">
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
 {r.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 2. Upcoming Renewals Report */}
 {activeReport === 'renewals' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Upcoming Renewals Pipeline
 </h3>
 <p className="text-xs text-slate-500">
 Licenses expiring within selected lookahead horizon.
 </p>
 </div>
 <div className="flex items-center gap-1 text-xs">
 {[30, 60, 90].map((d) => (
 <button
 key={d}
 type="button"
 onClick={() => setRenewalDays(d)}
 className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
 renewalDays === d
 ? 'bg-blue-600 text-white border-blue-600'
 : 'border-slate-300 text-slate-600 hover:bg-slate-50'
 }`}
 >
 {d} Days
 </button>
 ))}
 </div>
 </div>

 <button
 type="button"
 onClick={() => exportCSV(renewalsQuery.data || [], `Renewals_${renewalDays}_Days`)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export CSV</span>
 </button>
 </div>

 <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-2.5 px-3">Days Left</th>
 <th className="py-2.5 px-3">Software</th>
 <th className="py-2.5 px-3">Vendor</th>
 <th className="py-2.5 px-3">Current Term Cost</th>
 <th className="py-2.5 px-3">Expiry Date</th>
 <th className="py-2.5 px-3">Owner & Contact</th>
 <th className="py-2.5 px-3">Auto-Renews</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {(renewalsQuery.data || []).length === 0 ? (
 <tr>
 <td colSpan={7} className="py-8 text-center text-slate-400">
 No licenses expiring within {renewalDays} days.
 </td>
 </tr>
 ) : (
 (renewalsQuery.data || []).map((r) => (
 <tr key={r.software_id}>
 <td className="py-2.5 px-3">
 <span
 className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
 r.days_remaining <= 15
 ? 'bg-red-100 text-red-700'
 : 'bg-amber-100 text-amber-700'
 }`}
 >
 {r.days_remaining} days
 </span>
 </td>
 <td className="py-2.5 px-3 font-semibold text-slate-900">
 {r.software_name} ({r.software_code})
 </td>
 <td className="py-2.5 px-3 text-slate-600">{r.vendor}</td>
 <td className="py-2.5 px-3 font-bold text-slate-800">
 ₹{r.current_term_cost.toLocaleString('en-IN')}
 </td>
 <td className="py-2.5 px-3 text-slate-600">
 {new Date(r.expiry_date).toLocaleDateString()}
 </td>
 <td className="py-2.5 px-3">
 <div className="font-medium text-slate-800">{r.owner}</div>
 <div className="text-[10px] text-slate-400">{r.owner_email}</div>
 </td>
 <td className="py-2.5 px-3">
 {r.auto_renews ? (
 <span className="text-blue-600 font-semibold">Yes</span>
 ) : (
 <span className="text-slate-400">Manual</span>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 3. Seat Utilization & Wastage Report */}
 {activeReport === 'seat-use' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Seat Utilization & Wastage Analysis
 </h3>
 <p className="text-xs text-slate-500">
 Identify low-adoption tools (&lt;50% usage) and calculate unallocated seat costs.
 </p>
 </div>
 <button
 type="button"
 onClick={() => exportCSV(seatUseQuery.data || [], 'Seat_Utilization_Report')}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export CSV</span>
 </button>
 </div>

 <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-2.5 px-3">Software</th>
 <th className="py-2.5 px-3">Vendor</th>
 <th className="py-2.5 px-3">Total Seats</th>
 <th className="py-2.5 px-3">Assigned Seats</th>
 <th className="py-2.5 px-3">Unused Seats</th>
 <th className="py-2.5 px-3">Utilization %</th>
 <th className="py-2.5 px-3">Term Cost</th>
 <th className="py-2.5 px-3">Est. Wastage Cost</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {(seatUseQuery.data || []).map((s) => (
 <tr key={s.software_id} className={s.is_low_adoption ? 'bg-amber-50/20' : ''}>
 <td className="py-2.5 px-3 font-semibold text-slate-900">
 {s.software_name}
 {s.is_low_adoption && (
 <span className="ml-2 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-xs">
 Low Adoption
 </span>
 )}
 </td>
 <td className="py-2.5 px-3 text-slate-600">{s.vendor}</td>
 <td className="py-2.5 px-3 font-bold">{s.total_seats}</td>
 <td className="py-2.5 px-3">{s.assigned_seats}</td>
 <td className="py-2.5 px-3 text-amber-600 font-semibold">{s.unused_seats}</td>
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-2">
 <span className="font-bold">{s.utilization_rate_pct}%</span>
 <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
 <div
 className={`h-full ${
 s.utilization_rate_pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
 }`}
 style={{ width: `${s.utilization_rate_pct}%` }}
 />
 </div>
 </div>
 </td>
 <td className="py-2.5 px-3">₹{s.current_term_cost.toLocaleString('en-IN')}</td>
 <td className="py-2.5 px-3 font-bold text-red-600">
 ₹{s.estimated_wastage_cost.toLocaleString('en-IN')}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 4. Cost Breakdown Report */}
 {activeReport === 'cost' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Software Cost Distribution
 </h3>
 <p className="text-xs text-slate-500">
 Breakdown of license expenditures categorized by Department/Category and Vendor publishers.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* By Category */}
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
 <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
 Spend by Category
 </h4>
 <div className="space-y-3">
 {(costQuery.data?.by_category || []).map((cat: any) => (
 <div key={cat.category} className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-800 ">
 {cat.category} ({cat.software_count})
 </span>
 <span className="font-bold text-slate-900 ">
 ₹{cat.total_cost.toLocaleString('en-IN')} ({cat.percentage_of_total}%)
 </span>
 </div>
 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-blue-600 rounded-full"
 style={{ width: `${cat.percentage_of_total}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* By Vendor */}
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
 <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
 Spend by Vendor
 </h4>
 <div className="space-y-3">
 {(costQuery.data?.by_vendor || []).map((ven: any) => (
 <div key={ven.vendor} className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-800 ">
 {ven.vendor} ({ven.software_count})
 </span>
 <span className="font-bold text-slate-900 ">
 ₹{ven.total_cost.toLocaleString('en-IN')} ({ven.percentage_of_total}%)
 </span>
 </div>
 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-indigo-600 rounded-full"
 style={{ width: `${ven.percentage_of_total}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 5. Assignments by Employee */}
 {activeReport === 'assignments' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Active Seat Assignments by Employee
 </h3>
 <p className="text-xs text-slate-500">
 Audit which team member holds what tools across departments.
 </p>
 </div>
 <button
 type="button"
 onClick={() => exportCSV(assignmentsQuery.data || [], 'Assignments_By_Employee')}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export CSV</span>
 </button>
 </div>

 <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-2.5 px-3">Employee</th>
 <th className="py-2.5 px-3">Department</th>
 <th className="py-2.5 px-3">Software</th>
 <th className="py-2.5 px-3">Category</th>
 <th className="py-2.5 px-3">Login / Account</th>
 <th className="py-2.5 px-3">Assigned Date</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {(assignmentsQuery.data || []).map((a) => (
 <tr key={a.assignment_id}>
 <td className="py-2.5 px-3 font-semibold text-slate-900">{a.employee_name}</td>
 <td className="py-2.5 px-3 text-slate-600">{a.department || '—'}</td>
 <td className="py-2.5 px-3 font-medium text-blue-600">{a.software_name}</td>
 <td className="py-2.5 px-3 text-slate-600">{a.category}</td>
 <td className="py-2.5 px-3 font-mono text-[11px]">{a.login_account_id || '—'}</td>
 <td className="py-2.5 px-3 text-slate-600">
 {new Date(a.assigned_from).toLocaleDateString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 6. Expired & Discontinued Report */}
 {activeReport === 'expired' && (
 <div className="space-y-4">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 Expired & Discontinued Software Archive
 </h3>
 <p className="text-xs text-slate-500">
 Historical catalog of deprecated tools, discontinuation dates, and migration targets.
 </p>
 </div>

 <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-2.5 px-3">Code</th>
 <th className="py-2.5 px-3">Software</th>
 <th className="py-2.5 px-3">Vendor</th>
 <th className="py-2.5 px-3">Status</th>
 <th className="py-2.5 px-3">Discontinued Date</th>
 <th className="py-2.5 px-3">Reason</th>
 <th className="py-2.5 px-3">Replaced By</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {(expiredQuery.data || []).map((e: any) => (
 <tr key={e.software_id}>
 <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{e.software_code}</td>
 <td className="py-2.5 px-3 font-semibold text-slate-900">{e.software_name}</td>
 <td className="py-2.5 px-3 text-slate-600">{e.software_license_vendors?.name}</td>
 <td className="py-2.5 px-3">
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
 {e.status}
 </span>
 </td>
 <td className="py-2.5 px-3 text-slate-600">
 {e.discontinue_date ? new Date(e.discontinue_date).toLocaleDateString() : '—'}
 </td>
 <td className="py-2.5 px-3 text-slate-600">
 {e.software_license_discontinue_reasons?.name || '—'}
 </td>
 <td className="py-2.5 px-3 text-blue-600 font-medium">
 {e.software_licenses?.software_name || 'None'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 7. Activity History Log */}
 {activeReport === 'activity' && (
 <div className="space-y-4">
 <div>
 <h3 className="text-sm font-bold text-slate-900 ">
 System Audit & Activity Trail
 </h3>
 <p className="text-xs text-slate-500">
 Cross-cutting lifecycle logs from unified activity_logs table.
 </p>
 </div>

 <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200 ">
 <tr>
 <th className="py-2.5 px-3">Timestamp</th>
 <th className="py-2.5 px-3">Event</th>
 <th className="py-2.5 px-3">Summary</th>
 <th className="py-2.5 px-3">Performed By</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {(activityQuery.data || []).map((l: any) => (
 <tr key={l.log_id}>
 <td className="py-2.5 px-3 text-slate-500">
 {new Date(l.performed_at).toLocaleString()}
 </td>
 <td className="py-2.5 px-3 font-mono text-[10px] font-bold text-blue-600">
 {l.event}
 </td>
 <td className="py-2.5 px-3 font-medium text-slate-800 ">
 {l.summary}
 </td>
 <td className="py-2.5 px-3 text-slate-600">
 {l.performed_by?.name || 'System / Batch'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
};
