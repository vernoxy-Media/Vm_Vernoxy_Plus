import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  X,
  AlertCircle,
  Building,
  UserCheck,
  Shield,
  Layers,
  History,
  Sliders,
  Tag,
} from 'lucide-react';
import {
  useExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useToggleExpenseCategoryStatusMutation,
  useDeleteExpenseCategoryMutation,
  useExpenseGeneralSettingsQuery,
  useUpdateExpenseGeneralSettingsMutation,
  useDepartmentApproversQuery,
  useAssignAuthorisedApproverMutation,
  useRemoveAuthorisedApproverMutation,
  useExpenseSettingsChangeLogQuery,
  useExpenseTypesQuery,
  useCreateExpenseTypeMutation,
  useUpdateExpenseTypeMutation,
  useToggleExpenseTypeStatusMutation,
  useDeleteExpenseTypeMutation,
  ExpenseCategory,
  ExpenseGeneralSettings,
  ExpenseTypeItem,
} from '@/features/expense/hooks/use-expense-settings';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';

export const SettingsExpenseSettingsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'types' | 'approvers' | 'general' | 'changelog'>('categories');

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useExpenseCategoriesQuery();
  const { data: expenseTypes = [], isLoading: isLoadingTypes } = useExpenseTypesQuery();
  const { data: generalSettings } = useExpenseGeneralSettingsQuery();
  const { data: approvers = [], isLoading: isLoadingApprovers } = useDepartmentApproversQuery();
  const { data: changeLogs = [], isLoading: isLoadingLogs } = useExpenseSettingsChangeLogQuery();
  const { data: activeEmployees = [] } = useEmployeeOptionsQuery();

  // Category Mutations
  const createCategoryMut = useCreateExpenseCategoryMutation();
  const updateCategoryMut = useUpdateExpenseCategoryMutation();
  const toggleCategoryMut = useToggleExpenseCategoryStatusMutation();
  const deleteCategoryMut = useDeleteExpenseCategoryMutation();

  // Type Mutations
  const createTypeMut = useCreateExpenseTypeMutation();
  const updateTypeMut = useUpdateExpenseTypeMutation();
  const toggleTypeMut = useToggleExpenseTypeStatusMutation();
  const deleteTypeMut = useDeleteExpenseTypeMutation();

  // General Settings Mutation
  const updateGeneralMut = useUpdateExpenseGeneralSettingsMutation();

  // Approver Mutations
  const assignApproverMut = useAssignAuthorisedApproverMutation();
  const removeApproverMut = useRemoveAuthorisedApproverMutation();

  // Type Modal State
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseTypeItem | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    display_order: 1,
    is_active: true,
  });
  const [typeError, setTypeError] = useState<string | null>(null);

  const handleOpenCreateType = () => {
    setEditingType(null);
    setTypeForm({
      name: '',
      code: '',
      description: '',
      display_order: expenseTypes.length + 1,
      is_active: true,
    });
    setTypeError(null);
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (type: ExpenseTypeItem) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      code: type.code,
      description: type.description || '',
      display_order: type.display_order,
      is_active: type.is_active,
    });
    setTypeError(null);
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError(null);

    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      setTypeError('Name and code are required');
      return;
    }

    try {
      if (editingType) {
        await updateTypeMut.mutateAsync({
          id: editingType.type_id,
          data: {
            name: typeForm.name.trim(),
            code: typeForm.code.trim().toUpperCase(),
            description: typeForm.description.trim() || undefined,
            display_order: Number(typeForm.display_order) || 1,
            is_active: typeForm.is_active,
          },
        });
      } else {
        await createTypeMut.mutateAsync({
          name: typeForm.name.trim(),
          code: typeForm.code.trim().toUpperCase(),
          description: typeForm.description.trim() || undefined,
          display_order: Number(typeForm.display_order) || 1,
          is_active: typeForm.is_active,
        });
      }
      setIsTypeModalOpen(false);
    } catch (err: any) {
      setTypeError(err.response?.data?.message || err.message || 'Failed to save expense type');
    }
  };

  const handleDeleteType = async (typeId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete expense type "${name}"?`)) return;
    try {
      await deleteTypeMut.mutateAsync(typeId);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete expense type');
    }
  };

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    allowed_type: 'BOTH' as 'OFFICE' | 'PERSONAL' | 'BOTH',
    hasLimit: true,
    limit_per_claim: '1500',
    receipt_rule: 'ABOVE_THRESHOLD' as 'ALWAYS' | 'ABOVE_THRESHOLD',
    receipt_threshold_amount: '500',
    is_active: true,
    display_order: 0,
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Approver Modal State
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<{ id: number; name: string } | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [approverError, setApproverError] = useState<string | null>(null);

  // General Settings State
  const [generalForm, setGeneralForm] = useState<Partial<ExpenseGeneralSettings>>({});
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync general settings when loaded
  React.useEffect(() => {
    if (generalSettings) {
      setGeneralForm(generalSettings);
    }
  }, [generalSettings]);

  // Handlers for Categories
  const handleOpenCategoryModal = (cat?: ExpenseCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({
        name: cat.name,
        code: cat.code || '',
        allowed_type: cat.allowed_type,
        hasLimit: cat.limit_per_claim !== null && cat.limit_per_claim !== undefined,
        limit_per_claim: cat.limit_per_claim ? String(cat.limit_per_claim) : '',
        receipt_rule: cat.receipt_rule,
        receipt_threshold_amount: String(cat.receipt_threshold_amount ?? 500),
        is_active: cat.is_active,
        display_order: cat.display_order ?? 0,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        code: '',
        allowed_type: 'BOTH',
        hasLimit: false,
        limit_per_claim: '',
        receipt_rule: 'ABOVE_THRESHOLD',
        receipt_threshold_amount: '500',
        is_active: true,
        display_order: categories.length + 1,
      });
    }
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setCategoryError('Category name is required.');
      return;
    }

    const payload: any = {
      name: categoryForm.name.trim(),
      code: categoryForm.code.trim() || undefined,
      allowed_type: categoryForm.allowed_type,
      limit_per_claim:
        categoryForm.hasLimit && categoryForm.limit_per_claim
          ? parseFloat(categoryForm.limit_per_claim)
          : null,
      receipt_rule: categoryForm.receipt_rule,
      receipt_threshold_amount: parseFloat(categoryForm.receipt_threshold_amount || '0'),
      is_active: categoryForm.is_active,
      display_order: Number(categoryForm.display_order) || 0,
    };

    try {
      if (editingCategory) {
        await updateCategoryMut.mutateAsync({
          id: editingCategory.category_id,
          data: payload,
        });
      } else {
        await createCategoryMut.mutateAsync(payload);
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (cat: ExpenseCategory) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }
    try {
      await deleteCategoryMut.mutateAsync(cat.category_id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  // Handlers for Approvers
  const handleOpenApproverModal = (deptId: number, deptName: string, currentEmpId?: number) => {
    setSelectedDept({ id: deptId, name: deptName });
    setSelectedEmpId(currentEmpId || '');
    setApproverError(null);
    setIsApproverModalOpen(true);
  };

  const handleSaveApprover = async () => {
    if (!selectedDept || !selectedEmpId) {
      setApproverError('Please select an employee.');
      return;
    }
    try {
      await assignApproverMut.mutateAsync({
        department_id: selectedDept.id,
        approver_emp_id: Number(selectedEmpId),
      });
      setIsApproverModalOpen(false);
    } catch (err: any) {
      setApproverError(err.message || 'Failed to assign approver');
    }
  };

  const handleRemoveApprover = async (deptId: number, deptName: string) => {
    if (!window.confirm(`Remove authorised approver for ${deptName}? Claims will route to Admin.`)) {
      return;
    }
    try {
      await removeApproverMut.mutateAsync(deptId);
    } catch (err: any) {
      alert(err.message || 'Failed to remove approver');
    }
  };

  // Handlers for General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(false);

    try {
      await updateGeneralMut.mutateAsync({
        claim_window_days: Number(generalForm.claim_window_days),
        after_claim_window_action: generalForm.after_claim_window_action,
        duplicate_check_enabled: Boolean(generalForm.duplicate_check_enabled),
        default_reimbursement_method: generalForm.default_reimbursement_method,
        approver_reminder_days: Number(generalForm.approver_reminder_days),
        currency: generalForm.currency || 'INR',
      });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to update general settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expense Settings</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure master categories, reimbursement limits, claim windows, receipt rules, and department approvers.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Expense Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'types'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Expense Types ({expenseTypes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approvers')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'approvers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Authorised Approvers ({approvers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('changelog')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'changelog'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Change Log ({changeLogs.length})
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. CATEGORIES TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Categories define standard expense classification, per-claim caps, and receipt rules.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCategoryModal()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Allowed Type</th>
                    <th className="py-3 px-4">Limit / Claim</th>
                    <th className="py-3 px-4">Receipt Rule</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingCategories ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading expense categories...
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No categories found. Click "Add Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.category_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{cat.display_order}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{cat.name}</td>
                        <td className="py-3 px-4">
                          {cat.code ? (
                            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-2xs border border-slate-200">
                              {cat.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-2xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-medium ${
                              cat.allowed_type === 'OFFICE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : cat.allowed_type === 'PERSONAL'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {cat.allowed_type === 'BOTH'
                              ? 'Office & Personal'
                              : cat.allowed_type === 'OFFICE'
                              ? 'Office Only'
                              : 'Personal Only'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {cat.limit_per_claim !== null && cat.limit_per_claim !== undefined ? (
                            `₹ ${Number(cat.limit_per_claim).toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-slate-400 font-normal">No limit</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cat.receipt_rule === 'ALWAYS' ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-2xs font-medium border border-amber-200">
                              Always Required
                            </span>
                          ) : (
                            <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded text-2xs border border-slate-200">
                              Above ₹ {Number(cat.receipt_threshold_amount || 500).toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleCategoryMut.mutate(cat.category_id)}
                            className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors ${
                              cat.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenCategoryModal(cat)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. EXPENSE TYPES TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Expense Types</h3>
              <p className="text-xs text-slate-500">
                Define the high-level expense classifications (e.g. Office Expense, Personal Expense) used across the module.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateType}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Expense Type
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Type Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingTypes ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Loading expense types...
                      </td>
                    </tr>
                  ) : expenseTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No expense types found. Click "Add Expense Type" to create one.
                      </td>
                    </tr>
                  ) : (
                    expenseTypes.map((type: ExpenseTypeItem) => (
                      <tr key={type.type_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono text-2xs">
                          {type.display_order}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {type.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-2xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {type.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {type.description || <span className="text-slate-300 italic">No description</span>}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleTypeMut.mutate(type.type_id)}
                            className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors cursor-pointer ${
                              type.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {type.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditType(type)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Edit Expense Type"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteType(type.type_id, type.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Expense Type"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. AUTHORISED APPROVERS TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'approvers' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold">Routing Rule:</span> When an employee submits an expense claim, it is routed to their department's Authorised Approver. If no approver is assigned for the department, or if the approver submits their own claim, it routes directly to Organization Admins.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Authorised Approver</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingApprovers ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Loading department approver mappings...
                    </td>
                  </tr>
                ) : approvers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No departments configured.
                    </td>
                  </tr>
                ) : (
                  approvers.map((item) => (
                    <tr key={item.department_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-800">{item.department_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.mapping ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-2xs">
                              {item.mapping.approver.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{item.mapping.approver.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-2xs">
                            Not assigned (Routes to Admin)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.mapping ? item.mapping.approver.email : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenApproverModal(
                                item.department_id,
                                item.department_name,
                                item.mapping?.approver_emp_id,
                              )
                            }
                            className="px-2.5 py-1 text-2xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            {item.mapping ? 'Change Approver' : 'Assign Approver'}
                          </button>
                          {item.mapping && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveApprover(item.department_id, item.department_name)
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Remove Approver"
                            >
                              <X className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. GENERAL SETTINGS TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'general' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          {generalSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              General expense settings saved successfully.
            </div>
          )}

          {generalError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {generalError}
            </div>
          )}

          <form onSubmit={handleSaveGeneral} className="space-y-5">
            {/* Claim Window */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Claim Window (Days) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={generalForm.claim_window_days ?? 60}
                onChange={(e) =>
                  setGeneralForm({ ...generalForm, claim_window_days: parseInt(e.target.value) || 60 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-2xs text-slate-400 mt-1">
                Number of days from the expense date within which employees should submit claims (default 60).
              </p>
            </div>

            {/* After Claim Window Action */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                After Claim Window Action <span className="text-rose-500">*</span>
              </label>
              <select
                value={generalForm.after_claim_window_action || 'FLAG_AS_LATE'}
                onChange={(e) =>
                  setGeneralForm({
                    ...generalForm,
                    after_claim_window_action: e.target.value as 'FLAG_AS_LATE' | 'STOP_SUBMISSION',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="FLAG_AS_LATE">
                  Allow submission with "Late Submission" flag (Recommended)
                </option>
                <option value="STOP_SUBMISSION">Block submission completely</option>
              </select>
              <p className="text-2xs text-slate-400 mt-1">
                When set to "Flag as Late", employees can submit but approvers are warned with a prominent late badge.
              </p>
            </div>

            {/* Duplicate Claim Check */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generalForm.duplicate_check_enabled ?? true}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, duplicate_check_enabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Enable Duplicate Claim Detection
                  </span>
                  <p className="text-2xs text-slate-400">
                    Automatically flags claims with identical employee, date, amount, and category for approver verification.
                  </p>
                </div>
              </label>
            </div>

            {/* Default Reimbursement Method */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Reimbursement Method
              </label>
              <select
                value={generalForm.default_reimbursement_method || 'DIRECT'}
                onChange={(e) =>
                  setGeneralForm({
                    ...generalForm,
                    default_reimbursement_method: e.target.value as 'DIRECT' | 'PAYROLL',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="DIRECT">Direct Payment (Bank Transfer / UPI / Cash / Cheque)</option>
                <option value="PAYROLL">Payroll Addition (Include in monthly salary run)</option>
              </select>
            </div>

            {/* Approver Reminder Days */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approver Reminder (Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={generalForm.approver_reminder_days ?? 3}
                onChange={(e) =>
                  setGeneralForm({
                    ...generalForm,
                    approver_reminder_days: parseInt(e.target.value) || 3,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-2xs text-slate-400 mt-1">
                Days after submission before notifying approvers of pending expense claims.
              </p>
            </div>

            {/* Currency */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <input
                type="text"
                readOnly
                value={generalForm.currency || 'INR'}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={updateGeneralMut.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {updateGeneralMut.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 4. CHANGE LOG TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'changelog' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Immutable audit trail of all expense configuration changes made by administrators.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Field Changed</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4">New Value</th>
                  <th className="py-3 px-4">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading change logs...
                    </td>
                  </tr>
                ) : changeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No configuration changes recorded yet.
                    </td>
                  </tr>
                ) : (
                  changeLogs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-2xs">
                        {new Date(log.changed_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-2xs border border-slate-200">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.field_name}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate font-mono text-2xs">
                        {log.old_value ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 max-w-xs truncate font-mono text-2xs">
                        {log.new_value ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.changed_by_name || `Admin #${log.changed_by}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* EXPENSE TYPE MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingType ? 'Edit Expense Type' : 'Add Expense Type'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-5 space-y-4 text-xs">
              {typeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{typeError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Expense, Personal Expense, Client Travel"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OFFICE, PERSONAL"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of when this expense type is used..."
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={typeForm.display_order}
                    onChange={(e) => setTypeForm({ ...typeForm, display_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={typeForm.is_active}
                      onChange={(e) => setTypeForm({ ...typeForm, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTypeMut.isPending || updateTypeMut.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  {createTypeMut.isPending || updateTypeMut.isPending ? 'Saving...' : 'Save Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* CATEGORY MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {categoryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {categoryError}
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel – Local Conveyance"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Code & Display Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRAVEL_LOCAL"
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Allowed Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allowed Expense Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryForm.allowed_type}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      allowed_type: e.target.value as 'OFFICE' | 'PERSONAL' | 'BOTH',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="BOTH">Office & Personal Expenses (Both)</option>
                  <option value="OFFICE">Office Expense Only</option>
                  <option value="PERSONAL">Personal Expense Only</option>
                </select>
              </div>

              {/* Limit per Claim */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={categoryForm.hasLimit}
                    onChange={(e) => setCategoryForm({ ...categoryForm, hasLimit: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Apply Maximum Limit per Claim (₹)
                  </span>
                </label>
                {categoryForm.hasLimit && (
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 1500"
                    value={categoryForm.limit_per_claim}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, limit_per_claim: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Receipt Rule */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receipt Requirement <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryForm.receipt_rule}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      receipt_rule: e.target.value as 'ALWAYS' | 'ABOVE_THRESHOLD',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="ABOVE_THRESHOLD">Required only above threshold amount</option>
                  <option value="ALWAYS">Always mandatory (for all amounts)</option>
                </select>
                {categoryForm.receipt_rule === 'ABOVE_THRESHOLD' && (
                  <div className="mt-2">
                    <label className="block text-2xs font-medium text-slate-600 mb-1">
                      Threshold Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={categoryForm.receipt_threshold_amount}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          receipt_threshold_amount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800">Category Active</span>
                  <p className="text-2xs text-slate-400">
                    Inactive categories cannot be chosen when submitting new claims.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={createCategoryMut.isPending || updateCategoryMut.isPending}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* APPROVER MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isApproverModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                Assign Approver: {selectedDept.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsApproverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {approverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {approverError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">-- Choose an active employee --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
                <p className="text-2xs text-slate-400 mt-1">
                  Claims submitted by employees of this department will be routed to this person.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApproverModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApprover}
                disabled={assignApproverMut.isPending}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {assignApproverMut.isPending ? 'Assigning...' : 'Save Approver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
