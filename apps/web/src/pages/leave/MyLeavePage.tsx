import React, { useState } from 'react';
import {
  CalendarOff,
  Plus,
  AlertCircle,
  X,
  History,
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
} from '../../hooks/use-leave';

export const MyLeavePage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  // Live calculation hook
  const calcMut = useCalculateLeaveDaysMutation();
  const applyMut = useApplyLeaveMutation();
  const withdrawMut = useWithdrawLeaveMutation();
  const reqCancelMut = useRequestLeaveCancellationMutation();

  const { data: ledgerEntries = [] } = useLeaveLedgerQuery(
    data?.employee?.emp_id,
  );

  // Run live day calculation when form changes
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

  const selectedBalance = data?.balances.find((b) => b.leave_type_id === applyForm.leave_type_id);

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
    setApplyError('');
    setIsApplyModalOpen(true);
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

  const filteredRequests = (data?.requests || []).filter((r) => {
    if (typeFilter !== 'ALL' && String(r.leave_type_id) !== typeFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-7 h-7 text-blue-600" />
            My Leave
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.policy_name || 'Standard Leave Policy'} • Leave Year {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLedgerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <History className="w-4 h-4 text-slate-500" />
            Leave Ledger
          </button>
          <button
            type="button"
            onClick={handleOpenApplyModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Available Balance Cards (Reference Screen 3) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Available Balance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(data?.balances || []).map((bal) => (
            <div
              key={bal.balance_id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full bg-${bal.calendar_color}-500`} />
                  {bal.leave_type_name}
                </span>
                {bal.is_paid ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Paid
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    Unpaid
                  </span>
                )}
              </div>

              {bal.balance_tracked ? (
                <>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {bal.available_balance}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                    <div>
                      {bal.credited_days} credited • {bal.days_taken} taken
                    </div>
                    {bal.days_booked > 0 && (
                      <div className="text-amber-600 font-medium">
                        {bal.days_booked} pending approval
                      </div>
                    )}
                    {bal.nearest_expiry && (
                      <div className="text-purple-600 font-medium">
                        Expires {new Date(bal.nearest_expiry).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold text-slate-700 tracking-tight">No limit</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {bal.days_taken} taken this year
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">My Leave Requests</h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  Year: {y}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">Leave Type: All</option>
              {allTypes.map((t) => (
                <option key={t.leave_type_id} value={String(t.leave_type_id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">Status: All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Request No.</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No leave requests match your filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {req.request_no}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        {req.leave_type_name}
                        {req.is_paid ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-200">
                            Paid
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 rounded border border-rose-200">
                            Unpaid
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(req.from_date).toLocaleDateString()} — {new Date(req.to_date).toLocaleDateString()}
                      {req.duration !== 'FULL_DAY' && (
                        <span className="ml-1 text-slate-400">
                          ({req.duration === 'FIRST_HALF' ? '1st Half' : '2nd Half'})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{req.leave_days}</td>
                    <td className="py-3 px-4">
                      {req.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                      {req.status === 'CANCELLATION_REQUESTED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Cancellation Requested
                        </span>
                      )}
                      {req.status === 'CANCELLED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Cancelled
                        </span>
                      )}
                      {req.status === 'WITHDRAWN' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Withdrawn
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setViewRequestItem(req)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        View
                      </button>
                      {req.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Withdraw this pending leave request?')) {
                              withdrawMut.mutate(req.request_id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Withdraw
                        </button>
                      )}
                      {req.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelModalItem(req);
                            setCancelReason('');
                          }}
                          className="text-purple-600 hover:text-purple-800 font-semibold"
                        >
                          Request Cancellation
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: APPLY LEAVE (Reference Screen 4)                                   */}
      {/* ========================================================================= */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Apply Leave</h3>
                <p className="text-xs text-slate-500">
                  {data?.employee?.name} • {data?.policy_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
              {/* Leave Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={applyForm.leave_type_id}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, leave_type_id: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {allTypes
                    .filter((t) => t.status === 'ACTIVE')
                    .map((t) => (
                      <option key={t.leave_type_id} value={t.leave_type_id}>
                        {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'})
                      </option>
                    ))}
                </select>
                {selectedBalance && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Available:{' '}
                    <span className="font-bold text-slate-800">
                      {selectedBalance.balance_tracked ? `${selectedBalance.available_balance} days` : 'No limit'}
                    </span>{' '}
                    • {selectedBalance.days_booked} pending
                  </p>
                )}
              </div>

              {/* Duration Radio */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Duration *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="duration"
                      checked={applyForm.duration === 'FULL_DAY'}
                      onChange={() => setApplyForm({ ...applyForm, duration: 'FULL_DAY' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Full Day</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="duration"
                      checked={applyForm.duration === 'FIRST_HALF'}
                      onChange={() => setApplyForm({ ...applyForm, duration: 'FIRST_HALF' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Half Day: First Half</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="duration"
                      checked={applyForm.duration === 'SECOND_HALF'}
                      onChange={() => setApplyForm({ ...applyForm, duration: 'SECOND_HALF' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Half Day: Second Half</span>
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.from_date}
                    onChange={(e) =>
                      setApplyForm({
                        ...applyForm,
                        from_date: e.target.value,
                        to_date: applyForm.duration !== 'FULL_DAY' ? e.target.value : applyForm.to_date,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    disabled={applyForm.duration !== 'FULL_DAY'}
                    value={applyForm.duration !== 'FULL_DAY' ? applyForm.from_date : applyForm.to_date}
                    onChange={(e) => setApplyForm({ ...applyForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Live Calculation Banner */}
              {calcMut.data && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-900">
                  <div className="flex items-center justify-between font-bold">
                    <span>Counted Leave Days: {calcMut.data.leave_days}</span>
                    {selectedBalance?.balance_tracked && (
                      <span className="text-[11px] font-normal text-blue-700">
                        Balance after approval: {selectedBalance.available_balance - calcMut.data.leave_days} days
                      </span>
                    )}
                  </div>
                  {calcMut.data.is_short_notice && (
                    <div className="text-amber-800 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Minimum notice period not met. Request will be marked "Short notice".
                    </div>
                  )}
                  {calcMut.data.days_breakdown?.some((d) => d.day_count === 0) && (
                    <p className="text-[11px] text-blue-800">
                      Weekly Offs and Holidays are left out of counted days.
                    </p>
                  )}
                </div>
              )}

              {selectedBalance?.balance_tracked && (selectedBalance.available_balance < (calcMut.data?.leave_days ?? 1)) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Insufficient balance:</span> You currently have {selectedBalance.available_balance} days available for {selectedBalance.leave_type_name}. You can apply for Leave Without Pay (LWP) instead, or contact your Admin/HR to adjust your balance.
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason * (10 to 500 characters)</label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder="Explain why you need leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attachment {calcMut.data?.attachment_required ? '(Required - Medical Certificate)' : '(Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="Document link or file URL (PDF, JPG, PNG up to 5MB)"
                  value={applyForm.attachment_url}
                  onChange={(e) => setApplyForm({ ...applyForm, attachment_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: LEAVE LEDGER (Section 11)                                         */}
      {/* ========================================================================= */}
      {isLedgerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white max-w-2xl w-full h-full p-6 space-y-4 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" /> Leave Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Read-only chronological audit list of all credits, debits, and adjustments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Entry</th>
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3">Balance After</th>
                    <th className="py-2.5 px-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.ledger_id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 font-sans">
                        {new Date(entry.performed_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 font-sans">
                        {entry.leave_type_code}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600 font-medium">
                        {entry.entry_type}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          entry.days > 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {entry.days > 0 ? `+${entry.days}` : entry.days}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-bold">{entry.balance_after}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-sans max-w-xs truncate">
                        {entry.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <h3 className="text-base font-bold text-slate-900">Request Cancellation</h3>
            <p className="text-slate-500">
              Request cancellation for {cancelModalItem.request_no} ({cancelModalItem.leave_days} days of {cancelModalItem.leave_type_name}):
            </p>

            <form onSubmit={handleConfirmCancelRequest} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for cancellation * (10-500 chars)</label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder="Why do you wish to cancel this approved leave?"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={reqCancelMut.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 shadow-xs"
                >
                  Send Cancellation Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW REQUEST DETAILS                                              */}
      {/* ========================================================================= */}
      {viewRequestItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Leave Request: {viewRequestItem.request_no}
              </h3>
              <button
                type="button"
                onClick={() => setViewRequestItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Leave Type</span>
                  <span className="font-semibold text-slate-800">{viewRequestItem.leave_type_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Days</span>
                  <span className="font-semibold text-slate-800">{viewRequestItem.leave_days} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">From</span>
                  <span className="font-semibold text-slate-800">{new Date(viewRequestItem.from_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">To</span>
                  <span className="font-semibold text-slate-800">{new Date(viewRequestItem.to_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Reason:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700">{viewRequestItem.reason}</p>
              </div>

              {viewRequestItem.decision_remarks && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Admin Remarks:</span>
                  <p className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl">
                    {viewRequestItem.decision_remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewRequestItem(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
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
