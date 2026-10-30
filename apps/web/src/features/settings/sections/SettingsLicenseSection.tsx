import React, { useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Laptop,
  Building,
  AlertTriangle,
  Users,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  useLicenseSettingsQuery,
  useUpdateLicenseSettingsMutation,
  useLicenseCategoriesQuery,
  useCreateLicenseCategoryMutation,
  useUpdateLicenseCategoryMutation,
  useDeleteLicenseCategoryMutation,
  useLicenseVendorsQuery,
  useCreateLicenseVendorMutation,
  useUpdateLicenseVendorMutation,
  useDeleteLicenseVendorMutation,
  useLicenseRevokeReasonsQuery,
  useCreateLicenseRevokeReasonMutation,
  useUpdateLicenseRevokeReasonMutation,
  useDeleteLicenseRevokeReasonMutation,
  useLicenseDiscontinueReasonsQuery,
  useCreateLicenseDiscontinueReasonMutation,
  useUpdateLicenseDiscontinueReasonMutation,
  useDeleteLicenseDiscontinueReasonMutation,
  useLicenseManagersQuery,
  useAddLicenseManagerMutation,
  useRemoveLicenseManagerMutation,
  LicenseCategory,
  LicenseVendor,
  LicenseReason,
} from '@/features/license/hooks/use-license-settings';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';

type ActiveTab = 'categories' | 'vendors' | 'revoke_reasons' | 'discontinue_reasons' | 'managers' | 'rules';

export const SettingsLicenseSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');

  // Search queries per tab
  const [searchCategory, setSearchCategory] = useState('');
  const [searchVendor, setSearchVendor] = useState('');
  const [searchRevoke, setSearchRevoke] = useState('');
  const [searchDiscontinue, setSearchDiscontinue] = useState('');
  const [searchManager, setSearchManager] = useState('');

  // ── 1. Categories ──────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: isLoadingCategories } = useLicenseCategoriesQuery(true);
  const createCategoryMut = useCreateLicenseCategoryMutation();
  const updateCategoryMut = useUpdateLicenseCategoryMutation();
  const deleteCategoryMut = useDeleteLicenseCategoryMutation();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LicenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState<number>(1);
  const [catActive, setCatActive] = useState(true);
  const [catError, setCatError] = useState('');

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatOrder(categories.length + 1);
    setCatActive(true);
    setCatError('');
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: LicenseCategory) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatOrder(c.display_order ?? 1);
    setCatActive(c.is_active);
    setCatError('');
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    try {
      if (editingCategory) {
        await updateCategoryMut.mutateAsync({
          id: editingCategory.category_id,
          dto: { name: catName.trim(), display_order: catOrder, is_active: catActive },
        });
      } else {
        await createCategoryMut.mutateAsync({
          name: catName.trim(),
          display_order: catOrder,
          is_active: catActive,
        });
      }
      setCategoryModalOpen(false);
    } catch (err: any) {
      setCatError(err?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (c: LicenseCategory) => {
    if (confirm(`Are you sure you want to delete category "${c.name}"? If licenses are using it, it will be deactivated instead.`)) {
      try {
        await deleteCategoryMut.mutateAsync(c.category_id);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete category');
      }
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchCategory.trim().toLowerCase()),
  );

  // ── 2. Vendors ─────────────────────────────────────────────────────────────
  const { data: vendors = [], isLoading: isLoadingVendors } = useLicenseVendorsQuery(true);
  const createVendorMut = useCreateLicenseVendorMutation();
  const updateVendorMut = useUpdateLicenseVendorMutation();
  const deleteVendorMut = useDeleteLicenseVendorMutation();

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<LicenseVendor | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorActive, setVendorActive] = useState(true);
  const [vendorError, setVendorError] = useState('');

  const openAddVendor = () => {
    setEditingVendor(null);
    setVendorName('');
    setVendorActive(true);
    setVendorError('');
    setVendorModalOpen(true);
  };

  const openEditVendor = (v: LicenseVendor) => {
    setEditingVendor(v);
    setVendorName(v.name);
    setVendorActive(v.is_active);
    setVendorError('');
    setVendorModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setVendorError('Vendor name is required.');
      return;
    }
    try {
      if (editingVendor) {
        await updateVendorMut.mutateAsync({
          id: editingVendor.vendor_id,
          dto: { name: vendorName.trim(), is_active: vendorActive },
        });
      } else {
        await createVendorMut.mutateAsync({
          name: vendorName.trim(),
          is_active: vendorActive,
        });
      }
      setVendorModalOpen(false);
    } catch (err: any) {
      setVendorError(err?.message || 'Failed to save vendor');
    }
  };

  const handleDeleteVendor = async (v: LicenseVendor) => {
    if (confirm(`Are you sure you want to delete vendor "${v.name}"? If licenses use this vendor, it will be deactivated.`)) {
      try {
        await deleteVendorMut.mutateAsync(v.vendor_id);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete vendor');
      }
    }
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchVendor.trim().toLowerCase()),
  );

  // ── 3. Revoke Reasons ──────────────────────────────────────────────────────
  const { data: revokeReasons = [], isLoading: isLoadingRevoke } = useLicenseRevokeReasonsQuery(true);
  const createRevokeMut = useCreateLicenseRevokeReasonMutation();
  const updateRevokeMut = useUpdateLicenseRevokeReasonMutation();
  const deleteRevokeMut = useDeleteLicenseRevokeReasonMutation();

  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [editingRevoke, setEditingRevoke] = useState<LicenseReason | null>(null);
  const [revokeName, setRevokeName] = useState('');
  const [revokeOrder, setRevokeOrder] = useState<number>(1);
  const [revokeActive, setRevokeActive] = useState(true);
  const [revokeError, setRevokeError] = useState('');

  const openAddRevoke = () => {
    setEditingRevoke(null);
    setRevokeName('');
    setRevokeOrder(revokeReasons.length + 1);
    setRevokeActive(true);
    setRevokeError('');
    setRevokeModalOpen(true);
  };

  const openEditRevoke = (r: LicenseReason) => {
    setEditingRevoke(r);
    setRevokeName(r.name);
    setRevokeOrder(r.display_order ?? 1);
    setRevokeActive(r.is_active);
    setRevokeError('');
    setRevokeModalOpen(true);
  };

  const handleSaveRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeName.trim()) {
      setRevokeError('Reason name is required.');
      return;
    }
    try {
      if (editingRevoke) {
        await updateRevokeMut.mutateAsync({
          id: editingRevoke.reason_id,
          dto: { name: revokeName.trim(), display_order: revokeOrder, is_active: revokeActive },
        });
      } else {
        await createRevokeMut.mutateAsync({
          name: revokeName.trim(),
          display_order: revokeOrder,
          is_active: revokeActive,
        });
      }
      setRevokeModalOpen(false);
    } catch (err: any) {
      setRevokeError(err?.message || 'Failed to save revoke reason');
    }
  };

  const handleDeleteRevoke = async (r: LicenseReason) => {
    if (confirm(`Are you sure you want to delete revoke reason "${r.name}"?`)) {
      try {
        await deleteRevokeMut.mutateAsync(r.reason_id);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete revoke reason');
      }
    }
  };

  const filteredRevokeReasons = revokeReasons.filter((r) =>
    r.name.toLowerCase().includes(searchRevoke.trim().toLowerCase()),
  );

  // ── 4. Discontinue Reasons ─────────────────────────────────────────────────
  const { data: discontinueReasons = [], isLoading: isLoadingDiscontinue } = useLicenseDiscontinueReasonsQuery(true);
  const createDiscontinueMut = useCreateLicenseDiscontinueReasonMutation();
  const updateDiscontinueMut = useUpdateLicenseDiscontinueReasonMutation();
  const deleteDiscontinueMut = useDeleteLicenseDiscontinueReasonMutation();

  const [discontinueModalOpen, setDiscontinueModalOpen] = useState(false);
  const [editingDiscontinue, setEditingDiscontinue] = useState<LicenseReason | null>(null);
  const [discontinueName, setDiscontinueName] = useState('');
  const [discontinueOrder, setDiscontinueOrder] = useState<number>(1);
  const [discontinueActive, setDiscontinueActive] = useState(true);
  const [discontinueError, setDiscontinueError] = useState('');

  const openAddDiscontinue = () => {
    setEditingDiscontinue(null);
    setDiscontinueName('');
    setDiscontinueOrder(discontinueReasons.length + 1);
    setDiscontinueActive(true);
    setDiscontinueError('');
    setDiscontinueModalOpen(true);
  };

  const openEditDiscontinue = (d: LicenseReason) => {
    setEditingDiscontinue(d);
    setDiscontinueName(d.name);
    setDiscontinueOrder(d.display_order ?? 1);
    setDiscontinueActive(d.is_active);
    setDiscontinueError('');
    setDiscontinueModalOpen(true);
  };

  const handleSaveDiscontinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discontinueName.trim()) {
      setDiscontinueError('Reason name is required.');
      return;
    }
    try {
      if (editingDiscontinue) {
        await updateDiscontinueMut.mutateAsync({
          id: editingDiscontinue.reason_id,
          dto: { name: discontinueName.trim(), display_order: discontinueOrder, is_active: discontinueActive },
        });
      } else {
        await createDiscontinueMut.mutateAsync({
          name: discontinueName.trim(),
          display_order: discontinueOrder,
          is_active: discontinueActive,
        });
      }
      setDiscontinueModalOpen(false);
    } catch (err: any) {
      setDiscontinueError(err?.message || 'Failed to save discontinue reason');
    }
  };

  const handleDeleteDiscontinue = async (d: LicenseReason) => {
    if (confirm(`Are you sure you want to delete discontinue reason "${d.name}"?`)) {
      try {
        await deleteDiscontinueMut.mutateAsync(d.reason_id);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete discontinue reason');
      }
    }
  };

  const filteredDiscontinueReasons = discontinueReasons.filter((d) =>
    d.name.toLowerCase().includes(searchDiscontinue.trim().toLowerCase()),
  );

  // ── 5. Managers ────────────────────────────────────────────────────────────
  const { data: managers = [], isLoading: isLoadingManagers } = useLicenseManagersQuery();
  const { data: employeeOptions = [] } = useEmployeeOptionsQuery();
  const addManagerMut = useAddLicenseManagerMutation();
  const removeManagerMut = useRemoveLicenseManagerMutation();
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [managerError, setManagerError] = useState('');

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    setManagerError('');
    try {
      await addManagerMut.mutateAsync(Number(selectedEmpId));
      setSelectedEmpId('');
    } catch (err: any) {
      setManagerError(err?.message || 'Failed to appoint manager');
    }
  };

  const handleRemoveManager = async (empId: number, name: string) => {
    if (confirm(`Remove "${name}" as software license manager?`)) {
      try {
        await removeManagerMut.mutateAsync(empId);
      } catch (err: any) {
        alert(err?.message || 'Failed to remove manager');
      }
    }
  };

  const filteredManagers = managers.filter((m) => {
    const emp = m.employees_software_license_managers_emp_idToemployees;
    const q = searchManager.trim().toLowerCase();
    if (!q) return true;
    return (
      emp?.name?.toLowerCase().includes(q) ||
      emp?.email?.toLowerCase().includes(q) ||
      emp?.departments_employees_dep_idTodepartments?.name?.toLowerCase().includes(q)
    );
  });

  // ── 6. Alert Rules & Defaults ──────────────────────────────────────────────
  const { data: settings } = useLicenseSettingsQuery();
  const updateSettingsMut = useUpdateLicenseSettingsMutation();
  const [settingsForm, setSettingsForm] = useState({
    reminder_window_days: 30,
    remind_accounts: true,
    weekly_renewal_summary: true,
    unused_seat_flag_days: 90,
    recovery_reminder_days: 3,
    max_trial_days: 90,
    currency: '₹',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  React.useEffect(() => {
    if (settings && !settingsLoaded) {
      setSettingsForm({
        reminder_window_days: settings.reminder_window_days,
        remind_accounts: settings.remind_accounts,
        weekly_renewal_summary: settings.weekly_renewal_summary,
        unused_seat_flag_days: settings.unused_seat_flag_days,
        recovery_reminder_days: settings.recovery_reminder_days,
        max_trial_days: settings.max_trial_days,
        currency: settings.currency || '₹',
      });
      setSettingsLoaded(true);
    }
  }, [settings, settingsLoaded]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(false);
    setSettingsError('');
    try {
      await updateSettingsMut.mutateAsync(settingsForm);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            Software License Settings & Master Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage software categories, vendors, allocation reasons, designated managers, and renewal notification rules.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-2 font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Categories
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'categories' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-3.5 py-2 font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'vendors'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Vendors / Publishers
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'vendors' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {vendors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revoke_reasons')}
          className={`px-3.5 py-2 font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'revoke_reasons'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Revoke Reasons
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'revoke_reasons' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {revokeReasons.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discontinue_reasons')}
          className={`px-3.5 py-2 font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'discontinue_reasons'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Discontinue Reasons
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'discontinue_reasons' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {discontinueReasons.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('managers')}
          className={`px-3.5 py-2 font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'managers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Software Managers
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'managers' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {managers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`px-3.5 py-2 font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Alert Rules & Defaults
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 1: CATEGORIES
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={openAddCategory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingCategories ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">Loading categories...</td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {searchCategory ? 'No categories matching your search.' : 'No software categories found. Click "Add Category" to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => (
                    <tr key={c.category_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{c.display_order}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{c.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            c.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditCategory(c)}
                            title="Edit"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c)}
                            title="Delete"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 2: VENDORS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendors / publishers..."
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={openAddVendor}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Vendor
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor / Publisher Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingVendors ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">Loading vendors...</td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      {searchVendor ? 'No vendors matching your search.' : 'No vendors registered yet. Click "Add Vendor" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v) => (
                    <tr key={v.vendor_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-medium text-slate-800">{v.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            v.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditVendor(v)}
                            title="Edit"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVendor(v)}
                            title="Delete"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 3: REVOKE REASONS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'revoke_reasons' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search revoke reasons..."
                value={searchRevoke}
                onChange={(e) => setSearchRevoke(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={openAddRevoke}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Revoke Reason
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Reason for Revoking Seat</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingRevoke ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">Loading reasons...</td>
                  </tr>
                ) : filteredRevokeReasons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {searchRevoke ? 'No revoke reasons matching your search.' : 'No revoke reasons defined. Click "Add Revoke Reason".'}
                    </td>
                  </tr>
                ) : (
                  filteredRevokeReasons.map((r) => (
                    <tr key={r.reason_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{r.display_order}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{r.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditRevoke(r)}
                            title="Edit"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRevoke(r)}
                            title="Delete"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 4: DISCONTINUE REASONS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'discontinue_reasons' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search discontinue reasons..."
                value={searchDiscontinue}
                onChange={(e) => setSearchDiscontinue(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={openAddDiscontinue}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Discontinue Reason
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Reason for Deprecating Software</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDiscontinue ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">Loading reasons...</td>
                  </tr>
                ) : filteredDiscontinueReasons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {searchDiscontinue ? 'No discontinue reasons matching your search.' : 'No discontinue reasons defined. Click "Add Discontinue Reason".'}
                    </td>
                  </tr>
                ) : (
                  filteredDiscontinueReasons.map((d) => (
                    <tr key={d.reason_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{d.display_order}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{d.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            d.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {d.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDiscontinue(d)}
                            title="Edit"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiscontinue(d)}
                            title="Delete"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 5: MANAGERS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'managers' && (
        <div className="space-y-6">
          {/* Appoint Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Appoint Software License Manager
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Software License Managers receive renewal alerts, expiry summaries, unallocated seat reports, and have permissions to add and allocate software across the company.
            </p>

            <form onSubmit={handleAddManager} className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value ? Number(e.target.value) : '')}
                className="w-full sm:w-80 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select an employee to appoint...</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!selectedEmpId || addManagerMut.isPending}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {addManagerMut.isPending ? 'Appointing...' : 'Appoint Manager'}
              </button>
            </form>

            {managerError && (
              <p className="text-xs text-rose-600 mt-2">{managerError}</p>
            )}
          </div>

          {/* List of Appointed Managers */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search appointed managers..."
                  value={searchManager}
                  onChange={(e) => setSearchManager(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
              <span className="text-xs font-medium text-slate-500">
                {filteredManagers.length} manager{filteredManagers.length !== 1 ? 's' : ''} assigned
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Manager Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Appointed Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingManagers ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Loading managers...</td>
                    </tr>
                  ) : filteredManagers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {searchManager ? 'No managers matching your search.' : 'No software license managers appointed yet. Select an employee above.'}
                      </td>
                    </tr>
                  ) : (
                    filteredManagers.map((m) => {
                      const emp = m.employees_software_license_managers_emp_idToemployees;
                      return (
                        <tr key={m.manager_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {emp?.name?.charAt(0) || 'M'}
                              </div>
                              <span className="font-semibold text-slate-800">{emp?.name || `Employee #${m.emp_id}`}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{emp?.email || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {emp?.departments_employees_dep_idTodepartments?.name || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveManager(m.emp_id, emp?.name || `Emp #${m.emp_id}`)}
                              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer font-medium"
                            >
                              Revoke Access
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 6: RULES & DEFAULTS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Renewal Alert & Expiry Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set how far in advance teams and managers are notified of expiring licenses.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Reminder Window (Days Before Expiry)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settingsForm.reminder_window_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, reminder_window_days: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Licenses expiring within this window will show in the "Expiring Soon" dashboard and send alert notifications.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  License Currency Symbol
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={settingsForm.currency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                  placeholder="₹"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Displayed before cost values (e.g. ₹, $, €, £).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unused Seat Flagging Threshold (Days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={settingsForm.unused_seat_flag_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, unused_seat_flag_days: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Flag allocated seats as underutilized if no activity detected within these days.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Seat Recovery Reminder Interval (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settingsForm.recovery_reminder_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, recovery_reminder_days: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Recurring reminder sent to recover licenses from deactivated or transferred employees.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Max Trial / Evaluation Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settingsForm.max_trial_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_trial_days: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Upper limit when setting up trial software licenses.
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.remind_accounts}
                  onChange={(e) => setSettingsForm({ ...settingsForm, remind_accounts: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800">Notify Accounts / Finance Department</span>
                  <p className="text-[11px] text-slate-500">
                    Send renewal alerts to accounts team 15 days before renewal for timely PO or credit card processing.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.weekly_renewal_summary}
                  onChange={(e) => setSettingsForm({ ...settingsForm, weekly_renewal_summary: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800">Weekly Software Renewal Digest</span>
                  <p className="text-[11px] text-slate-500">
                    Send a weekly email digest every Monday morning to Software Managers summarizing active, expiring, and idle licenses.
                  </p>
                </div>
              </label>
            </div>

            {settingsError && (
              <p className="text-xs text-rose-600">{settingsError}</p>
            )}

            {settingsSuccess && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                License rules and configuration successfully saved!
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMut.isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                {updateSettingsMut.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT CATEGORY
         ─────────────────────────────────────────────────────────────────────── */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design, DevOps, HR Tech, Productivity"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={catOrder}
                  onChange={(e) => setCatOrder(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={catActive}
                  onChange={(e) => setCatActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Category is active</span>
              </label>

              {catError && <p className="text-xs text-rose-600">{catError}</p>}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMut.isPending || updateCategoryMut.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs"
                >
                  {createCategoryMut.isPending || updateCategoryMut.isPending ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT VENDOR
         ─────────────────────────────────────────────────────────────────────── */}
      {vendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingVendor ? 'Edit Vendor / Publisher' : 'Add New Vendor / Publisher'}
              </h3>
              <button
                type="button"
                onClick={() => setVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vendor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adobe, Atlassian, Google, Microsoft, Figma"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={vendorActive}
                  onChange={(e) => setVendorActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Vendor is active</span>
              </label>

              {vendorError && <p className="text-xs text-rose-600">{vendorError}</p>}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVendorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMut.isPending || updateVendorMut.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs"
                >
                  {createVendorMut.isPending || updateVendorMut.isPending ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT REVOKE REASON
         ─────────────────────────────────────────────────────────────────────── */}
      {revokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRevoke ? 'Edit Revoke Reason' : 'Add Revoke Reason'}
              </h3>
              <button
                type="button"
                onClick={() => setRevokeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRevoke} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Revoke Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Employee left company, Role changed, Project concluded"
                  value={revokeName}
                  onChange={(e) => setRevokeName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={revokeOrder}
                  onChange={(e) => setRevokeOrder(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={revokeActive}
                  onChange={(e) => setRevokeActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Reason is active</span>
              </label>

              {revokeError && <p className="text-xs text-rose-600">{revokeError}</p>}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevokeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRevokeMut.isPending || updateRevokeMut.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs"
                >
                  {createRevokeMut.isPending || updateRevokeMut.isPending ? 'Saving...' : 'Save Reason'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT DISCONTINUE REASON
         ─────────────────────────────────────────────────────────────────────── */}
      {discontinueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingDiscontinue ? 'Edit Discontinue Reason' : 'Add Discontinue Reason'}
              </h3>
              <button
                type="button"
                onClick={() => setDiscontinueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscontinue} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Discontinue Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replaced by alternate software, Tool depreciated by vendor"
                  value={discontinueName}
                  onChange={(e) => setDiscontinueName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={discontinueOrder}
                  onChange={(e) => setDiscontinueOrder(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={discontinueActive}
                  onChange={(e) => setDiscontinueActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Reason is active</span>
              </label>

              {discontinueError && <p className="text-xs text-rose-600">{discontinueError}</p>}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDiscontinueModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDiscontinueMut.isPending || updateDiscontinueMut.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs"
                >
                  {createDiscontinueMut.isPending || updateDiscontinueMut.isPending ? 'Saving...' : 'Save Reason'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
