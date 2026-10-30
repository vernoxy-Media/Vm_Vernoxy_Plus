import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  ShieldAlert,
  Loader2,
  RotateCcw,
  FileText,
  CreditCard,
  X,
  AlertCircle,
  BarChart3,
  Settings,
} from 'lucide-react';
import {
  useApprovalsQueue,
  useReviewClaim,
  useReimbursementQueue,
  useProcessDirectReimbursement,
  useAddToPayroll,
  useRemoveFromPayroll,
  useReopenClaim,
  useExpenseClaimDetails,
  ExpenseClaimSummary,
  RejectionReason,
  PaymentMode,
} from '../hooks/use-expenses';

const REJECTION_REASONS: RejectionReason[] = [
  'Receipt missing or unclear',
  'Amount does not match receipt',
  'Not a business expense',
  'Not allowed under policy',
  'Above policy limit',
  'Duplicate claim',
  'Submitted too late',
  'Wrong category or type',
  'Other',
];

const PAYMENT_MODES: PaymentMode[] = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'];

export const ExpenseApprovalsPage: React.FC = (): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'reimbursements' | 'all'>('approvals');
  const [searchQuery, setSearchQuery] = useState('');

  // Approvals Queue Data
  const { data: approvals = [], isLoading: isLoadingApprovals } = useApprovalsQueue();

  // Reimbursements Queue Data
  const [payoutFilter, setPayoutFilter] = useState<'APPROVED' | 'REIMBURSED' | 'ALL'>('APPROVED');
  const { data: reimbursements = [], isLoading: isLoadingReimbursements } = useReimbursementQueue(payoutFilter);

  // Mutations
  const reviewClaimMut = useReviewClaim();
  const directPayoutMut = useProcessDirectReimbursement();
  const addToPayrollMut = useAddToPayroll();
  const removeFromPayrollMut = useRemoveFromPayroll();
  const reopenClaimMut = useReopenClaim();

  // Review Modal State
  const [reviewingClaimId, setReviewingClaimId] = useState<number | null>(null);
  const { data: reviewClaimDetails, isLoading: isLoadingReviewDetails } = useExpenseClaimDetails(reviewingClaimId);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>(REJECTION_REASONS[0]);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [flagsAcknowledged, setFlagsAcknowledged] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Direct Payout Modal State
  const [payoutClaim, setPayoutClaim] = useState<ExpenseClaimSummary | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [paymentRefNo, setPaymentRefNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [payoutError, setPayoutError] = useState('');

  // Reopen Modal State
  const [reopeningClaim, setReopeningClaim] = useState<ExpenseClaimSummary | null>(null);
  const [reopenTargetStatus, setReopenTargetStatus] = useState<'SUBMITTED' | 'DRAFT'>('SUBMITTED');
  const [reopenRemarks, setReopenRemarks] = useState('');
  const [reopenError, setReopenError] = useState('');

  // Open Review Modal
  const openReviewModal = (claimId: number) => {
    setReviewingClaimId(claimId);
    setReviewAction('APPROVE');
    setRejectionReason(REJECTION_REASONS[0]);
    setDecisionRemarks('');
    setFlagsAcknowledged(false);
    setReviewError('');
  };

  // Submit Review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingClaimId) return;
    setReviewError('');

    const hasFlags =
      reviewClaimDetails?.is_above_limit || reviewClaimDetails?.is_possible_duplicate;

    if (reviewAction === 'APPROVE' && hasFlags && !flagsAcknowledged) {
      setReviewError('You must acknowledge that this claim has policy flags before approving.');
      return;
    }

    if (reviewAction === 'REJECT') {
      if (!decisionRemarks || decisionRemarks.trim().length < 10) {
        setReviewError('Please provide detailed rejection remarks of at least 10 characters.');
        return;
      }
    }

    try {
      await reviewClaimMut.mutateAsync({
        id: reviewingClaimId,
        data: {
          action: reviewAction,
          rejection_reason: reviewAction === 'REJECT' ? rejectionReason : undefined,
          decision_remarks: decisionRemarks.trim() || undefined,
          flags_acknowledged: flagsAcknowledged,
        },
      });
      setReviewingClaimId(null);
    } catch (err: any) {
      setReviewError(err.response?.data?.message || err.message || 'Failed to review claim');
    }
  };

  // Submit Direct Payout
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutClaim) return;
    setPayoutError('');

    if (!paymentRefNo || paymentRefNo.trim().length < 2) {
      setPayoutError('Please enter a valid payment reference or transaction number');
      return;
    }

    try {
      await directPayoutMut.mutateAsync({
        id: payoutClaim.claim_id,
        data: {
          payment_mode: paymentMode,
          payment_reference_no: paymentRefNo.trim(),
          payment_date: paymentDate,
        },
      });
      setPayoutClaim(null);
    } catch (err: any) {
      setPayoutError(err.response?.data?.message || err.message || 'Failed to record payout');
    }
  };

  // Submit Reopen Claim
  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningClaim) return;
    setReopenError('');

    try {
      await reopenClaimMut.mutateAsync({
        id: reopeningClaim.claim_id,
        data: {
          target_status: reopenTargetStatus,
          remarks: reopenRemarks.trim() || undefined,
        },
      });
      setReopeningClaim(null);
    } catch (err: any) {
      setReopenError(err.response?.data?.message || err.message || 'Failed to reopen claim');
    }
  };

  const filteredApprovals = (approvals as ExpenseClaimSummary[]).filter((c: ExpenseClaimSummary) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.claim_no.toLowerCase().includes(q) ||
      (c.employee_name && c.employee_name.toLowerCase().includes(q)) ||
      (c.department_name && c.department_name.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q)
    );
  });

  const filteredReimbursements = (reimbursements as ExpenseClaimSummary[]).filter((c: ExpenseClaimSummary) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.claim_no.toLowerCase().includes(q) ||
      (c.employee_name && c.employee_name.toLowerCase().includes(q)) ||
      (c.department_name && c.department_name.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Expense Approvals & Reimbursements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review submitted employee expense claims, policy compliance, and manage payouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/expense?tab=reports"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Expense Reports
          </Link>
          <Link
            to="/admin/settings/expense"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Settings
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'approvals'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Approvals Queue
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
            {approvals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reimbursements')}
          className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'reimbursements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Reimbursement Payouts
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-bold">
            {(reimbursements as ExpenseClaimSummary[]).filter((r: ExpenseClaimSummary) => r.status === 'APPROVED').length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: APPROVALS QUEUE
         ========================================================================= */}
      {activeTab === 'approvals' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Showing pending claims requiring authorized department approval
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search claims or employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingApprovals ? (
              <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading approvals queue...</span>
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">Approvals Queue is Clear</h3>
                <p className="text-xs text-slate-500 mt-1">There are no pending claims awaiting your review.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Claim #</th>
                    <th className="py-3 px-4">Employee & Dept</th>
                    <th className="py-3 px-4">Expense Date</th>
                    <th className="py-3 px-4">Category & Purpose</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Policy Flags</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredApprovals.map((claim: ExpenseClaimSummary) => {
                    const hasFlags = claim.is_above_limit || claim.is_possible_duplicate || claim.is_late;
                    return (
                      <tr key={claim.claim_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                          {claim.claim_no}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{claim.employee_name}</div>
                          <div className="text-[11px] text-slate-400">
                            {claim.department_name || 'General Department'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(claim.expense_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="font-medium text-slate-800 block truncate">
                            {claim.category_name}
                          </span>
                          <span className="text-slate-500 truncate block">{claim.description}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ₹{claim.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {hasFlags ? (
                            <div className="flex items-center justify-center gap-1">
                              {claim.is_above_limit && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800"
                                  title="Above Category Limit"
                                >
                                  Above Limit
                                </span>
                              )}
                              {claim.is_possible_duplicate && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800"
                                  title="Possible Duplicate"
                                >
                                  Duplicate
                                </span>
                              )}
                              {claim.is_late && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800"
                                  title="Submitted Late"
                                >
                                  Late
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Clean</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openReviewModal(claim.claim_id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Review Claim
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: REIMBURSEMENT PAYOUTS
         ========================================================================= */}
      {activeTab === 'reimbursements' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPayoutFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  payoutFilter === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Pending Payouts
              </button>
              <button
                onClick={() => setPayoutFilter('REIMBURSED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  payoutFilter === 'REIMBURSED'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Completed Reimbursements
              </button>
              <button
                onClick={() => setPayoutFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  payoutFilter === 'ALL'
                    ? 'bg-slate-100 text-slate-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search claims or employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingReimbursements ? (
              <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading reimbursements...</span>
              </div>
            ) : filteredReimbursements.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No Claims in Queue</h3>
                <p className="text-xs text-slate-500 mt-1">
                  There are no approved expense claims matching this filter.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Claim #</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Payout Method</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReimbursements.map((claim: ExpenseClaimSummary) => (
                    <tr key={claim.claim_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {claim.claim_no}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{claim.employee_name}</div>
                        <div className="text-[11px] text-slate-400">{claim.department_name}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">{claim.category_name}</td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{claim.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {claim.reimbursement_method || 'DIRECT'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            claim.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {claim.status === 'APPROVED' ? 'Ready for Payout' : 'Paid / Reimbursed'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {claim.status === 'APPROVED' && (
                            <>
                              <button
                                onClick={() => {
                                  setPayoutClaim(claim);
                                  setPaymentMode('Bank Transfer');
                                  setPaymentRefNo('');
                                  setPaymentDate(new Date().toISOString().split('T')[0]);
                                  setPayoutError('');
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition cursor-pointer"
                              >
                                Direct Payout
                              </button>

                              {claim.reimbursement_method !== 'PAYROLL' ? (
                                <button
                                  onClick={() => addToPayrollMut.mutate({ id: claim.claim_id })}
                                  disabled={addToPayrollMut.isPending}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition cursor-pointer"
                                  title="Queue for next payroll run"
                                >
                                  + Payroll
                                </button>
                              ) : (
                                <button
                                  onClick={() => removeFromPayrollMut.mutate(claim.claim_id)}
                                  disabled={removeFromPayrollMut.isPending}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-medium transition cursor-pointer"
                                  title="Remove from payroll"
                                >
                                  - Payroll
                                </button>
                              )}
                            </>
                          )}

                          {/* Reopen Action for Decided / Completed claims */}
                          <button
                            onClick={() => {
                              setReopeningClaim(claim);
                              setReopenTargetStatus('SUBMITTED');
                              setReopenRemarks('');
                              setReopenError('');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Admin Reopen Claim"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          REVIEW CLAIM MODAL (APPROVE / REJECT)
         ========================================================================= */}
      {reviewingClaimId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Review Claim {reviewClaimDetails?.claim_no || `#${reviewingClaimId}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {reviewClaimDetails?.employee?.name} • {reviewClaimDetails?.employee?.department_name || 'General'}
                </p>
              </div>
              <button
                onClick={() => setReviewingClaimId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingReviewDetails || !reviewClaimDetails ? (
              <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading claim details for review...</span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
                {reviewError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* Claim Summary Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Amount</span>
                    <span className="text-base font-bold text-slate-900 block mt-0.5">
                      ₹{reviewClaimDetails.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Expense Date</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {new Date(reviewClaimDetails.expense_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Category</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {reviewClaimDetails.category?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Merchant</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {reviewClaimDetails.merchant_name || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-1">
                    Business Purpose / Description
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap">
                    {reviewClaimDetails.description}
                  </div>
                </div>

                {/* Attached Receipts */}
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-1.5">
                    Attached Invoices & Receipts ({reviewClaimDetails.attachments?.length || 0})
                  </span>
                  {!reviewClaimDetails.attachments || reviewClaimDetails.attachments.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No attachments provided by employee
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reviewClaimDetails.attachments.map((att: any) => (
                        <a
                          key={att.attachment_id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-medium text-slate-700 truncate">{att.file_name}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Policy Flags Alert & Mandatory Acknowledgment */}
                {(reviewClaimDetails.is_above_limit || reviewClaimDetails.is_possible_duplicate) && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Policy Warning Flags Present:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      {reviewClaimDetails.is_above_limit && (
                        <li>Claim amount exceeds policy threshold for category {reviewClaimDetails.category?.name}</li>
                      )}
                      {reviewClaimDetails.is_possible_duplicate && (
                        <li>Potential duplicate expense identified within the last 90 days</li>
                      )}
                    </ul>

                    {reviewAction === 'APPROVE' && (
                      <div className="pt-2 border-t border-amber-200">
                        <label className="flex items-center gap-2 font-semibold text-amber-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={flagsAcknowledged}
                            onChange={(e) => setFlagsAcknowledged(e.target.checked)}
                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>I acknowledge these policy flags and approve this exception</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Choice: Approve vs Reject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Review Decision *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('APPROVE')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        reviewAction === 'APPROVE'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('REJECT')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        reviewAction === 'REJECT'
                          ? 'border-rose-600 bg-rose-50 text-rose-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Claim
                    </button>
                  </div>
                </div>

                {/* Predefined Rejection Reason if Reject */}
                {reviewAction === 'REJECT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Rejection Reason *
                    </label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Decision Remarks */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Decision Remarks {reviewAction === 'REJECT' ? '*(Mandatory, min 10 chars)' : '(Optional)'}
                    </label>
                    <span className="text-[11px] text-slate-400">{decisionRemarks.length}/500</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    required={reviewAction === 'REJECT'}
                    placeholder={
                      reviewAction === 'REJECT'
                        ? 'Explain why this claim was rejected so the employee can address it...'
                        : 'Optional notes for finance / accounting...'
                    }
                    value={decisionRemarks}
                    onChange={(e) => setDecisionRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReviewingClaimId(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewClaimMut.isPending}
                    className={`inline-flex items-center gap-1.5 px-5 py-2 text-white rounded-lg text-xs font-semibold transition cursor-pointer ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {reviewClaimMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm {reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          DIRECT PAYOUT MODAL
         ========================================================================= */}
      {payoutClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Direct Payout</h3>
                <p className="text-xs text-slate-500">
                  Claim {payoutClaim.claim_no} • ₹{payoutClaim.amount.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setPayoutClaim(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4">
              {payoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {payoutError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  UTR / Reference / Cheque Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IMPS/UPI reference or Cheque #"
                  value={paymentRefNo}
                  onChange={(e) => setPaymentRefNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayoutClaim(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directPayoutMut.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {directPayoutMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADMIN REOPEN MODAL
         ========================================================================= */}
      {reopeningClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reopen Decided Claim</h3>
                <p className="text-xs text-slate-500">Claim {reopeningClaim.claim_no}</p>
              </div>
              <button
                onClick={() => setReopeningClaim(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopenSubmit} className="p-6 space-y-4">
              {reopenError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {reopenError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Status *
                </label>
                <select
                  value={reopenTargetStatus}
                  onChange={(e) => setReopenTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="SUBMITTED">Reopen to SUBMITTED (Re-enter Approvals Queue)</option>
                  <option value="DRAFT">Revert to DRAFT (Allow employee to edit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reopen Reason / Audit Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this decided claim is being reopened..."
                  value={reopenRemarks}
                  onChange={(e) => setReopenRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReopeningClaim(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopenClaimMut.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {reopenClaimMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Reopen Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExpenseApprovalsPage;
