import React, { useState, useRef } from 'react';
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
} from '../../hooks/use-expenses';
import {
  useExpenseCategoriesQuery,
  useExpenseTypesQuery,
  ExpenseCategory,
  ExpenseTypeItem,
} from '../../hooks/use-expense-settings';
import { useUploadAttachmentMutation } from '../../hooks/use-attachments';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            My Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit, track, and manage your business and personal expense reimbursements
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Expense Claim
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Claimed
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{stats.totalClaimed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Across all recorded claims</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              In Approval
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700">
              ₹{stats.pendingApproval.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              {stats.submittedCount} claim{stats.submittedCount !== 1 ? 's' : ''} awaiting review
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Approved (Payout Ready)
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">
              ₹{stats.approvedReady.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              {stats.approvedCount} claim{stats.approvedCount !== 1 ? 's' : ''} queued for payment
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Reimbursed
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-700">
              ₹{stats.reimbursedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              {stats.reimbursedCount} paid claim{stats.reimbursedCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Navigation & Search Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Claims' },
              { id: 'DRAFT', label: `Drafts (${stats.draftCount})` },
              { id: 'SUBMITTED', label: `Pending (${stats.submittedCount})` },
              { id: 'APPROVED', label: `Approved (${stats.approvedCount})` },
              { id: 'REIMBURSED', label: `Reimbursed (${stats.reimbursedCount})` },
              { id: 'REJECTED', label: `Rejected (${stats.rejectedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
            />
            <Receipt className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Claims Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading expense claims...</span>
            </div>
          ) : claimsList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No expense claims found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {statusFilter !== 'ALL'
                  ? `There are no claims in ${statusFilter.toLowerCase()} status.`
                  : 'You have not submitted any expense claims yet. Click the button above to create your first claim.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Claim #</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4">Category & Type</th>
                  <th className="py-3 px-4">Merchant & Description</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Flags</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {claimsList.map((claim: ExpenseClaimSummary) => {
                  const hasFlags = claim.is_above_limit || claim.is_possible_duplicate || claim.is_late;
                  return (
                    <tr key={claim.claim_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        {claim.claim_no}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(claim.expense_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {claim.category?.name || 'Expense'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          {claim.expense_type === 'Office Expense' ? (
                            <Building className="w-3 h-3 text-slate-400" />
                          ) : (
                            <User className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{claim.expense_type}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {claim.merchant_name && (
                          <span className="font-medium text-slate-700 block truncate">
                            {claim.merchant_name}
                          </span>
                        )}
                        <p className="text-slate-500 truncate" title={claim.description}>
                          {claim.description}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        ₹{claim.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasFlags ? (
                          <div className="flex items-center justify-center gap-1">
                            {claim.is_above_limit && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800"
                                title="Exceeds Category Limit"
                              >
                                Limit
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
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            claim.status === 'DRAFT'
                              ? 'bg-slate-100 text-slate-700'
                              : claim.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : claim.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'REIMBURSED'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {claim.status === 'SUBMITTED' ? 'Under Review' : claim.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setViewClaimId(claim.claim_id)}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                            title="View details & timeline"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Draft actions: Edit, Submit, Delete */}
                          {claim.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => openEditModal(claim)}
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Draft"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => submitDraftMut.mutate(claim.claim_id)}
                                disabled={submitDraftMut.isPending}
                                className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Submit Claim"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this draft claim?')) {
                                    deleteClaimMut.mutate(claim.claim_id);
                                  }
                                }}
                                className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Submitted action: Withdraw */}
                          {claim.status === 'SUBMITTED' && (
                            <button
                              onClick={() => {
                                if (confirm('Withdraw this claim back to draft?')) {
                                  withdrawMut.mutate(claim.claim_id);
                                }
                              }}
                              className="px-2 py-0.5 text-[11px] font-medium rounded text-amber-700 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                            >
                              Withdraw
                            </button>
                          )}

                          {/* Rejected action: Copy to draft */}
                          {claim.status === 'REJECTED' && (
                            <button
                              onClick={() => copyToDraftMut.mutate(claim.claim_id)}
                              disabled={copyToDraftMut.isPending}
                              className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Copy to new draft"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
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
