import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Plus,
  AlertCircle,
  X,
  History,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Paperclip,
  ExternalLink,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Umbrella,
  Heart,
  Gift,
  Star,
} from 'lucide-react';
import {
  useMyLeaveQuery,
  useCalculateLeaveDaysMutation,
  useApplyLeaveMutation,
  useWithdrawLeaveMutation,
  useRequestLeaveCancellationMutation,
  useLeaveLedgerQuery,
  useLeaveTypesQuery,
  LeaveRequestItem,
} from '../hooks/use-leave';
import { useUploadAttachmentMutation } from '@/shared/hooks/use-attachments';

interface CircularProgressProps {
  percent: number;
  color?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ percent, color = 'text-emerald-500' }) => {
  const size = 52;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg height={size} width={size} className="transform -rotate-90 block">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="text-slate-100"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className={`${color} transition-all duration-500 ease-out`}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-800">
        {percent}%
      </span>
    </div>
  );
};

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function getLeaveTypeVisuals(name: string, index: number) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('casual')) {
    return {
      Icon: Umbrella,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      donutColor: 'text-blue-600',
    };
  }
  if (lower.includes('sick')) {
    return {
      Icon: Heart,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      donutColor: 'text-emerald-500',
    };
  }
  if (lower.includes('earned') || lower.includes('privilege') || lower.includes('annual')) {
    return {
      Icon: Gift,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      donutColor: 'text-amber-500',
    };
  }
  if (lower.includes('comp') || lower.includes('off')) {
    return {
      Icon: Star,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      donutColor: 'text-purple-600',
    };
  }
  const fallbacks = [
    { Icon: Umbrella, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', donutColor: 'text-blue-600' },
    { Icon: Heart, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', donutColor: 'text-emerald-500' },
    { Icon: Gift, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', donutColor: 'text-amber-500' },
    { Icon: Star, iconColor: 'text-purple-600', iconBg: 'bg-purple-50', donutColor: 'text-purple-600' },
  ];
  return fallbacks[index % fallbacks.length];
}

export interface MyLeavePageProps {
  hideBreadcrumb?: boolean;
}

export const MyLeavePage: React.FC<MyLeavePageProps> = ({ hideBreadcrumb = false }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusTab, setStatusTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useMyLeaveQuery(selectedYear);
  const { data: allTypes = [] } = useLeaveTypesQuery();

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [cancelModalItem, setCancelModalItem] = useState<LeaveRequestItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [viewRequestItem, setViewRequestItem] = useState<LeaveRequestItem | null>(null);

  // Apply Form State
  const [applyForm, setApplyForm] = useState({
    leave_type_id: 1,
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    duration: 'FULL_DAY' as 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF',
    reason: '',
    attachment_url: '',
  });
  const [applyError, setApplyError] = useState('');

  // Attachment upload state
  const uploadMut = useUploadAttachmentMutation();
  const [attachmentInputMode, setAttachmentInputMode] = useState<'file' | 'url'>('file');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mutations
  const calcMut = useCalculateLeaveDaysMutation();
  const applyMut = useApplyLeaveMutation();
  const withdrawMut = useWithdrawLeaveMutation();
  const reqCancelMut = useRequestLeaveCancellationMutation();

  const { data: ledgerEntries = [] } = useLeaveLedgerQuery(data?.employee?.emp_id);

  // Live calculation hook when form changes
  React.useEffect(() => {
    if (isApplyModalOpen && applyForm.leave_type_id && applyForm.from_date && applyForm.to_date) {
      calcMut.mutate({
        leave_type_id: applyForm.leave_type_id,
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        duration: applyForm.duration,
      });
    }
  }, [isApplyModalOpen, applyForm.leave_type_id, applyForm.from_date, applyForm.to_date, applyForm.duration]);

  const selectedBalance = (data?.balances || []).find((b) => b.leave_type_id === applyForm.leave_type_id);

  const handleOpenApplyModal = () => {
    const firstType = allTypes.find((t) => t.status === 'ACTIVE');
    const today = new Date().toISOString().split('T')[0];
    setApplyForm({
      leave_type_id: firstType?.leave_type_id || 1,
      from_date: today,
      to_date: today,
      duration: 'FULL_DAY',
      reason: '',
      attachment_url: '',
    });
    setAttachmentInputMode('file');
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setApplyError('');
    setIsApplyModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5 MB limit.');
      return;
    }

    setIsUploadingFile(true);
    setApplyError('');
    try {
      const res = await uploadMut.mutateAsync({
        entityType: 'LEAVE_REQUEST',
        entityId: 0,
        file,
      });

      setApplyForm((prev) => ({
        ...prev,
        attachment_url: res.file_url,
      }));
      setUploadedFileName(file.name);
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to upload attachment file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleRemoveUploadedFile = () => {
    setUploadedFileName(null);
    setApplyForm((prev) => ({ ...prev, attachment_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError('');
    try {
      await applyMut.mutateAsync(applyForm);
      setIsApplyModalOpen(false);
    } catch (err: any) {
      setApplyError(err?.detail || err?.message || 'Failed to submit leave request.');
    }
  };

  const handleConfirmCancelRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalItem || !cancelReason) return;
    try {
      await reqCancelMut.mutateAsync({
        requestId: cancelModalItem.request_id,
        cancellation_reason: cancelReason,
      });
      setCancelModalItem(null);
      setCancelReason('');
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to request cancellation.');
    }
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return (data?.requests || []).filter((r) => {
      // Status filter
      if (statusTab !== 'All') {
        if (statusTab === 'Pending' && r.status !== 'PENDING') return false;
        if (statusTab === 'Approved' && r.status !== 'APPROVED') return false;
        if (statusTab === 'Rejected' && r.status !== 'REJECTED') return false;
        if (statusTab === 'Cancelled' && r.status !== 'CANCELLED' && r.status !== 'CANCELLATION_REQUESTED') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const no = (r.request_no || '').toLowerCase();
        const typeName = (r.leave_type_name || '').toLowerCase();
        const fromDateStr = formatShortDate(r.from_date).toLowerCase();
        const toDateStr = formatShortDate(r.to_date).toLowerCase();
        if (!no.includes(q) && !typeName.includes(q) && !fromDateStr.includes(q) && !toDateStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data?.requests, statusTab, searchQuery]);

  // Pagination
  const totalItems = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(page, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const currentRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb Navigation */}
      {!hideBreadcrumb && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="hover:text-slate-600 transition-colors">Leave</span>
          <span className="text-slate-300">&gt;</span>
          <span className="font-semibold text-slate-700">My Leave</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Leave</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              View your leave balance and manage your leave requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>
                Year: {y}
              </option>
            ))}
          </select>

          {/* Leave Ledger */}
          <button
            type="button"
            onClick={() => setIsLedgerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Leave Ledger</span>
          </button>

          {/* Apply Leave Button */}
          <button
            type="button"
            onClick={handleOpenApplyModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Available Balance Cards Grid (Reference Screen 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(data?.balances || []).map((bal, idx) => {
          const { Icon, iconColor, iconBg, donutColor } = getLeaveTypeVisuals(bal.leave_type_name, idx);
          const credited = bal.credited_days || 0;
          const available = bal.available_balance || 0;
          const taken = bal.days_taken || 0;
          const percent = credited > 0 ? Math.min(100, Math.max(0, Math.round((available / credited) * 100))) : 100;

          return (
            <div
              key={bal.balance_id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Row: Icon + Type Name + Paid Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">{bal.leave_type_name}</span>
                </div>

                {bal.is_paid ? (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                    Paid
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 rounded-full">
                    Unpaid
                  </span>
                )}
              </div>

              {/* Bottom Row: Large Number + Remaining Subtext & Circular Donut */}
              <div className="flex items-end justify-between mt-4 pt-1">
                <div>
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {bal.balance_tracked ? available : 'No limit'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {bal.balance_tracked ? (
                      <span>{available} remaining • {taken} taken</span>
                    ) : (
                      <span>{taken} taken this year</span>
                    )}
                  </div>
                </div>

                <CircularProgress percent={percent} color={donutColor} />
              </div>
            </div>
          );
        })}
      </div>

      {/* "My Leave Requests" Table Section Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        {/* Section Header & Filters Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">My Leave Requests</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pill Tabs: All, Pending, Approved, Rejected, Cancelled */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-medium">
              {(['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setStatusTab(tab);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1 rounded-full transition-all cursor-pointer font-semibold ${
                    statusTab === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search request no, leave type or date..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  Year: {y}
                </option>
              ))}
            </select>

            {/* Status dropdown */}
            <select
              value={statusTab}
              onChange={(e) => {
                setStatusTab(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Pending">Status: Pending</option>
              <option value="Approved">Status: Approved</option>
              <option value="Rejected">Status: Rejected</option>
              <option value="Cancelled">Status: Cancelled</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100">
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">REQUEST NO.</th>
                <th className="py-3 px-4">LEAVE TYPE</th>
                <th className="py-3 px-4">DATES</th>
                <th className="py-3 px-4">DAYS</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">APPLIED ON</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">No leave requests found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery || statusTab !== 'All'
                        ? 'Try adjusting your search query or status filter.'
                        : 'Submit a new leave application using the + Apply Leave button.'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* REQUEST NO */}
                    <td className="py-3.5 px-4 font-semibold text-xs text-slate-800 tracking-tight">
                      {req.request_no}
                    </td>

                    {/* LEAVE TYPE with Paid/Unpaid pill */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{req.leave_type_name}</span>
                        {req.is_paid ? (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                            Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                            Unpaid
                          </span>
                        )}
                      </div>
                    </td>

                    {/* DATES */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatShortDate(req.from_date)} — {formatShortDate(req.to_date)}
                      {req.duration !== 'FULL_DAY' && (
                        <span className="ml-1 text-[11px] text-slate-400">
                          ({req.duration === 'FIRST_HALF' ? '1st Half' : '2nd Half'})
                        </span>
                      )}
                    </td>

                    {/* DAYS */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">{req.leave_days}</td>

                    {/* STATUS */}
                    <td className="py-3.5 px-4">
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Approved
                        </span>
                      )}
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          Pending
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                          Rejected
                        </span>
                      )}
                      {req.status === 'CANCELLATION_REQUESTED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                          Cancellation Requested
                        </span>
                      )}
                      {req.status === 'CANCELLED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Cancelled
                        </span>
                      )}
                      {req.status === 'WITHDRAWN' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Withdrawn
                        </span>
                      )}
                    </td>

                    {/* APPLIED ON */}
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatShortDate(req.applied_at)}
                    </td>

                    {/* ACTION */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setViewRequestItem(req)}
                          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          View
                        </button>

                        {/* Request Cancellation for approved requests */}
                        {req.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalItem(req);
                              setCancelReason('');
                            }}
                            className="font-semibold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                          >
                            Request Cancellation
                          </button>
                        )}

                        {/* Withdraw for pending requests */}
                        {req.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Are you sure you want to withdraw this leave application?')) {
                                try {
                                  await withdrawMut.mutateAsync(req.request_id);
                                } catch (err: any) {
                                  alert(err?.detail || err?.message || 'Failed to withdraw.');
                                }
                              }
                            }}
                            className="font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, totalItems)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{totalItems}</span> requests
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
              const isActive = pg === validCurrentPage;
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 rounded-lg font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pg}
                </button>
              );
            })}

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: APPLY LEAVE (Reference Screen 4)                                   */}
      {/* ========================================================================= */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Apply for Leave
              </h3>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              {/* Leave Type Select */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Leave Type *</label>
                <select
                  value={applyForm.leave_type_id}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, leave_type_id: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800"
                >
                  {allTypes
                    .filter((t) => t.status === 'ACTIVE')
                    .map((t) => (
                      <option key={t.leave_type_id} value={t.leave_type_id}>
                        {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'})
                      </option>
                    ))}
                </select>
                {selectedBalance && selectedBalance.balance_tracked && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Available balance:{' '}
                    <strong className="text-blue-600">{selectedBalance.available_balance} days</strong>
                  </p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">From Date *</label>
                  <input
                    type="date"
                    value={applyForm.from_date}
                    onChange={(e) => setApplyForm({ ...applyForm, from_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">To Date *</label>
                  <input
                    type="date"
                    value={applyForm.to_date}
                    onChange={(e) => setApplyForm({ ...applyForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Half-day duration options */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Day Option</label>
                <div className="flex gap-2">
                  {[
                    { id: 'FULL_DAY', label: 'Full Day' },
                    { id: 'FIRST_HALF', label: 'First Half' },
                    { id: 'SECOND_HALF', label: 'Second Half' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setApplyForm({ ...applyForm, duration: opt.id as any })}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        applyForm.duration === opt.id
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Day Calculation Preview */}
              {calcMut.data && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between font-bold text-blue-900 text-xs">
                    <span>Requested Leave Days:</span>
                    <span>{calcMut.data.leave_days} days</span>
                  </div>
                  {calcMut.data.is_short_notice && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Notice: This request is considered short notice per company policy.
                    </p>
                  )}
                  {calcMut.data.attachment_required && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      A supporting document/medical certificate is mandatory for this request.
                    </p>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Leave *</label>
                <textarea
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="Explain why you need this leave..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  required
                />
              </div>

              {/* Supporting Document / Medical Certificate Attachment */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    Supporting Document (Medical Cert / Slip)
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-semibold bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAttachmentInputMode('file')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        attachmentInputMode === 'file'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachmentInputMode('url')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        attachmentInputMode === 'url'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Direct URL
                    </button>
                  </div>
                </div>

                {attachmentInputMode === 'file' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="leave-attachment-file-input"
                      onChange={handleFileSelect}
                      disabled={isUploadingFile}
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                    />

                    {uploadedFileName ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold truncate">{uploadedFileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveUploadedFile}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingFile}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/20 text-slate-600 transition-colors cursor-pointer text-xs font-semibold"
                      >
                        {isUploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span>Uploading attachment...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4 text-slate-500" />
                            <span>Choose document or image from device (max 5 MB)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://storage.example.com/medical_slip.pdf"
                      value={applyForm.attachment_url}
                      onChange={(e) => setApplyForm({ ...applyForm, attachment_url: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMut.isPending || isUploadingFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {applyMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW LEAVE DETAILS                                                 */}
      {/* ========================================================================= */}
      {viewRequestItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Leave Details: {viewRequestItem.request_no}
              </h3>
              <button
                type="button"
                onClick={() => setViewRequestItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Leave Type:</span>
                <span className="font-semibold text-slate-800">
                  {viewRequestItem.leave_type_name} ({viewRequestItem.is_paid ? 'Paid' : 'Unpaid'})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-slate-800">
                  {formatShortDate(viewRequestItem.from_date)} — {formatShortDate(viewRequestItem.to_date)} (
                  {viewRequestItem.leave_days} days)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-slate-800">{viewRequestItem.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Applied On:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(viewRequestItem.applied_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Reason:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700 font-medium">
                  {viewRequestItem.reason || 'No reason provided'}
                </p>
              </div>

              {viewRequestItem.attachment_url && (
                <div>
                  <span className="text-slate-500 block mb-1">Supporting Document:</span>
                  <a
                    href={viewRequestItem.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>View Attached Document</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewRequestItem(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST CANCELLATION                                               */}
      {/* ========================================================================= */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Request Cancellation: {cancelModalItem.request_no}
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelRequest} className="space-y-4">
              <p className="text-slate-600">
                You are requesting cancellation for your approved leave from{' '}
                <strong>{formatShortDate(cancelModalItem.from_date)}</strong> to{' '}
                <strong>{formatShortDate(cancelModalItem.to_date)}</strong> (
                {cancelModalItem.leave_days} days).
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why you no longer need this leave..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={reqCancelMut.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {reqCancelMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LEAVE LEDGER                                                       */}
      {/* ========================================================================= */}
      {isLedgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Leave Transaction Ledger
              </h3>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500">
              Full audit trail of your leave credits, deductions, and cancellations.
            </p>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3">Transaction</th>
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3">Balance After</th>
                    <th className="py-2.5 px-3">Note / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No ledger transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((e) => (
                      <tr key={e.ledger_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatShortDate(e.performed_at)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {e.leave_type_name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.entry_type === 'CREDIT' || e.entry_type === 'ACCRUAL'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {e.entry_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {e.days > 0 ? `+${e.days}` : e.days}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-600">
                          {e.balance_after}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {e.note || (e.reference_request_id ? `Req #${e.reference_request_id}` : '—')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
