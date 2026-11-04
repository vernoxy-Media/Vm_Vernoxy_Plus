import React, { useEffect, useState, useRef } from 'react';
import {
  Receipt,
  Plus,
  AlertCircle,
  X,
  History,
  UploadCloud,
  FileText,
  Trash2,
  Paperclip,
  ExternalLink,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  Edit2,
  DollarSign,
  AlertTriangle,
  Building,
  User,
  ShieldAlert,
  Search,
  Eye,
  ChevronRight,
  Inbox,
  FilterX,
} from 'lucide-react';
import {
  useMyExpenses,
  useExpenseClaimDetails,
  useCreateExpenseClaim,
  useUpdateExpenseClaim,
  useSubmitDraftClaim,
  useWithdrawClaim,
  useDeleteDraftClaim,
  useCopyToDraftClaim,
  ExpenseClaimSummary,
  ExpenseType,
} from '../hooks/use-expenses';
import {
  useExpenseCategoriesQuery,
  useExpenseTypesQuery,
  ExpenseCategory,
  ExpenseTypeItem,
} from '../hooks/use-expense-settings';
import { useUploadAttachmentMutation } from '@/shared/hooks/use-attachments';
import { Pagination } from '@/shared/ui/Pagination';
import { RowActionsMenu, type RowAction } from '@/shared/ui/RowActionsMenu';
import { ClaimStatusBadge, FlagChips, StatCard, inr, fmtDate } from '../components/expense-ui';

export const MyExpensesPage: React.FC = (): React.ReactElement => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: myData, isLoading } = useMyExpenses(statusFilter);
  const { data: categories = [] } = useExpenseCategoriesQuery();
  const { data: expenseTypes = [] } = useExpenseTypesQuery();

  // Mutations
  const createClaimMut = useCreateExpenseClaim();
  const updateClaimMut = useUpdateExpenseClaim();
  const submitDraftMut = useSubmitDraftClaim();
  const withdrawMut = useWithdrawClaim();
  const deleteClaimMut = useDeleteDraftClaim();
  const copyToDraftMut = useCopyToDraftClaim();
  const uploadMut = useUploadAttachmentMutation();

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ExpenseClaimSummary | null>(null);
  const [viewClaimId, setViewClaimId] = useState<number | null>(null);
  const { data: claimDetails, isLoading: isLoadingDetails } = useExpenseClaimDetails(viewClaimId);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategoryId, setFormCategoryId] = useState<number>(0);
  const [formExpenseType, setFormExpenseType] = useState<ExpenseType>('Office Expense');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formMerchant, setFormMerchant] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubmitImmediately, setFormSubmitImmediately] = useState(true);
  const [formAttachments, setFormAttachments] = useState<Array<{ id: number; name: string; size: number }>>([]);
  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Selected Category Helper
  const selectedCategory =
    categories.find((c: ExpenseCategory) => c.category_id === formCategoryId) || categories[0];

  const openCreateModal = () => {
    setEditingClaim(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    const firstCat = categories[0];
    if (firstCat) {
      setFormCategoryId(firstCat.category_id);
      setFormExpenseType(firstCat.allowed_type === 'PERSONAL' ? 'Personal Expense' : 'Office Expense');
    }
    setFormAmount('');
    setFormMerchant('');
    setFormDescription('');
    setFormSubmitImmediately(true);
    setFormAttachments([]);
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (claim: ExpenseClaimSummary) => {
    setEditingClaim(claim);
    setFormDate(claim.expense_date.split('T')[0]);
    setFormCategoryId(claim.category_id);
    setFormExpenseType(claim.expense_type);
    setFormAmount(String(claim.amount));
    setFormMerchant(claim.merchant_name || '');
    setFormDescription(claim.description);
    setFormSubmitImmediately(false);
    setFormAttachments([]);
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleCategoryChange = (catId: number) => {
    setFormCategoryId(catId);
    const cat = categories.find((c: ExpenseCategory) => c.category_id === catId);
    if (cat) {
      if (cat.allowed_type === 'PERSONAL') {
        setFormExpenseType('Personal Expense');
      } else if (cat.allowed_type === 'OFFICE') {
        setFormExpenseType('Office Expense');
      }
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setFormError('');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds maximum 10MB limit.`);
        }
        const res = await uploadMut.mutateAsync({
          entityType: 'EXPENSE_CLAIM',
          entityId: editingClaim ? editingClaim.claim_id : 0,
          file,
          displayOrder: formAttachments.length + i + 1,
        });

        const uploadedItem = (res as any)?.data || res;
        if (uploadedItem && uploadedItem.attachment_id) {
          setFormAttachments((prev) => [
            ...prev,
            {
              id: uploadedItem.attachment_id,
              name: uploadedItem.file_name || file.name,
              size: uploadedItem.file_size_bytes || file.size,
            },
          ]);
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: number) => {
    setFormAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0');
      return;
    }

    if (!formDescription || formDescription.trim().length < 10) {
      setFormError('Description must be at least 10 characters explaining the business purpose');
      return;
    }

    // Receipt rule check on client
    if (selectedCategory && formSubmitImmediately) {
      const receiptMandatory =
        selectedCategory.receipt_rule === 'ALWAYS' ||
        (selectedCategory.receipt_rule === 'ABOVE_THRESHOLD' &&
          parsedAmount > Number(selectedCategory.receipt_threshold_amount));

      if (receiptMandatory && formAttachments.length === 0) {
        setFormError(
          `Receipt upload is required for ${selectedCategory.name} (${
            selectedCategory.receipt_rule === 'ALWAYS'
              ? 'mandatory for all claims'
              : `mandatory for claims above ₹${selectedCategory.receipt_threshold_amount}`
          })`,
        );
        return;
      }
    }

    try {
      if (editingClaim) {
        await updateClaimMut.mutateAsync({
          id: editingClaim.claim_id,
          data: {
            expense_date: formDate,
            category_id: formCategoryId,
            expense_type: formExpenseType,
            amount: parsedAmount,
            merchant_name: formMerchant.trim() || undefined,
            description: formDescription.trim(),
            attachment_ids: formAttachments.map((a) => a.id),
          },
        });
      } else {
        await createClaimMut.mutateAsync({
          expense_date: formDate,
          category_id: formCategoryId,
          expense_type: formExpenseType,
          amount: parsedAmount,
          merchant_name: formMerchant.trim() || undefined,
          description: formDescription.trim(),
          submit_immediately: formSubmitImmediately,
          attachment_ids: formAttachments.map((a) => a.id),
        });
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save expense claim');
    }
  };

  const stats = myData?.stats || {
    totalClaimed: 0,
    pendingApproval: 0,
    approvedReady: 0,
    reimbursedTotal: 0,
    draftCount: 0,
    submittedCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    reimbursedCount: 0,
  };

  const claimsList = ((myData?.claims || []) as ExpenseClaimSummary[]).filter((c: ExpenseClaimSummary) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.claim_no.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      (c.merchant_name && c.merchant_name.toLowerCase().includes(term)) ||
      (c.category?.name && c.category.name.toLowerCase().includes(term))
    );
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [statusFilter, searchTerm, pageSize]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(claimsList.length / pageSize)));
  const rows = claimsList.slice((safePage - 1) * pageSize, safePage * pageSize);

  const menuFor = (claim: ExpenseClaimSummary): RowAction[] => {
    const list: RowAction[] = [{ label: 'View details', icon: Eye, onClick: () => setViewClaimId(claim.claim_id) }];
    if (claim.status === 'DRAFT') {
      list.push({ label: 'Edit draft', icon: Edit2, onClick: () => openEditModal(claim) });
      list.push({
        label: 'Delete draft',
        icon: Trash2,
        danger: true,
        onClick: () => {
          if (confirm('Delete this draft claim?')) deleteClaimMut.mutate(claim.claim_id);
        },
      });
    }
    if (claim.status === 'SUBMITTED') {
      list.push({
        label: 'Withdraw to draft',
        icon: History,
        danger: true,
        onClick: () => {
          if (confirm('Withdraw this claim back to draft?')) withdrawMut.mutate(claim.claim_id);
        },
      });
    }
    if (claim.status === 'REJECTED') {
      list.push({ label: 'Copy to new draft', icon: Copy, onClick: () => copyToDraftMut.mutate(claim.claim_id) });
    }
    return list;
  };

  /** The one action most worth a visible button. */
  const primaryFor = (claim: ExpenseClaimSummary) =>
    claim.status === 'DRAFT' ? (
      <button
        type="button"
        onClick={() => submitDraftMut.mutate(claim.claim_id)}
        disabled={submitDraftMut.isPending}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-[13px] font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" /> Submit
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setViewClaimId(claim.claim_id)}
        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
      >
        View <ChevronRight className="h-4 w-4" />
      </button>
    );

  const statusTabs = [
    { id: 'ALL', label: 'All claims', count: undefined as number | undefined },
    { id: 'DRAFT', label: 'Drafts', count: stats.draftCount },
    { id: 'SUBMITTED', label: 'Pending', count: stats.submittedCount },
    { id: 'APPROVED', label: 'Approved', count: stats.approvedCount },
    { id: 'REIMBURSED', label: 'Reimbursed', count: stats.reimbursedCount },
    { id: 'REJECTED', label: 'Rejected', count: stats.rejectedCount },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
            <Receipt className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">My Expenses</h1>
            <p className="mt-0.5 text-sm text-slate-500">Submit, track and manage your expense reimbursements.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-hidden focus:ring-4 focus:ring-indigo-600/20 active:scale-[0.98] sm:self-auto"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Expense Claim
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Total claimed" value={inr(stats.totalClaimed)} hint="Across all recorded claims" icon={DollarSign} tone="text-slate-900" tile="bg-slate-50 text-slate-600 ring-slate-100" bar="from-slate-400 to-slate-500" />
        <StatCard
          label="In approval"
          value={inr(stats.pendingApproval)}
          hint={`${stats.submittedCount} claim${stats.submittedCount !== 1 ? 's' : ''} awaiting review`}
          icon={Clock}
          tone="text-amber-600"
          tile="bg-amber-50 text-amber-600 ring-amber-100"
          bar="from-amber-400 to-orange-400"
        />
        <StatCard
          label="Approved (payout ready)"
          value={inr(stats.approvedReady)}
          hint={`${stats.approvedCount} claim${stats.approvedCount !== 1 ? 's' : ''} queued for payment`}
          icon={CheckCircle2}
          tone="text-emerald-600"
          tile="bg-emerald-50 text-emerald-600 ring-emerald-100"
          bar="from-emerald-400 to-teal-400"
        />
        <StatCard
          label="Reimbursed"
          value={inr(stats.reimbursedTotal)}
          hint={`${stats.reimbursedCount} paid claim${stats.reimbursedCount !== 1 ? 's' : ''}`}
          icon={Receipt}
          tone="text-indigo-600"
          tile="bg-indigo-50 text-indigo-600 ring-indigo-100"
          bar="from-indigo-500 to-violet-500"
        />
      </div>

      {/* Claims */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div role="tablist" aria-label="Claim status" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
              {statusTabs.map((tab) => {
                const on = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${
                      on ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none ${on ? 'bg-indigo-50 text-indigo-700' : 'bg-white/70 text-slate-500'}`}>{tab.count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Loading expense claims...</p>
          </div>
        ) : claimsList.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <Inbox className="h-7 w-7" />
            </span>
            <h3 className="text-base font-semibold text-slate-800">No expense claims found</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {statusFilter !== 'ALL' || searchTerm ? 'Nothing matches this view. Try another status or clear the search.' : 'You have not submitted any expense claims yet.'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {(statusFilter !== 'ALL' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <FilterX className="h-4 w-4" /> Clear filters
                </button>
              )}
              <button type="button" onClick={openCreateModal} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> New claim
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Small screens: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((claim: ExpenseClaimSummary) => (
                <li key={claim.claim_id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{claim.claim_no}</span>
                    <ClaimStatusBadge status={claim.status} />
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{claim.category?.name || 'Expense'}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{claim.merchant_name || claim.description}</p>
                    </div>
                    <p className="shrink-0 text-lg font-extrabold text-slate-900">{inr(claim.amount)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      {claim.expense_type === 'Office Expense' ? <Building className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      {claim.expense_type} · {fmtDate(claim.expense_date)}
                    </span>
                    <FlagChips claim={claim} clean="" />
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-1">
                    {primaryFor(claim)}
                    <RowActionsMenu label={`More actions for ${claim.claim_no}`} actions={menuFor(claim)} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Larger screens: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50/95">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <th className="whitespace-nowrap px-5 py-3">Claim #</th>
                    <th className="whitespace-nowrap px-5 py-3">Expense date</th>
                    <th className="whitespace-nowrap px-5 py-3">Category &amp; type</th>
                    <th className="whitespace-nowrap px-5 py-3">Merchant &amp; description</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right">Amount</th>
                    <th className="whitespace-nowrap px-5 py-3">Flags</th>
                    <th className="whitespace-nowrap px-5 py-3">Status</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((claim: ExpenseClaimSummary) => (
                    <tr key={claim.claim_id} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-5 py-3.5">
                        <button type="button" onClick={() => setViewClaimId(claim.claim_id)} className="cursor-pointer whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
                          {claim.claim_no}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{fmtDate(claim.expense_date)}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{claim.category?.name || 'Expense'}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          {claim.expense_type === 'Office Expense' ? <Building className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {claim.expense_type}
                        </div>
                      </td>
                      <td className="max-w-[18rem] px-5 py-3.5">
                        {claim.merchant_name && <span className="block truncate font-medium text-slate-700">{claim.merchant_name}</span>}
                        <p className="truncate text-slate-500" title={claim.description}>
                          {claim.description}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-slate-900">{inr(claim.amount)}</td>
                      <td className="px-5 py-3.5">
                        <FlagChips claim={claim} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ClaimStatusBadge status={claim.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {primaryFor(claim)}
                          <RowActionsMenu label={`More actions for ${claim.claim_no}`} actions={menuFor(claim)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={safePage} pageSize={pageSize} total={claimsList.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {/* =========================================================================
          CREATE / EDIT CLAIM MODAL
         ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingClaim ? `Edit Draft Claim #${editingClaim.claim_no}` : 'Submit New Expense Claim'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Follow company expense policy and attach relevant invoice/receipt
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => handleCategoryChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {categories.map((c: ExpenseCategory) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name} {c.limit_per_claim ? `(Max ₹${c.limit_per_claim})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Expense Type & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expense Type *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(expenseTypes.length > 0
                      ? expenseTypes.filter((t: ExpenseTypeItem) => t.is_active)
                      : [
                          { name: 'Office Expense', code: 'OFFICE' },
                          { name: 'Personal Expense', code: 'PERSONAL' },
                        ]
                    ).map((t: any) => {
                      const isDisabled =
                        (selectedCategory?.allowed_type === 'PERSONAL' && t.code === 'OFFICE') ||
                        (selectedCategory?.allowed_type === 'OFFICE' && t.code === 'PERSONAL');
                      const isSelected = formExpenseType === t.name;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setFormExpenseType(t.name as any)}
                          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {t.code === 'OFFICE' ? (
                            <Building className="w-3.5 h-3.5" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000000"
                      required
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Policy Limit Warning Banner */}
              {selectedCategory?.limit_per_claim &&
                parseFloat(formAmount) > Number(selectedCategory.limit_per_claim) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <span className="font-semibold">Above Policy Limit:</span> This amount exceeds the
                      standard limit of ₹{Number(selectedCategory.limit_per_claim).toLocaleString('en-IN')}{' '}
                      for {selectedCategory.name}. It will require special approver acknowledgment.
                    </div>
                  </div>
                )}

              {/* Row 3: Merchant Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Merchant / Vendor Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uber India, MakeMyTrip, Amazon, Local Restaurant"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Row 4: Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Business Purpose & Description * (10-500 chars)
                  </label>
                  <span className="text-[11px] text-slate-400">{formDescription.length}/500</span>
                </div>
                <textarea
                  required
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  placeholder="Explain why this expense was incurred and who or what it was for..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Row 5: Receipt Dropzone (Unified Attachments) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    Receipts & Invoices
                    {selectedCategory?.receipt_rule === 'ALWAYS' ? (
                      <span className="text-red-500 text-[10px] font-semibold">(Mandatory)</span>
                    ) : selectedCategory?.receipt_rule === 'ABOVE_THRESHOLD' ? (
                      <span className="text-slate-500 text-[10px]">
                        (Required &gt; ₹{selectedCategory.receipt_threshold_amount})
                      </span>
                    ) : null}
                  </label>
                  <span className="text-[11px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                </div>

                {/* Upload Trigger Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e.target.files)}
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 text-xs py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading receipt securely...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-500 text-xs">
                      <UploadCloud className="w-6 h-6 text-indigo-500 mb-0.5" />
                      <div>
                        <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-[11px] text-slate-400">Multi-page bills, tax invoices, cash memos</div>
                    </div>
                  )}
                </div>

                {/* Attached File Chips */}
                {formAttachments.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {formAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[80%]">
                          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-medium text-slate-700 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({(att.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Immediately Toggle (Only on new claim creation) */}
              {!editingClaim && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formSubmitImmediately}
                      onChange={(e) => setFormSubmitImmediately(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Submit for approval immediately (otherwise saved as Draft)
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClaimMut.isPending || updateClaimMut.isPending || isUploading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  {(createClaimMut.isPending || updateClaimMut.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingClaim
                    ? 'Save Draft Changes'
                    : formSubmitImmediately
                    ? 'Submit Claim'
                    : 'Save as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW CLAIM DETAILS & TIMELINE DRAWER / MODAL
         ========================================================================= */}
      {viewClaimId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {claimDetails?.claim_no || `Claim #${viewClaimId}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submitted by {claimDetails?.employee?.name || 'You'} •{' '}
                    {claimDetails?.employee?.department_name || 'General'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewClaimId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetails || !claimDetails ? (
              <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading claim details...</span>
              </div>
            ) : (
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Status & Amount Top Bar */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Claim Amount
                    </span>
                    <span className="text-2xl font-bold text-slate-900">
                      ₹{claimDetails.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Current Status
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        claimDetails.status === 'DRAFT'
                          ? 'bg-slate-200 text-slate-700'
                          : claimDetails.status === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-800'
                          : claimDetails.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claimDetails.status === 'REIMBURSED'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {claimDetails.status}
                    </span>
                  </div>
                </div>

                {/* Flags Warning if present */}
                {(claimDetails.is_above_limit ||
                  claimDetails.is_possible_duplicate ||
                  claimDetails.is_late) && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Policy Triggers Detected:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      {claimDetails.is_above_limit && (
                        <li>Expense exceeds policy limit for category {claimDetails.category?.name}</li>
                      )}
                      {claimDetails.is_possible_duplicate && (
                        <li>Similar expense date and amount detected within past 90 days</li>
                      )}
                      {claimDetails.is_late && <li>Expense date submitted after the policy window</li>}
                    </ul>
                  </div>
                )}

                {/* Key Attributes Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Expense Date</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {new Date(claimDetails.expense_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Category</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {claimDetails.category?.name} ({claimDetails.expense_type})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Merchant / Vendor</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {claimDetails.merchant_name || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Assigned Approver</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {claimDetails.approver ? claimDetails.approver.name : 'Organization Admin'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-1">
                    Business Purpose / Description
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {claimDetails.description}
                  </div>
                </div>

                {/* Rejection Remarks (If rejected) */}
                {claimDetails.status === 'REJECTED' && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
                    <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Rejection Reason: {claimDetails.rejection_reason}
                    </div>
                    <p className="text-rose-700 mt-1">
                      Remarks: {claimDetails.decision_remarks || 'No detailed remarks provided.'}
                    </p>
                  </div>
                )}

                {/* Reimbursement Details (If reimbursed) */}
                {claimDetails.status === 'REIMBURSED' && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs text-indigo-900">
                    <div className="font-semibold flex items-center gap-1.5 text-indigo-800">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      Payment Processed via {claimDetails.payment_mode || 'Direct Transfer'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-indigo-700 mt-1">
                      <div>
                        Reference No: <span className="font-mono font-medium">{claimDetails.payment_reference_no || 'N/A'}</span>
                      </div>
                      <div>
                        Payment Date:{' '}
                        {claimDetails.payment_date
                          ? new Date(claimDetails.payment_date).toLocaleDateString('en-GB')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments Section */}
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-2">
                    Attached Invoices & Receipts ({claimDetails.attachments?.length || 0})
                  </span>
                  {!claimDetails.attachments || claimDetails.attachments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No attachments uploaded for this claim
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {claimDetails.attachments.map((att: any) => (
                        <a
                          key={att.attachment_id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition group text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-medium text-slate-700 block truncate group-hover:text-indigo-700">
                                {att.file_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {(att.file_size_bytes / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Trail Timeline */}
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-2">
                    Audit Trail & Timeline
                  </span>
                  <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-1">
                    {claimDetails.history?.map((h: any) => (
                      <div key={h.history_id} className="relative pl-4 text-xs">
                        <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-200" />
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>{h.event}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(h.performed_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          By {h.performed_by_name} {h.remarks ? `• "${h.remarks}"` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setViewClaimId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
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
export default MyExpensesPage;
