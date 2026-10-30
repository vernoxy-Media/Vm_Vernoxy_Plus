import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Laptop,
  CalendarDays,
  FileText,
  Code,
  HelpCircle,
  Video,
  BookMarked,
  Save,
} from 'lucide-react';
import {
  useKbCategoriesQuery,
  useCreateKbCategoryMutation,
  useUpdateKbCategoryMutation,
  useDeleteKbCategoryMutation,
  KbCategory,
} from '@/features/knowledge-base/hooks/use-kb-settings';
import { useEmployeeOptionsQuery, useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';

type ActiveSpace = 'INTERNAL' | 'CLIENT';

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  CalendarDays,
  Laptop,
  ShieldCheck,
  FileText,
  Code,
  HelpCircle,
  BookOpen,
  Video,
  BookMarked,
};

export const SettingsKnowledgeBaseSection: React.FC = () => {
  const [activeSpace, setActiveSpace] = useState<ActiveSpace>('INTERNAL');
  const [search, setSearch] = useState('');

  // Queries
  const { data: categories = [], isLoading } = useKbCategoriesQuery(undefined, true);
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();

  // Mutations
  const createCategoryMut = useCreateKbCategoryMutation();
  const updateCategoryMut = useUpdateKbCategoryMutation();
  const deleteCategoryMut = useDeleteKbCategoryMutation();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KbCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('BookOpen');
  const [space, setSpace] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  const [ownerId, setOwnerId] = useState<number | undefined>(undefined);
  const [approverId, setApproverId] = useState<number | undefined>(undefined);
  const [reviewMonths, setReviewMonths] = useState<number | undefined>(12);
  const [ackRequired, setAckRequired] = useState(false);
  const [audienceScope, setAudienceScope] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<KbCategory | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Counts per space
  const internalCategories = categories.filter((c) => c.space === 'INTERNAL');
  const clientCategories = categories.filter((c) => c.space === 'CLIENT');

  // Filtered by active tab and search
  const currentCategories = activeSpace === 'INTERNAL' ? internalCategories : clientCategories;
  const filteredCategories = currentCategories.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIcon(activeSpace === 'INTERNAL' ? 'FileText' : 'BookOpen');
    setSpace(activeSpace);
    setOwnerId(undefined);
    setApproverId(undefined);
    setReviewMonths(12);
    setAckRequired(activeSpace === 'INTERNAL');
    setAudienceScope('ALL');
    setSelectedDepartments([]);
    setDisplayOrder(currentCategories.length + 1);
    setIsActive(true);
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (c: KbCategory) => {
    setEditingCategory(c);
    setName(c.name);
    setDescription(c.description || '');
    setIcon(c.icon || 'BookOpen');
    setSpace(c.space);
    setOwnerId(c.default_owner_id ?? undefined);
    setApproverId(c.default_approver_id ?? undefined);
    setReviewMonths(c.default_review_cycle_months ?? undefined);
    setAckRequired(c.default_ack_required);
    setAudienceScope(c.default_audience_scope);
    setSelectedDepartments(c.default_audience_departments || []);
    setDisplayOrder(c.display_order);
    setIsActive(c.is_active);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }
    try {
      if (editingCategory) {
        await updateCategoryMut.mutateAsync({
          id: editingCategory.category_id,
          dto: {
            name: name.trim(),
            description: description.trim() || undefined,
            icon,
            default_owner_id: ownerId ?? null,
            default_approver_id: approverId ?? null,
            default_review_cycle_months: reviewMonths ?? null,
            default_ack_required: ackRequired,
            default_audience_scope: audienceScope,
            default_audience_departments: audienceScope === 'CUSTOM' ? selectedDepartments : [],
            display_order: displayOrder,
            is_active: isActive,
          },
        });
      } else {
        await createCategoryMut.mutateAsync({
          space,
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          default_owner_id: ownerId,
          default_approver_id: approverId,
          default_review_cycle_months: reviewMonths,
          default_ack_required: ackRequired,
          default_audience_scope: audienceScope,
          default_audience_departments: audienceScope === 'CUSTOM' ? selectedDepartments : [],
          display_order: displayOrder,
          is_active: isActive,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save category');
    }
  };

  const handleToggleActive = async (c: KbCategory) => {
    try {
      await updateCategoryMut.mutateAsync({
        id: c.category_id,
        dto: { is_active: !c.is_active },
      });
    } catch (err) {
      console.error('Failed to toggle category status', err);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryMut.mutateAsync(categoryToDelete.category_id);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Knowledge Base — Spaces and Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure article categories, default ownership, approvers, review cycles, and audience targeting.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Space Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setActiveSpace('INTERNAL')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSpace === 'INTERNAL'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Internal Knowledge ({internalCategories.length})
          </button>
          <button
            onClick={() => setActiveSpace('CLIENT')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSpace === 'CLIENT'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Client Knowledge ({clientCategories.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No categories found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try clearing your search query.' : 'Click "Add Category" to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Default Owner</th>
                  <th className="py-3 px-4">Approver</th>
                  <th className="py-3 px-4">Default Audience</th>
                  <th className="py-3 px-4">Review</th>
                  {activeSpace === 'INTERNAL' && <th className="py-3 px-4 text-center">Ack</th>}
                  <th className="py-3 px-4 text-center">Articles</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((c) => {
                  const IconComponent = (c.icon && ICON_MAP[c.icon]) || BookOpen;
                  return (
                    <tr key={c.category_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{c.name}</div>
                            {c.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {c.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {c.default_owner?.name || 'Admin'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {c.default_approver?.name || 'Admin'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {c.default_audience_scope === 'ALL'
                            ? activeSpace === 'INTERNAL'
                              ? 'All employees'
                              : 'All clients'
                            : 'Selected departments/projects'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {c.default_review_cycle_months
                          ? `${c.default_review_cycle_months} months`
                          : 'None'}
                      </td>
                      {activeSpace === 'INTERNAL' && (
                        <td className="py-3 px-4 text-center">
                          {c.default_ack_required ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {c.articles_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            c.is_active ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              c.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(c)}
                            title="Edit Category"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setCategoryToDelete(c);
                              setDeleteError('');
                              setDeleteModalOpen(true);
                            }}
                            title="Delete Category"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notice info box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-0.5">Category Defaults & Rules</p>
        <p>
          Category settings serve as the starting point for every new article created in it. An article
          owner can narrow the audience of an individual article; only the Admin can widen it. Empty
          categories can be deleted; categories with articles can only be deactivated.
        </p>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : `Add ${space === 'INTERNAL' ? 'Internal' : 'Client'} Category`}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Space Selection (only on Create) */}
              {!editingCategory && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Space</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSpace('INTERNAL')}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                        space === 'INTERNAL'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      Internal Knowledge
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpace('CLIENT')}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                        space === 'CLIENT'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      Client Knowledge
                    </button>
                  </div>
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
                  placeholder="e.g. Leave Policies or FAQs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what articles belong in this category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Default Owner & Approver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Owner</label>
                  <select
                    value={ownerId || ''}
                    onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Admin (Default)</option>
                    {employees.map((emp) => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Approver</label>
                  <select
                    value={approverId || ''}
                    onChange={(e) => setApproverId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Admin User</option>
                    {employees.map((emp) => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Review Cycle & Ack Required */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Review Cycle</label>
                  <select
                    value={reviewMonths !== undefined ? reviewMonths : ''}
                    onChange={(e) => setReviewMonths(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">None</option>
                    <option value="3">Every 3 months</option>
                    <option value="6">Every 6 months</option>
                    <option value="12">Every 12 months (Annual)</option>
                    <option value="24">Every 24 months</option>
                  </select>
                </div>

                {space === 'INTERNAL' && (
                  <div className="flex flex-col justify-end">
                    <label className="inline-flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={ackRequired}
                        onChange={(e) => setAckRequired(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Default Acknowledgement Required
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Default Audience */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Audience</label>
                <div className="flex items-center gap-4 text-xs mb-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="audienceScope"
                      checked={audienceScope === 'ALL'}
                      onChange={() => setAudienceScope('ALL')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{space === 'INTERNAL' ? 'All employees' : 'All clients'}</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="audienceScope"
                      checked={audienceScope === 'CUSTOM'}
                      onChange={() => setAudienceScope('CUSTOM')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Selected departments</span>
                  </label>
                </div>

                {audienceScope === 'CUSTOM' && space === 'INTERNAL' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-h-36 overflow-y-auto">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Select Departments
                    </p>
                    {departments.map((dept) => (
                      <label key={dept.dep_id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept.dep_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments([...selectedDepartments, dept.dep_id]);
                            } else {
                              setSelectedDepartments(selectedDepartments.filter((id) => id !== dept.dep_id));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{dept.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Category Active</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMut.isPending || updateCategoryMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Category</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete this category?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Category: <span className="font-semibold text-slate-900">{categoryToDelete.name}</span>
              <br />
              Articles: <span className="font-semibold text-slate-900">{categoryToDelete.articles_count}</span>
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteCategoryMut.isPending}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
