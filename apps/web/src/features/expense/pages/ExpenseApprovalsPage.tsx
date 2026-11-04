import React, { useEffect, useState } from 'react';
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
  ChevronRight,
  Inbox,
  Wallet,
  Flag,
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

import { Pagination } from '@/shared/ui/Pagination';
import { RowActionsMenu, type RowAction } from '@/shared/ui/RowActionsMenu';
import { ClaimStatusBadge, FlagChips, StatCard, initials, inr, fmtDate } from '../components/expense-ui';

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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [activeTab, searchQuery, payoutFilter, pageSize]);
  const activeList = activeTab === 'reimbursements' ? filteredReimbursements : filteredApprovals;
  const safePage = Math.min(page, Math.max(1, Math.ceil(activeList.length / pageSize)));
  const pageOf = <T,>(list: T[]) => list.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allApprovals = approvals as ExpenseClaimSummary[];
  const pendingAmount = allApprovals.reduce((n, cl) => n + cl.amount, 0);
  const flaggedCount = allApprovals.filter((cl) => cl.is_above_limit || cl.is_possible_duplicate || cl.is_late).length;
  const payoutReady = (reimbursements as ExpenseClaimSummary[]).filter((r) => r.status === 'APPROVED');

  const openPayout = (claim: ExpenseClaimSummary) => {
    setPayoutClaim(claim);
    setPaymentMode('Bank Transfer');
    setPaymentRefNo('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPayoutError('');
  };
  const openReopen = (claim: ExpenseClaimSummary) => {
    setReopeningClaim(claim);
    setReopenTargetStatus('SUBMITTED');
    setReopenRemarks('');
    setReopenError('');
  };

  const payoutMenu = (claim: ExpenseClaimSummary): RowAction[] => {
    const list: RowAction[] = [];
    if (claim.status === 'APPROVED') {
      list.push(
        claim.reimbursement_method !== 'PAYROLL'
          ? { label: 'Queue for payroll', icon: Wallet, disabled: addToPayrollMut.isPending, onClick: () => addToPayrollMut.mutate({ id: claim.claim_id }) }
          : { label: 'Remove from payroll', icon: XCircle, danger: true, disabled: removeFromPayrollMut.isPending, onClick: () => removeFromPayrollMut.mutate(claim.claim_id) },
      );
    }
    list.push({ label: 'Reopen claim', icon: RotateCcw, danger: true, onClick: () => openReopen(claim) });
    return list;
  };

  const searchBox = (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Search claims or employees..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );

  const employeeCell = (name?: string | null, dept?: string | null) => (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">{initials(name)}</span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-800">{name}</div>
        <div className="truncate text-xs text-slate-400">{dept || 'General Department'}</div>
      </div>
    </div>
  );

  const th = 'whitespace-nowrap px-5 py-3';
  const headRow = 'border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';
  const loadingBox = (text: string) => (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-500">{text}</p>
    </div>
  );

  const pill = (on: boolean, tone: string) =>
    `cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${on ? `bg-white shadow-sm ${tone}` : 'text-slate-500 hover:text-slate-800'}`;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
            <Receipt className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Expense Approvals</h1>
            <p className="mt-0.5 text-sm text-slate-500">Review employee claims, check policy flags and manage payouts.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/expense?tab=reports" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Reports
          </Link>
          <Link to="/admin/settings/expense" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <Settings className="h-4 w-4 text-slate-500" />
            Settings
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Awaiting review" value={allApprovals.length} hint="Claims in the approvals queue" icon={Clock} tone="text-amber-600" tile="bg-amber-50 text-amber-600 ring-amber-100" bar="from-amber-400 to-orange-400" onClick={() => setActiveTab('approvals')} />
        <StatCard label="Pending amount" value={inr(pendingAmount)} hint="Total of the claims awaiting review" icon={Receipt} tone="text-slate-900" tile="bg-slate-50 text-slate-600 ring-slate-100" bar="from-slate-400 to-slate-500" />
        <StatCard label="With policy flags" value={flaggedCount} hint="Above limit, duplicate or late" icon={Flag} tone="text-rose-600" tile="bg-rose-50 text-rose-600 ring-rose-100" bar="from-rose-500 to-pink-500" />
        <StatCard label="Ready for payout" value={payoutReady.length} hint="Approved, not yet paid" icon={Wallet} tone="text-emerald-600" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-400" onClick={() => setActiveTab('reimbursements')} />
      </div>

      {/* Tabs */}
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Expense claims" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          <button type="button" role="tab" aria-selected={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} className={`inline-flex items-center gap-2 ${pill(activeTab === 'approvals', 'text-indigo-700')}`}>
            <Clock className="h-4 w-4" />
            Approvals queue
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold leading-none text-amber-800">{approvals.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'reimbursements'} onClick={() => setActiveTab('reimbursements')} className={`inline-flex items-center gap-2 ${pill(activeTab === 'reimbursements', 'text-indigo-700')}`}>
            <CreditCard className="h-4 w-4" />
            Reimbursement payouts
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold leading-none text-emerald-800">{payoutReady.length}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: APPROVALS QUEUE
         ========================================================================= */}
      {activeTab === 'approvals' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <p className="text-sm text-slate-500">Pending claims that need department approval</p>
            {searchBox}
          </div>

          {isLoadingApprovals ? (
            loadingBox('Loading approvals queue...')
          ) : filteredApprovals.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h3 className="text-base font-semibold text-slate-800">{searchQuery ? 'No claims match your search' : 'Approvals queue is clear'}</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{searchQuery ? 'Try a different claim number or employee.' : 'There are no pending claims awaiting your review.'}</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {pageOf(filteredApprovals).map((claim: ExpenseClaimSummary) => (
                  <li key={claim.claim_id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{claim.claim_no}</span>
                      <FlagChips claim={claim} clean="Clean" limitLabel="Above limit" />
                    </div>
                    {employeeCell(claim.employee_name, claim.department_name)}
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{claim.category_name}</p>
                        <p className="mt-0.5 truncate text-sm text-slate-500">{claim.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{fmtDate(claim.expense_date)}</p>
                      </div>
                      <p className="shrink-0 text-lg font-extrabold text-slate-900">{inr(claim.amount)}</p>
                    </div>
                    <button type="button" onClick={() => openReviewModal(claim.claim_id)} className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700">
                      Review claim <ChevronRight className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50/95">
                    <tr className={headRow}>
                      <th className={th}>Claim #</th>
                      <th className={th}>Employee</th>
                      <th className={th}>Expense date</th>
                      <th className={th}>Category &amp; purpose</th>
                      <th className={`${th} text-right`}>Amount</th>
                      <th className={th}>Policy flags</th>
                      <th className={`${th} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageOf(filteredApprovals).map((claim: ExpenseClaimSummary) => (
                      <tr key={claim.claim_id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-5 py-3.5">
                          <span className="whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{claim.claim_no}</span>
                        </td>
                        <td className="px-5 py-3.5">{employeeCell(claim.employee_name, claim.department_name)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{fmtDate(claim.expense_date)}</td>
                        <td className="max-w-[18rem] px-5 py-3.5">
                          <span className="block truncate font-medium text-slate-800">{claim.category_name}</span>
                          <span className="block truncate text-slate-500">{claim.description}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-slate-900">{inr(claim.amount)}</td>
                        <td className="px-5 py-3.5">
                          <FlagChips claim={claim} clean="Clean" limitLabel="Above limit" />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button type="button" onClick={() => openReviewModal(claim.claim_id)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-3.5 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700">
                            Review <ChevronRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination page={safePage} pageSize={pageSize} total={filteredApprovals.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: REIMBURSEMENT PAYOUTS
         ========================================================================= */}
      {activeTab === 'reimbursements' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => setPayoutFilter('APPROVED')} className={pill(payoutFilter === 'APPROVED', 'text-emerald-700')}>Pending payouts</button>
                <button type="button" onClick={() => setPayoutFilter('REIMBURSED')} className={pill(payoutFilter === 'REIMBURSED', 'text-indigo-700')}>Completed</button>
                <button type="button" onClick={() => setPayoutFilter('ALL')} className={pill(payoutFilter === 'ALL', 'text-slate-800')}>All</button>
              </div>
            </div>
            {searchBox}
          </div>

          {isLoadingReimbursements ? (
            loadingBox('Loading reimbursements...')
          ) : filteredReimbursements.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                <Inbox className="h-7 w-7" />
              </span>
              <h3 className="text-base font-semibold text-slate-800">No claims in this queue</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">There are no approved expense claims matching this filter.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {pageOf(filteredReimbursements).map((claim: ExpenseClaimSummary) => (
                  <li key={claim.claim_id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{claim.claim_no}</span>
                      <ClaimStatusBadge status={claim.status} label={claim.status === 'APPROVED' ? 'Ready for payout' : 'Paid'} />
                    </div>
                    {employeeCell(claim.employee_name, claim.department_name)}
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0 text-sm text-slate-500">
                        <p className="font-semibold text-slate-900">{claim.category_name}</p>
                        <p className="mt-0.5">{claim.reimbursement_method || 'DIRECT'}</p>
                      </div>
                      <p className="shrink-0 text-lg font-extrabold text-slate-900">{inr(claim.amount)}</p>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      {claim.status === 'APPROVED' && (
                        <button type="button" onClick={() => openPayout(claim)} className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 text-[13px] font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700">
                          Direct payout
                        </button>
                      )}
                      <RowActionsMenu label={`More actions for ${claim.claim_no}`} actions={payoutMenu(claim)} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50/95">
                    <tr className={headRow}>
                      <th className={th}>Claim #</th>
                      <th className={th}>Employee</th>
                      <th className={th}>Category</th>
                      <th className={`${th} text-right`}>Amount</th>
                      <th className={th}>Payout method</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageOf(filteredReimbursements).map((claim: ExpenseClaimSummary) => (
                      <tr key={claim.claim_id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-5 py-3.5">
                          <span className="whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{claim.claim_no}</span>
                        </td>
                        <td className="px-5 py-3.5">{employeeCell(claim.employee_name, claim.department_name)}</td>
                        <td className="px-5 py-3.5 text-slate-600">{claim.category_name}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-slate-900">{inr(claim.amount)}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{claim.reimbursement_method || 'DIRECT'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <ClaimStatusBadge status={claim.status} label={claim.status === 'APPROVED' ? 'Ready for payout' : 'Paid / reimbursed'} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {claim.status === 'APPROVED' && (
                              <button type="button" onClick={() => openPayout(claim)} className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-emerald-600 px-3.5 text-[13px] font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700">
                                Direct payout
                              </button>
                            )}
                            <RowActionsMenu label={`More actions for ${claim.claim_no}`} actions={payoutMenu(claim)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination page={safePage} pageSize={pageSize} total={filteredReimbursements.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
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
